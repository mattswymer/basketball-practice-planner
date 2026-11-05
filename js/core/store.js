const DATA=window.PLANNER_DATA||{};
const DEFAULT_SKILLS=DATA.DEFAULT_TAGS||["layups","dribbling","defense","shooting","rebounding","passing","free throws","team building","plays","sprints","post","warm up","stretch","rest"];
const DEFAULT_COLORS=DATA.TAG_COLORS||{};
const PALETTE=["#2d7891","#bd7837","#ba5c56","#5678a5","#6c8a55","#8a65a7","#398b7c","#a36b83","#907c42","#647b88"];
const APP_KEY="bbp_app_v2",LEGACY_APP_KEY="bbp_app_v1";
let oldEquipmentCatalog=[];
const OLD={teams:"cyb_teams_v1",active:"cyb_active_team_v1",bank:"cyb_drill_bank_v2",oldBank:"cyb_drill_bank_v1",schedules:"cyb_team_schedules_v2",oldSchedule:"cyb_active_schedule_v1",meta:"cyb_practice_meta_v2",equipment:"cyb_equipment_catalog_v1"};
export const SKILLS=[...DEFAULT_SKILLS];
export const state={teams:[],activeTeamId:null,drillBank:[],plansByTeam:{},activePlanIds:{},activePlanId:null,view:"plans",live:{active:false,currentBlockId:null,planId:null},planDetailOpen:false,selectedTeamId:null,statsTeamId:null,skills:SKILLS,skillColors:{...DEFAULT_COLORS},groupingDrillId:null};
let history=[];
export const clone=x=>JSON.parse(JSON.stringify(x));
export const uid=(p="id")=>p+"-"+(crypto.randomUUID?.()||Date.now().toString(36)+"-"+Math.random().toString(36).slice(2,8));
export const esc=x=>String(x??"").replace(/[&<>"']/g,c=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"}[c]));
const read=(key,fallback)=>{try{const v=localStorage.getItem(key);return v===null?fallback:JSON.parse(v);}catch{return fallback;}};
export const localDate=()=>{const d=new Date();return d.getFullYear()+"-"+String(d.getMonth()+1).padStart(2,"0")+"-"+String(d.getDate()).padStart(2,"0");};
const word={a:1,an:1,one:1,two:2,three:3,four:4,five:5,six:6,seven:7,eight:8,nine:9,ten:10};
const number=x=>word[String(x||"").toLowerCase()]||Math.max(1,Number(x)||1);
function tagsOf(input){input=input&&typeof input==="object"?input:{};return [...new Set([...(Array.isArray(input.tags)?input.tags:[]),input.primarySkill].filter(value=>typeof value==="string"&&SKILLS.includes(value)))];}
function stepsOf(input){const v=Array.isArray(input)?input:String(input||"").split(/\r?\n/);return v.map(x=>String(x||"").replace(/^\s*(?:\d+[A-Za-z]?[.)]|[-•])\s*/,"").trim()).filter(Boolean);}
function parseEquipment(text){
 const s=String(text||"").toLowerCase(),out=[];
 const add=(name,rx,per)=>{const all=[...s.matchAll(new RegExp("\\b(?:"+rx+")\\b","gi"))];if(!all.length)return;
 if(per&&per.test(s)){out.push({name,quantity:1,perPlayer:true});return;}
 const nums=[...s.matchAll(new RegExp("\\b(one|a|an|two|three|four|five|six|seven|eight|nine|ten|\\d+)\\s+(?:"+rx+")\\b","gi"))];
 const after=[...s.matchAll(new RegExp("(?:"+rx+")\\s*[×x]\\s*(\\d+)","gi"))];
 const quantity=after.length?after.reduce((n,m)=>n+number(m[1]),0):nums.reduce((n,m)=>n+number(m[1]),0)||all.length;
 out.push({name,quantity,perPlayer:false});};
 add("Basketballs","basketballs?|balls?",/(?:balls?|basketballs?)\s*(?:for each|per)\s+player|each player[^.]*\b(?:balls?|basketballs?)\b|\b(?:ball|basketball)\s+for\s+each\s+player/i);
 add("Cones","cones?");add("Pinnies","pinnies|jerseys?");add("Whistles","whistles?");add("Stopwatches","stopwatches?");add("Clipboards","clipboards?");add("Floor tape","floor\s+tape");add("Hurdles","hurdles?");add("Resistance bands","resistance\s+bands?");add("First-aid kits","first[- ]aid\s+kits?");
 return out;
}
function equipmentOf(input,legacy="",catalog=oldEquipmentCatalog){
 const values=Array.isArray(input)?input:[];
 if(!values.length)return parseEquipment(typeof input==="string"?input:legacy);
 const result=values.map(x=>{
  const option=catalog.find(item=>item.id===x?.optionId||item.id===x?.id);
  const name=x?.name||option?.name;
  return name?{name:String(name).trim(),quantity:Math.max(1,Math.min(999,Math.round(Number(x.quantity)||1))),perPlayer:!!x.perPlayer}:null;
 }).filter(Boolean);
 for(const inferred of parseEquipment(legacy)){
  const existing=result.find(x=>x.name.toLowerCase()===inferred.name.toLowerCase());
  if(existing){if(inferred.perPlayer){existing.quantity=inferred.quantity;existing.perPlayer=true;}else if(values.every(x=>!x?.name)){existing.quantity=inferred.quantity;existing.perPlayer=false;}}
  else result.push(inferred);
 }
 return result;
}
function groupingOf(input){
 const groups=Array.isArray(input?.groups)?input.groups:[];
 return {groups:groups.map((g,i)=>{g=g&&typeof g==="object"?g:{};return {id:String(g.id||uid("group")),name:String(g.name||"Group "+(i+1)),playerIds:[...new Set((Array.isArray(g.playerIds)?g.playerIds:[]).map(String))]};})};
}
export function normalizeDrill(input={},legacyEquipment="",catalog=oldEquipmentCatalog){
 input=input&&typeof input==="object"?input:{};
 return {kind:"drill",id:String(input.id||input.schedId||uid("drill")),bankId:input.bankId||input.drillId||null,
  name:String(input.name||"Untitled drill").trim()||"Untitled drill",minutes:Math.max(1,Math.min(240,Math.round(Number(input.minutes??input.duration)||10))),
  tags:tagsOf(input),equipment:equipmentOf(input.equipmentItems||input.equipment,input.equipmentText||(typeof input.equipment==="string"?input.equipment:legacyEquipment),catalog),
  steps:stepsOf(input.steps??input.notes??input.instructions),notes:String(input.coachNotes??input.notesText??input.setupNotes??input.focus??"").trim(),grouping:groupingOf(input.grouping),source:input.source||"custom"};
}
function stationDrills(input,catalog){
 const direct=Array.isArray(input?.drills)?input.drills:[];
 const groups=Array.isArray(input?.groups)?input.groups:[];
 const lanes=Array.isArray(input?.lanes)?input.lanes:[];
 const grouped=groups.flatMap(group=>Array.isArray(group?.drills)?group.drills:[]);
 const nested=lanes.flatMap(lane=>Array.isArray(lane?.groups)?lane.groups.flatMap(group=>Array.isArray(group?.drills)?group.drills:[]):Array.isArray(lane?.drills)?lane.drills:[]);
 return (direct.length?direct:grouped.length?grouped:nested).map(item=>normalizeDrill(item,"",catalog));
}
function normalizeStation(input={},index=0,catalog=oldEquipmentCatalog){
 input=input&&typeof input==="object"?input:{};
 return {id:String(input.id||uid("station")),name:String(input.name||"Station "+(index+1)),drills:stationDrills(input,catalog)};
}
function distributeStationMinutes(station,target){
 const drills=station?.drills||[];
 if(!drills.length)return;
 const total=Math.max(drills.length,Math.round(Number(target)||drills.length));
 const weights=drills.map(drill=>Math.max(1,Number(drill.minutes)||1));
 const sum=weights.reduce((x,y)=>x+y,0);
 const raw=weights.map(weight=>(total-drills.length)*weight/sum);
 const values=raw.map(value=>1+Math.floor(value));
 let remainder=total-values.reduce((x,y)=>x+y,0);
 const order=raw.map((value,index)=>({index,fraction:value-Math.floor(value)})).sort((x,y)=>y.fraction-x.fraction);
 for(let index=0;remainder>0;index++,remainder--)values[order[index%order.length].index]++;
 drills.forEach((drill,index)=>{drill.minutes=values[index];});
}
export function stationRounds(block){
 const stations=block?.stations||[],count=stations.length;
 if(!count)return [];
 const visitMinutes=Math.max(0,...stations.map(station=>(station.drills||[]).reduce((sum,drill)=>sum+Math.max(1,Number(drill.minutes)||1),0)));
 if(visitMinutes)return Array(count).fill(visitMinutes);
 const total=Math.max(count,Math.round(Number(block.minutes)||15));
 const base=Math.floor(total/count),remainder=total%count;
 return Array.from({length:count},(_,index)=>base+(index<remainder?1:0));
}
export function fitStationLanes(block,target=block?.minutes){
 if(!block||block.kind!=="station")return Math.max(1,Math.round(Number(target)||1));
 const count=Math.max(1,block.stations?.length||0);
 const total=Math.max(count,Math.min(240,Math.round(Number(target)||block.minutes||15)));
 const perVisit=Math.max(1,Math.floor(total/count));
 for(const station of block.stations||[])distributeStationMinutes(station,perVisit);
 const hasActivities=(block.stations||[]).some(station=>station.drills?.length);
 block.minutes=hasActivities?perVisit*count:total;
 block.rotationModel="cyclic-v1";
 return block.minutes;
}
export function normalizeBlock(input={},catalog=oldEquipmentCatalog){
 input=input&&typeof input==="object"?input:{};
 if(input.kind==="station"||input.type==="station"){
  const source=input.stations||input.lanes||input.groups||[];
  const stations=Array.isArray(source)?source.map((station,index)=>normalizeStation(station,index,catalog)):[];
  const longestVisit=Math.max(0,...stations.map(station=>(station.drills||[]).reduce((sum,drill)=>sum+drill.minutes,0)));
  const legacyDuration=longestVisit?longestVisit*Math.max(1,stations.length):Number(input.minutes??input.duration)||15;
  const minutes=input.rotationModel==="cyclic-v1"?Number(input.minutes)||15:legacyDuration;
  return {kind:"station",id:String(input.id||input.schedId||uid("rotation")),name:String(input.name||"Station rotation"),minutes:Math.max(1,Math.min(240,Math.round(minutes))),rotationModel:"cyclic-v1",stations};
 }
 return normalizeDrill(input,"",catalog);
}
export function normalizePlan(input={},teamId="",catalog=oldEquipmentCatalog){
 input=input&&typeof input==="object"?input:{};
 const blocks=Array.isArray(input.blocks)?input.blocks.map(block=>normalizeBlock(block,catalog)):(Array.isArray(input.schedule)?input.schedule:[]).map(block=>normalizeBlock(block,catalog));
 return {id:String(input.id||uid("plan")),teamId:String(input.teamId||teamId),name:String(input.name||"Practice plan"),
  date:String(input.date||localDate()),start:String(input.start||input.startTime||"18:00"),end:String(input.end||input.endTime||"19:30"),
  blocks,
  equipmentChecked:{...(input.equipmentChecked||{})},createdAt:input.createdAt||new Date().toISOString()};
}
function normalizePlayer(p,i=0){
 if(p&&typeof p==="object"){
  const player={id:String(p.id||uid("player")),name:String(p.name||"Player "+(i+1))};
  const number=p.number??p.jerseyNumber??p.jersey;
  if(number!==undefined&&number!==null&&String(number).trim()!=="")player.number=String(number).replace(/^#/,"");
  return player;
 }
 const raw=String(p||"").trim(),match=raw.match(/^#?\s*(\d{1,3})\s+(.+)$/);
 return {id:uid("player"),...(match?{number:match[1]}:{}),name:match?match[2].trim():raw||"Player "+(i+1)};
}
function normalizeTeam(t={},i=0){t=t&&typeof t==="object"?t:{};const roster=Array.isArray(t.players)?t.players:Array.isArray(t.roster)?t.roster:[];return {id:String(t.id||uid("team")),name:String(t.name||"Team "+(i+1)),players:roster.map(normalizePlayer).filter(p=>p.name)};}
function bankMerge(saved,catalog=oldEquipmentCatalog){
 const seeds=(DATA.PRESET_DRILLS||[]).map(drill=>normalizeDrill(drill,"",catalog)),old=Array.isArray(saved)?saved:[];
 const result=seeds.map(seed=>{const found=old.find(item=>item?.id===seed.id);return found?normalizeDrill({...seed,...found,id:seed.id,source:seed.source},"",catalog):seed;});
 const seedIds=new Set(seeds.map(seed=>seed.id));
 return result.concat(old.filter(item=>item&&item.source==="custom"&&!seedIds.has(item.id)).map(drill=>normalizeDrill(drill,"",catalog)));
}
function emptyPlan(teamId,name="Practice plan"){return {id:uid("plan"),teamId,name,date:localDate(),start:"18:00",end:"19:30",blocks:[],equipmentChecked:{},createdAt:new Date().toISOString()};}
function migratePlans(teams,activeId,catalog=oldEquipmentCatalog){
 const plans=read(OLD.schedules,{}),meta=read(OLD.meta,{}),old=read(OLD.oldSchedule,[]),result={};
 for(const team of teams){
  const schedule=Array.isArray(plans?.[team.id])?plans[team.id]:Array.isArray(plans?.[team.id]?.schedule)?plans[team.id].schedule:team.id===activeId&&Array.isArray(old)?old:[];
  result[team.id]=[normalizePlan({teamId:team.id,name:"Practice plan",date:meta.date||localDate(),start:meta.start||meta.startTime||"18:00",end:meta.end||meta.endTime||"19:30",blocks:schedule},team.id,catalog)];
 }
 return result;
}
function backupBeforeMigration(){
 const key="bbp_migration_backup_v4";
 if(localStorage.getItem(key))return;
 const snapshot={};
 [APP_KEY,LEGACY_APP_KEY,...Object.values(OLD)].forEach(name=>{const value=localStorage.getItem(name);if(value!==null)snapshot[name]=value;});
 try{localStorage.setItem(key,JSON.stringify({createdAt:new Date().toISOString(),values:snapshot}));}
 catch(error){console.error("Could not create migration backup",error);}
}
function safeColor(value,fallback){return typeof value==="string"&&/^#[0-9a-f]{6}$/i.test(value)?value:fallback;}
export function loadApp(){
 const equipment=read(OLD.equipment,[]);oldEquipmentCatalog=Array.isArray(equipment)?equipment:[];
 const app=read(APP_KEY,read(LEGACY_APP_KEY,null));
 if(!app||Number(app.version||0)<4)backupBeforeMigration();
 if(app&&Array.isArray(app.teams)){
  SKILLS.splice(0,SKILLS.length,...(Array.isArray(app.skills)?app.skills.map(x=>typeof x==="string"?x:x?.name).filter(Boolean):DEFAULT_SKILLS));
  state.skillColors={...DEFAULT_COLORS,...Object.fromEntries(Object.entries(app.skillColors||{}).filter(([skill])=>SKILLS.includes(skill)).map(([skill,color])=>[skill,safeColor(color,DEFAULT_COLORS[skill]||PALETTE[0])]))};
  state.teams=app.teams.map(normalizeTeam);
  state.activeTeamId=state.teams.some(t=>t.id===app.activeTeamId)?app.activeTeamId:state.teams[0]?.id;
  state.drillBank=bankMerge(app.drillBank,oldEquipmentCatalog);
  state.plansByTeam={};for(const team of state.teams){const plans=app.plansByTeam?.[team.id];state.plansByTeam[team.id]=(Array.isArray(plans)?plans:[]).map(p=>normalizePlan(p,team.id,oldEquipmentCatalog));}
  state.activePlanIds={...(app.activePlanIds||{})};
 }else{
  const teams=read(OLD.teams,[{id:"t1",name:"Team 1",roster:[]},{id:"t2",name:"Team 2",roster:[]}]);
  state.teams=(Array.isArray(teams)?teams:[]).map(normalizeTeam);
  if(!state.teams.length)state.teams=[normalizeTeam({name:"My Team"})];
  const active=localStorage.getItem(OLD.active);state.activeTeamId=state.teams.some(t=>t.id===active)?active:state.teams[0].id;
  SKILLS.splice(0,SKILLS.length,...DEFAULT_SKILLS);state.skillColors={...DEFAULT_COLORS};
  state.drillBank=bankMerge(read(OLD.bank,read(OLD.oldBank,[])),oldEquipmentCatalog);
  state.plansByTeam=migratePlans(state.teams,state.activeTeamId,oldEquipmentCatalog);state.activePlanIds={};
 }
 for(const team of state.teams){
  state.plansByTeam[team.id]||=[];
  if(!state.plansByTeam[team.id].length)state.plansByTeam[team.id]=[emptyPlan(team.id)];
  const desired=state.activePlanIds[team.id];
  state.activePlanIds[team.id]=state.plansByTeam[team.id].some(p=>p.id===desired)?desired:state.plansByTeam[team.id][0].id;
 }
 SKILLS.sort((a,b)=>a.localeCompare(b));
 state.activePlanId=state.activePlanIds[state.activeTeamId];state.selectedTeamId=state.activeTeamId;state.statsTeamId=state.activeTeamId;
 state.live={active:false,currentBlockId:null,planId:null};state.skills=SKILLS;save();
}
export function save(){
 if(state.activeTeamId)state.activePlanIds[state.activeTeamId]=state.activePlanId;
 const data={version:4,updatedAt:new Date().toISOString(),teams:state.teams,activeTeamId:state.activeTeamId,drillBank:state.drillBank,
  plansByTeam:state.plansByTeam,activePlanIds:state.activePlanIds,skills:[...SKILLS],skillColors:state.skillColors};
 try{localStorage.setItem(APP_KEY,JSON.stringify(data));const status=document.getElementById("save-status");if(status){status.textContent="Saved";status.title="Changes saved on this device.";status.dataset.state="saved";}}catch(error){console.error("Could not save planner",error);const status=document.getElementById("save-status");if(status){status.textContent="Not saved";status.title="Storage failed. Download a backup before leaving.";status.dataset.state="error";}}
}
export function activeTeam(){return state.teams.find(t=>t.id===state.activeTeamId)||state.teams[0]||null;}
export function activePlan(){return (state.plansByTeam[state.activeTeamId]||[]).find(p=>p.id===state.activePlanId)||null;}
export function plansForTeam(teamId=state.activeTeamId){return state.plansByTeam[teamId]||[];}
export function createPlan(teamId=state.activeTeamId,name="New practice"){const plan=emptyPlan(teamId,name);(state.plansByTeam[teamId]||=[]).unshift(plan);state.activeTeamId=teamId;state.activePlanId=plan.id;state.activePlanIds[teamId]=plan.id;save();return plan;}
export function setActiveTeam(id){if(!state.teams.some(t=>t.id===id))return;state.activeTeamId=id;const list=plansForTeam(id);state.activePlanId=state.activePlanIds[id]&&list.some(p=>p.id===state.activePlanIds[id])?state.activePlanIds[id]:list[0]?.id||null;state.live={active:false,currentBlockId:null,planId:null};save();}
export function setActivePlan(id){if(!plansForTeam().some(p=>p.id===id))return;state.activePlanId=id;state.activePlanIds[state.activeTeamId]=id;save();}
export function getBankDrill(id){return state.drillBank.find(d=>d.id===id)||null;}
export function drillsInBlock(block){return block?.kind==="station"?(block.stations||[]).flatMap(s=>s.drills||[]):block?[block]:[];}
export function flattenDrills(plan){return (plan?.blocks||[]).flatMap(drillsInBlock);}
export function findPlanDrill(plan,id){return flattenDrills(plan).find(d=>d.id===id)||null;}
export function locatePlanDrill(plan,id){for(const block of plan?.blocks||[]){if(block.kind==="drill"&&block.id===id)return {drill:block,list:plan.blocks,stationId:null,block};if(block.kind==="station")for(const station of block.stations||[]){const index=station.drills.findIndex(d=>d.id===id);if(index>=0)return {drill:station.drills[index],list:station.drills,stationId:station.id,block};}}return null;}
export function blockMinutes(block){
 if(block?.kind==="station"){
  const rounds=stationRounds(block);
  return rounds.length?rounds.reduce((sum,minutes)=>sum+minutes,0):Math.max(1,Math.round(Number(block.minutes)||15));
 }
 return Math.max(1,Math.round(Number(block?.minutes)||1));
}
export function totalPracticeMinutes(plan){return (plan?.blocks||[]).reduce((sum,b)=>sum+blockMinutes(b),0);}
export function durationLabel(n){n=Math.max(0,Math.round(n||0));return n>=60?Math.floor(n/60)+"h"+(n%60?String(n%60).padStart(2,"0"):""):n+"m";}
export function timeWindow(plan){const [sh,sm]=(plan.start||"18:00").split(":").map(Number),[eh,em]=(plan.end||"19:30").split(":").map(Number);return eh*60+em-(sh*60+sm);}
export function clockLabel(start,offset){const [h,m]=(start||"18:00").split(":").map(Number),n=h*60+m+offset,day=Math.floor(n/1440),hour=Math.floor(n/60)%24;return (hour%12||12)+":"+String(n%60).padStart(2,"0")+(hour>=12?"p":"a")+(day?" +"+day+"d":"");}
export function skillColor(skill){const fallback=PALETTE[Math.max(0,SKILLS.indexOf(skill))%PALETTE.length]||"#55758a";return safeColor(state.skillColors[skill],safeColor(DEFAULT_COLORS[skill],fallback));}
export function copyDrill(drill){return {...clone(drill),kind:"drill",id:uid("drill"),bankId:drill.id,source:"scheduled",grouping:{groups:[]}};}
export function equipmentTotals(plan){
 const players=Math.max(1,state.teams.find(team=>team.id===plan?.teamId)?.players.length||0);
 const total=value=>value.perPlayerQuantity+value.fixedQuantity;
 const demand=drill=>{
  const result=new Map();
  for(const item of drill.equipment||[]){
   const key=item.name.toLowerCase();
   const value=result.get(key)||{name:item.name,perPlayerQuantity:0,fixedQuantity:0,uses:new Set()};
   if(item.perPlayer)value.perPlayerQuantity+=item.quantity*players;
   else value.fixedQuantity+=item.quantity;
   value.uses.add(drill.name);
   result.set(key,value);
  }
  return result;
 };
 const peak=new Map();
 const merge=(target,source)=>{
  for(const [key,value] of source){
   if(!target.has(key)){target.set(key,{...value,uses:new Set(value.uses)});continue;}
   const current=target.get(key);
   if(total(value)>total(current)){
    current.perPlayerQuantity=value.perPlayerQuantity;
    current.fixedQuantity=value.fixedQuantity;
   }
   value.uses.forEach(name=>current.uses.add(name));
  }
 };
 for(const block of plan?.blocks||[]){
  const simultaneous=new Map();
  if(block.kind==="drill")merge(simultaneous,demand(block));
  else{
   for(const station of block.stations||[]){
    const stationDemand=new Map();
    for(const drill of station.drills||[])merge(stationDemand,demand(drill));
    for(const [key,value] of stationDemand){
     if(!simultaneous.has(key))simultaneous.set(key,{...value,uses:new Set(value.uses)});
     else{
      const current=simultaneous.get(key);
      current.perPlayerQuantity=Math.max(current.perPlayerQuantity,value.perPlayerQuantity);
      current.fixedQuantity+=value.fixedQuantity;
      value.uses.forEach(name=>current.uses.add(name));
     }
    }
   }
  }
  merge(peak,simultaneous);
 }
 return [...peak.values()].map(value=>({name:value.name,quantity:total(value),uses:[...value.uses]})).sort((a,b)=>a.name.localeCompare(b.name));
}
export function remember(){
 history.push(clone({teams:state.teams,activeTeamId:state.activeTeamId,drillBank:state.drillBank,plansByTeam:state.plansByTeam,activePlanIds:state.activePlanIds,activePlanId:state.activePlanId,skills:SKILLS,skillColors:state.skillColors}));
 if(history.length>40)history.shift();
}
export function undo(){
 const old=history.pop();if(!old)return false;Object.assign(state,old);SKILLS.splice(0,SKILLS.length,...old.skills);state.skills=SKILLS;state.live={active:false,currentBlockId:null,planId:null};save();return true;
}
export function canUndo(){return history.length>0;}
export function addSkill(name,color){const value=String(name||"").trim();if(!value||SKILLS.some(x=>x.toLowerCase()===value.toLowerCase()))return false;remember();SKILLS.push(value);SKILLS.sort((a,b)=>a.localeCompare(b));state.skillColors[value]=color||PALETTE[(SKILLS.length-1)%PALETTE.length];save();return true;}
export function renameSkill(oldName,newName,color){
 const value=String(newName||"").trim();if(!SKILLS.includes(oldName)||!value||SKILLS.some(x=>x!==oldName&&x.toLowerCase()===value.toLowerCase()))return false;
 remember();SKILLS.splice(SKILLS.indexOf(oldName),1,value);SKILLS.sort((a,b)=>a.localeCompare(b));if(oldName!==value){state.skillColors[value]=state.skillColors[oldName];delete state.skillColors[oldName];}if(color)state.skillColors[value]=color;
 const update=d=>d.tags=[...new Set(d.tags.map(x=>x===oldName?value:x))];state.drillBank.forEach(update);Object.values(state.plansByTeam).flat().forEach(p=>flattenDrills(p).forEach(update));save();return true;
}
export function deleteSkill(name){
 if(!SKILLS.includes(name))return false;remember();SKILLS.splice(SKILLS.indexOf(name),1);SKILLS.sort((a,b)=>a.localeCompare(b));delete state.skillColors[name];
 const update=d=>d.tags=d.tags.filter(x=>x!==name);state.drillBank.forEach(update);Object.values(state.plansByTeam).flat().forEach(p=>flattenDrills(p).forEach(update));save();return true;
}
