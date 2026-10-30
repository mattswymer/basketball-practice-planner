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
export const uid=(p="id")=>p+"-"+Date.now().toString(36)+"-"+Math.random().toString(36).slice(2,8);
export const esc=x=>String(x??"").replace(/[&<>"']/g,c=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"}[c]));
const read=(key,fallback)=>{try{const v=localStorage.getItem(key);return v===null?fallback:JSON.parse(v);}catch{return fallback;}};
export const localDate=()=>{const d=new Date();return d.getFullYear()+"-"+String(d.getMonth()+1).padStart(2,"0")+"-"+String(d.getDate()).padStart(2,"0");};
const word={a:1,an:1,one:1,two:2,three:3,four:4,five:5,six:6,seven:7,eight:8,nine:9,ten:10};
const number=x=>word[String(x||"").toLowerCase()]||Math.max(1,Number(x)||1);
function tagsOf(input){return [...new Set([...(input.tags||[]),input.primarySkill].filter(x=>typeof x==="string"&&SKILLS.includes(x)))];}
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
 return {groups:groups.map((g,i)=>({id:String(g.id||uid("group")),name:String(g.name||"Group "+(i+1)),playerIds:[...new Set((g.playerIds||[]).map(String))]}))};
}
export function normalizeDrill(input={},legacyEquipment="",catalog=oldEquipmentCatalog){
 return {kind:"drill",id:String(input.id||input.schedId||uid("drill")),bankId:input.bankId||input.drillId||null,
  name:String(input.name||"Untitled drill").trim()||"Untitled drill",minutes:Math.max(1,Math.min(240,Math.round(Number(input.minutes??input.duration)||10))),
  tags:tagsOf(input),equipment:equipmentOf(input.equipmentItems||input.equipment,input.equipmentText||(typeof input.equipment==="string"?input.equipment:legacyEquipment),catalog),
  steps:stepsOf(input.steps??input.notes),grouping:groupingOf(input.grouping),source:input.source||"custom"};
}
function normalizeLane(input={},index=0,catalog=oldEquipmentCatalog){
 const raw=input.drill||input;
 const hasDrill=!!raw.name&&!/^(choose a drill|station \d+)$/i.test(raw.name);
 const drills=Array.isArray(input.drills)?input.drills.map(x=>normalizeDrill(x,"",catalog)):hasDrill?[normalizeDrill({...raw,minutes:raw.minutes||raw.duration||10},"",catalog)]:[];
 return {id:String(input.id||uid("lane")),name:String(input.name||input.label||"Lane "+(index+1)),drills};
}
export function normalizeBlock(input={},catalog=oldEquipmentCatalog) {
 if(input.kind==="station"||input.type==="station"){
  let lanes;
  if(Array.isArray(input.lanes))lanes=input.lanes.map((lane,index)=>normalizeLane(lane,index,catalog));
  else lanes=(input.stations||[]).map((s,i)=>{
   const empty=!s?.name||/^(choose a drill|station \d+)$/i.test(s.name);
   return {id:String(s?.id||uid("lane")),name:String(s?.label||"Lane "+(i+1)),drills:empty?[]:[normalizeDrill({...s,minutes:s.minutes||s.duration||10},"",catalog)]};
  });
  const implicit=Math.max(0,...lanes.map(l=>l.drills.reduce((n,d)=>n+d.minutes,0)));
  return {kind:"station",id:String(input.id||input.schedId||uid("station")),name:String(input.name||"Station rotation"),minutes:Math.max(1,Math.min(240,Math.round(Number(input.minutes??input.duration)||implicit||15))),lanes};
 }
 return normalizeDrill(input,"",catalog);
}
export function normalizePlan(input={},teamId="",catalog=oldEquipmentCatalog){
 const blocks=Array.isArray(input.blocks)?input.blocks.map(block=>normalizeBlock(block,catalog)):(input.schedule||[]).map(block=>normalizeBlock(block,catalog));
 return {id:String(input.id||uid("plan")),teamId:String(input.teamId||teamId),name:String(input.name||"Practice plan"),
  date:String(input.date||localDate()),start:String(input.start||input.startTime||"18:00"),end:String(input.end||input.endTime||"19:30"),
  blocks,completedIds:[...new Set((input.completedIds||[]).map(String))],skippedIds:[...new Set((input.skippedIds||[]).map(String))],
  equipmentChecked:{...(input.equipmentChecked||{})},createdAt:input.createdAt||new Date().toISOString()};
}
function normalizePlayer(p,i=0){
 if(p&&typeof p==="object")return {id:String(p.id||uid("player")),name:String(p.name||"Player "+(i+1))};
 const raw=String(p||"").trim(),match=raw.match(/^#?\s*\d{1,3}\s+(.+)$/);
 return {id:uid("player"),name:match?match[1].trim():raw||"Player "+(i+1)};
}
function normalizeTeam(t={},i=0){const roster=Array.isArray(t.players)?t.players:(t.roster||[]);return {id:String(t.id||uid("team")),name:String(t.name||"Team "+(i+1)),players:roster.map(normalizePlayer).filter(p=>p.name)};}
function bankMerge(saved,catalog=oldEquipmentCatalog){
 const seeds=(DATA.PRESET_DRILLS||[]).map(drill=>normalizeDrill(drill,"",catalog)),old=Array.isArray(saved)?saved:[];
 const result=seeds.map(seed=>{const found=old.find(x=>x&&((x.id&&x.id===seed.id)||((x.name||"").toLowerCase()===seed.name.toLowerCase()&&x.source!=="custom")));return found?normalizeDrill({...seed,...found,id:seed.id,source:seed.source},"",catalog):seed;});
 const names=new Set(seeds.map(x=>x.name.toLowerCase()));
 return result.concat(old.filter(x=>x&&x.source==="custom"&&!names.has(String(x.name||"").toLowerCase())).map(drill=>normalizeDrill(drill,"",catalog)));
}
function emptyPlan(teamId,name="Practice plan"){return {id:uid("plan"),teamId,name,date:localDate(),start:"18:00",end:"19:30",blocks:[],completedIds:[],skippedIds:[],equipmentChecked:{},createdAt:new Date().toISOString()};}
function migratePlans(teams,activeId,catalog=oldEquipmentCatalog){
 const plans=read(OLD.schedules,{}),meta=read(OLD.meta,{}),old=read(OLD.oldSchedule,[]),result={};
 for(const team of teams){
  const schedule=Array.isArray(plans?.[team.id])?plans[team.id]:Array.isArray(plans?.[team.id]?.schedule)?plans[team.id].schedule:team.id===activeId&&Array.isArray(old)?old:[];
  result[team.id]=[normalizePlan({teamId:team.id,name:"Practice plan",date:meta.date||localDate(),start:meta.start||meta.startTime||"18:00",end:meta.end||meta.endTime||"19:30",blocks:schedule},team.id,catalog)];
 }
 return result;
}
export function loadApp(){
 oldEquipmentCatalog=read(OLD.equipment,[]);
 const app=read(APP_KEY,read(LEGACY_APP_KEY,null));
 if(app&&Array.isArray(app.teams)){
  SKILLS.splice(0,SKILLS.length,...(Array.isArray(app.skills)?app.skills.map(x=>typeof x==="string"?x:x?.name).filter(Boolean):DEFAULT_SKILLS));
  state.skillColors={...DEFAULT_COLORS,...(app.skillColors||{})};
  state.teams=app.teams.map(normalizeTeam);
  state.activeTeamId=state.teams.some(t=>t.id===app.activeTeamId)?app.activeTeamId:state.teams[0]?.id;
  state.drillBank=bankMerge(app.drillBank,oldEquipmentCatalog);
  state.plansByTeam={};for(const team of state.teams)state.plansByTeam[team.id]=(app.plansByTeam?.[team.id]||[]).map(p=>normalizePlan(p,team.id,oldEquipmentCatalog));
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
 state.activePlanId=state.activePlanIds[state.activeTeamId];state.selectedTeamId=state.activeTeamId;state.statsTeamId=state.activeTeamId;
 state.live={active:false,currentBlockId:null,planId:null};state.skills=SKILLS;save();
}
export function save(){
 if(state.activeTeamId)state.activePlanIds[state.activeTeamId]=state.activePlanId;
 const data={version:2,updatedAt:new Date().toISOString(),teams:state.teams,activeTeamId:state.activeTeamId,drillBank:state.drillBank,
  plansByTeam:state.plansByTeam,activePlanIds:state.activePlanIds,skills:[...SKILLS],skillColors:state.skillColors};
 try{localStorage.setItem(APP_KEY,JSON.stringify(data));}catch(error){console.error("Could not save planner",error);}
}
export function activeTeam(){return state.teams.find(t=>t.id===state.activeTeamId)||state.teams[0]||null;}
export function activePlan(){return (state.plansByTeam[state.activeTeamId]||[]).find(p=>p.id===state.activePlanId)||null;}
export function plansForTeam(teamId=state.activeTeamId){return state.plansByTeam[teamId]||[];}
export function createPlan(teamId=state.activeTeamId,name="New practice"){const plan=emptyPlan(teamId,name);(state.plansByTeam[teamId]||=[]).unshift(plan);state.activeTeamId=teamId;state.activePlanId=plan.id;state.activePlanIds[teamId]=plan.id;save();return plan;}
export function setActiveTeam(id){if(!state.teams.some(t=>t.id===id))return;state.activeTeamId=id;const list=plansForTeam(id);state.activePlanId=state.activePlanIds[id]&&list.some(p=>p.id===state.activePlanIds[id])?state.activePlanIds[id]:list[0]?.id||null;state.live={active:false,currentBlockId:null,planId:null};save();}
export function setActivePlan(id){if(!plansForTeam().some(p=>p.id===id))return;state.activePlanId=id;state.activePlanIds[state.activeTeamId]=id;save();}
export function getBankDrill(id){return state.drillBank.find(d=>d.id===id)||null;}
export function drillsInBlock(block){return block?.kind==="station"?(block.lanes||[]).flatMap(l=>l.drills||[]):block?[block]:[];}
export function flattenDrills(plan){return (plan?.blocks||[]).flatMap(drillsInBlock);}
export function findPlanDrill(plan,id){return flattenDrills(plan).find(d=>d.id===id)||null;}
export function locatePlanDrill(plan,id){
 for(const block of plan?.blocks||[]){
  if(block.kind==="drill"&&block.id===id)return {drill:block,list:plan.blocks,laneId:null,block};
  if(block.kind==="station")for(const lane of block.lanes){const index=lane.drills.findIndex(d=>d.id===id);if(index>=0)return {drill:lane.drills[index],list:lane.drills,laneId:lane.id,block};}
 }
 return null;
}
export function blockMinutes(block){return block?.kind==="station"?Math.max(1,Math.round(Number(block.minutes)||15)):Math.max(1,Math.round(Number(block?.minutes)||1));}
export function totalPracticeMinutes(plan){return (plan?.blocks||[]).reduce((sum,b)=>sum+blockMinutes(b),0);}
export function durationLabel(n){n=Math.max(0,Math.round(n||0));return n>=60?Math.floor(n/60)+"h"+(n%60?String(n%60).padStart(2,"0"):""):n+"m";}
export function timeWindow(plan){const [sh,sm]=(plan.start||"18:00").split(":").map(Number),[eh,em]=(plan.end||"19:30").split(":").map(Number);let n=eh*60+em-(sh*60+sm);return n<=0?n+1440:n;}
export function clockLabel(start,offset){const [h,m]=(start||"18:00").split(":").map(Number),n=h*60+m+offset,day=Math.floor(n/1440),hour=Math.floor(n/60)%24;return (hour%12||12)+":"+String(n%60).padStart(2,"0")+(hour>=12?"p":"a")+(day?" +"+day+"d":"");}
export function skillColor(skill){return state.skillColors[skill]||PALETTE[Math.max(0,SKILLS.indexOf(skill))%PALETTE.length]||"#55758a";}
export function copyDrill(drill){return {...clone(drill),kind:"drill",id:uid("drill"),bankId:drill.id,source:"scheduled",grouping:{groups:[]}};}
export function equipmentTotals(plan){
 const players=Math.max(1,state.teams.find(t=>t.id===plan?.teamId)?.players.length||1),total=x=>x.perPlayerQuantity+x.fixedQuantity;
 const demand=drill=>{
  const map=new Map();for(const x of drill.equipment||[]){const key=x.name.toLowerCase(),v=map.get(key)||{name:x.name,perPlayerQuantity:0,fixedQuantity:0,uses:new Set()};
   if(x.perPlayer)v.perPlayerQuantity+=x.quantity*players;else v.fixedQuantity+=x.quantity;v.uses.add(drill.name);map.set(key,v);}return map;
 };
 const peak=new Map(),merge=(target,source)=>{
  for(const [key,v]of source){if(!target.has(key))target.set(key,{...v,uses:new Set(v.uses)});else{const t=target.get(key);if(total(v)>total(t)){t.perPlayerQuantity=v.perPlayerQuantity;t.fixedQuantity=v.fixedQuantity;}v.uses.forEach(name=>t.uses.add(name));}}
 };
 for(const block of plan?.blocks||[]){
  const together=new Map();
  if(block.kind==="drill")merge(together,demand(block));
  else for(const lane of block.lanes){const laneMap=new Map();lane.drills.forEach(d=>merge(laneMap,demand(d)));
   for(const [key,v]of laneMap){if(!together.has(key))together.set(key,{...v,uses:new Set(v.uses)});else{const t=together.get(key);t.perPlayerQuantity=Math.max(t.perPlayerQuantity,v.perPlayerQuantity);t.fixedQuantity+=v.fixedQuantity;v.uses.forEach(n=>t.uses.add(n));}}
  }
  merge(peak,together);
 }
 return [...peak.values()].map(v=>({name:v.name,quantity:total(v),uses:[...v.uses]})).sort((a,b)=>a.name.localeCompare(b.name));
}
export function remember(){
 history.push(clone({teams:state.teams,activeTeamId:state.activeTeamId,drillBank:state.drillBank,plansByTeam:state.plansByTeam,activePlanIds:state.activePlanIds,activePlanId:state.activePlanId,skills:SKILLS,skillColors:state.skillColors}));
 if(history.length>40)history.shift();
}
export function undo(){
 const old=history.pop();if(!old)return false;Object.assign(state,old);SKILLS.splice(0,SKILLS.length,...old.skills);state.skills=SKILLS;state.live={active:false,currentBlockId:null,planId:null};save();return true;
}
export function canUndo(){return history.length>0;}
export function addSkill(name,color){const value=String(name||"").trim();if(!value||SKILLS.some(x=>x.toLowerCase()===value.toLowerCase()))return false;remember();SKILLS.push(value);state.skillColors[value]=color||PALETTE[(SKILLS.length-1)%PALETTE.length];save();return true;}
export function renameSkill(oldName,newName,color){
 const value=String(newName||"").trim();if(!SKILLS.includes(oldName)||!value||SKILLS.some(x=>x!==oldName&&x.toLowerCase()===value.toLowerCase()))return false;
 remember();SKILLS.splice(SKILLS.indexOf(oldName),1,value);if(oldName!==value){state.skillColors[value]=state.skillColors[oldName];delete state.skillColors[oldName];}if(color)state.skillColors[value]=color;
 const update=d=>d.tags=[...new Set(d.tags.map(x=>x===oldName?value:x))];state.drillBank.forEach(update);Object.values(state.plansByTeam).flat().forEach(p=>flattenDrills(p).forEach(update));save();return true;
}
export function deleteSkill(name){
 if(!SKILLS.includes(name))return false;remember();SKILLS.splice(SKILLS.indexOf(name),1);delete state.skillColors[name];
 const update=d=>d.tags=d.tags.filter(x=>x!==name);state.drillBank.forEach(update);Object.values(state.plansByTeam).flat().forEach(p=>flattenDrills(p).forEach(update));save();return true;
}
