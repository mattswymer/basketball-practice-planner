import {
  state, SKILLS, esc, activeTeam, activePlan, plansForTeam, flattenDrills,
  blockMinutes, totalPracticeMinutes, totalDrillMinutes, durationLabel,
  clockLabel, skillColor, equipmentTotals
} from "./store.js";
const $=id=>document.getElementById(id);
const setHidden=(id,hidden)=>{const el=$(id);if(el)el.hidden=hidden;};
const iconGrip='<svg viewBox="0 0 24 24" aria-hidden="true"><circle cx="8" cy="6" r="1.2"/><circle cx="16" cy="6" r="1.2"/><circle cx="8" cy="12" r="1.2"/><circle cx="16" cy="12" r="1.2"/><circle cx="8" cy="18" r="1.2"/><circle cx="16" cy="18" r="1.2"/></svg>';
function skillStyle(skill){const color=skillColor(skill);return `--skill:${color};--skill-soft:${color}18;--skill-mid:${color}34`;}
function equipmentText(drill) {
  const players=Math.max(1,activeTeam()?.players?.length||0);
  return (drill.equipment||[]).map(x=>{
    const q=Math.max(1,Number(x.quantity)||1)*(x.perPlayer?players:1);
    return `${x.name} × ${q}${x.perPlayer?" (per player)":""}`;
  }).join(" · ");
}
function renderPlanCard(plan) {
  const drills=flattenDrills(plan),done=drills.filter(d=>plan.completedIds.includes(d.id)).length;
  const total=totalPracticeMinutes(plan);
  const day=plan.date?new Date(plan.date+"T12:00:00").toLocaleDateString(undefined,{month:"short",day:"numeric"}):"No date";
  const skills=[...new Set(drills.map(d=>d.primarySkill))].slice(0,4);
  return `<article class="plan-card" data-open-plan="${esc(plan.id)}">
    <div class="plan-card-top"><span class="plan-date">${esc(day)}</span><button class="mini-icon danger-text" data-delete-plan="${esc(plan.id)}" aria-label="Delete plan">×</button></div>
    <h3>${esc(plan.name)}</h3>
    <div class="plan-card-meta"><span>${durationLabel(total)} planned</span><span>${drills.length} drills</span><span>${done} done</span></div>
    <div class="plan-color-row">${skills.map(s=>`<i style="background:${skillColor(s)}" title="${esc(s)}"></i>`).join("")}</div>
  </article>`;
}
function renderPlansList() {
  const team=activeTeam(),list=plansForTeam();
  $("plans-team-select").innerHTML=state.teams.map(t=>`<option value="${esc(t.id)}" ${t.id===state.activeTeamId?"selected":""}>${esc(t.name)}</option>`).join("");
  $("plans-list").innerHTML=list.length?list.map(renderPlanCard).join(""):'<div class="empty-state">No plans yet. Create your first practice.</div>';
}
function renderDrillDetails(drill) {
  const equip=equipmentText(drill);
  return `<div class="live-drill-details">
    ${equip?`<div class="live-equipment"><strong>Gear</strong><span>${esc(equip)}</span></div>`:""}
    ${drill.steps?.length?`<ol class="live-steps">${drill.steps.map(s=>`<li>${esc(s)}</li>`).join("")}</ol>`:'<p class="no-steps">No instructions yet.</p>'}
  </div>`;
}
function renderDrillCard(drill,parentLane=null) {
  const plan=activePlan(),completed=plan?.completedIds?.includes(drill.id),current=state.live.active&&state.live.planId===plan?.id&&state.live.currentDrillId===drill.id;
  const skill=drill.primarySkill||"team building";
  const gear=equipmentText(drill);
  return `<article class="drill-card ${current?"current-popout":""} ${completed?"is-complete":""}" data-drill-card="${esc(drill.id)}" data-parent-lane="${esc(parentLane||"")}" data-drop-drill="${esc(drill.id)}" style="${skillStyle(skill)}">
    <button class="drag-handle" data-drag-kind="drill" data-drag-id="${esc(drill.id)}" aria-label="Hold and drag drill to move">${iconGrip}</button>
    <button class="drill-card-main" data-edit-plan-drill="${esc(drill.id)}">
      <span class="drill-skill">${esc(skill)}</span>
      <strong class="drill-name">${esc(drill.name)}</strong>
      <span class="drill-subline"><b>${drill.minutes} min</b>${gear?`<span>· ${esc(gear)}</span>`:""}</span>
    </button>
    <div class="drill-card-actions">
      <button class="complete-toggle ${completed?"checked":""}" data-toggle-complete="${esc(drill.id)}" aria-label="${completed?"Mark incomplete":"Mark complete"}" title="${completed?"Completed":"Mark complete"}">${completed?"✓":"○"}</button>
      ${parentLane?`<button class="mini-icon" data-move-to-plan="${esc(drill.id)}" title="Move to plan" aria-label="Move to main plan">↗</button>`:""}
      <button class="mini-icon danger-text" data-remove-drill="${esc(drill.id)}" title="Remove" aria-label="Remove drill">×</button>
    </div>
    ${current?renderDrillDetails(drill):""}
  </article>`;
}
function renderStation(block,index,offset) {
  const lanes=(block.lanes||[]).map((lane,i)=>{
    const total=lane.drills.reduce((sum,d)=>sum+d.minutes,0);
    return `<section class="station-lane" data-drop-lane="${esc(lane.id)}">
      <div class="lane-heading"><span>${esc(lane.name||"Lane "+(i+1))}</span><small>${durationLabel(total)}</small></div>
      <div class="lane-drills">${lane.drills.map(d=>renderDrillCard(d,lane.id)).join("")||'<div class="lane-empty">Drop a drill here</div>'}</div>
      <button class="lane-add" data-add-to-lane="${esc(lane.id)}">+ Add drill</button>
    </section>`;
  }).join("");
  const minutes=blockMinutes(block);
  return `<section class="station-block" data-block-id="${esc(block.id)}" data-drop-block="${esc(block.id)}">
    <div class="station-heading">
      <button class="drag-handle block-grip" data-drag-kind="block" data-drag-id="${esc(block.id)}" aria-label="Hold and drag station">${iconGrip}</button>
      <button class="station-title" data-edit-station="${esc(block.id)}"><span class="station-label">STATION ROTATION</span><strong>${esc(block.name)}</strong><small>${durationLabel(minutes)} court time · ${block.lanes.filter(l=>l.drills.length).length} active lanes</small></button>
      <button class="mini-icon" data-edit-station="${esc(block.id)}" aria-label="Edit station">···</button>
      <button class="mini-icon danger-text" data-delete-block="${esc(block.id)}" aria-label="Delete station">×</button>
    </div>
    <div class="station-lanes">${lanes}</div>
    <button class="lane-add add-lane-inline" data-add-lane-inline="${esc(block.id)}">+ Lane</button>
  </section>`;
}
function renderPlanBlocks(plan) {
  let elapsed=0;
  const html=plan.blocks.map((block,index)=>{
    const start=clockLabel(plan.start,elapsed),minutes=blockMinutes(block);elapsed+=minutes;
    if(block.kind==="station") return renderStation(block,index,start);
    const card=renderDrillCard(block,null);
    return `<div class="plan-block-wrap" data-block-id="${esc(block.id)}" data-drop-block="${esc(block.id)}">
      <div class="plan-time">${start}<span>${durationLabel(minutes)}</span></div>
      <div class="root-drill-wrap">${card}</div>
    </div>`;
  }).join("");
  return html||'<div class="empty-state">No drills yet. Tap + Add drill.</div>';
}
function renderPlanDetail() {
  const plan=activePlan(); if(!plan) return;
  $("plan-name").value=plan.name;
  $("plan-date").value=plan.date;
  $("plan-start").value=plan.start;
  $("plan-end").value=plan.end;
  const drills=flattenDrills(plan),done=drills.filter(d=>plan.completedIds.includes(d.id)).length;
  $("plan-drill-count").textContent=drills.length;
  $("plan-total-time").textContent=durationLabel(totalPracticeMinutes(plan));
  $("plan-completed-count").textContent=done;
  $("plan-blocks").innerHTML=renderPlanBlocks(plan);
  const live=state.live.active&&state.live.planId===plan.id;
  $("live-bar").hidden=!live;
  $("live-start").hidden=live;
  if(live) {
    const index=drills.findIndex(d=>d.id===state.live.currentDrillId);
    $("live-position").textContent=(index+1)+" / "+drills.length;
    $("live-previous").disabled=index<=0;
    $("live-next").textContent=index===drills.length-1?"Finish":"Done · Next";
  }
}
function renderPlanView() {
  const detail=!!state.planDetailOpen&&!!activePlan();
  setHidden("plans-list-view",detail);
  setHidden("plan-detail-view",!detail);
  if(detail) renderPlanDetail(); else renderPlansList();
}
function drillCardForBank(drill,pick=false) {
  return `<article class="library-card" style="${skillStyle(drill.primarySkill)}">
    <button class="library-main" data-edit-bank-drill="${esc(drill.id)}"><span class="drill-skill">${esc(drill.primarySkill)}</span><strong>${esc(drill.name)}</strong><small>${drill.minutes} min</small></button>
    ${pick?`<button class="add-circle bank-add" data-add-bank-drill="${esc(drill.id)}" aria-label="Add ${esc(drill.name)}">+</button>`:`<button class="mini-icon" data-edit-bank-drill="${esc(drill.id)}" aria-label="Edit drill">···</button>`}
  </article>`;
}
function filteredBank(searchId,filterId) {
  const q=$(searchId)?.value?.trim().toLowerCase()||"",skill=$(filterId)?.value||"";
  return state.drillBank.filter(d=>(!skill||d.primarySkill===skill)&&(!q||(d.name+" "+d.primarySkill+" "+d.tags.join(" ")+" "+d.steps.join(" ")+" "+d.equipment.map(x=>x.name).join(" ")).toLowerCase().includes(q)));
}
function renderSkillOptions(selectId,includeAll=false) {
  const el=$(selectId); if(!el)return;
  const value=el.value;
  el.innerHTML=(includeAll?'<option value="">All skills</option>':"")+SKILLS.map(s=>`<option value="${esc(s)}">${esc(s)}</option>`).join("");
  if([...el.options].some(x=>x.value===value))el.value=value;
}
function renderDrillLibrary() {
  renderSkillOptions("drill-skill-filter",true);
  const list=filteredBank("drill-search","drill-skill-filter");
  $("drill-count").textContent=list.length+" / "+state.drillBank.length;
  $("drill-library").innerHTML=list.map(d=>drillCardForBank(d,false)).join("")||'<div class="empty-state">No drills found.</div>';
}
function renderBankSheet() {
  renderSkillOptions("bank-skill-filter",true);
  const list=filteredBank("bank-search","bank-skill-filter");
  $("bank-pick-list").innerHTML=list.map(d=>drillCardForBank(d,true)).join("")||'<div class="empty-state">No drills found.</div>';
}
function renderTeams() {
  const selected=state.selectedTeamId||state.activeTeamId,team=state.teams.find(t=>t.id===selected)||activeTeam();
  $("team-list").innerHTML=state.teams.map(t=>`<button class="team-chip ${t.id===team?.id?"selected":""}" data-select-team="${esc(t.id)}"><strong>${esc(t.name)}</strong><small>${t.players.length} players</small></button>`).join("");
  if(!team)return;
  $("roster-team-name").textContent=team.name;
  $("delete-team").disabled=state.teams.length<=1;
  $("group-count").value=String(team.groupCount||2);
  $("roster-list").innerHTML=team.players.map((p,i)=>{
    const g=Number(team.groups?.[p.id]||0);
    return `<div class="player-row" data-player-row="${esc(p.id)}">
      <span class="player-swipe-mark">×</span>
      <input class="player-number" data-player-field="number" data-player-id="${esc(p.id)}" value="${esc(p.number)}" inputmode="numeric" maxlength="4" aria-label="Jersey number">
      <input class="player-name" data-player-field="name" data-player-id="${esc(p.id)}" value="${esc(p.name)}" maxlength="60" aria-label="Player name">
      <select class="player-group" data-player-group="${esc(p.id)}" aria-label="Group for ${esc(p.name)}"><option value="0" ${g===0?"selected":""}>—</option>${Array.from({length:team.groupCount||2},(_,n)=>`<option value="${n+1}" ${g===n+1?"selected":""}>G${n+1}</option>`).join("")}</select>
      <button class="player-delete" data-delete-player="${esc(p.id)}" aria-label="Delete ${esc(p.name)}">×</button>
    </div>`;
  }).join("")||'<div class="empty-roster">No players yet.</div>';
  const grouped=new Map();
  team.players.forEach(p=>{const g=Number(team.groups?.[p.id]||0);if(!grouped.has(g))grouped.set(g,[]);grouped.get(g).push(p.name);});
  const count=team.groupCount||2;
  $("group-list").innerHTML=Array.from({length:count},(_,i)=>{
    const names=grouped.get(i+1)||[];
    return `<div class="group-summary"><strong>G${i+1}</strong><span>${names.length?esc(names.join(" · ")):"—"}</span></div>`;
  }).join("");
}
function renderStats() {
  const team=state.teams.find(t=>t.id===state.statsTeamId)||activeTeam();
  $("stats-team-select").innerHTML=state.teams.map(t=>`<option value="${esc(t.id)}" ${t.id===team?.id?"selected":""}>${esc(t.name)}</option>`).join("");
  const plans=plansForTeam(team?.id),skills=new Map();
  let planned=0,completed=0,doneCount=0;
  for(const plan of plans) for(const drill of flattenDrills(plan)) {
    const record=skills.get(drill.primarySkill)||{planned:0,completed:0};
    record.planned+=drill.minutes; planned+=drill.minutes;
    if(plan.completedIds.includes(drill.id)){record.completed+=drill.minutes;completed+=drill.minutes;doneCount++;}
    skills.set(drill.primarySkill,record);
  }
  $("stats-plan-count").textContent=plans.length;
  $("stats-planned-total").textContent=durationLabel(planned);
  $("stats-done-total").textContent=durationLabel(completed);
  $("stats-team-label").textContent=team?.name||"";
  const max=Math.max(1,...[...skills.values()].map(x=>x.planned));
  $("skill-stats").innerHTML=[...skills.entries()].sort((a,b)=>b[1].planned-a[1].planned).map(([skill,v])=>`<div class="skill-stat-row">
    <div class="skill-stat-label"><span class="skill-dot" style="background:${skillColor(skill)}"></span><strong>${esc(skill)}</strong><span>${durationLabel(v.planned)} planned · ${durationLabel(v.completed)} done</span></div>
    <div class="stat-track"><i style="width:${Math.max(1,Math.round(v.planned/max*100))}%;background:${skillColor(skill)}"></i><b style="width:${Math.max(0,Math.round(v.completed/max*100))}%"></b></div>
  </div>`).join("")||'<div class="empty-state">Add drills to your plans to see skill time.</div>';
  $("stats-history").innerHTML=plans.slice().sort((a,b)=>(b.date||"").localeCompare(a.date||"")).map(p=>{
    const all=flattenDrills(p),complete=all.filter(d=>p.completedIds.includes(d.id)).length;
    return `<div class="history-row"><span><strong>${esc(p.name)}</strong><small>${esc(p.date||"No date")}</small></span><b>${durationLabel(totalPracticeMinutes(p))}</b><small>${complete}/${all.length} done</small></div>`;
  }).join("")||'<div class="empty-state">No practice plans yet.</div>';
}
export function equipmentLines(plan) { return equipmentTotals(plan); }
export function renderEquipmentSheet() {
  const plan=activePlan();if(!plan)return;
  const list=equipmentTotals(plan);
  $("equipment-checklist").innerHTML=list.length?list.map(item=>{
    const key=item.name.toLowerCase(),checked=!!plan.equipmentChecked[key];
    return `<label class="equipment-check-row ${checked?"is-checked":""}"><input type="checkbox" data-equipment-checked="${esc(key)}" ${checked?"checked":""}><span class="equipment-check"></span><span class="equipment-check-name"><strong>${esc(item.name)}</strong><small>${esc([...new Set(item.uses)].join(", "))}</small></span><b>× ${item.quantity}</b></label>`;
  }).join(""):'<div class="empty-state">No equipment is assigned to this plan.</div>';
}
export function renderApp() {
  for(const view of ["plans","drills","teams","stats"]) setHidden("view-"+view,state.view!==view);
  document.querySelectorAll(".nav-tab").forEach(button=>{
    const active=button.dataset.view===state.view;
    button.classList.toggle("active",active);
    if(active)button.setAttribute("aria-current","page");else button.removeAttribute("aria-current");
  });
  setHidden("floating-add",!(state.view==="plans"&&state.planDetailOpen));
  setHidden("header-pdf",!(state.view==="plans"&&state.planDetailOpen));
  renderPlanView();renderDrillLibrary();renderTeams();renderStats();
}
export function renderBankPicker() { renderBankSheet(); }
export function renderOnePlan() { renderPlanDetail(); }
export function renderOneTeam() { renderTeams(); }
export function renderEquipment() { renderEquipmentSheet(); }
export function renderEditorTags(selected=[]) {
  $("edit-skill").innerHTML=SKILLS.map(s=>`<option value="${esc(s)}">${esc(s)}</option>`).join("");
  $("edit-tags").innerHTML=SKILLS.map(s=>`<label class="tag-option"><input type="checkbox" value="${esc(s)}" ${selected.includes(s)?"checked":""}><span>${esc(s)}</span></label>`).join("");
}
export function renderEditorEquipment(items=[]) {
  $("edit-equipment-rows").innerHTML=items.map((item,i)=>`<div class="edit-equipment-row">
    <input class="equipment-name-input" data-eq-field="name" value="${esc(item.name)}" list="equipment-suggestions" placeholder="Equipment" aria-label="Equipment name">
    <input class="equipment-quantity-input" data-eq-field="quantity" type="number" min="1" max="999" inputmode="numeric" value="${item.quantity||1}" aria-label="Quantity">
    <label class="per-player-toggle"><input type="checkbox" data-eq-field="perPlayer" ${item.perPlayer?"checked":""}> / player</label>
    <button class="mini-icon danger-text" type="button" data-remove-eq-row="${i}" aria-label="Remove equipment">×</button>
  </div>`).join("")+`<datalist id="equipment-suggestions"><option value="Basketballs"><option value="Cones"><option value="Pinnies"><option value="Whistles"><option value="Stopwatches"><option value="Clipboards"><option value="Floor tape"><option value="Hurdles"><option value="Resistance bands"><option value="First-aid kits"></datalist>`;
}
export function renderEditorSteps(steps=[]) {
  const values=steps.length?steps:[""];
  $("edit-steps").innerHTML=values.map((step,i)=>`<div class="edit-step-row"><span>${i+1}</span><textarea data-step-index="${i}" rows="2" maxlength="1600" placeholder="Instruction or coaching cue">${esc(step)}</textarea><button class="mini-icon danger-text" type="button" data-remove-step="${i}" aria-label="Remove step">×</button></div>`).join("");
}
export function renderStationEditor(block) {
  $("station-name").value=block.name;
  $("station-lanes-editor").innerHTML=block.lanes.map((lane,i)=>`<div class="station-lane-edit"><input data-lane-name="${esc(lane.id)}" value="${esc(lane.name)}" maxlength="50" aria-label="Lane name"><span>${lane.drills.length} drills</span><button class="mini-icon danger-text" data-remove-lane="${esc(lane.id)}" type="button" aria-label="Remove lane">×</button></div>`).join("");
}
