import {publishPanel} from './panels.js';
import {RokuharaEmbed} from './embed-theme.js';
import {BRAND_NAME,DISTRICT_NAME} from './brand.js';
export function allianceMessage(d,invite){
 return {embeds:[new RokuharaEmbed(d.id).setTitle(`${BRAND_NAME} × RYUKETSU`).setDescription([
 '🤝 **NOSSA ALIANÇA**',
 `A **RYUKETSU** é uma gang aliada da **${BRAND_NAME}**. A parceria entre nossas comunidades segue com respeito, união e cooperação.`,
 '🛡️ **RESPEITO ENTRE ALIADOS**',
 'Recebam nossos aliados com educação. Ao visitar o servidor deles, respeitem as regras e os membros. Se surgir algum problema, procurem a administração para resolver com diálogo.',
 `🔗 **SERVIDOR DA RYUKETSU**\n${invite}`,
 `━━━━━━━━━━━━━━━━━━\n**✦ ${BRAND_NAME} × RYUKETSU ✦**\n*⚔️ Duas forças, uma aliança. 🤝*`
 ].join('\n\n')).addFields({name:'Compromisso da aliança',value:'Respeito às regras, cooperação entre membros e diálogo com a administração.'}).setFooter({text:`${DISTRICT_NAME} • Parceria entre comunidades`})],allowedMentions:{parse:[]}};
}
export async function publishAlliance(pool,client,d,invite){
 if(!d.allianceChannel)return;
 const ch=await client.channels.fetch(d.allianceChannel);
 if(!ch||ch.guildId!==d.guild||!ch.isTextBased()||!ch.send)throw new Error(`DIV_${d.id}_ALLIANCE_CHANNEL_ID: canal inválido.`);
 const content=allianceMessage(d,invite);
 await publishPanel(pool,client,ch,d.allianceChannel,'alliance',content);
}
