import {state,SKILLS,esc,activeTeam,activePlan,plansForTeam,flattenDrills,blockMinutes,totalPracticeMinutes,durationLabel,clockLabel,skillColor,equipmentTotals} from "../core/store.js";
const $=id=>document.getElementById(id);
const hidden=(id,value)=>{if($(id))$(id).hidden=value;};
const grip='<svg viewBox="0 0 24 24" aria-hidden="true"><circle cx="8" cy="6" r="1.2"/><circle cx="16" cy="6" r="1.2"/><circle cx="8" cy="12" r="1.2"/><circle cx="16" cy="12" r="1.2"/><circle cx="8" cy="18" r="1.2"/><circle cx="16" cy="18" r="1.2"/></svg>';
function skillStyle(tags=[]) {
  const colors=[...new Set(tags)].map(skillColor);
  const color=colors[0]||"#78909c";
  const stripe=colors.length>1?"linear-gradient(90deg,"+colors.map((value,index)=>value+" "+(index/colors.length*100)+"% "+((index+1)/colors.length*100)+"%").join(",")+")":color;
  return `--skill:${color};--skill-soft:${color}18;--skill-mid:${color}34;--skill-strip:${stripe}`;
}
function skillLabels(tags=[]) {
  return tags.map(tag=>`<span class="skill-chip" style="--chip:${skillColor(tag)}">${esc(tag)}</span>`).join("");
}
function equipmentText(drill) {
  const players=Math.max(1,activeTeam()?.players?.length||0);
  return (drill.equipment||[]).map(item=>`${item.name} × ${item.quantity*(item.perPlayer?players:1)}${item.perPlayer?" / player":""}`).join(" · ");
}
function renderPlanCard(plan) {
  const drills=flattenDrills(plan),done=drills.filter(d=>plan.completedIds.includes(d.id)).length;
  const mins=totalPracticeMinutes(plan),skills=[...new Set(drills.flatMap(d=>d.tags))].slice(0,5);
  const date=plan.date?new Date(plan.date+"T12:00:00").toLocaleDateString(undefined,{month:"short",day:"numeric"}):"No date";
  return `<article class="plan-card" data-open-plan="${esc(plan.id)}">
    <div class="plan-card-top"><span class="plan-date">${esc(date)}</span><button class="mini-icon danger-text" data-delete-plan="${esc(plan.id)}" aria-label="Delete plan">×</button></div>
    <h3>${esc(plan.name)}</h3>
    <div class="plan-card-meta"><span>${durationLabel(mins)} planned</span><span>${drills.length} drills</span><span>${done} done</span></div>
    <div class="plan-color-row">${skills.map(s=>`<i style="background:${skillColor(s)}" title="${esc(s)}"></i>`).join("")}</div>
  </article>`;
}
function renderPlansList() {
  $("plans-team-select").innerHTML=state.teams.map(t=>`<option value="${esc(t.id)}" ${t.id===state.activeTeamId?"selected":""}>${esc(t.name)}</option>`).join("");
  const list=plansForTeam();
  $("plans-list").innerHTML=list.map(renderPlanCard).join("")||'<div class="empty-state">No plans yet.</div>';
}
function details(drill) {
  const gear=equipmentText(drill);
  return `<div class="live-drill-details">
    ${gear?`<div class="live-equipment"><strong>Gear</strong><span>${esc(gear)}</span></div>`:""}
    ${drill.steps?.length?`<ol class="live-steps">${drill.steps.map(s=>`<li>${esc(s)}</li>`).join("")}</ol>`:'<p class="no-steps">No instructions yet.</p>'}
  </div>`;
}
function drillStatus(plan,drill) {
  if(plan.completedIds.includes(drill.id))return "complete";
  if(plan.skippedIds.includes(drill.id))return "skipped";
  return "";
}
function renderDrillCard(drill,{laneId=null,stationLive=false,timeRange=""}={}) {
  const plan=activePlan(),current=state.live.active&&state.live.planId===plan?.id&&!stationLive&&state.live.currentBlockId===drill.id;
  const status=drillStatus(plan,drill),expanded=current||stationLive;
  return `<article class="drill-card ${current?"current-popout":""} ${status==="complete"?"is-complete":""} ${status==="skipped"?"is-skipped":""}" data-drill-card="${esc(drill.id)}" data-parent-lane="${esc(laneId||"")}" style="${skillStyle(drill.tags)}">
    <button class="drag-handle" data-drag-kind="drill" data-drag-id="${esc(drill.id)}" aria-label="Hold and drag drill">${grip}</button>
    <button class="drill-card-main" data-edit-plan-drill="${esc(drill.id)}">
      <span class="drill-name">${esc(drill.name)}</span>
      <span class="drill-subline"><b>${drill.minutes} min</b> ${timeRange?"<span>"+esc(timeRange)+"</span>":""} ${skillLabels(drill.tags)}</span>
    </button>
    <div class="drill-card-actions">
      <button class="mini-icon group-open" data-open-drill-groups="${esc(drill.id)}" aria-label="Assign groups" title="Groups"><svg viewBox="0 0 24 24" aria-hidden="true"><circle cx="9" cy="8" r="3"/><path d="M3 20v-2a6 6 0 0 1 12 0v2M16 5a3 3 0 0 1 0 6M18 15a5 5 0 0 1 3 5"/></svg></button>
      <button class="status-pill ${status||"pending"}" data-drill-status="${esc(drill.id)}" data-next-status="${status?"clear":"complete"}" aria-label="${status?"Clear drill status":"Mark drill done"}">${status==="complete"?"Done · undo":status==="skipped"?"Skipped · undo":"Mark done"}</button>
      ${laneId?`<button class="mini-icon" data-move-to-plan="${esc(drill.id)}" aria-label="Move to main plan">↗</button>`:""}
      <button class="mini-icon danger-text" data-remove-drill="${esc(drill.id)}" aria-label="Remove drill">×</button>
    </div>
    ${expanded?details(drill):""}
  </article>`;
}
function renderStation(block,start,end,plan,offset) {
  const live=state.live.active&&state.live.planId===activePlan()?.id&&state.live.currentBlockId===block.id;
  const lanes=(block.lanes||[]).map((lane,i)=>{
    const laneTime=lane.drills.reduce((n,d)=>n+d.minutes,0);
    return `<section class="station-lane" data-drop-lane="${esc(lane.id)}">
      <div class="lane-heading"><span>${esc(lane.name||"Lane "+(i+1))}</span><small>${durationLabel(laneTime)}</small></div>
      <div class="lane-drills">${lane.drills.map((drill,index)=>{const offsetBefore=lane.drills.slice(0,index).reduce((n,item)=>n+item.minutes,0);const drillStart=clockLabel(plan.start,offset+offsetBefore),drillEnd=clockLabel(plan.start,offset+offsetBefore+drill.minutes);return renderDrillCard(drill,{laneId:lane.id,stationLive:live,timeRange:drillStart+"–"+drillEnd});}).join("")||'<div class="lane-empty">Drop a drill here</div>'}</div>
      <button class="lane-add" data-add-to-lane="${esc(lane.id)}">+ Add drill</button>
    </section>`;
  }).join("");
  return `<section class="station-block ${live?"current-popout":""}" data-block-id="${esc(block.id)}" data-drop-block="${esc(block.id)}" style="--station-skill:#51788c">
    <div class="station-heading">
      <span class="drag-handle block-grip" data-drag-kind="block" data-drag-id="${esc(block.id)}" aria-label="Hold and drag station">${grip}</span>
      <button class="station-title" data-edit-station="${esc(block.id)}"><span class="station-label">CONCURRENT STATION</span><strong>${esc(block.name)}</strong><small>${start} – ${end} · ${block.minutes} min</small></button>
      <button class="mini-icon" data-edit-station="${esc(block.id)}" aria-label="Edit station">···</button>
      <button class="mini-icon danger-text" data-delete-block="${esc(block.id)}" aria-label="Delete station">×</button>
    </div>
    <div class="station-lanes">${lanes}</div>
    <button class="lane-add add-lane-inline" data-add-lane-inline="${esc(block.id)}">+ Lane</button>
  </section>`;
}
function renderPlanBlocks(plan) {
  let elapsed=0;
  return plan.blocks.map(block=>{
    const offset=elapsed,start=clockLabel(plan.start,offset),mins=blockMinutes(block),end=clockLabel(plan.start,offset+mins);elapsed+=mins;
    if(block.kind==="station")return renderStation(block,start,end,plan,offset);
    const status=drillStatus(plan,block);
    return `<div class="plan-block-wrap" data-block-id="${esc(block.id)}" data-drop-block="${esc(block.id)}">
      <div class="plan-time"><strong>${start}</strong><span>to ${end}</span><small>${mins}m</small></div>
      <div class="root-drill-wrap">${renderDrillCard(block)}</div>
    </div>`;
  }).join("")||'<div class="empty-state">Your plan is empty. Add a drill to begin.</div>';
}
function renderPlanDetail() {
  const plan=activePlan();if(!plan)return;
  $("plan-name").value=plan.name;$("plan-date").value=plan.date;$("plan-start").value=plan.start;$("plan-end").value=plan.end;
  const drills=flattenDrills(plan),done=drills.filter(d=>plan.completedIds.includes(d.id)).length;
  $("plan-drill-count").textContent=drills.length;
  $("plan-total-time").textContent=durationLabel(totalPracticeMinutes(plan));
  $("plan-completed-count").textContent=done;
  $("plan-blocks").innerHTML=renderPlanBlocks(plan);
  const live=state.live.active&&state.live.planId===plan.id;
  $("live-bar").hidden=!live;$("live-start").hidden=live;
  if(live) {
    const index=plan.blocks.findIndex(b=>b.id===state.live.currentBlockId);
    $("live-position").textContent=(index+1)+" / "+plan.blocks.length;
    $("live-previous").disabled=index<=0;
    $("live-next").textContent=index===plan.blocks.length-1?"Finish":"Done";
  }
  const windowM=practiceWindow(plan),planned=totalPracticeMinutes(plan);
  $("fit-practice").textContent=planned===windowM?"Fitted":"Fit time";
}
function practiceWindow(plan) {
  const [h1,m1]=(plan.start||"18:00").split(":").map(Number),[h2,m2]=(plan.end||"19:30").split(":").map(Number);
  let n=h2*60+m2-(h1*60+m1);if(n<=0)n+=1440;return n;
}
function renderPlanView() {
  const detail=!!state.planDetailOpen&&!!activePlan();
  hidden("plans-list-view",detail);hidden("plan-detail-view",!detail);
  if(detail)renderPlanDetail();else renderPlansList();
}
function drillCardForBank(drill,pick=false) {
  return `<article class="library-card" style="${skillStyle(drill.tags)}">
    <button class="library-main" data-edit-bank-drill="${esc(drill.id)}"><strong>${esc(drill.name)}</strong><small>${drill.minutes} min · ${skillLabels(drill.tags)}</small></button>
    ${pick?`<button class="add-circle bank-add" data-add-bank-drill="${esc(drill.id)}" aria-label="Add ${esc(drill.name)}">+</button>`:`<button class="mini-icon" data-edit-bank-drill="${esc(drill.id)}" aria-label="Edit drill">···</button>`}
  </article>`;
}
function filteredBank(searchId,filterId) {
  const q=$(searchId)?.value?.trim().toLowerCase()||"",skill=$(filterId)?.value||"";
  return state.drillBank.filter(d=>(!skill||d.tags.includes(skill))&&(!q||(d.name+" "+d.tags.join(" ")+" "+d.steps.join(" ")+" "+d.equipment.map(x=>x.name).join(" ")).toLowerCase().includes(q)));
}
function fillSkillSelect(id,all=false) {
  const element=$(id);if(!element)return;
  const old=element.value;
  element.innerHTML=(all?'<option value="">All skills</option>':"")+SKILLS.map(s=>`<option value="${esc(s)}">${esc(s)}</option>`).join("");
  if([...element.options].some(x=>x.value===old))element.value=old;
}
function renderDrillLibrary() {
  fillSkillSelect("drill-skill-filter",true);
  const list=filteredBank("drill-search","drill-skill-filter");
  $("drill-count").textContent=list.length+" / "+state.drillBank.length;
  $("drill-library").innerHTML=list.map(d=>drillCardForBank(d)).join("")||'<div class="empty-state">No drills found.</div>';
}
function renderBankSheet() {
  fillSkillSelect("bank-skill-filter",true);
  const list=filteredBank("bank-search","bank-skill-filter");
  $("bank-pick-list").innerHTML=list.map(d=>drillCardForBank(d,true)).join("")||'<div class="empty-state">No drills found.</div>';
}
function renderTeams() {
  const chosen=state.teams.find(t=>t.id===state.selectedTeamId)||activeTeam();
  $("team-list").innerHTML=state.teams.map(t=>`<div class="team-row ${t.id===chosen?.id?"selected":""}">
    <button class="team-chip" data-select-team="${esc(t.id)}"><strong>${esc(t.name)}</strong><small>${t.players.length} players</small></button>
    <button class="team-delete mini-icon danger-text" data-delete-team-id="${esc(t.id)}" aria-label="Delete ${esc(t.name)}">×</button>
  </div>`).join("");
  if(!chosen)return;
  $("roster-team-name").textContent=chosen.name;
  $("delete-team").disabled=state.teams.length<=1;
  $("roster-list").innerHTML=chosen.players.map(player=>`<div class="player-row" data-player-row="${esc(player.id)}">
    <input class="player-name" data-player-id="${esc(player.id)}" value="${esc(player.name)}" maxlength="60" aria-label="Player name">
    <button class="player-delete" data-delete-player="${esc(player.id)}" aria-label="Delete ${esc(player.name)}">×</button>
  </div>`).join("")||'<div class="empty-roster">No players yet.</div>';
}
function renderStats() {
  const team=state.teams.find(t=>t.id===state.statsTeamId)||activeTeam();
  $("stats-team-select").innerHTML=state.teams.map(t=>`<option value="${esc(t.id)}" ${t.id===team?.id?"selected":""}>${esc(t.name)}</option>`).join("");
  const plans=plansForTeam(team?.id),skills=new Map();let planned=0,completed=0;
  for(const plan of plans){
    planned+=totalPracticeMinutes(plan);
    for(const block of plan.blocks){
      const drills=block.kind==="station"?block.lanes.flatMap(lane=>lane.drills):[block];
      if(drills.length&&drills.every(drill=>plan.completedIds.includes(drill.id)))completed+=blockMinutes(block);
    }
    for(const drill of flattenDrills(plan)){
      const tags=[...new Set(drill.tags||[])];
      if(!tags.length)continue;
      const base=Math.floor(drill.minutes/tags.length),extra=drill.minutes%tags.length;
      tags.forEach((skill,index)=>{
        const share=base+(index<extra?1:0);
        const row=skills.get(skill)||{planned:0,completed:0,skipped:0};
        row.planned+=share;
        if(plan.completedIds.includes(drill.id))row.completed+=share;
        if(plan.skippedIds.includes(drill.id))row.skipped+=share;
        skills.set(skill,row);
      });
    }
    }
  }
  $("stats-plan-count").textContent=plans.length;
  $("stats-planned-total").textContent=durationLabel(planned);
  $("stats-done-total").textContent=durationLabel(completed);
  $("stats-team-label").textContent=team?.name||"";
  const max=Math.max(1,...[...skills.values()].map(x=>x.planned));
  $("skill-stats").innerHTML=[...skills.entries()].sort((a,b)=>b[1].planned-a[1].planned).map(([skill,v])=>`<div class="skill-stat-row">
    <div class="skill-stat-label"><span class="skill-dot" style="background:${skillColor(skill)}"></span><strong>${esc(skill)}</strong><span>${durationLabel(v.planned)} planned · ${durationLabel(v.completed)} done${v.skipped?" · "+durationLabel(v.skipped)+" skipped":""}</span></div>
    <div class="stat-track"><i style="width:${Math.max(1,Math.round(v.planned/max*100))}%;background:${skillColor(skill)}"></i><b style="width:${Math.max(0,Math.round(v.completed/max*100))}%"></b></div>
  </div>`).join("")||'<div class="empty-state">Add skills to drills to see skill stats.</div>';
  $("stats-history").innerHTML=plans.slice().sort((a,b)=>(b.date||"").localeCompare(a.date||"")).map(plan=>{
    const drills=flattenDrills(plan),done=drills.filter(d=>plan.completedIds.includes(d.id)).length;
    return `<div class="history-row"><span><strong>${esc(plan.name)}</strong><small>${esc(plan.date||"No date")}</small></span><b>${durationLabel(totalPracticeMinutes(plan))}</b><small>${done}/${drills.length} done</small></div>`;
  }).join("")||'<div class="empty-state">No practice plans yet.</div>';
}
export function renderEquipmentSheet() {
  const plan=activePlan();if(!plan)return;
  const list=equipmentTotals(plan);
  $("equipment-checklist").innerHTML=list.length?list.map(item=>{
    const key=item.name.toLowerCase(),checked=!!plan.equipmentChecked[key];
    return `<label class="equipment-check-row ${checked?"is-checked":""}"><input type="checkbox" data-equipment-checked="${esc(key)}" ${checked?"checked":""}><span class="equipment-check"></span><span class="equipment-check-name"><strong>${esc(item.name)}</strong><small>${esc([...new Set(item.uses)].join(", "))}</small></span><b>× ${item.quantity}</b></label>`;
  }).join(""):'<div class="empty-state">No equipment assigned.</div>';
}
export function renderGroupBoard() {
  const plan=activePlan(),drill=plan&&flattenDrills(plan).find(x=>x.id===state.groupingDrillId);if(!drill)return;
  if(!drill.grouping)drill.grouping={groups:[]};
  const team=activeTeam(),valid=new Set(team.players.map(p=>p.id));
  drill.grouping.groups.forEach(group=>group.playerIds=group.playerIds.filter(id=>valid.has(id)));
  const assigned=new Set(drill.grouping.groups.flatMap(g=>g.playerIds));
  const playerRow=player=>`<div class="group-player" data-group-player="${esc(player.id)}" draggable="false"><span class="drag-handle group-grip">${grip}</span><strong>${esc(player.name)}</strong></div>`;
  const groups=drill.grouping.groups.map(group=>`<section class="drill-group" data-group-target="${esc(group.id)}">
    <div class="drill-group-head"><input data-group-name="${esc(group.id)}" value="${esc(group.name)}" maxlength="40"><button class="mini-icon danger-text" data-delete-drill-group="${esc(group.id)}" aria-label="Delete group">×</button></div>
    <div class="drill-group-players">${team.players.filter(p=>group.playerIds.includes(p.id)).map(playerRow).join("")||'<div class="group-empty">Drop players here</div>'}</div>
  </section>`).join("");
  const unassigned=team.players.filter(p=>!assigned.has(p.id));
  $("drill-group-board").innerHTML=groups+'<section class="drill-group unassigned-group" data-group-target=""><div class="drill-group-head"><strong>Unassigned</strong></div><div class="drill-group-players">'+(unassigned.map(playerRow).join("")||'<div class="group-empty">All players assigned</div>')+'</div></section>';
  $("group-sheet-title").textContent=drill.name;
}
export function renderSkillManager() {
  $("skill-list").innerHTML=SKILLS.map(skill=>`<div class="skill-edit-row">
    <input data-skill-name="${esc(skill)}" value="${esc(skill)}" maxlength="40" aria-label="Skill name">
    <input data-skill-color="${esc(skill)}" type="color" value="${skillColor(skill)}" aria-label="Skill color">
    <button class="mini-icon" data-save-skill="${esc(skill)}" aria-label="Save skill">✓</button>
    <button class="mini-icon danger-text" data-delete-skill="${esc(skill)}" aria-label="Delete skill">×</button>
  </div>`).join("")||'<div class="empty-state">No skills. Add one below.</div>';
}
export function renderApp() {
  for(const view of ["plans","drills","teams","stats"])hidden("view-"+view,state.view!==view);
  document.querySelectorAll(".nav-tab").forEach(button=>{
    const active=button.dataset.view===state.view;button.classList.toggle("active",active);
    if(active)button.setAttribute("aria-current","page");else button.removeAttribute("aria-current");
  });
  hidden("floating-add",!(state.view==="plans"&&state.planDetailOpen));
  hidden("header-pdf",!(state.view==="plans"&&state.planDetailOpen));
  renderPlanView();renderDrillLibrary();renderTeams();renderStats();
}
export function renderBankPicker(){renderBankSheet();}
export function renderOnePlan(){renderPlanDetail();renderStats();}
export function renderOneTeam(){renderTeams();}
export function renderEquipment(){renderEquipmentSheet();}
export function renderEditorTags(selected=[]) {
  $("edit-tags").innerHTML=SKILLS.map(skill=>`<label class="tag-option" style="--chip:${skillColor(skill)}"><input type="checkbox" value="${esc(skill)}" ${selected.includes(skill)?"checked":""}><span>${esc(skill)}</span></label>`).join("")||'<div class="empty-state">Add a skill in the Skills screen.</div>';
}
export function renderEditorEquipment(items=[]) {
  $("edit-equipment-rows").innerHTML=items.map((item,i)=>`<div class="edit-equipment-row">
    <input data-eq-field="name" value="${esc(item.name)}" list="equipment-suggestions" placeholder="Equipment" aria-label="Equipment">
    <input data-eq-field="quantity" type="number" min="1" max="999" value="${item.quantity||1}" aria-label="Quantity">
    <label class="per-player-toggle"><input type="checkbox" data-eq-field="perPlayer" ${item.perPlayer?"checked":""}> / player</label>
    <button class="mini-icon danger-text" type="button" data-remove-eq-row="${i}" aria-label="Remove equipment">×</button>
  </div>`).join("")+'<datalist id="equipment-suggestions"><option value="Basketballs"><option value="Cones"><option value="Pinnies"><option value="Whistles"><option value="Stopwatches"><option value="Clipboards"><option value="Floor tape"><option value="Hurdles"><option value="Resistance bands"><option value="First-aid kits"></datalist>';
}
export function renderEditorSteps(steps=[]) {
  const values=steps.length?steps:[""];
  $("edit-steps").innerHTML=values.map((step,i)=>`<div class="edit-step-row"><span>${i+1}</span><textarea data-step-index="${i}" rows="2" maxlength="1600" placeholder="Instruction or coaching cue">${esc(step)}</textarea><button class="mini-icon danger-text" type="button" data-remove-step="${i}" aria-label="Remove step">×</button></div>`).join("");
}
export function renderStationEditor(block) {
  $("station-name").value=block.name;$("station-minutes").value=block.minutes||15;
  $("station-lanes-editor").innerHTML=block.lanes.map(lane=>`<div class="station-lane-edit"><input data-lane-name="${esc(lane.id)}" value="${esc(lane.name)}" maxlength="50" aria-label="Lane name"><span>${lane.drills.length} drills</span><button class="mini-icon danger-text" data-remove-lane="${esc(lane.id)}" type="button" aria-label="Remove lane">×</button></div>`).join("");
}
