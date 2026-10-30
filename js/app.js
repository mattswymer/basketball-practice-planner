import {
  state, SKILLS, clone, uid, esc, localDate, loadApp, save, remember, undo, canUndo,
  normalizeDrill, activeTeam, activePlan, plansForTeam, setActiveTeam, setActivePlan,
  getBankDrill, findPlanDrill, locatePlanDrill, flattenDrills, blockMinutes,
  totalPracticeMinutes, copyDrill
} from "./store.js";
import {
  renderApp, renderBankPicker, renderOnePlan, renderOneTeam, renderEquipment,
  renderEditorTags, renderEditorEquipment, renderEditorSteps, renderStationEditor
} from "./render.js";
import { exportPracticePDF, exportBackup, importBackup } from "./export.js";
const $=id=>document.getElementById(id);
const show=(id)=>{const el=$(id);if(el&&!el.open)el.showModal();};
const close=(id)=>{const el=$(id);if(el?.open)el.close();};
let editing=null,pendingLaneId=null,stationDraft=null,stationEditingId=null,toastTimer=null,toastUndoTimer=null,wakeLock=null;
let dragState=null,swipeState=null;
state.planDetailOpen=false;state.selectedTeamId=state.activeTeamId;state.statsTeamId=state.activeTeamId;
function toast(message,undoAction=false) {
  $("toast-message").textContent=message;
  $("toast-undo").hidden=!undoAction;
  $("toast").classList.add("show");
  clearTimeout(toastTimer);
  toastTimer=setTimeout(()=>$("toast").classList.remove("show"),4200);
}
function saveApp() { save(); }
function afterChange() { saveApp(); renderApp(); }
function activePlanOrWarn() { const p=activePlan();if(!p)toast("Create a practice plan first.");return p; }
function openPlan(id) { setActivePlan(id);state.planDetailOpen=true;state.view="plans";renderApp(); }
function newPlan() {
  const team=activeTeam();if(!team)return;
  const today=localDate();
  const plan={id:uid("plan"),teamId:team.id,name:"Practice · "+today,date:today,start:"18:00",end:"19:30",blocks:[],completedIds:[],equipmentChecked:{},createdAt:new Date().toISOString()};
  if(!state.plansByTeam[team.id])state.plansByTeam[team.id]=[];
  state.plansByTeam[team.id].unshift(plan);setActivePlan(plan.id);
  state.planDetailOpen=true;state.view="plans";saveApp();renderApp();
  $("plan-name").focus();$("plan-name").select();
}
function deletePlan(id) {
  const teamId=state.activeTeamId,list=plansForTeam(teamId),index=list.findIndex(p=>p.id===id);
  if(index<0)return;
  remember();const [removed]=list.splice(index,1);
  if(!list.length)list.push({id:uid("plan"),teamId,name:"Practice plan",date:localDate(),start:"18:00",end:"19:30",blocks:[],completedIds:[],equipmentChecked:{},createdAt:new Date().toISOString()});
  if(state.activePlanId===id){
    setActivePlan(list[Math.min(index,list.length-1)].id);
    state.planDetailOpen=false;
    if(state.live.planId===id){state.live={active:false,currentDrillId:null,planId:null};releaseWakeLock();}
  }
  saveApp();renderApp();toast("Plan deleted: "+removed.name, true);
}
function switchTeam(teamId) {
  setActiveTeam(teamId);state.selectedTeamId=teamId;state.statsTeamId=teamId;
  state.planDetailOpen=false;renderApp();
}
function changeView(view) {
  state.view=view;
  if(view==="teams")state.selectedTeamId=state.activeTeamId;
  if(view==="stats"&&!state.statsTeamId)state.statsTeamId=state.activeTeamId;
  renderApp();
}
function openBankSheet(laneId=null) {
  if(!activePlanOrWarn())return;
  pendingLaneId=laneId;
  $("bank-search").value="";
  $("bank-skill-filter").value="";
  renderBankPicker();show("bank-sheet");
}
function openEditor(type,id=null) {
  const plan=activePlan();let item;
  if(type==="new") item={id:uid("drill"),name:"",minutes:10,primarySkill:"dribbling",tags:[],equipment:[],steps:[],source:"custom"};
  else if(type==="bank") item=getBankDrill(id);
  else item=findPlanDrill(plan,id);
  if(!item)return;
  editing={type,id:item.id};
  $("drill-sheet-title").textContent=type==="new"?"New drill":type==="bank"?"Edit bank drill":"Edit drill";
  $("drill-sheet-eyebrow").textContent=type==="bank"?"DRILL BANK":type==="plan"?"PRACTICE DRILL":"NEW DRILL";
  $("edit-name").value=item.name||"";
  $("edit-minutes").value=item.minutes||10;
  renderEditorTags(item.tags||[]);
  $("edit-skill").value=item.primarySkill||"dribbling";
  renderEditorEquipment(clone(item.equipment||[]));
  renderEditorSteps(clone(item.steps||[]));
  $("delete-drill").hidden=type==="new";
  $("delete-drill").textContent=type==="bank"?"Delete from bank":"Remove from plan";
  show("drill-sheet");
}
function collectEditorEquipment(includeBlank=false) {
  const items=[...$("edit-equipment-rows").querySelectorAll(".edit-equipment-row")].map(row=>{
    const name=row.querySelector('[data-eq-field="name"]').value.trim();
    const quantity=Math.max(1,Math.min(999,Math.round(Number(row.querySelector('[data-eq-field="quantity"]').value)||1)));
    const perPlayer=row.querySelector('[data-eq-field="perPlayer"]').checked;
    return {name,quantity,perPlayer};
  });
  return includeBlank?items:items.filter(x=>x.name);
}
function collectEditorSteps(includeBlank=false) {
  const steps=[...$("edit-steps").querySelectorAll("[data-step-index]")].map(x=>x.value.trim());
  return includeBlank?steps:steps.filter(Boolean);
}
function saveDrill(event) {
  event.preventDefault();if(!editing)return;
  const name=$("edit-name").value.trim();if(!name){$("edit-name").focus();return;}
  const primarySkill=$("edit-skill").value||"dribbling";
  const tags=[...$("edit-tags").querySelectorAll("input:checked")].map(x=>x.value).filter(x=>x!==primarySkill);
  const data={
    name,minutes:Math.max(1,Math.min(240,Math.round(Number($("edit-minutes").value)||10))),
    primarySkill,tags,equipment:collectEditorEquipment(),steps:collectEditorSteps()
  };
  remember();
  if(editing.type==="new")state.drillBank.unshift({...data,id:editing.id,kind:"drill",source:"custom",bankId:null});
  else if(editing.type==="bank") {
    const item=getBankDrill(editing.id);if(item)Object.assign(item,data);
  } else {
    const item=findPlanDrill(activePlan(),editing.id);if(item)Object.assign(item,data);
  }
  saveApp();close("drill-sheet");editing=null;renderApp();toast("Saved.");
}
function removeDrill(id) {
  const plan=activePlan(),found=locatePlanDrill(plan,id);if(!found)return;
  remember();found.list.splice(found.list.findIndex(x=>x.id===id),1);
  plan.completedIds=plan.completedIds.filter(x=>x!==id);
  if(state.live.currentDrillId===id) {
    state.live.currentDrillId=flattenDrills(plan)[0]?.id||null;
    if(!state.live.currentDrillId){state.live={active:false,currentDrillId:null,planId:null};releaseWakeLock();}
  }
  saveApp();renderApp();toast("Drill removed.",true);
}
function deleteEditorDrill() {
  if(!editing)return;
  if(editing.type==="bank") {
    const item=getBankDrill(editing.id);if(!item)return;
    remember();state.drillBank=state.drillBank.filter(x=>x.id!==item.id);
    saveApp();close("drill-sheet");editing=null;renderApp();toast("Drill deleted from bank.",true);
  } else if(editing.type==="plan") {
    const id=editing.id;close("drill-sheet");editing=null;removeDrill(id);
  }
}
function openStation(id=null) {
  const plan=activePlanOrWarn();if(!plan)return;
  const existing=id?plan.blocks.find(x=>x.id===id&&x.kind==="station"):null;
  stationEditingId=existing?.id||null;
  stationDraft=existing?clone(existing):{
    kind:"station",id:uid("station-block"),name:"Station rotation",
    lanes:[{id:uid("lane"),name:"Lane 1",drills:[]},{id:uid("lane"),name:"Lane 2",drills:[]}]
  };
  $("delete-station").hidden=!existing;
  renderStationEditor(stationDraft);show("station-sheet");
}
function captureLaneNames() {
  if(!stationDraft)return;
  stationDraft.lanes.forEach(lane=>{
    const input=$("station-lanes-editor").querySelector('[data-lane-name="'+lane.id+'"]');
    if(input)lane.name=input.value.trim()||lane.name;
  });
}
function addLane() {
  if(!stationDraft)return;
  captureLaneNames();
  stationDraft.lanes.push({id:uid("lane"),name:"Lane "+(stationDraft.lanes.length+1),drills:[]});
  renderStationEditor(stationDraft);
}
function removeLane(id) {
  if(!stationDraft||stationDraft.lanes.length<=1){toast("A station needs at least one lane.");return;}
  captureLaneNames();
  const lane=stationDraft.lanes.find(x=>x.id===id);
  if(lane?.drills.length){toast("Move drills out of this lane first.");return;}
  stationDraft.lanes=stationDraft.lanes.filter(x=>x.id!==id);renderStationEditor(stationDraft);
}
function saveStation(event) {
  event.preventDefault();if(!stationDraft)return;
  stationDraft.name=$("station-name").value.trim()||"Station rotation";
  stationDraft.lanes.forEach(lane=>{const input=$("station-lanes-editor").querySelector('[data-lane-name="'+lane.id+'"]');if(input)lane.name=input.value.trim()||"Lane";});
  const plan=activePlan();if(!plan)return;
  remember();
  const index=plan.blocks.findIndex(x=>x.id===stationEditingId);
  if(index>=0)plan.blocks[index]=stationDraft;else plan.blocks.push(stationDraft);
  saveApp();close("station-sheet");stationDraft=null;stationEditingId=null;renderApp();toast("Station saved.");
}
function deleteStation() {
  const plan=activePlan();if(!plan||!stationEditingId)return;
  const block=plan.blocks.find(x=>x.id===stationEditingId);if(!block)return;
  const ids=block.lanes.flatMap(l=>l.drills.map(d=>d.id));
  remember();plan.blocks=plan.blocks.filter(x=>x.id!==stationEditingId);
  plan.completedIds=plan.completedIds.filter(id=>!ids.includes(id));
  saveApp();close("station-sheet");stationDraft=null;stationEditingId=null;renderApp();toast("Station removed.",true);
}
function addBankDrill(id) {
  const plan=activePlan(),bank=getBankDrill(id);if(!plan||!bank)return;
  const drill=copyDrill(bank);remember();
  if(pendingLaneId) {
    const lane=plan.blocks.flatMap(b=>b.kind==="station"?b.lanes:[]).find(l=>l.id===pendingLaneId);
    if(lane)lane.drills.push(drill);else plan.blocks.push(drill);
  } else plan.blocks.push(drill);
  const target=pendingLaneId;pendingLaneId=null;
  saveApp();close("bank-sheet");renderApp();toast("Added "+drill.name+".");
  if(target){const card=document.querySelector('[data-drill-card="'+drill.id+'"]');card?.scrollIntoView({block:"center",behavior:"smooth"});}
}
function removeBlock(id) {
  const plan=activePlan();if(!plan)return;
  const block=plan.blocks.find(x=>x.id===id);if(!block)return;
  const ids=block.kind==="station"?block.lanes.flatMap(l=>l.drills.map(d=>d.id)):[block.id];
  remember();plan.blocks=plan.blocks.filter(x=>x.id!==id);plan.completedIds=plan.completedIds.filter(x=>!ids.includes(x));
  saveApp();renderApp();toast("Removed from practice.",true);
}
function moveToPlan(id) {
  const plan=activePlan(),found=locatePlanDrill(plan,id);if(!found||!found.laneId)return;
  remember();found.list.splice(found.list.findIndex(x=>x.id===id),1);plan.blocks.push(found.drill);
  saveApp();renderApp();toast("Moved to main plan.");
}
function moveDrill(id,laneId=null,beforeId=null) {
  const plan=activePlan(),found=locatePlanDrill(plan,id);if(!plan||!found)return;
  const targetList=laneId?plan.blocks.flatMap(b=>b.kind==="station"?b.lanes:[]).find(l=>l.id===laneId)?.drills:plan.blocks;
  if(!targetList)return;
  const before=beforeId?targetList.findIndex(x=>x.id===beforeId):-1;
  if(found.list===targetList && (before===found.list.indexOf(found.drill)||before===found.list.indexOf(found.drill)+1))return;
  remember();found.list.splice(found.list.findIndex(x=>x.id===id),1);
  const index=beforeId?targetList.findIndex(x=>x.id===beforeId):-1;
  targetList.splice(index<0?targetList.length:index,0,found.drill);
  saveApp();renderApp();toast(laneId?"Drill moved to station.":"Drill moved.");
}
function reorderBlock(id,beforeId=null) {
  const plan=activePlan();if(!plan||beforeId===id)return;
  const from=plan.blocks.findIndex(x=>x.id===id);if(from<0)return;
  const [block]=plan.blocks.splice(from,1);
  const to=beforeId?plan.blocks.findIndex(x=>x.id===beforeId):-1;
  if(to===from) { plan.blocks.splice(from,0,block); return; }
  plan.blocks.splice(to<0?plan.blocks.length:to,0,block);
  saveApp();renderApp();
}
function completeDrill(id) {
  const plan=activePlan();if(!plan)return;
  const exists=plan.completedIds.includes(id);
  plan.completedIds=exists?plan.completedIds.filter(x=>x!==id):[...plan.completedIds,id];
  saveApp();renderOnePlan();if(state.view==="stats")renderApp();
}
async function acquireWakeLock() {
  try { if("wakeLock" in navigator) { wakeLock=await navigator.wakeLock.request("screen");wakeLock.addEventListener("release",()=>{wakeLock=null;}); } }
  catch(error) { console.info("Wake lock unavailable",error); }
}
async function releaseWakeLock() {
  try { if(wakeLock) await wakeLock.release(); } catch {}
  wakeLock=null;
}
function startLive() {
  const plan=activePlan();if(!plan)return;
  const drills=flattenDrills(plan);if(!drills.length){toast("Add a drill first.");return;}
  const next=drills.find(d=>!plan.completedIds.includes(d.id))||drills[0];
  state.live={active:true,planId:plan.id,currentDrillId:next.id};
  state.planDetailOpen=true;state.view="plans";renderApp();acquireWakeLock();
  setTimeout(()=>document.querySelector('[data-drill-card="'+next.id+'"]')?.scrollIntoView({block:"center",behavior:"smooth"}),50);
  toast("Practice is live. Advance manually.");
}
function moveLive(step) {
  const plan=activePlan();if(!plan||!state.live.active)return;
  const drills=flattenDrills(plan),index=drills.findIndex(d=>d.id===state.live.currentDrillId);
  const next=drills[index+step];if(!next)return;
  state.live.currentDrillId=next.id;renderOnePlan();
  document.querySelector('[data-drill-card="'+next.id+'"]')?.scrollIntoView({block:"center",behavior:"smooth"});
}
async function liveNext() {
  const plan=activePlan();if(!plan||!state.live.active)return;
  const drills=flattenDrills(plan),index=drills.findIndex(d=>d.id===state.live.currentDrillId);
  if(index>=0&&!plan.completedIds.includes(state.live.currentDrillId))plan.completedIds.push(state.live.currentDrillId);
  const next=drills[index+1];
  if(next) {
    state.live.currentDrillId=next.id;saveApp();renderOnePlan();
    document.querySelector('[data-drill-card="'+next.id+'"]')?.scrollIntoView({block:"center",behavior:"smooth"});
  } else {
    state.live.active=false;state.live.currentDrillId=null;state.live.planId=null;
    saveApp();await releaseWakeLock();renderOnePlan();toast("Practice complete.");
  }
}
async function stopLive() {
  state.live={active:false,currentDrillId:null,planId:null};await releaseWakeLock();renderOnePlan();toast("Live practice ended.");
}
function updatePlanField(field,value) {
  const plan=activePlan();if(!plan)return;plan[field]=value;saveApp();
}
function openEquipment() {renderEquipment();show("equipment-sheet");}
function checkEquipment(key,checked) {
  const plan=activePlan();if(!plan)return;
  plan.equipmentChecked[key]=checked;saveApp();
  const row=document.querySelector('[data-equipment-checked="'+CSS.escape(key)+'"]')?.closest(".equipment-check-row");
  row?.classList.toggle("is-checked",checked);
}
function addTeam(event) {
  event.preventDefault();const name=$("new-team-name").value.trim();if(!name)return;
  const editingId=state.editingTeamId||null;
  if(state.teams.some(t=>t.id!==editingId&&t.name.toLowerCase()===name.toLowerCase())){toast("Team already exists.");return;}
  remember();
  if(editingId) {
    const team=state.teams.find(t=>t.id===editingId);if(!team)return;
    team.name=name;state.selectedTeamId=team.id;
    close("team-sheet");state.editingTeamId=null;saveApp();renderApp();toast("Team renamed.");
    return;
  }
  const team={id:uid("team"),name,players:[],groups:{},groupCount:2};
  state.teams.push(team);state.plansByTeam[team.id]=[];state.activePlanIds[team.id]=null;
  setActiveTeam(team.id);state.selectedTeamId=team.id;$("new-team-name").value="";
  close("team-sheet");state.view="teams";saveApp();renderApp();toast("Team created.");
}
function deleteTeam() {
  const team=state.teams.find(t=>t.id===state.selectedTeamId);if(!team)return;
  if(state.teams.length<=1){toast("Keep at least one team.");return;}
  remember();state.teams=state.teams.filter(t=>t.id!==team.id);delete state.plansByTeam[team.id];delete state.activePlanIds[team.id];
  if(state.activeTeamId===team.id){state.activeTeamId=state.teams[0].id;state.activePlanId=state.activePlanIds[state.activeTeamId]||state.plansByTeam[state.activeTeamId]?.[0]?.id||null;}
  state.selectedTeamId=state.activeTeamId;saveApp();renderApp();toast(team.name+" deleted.",true);
}
function addPlayer() {
  const team=state.teams.find(t=>t.id===state.selectedTeamId);if(!team)return;
  const name=$("new-player-name").value.trim();if(!name){$("new-player-name").focus();return;}
  remember();const player={id:uid("player"),number:$("new-player-number").value.trim(),name};
  team.players.push(player);$("new-player-name").value="";$("new-player-number").value="";saveApp();renderOneTeam();$("new-player-name").focus();
}
function deletePlayer(id) {
  const team=state.teams.find(t=>t.id===state.selectedTeamId),player=team?.players.find(p=>p.id===id);if(!team||!player)return;
  remember();team.players=team.players.filter(p=>p.id!==id);delete team.groups[id];saveApp();renderOneTeam();toast(player.name+" removed.",true);
}
function updatePlayer(id,field,value) {
  const team=state.teams.find(t=>t.id===state.selectedTeamId),player=team?.players.find(p=>p.id===id);if(!player)return;
  player[field]=value;saveApp();renderOneTeam();
}
function updateGroup(id,value) {
  const team=state.teams.find(t=>t.id===state.selectedTeamId);if(!team)return;
  team.groups[id]=Number(value)||0;saveApp();renderOneTeam();
}
function randomizeGroups() {
  const team=state.teams.find(t=>t.id===state.selectedTeamId);if(!team||!team.players.length)return;
  remember();const count=team.groupCount||2,players=team.players.slice();
  for(let i=players.length-1;i>0;i--){const j=Math.floor(Math.random()*(i+1));[players[i],players[j]]=[players[j],players[i]];}
  team.players.forEach(p=>team.groups[p.id]=0);
  players.forEach((p,i)=>team.groups[p.id]=(i%count)+1);
  saveApp();renderOneTeam();toast("Groups randomized.");
}
function beginDrag(event) {
  const handle=event.target.closest("[data-drag-kind]");if(!handle)return;
  const kind=handle.dataset.dragKind,id=handle.dataset.dragId;
  dragState={kind,id,startX:event.clientX,startY:event.clientY,active:false,target:null,timer:null};
  dragState.timer=setTimeout(()=>{
    if(!dragState)return;dragState.active=true;document.body.classList.add("dragging-active");
    const card=kind==="drill"?document.querySelector('[data-drill-card="'+CSS.escape(id)+'"]'):document.querySelector('[data-block-id="'+CSS.escape(id)+'"]');
    card?.classList.add("dragging");navigator.vibrate?.(12);
  },240);
}
function duringDrag(event) {
  if(!dragState)return;
  if(!dragState.active) {
    if(Math.abs(event.clientX-dragState.startX)>12||Math.abs(event.clientY-dragState.startY)>12){clearTimeout(dragState.timer);dragState=null;}
    return;
  }
  event.preventDefault();
  document.querySelectorAll(".drop-target").forEach(x=>x.classList.remove("drop-target"));
  const target=document.elementFromPoint(event.clientX,event.clientY);
  const lane=target?.closest("[data-drop-lane]"),card=target?.closest("[data-drill-card]"),block=target?.closest("[data-drop-block]"),root=target?.closest("[data-drop-root]");
  const dest=card||lane||block||root;
  if(dest){dest.classList.add("drop-target");dragState.target=dest;}else dragState.target=null;
}
function finishDrag() {
  if(!dragState)return;
  const drag=dragState;clearTimeout(drag.timer);dragState=null;document.body.classList.remove("dragging-active");
  document.querySelectorAll(".dragging,.drop-target").forEach(x=>x.classList.remove("dragging","drop-target"));
  if(!drag.active||!drag.target)return;
  const plan=activePlan();if(!plan)return;
  if(drag.kind==="drill") {
    const target=drag.target;
    const targetCard=target.matches?.("[data-drill-card]")?target:target.closest?.("[data-drill-card]");
    const lane=target.closest?.("[data-drop-lane]");
    const station=target.closest?.(".station-block");
    let laneId=lane?.dataset.dropLane||targetCard?.dataset.parentLane||null;
    if(!laneId&&station) laneId=station.querySelector("[data-drop-lane]")?.dataset.dropLane||null;
    const beforeId=targetCard?.dataset.drillCard||null;
    if(drag.id!==beforeId)moveDrill(drag.id,laneId,beforeId);
  } else {
    const block=drag.target.closest?.("[data-block-id]");
    if(block&&block.dataset.blockId!==drag.id){remember();reorderBlock(drag.id,block.dataset.blockId);}
    else if(drag.target.matches?.("[data-drop-root]")){remember();reorderBlock(drag.id,null);}
  }
}
function startSwipe(event) {
  const row=event.target.closest("[data-player-row]");if(!row)return;
  if(event.target.closest("button,select"))return;
  if(event.target.closest("input")&&event.pointerType!=="touch")return;
  swipeState={id:row.dataset.playerRow,x:event.clientX,y:event.clientY};
}
function endSwipe(event) {
  if(!swipeState)return;
  const dx=event.clientX-swipeState.x,dy=event.clientY-swipeState.y,id=swipeState.id;swipeState=null;
  if(dx<-75&&Math.abs(dy)<45)deletePlayer(id);
}
function handleClick(event) {
  const target=event.target;
  const closeButton=target.closest("[data-close]");
  if(closeButton){close(closeButton.dataset.close);return;}
  const nav=target.closest("[data-view]");
  if(nav){changeView(nav.dataset.view);return;}
  const open=target.closest("[data-open-plan]");
  if(open&&!target.closest("[data-delete-plan]")){openPlan(open.dataset.openPlan);return;}
  const delPlan=target.closest("[data-delete-plan]");if(delPlan){deletePlan(delPlan.dataset.deletePlan);return;}
  const selectTeam=target.closest("[data-select-team]");if(selectTeam){switchTeam(selectTeam.dataset.selectTeam);state.view="teams";renderApp();return;}
  const editPlanDrill=target.closest("[data-edit-plan-drill]");if(editPlanDrill){openEditor("plan",editPlanDrill.dataset.editPlanDrill);return;}
  const editBank=target.closest("[data-edit-bank-drill]");if(editBank){openEditor("bank",editBank.dataset.editBankDrill);return;}
  const addBank=target.closest("[data-add-bank-drill]");if(addBank){addBankDrill(addBank.dataset.addBankDrill);return;}
  const addLane=target.closest("[data-add-to-lane]");if(addLane){openBankSheet(addLane.dataset.addToLane);return;}
  const editStation=target.closest("[data-edit-station]");if(editStation){openStation(editStation.dataset.editStation);return;}
  const addLaneInline=target.closest("[data-add-lane-inline]");if(addLaneInline){openStation(addLaneInline.dataset.addLaneInline);return;}
  const removeLane=target.closest("[data-remove-lane]");if(removeLane){removeLaneFromSheet(removeLane.dataset.removeLane);return;}
  const toggle=target.closest("[data-toggle-complete]");if(toggle){completeDrill(toggle.dataset.toggleComplete);return;}
  const remove=target.closest("[data-remove-drill]");if(remove){removeDrill(remove.dataset.removeDrill);return;}
  const moveRoot=target.closest("[data-move-to-plan]");if(moveRoot){moveToPlan(moveRoot.dataset.moveToPlan);return;}
  const deleteBlock=target.closest("[data-delete-block]");if(deleteBlock){removeBlock(deleteBlock.dataset.deleteBlock);return;}
  const deletePlayerButton=target.closest("[data-delete-player]");if(deletePlayerButton){deletePlayer(deletePlayerButton.dataset.deletePlayer);return;}
}
function removeLaneFromSheet(id){removeLane(id);}
function wireEvents() {
  document.addEventListener("click",handleClick);
  $("brand-home").addEventListener("click",()=>{state.view="plans";state.planDetailOpen=false;renderApp();});
  $("create-plan").addEventListener("click",newPlan);
  $("plans-team-select").addEventListener("change",e=>switchTeam(e.target.value));
  $("back-to-plans").addEventListener("click",()=>{state.planDetailOpen=false;state.live={active:false,currentDrillId:null,planId:null};releaseWakeLock();renderApp();});
  $("plan-name").addEventListener("change",e=>updatePlanField("name",e.target.value.trim()||"Practice plan"));
  $("plan-date").addEventListener("change",e=>updatePlanField("date",e.target.value));
  $("plan-start").addEventListener("change",e=>updatePlanField("start",e.target.value));
  $("plan-end").addEventListener("change",e=>updatePlanField("end",e.target.value));
  $("add-drill-to-plan").addEventListener("click",()=>openBankSheet(null));
  $("floating-add").addEventListener("click",()=>openBankSheet(null));
  $("add-station").addEventListener("click",()=>openStation());
  $("live-start").addEventListener("click",startLive);
  $("live-next").addEventListener("click",liveNext);
  $("live-previous").addEventListener("click",()=>moveLive(-1));
  $("live-exit").addEventListener("click",stopLive);
  $("plan-equipment").addEventListener("click",openEquipment);
  $("plan-pdf").addEventListener("click",()=>{const r=exportPracticePDF();if(r.ok)toast(r.format==="a3"?"One-page A3 PDF downloaded.":"One-page PDF downloaded.");else toast(r.message);});
  $("header-pdf").addEventListener("click",()=>{const r=exportPracticePDF();if(r.ok)toast(r.format==="a3"?"One-page A3 PDF downloaded.":"One-page PDF downloaded.");else toast(r.message);});
  $("header-menu").addEventListener("click",()=>show("backup-sheet"));
  $("export-backup").addEventListener("click",()=>{exportBackup();close("backup-sheet");toast("Backup downloaded.");});
  $("import-backup").addEventListener("click",()=>$("backup-file").click());
  $("backup-file").addEventListener("change",async e=>{try{await importBackup(e.target.files?.[0]);toast("Backup restored. Reloading…");setTimeout(()=>location.reload(),300);}catch(err){toast(err.message||"Could not restore backup.");}finally{e.target.value="";}});
  $("drill-search").addEventListener("input",renderApp);
  $("drill-skill-filter").addEventListener("change",renderApp);
  $("bank-search").addEventListener("input",renderBankPicker);
  $("bank-skill-filter").addEventListener("change",renderBankPicker);
  $("new-bank-drill").addEventListener("click",()=>openEditor("new"));
  $("drill-form").addEventListener("submit",saveDrill);
  $("delete-drill").addEventListener("click",deleteEditorDrill);
  $("add-equipment-row").addEventListener("click",()=>{
    const items=collectEditorEquipment(true);items.push({name:"",quantity:1,perPlayer:false});renderEditorEquipment(items);
  });
  $("add-step").addEventListener("click",()=>{const steps=collectEditorSteps(true);steps.push("");renderEditorSteps(steps);document.querySelector('#edit-steps textarea:last-of-type')?.focus();});
  $("edit-equipment-rows").addEventListener("click",e=>{
    const button=e.target.closest("[data-remove-eq-row]");if(!button)return;
    const items=collectEditorEquipment(true);items.splice(Number(button.dataset.removeEqRow),1);renderEditorEquipment(items);
  });
  $("edit-steps").addEventListener("click",e=>{
    const button=e.target.closest("[data-remove-step]");if(!button)return;
    const steps=collectEditorSteps(true);steps.splice(Number(button.dataset.removeStep),1);renderEditorSteps(steps);
  });
  $("add-lane").addEventListener("click",addLane);
  $("station-form").addEventListener("submit",saveStation);
  $("delete-station").addEventListener("click",deleteStation);
  $("equipment-checklist").addEventListener("change",e=>{
    const input=e.target.closest("[data-equipment-checked]");if(input)checkEquipment(input.dataset.equipmentChecked,input.checked);
  });
  $("plan-blocks").addEventListener("pointerdown",beginDrag);
  document.addEventListener("pointermove",duringDrag,{passive:false});
  document.addEventListener("pointerup",finishDrag);
  document.addEventListener("pointercancel",finishDrag);
  $("new-team").addEventListener("click",()=>{
    state.editingTeamId=null;$("new-team-name").value="";
    $("team-sheet-title").textContent="New team";$("team-form-submit").textContent="Create";show("team-sheet");
  });
  $("edit-team-name").addEventListener("click",()=>{
    const team=state.teams.find(t=>t.id===state.selectedTeamId);if(!team)return;
    state.editingTeamId=team.id;$("new-team-name").value=team.name;
    $("team-sheet-title").textContent="Rename team";$("team-form-submit").textContent="Save";show("team-sheet");
  });
  $("team-form").addEventListener("submit",addTeam);
  $("delete-team").addEventListener("click",deleteTeam);
  $("add-player").addEventListener("click",addPlayer);
  $("new-player-name").addEventListener("keydown",e=>{if(e.key==="Enter"){e.preventDefault();addPlayer();}});
  $("roster-list").addEventListener("change",e=>{
    const field=e.target.closest("[data-player-field]");if(field)updatePlayer(field.dataset.playerId,field.dataset.playerField,field.value);
    const group=e.target.closest("[data-player-group]");if(group)updateGroup(group.dataset.playerGroup,group.value);
  });
  $("group-count").addEventListener("change",e=>{
    const team=state.teams.find(t=>t.id===state.selectedTeamId);if(!team)return;
    team.groupCount=Math.max(2,Math.min(5,Number(e.target.value)||2));
    Object.keys(team.groups||{}).forEach(id=>{if(team.groups[id]>team.groupCount)team.groups[id]=0;});
    saveApp();renderOneTeam();
  });
  $("random-groups").addEventListener("click",randomizeGroups);
  $("clear-groups").addEventListener("click",()=>{
    const team=state.teams.find(t=>t.id===state.selectedTeamId);if(!team)return;
    remember();team.groups={};saveApp();renderOneTeam();toast("Groups cleared.",true);
  });
  $("roster-list").addEventListener("pointerdown",startSwipe);
  document.addEventListener("pointerup",endSwipe);
  $("stats-team-select").addEventListener("change",e=>{state.statsTeamId=e.target.value;renderApp();});
  $("toast-undo").addEventListener("click",()=>{if(undo()){renderApp();toast("Undone.");}});
  $("plan-blocks").addEventListener("click",()=>{});
  document.querySelectorAll("dialog").forEach(dialog=>dialog.addEventListener("click",e=>{if(e.target===dialog)dialog.close();}));
  document.addEventListener("visibilitychange",()=>{if(document.visibilityState==="visible"&&state.live.active&&!wakeLock)acquireWakeLock();});
  if("serviceWorker" in navigator)navigator.serviceWorker.register("./service-worker.js").catch(error=>console.warn("Offline cache unavailable",error));
}
loadApp();wireEvents();renderApp();
