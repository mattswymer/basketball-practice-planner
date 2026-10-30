const DATA = window.PLANNER_DATA || {};
export const SKILLS = DATA.DEFAULT_TAGS || ["layups","dribbling","defense","shooting","rebounding","passing","free throws","team building","plays","sprints","post","warm up","stretch","rest"];
export const TAG_COLORS = DATA.TAG_COLORS || {};
const APP_KEY = "bbp_app_v1";
const OLD = {
  teams:"cyb_teams_v1", active:"cyb_active_team_v1", oldBank:"cyb_drill_bank_v1",
  bank:"cyb_drill_bank_v2", oldSchedule:"cyb_active_schedule_v1",
  schedules:"cyb_team_schedules_v2", meta:"cyb_practice_meta_v2", equipment:"cyb_equipment_catalog_v1"
};
const PALETTE = ["#2d7891","#bd7837","#ba5c56","#5678a5","#6c8a55","#8a65a7","#398b7c","#a36b83","#907c42","#647b88"];
export const state = {
  teams:[], activeTeamId:null, drillBank:[], plansByTeam:{}, activePlanIds:{},
  activePlanId:null, view:"plans", live:{active:false,currentDrillId:null,planId:null},
  wakeLock:null, planDetailOpen:false, selectedTeamId:null, statsTeamId:null
};
let undoStack = [];
export const clone = value => JSON.parse(JSON.stringify(value));
export const uid = (prefix="id") => prefix+"-"+Date.now().toString(36)+"-"+Math.random().toString(36).slice(2,8);
export const esc = value => String(value ?? "").replace(/[&<>"']/g, c => ({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"}[c]));
const read = (key,fallback) => { try { const value=localStorage.getItem(key); return value===null?fallback:JSON.parse(value); } catch { return fallback; } };
export const localDate = () => { const d=new Date(); return d.getFullYear()+"-"+String(d.getMonth()+1).padStart(2,"0")+"-"+String(d.getDate()).padStart(2,"0"); };
const wordNumbers = {a:1,an:1,one:1,two:2,three:3,four:4,five:5,six:6,seven:7,eight:8,nine:9,ten:10,eleven:11,twelve:12};
const quantity = value => wordNumbers[String(value||"").toLowerCase()] || Math.max(1,Number(value)||1);
const cleanSkill = value => SKILLS.includes(value) ? value : "team building";
const parseSteps = value => {
  if (Array.isArray(value)) return value.map(x=>String(x||"").trim()).filter(Boolean);
  return String(value||"").split(/\r?\n/).map(line=>line.replace(/^\s*(?:\d+[A-Za-z]?[.)]|[-•])\s*/,"").trim()).filter(Boolean);
};
function parseLegacyEquipment(value) {
  const text=String(value||"").toLowerCase(), out=[];
  if(!text) return out;
  const add=(name,pattern,aliases,perPlayerPattern)=>{
    const rx=new RegExp("\\b("+aliases+")\\b","gi");
    const matches=[...text.matchAll(rx)];
    if(!matches.length) return;
    const isPerPlayer=perPlayerPattern ? perPlayerPattern.test(text) : false;
    if(isPerPlayer){out.push({name,quantity:1,perPlayer:true});return;}
    const nums=[...text.matchAll(new RegExp("\\b(one|a|an|two|three|four|five|six|seven|eight|nine|ten|\\d+)\\s+(?:"+aliases+")\\b","gi"))];
    let total=nums.reduce((sum,m)=>sum+quantity(m[1]),0);
    if(!total) total=Math.max(1,matches.length);
    out.push({name,quantity:total,perPlayer:false});
  };
  add("Basketballs","balls?", "balls?", /(?:ball|basketball)s?\s*(?:for each|per)\s+player|each player[^.]*\bballs?\b|\bball\s+for\s+each\s+player/i);
  add("Cones","cones?", "cones?");
  add("Pinnies","pinnies|jerseys?", "pinnies|jerseys?");
  add("Whistles","whistles?", "whistles?");
  add("Stopwatches","stopwatches?", "stopwatches?");
  add("Clipboards","clipboards?", "clipboards?");
  add("Floor tape","floor\s+tape", "floor\s+tape");
  add("Hurdles","hurdles?", "hurdles?");
  add("Resistance bands","resistance\s+bands?", "resistance\s+bands?");
  add("First-aid kits","first[- ]aid\s+kits?", "first[- ]aid\s+kits?");
  return out;
}
function normalizeEquipment(input, legacyText="", oldCatalog=[]) {
  if(Array.isArray(input) && input.length) {
    const mapped=input.map(item=>{
      if(!item) return null;
      if(item.name) return {name:String(item.name).trim(),quantity:Math.max(1,Math.min(999,Math.round(Number(item.quantity)||1))),perPlayer:!!item.perPlayer};
      const option=oldCatalog.find(x=>x.id===item.optionId || x.id===item.id);
      return {name:String(option?.name || item.name || "Equipment"),quantity:Math.max(1,Math.min(999,Math.round(Number(item.quantity)||1))),perPlayer:false};
    }).filter(x=>x.name);
    // The previous version stored "one ball for each player" as a fixed quantity of one.
    // Preserve its item selection but recover the intended per-player multiplier from the original note.
    for(const inferred of parseLegacyEquipment(legacyText).filter(x=>x.perPlayer)) {
      const existing=mapped.find(x=>x.name.toLowerCase()===inferred.name.toLowerCase());
      if(existing){existing.quantity=inferred.quantity;existing.perPlayer=true;}
      else mapped.push(inferred);
    }
    return mapped;
  }
  return parseLegacyEquipment(legacyText);
}
export function normalizeDrill(input={}, oldCatalog=[]) {
  const tags=Array.isArray(input.tags)?[...new Set(input.tags.filter(x=>SKILLS.includes(x)))]:[];
  const primarySkill=cleanSkill(input.primarySkill || tags[0]);
  const steps=parseSteps(input.steps ?? input.notes);
  return {
    kind:"drill", id:String(input.id||input.schedId||uid("drill")),
    bankId:input.bankId||input.drillId||null,
    name:String(input.name||"Untitled drill").trim()||"Untitled drill",
    minutes:Math.max(1,Math.min(240,Math.round(Number(input.minutes??input.duration)||10))),
    primarySkill, tags:tags.filter(x=>x!==primarySkill),
    equipment:normalizeEquipment(input.equipmentItems||input.equipment,input.equipmentText||(typeof input.equipment==="string"?input.equipment:""),oldCatalog),
    steps, source:input.source||"custom"
  };
}
function normalizeLane(input={}, index=0, oldCatalog=[]) {
  const oldDrill=input.drill || input;
  const hasDrill=!!(oldDrill.name && !/^(choose a drill|station \d+)$/i.test(oldDrill.name));
  const drills=Array.isArray(input.drills) ? input.drills.map(x=>normalizeDrill(x,oldCatalog)) : (hasDrill ? [normalizeDrill(oldDrill,oldCatalog)] : []);
  return {id:String(input.id||uid("lane")),name:String(input.name||input.label||"Lane "+(index+1)),drills};
}
export function normalizeBlock(input={}, oldCatalog=[]) {
  if(input.kind==="station" || input.type==="station") {
    let lanes;
    if(Array.isArray(input.lanes)) lanes=input.lanes.map((x,i)=>normalizeLane(x,i,oldCatalog));
    else lanes=(Array.isArray(input.stations)?input.stations:[]).map((s,i)=>{
      const blank=!s || !s.name || /^(choose a drill|station \d+)$/i.test(s.name);
      return {id:String(s?.id||uid("lane")),name:String(s?.label||"Lane "+(i+1)),drills:blank?[]:[normalizeDrill({
        ...s,id:s.id||uid("drill"),minutes:s.duration||input.duration||15,
        primarySkill:s.primarySkill||s.tags?.[0],equipment:s.equipmentItems?.length?s.equipmentItems:s.equipment,
        steps:s.steps||s.notes
      },oldCatalog)]};
    });
    return {kind:"station",id:String(input.id||input.schedId||uid("station-block")),name:String(input.name||"Station rotation"),lanes};
  }
  return normalizeDrill(input,oldCatalog);
}
export function normalizePlan(input={}, teamId="", oldCatalog=[]) {
  const blocks=Array.isArray(input.blocks)?input.blocks.map(x=>normalizeBlock(x,oldCatalog)):(Array.isArray(input.schedule)?input.schedule.map(x=>normalizeBlock(x,oldCatalog)):[]);
  return {
    id:String(input.id||uid("plan")),teamId:String(input.teamId||teamId),
    name:String(input.name||"Practice plan"),date:String(input.date||localDate()),
    start:String(input.start||input.startTime||"18:00"),end:String(input.end||input.endTime||"19:30"),
    blocks,completedIds:Array.isArray(input.completedIds)?input.completedIds.map(String):[],
    equipmentChecked:input.equipmentChecked&&typeof input.equipmentChecked==="object"?{...input.equipmentChecked}:{},
    createdAt:input.createdAt||new Date().toISOString()
  };
}
function parsePlayer(value,index=0) {
  if(value && typeof value==="object") return {id:String(value.id||uid("player")),number:String(value.number??""),name:String(value.name||"Player "+(index+1))};
  const line=String(value||"").trim(), match=line.match(/^(?:#?\s*(\d{1,3})\s+)(.+)$/);
  return {id:uid("player"),number:match?match[1]:"",name:match?match[2].trim():line||"Player "+(index+1)};
}
function normalizeTeam(input={},index=0) {
  const roster=Array.isArray(input.players)?input.players:(Array.isArray(input.roster)?input.roster:[]);
  const groups=input.groups&&typeof input.groups==="object"?{...input.groups}:{};
  return {id:String(input.id||uid("team")),name:String(input.name||"Team "+(index+1)),players:roster.map(parsePlayer).filter(x=>x.name),groups,groupCount:Math.max(2,Math.min(5,Number(input.groupCount)||2))};
}
function mergeBank(savedBank,oldCatalog) {
  const base=(DATA.PRESET_DRILLS||[]).map(x=>normalizeDrill(x,oldCatalog));
  const previous=Array.isArray(savedBank)?savedBank:[];
  const merged=base.map(seed=>{
    const prior=previous.find(x=>x&&((x.id&&x.id===seed.id)||((x.name||"").toLowerCase()===seed.name.toLowerCase()&&x.source!=="custom")));
    return prior?normalizeDrill({...seed,...prior,id:seed.id,source:seed.source},oldCatalog):seed;
  });
  const names=new Set(base.map(x=>x.name.toLowerCase()));
  const custom=previous.filter(x=>x&&x.source==="custom"&&!names.has(String(x.name||"").toLowerCase())).map(x=>normalizeDrill(x,oldCatalog));
  return merged.concat(custom);
}
function defaultTeamData() { return [{id:"t1",name:"CYB Indian Knoll 3B-2",roster:[]},{id:"t2",name:"CYB 1B-2 Team",roster:[]}]; }
function oldPlans(teams,activeTeamId,oldCatalog) {
  const saved=read(OLD.schedules,{});
  const meta=read(OLD.meta,{});
  const activeOld=read(OLD.oldSchedule,[]);
  const result={};
  for(const t of teams) {
    let activities=Array.isArray(saved?.[t.id])?saved[t.id]:(Array.isArray(saved?.[t.id]?.schedule)?saved[t.id].schedule:null);
    if(!activities && t.id===activeTeamId && Array.isArray(activeOld)) activities=activeOld;
    if(!activities) activities=[];
    result[t.id]=[normalizePlan({
      id:uid("plan"),teamId:t.id,name:"Practice plan",date:meta.date||localDate(),
      start:meta.start||meta.startTime||"18:00",end:meta.end||meta.endTime||"19:30",
      blocks:activities.map(x=>normalizeBlock(x,oldCatalog))
    },t.id,oldCatalog)];
  }
  return result;
}
export function loadApp() {
  const app=read(APP_KEY,null);
  if(app && Array.isArray(app.teams)) {
    state.teams=app.teams.map(normalizeTeam);
    if(!state.teams.length) state.teams=defaultTeamData().map(normalizeTeam);
    state.activeTeamId=state.teams.some(t=>t.id===app.activeTeamId)?app.activeTeamId:state.teams[0].id;
    const catalog=Array.isArray(app.equipmentCatalog)?app.equipmentCatalog:[];
    state.drillBank=mergeBank(app.drillBank,catalog);
    state.plansByTeam={};
    for(const t of state.teams) state.plansByTeam[t.id]=(Array.isArray(app.plansByTeam?.[t.id])?app.plansByTeam[t.id]:[]).map(p=>normalizePlan(p,t.id,catalog));
    state.activePlanIds={...(app.activePlanIds||{})};
  } else {
    const teamsRaw=read(OLD.teams,defaultTeamData());
    state.teams=(Array.isArray(teamsRaw)?teamsRaw:defaultTeamData()).map(normalizeTeam);
    if(!state.teams.length) state.teams=defaultTeamData().map(normalizeTeam);
    const active=localStorage.getItem(OLD.active);
    state.activeTeamId=state.teams.some(t=>t.id===active)?active:state.teams[0].id;
    const catalog=read(OLD.equipment,[]);
    state.drillBank=mergeBank(read(OLD.bank,read(OLD.oldBank,[])),catalog);
    state.plansByTeam=oldPlans(state.teams,state.activeTeamId,catalog);
    state.activePlanIds={};
  }
  for(const t of state.teams) {
    if(!Array.isArray(state.plansByTeam[t.id])) state.plansByTeam[t.id]=[];
    if(!state.plansByTeam[t.id].length) state.plansByTeam[t.id]=[createPlanObject(t.id,"Practice plan")];
    const wanted=state.activePlanIds[t.id];
    state.activePlanIds[t.id]=state.plansByTeam[t.id].some(p=>p.id===wanted)?wanted:state.plansByTeam[t.id][0].id;
  }
  state.activePlanId=state.activePlanIds[state.activeTeamId];
  state.selectedTeamId=state.activeTeamId; state.statsTeamId=state.activeTeamId;
  state.live={active:false,currentDrillId:null,planId:null};
  save();
}
export function save() {
  state.activePlanIds[state.activeTeamId]=state.activePlanId;
  const data={
    version:1,updatedAt:new Date().toISOString(),teams:state.teams,activeTeamId:state.activeTeamId,
    drillBank:state.drillBank,plansByTeam:state.plansByTeam,activePlanIds:state.activePlanIds
  };
  try { localStorage.setItem(APP_KEY,JSON.stringify(data)); const status=document.getElementById("save-status"); if(status) status.textContent="Saved"; }
  catch(error) { console.error("Save failed",error); }
}
function createPlanObject(teamId,name) {
  return {id:uid("plan"),teamId,name:name||"New practice",date:localDate(),start:"18:00",end:"19:30",blocks:[],completedIds:[],equipmentChecked:{},createdAt:new Date().toISOString()};
}
export function createPlan(teamId=state.activeTeamId,name="New practice") {
  const plan=createPlanObject(teamId,name);
  if(!state.plansByTeam[teamId]) state.plansByTeam[teamId]=[];
  state.plansByTeam[teamId].unshift(plan);
  state.activeTeamId=teamId; state.activePlanId=plan.id; state.activePlanIds[teamId]=plan.id;
  save(); return plan;
}
export function activeTeam() { return state.teams.find(t=>t.id===state.activeTeamId)||state.teams[0]||null; }
export function activePlan() { return (state.plansByTeam[state.activeTeamId]||[]).find(p=>p.id===state.activePlanId)||null; }
export function plansForTeam(teamId=state.activeTeamId) { return state.plansByTeam[teamId]||[]; }
export function setActiveTeam(teamId) {
  if(!state.teams.some(t=>t.id===teamId)) return;
  state.activeTeamId=teamId;
  const list=plansForTeam(teamId);
  state.activePlanId=state.activePlanIds[teamId]&&list.some(p=>p.id===state.activePlanIds[teamId])?state.activePlanIds[teamId]:(list[0]?.id||null);
  state.live={active:false,currentDrillId:null,planId:null};
  save();
}
export function setActivePlan(planId) {
  if(!plansForTeam().some(p=>p.id===planId)) return;
  state.activePlanId=planId; state.activePlanIds[state.activeTeamId]=planId; save();
}
export function getBankDrill(id) { return state.drillBank.find(x=>x.id===id)||null; }
export function findPlanDrill(plan,id) {
  if(!plan) return null;
  for(const block of plan.blocks) {
    if(block.kind==="drill" && block.id===id) return block;
    if(block.kind==="station") for(const lane of block.lanes) {
      const found=lane.drills.find(x=>x.id===id); if(found) return found;
    }
  }
  return null;
}
export function locatePlanDrill(plan,id) {
  if(!plan) return null;
  for(const block of plan.blocks) {
    if(block.kind==="drill" && block.id===id) return {drill:block,list:plan.blocks,laneId:null,block};
    if(block.kind==="station") for(const lane of block.lanes) {
      const index=lane.drills.findIndex(x=>x.id===id);
      if(index>=0) return {drill:lane.drills[index],list:lane.drills,laneId:lane.id,block};
    }
  }
  return null;
}
export function flattenDrills(plan) {
  if(!plan) return [];
  const out=[];
  for(const block of plan.blocks) {
    if(block.kind==="drill") out.push(block);
    else if(block.kind==="station") for(const lane of block.lanes) for(const drill of lane.drills) out.push(drill);
  }
  return out;
}
export function blockMinutes(block) {
  if(!block) return 0;
  if(block.kind==="drill") return block.minutes;
  return Math.max(0,...(block.lanes||[]).map(lane=>lane.drills.reduce((sum,d)=>sum+d.minutes,0)));
}
export function totalPracticeMinutes(plan) { return (plan?.blocks||[]).reduce((sum,b)=>sum+blockMinutes(b),0); }
export function totalDrillMinutes(plan) { return flattenDrills(plan).reduce((sum,d)=>sum+d.minutes,0); }
export function durationLabel(minutes) {
  const n=Math.max(0,Math.round(minutes||0)); return n>=60?Math.floor(n/60)+"h"+(n%60?String(n%60).padStart(2,"0"):""):n+"m";
}
export function clockLabel(start,offset) {
  const [h,m]=(start||"18:00").split(":").map(Number),total=h*60+m+(offset||0),day=Math.floor(total/1440),hour=Math.floor(total/60)%24,minute=((total%60)+60)%60;
  return (hour%12||12)+":"+String(minute).padStart(2,"0")+(hour>=12?"p":"a")+(day?" +"+day+"d":"");
}
export function skillColor(skill) { return TAG_COLORS[skill]||PALETTE[Math.max(0,SKILLS.indexOf(skill))%PALETTE.length]||"#55758a"; }
export function copyDrill(drill) {
  return {...clone(drill),kind:"drill",id:uid("drill"),bankId:drill.id,source:"scheduled"};
}
export function equipmentTotals(plan) {
  const team=state.teams.find(t=>t.id===plan?.teamId)||activeTeam();
  const players=Math.max(1,team?.players?.length||0);
  const drillDemand=drill=>{
    const map=new Map();
    for(const item of drill.equipment||[]) {
      const name=String(item.name||"Equipment").trim(),key=name.toLowerCase();
      const quantity=Math.max(1,Number(item.quantity)||1)*(item.perPlayer?players:1);
      if(!map.has(key))map.set(key,{name,quantity:0,uses:new Set()});
      const entry=map.get(key);entry.quantity+=quantity;entry.uses.add(drill.name);
    }
    return map;
  };
  const mergeMax=(target,source)=>{
    for(const [key,value] of source) {
      if(!target.has(key))target.set(key,{name:value.name,quantity:value.quantity,uses:new Set(value.uses)});
      else {
        const entry=target.get(key);entry.quantity=Math.max(entry.quantity,value.quantity);
        value.uses.forEach(name=>entry.uses.add(name));
      }
    }
  };
  const mergeSum=(target,source)=>{
    for(const [key,value] of source) {
      if(!target.has(key))target.set(key,{name:value.name,quantity:0,uses:new Set()});
      const entry=target.get(key);entry.quantity+=value.quantity;value.uses.forEach(name=>entry.uses.add(name));
    }
  };
  const required=new Map();
  for(const block of plan?.blocks||[]) {
    const blockDemand=new Map();
    if(block.kind==="drill") mergeMax(blockDemand,drillDemand(block));
    else if(block.kind==="station") {
      for(const lane of block.lanes||[]) {
        const laneDemand=new Map();
        for(const drill of lane.drills||[]) mergeMax(laneDemand,drillDemand(drill));
        mergeSum(blockDemand,laneDemand);
      }
    }
    mergeMax(required,blockDemand);
  }
  return [...required.values()].map(x=>({name:x.name,quantity:x.quantity,uses:[...x.uses]})).sort((a,b)=>a.name.localeCompare(b.name));
}
export function remember() {
  undoStack.push(clone({
    teams:state.teams,activeTeamId:state.activeTeamId,drillBank:state.drillBank,
    plansByTeam:state.plansByTeam,activePlanIds:state.activePlanIds,activePlanId:state.activePlanId
  }));
  if(undoStack.length>30) undoStack.shift();
}
export function undo() {
  const previous=undoStack.pop(); if(!previous) return false;
  state.teams=previous.teams; state.activeTeamId=previous.activeTeamId; state.drillBank=previous.drillBank;
  state.plansByTeam=previous.plansByTeam; state.activePlanIds=previous.activePlanIds; state.activePlanId=previous.activePlanId;
  state.live={active:false,currentDrillId:null,planId:null}; save(); return true;
}
export function canUndo() { return undoStack.length>0; }
