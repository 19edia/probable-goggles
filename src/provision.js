import {ROLE_ENV} from './config-rules.js';
import {deleteCommand,deletionHandler} from './delete-structure.js';
import {rankRoles,categories,textChannels,voiceChannels} from './server-layout.js';
import {DISTRICT_NAME,DISTRICT_COLOR,saveSbiDistrict,canConfigureDestination} from './sbi.js';
import {SlashCommandBuilder,PermissionFlagsBits as P,ChannelType as T,MessageFlags,AttachmentBuilder} from 'discord.js';
export class ProvisionError extends Error {}
const ensure=(ok,message)=>{if(!ok)throw new ProvisionError(message);};
export function createCommand(){return new SlashCommandBuilder().setName('criar').setDescription('Configurar o DISTRITO ROKUHARA KAGE CLAN e salvar tudo no SBI').setDefaultMemberPermissions(P.Administrator).setDMPermission(false).toJSON();}
export async function registerCreate(client,divisions=[]){
 await client.application.commands.create(createCommand());
 for(const d of divisions){const g=await client.guilds.fetch(d.guild);await g.commands.create(createCommand());await g.commands.create(deleteCommand());}
}
export async function checkProvisionGuild(g){
 const me=await g.members.fetchMe();
 ensure(me.permissions.has([P.ManageChannels,P.ManageRoles,P.ViewChannel,P.SendMessages,P.EmbedLinks,P.AttachFiles,P.ReadMessageHistory,P.Connect,P.Speak]),'O bot precisa de Gerenciar canais, Gerenciar cargos, Ver canais, Enviar mensagens, Incorporar links, Anexar arquivos, Ler histórico, Conectar e Falar.');
 return me;
}
export async function provisionGuild(g,input={}, {persist=async()=>{}}={}){
 const d={...input,id:1,name:DISTRICT_NAME,guild:g.id,rankRoles:{...input.rankRoles},resources:{...input.resources}};
 const me=await checkProvisionGuild(g),roles=await g.roles.fetch(),channels=await g.channels.fetch(),tag='IFJ-D1';
 const unique=(items,predicate)=>{const found=[...items.values()].filter(x=>x&&predicate(x));ensure(found.length<=1,'Há nomes IFJ duplicados. Renomeie as cópias antes de repetir /criar.');return found[0];};
 const roleMap=new Map(),inventory=[],notes=[];
 await persist(d);
 async function role(key,emoji,suffix){
  const configured=key==='member'?d.memberRole:key==='admin'?d.adminRole:d.rankRoles[key],name=`RKC • ${emoji} ┃ ${suffix}`;
  let r=(configured&&roles.get(configured))||unique(roles,x=>[name,`${tag} • ${emoji} ┃ ${suffix}`,`${tag} • ${suffix}`].includes(x.name));
  if(!r){r=await g.roles.create({name,color:DISTRICT_COLOR,hoist:['leader','subleader','high','admin'].includes(key),mentionable:false,permissions:[],reason:'Estrutura DISTRITO ROKUHARA KAGE CLAN'});roles.set(r.id,r);}
  else if(r.editable&&!r.managed)await r.edit({name,color:DISTRICT_COLOR,reason:'Atualizar identidade ROKUHARA KAGE CLAN'});
  else notes.push(`Cargo ${r.name}: coloque o bot acima dele para permitir atualizar a aparência.`);
  if(key==='member')d.memberRole=r.id;else if(key==='admin')d.adminRole=r.id;else d.rankRoles[key]=r.id;
  roleMap.set(key,r);inventory.push(`CARGO | ${r.name} | ${r.id}`);await persist(d);return r;
 }
 const member=await role(...rankRoles[0]),admin=await role(...rankRoles[1]);
 ensure(member.id!==g.id&&admin.id!==g.id&&member.id!==admin.id&&!member.managed&&!admin.managed&&!member.permissions.has(P.Administrator)&&!admin.permissions.has(P.Administrator),'Cargos de acesso inválidos: Membro verificado e Equipe devem ser cargos comuns, sem Administrator.');
 ensure(me.roles.highest.comparePositionTo(member)>0,'Coloque o cargo do bot acima do cargo de membro verificado.');
 for(const spec of rankRoles.slice(2))await role(...spec);
 const botAllow=[P.ViewChannel,P.SendMessages,P.EmbedLinks,P.AttachFiles,P.ReadMessageHistory,P.ManageChannels,P.ManageRoles,P.Connect,P.Speak];
 function overwrites(scope){return [{id:g.id,...(scope==='public'?{allow:[P.ViewChannel,P.ReadMessageHistory],deny:[P.SendMessages]}:{deny:[P.ViewChannel]})},{id:me.id,allow:botAllow},{id:admin.id,allow:[P.ViewChannel,P.SendMessages,P.ReadMessageHistory,P.Connect,P.Speak]},...(['members','readonly'].includes(scope)?[{id:member.id,allow:[P.ViewChannel,P.ReadMessageHistory,P.Connect,P.Speak,...(scope==='members'?[P.SendMessages]:[])],...(scope==='readonly'?{deny:[P.SendMessages]}:{})}]:[])];}
 const property={verification:'verification',welcome:'welcome',guide:'guide',wanted:'wanted',tickets:'tickets',reports:'reports','tickets-category':'category','staff-text':'staffChannel',alliances:'allianceChannel',news:'newsChannel'};
 async function channel(key,name,type,scope,parent,legacy=[]){
  const marker=`${tag}:${key}`,configured=d.resources[key]||d[property[key]];
  let ch=(configured&&channels.get(configured))||unique(channels,x=>type===T.GuildText?x.topic===marker:x.type===type&&[name,...legacy].includes(x.name));
  const data={name,type,permissionOverwrites:overwrites(scope),...(parent?{parent:parent.id}:{}),...(type===T.GuildText?{topic:marker}:{})};
  if(ch){ensure(ch.type===type,'Um canal IFJ tem tipo incompatível.');const {type:unused,...edit}=data;await ch.edit({...edit,reason:'Atualizar DISTRITO ROKUHARA KAGE CLAN'});}
  else{ch=await g.channels.create({...data,reason:'Estrutura DISTRITO ROKUHARA KAGE CLAN'});channels.set(ch.id,ch);}
  d.resources[key]=ch.id;if(property[key])d[property[key]]=ch.id;if(key==='news')d.news=ch.id;
  inventory.push(`${type===T.GuildCategory?'CATEGORIA':type===T.GuildVoice?'CALL':'TEXTO'} | ${ch.name} | ${ch.id}`);await persist(d);return ch;
 }
 const categoryMap=new Map();
 for(const [key,title,emoji,scope,old]of categories)categoryMap.set(key,await channel(key,`RKC • 🟠 ${emoji} ━ ${title}`,T.GuildCategory,scope,undefined,[`${tag} • 🟢 ${emoji} ━ ${title}`,`${tag} • 🟠 ${emoji} ━ ${title}`,...(old?[`${tag} • ${old}`]:[])]));
 for(const [key,title,emoji,parent,scope]of textChannels)await channel(key,`${emoji}┃${title}`,T.GuildText,scope,categoryMap.get(parent));
 for(const [key,title,emoji,parent,scope]of voiceChannels)await channel(key,`RKC • ${emoji} ┃ ${title}`,T.GuildVoice,scope,categoryMap.get(parent),[`${tag} • ${emoji} ┃ ${title}`,`${tag} • ${title}`]);
 if(!d.invite&&me.permissions.has(P.CreateInstantInvite)){
  const welcome=channels.get(d.welcome);
  if(welcome?.createInvite)try{const invite=await welcome.createInvite({maxAge:0,maxUses:0,unique:false,reason:'Convite do distrito salvo pelo SBI'});d.invite=invite.url;await persist(d);}catch{notes.push('Convite não criado: revise Criar convite no canal de boas-vindas.');}
 }
 if(g.name!==DISTRICT_NAME&&g.setName&&me.permissions.has(P.ManageGuild))await g.setName(DISTRICT_NAME,'Identidade do distrito ROKUHARA KAGE CLAN');
 else if(g.name!==DISTRICT_NAME)notes.push(`Nome do servidor: ${DISTRICT_NAME}. Para o bot atualizar o nome, conceda Gerenciar servidor.`);
 const values={GUILD_ID:g.id,MEMBER_ROLE_ID:d.memberRole,ADMIN_ROLE_ID:d.adminRole,VERIFICATION_CHANNEL_ID:d.verification,WELCOME_CHANNEL_ID:d.welcome,GUIDE_CHANNEL_ID:d.guide,WANTED_CHANNEL_ID:d.wanted,TICKETS_CHANNEL_ID:d.tickets,REPORTS_CHANNEL_ID:d.reports,TICKET_CATEGORY_ID:d.category,STAFF_CHANNEL_ID:d.staffChannel,ALLIANCE_CHANNEL_ID:d.allianceChannel,NEWS_CHANNEL_ID:d.newsChannel,...Object.fromEntries(Object.entries(ROLE_ENV).map(([key,suffix])=>[suffix,d.rankRoles[key]]))};
 return {district:d,env:Object.entries(values).map(([key,value])=>`DIV_1_${key}=${value}`).join('\n')+'\n',inventory:`${DISTRICT_NAME} · servidor ${g.id}\n${categories.length} categorias • ${textChannels.length} textos • ${voiceChannels.length} calls • ${rankRoles.length} cargos\n\n${inventory.join('\n')}\n\n${notes.join('\n')}\n\nSBI: cargos, canais e servidor salvos automaticamente no banco. Não é necessário copiar IDs para variáveis. Líder, Sub líder, High member e Moderador recebem Equipe conforme o IFJ. Equipe não deve receber Administrator global.\n`};
}
export function createProvisionHandler(client,divisions,{pool,config={divisions},onConfigured=async()=>{}}={}){
 const locks=new Set(),remove=deletionHandler(client,divisions,locks);
 return async i=>{
  if(await remove(i))return true;
  if(!i.isChatInputCommand?.()||i.commandName!=='criar')return false;
  await i.deferReply({flags:MessageFlags.Ephemeral});let locked=false,connection,dbLock=false,saved=false;const guildId=i.guildId;
  try{
   ensure(guildId,'Execute /criar dentro do servidor do distrito.');
   const g=await client.guilds.fetch(guildId),actor=await g.members.fetch(i.user.id);
   ensure(g.ownerId===i.user.id||actor.permissions.has(P.Administrator),'Somente o dono ou um administrador do Discord pode executar /criar.');
   ensure(pool,'O SBI precisa do banco de dados. Inicie a aplicação com npm start e tente novamente.');
   ensure(await canConfigureDestination(pool,config,guildId,i.user.id),'Para transferir o distrito para outro servidor, vincule este Discord a uma conta Administrador ou Sub líder no painel central.');
   ensure(!locks.size,'O distrito já está sendo configurado. Aguarde.');locks.add(guildId);locked=true;
   connection=await pool.connect();
   const lock=await connection.query('SELECT pg_try_advisory_lock(735190248) AS locked');dbLock=Boolean(lock.rows[0]?.locked);
   ensure(dbLock,'O SBI já está configurando o distrito em outra instância. Aguarde.');
   // Refresh under the shared lock to stop two different guilds claiming one district.
   const current=await connection.query('SELECT * FROM sbi_district WHERE singleton=TRUE');
   const row=current.rows[0];if(row?.guild_id){config.sbiState={...row.state,guild:row.guild_id};config.sourceGuilds=[...new Set([...(config.sourceGuilds||[]),...(row.source_guilds||[])])];}
   ensure(await canConfigureDestination(pool,config,guildId,i.user.id),'O distrito pertence a outro servidor. Vincule seu Discord à administração central para transferir.');
   const previous=config.sbiState?.guild===guildId?config.sbiState:config.legacyDistrict?.guild===guildId?config.legacyDistrict:{id:1,guild:guildId};
   const result=await provisionGuild(g,previous,{persist:d=>saveSbiDistrict(pool,config,d)});
   const d=await saveSbiDistrict(pool,config,result.district,{complete:true});saved=true;
   await onConfigured(d);
   await i.editReply({content:'Distrito configurado! O SBI salvou os cargos e canais no banco. Os painéis foram atualizados; acompanhe as solicitações de imigração na administração. Você pode repetir /criar para atualizar a estrutura existente.',files:[new AttachmentBuilder(Buffer.from(result.inventory),{name:'distrito-rokuhara-kage-clan.txt'})],allowedMentions:{parse:[]}});
  }catch(e){console.error('/criar:',e.code||e.name);await i.editReply({content:e instanceof ProvisionError?e.message:saved?'O SBI salvou a estrutura, mas a publicação dos painéis não terminou. Confira as permissões dos canais e repita /criar.':'Não foi possível terminar a configuração. O SBI guardou o progresso; confira as permissões do bot e repita /criar para continuar.',allowedMentions:{parse:[]}}).catch(()=>{});}
  finally{if(dbLock)await connection.query('SELECT pg_advisory_unlock(735190248)').catch(()=>{});connection?.release();if(locked)locks.delete(guildId);}
  return true;
 };
}

