import {mkdir,writeFile} from 'node:fs/promises';
import {renderCard} from '../src/cards.js';
import {DISTRICT_NAME} from '../src/brand.js';
const base={id:42,name:'Lukas Kage',game_nick:'Lukas Kage',roblox_username:'LukasRokuhara',discord_id:'123456789012345678',ifj:'000123456789012',identity_version:2,created_at:'2026-09-22T12:00:00Z',verified:true,suspect:false,account_kind:'membro',member_rank:'Membro'};
await mkdir(new URL('../../EXEMPLOS/',import.meta.url),{recursive:true});
for(const [name,changes] of [['membro',{}],['lider',{member_rank:'Líder'}],['aliado',{account_kind:'aliado',member_rank:'Aliado',allied_gang:'Ryuketsu'}]]){
 await writeFile(new URL(`../../EXEMPLOS/carteira-${name}.png`,import.meta.url),await renderCard({...base,...changes},DISTRICT_NAME,{issuedAt:new Date('2026-10-06T12:00:00Z')}));
}
