import {publishPanel} from './panels.js';
import {announcementMessage} from './announcements.js';
import {publishAlliance} from './alliance-notice.js';
import {RokuharaEmbed as EmbedBuilder} from './embed-theme.js';
import {createAllyMigration,allyJobs} from './ally-migration.js';
import {createWarnings} from './warnings.js';
import {createCommunity,communityJobs} from './community.js';
import {createMemberCards} from './member-card.js';
import {createDistrictMigration,districtJobs} from './district-migration.js';
import {BRAND_NAME,DISTRICT_NAME} from './brand.js';
import {connectDiscord,gatewayRestOptions} from './discord-connection.js';
import {synchronizeRoles} from './role-policy.js';
import {registerCreate,createProvisionHandler} from './provision.js';
import {ALLIANCE_NOTICE,bothDivisions} from './identity.js';
import {validateDiscord} from './discord-checks.js';
import {reporter} from './preflight.js';
import {Client,GatewayIntentBits,ActionRowBuilder,ButtonBuilder,ButtonStyle,ModalBuilder,TextInputBuilder,TextInputStyle,ChannelType,PermissionFlagsBits,MessageFlags,escapeMarkdown} from 'discord.js';
import {tx,enqueue,audit} from './db.js';
import {token,text} from './security.js';
const row=(...buttons)=>new ActionRowBuilder().addComponents(buttons);
const button=(id,label,style=ButtonStyle.Primary)=>new ButtonBuilder().setCustomId(id).setLabel(label).setStyle(style);
const modal=(id,title,fields)=>new ModalBuilder().setCustomId(id).setTitle(title).addComponents(fields.map(([key,label,max=100,paragraph=false])=>new ActionRowBuilder().addComponents(new TextInputBuilder().setCustomId(key).setLabel(label).setMaxLength(max).setStyle(paragraph?TextInputStyle.Paragraph:TextInputStyle.Short).setRequired(true))));
const safe=value=>escapeMarkdown(String(value)).replace(/@/g,'＠');
const ephemeral={flags:MessageFlags.Ephemeral,allowedMentions:{parse:[]}};
export function createBot(pool,config){
 const client=new Client({intents:[GatewayIntentBits.Guilds,GatewayIntentBits.GuildMembers],allowedMentions:{parse:[]},rest:gatewayRestOptions()});
 const allies=createAllyMigration(pool,config,client);
 const warnings=createWarnings(pool,config,client);
 const community=createCommunity(pool,config,client);
 const memberCards=createMemberCards(pool,config,client);
 const migrations=createDistrictMigration(pool,config,client);
 const provision=createProvisionHandler(client,config.divisions,{pool,config,onConfigured:async()=>{await validateDiscord(client,config,reporter());await warnings.register();await memberCards.register();await setup();await migrations.publish();await pool.query("INSERT INTO jobs(kind,payload) SELECT 'sync-role',jsonb_build_object('discordId',discord_id) FROM members m WHERE verified=TRUE AND NOT EXISTS (SELECT 1 FROM jobs j WHERE j.kind='sync-role' AND j.status='pending' AND j.payload->>'discordId'=m.discord_id)");}});
 let timer;let busy=false;let activated=false;
 const cooldown=new Map();
 const byGuild=id=>config.divisions.find(d=>d.guild===id);
 const ready=()=>client.isReady();
 const requireReady=()=>{if(!ready())throw Object.assign(new Error('Bot ainda não está conectado.'),{status:503});};
 async function guild(id){return client.guilds.fetch(id);}
 async function channel(id,guildId){const c=await client.channels.fetch(id);if(!c||c.guildId!==guildId||!c.isTextBased()||!('send'in c))throw new Error('Canal inválido ou fora do servidor configurado.');return c;}
 function guard(i){const key=i.user.id;const now=Date.now();if((cooldown.get(key)||0)>now)return false;cooldown.set(key,now+3000);if(cooldown.size>10000)for(const[k,v]of cooldown)if(v<=now)cooldown.delete(k);return true;}
 async function isAdmin(i,d){const member=await i.guild.members.fetch(i.user.id);if(i.guild.ownerId===i.user.id||member.permissions?.has(PermissionFlagsBits.Administrator))return true;return Boolean((await pool.query("SELECT id FROM staff WHERE active=TRUE AND discord_verified_at IS NOT NULL AND discord_id=$1 AND role IN ('admin','sublider')",[i.user.id])).rows.length);}
 async function sendStaffLinkCode(discordId,code,username){
  requireReady();
  const user=await client.users.fetch(discordId);if(user.bot)throw new Error('Use uma conta humana.');
  let present=false;for(const guildId of new Set([...config.divisions.map(d=>d.guild),...(config.sourceGuilds??[])])){const g=await guild(guildId).catch(e=>{if([10004,50001].includes(Number(e.code)))return null;throw e;});if(!g)continue;const m=await g.members.fetch({user:discordId,force:true}).catch(e=>{if(e.code===10007)return null;throw e;});if(m){present=true;break;}}
  if(!present&&config.divisions.length)throw new Error('Entre no distrito ou no servidor de origem antes de vincular sua conta.');
  await user.send({embeds:[new EmbedBuilder().setTitle('Confirme seu Discord no painel').setDescription(`Login: **${safe(username)}**\n\nSeu código: **${code}**\n\nDigite-o apenas no painel onde iniciou a vinculação. Válido por 10 minutos. Não compartilhe. Se você não solicitou, ignore esta mensagem.`)],allowedMentions:{parse:[]}});
 }
 async function setup(){
  requireReady();
  for(const d of config.divisions){
   const g=await guild(d.guild);const roles=await g.roles.fetch();
   const memberRole=roles.get(d.memberRole),adminRole=roles.get(d.adminRole);const me=await g.members.fetchMe();
   if(!memberRole||!adminRole||d.memberRole===d.adminRole||memberRole.id===g.id||memberRole.managed||memberRole.permissions.has(PermissionFlagsBits.Administrator))throw new Error(`Revise os cargos da ${d.name}. O cargo de membro não pode ser administrativo.`);
   if(me.roles.highest.comparePositionTo(memberRole)<=0||!me.permissions.has(PermissionFlagsBits.ManageRoles))throw new Error(`O cargo do bot precisa estar acima do cargo de membro na ${d.name}, com Gerenciar cargos.`);
   const category=await g.channels.fetch(d.category);if(category?.type!==ChannelType.GuildCategory)throw new Error(`Categoria de tickets inválida na ${d.name}.`);
   // Ticket channels are created with explicit overwrites, never inherited public permissions.
   for(const [id,title,description,custom,label]of [
    [d.verification,'Verificação IFJ','🪪 **IDENTIFICAÇÃO ROKUHARA KAGE CLAN**\nTenha seu IFJ de 15 números em mãos e confira os dados antes de confirmar.\n\n**DISTRITO ROKUHARA KAGE CLAN**\nO distrito agora é único. Se veio da antiga ROKUHARA, solicite a imigração nos avisos e aguarde a aprovação da equipe.','verify','Verificar meu IFJ'],
    [d.tickets,'Atendimento','🎫 **PRECISA DE AJUDA?**\nAbra um atendimento privado com a administração.\n\nExplique sua dúvida e aguarde a equipe. Ao terminar, o administrador poderá marcar como resolvido.','ticket','Abrir ticket'],
    [d.reports,'Denúncias','🛡️ **CANAL DE CONFIANÇA**\nInforme o nome, ID Discord ou IFJ e descreva o ocorrido.\n\nSua resposta será privada. A equipe analisará o caso e enviará a conclusão no seu privado.','report','Fazer denúncia']
   ]){
    const c=await channel(id,d.guild);const content={embeds:[new EmbedBuilder(d.id).setTitle(title).setDescription(description).addFields({name:'Próximo passo',value:`Use o botão **${label}** abaixo. O atendimento começa com uma resposta privada.`}).setFooter({text:`${d.name} • Central de serviços`})],components:[row(button(custom,label))],allowedMentions:{parse:[]}};
    await publishPanel(pool,client,c,id,custom,content);
   }
   await channel(d.wanted,d.guild);
   await community.publishGuide(d);
   await publishAlliance(pool,client,d,config.hydraInvite);
  }
 }
 async function closeTicket(id,actor){
  requireReady();
  await tx(pool,async c=>{const ticket=(await c.query('SELECT * FROM tickets WHERE id=$1 FOR UPDATE',[id])).rows[0];if(!ticket)throw new Error('Ticket não encontrado.');if(ticket.status==='resolvido')return;
   await c.query("UPDATE tickets SET status='fechando',closed_by=$1 WHERE id=$2",[actor,id]);await enqueue(c,'close-ticket',{id});await audit(c,actor,'Ticket encerrado',{ticketId:id});
  });
 }
 async function openTicket(i,d){
  // A transaction-scoped lock prevents concurrent duplicate channel creation across processes.
  await tx(pool,async c=>{
   await c.query('SELECT pg_advisory_xact_lock(hashtext($1))',[`ticket:${i.guildId}:${i.user.id}`]);
   let ticket=(await c.query("SELECT * FROM tickets WHERE guild_id=$1 AND user_id=$2 AND status<>'resolvido'",[i.guildId,i.user.id])).rows[0];
   if(ticket?.channel_id){const existing=await i.guild.channels.fetch(ticket.channel_id).catch(e=>{if(e.code===10003)return null;throw e;});if(existing){await i.editReply(`Seu ticket: <#${ticket.channel_id}>`);return;}await c.query("UPDATE tickets SET status='resolvido' WHERE id=$1",[ticket.id]);ticket=null;}
   const all=await i.guild.channels.fetch();
   // Recover a channel if a previous process stopped after Discord created it but before DB commit.
   let ch=all.find(x=>x?.topic===`IFJ ticket ${i.user.id}` && x.parentId===d.category);
   if(!ticket)ticket=(await c.query('INSERT INTO tickets(guild_id,user_id) VALUES($1,$2) RETURNING *',[i.guildId,i.user.id])).rows[0];
   if(!ch)ch=await i.guild.channels.create({name:`ticket-${ticket.id}`,type:ChannelType.GuildText,parent:d.category,topic:`IFJ ticket ${i.user.id}`,permissionOverwrites:[{id:i.guildId,deny:[PermissionFlagsBits.ViewChannel]},{id:i.user.id,allow:[PermissionFlagsBits.ViewChannel,PermissionFlagsBits.SendMessages,PermissionFlagsBits.ReadMessageHistory,PermissionFlagsBits.AttachFiles]},{id:d.adminRole,allow:[PermissionFlagsBits.ViewChannel,PermissionFlagsBits.SendMessages,PermissionFlagsBits.ReadMessageHistory]},{id:client.user.id,allow:[PermissionFlagsBits.ViewChannel,PermissionFlagsBits.SendMessages,PermissionFlagsBits.ReadMessageHistory,PermissionFlagsBits.ManageChannels]}]});
   await c.query('UPDATE tickets SET channel_id=$1 WHERE id=$2',[ch.id,ticket.id]);
   await ch.send({content:`Atendimento de <@${i.user.id}>. Administradores podem encerrar quando resolvido.`,components:[row(button(`close:${ticket.id}`,'Fechar — resolvido',ButtonStyle.Danger))],allowedMentions:{parse:[]}});
   await i.editReply(`Seu ticket foi aberto: <#${ch.id}>`);
  });
 }
 async function interact(i){
  if(i.isButton?.()&&!guard(i))return i.reply({...ephemeral,content:'Aguarde 3 segundos entre os cliques nos botões do bot.'});
  if(await memberCards.interact(i))return;
  if(await migrations.interact(i))return;
  if(await allies.interact(i))return;
  if(await warnings.interact(i))return;
  if(!config.sbi&&await community.interact(i))return;
  if(await provision(i))return;
  if(i.isChatInputCommand?.())return i.reply({...ephemeral,content:'Este comando não está disponível. Use /ver-sua-carteira ou consulte os avisos do distrito.'});
  if(!i.isButton()&&!i.isModalSubmit())return;
  const d=byGuild(i.guildId);if(!d)return i.reply({...ephemeral,content:'Servidor não configurado.'});
  if(i.isButton()&&i.customId==='verify')return i.showModal(modal('verify-form','Verificação de membro',[['ifj','Seu IFJ de 15 números',15]]));
  if(i.isButton()&&i.customId==='report')return i.showModal(modal('report-form','Denunciar membro',[['subject','Nome Shigaku, Discord, Roblox ou IFJ',100],['reason','O que aconteceu?',1800,true]]));
  const confirmationButton=i.isButton()&&/^(confirm|cancel):/.test(i.customId);
  if(confirmationButton)await i.deferUpdate();else await i.deferReply(ephemeral);
  if(i.isModalSubmit()&&i.customId==='verify-form'){
   const code=i.fields.getTextInputValue('ifj').trim();if(!/^\d{15}$/.test(code))return i.editReply('O IFJ deve conter exatamente 15 números.');
   const m=(await pool.query('SELECT * FROM members WHERE ifj=$1',[code])).rows[0];
   if(!m)return i.editReply('IFJ não encontrado.');
   if(m.migration_required)return i.editReply('Antes de verificar, solicite sua imigração nos avisos e aguarde a aprovação da administração.');
   if(!bothDivisions(m)&&m.division!==d.id)return i.editReply('Seu IFJ pertence à outra divisão. Acesse o servidor da sua divisão.');
   if(m.discord_id!==i.user.id)return i.editReply('Este IFJ não está vinculado ao seu Discord. Procure um administrador.');
   const t=token();const inserted=await pool.query(`INSERT INTO confirmations(token,member_id,discord_id,guild_id,expires_at,member_version) SELECT $1,id,$3,$4,$5,identity_version FROM members WHERE id=$2 AND identity_version=$6 AND discord_id=$3 `,[t,m.id,i.user.id,i.guildId,new Date(Date.now()+5*60000),m.identity_version]);if(!inserted.rowCount)return i.editReply('Cadastro atualizado. Inicie a verificação novamente.');
   return i.editReply({content:`Confirme seus dados:\nNome: **${safe(m.name)}**\nTipo: **${m.account_kind==='aliado'?'Aliado':'Membro'}**${m.account_kind==='aliado'?`\nGang aliada: **${safe(m.allied_gang)}**\n${ALLIANCE_NOTICE}`:`\nPatente: **${safe(m.member_rank)}**`}\nNome no jogo: **${safe(m.game_nick||'Não informado')}**\nUsuário Roblox: **${safe(m.roblox_username||'Não informado')}**\nAcesso: **${safe(DISTRICT_NAME)}**\nEssa confirmação expira em 5 minutos.`,components:[row(button(`confirm:${t}`,'Sou eu',ButtonStyle.Success),button(`cancel:${t}`,'Cancelar',ButtonStyle.Secondary))]});
  }
  if(i.isButton()&&/^(confirm|cancel):/.test(i.customId)){
   const [action,t]=i.customId.split(':');
   const message=await tx(pool,async c=>{
    const confirmation=(await c.query('SELECT * FROM confirmations WHERE token=$1 AND discord_id=$2 AND guild_id=$3 AND expires_at>now()',[t,i.user.id,i.guildId])).rows[0];
    if(!confirmation)return 'Confirmação expirada ou já utilizada. Inicie novamente.';
    const m=(await c.query('SELECT * FROM members WHERE id=$1 FOR UPDATE',[confirmation.member_id])).rows[0];
    const consumed=await c.query('DELETE FROM confirmations WHERE token=$1 AND discord_id=$2 AND guild_id=$3 AND expires_at>now() RETURNING token',[t,i.user.id,i.guildId]);if(!consumed.rowCount)return 'Confirmação expirada ou já utilizada. Inicie novamente.';
    if(action==='cancel')return 'Verificação cancelada.';
    if(!m||m.migration_required||m.identity_version!==confirmation.member_version||(!bothDivisions(m)&&m.division!==d.id)||m.discord_id!==i.user.id)return 'IFJ inválido para este usuário ou distrito.';
    await c.query('UPDATE members SET verified=TRUE WHERE id=$1',[m.id]);await enqueue(c,'sync-role',{discordId:i.user.id});
    return 'Dados confirmados! O bot está liberando seu acesso. Se os canais não aparecerem, avise um administrador.';
   });return i.editReply({content:message,components:[]});
  }
  if(i.isModalSubmit()&&i.customId==='report-form'){
   const subject=text(i.fields.getTextInputValue('subject'),'Nome',100);const reason=text(i.fields.getTextInputValue('reason'),'Motivo',1800);
   const message=await tx(pool,async c=>{
    const found=await c.query('SELECT * FROM members WHERE lower(game_nick)=lower($1) OR lower(roblox_username)=lower($1) OR lower(discord_username)=lower($1) OR discord_id=$1 OR ifj=$1',[subject]);
    if(!found.rowCount)return 'IFJ não encontrado';
    if(found.rowCount>1)return 'Há mais de um membro com esse nome. Envie a denúncia usando o IFJ exato.';
    const m=found.rows[0];const locked=await c.query('SELECT id FROM members WHERE id=$1 FOR UPDATE',[m.id]);if(!locked.rowCount)return 'IFJ não encontrado';
    const report=(await c.query('INSERT INTO reports(member_id,subject,reporter_id,division,reason) VALUES($1,$2,$3,$4,$5) RETURNING id',[m.id,m.game_nick||m.name,i.user.id,m.division,reason])).rows[0];
    await c.query('UPDATE members SET suspect=TRUE WHERE id=$1',[m.id]);
    const target=config.divisions.find(x=>x.id===m.division);if(target.staffChannel)await enqueue(c,'report-notice',{division:m.division,reportId:report.id});
    return 'Obrigado, vamos analisar';
   });return i.editReply(message);
  }
  if(i.isButton()&&i.customId==='ticket')return openTicket(i,d);
  if(i.isButton()&&i.customId.startsWith('close:')){
   if(!await isAdmin(i,d))return i.editReply('Somente administradores podem encerrar o ticket.');
   const id=Number(i.customId.split(':')[1]);const t=(await pool.query('SELECT * FROM tickets WHERE id=$1 AND guild_id=$2 AND channel_id=$3',[id,i.guildId,i.channelId])).rows[0];
   if(!t)return i.editReply('Ticket não encontrado neste canal.');await closeTicket(id,i.user.id);return i.editReply('Ticket resolvido. O canal será removido e o registro ficará no painel.');
  }
  return i.editReply('Ação não reconhecida.');
 }
 client.on('interactionCreate',i=>(activated?interact(i):i.reply({...ephemeral,content:'Sistema em verificação de inicialização. Tente novamente em instantes.'})).catch(async e=>{console.error('Interação falhou:',e.code||e.name);const msg={content:'Não foi possível concluir. Tente novamente ou procure um administrador.',allowedMentions:{parse:[]}};try{if(i.deferred||i.replied)await i.editReply(msg);else await i.reply({...ephemeral,...msg});}catch{}}));
 client.on('guildMemberAdd',member=>community.joined(member).catch(e=>console.error('Boas-vindas: falha ao registrar entrada',e.code||e.name)));
 async function execute(job,c){
  if(districtJobs.has(job.kind))return migrations.execute(job,c);
  if(job.kind==='publish-panels'){await setup();await migrations.publish();return;}
  if(allyJobs.has(job.kind))return allies.execute(job,c);
  if(job.kind==='warning-dm')return warnings.execute(job,c);
  if(communityJobs.has(job.kind))return community.execute(job,c);
  const p=job.payload;
  if(job.kind==='sync-role'){
   await c.query('SELECT pg_advisory_xact_lock(hashtext($1))',[`role:${p.discordId}`]);
   const member=(await c.query('SELECT * FROM members WHERE discord_id=$1 FOR UPDATE',[p.discordId])).rows[0];
   for(const d of config.divisions){
    const g=await guild(d.guild);const user=await g.members.fetch({user:p.discordId,force:true}).catch(e=>{if(e.code===10007)return null;throw e;});if(!user)continue;
    await synchronizeRoles(g,d,user,member);
   }return;
  }
  if(job.kind==='announcement'||job.kind==='war'){
   const d=config.divisions.find(x=>x.id===p.division)||config.divisions[0];const ch=await channel(d.wanted,d.guild);
   const sent=await ch.send({...announcementMessage(job,d),nonce:String(job.id),enforceNonce:true});
   await c.query('UPDATE jobs SET message_id=$1 WHERE id=$2',[sent.id,job.id]);return;
  }
  if(job.kind==='report-notice'){
   const d=config.divisions.find(x=>x.id===p.division)||config.divisions[0];if(!d?.staffChannel)return;
   const ch=await channel(d.staffChannel,d.guild);
   // Do not publish names or report details; full content is restricted to the admin dashboard.
   const sent=await ch.send({content:`Nova denúncia #${p.reportId}. Analise no painel administrativo.`,allowedMentions:{parse:[]},nonce:String(job.id),enforceNonce:true});await c.query('UPDATE jobs SET message_id=$1 WHERE id=$2',[sent.id,job.id]);return;
  }
  if(job.kind==='close-ticket'){
   const t=(await c.query('SELECT * FROM tickets WHERE id=$1 FOR UPDATE',[p.id])).rows[0];if(!t||t.status==='resolvido')return;
   if(t.channel_id){const ch=await client.channels.fetch(t.channel_id).catch(e=>{if(e.code===10003)return null;throw e;});if(ch){if(ch.guildId!==t.guild_id)throw new Error('Servidor de ticket inválido.');await ch.delete('Ticket resolvido');}}
   await c.query("UPDATE tickets SET status='resolvido' WHERE id=$1",[t.id]);return;
  }
  throw new Error('Tipo de operação desconhecido.');
 }
 async function work(){
  if(busy||!ready()||!config.divisions.length)return;busy=true;
  try{
   for(let n=0;n<10;n++){
    let picked;
    try{const processed=await tx(pool,async c=>{
     const job=(await c.query("SELECT * FROM jobs WHERE status='pending' AND next_at<=now() ORDER BY id FOR UPDATE SKIP LOCKED LIMIT 1")).rows[0];if(!job)return false;picked=job;
     await execute(job,c);await c.query("UPDATE jobs SET status='sent',error=NULL WHERE id=$1",[job.id]);return true;
    });if(!processed)break;
    }catch(e){if(!picked)throw e;const attempts=picked.attempts+1;await pool.query('UPDATE jobs SET attempts=$1,status=$2,error=$3,next_at=$4 WHERE id=$5',[attempts,(attempts>=8||[50007,'IFJ_CHANGED'].includes(e.code))?'failed':'pending',e.code===50007?'Discord bloqueou a mensagem privada. Peça ao destinatário para permitir DMs e tente novamente.':e.code==='IFJ_CHANGED'?'Cadastro cancelado ou Discord alterado. Carteira não enviada.':`Discord/operação: ${e.code||e.name}. Verifique canais, cargos, permissões e conexão.`,new Date(Date.now()+Math.min(300000,2000*2**attempts)),picked.id]);}
   }
   await pool.query('DELETE FROM confirmations WHERE expires_at<now()');await pool.query('DELETE FROM sessions WHERE expires_at<now()');
  }catch(e){console.error('Fila do bot:',e.code||e.name);}finally{busy=false;}
 }
 function activate(){if(activated)return;activated=true;timer=setInterval(work,3000);timer.unref();work();}
 async function start(options={}){
  if(!config.botEnabled)return;
  await connectDiscord(client,config.token,options);
 }
 client.on('error',e=>console.error('Conexão Discord:',e.code||e.name));
 return {ready,setup,sendStaffLinkCode,sendMemberSignupCode:sendStaffLinkCode,closeTicket,client,handleInteraction:interact,handleMemberJoin:community.joined,publishGuide:community.publishGuide,start,activate,validate:async log=>{await log.test('SBI: registrar /criar',()=>registerCreate(client,config.divisions.length?config.divisions:config.legacyDistrict?.guild?[config.legacyDistrict]:[]));if(!config.divisions.length){console.info('[SBI] Use /criar no servidor de destino. O distrito ainda não foi configurado.');return;}await validateDiscord(client,config,log);await log.test('Discord: registrar /warn e /ver-sua-carteira',async()=>{await warnings.register();await memberCards.register();});await log.test('Discord: atualizar painéis do distrito',setup);await log.test('Discord: atualizar aviso de imigração',migrations.publish);},stop:async()=>{activated=false;clearInterval(timer);await client.destroy();},work};
}
