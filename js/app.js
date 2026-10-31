import {
 state,SKILLS,uid,clone,esc,localDate,loadApp,save,remember,undo,activeTeam,activePlan,plansForTeam,
 setActiveTeam,setActivePlan,getBankDrill,findPlanDrill,locatePlanDrill,flattenDrills,copyDrill
} from "./core/store.js";
import {
 renderApp,renderBankPicker,renderOnePlan,renderOneTeam,renderEquipment,renderEditorTags,
 renderEditorEquipment,renderEditorSteps,renderStationEditor,renderGroupBoard,renderSkillManager
} from "./ui/render.js";
import {exportPracticePDF,exportBackup,importBackup} from "./services/export.js";
import * as practice from "./features/practice.js";
import * as teams from "./features/teams.js";
import * as grouping from "./features/groups.js";
import {skills} from "./features/skills.js";
const $=id=>document.getElementById(id);
const show=id=>{const dialog=$(id);if(dialog&&!dialog.open)dialog.showModal();};
const close=id=>{const dialog=$(id);if(dialog?.open)dialog.close();};
let editing=null,pendingLaneId=null,stationDraft=null,stationEditingId=null,drag=null,groupDrag=null,toastTimer=null,wakeLock=null,pendingLiveStart=false;
function toast(message,undoable=false){
 $("toast-message").textContent=message;$("toast-undo").hidden=!undoable;$("toast").classList.add("show");
 clearTimeout(toastTimer);toastTimer=setTimeout(()=>$("toast").classList.remove("show"),undoable?12000:4200);
}
function persist(){save();}
function openPlan(id){setActivePlan(id);state.planDetailOpen=true;state.view="plans";renderApp();}
function createPlan(){
 const team=activeTeam();if(!team)return;
 const plan=practicePlanObject(team.id);
 state.plansByTeam[team.id].unshift(plan);setActivePlan(plan.id);
 state.planDetailOpen=true;state.view="plans";persist();renderApp();
 $("plan-name").focus();$("plan-name").select();
}
function duplicateCurrentPlan(runAgain=false){
 const source=activePlan();if(!source)return toast("Open a plan first.");
 const copy=clone(source);
 copy.id=uid("plan");copy.teamId=source.teamId;
 copy.name=source.name+(runAgain?" (repeat)":" (copy)");
 copy.date=runAgain?localDate():source.date;
 copy.completedIds=[];copy.skippedIds=[];copy.equipmentChecked={};
 copy.createdAt=new Date().toISOString();
 remember();
 state.plansByTeam[source.teamId].unshift(copy);setActivePlan(copy.id);
 state.planDetailOpen=true;state.view="plans";persist();renderApp();
 if(runAgain)startLive();else toast("Plan duplicated.");
}
function practicePlanObject(teamId){
 return {id:uid("plan"),teamId,name:"Practice · "+localDate(),date:localDate(),start:"18:00",end:"19:30",blocks:[],completedIds:[],skippedIds:[],equipmentChecked:{},createdAt:new Date().toISOString()};
}
function deletePlan(id){
 const list=plansForTeam(),index=list.findIndex(p=>p.id===id);if(index<0)return;
 remember();const [removed]=list.splice(index,1);
 if(!list.length)list.push(practicePlanObject(state.activeTeamId));
 if(state.activePlanId===id){setActivePlan(list[Math.min(index,list.length-1)].id);state.planDetailOpen=false;}
 if(state.live.planId===id)endLive(false);
 persist();renderApp();toast(removed.name+" deleted.",true);
}
function switchTeam(id){
 if(state.live.active)endLive(false);
 setActiveTeam(id);state.selectedTeamId=id;state.statsTeamId=id;state.planDetailOpen=false;renderApp();
}
function changeView(view){state.view=view;if(view==="teams"&&!state.selectedTeamId)state.selectedTeamId=state.activeTeamId;if(view==="stats")state.statsTeamId||=state.activeTeamId;renderApp();}
function openBank(laneId=null){
 if(!activePlan())return toast("Create a practice plan first.");
 pendingLaneId=laneId;$("bank-search").value="";$("bank-skill-filter").value="";renderBankPicker();show("bank-sheet");
}
function openDrillEditor(type,id=null){
 const plan=activePlan();
 const item=type==="new"?{id:uid("drill"),name:"",minutes:10,tags:[],equipment:[],steps:[],source:"custom",grouping:{groups:[]}}:
  type==="bank"?getBankDrill(id):findPlanDrill(plan,id);
 if(!item)return;
 editing={type,id:item.id};
 $("drill-sheet-title").textContent=type==="new"?"New drill":type==="bank"?"Edit bank drill":"Edit drill";
 $("drill-sheet-eyebrow").textContent=type==="bank"?"DRILL BANK":type==="plan"?"PRACTICE DRILL":"NEW DRILL";
 $("edit-name").value=item.name||"";$("edit-minutes").value=item.minutes||10;
 renderEditorTags(item.tags||[]);renderEditorEquipment(clone(item.equipment||[]));renderEditorSteps(clone(item.steps||[]));
 $("delete-drill").hidden=type==="new";$("delete-drill").textContent=type==="bank"?"Delete from bank":"Remove from plan";
 show("drill-sheet");
}
function editorEquipment(includeBlank=false){
 const rows=[...$("edit-equipment-rows").querySelectorAll(".edit-equipment-row")];
 const result=rows.map(row=>({
  name:row.querySelector('[data-eq-field="name"]').value.trim(),
  quantity:Math.max(1,Math.min(999,Math.round(Number(row.querySelector('[data-eq-field="quantity"]').value)||1))),
  perPlayer:row.querySelector('[data-eq-field="perPlayer"]').checked
 }));
 return includeBlank?result:result.filter(x=>x.name);
}
function editorSteps(includeBlank=false){
 const result=[...$("edit-steps").querySelectorAll("[data-step-index]")].map(el=>el.value.trim());
 return includeBlank?result:result.filter(Boolean);
}
function saveDrill(event){
 event.preventDefault();if(!editing)return;
 const name=$("edit-name").value.trim();if(!name){$("edit-name").focus();return;}
 const data={name,minutes:Math.max(1,Math.min(240,Math.round(Number($("edit-minutes").value)||10))),
  tags:[...$("edit-tags").querySelectorAll("input:checked")].map(el=>el.value),equipment:editorEquipment(),steps:editorSteps()};
 remember();
 if(editing.type==="new")state.drillBank.unshift({...data,id:editing.id,kind:"drill",source:"custom",grouping:{groups:[]}});
 else if(editing.type==="bank"){const item=getBankDrill(editing.id);if(item)Object.assign(item,data);}
 else {const item=findPlanDrill(activePlan(),editing.id);if(item)Object.assign(item,data);}
 persist();close("drill-sheet");editing=null;renderApp();toast("Drill saved.");
}
function deleteEditorDrill(){
 if(!editing)return;
 if(editing.type==="bank"){
  const item=getBankDrill(editing.id);if(!item)return;remember();state.drillBank=state.drillBank.filter(d=>d.id!==item.id);
  persist();close("drill-sheet");editing=null;renderApp();toast("Drill deleted.",true);
 }else if(editing.type==="plan"){
  const id=editing.id;close("drill-sheet");editing=null;removePlanDrill(id);
 }
}
function removePlanDrill(id){
 const found=locatePlanDrill(activePlan(),id);if(!found)return;
 practice.removeScheduledDrill(id);
 const plan=activePlan();
 if(found.laneId){
  const station=plan.blocks.find(block=>block.kind==="station"&&block.lanes.some(l=>l.id===found.laneId));
  if(station&&station.lanes.every(l=>!l.drills.length))plan.blocks=plan.blocks.filter(block=>block.id!==station.id);
 }
 if(state.live.active&&!plan.blocks.some(block=>block.id===state.live.currentBlockId))practice.stopLive();
 persist();renderApp();toast("Drill removed.",true);
}
function addBankDrill(id){
 const bank=getBankDrill(id);if(!bank)return;
 practice.addScheduledDrill(copyDrill(bank),activePlan(),pendingLaneId);
 pendingLaneId=null;close("bank-sheet");renderApp();toast("Added "+bank.name+".");
}
function openStation(id=null){
 const plan=activePlan();if(!plan)return toast("Create a practice plan first.");
 const existing=id?plan.blocks.find(b=>b.id===id&&b.kind==="station"):null;
 stationEditingId=existing?.id||null;
 stationDraft=existing?clone(existing):practice.createStation();
 $("delete-station").hidden=!existing;renderStationEditor(stationDraft);show("station-sheet");
}
function captureLaneNames(){
 if(!stationDraft)return;
 stationDraft.lanes.forEach(lane=>{const el=$("station-lanes-editor").querySelector('[data-lane-name="'+lane.id+'"]');if(el)lane.name=el.value.trim()||lane.name;});
}
function addLane(){
 if(!stationDraft)return;captureLaneNames();
 stationDraft.lanes.push({id:uid("lane"),name:"Lane "+(stationDraft.lanes.length+1),drills:[]});renderStationEditor(stationDraft);
}
function removeLane(id){
 if(!stationDraft||stationDraft.lanes.length<=1)return toast("A station needs at least one lane.");
 captureLaneNames();const lane=stationDraft.lanes.find(x=>x.id===id);
 if(lane?.drills.length)return toast("Move the drills out of this lane first.");
 stationDraft.lanes=stationDraft.lanes.filter(x=>x.id!==id);renderStationEditor(stationDraft);
}
function saveStation(event){
 event.preventDefault();if(!stationDraft)return;
 captureLaneNames();stationDraft.name=$("station-name").value.trim()||"Station rotation";
 const requested=Math.max(1,Math.min(240,Math.round(Number($("station-minutes").value)||15)));
 stationDraft.minutes=practice.fitStationLanes(stationDraft,requested);
 const plan=activePlan();if(!plan)return;remember();
 const index=plan.blocks.findIndex(b=>b.id===stationEditingId);
 if(index>=0)plan.blocks[index]=stationDraft;else plan.blocks.push(stationDraft);
 persist();close("station-sheet");stationDraft=null;stationEditingId=null;renderApp();toast("Station saved.");
}
function deleteStation(){
 if(!stationEditingId)return;
 const id=stationEditingId;close("station-sheet");stationDraft=null;stationEditingId=null;
 practice.removeScheduledBlock(id);renderApp();toast("Station removed.",true);
}
function removeBlock(id){practice.removeScheduledBlock(id);renderApp();toast("Removed from practice.",true);}
function moveDrill(id,laneId,beforeId){if(practice.moveScheduledDrill(id,laneId,beforeId)){renderApp();toast("Drill moved.");}}
function moveToMainPlan(id){const found=locatePlanDrill(activePlan(),id);if(!found?.laneId)return;practice.moveScheduledDrill(id,null,null);renderApp();}
function fitCurrentPlan(){
 const result=practice.fitPractice();
 if(!result.ok)return toast(result.reason==="empty"?"Add some drills first.":"Not enough time: each drill in a station lane needs at least one minute.");
 renderApp();toast("Schedule adjusted to exactly "+result.target+" minutes.");
}
function startLive(){
 const plan=activePlan();if(!plan?.blocks.length)return toast("Add a drill or station first.");
 pendingLiveStart=true;renderEquipment();$("equipment-done").textContent="Start practice";show("equipment-sheet");
}
function beginLive(){
 const result=practice.startLive();if(!result.ok)return toast("Add a drill or station first.");
 state.planDetailOpen=true;state.view="plans";renderApp();requestWakeLock();
 const block=activePlan().blocks[result.index];
 setTimeout(()=>document.querySelector('[data-block-id="'+block.id+'"]')?.scrollIntoView({block:"center",behavior:"smooth"}),40);
 toast("Practice is live.");
}
function requestWakeLock(){
 if(!("wakeLock" in navigator))return;
 navigator.wakeLock.request("screen").then(lock=>{wakeLock=lock;lock.addEventListener("release",()=>wakeLock=null);}).catch(()=>{});
}
async function releaseWakeLock(){try{await wakeLock?.release();}catch{}wakeLock=null;}
function endLive(showToast=true){practice.stopLive();releaseWakeLock();renderApp();if(showToast)toast("Practice ended.");}
function advanceLive(result){
 const outcome=practice.advanceLive(result);
 if(!outcome.ok)return;
 if(outcome.finished){releaseWakeLock();renderApp();toast(result==="skip"?"Practice finished.":"Practice finished.");return;}
 renderOnePlan();
 document.querySelector('[data-block-id="'+outcome.next.id+'"]')?.scrollIntoView({block:"center",behavior:"smooth"});
}
function previousLive(){if(practice.moveLive(-1)){renderOnePlan();const block=activePlan().blocks.find(b=>b.id===state.live.currentBlockId);document.querySelector('[data-block-id="'+block.id+'"]')?.scrollIntoView({block:"center",behavior:"smooth"});}}
function openGroups(drillId){
 if(!grouping.openDrillGroups(drillId))return;
 renderGroupBoard();show("group-sheet");
}
function updateGroups(){renderGroupBoard();persist();}
function groupPointerDown(event){
 const handle=event.target.closest("[data-group-player]");if(!handle)return;
 const drillId=state.groupingDrillId,playerId=handle.dataset.groupPlayer;
 groupDrag={drillId,playerId,startX:event.clientX,startY:event.clientY,active:false,timer:setTimeout(()=>{
  if(!groupDrag)return;groupDrag.active=true;handle.classList.add("dragging");navigator.vibrate?.(12);
 },230)};
}
function groupPointerMove(event){
 if(!groupDrag)return;
 if(!groupDrag.active){
  if(Math.abs(event.clientX-groupDrag.startX)>12||Math.abs(event.clientY-groupDrag.startY)>12){clearTimeout(groupDrag.timer);groupDrag=null;}
  return;
 }
 event.preventDefault();document.querySelectorAll(".drill-group.drop-target").forEach(el=>el.classList.remove("drop-target"));
 const target=document.elementFromPoint(event.clientX,event.clientY)?.closest("[data-group-target]");
 if(target){target.classList.add("drop-target");groupDrag.target=target;}else groupDrag.target=null;
}
function groupPointerUp(event){
 if(!groupDrag)return;
 const drag=groupDrag;clearTimeout(drag.timer);groupDrag=null;
 document.querySelectorAll(".group-player.dragging,.drill-group.drop-target").forEach(el=>el.classList.remove("dragging","drop-target"));
 if(!drag.active||!drag.target)return;
 const row=drag.target.matches("[data-group-player]")?drag.target:drag.target.closest("[data-group-player]");
 const targetRow=event.target.closest?.("[data-group-player]")||row;
 const targetGroup=targetRow?.closest("[data-group-target]")||drag.target.closest("[data-group-target]");
 if(!targetGroup)return;
 const groupId=targetGroup.dataset.groupTarget||null;
 const targetPlayer=targetRow?.dataset.groupPlayer&&targetRow.dataset.groupPlayer!==drag.playerId?targetRow.dataset.groupPlayer:null;
 grouping.assignPlayer(drag.drillId,drag.playerId,groupId,targetPlayer);renderGroupBoard();persist();
}
function addGroup(){
 grouping.addDrillGroup();renderGroupBoard();persist();
}
function randomizeGroups(){
 if(!grouping.randomizeDrillGroups())return toast("Add players to the team first.");
 renderGroupBoard();persist();toast("Players randomized.");
}
function renameGroup(id,name){grouping.renameDrillGroup(id,name);persist();}
function deleteGroup(id){grouping.deleteDrillGroup(id);renderGroupBoard();persist();}
function openSkills(){renderSkillManager();show("skill-sheet");}
function addSkillFromInput(){
 const name=$("new-skill-name").value.trim();if(!name)return;
 if(!skills.add(name))return toast("That skill already exists.");
 $("new-skill-name").value="";renderSkillManager();renderApp();persist();
}
function saveSkill(oldName){
 const name=$("skill-list").querySelector('[data-skill-name="'+CSS.escape(oldName)+'"]').value.trim();
 const color=$("skill-list").querySelector('[data-skill-color="'+CSS.escape(oldName)+'"]').value;
 if(!skills.rename(oldName,name,color))return toast("That skill name is unavailable.");
 renderSkillManager();renderApp();persist();toast("Skill updated.");
}
function removeSkill(name){
 if(!skills.remove(name))return;
 renderSkillManager();renderApp();persist();toast("Skill deleted.",true);
}
function addTeamDialog(){
 state.editingTeamId=null;$("new-team-name").value="";$("team-sheet-title").textContent="New team";
 $("team-form-submit").textContent="Create";show("team-sheet");
}
function renameTeamDialog(){
 const team=state.teams.find(t=>t.id===state.selectedTeamId);if(!team)return;
 state.editingTeamId=team.id;$("new-team-name").value=team.name;
 $("team-sheet-title").textContent="Rename team";$("team-form-submit").textContent="Save";show("team-sheet");
}
function submitTeam(event){
 event.preventDefault();const name=$("new-team-name").value.trim(),edit=state.editingTeamId;
 if(edit){if(!teams.renameTeam(edit,name))return toast("Team name is unavailable.");state.editingTeamId=null;close("team-sheet");renderApp();toast("Team renamed.");}
 else{const wasLive=state.live.active;if(!teams.addTeam(name))return toast("Enter a unique team name.");if(wasLive)releaseWakeLock();state.selectedTeamId=state.activeTeamId;close("team-sheet");renderApp();toast("Team created.");}
}
function deleteTeam(id=state.selectedTeamId){
 if(state.teams.length<=1)return toast("At least one team must remain.");
 const team=state.teams.find(t=>t.id===id);if(!team)return;
 const planCount=(state.plansByTeam[team.id]||[]).length;
 if(!window.confirm("Delete "+team.name+" and its "+planCount+" practice plan"+(planCount===1?"":"s")+"? You can use Undo afterward or restore a backup."))return;
 const wasActive=team.id===state.activeTeamId;
 if(!teams.deleteTeam(id))return;
 if(wasActive)releaseWakeLock();
 state.selectedTeamId=state.activeTeamId;state.statsTeamId=state.activeTeamId;
 persist();renderApp();toast(team.name+" deleted.",true);
}
function addPlayer(){
 const name=$("new-player-name").value.trim();if(!name)return $("new-player-name").focus();
 const player=teams.addPlayer(state.selectedTeamId,name);if(!player)return toast("Enter a unique player name.");
 $("new-player-name").value="";renderOneTeam();$("new-player-name").focus();
}
function renamePlayer(id,name){
 if(!teams.renamePlayer(state.selectedTeamId,id,name))return;
 persist();
}
function deletePlayer(id){
 const player=state.teams.find(t=>t.id===state.selectedTeamId)?.players.find(p=>p.id===id);
 if(!player)return;
 teams.deletePlayer(state.selectedTeamId,id);renderOneTeam();toast(player.name+" removed.",true);
}
function openEquipment(){pendingLiveStart=false;$("equipment-done").textContent="Done";renderEquipment();show("equipment-sheet");}
function checkEquipment(key,value){
 const plan=activePlan();if(!plan)return;
 plan.equipmentChecked[key]=value;persist();
 document.querySelector('[data-equipment-checked="'+CSS.escape(key)+'"]')?.closest(".equipment-check-row")?.classList.toggle("is-checked",value);
}
function updatePlan(field,value){const plan=activePlan();if(!plan)return;plan[field]=value;persist();renderOnePlan();}
function backupRestore(event){
 const file=event.target.files?.[0];if(!file)return;
 if(!window.confirm("Restore this backup? It will replace all teams, plans, drills, and skill settings currently stored on this device.")){event.target.value="";return;}
 importBackup(file).then(()=>{toast("Backup restored. Reloading…");setTimeout(()=>location.reload(),300);}).catch(error=>toast(error.message||"Could not restore backup.")).finally(()=>event.target.value="");
}
function handleClick(event){
 const target=event.target;
 const closeButton=target.closest("[data-close]");if(closeButton){close(closeButton.dataset.close);return;}
 const statusButton=target.closest("[data-drill-status]");
 if(statusButton){practice.toggleDrillStatus(statusButton.dataset.drillStatus,statusButton.dataset.nextStatus==="complete"?"complete":null);renderApp();return;}
 const nav=target.closest("[data-view]");if(nav){changeView(nav.dataset.view);return;}
 const planCard=target.closest("[data-open-plan]");if(planCard&&!target.closest("[data-delete-plan]")){openPlan(planCard.dataset.openPlan);return;}
 const deletePlanButton=target.closest("[data-delete-plan]");if(deletePlanButton){deletePlan(deletePlanButton.dataset.deletePlan);return;}
 const teamChip=target.closest("[data-select-team]");if(teamChip){state.selectedTeamId=teamChip.dataset.selectTeam;renderOneTeam();return;}
 const deleteTeamButton=target.closest("[data-delete-team-id]");if(deleteTeamButton){deleteTeam(deleteTeamButton.dataset.deleteTeamId);return;}
 const playerDelete=target.closest("[data-delete-player]");if(playerDelete){deletePlayer(playerDelete.dataset.deletePlayer);return;}
 const editPlan=target.closest("[data-edit-plan-drill]");if(editPlan){openDrillEditor("plan",editPlan.dataset.editPlanDrill);return;}
 const editBank=target.closest("[data-edit-bank-drill]");if(editBank){openDrillEditor("bank",editBank.dataset.editBankDrill);return;}
 const addBank=target.closest("[data-add-bank-drill]");if(addBank){addBankDrill(addBank.dataset.addBankDrill);return;}
 const addLaneDrill=target.closest("[data-add-to-lane]");if(addLaneDrill){openBank(addLaneDrill.dataset.addToLane);return;}
 const editStation=target.closest("[data-edit-station]");if(editStation){openStation(editStation.dataset.editStation);return;}
 const addLaneInline=target.closest("[data-add-lane-inline]");if(addLaneInline){openStation(addLaneInline.dataset.addLaneInline);return;}
 const deleteLane=target.closest("[data-remove-lane]");if(deleteLane){removeLane(deleteLane.dataset.removeLane);return;}
 const removeDrill=target.closest("[data-remove-drill]");if(removeDrill){removePlanDrill(removeDrill.dataset.removeDrill);return;}
 const moveToRoot=target.closest("[data-move-to-plan]");if(moveToRoot){moveToMainPlan(moveToRoot.dataset.moveToPlan);return;}
 const deleteBlock=target.closest("[data-delete-block]");if(deleteBlock){removeBlock(deleteBlock.dataset.deleteBlock);return;}
 const openGroup=target.closest("[data-open-drill-groups]");if(openGroup){openGroups(openGroup.dataset.openDrillGroups);return;}
 const addGroupButton=target.closest("#add-drill-group");if(addGroupButton){addGroup();return;}
 const randomizeButton=target.closest("#randomize-drill-groups");if(randomizeButton){randomizeGroups();return;}
 const deleteGroupButton=target.closest("[data-delete-drill-group]");if(deleteGroupButton){deleteGroup(deleteGroupButton.dataset.deleteDrillGroup);return;}
 const saveSkillButton=target.closest("[data-save-skill]");if(saveSkillButton){saveSkill(saveSkillButton.dataset.saveSkill);return;}
 const deleteSkillButton=target.closest("[data-delete-skill]");if(deleteSkillButton){removeSkill(deleteSkillButton.dataset.deleteSkill);return;}
}
function beginPlanDrag(event){
 const handle=event.target.closest("[data-drag-kind]");if(!handle)return;
 drag={kind:handle.dataset.dragKind,id:handle.dataset.dragId,startX:event.clientX,startY:event.clientY,pointerY:event.clientY,active:false,target:null,ghost:null,
  timer:setTimeout(()=>{
   if(!drag)return;
   drag.active=true;handle.classList.add("dragging");document.body.classList.add("dragging-active");navigator.vibrate?.(12);
   const source=handle.closest("[data-drill-card],[data-block-id]");
   const label=source?.querySelector(".drill-name")?.textContent||source?.querySelector(".station-title strong")?.textContent||"Moving schedule item";
   const ghost=document.createElement("div");ghost.className="drag-ghost";ghost.textContent=label;
   document.body.appendChild(ghost);drag.ghost=ghost;ghost.style.left=(event.clientX+12)+"px";ghost.style.top=(event.clientY+12)+"px";
  },230)};
}
function movePlanDrag(event){
 if(!drag)return;
 if(!drag.active){
  if(Math.abs(event.clientX-drag.startX)>12||Math.abs(event.clientY-drag.startY)>12){clearTimeout(drag.timer);drag=null;}
  return;
 }
 event.preventDefault();drag.pointerY=event.clientY;
 if(drag.ghost){drag.ghost.style.left=(event.clientX+12)+"px";drag.ghost.style.top=(event.clientY+12)+"px";}
 const scroller=$("main-content");
 const rect=scroller.getBoundingClientRect(),edge=76;
 if(event.clientY<rect.top+edge)scroller.scrollTop-=Math.ceil((rect.top+edge-event.clientY)/3);
 else if(event.clientY>rect.bottom-edge)scroller.scrollTop+=Math.ceil((event.clientY-(rect.bottom-edge))/3);
 document.querySelectorAll(".drop-target,.drop-before,.drop-after").forEach(el=>el.classList.remove("drop-target","drop-before","drop-after"));
 const target=document.elementFromPoint(event.clientX,event.clientY);
 const dest=target?.closest("[data-drill-card],[data-drop-lane],[data-block-id],[data-drop-root]");
 drag.target=dest||null;
 const card=dest?.closest("[data-drill-card]");
 if(card){
  const bounds=card.getBoundingClientRect();
  card.classList.add("drop-target",event.clientY<bounds.top+bounds.height/2?"drop-before":"drop-after");
 }else dest?.classList.add("drop-target");
}
function endPlanDrag(){
 if(!drag)return;
 const item=drag;clearTimeout(item.timer);drag=null;document.body.classList.remove("dragging-active");
 item.ghost?.remove();
 document.querySelectorAll(".dragging,.drop-target,.drop-before,.drop-after").forEach(el=>el.classList.remove("dragging","drop-target","drop-before","drop-after"));
 if(!item.active||!item.target)return;
 const target=item.target;
 if(item.kind==="block"){
  const block=target.closest("[data-block-id]");
  if(block&&block.dataset.blockId!==item.id){
   const cards=[...$("plan-blocks").querySelectorAll(":scope > [data-block-id]")];
   const index=cards.indexOf(block),after=item.pointerY>block.getBoundingClientRect().top+block.getBoundingClientRect().height/2;
   const next=after?cards[index+1]:block;
   remember();practice.reorderScheduledBlock(item.id,next?.dataset.blockId||null);renderApp();
  }
  return;
 }
 const card=target.closest("[data-drill-card]"),lane=target.closest("[data-drop-lane]");
 const laneId=lane?.dataset.dropLane||card?.dataset.parentLane||null;
 let beforeId=card?.dataset.drillCard||null;
 if(card&&item.pointerY>card.getBoundingClientRect().top+card.getBoundingClientRect().height/2){
  const list=lane||$("plan-blocks");
  const siblings=[...list.querySelectorAll("[data-drill-card]")].filter(el=>lane?el.closest("[data-drop-lane]")===lane:!el.closest("[data-drop-lane]"));
  const index=siblings.indexOf(card);beforeId=siblings[index+1]?.dataset.drillCard||null;
 }
 if(item.id!==beforeId){if(practice.moveScheduledDrill(item.id,laneId,beforeId)){renderApp();toast("Drill moved.");}}
}
function registerEvents(){
 document.addEventListener("click",handleClick);
 $("brand-home").addEventListener("click",()=>{state.view="plans";state.planDetailOpen=false;renderApp();});
 $("create-plan").addEventListener("click",createPlan);
 $("plans-team-select").addEventListener("change",e=>switchTeam(e.target.value));
 $("back-to-plans").addEventListener("click",()=>{state.planDetailOpen=false;if(state.live.active)endLive(false);renderApp();});
 $("plan-name").addEventListener("change",e=>updatePlan("name",e.target.value.trim()||"Practice plan"));
 $("plan-date").addEventListener("change",e=>updatePlan("date",e.target.value));
 $("plan-start").addEventListener("change",e=>updatePlan("start",e.target.value));
 $("plan-end").addEventListener("change",e=>updatePlan("end",e.target.value));
 $("add-drill-to-plan").addEventListener("click",()=>openBank(null));
 $("floating-add").addEventListener("click",()=>openBank(null));
 $("add-station").addEventListener("click",()=>openStation());
 $("fit-practice").addEventListener("click",fitCurrentPlan);
 $("duplicate-plan").addEventListener("click",()=>duplicateCurrentPlan(false));
 $("run-again").addEventListener("click",()=>duplicateCurrentPlan(true));
 $("live-start").addEventListener("click",startLive);
 $("live-next").addEventListener("click",()=>advanceLive("complete"));
 $("live-skip").addEventListener("click",()=>advanceLive("skip"));
 $("live-previous").addEventListener("click",previousLive);
 $("live-exit").addEventListener("click",()=>endLive());
 $("plan-equipment").addEventListener("click",openEquipment);
 $("equipment-done").addEventListener("click",()=>{const shouldStart=pendingLiveStart;pendingLiveStart=false;close("equipment-sheet");if(shouldStart)beginLive();});
 $("equipment-sheet").addEventListener("close",()=>{pendingLiveStart=false;$("equipment-done").textContent="Done";});
 const pdf=()=>{const result=exportPracticePDF();if(!result.ok)toast(result.message);else if(result.overflow)toast("PDF saved, but a drill’s instructions may exceed the printable area. Shorten that drill’s notes.");else toast("PDF saved · "+result.pages+" page"+(result.pages===1?"":"s"));};
 $("plan-pdf").addEventListener("click",pdf);$("header-pdf").addEventListener("click",pdf);
 $("header-menu").addEventListener("click",()=>show("backup-sheet"));
 $("export-backup").addEventListener("click",()=>{exportBackup();close("backup-sheet");toast("Backup downloaded.");});
 $("import-backup").addEventListener("click",()=>$("backup-file").click());
 $("backup-file").addEventListener("change",backupRestore);
 $("drill-search").addEventListener("input",renderApp);$("drill-skill-filter").addEventListener("change",renderApp);
 $("bank-search").addEventListener("input",renderBankPicker);$("bank-skill-filter").addEventListener("change",renderBankPicker);
 $("new-bank-drill").addEventListener("click",()=>openDrillEditor("new"));
 $("drill-form").addEventListener("submit",saveDrill);$("delete-drill").addEventListener("click",deleteEditorDrill);
 $("add-equipment-row").addEventListener("click",()=>{const values=editorEquipment(true);values.push({name:"",quantity:1,perPlayer:false});renderEditorEquipment(values);});
 $("add-step").addEventListener("click",()=>{const values=editorSteps(true);values.push("");renderEditorSteps(values);});
 $("edit-equipment-rows").addEventListener("click",event=>{const button=event.target.closest("[data-remove-eq-row]");if(!button)return;const values=editorEquipment(true);values.splice(Number(button.dataset.removeEqRow),1);renderEditorEquipment(values);});
 $("edit-steps").addEventListener("click",event=>{const button=event.target.closest("[data-remove-step]");if(!button)return;const values=editorSteps(true);values.splice(Number(button.dataset.removeStep),1);renderEditorSteps(values);});
 $("add-lane").addEventListener("click",addLane);$("station-form").addEventListener("submit",saveStation);$("delete-station").addEventListener("click",deleteStation);
 $("equipment-checklist").addEventListener("change",event=>{const input=event.target.closest("[data-equipment-checked]");if(input)checkEquipment(input.dataset.equipmentChecked,input.checked);});
 $("plan-blocks").addEventListener("pointerdown",beginPlanDrag);document.addEventListener("pointermove",movePlanDrag,{passive:false});
 document.addEventListener("pointerup",endPlanDrag);document.addEventListener("pointercancel",endPlanDrag);
 $("new-team").addEventListener("click",addTeamDialog);$("edit-team-name").addEventListener("click",renameTeamDialog);
 $("team-form").addEventListener("submit",submitTeam);$("delete-team").addEventListener("click",()=>deleteTeam());
 $("add-player").addEventListener("click",addPlayer);$("new-player-name").addEventListener("keydown",e=>{if(e.key==="Enter"){e.preventDefault();addPlayer();}});
 $("roster-list").addEventListener("change",e=>{const input=e.target.closest("[data-player-id]");if(input)renamePlayer(input.dataset.playerId,input.value);});
 $("manage-skills").addEventListener("click",openSkills);$("add-skill").addEventListener("click",addSkillFromInput);
 $("new-skill-name").addEventListener("keydown",e=>{if(e.key==="Enter"){e.preventDefault();addSkillFromInput();}});
 $("group-sheet").addEventListener("pointerdown",groupPointerDown);document.addEventListener("pointermove",groupPointerMove,{passive:false});
 document.addEventListener("pointerup",groupPointerUp);document.addEventListener("pointercancel",groupPointerUp);
 $("drill-group-board").addEventListener("change",e=>{const input=e.target.closest("[data-group-name]");if(input)renameGroup(input.dataset.groupName,input.value);});
 $("stats-team-select").addEventListener("change",e=>{state.statsTeamId=e.target.value;renderApp();});
 $("stats-from").addEventListener("change",renderApp);$("stats-to").addEventListener("change",renderApp);
 $("stats-clear-range").addEventListener("click",()=>{$("stats-from").value="";$("stats-to").value="";renderApp();});
 $("toast-undo").addEventListener("click",async()=>{await releaseWakeLock();if(undo()){renderApp();toast("Undone.");}});
 document.querySelectorAll("dialog").forEach(dialog=>{
  const grabber=dialog.querySelector(".sheet-grabber");
  if(grabber){
   let startY=null;
   grabber.addEventListener("pointerdown",e=>{startY=e.clientY;grabber.setPointerCapture(e.pointerId);});
   grabber.addEventListener("pointerup",e=>{if(startY!==null&&e.clientY-startY>80&&dialog.scrollTop<=4)dialog.close();startY=null;});
   grabber.addEventListener("pointercancel",()=>{startY=null;});
  }
 });
 document.addEventListener("visibilitychange",()=>{if(document.visibilityState==="visible"&&state.live.active&&!wakeLock)requestWakeLock();});
 if("serviceWorker"in navigator)navigator.serviceWorker.register("./service-worker.js").catch(()=>{});
}
loadApp();registerEvents();renderApp();
