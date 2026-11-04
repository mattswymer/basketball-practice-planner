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
function skillLabels(tags=[]) {return tags.map(tag=>`<span class="skill-chip" title="${esc(tag)}" style="--chip:${skillColor(tag)}">${esc(tag)}</span>`).join("");}
function equipmentText(drill) {
  const players=Math.max(1,activeTeam()?.players?.length||0);
  return (drill.equipment||[]).map(item=>`${item.name} × ${item.quantity*(item.perPlayer?players:1)}${item.perPlayer?" / player":""}`).join(" · ");
}
function renderPlanCard(plan) {
  const drills=flattenDrills(plan);
  const mins=totalPracticeMinutes(plan),skills=[...new Set(drills.flatMap(d=>d.tags))].slice(0,5);
  const date=plan.date?new Date(plan.date+"T12:00:00").toLocaleDateString(undefined,{month:"short",day:"numeric"}):"No date";
  return `<article class="plan-card" data-open-plan="${esc(plan.id)}">
    <div class="plan-card-top"><span class="plan-date">${esc(date)}</span><button class="mini-icon danger-text" data-delete-plan="${esc(plan.id)}" aria-label="Delete plan">×</button></div>
    <h3>${esc(plan.name)}</h3>
    <div class="plan-card-meta"><span>${durationLabel(mins)} planned</span><span>${drills.length} drills</span></div>
    <div class="plan-color-row">${skills.map(s=>`<i style="background:${skillColor(s)}" title="${esc(s)}"></i>`).join("")}</div>
  </article>`;
}
function renderPlansList() {
  $("plans-team-select").innerHTML=state.teams.map(t=>`<option value="${esc(t.id)}" ${t.id===state.activeTeamId?"selected":""}>${esc(t.name)}</option>`).join("");
  const list=plansForTeam();
  $("plans-list").innerHTML=list.map(renderPlanCard).join("")||'<div class="empty-state">No plans yet.</div>';
}
function details(drill) {
  const gear=equipmentText(drill),players=activeTeam()?.players||[];
  const groups=(drill.grouping?.groups||[]).filter(group=>group.playerIds?.length).map(group=>{const names=players.filter(player=>group.playerIds.includes(player.id)).map(player=>player.name);return group.name+(names.length?": "+names.join(", "):"");});
  return `<div class="live-drill-details">
    ${(drill.tags||[]).length?`<div class="live-skills"><strong>Skills</strong><span>${skillLabels(drill.tags)}</span></div>`:""}
    ${gear?`<div class="live-equipment"><strong>Equipment</strong><span>${esc(gear)}</span></div>`:""}
    ${groups.length?`<div class="live-player-groups"><strong>Player groups</strong><span>${groups.map(esc).join(" · ")}</span></div>`:""}
    ${drill.notes?`<div class="drill-notes"><strong>Notes / focus</strong><span>${esc(drill.notes)}</span></div>`:""}
    ${drill.steps?.length?`<ol class="live-steps">${drill.steps.map(s=>`<li>${esc(s)}</li>`).join("")}</ol>`:'<p class="no-steps">No instructions yet.</p>'}
  </div>`;
}
function renderDrillCard(drill,{stationId=null,stationLive=false,timeRange=""}={}) {
  const plan=activePlan(),current=state.live.active&&state.live.planId===plan?.id&&(state.live.currentDrillIds||[]).includes(drill.id);
  const expanded=current||stationLive;
  return `<article class="drill-card ${current?"current-popout":""}" data-drill-card="${esc(drill.id)}" data-parent-station="${esc(stationId||"")}" style="${skillStyle(drill.tags)}">
    <button class="drill-card-main" data-edit-plan-drill="${esc(drill.id)}">
      <span class="drill-name">${esc(drill.name)}</span>
      <span class="drill-subline"><b>${drill.minutes} min</b> ${timeRange?"<span>"+esc(timeRange)+"</span>":""} ${skillLabels(drill.tags)}</span>
    </button>
    <div class="drill-card-actions">
      <button class="mini-icon group-open" data-open-drill-groups="${esc(drill.id)}" aria-label="Assign players" title="Player groups"><svg viewBox="0 0 24 24" aria-hidden="true"><circle cx="9" cy="8" r="3"/><path d="M3 20v-2a6 6 0 0 1 12 0v2M16 5a3 3 0 0 1 0 6M18 15a5 5 0 0 1 3 5"/></svg></button>
      ${stationId?`<button class="mini-icon" data-move-to-plan="${esc(drill.id)}" aria-label="Move to main plan">↗</button>`:""}
      <button class="mini-icon danger-text" data-remove-drill="${esc(drill.id)}" aria-label="Remove drill">×</button>
    </div>
    ${expanded?details(drill):""}
  </article>`;
}
function renderStation(block,start,end,plan,offset) {
 const live=state.live.active&&state.live.planId===plan.id&&state.live.currentBlockId===block.id;
 const stations=(block.stations||[]).map((station,index)=>{let elapsed=0;const drills=station.drills.map(drill=>{const from=elapsed;elapsed+=drill.minutes;return renderDrillCard(drill,{stationId:station.id,timeRange:clockLabel(plan.start,offset+from)+"–"+clockLabel(plan.start,offset+elapsed)});}).join("");
  return `<section class="station-lane" data-station-id="${esc(station.id)}" data-drop-station="${esc(station.id)}" data-parent-rotation="${esc(block.id)}" style="${skillStyle(station.drills.flatMap(d=>d.tags||[]))}"><div class="lane-heading"><span class="drag-handle station-grip" data-drag-kind="station" data-drag-id="${esc(station.id)}" data-rotation-id="${esc(block.id)}" aria-label="Hold and drag station">${grip}</span><strong>${esc(station.name||"Station "+(index+1))}</strong><small>${durationLabel(elapsed)}</small><button class="mini-icon danger-text" data-remove-station="${esc(block.id)}" data-station-id="${esc(station.id)}" aria-label="Remove station">×</button></div><div class="station-drills">${drills||'<div class="lane-empty">No drills yet.</div>'}</div><button class="lane-add" data-add-to-station="${esc(station.id)}">+ Add drill</button></section>`;
 }).join("");
 return `<section class="station-block ${live?"current-popout":""}" data-block-id="${esc(block.id)}" data-drop-block="${esc(block.id)}"><div class="station-heading"><span class="drag-handle block-grip" data-drag-kind="block" data-drag-id="${esc(block.id)}" aria-label="Hold and drag station rotation">${grip}</span><button class="station-title" data-edit-station="${esc(block.id)}"><span class="station-label">STATION ROTATION</span><strong>${esc(block.name)}</strong><small>${start} – ${end} · ${block.minutes} min</small></button><button class="mini-icon" data-edit-station="${esc(block.id)}" aria-label="Edit station rotation">···</button><button class="mini-icon danger-text" data-delete-block="${esc(block.id)}" aria-label="Delete station rotation">×</button></div><div class="station-lanes">${stations}</div><button class="lane-add add-lane-inline" data-add-lane-inline="${esc(block.id)}">+ Station</button></section>`;
}
function renderPlanBlocks(plan) {
  let elapsed=0;
  return plan.blocks.map(block=>{
    const offset=elapsed,start=clockLabel(plan.start,offset),mins=blockMinutes(block),end=clockLabel(plan.start,offset+mins);elapsed+=mins;
    if(block.kind==="station")return renderStation(block,start,end,plan,offset);
    return `<div class="plan-block-wrap" data-block-id="${esc(block.id)}" data-drop-block="${esc(block.id)}">
      <div class="plan-time"><strong>${start}</strong><span>to ${end}</span><small>${mins}m</small></div>
      <div class="root-drill-wrap">${renderDrillCard(block)}</div>
    </div>`;
  }).join("")||'<div class="empty-state">Your plan is empty. Add a drill to begin.</div>';
}
function renderPlanDetail() {
  const plan=activePlan();if(!plan)return;
  $("plan-name").value=plan.name;$("plan-date").value=plan.date;$("plan-start").value=plan.start;$("plan-end").value=plan.end;
  const drills=flattenDrills(plan);
  $("plan-drill-count").textContent=drills.length;
  $("plan-total-time").textContent=durationLabel(totalPracticeMinutes(plan));
  
  $("plan-blocks").innerHTML=renderPlanBlocks(plan);renderPracticeBankPanel();
  const live=state.live.active&&state.live.planId===plan.id;
  document.body.classList.toggle("live-active",live);
  $("live-bar").hidden=!live;$("live-start").hidden=live;
  if(live) {
    const index=state.live.currentEventIndex||0,total=state.live.totalEvents||1;
    $("live-position").textContent=(index+1)+" / "+total;
    $("live-previous").disabled=index<=0;
    $("live-next").textContent=index===total-1?"Finish →":"Next →";
  }
  const windowM=practiceWindow(plan),planned=totalPracticeMinutes(plan),over=planned-windowM;
  $("fit-practice").textContent="Adjust to practice length";$("fit-practice").disabled=planned===windowM;
  const warning=$("practice-time-warning");warning.hidden=planned===windowM;warning.textContent=over>0?`Over practice time by ${durationLabel(over)} · ${durationLabel(planned)} planned for a ${durationLabel(windowM)} window.`:`${durationLabel(windowM-planned)} available · ${durationLabel(planned)} planned.`;
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
function drillCardForBank(drill,pick=false) { const action=pick?`data-add-bank-drill="${esc(drill.id)}"`:`data-edit-bank-drill="${esc(drill.id)}"`; return `<article class="library-card" data-library-card="${esc(drill.id)}" style="${skillStyle(drill.tags)}"><button class="library-main" ${action}><strong>${esc(drill.name)}</strong><small>${drill.minutes} min · ${skillLabels(drill.tags)}</small></button>${pick?`<button class="mini-icon bank-edit" data-edit-bank-drill="${esc(drill.id)}" aria-label="Edit ${esc(drill.name)}" title="Edit drill">✎</button>`:""}</article>`; }
export function renderPracticeBankPanel(){renderTagFilters("practice-bank-tag-options","practice-bank-filter-summary");const list=filteredBank("practice-bank-search","practice-bank-tag-options","practice-bank-sort");$("practice-bank-list").innerHTML=list.map(d=>drillCardForBank(d)).join("")||'<div class="empty-state">No drills found.</div>';}
function filteredBank(searchId,filterId,sortId) {
  const q=$(searchId)?.value?.trim().toLowerCase()||"",selected=[...($(filterId)?.querySelectorAll("input:checked")||[])].map(x=>x.value),sort=$(sortId)?.value||"name";
  const list=state.drillBank.filter(d=>selected.every(t=>(d.tags||[]).includes(t))&&(!q||(d.name+" "+(d.tags||[]).join(" ")+" "+(d.steps||[]).join(" ")+" "+(d.notes||"")+" "+(d.equipment||[]).map(x=>x.name).join(" ")).toLowerCase().includes(q)));
  const players=d=>(d.equipment||[]).filter(x=>x.perPlayer).reduce((n,x)=>n+x.quantity,0);
  return list.sort((a,b)=>sort==="name-desc"?b.name.localeCompare(a.name):sort==="time-asc"?a.minutes-b.minutes:sort==="time-desc"?b.minutes-a.minutes:a.name.localeCompare(b.name));
}
function fillSkillSelect(id,all=false) {
  const element=$(id);if(!element)return;
  const old=element.value;
  element.innerHTML=(all?'<option value="">All skills</option>':"")+SKILLS.map(s=>`<option value="${esc(s)}">${esc(s)}</option>`).join("");
  if([...element.options].some(x=>x.value===old))element.value=old;
}
function renderTagFilters(id,summaryId) {
  const selected=[...($(id)?.querySelectorAll("input:checked")||[])].map(x=>x.value);
  $(id).innerHTML=SKILLS.map(s=>`<label><input type="checkbox" value="${esc(s)}" ${selected.includes(s)?"checked":""}><span>${esc(s)}</span></label>`).join("");
  $(summaryId).textContent=selected.length?selected.length+" skills selected":"All skills";
}
function renderDrillLibrary() {
  renderTagFilters("drill-tag-options","drill-filter-summary");
  const list=filteredBank("drill-search","drill-tag-options","drill-sort");
  $("drill-count").textContent=list.length+" / "+state.drillBank.length;
  $("drill-library").innerHTML=list.map(d=>drillCardForBank(d)).join("")||'<div class="empty-state">No drills found.</div>';
}
function renderBankSheet() {
  renderTagFilters("bank-tag-options","bank-filter-summary");
  const list=filteredBank("bank-search","bank-tag-options","bank-sort");
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
function skillTime(minutes){return (Math.round(minutes*10)/10)+"m";}
function renderStats() {
  const team=state.teams.find(t=>t.id===state.statsTeamId)||activeTeam();
  $("stats-team-select").innerHTML=state.teams.map(t=>`<option value="${esc(t.id)}" ${t.id===team?.id?"selected":""}>${esc(t.name)}</option>`).join("");
  const from=$("stats-from").value,to=$("stats-to").value;
  const plans=plansForTeam(team?.id).filter(plan=>(!from||plan.date>=from)&&(!to||plan.date<=to));
  const skills=new Map();let planned=0;
  for(const plan of plans){planned+=totalPracticeMinutes(plan);for(const drill of flattenDrills(plan)){
    const tags=[...new Set(drill.tags||[])];if(!tags.length)continue;
    const base=Math.floor(drill.minutes/tags.length),extra=drill.minutes%tags.length;
    tags.forEach((skill,index)=>{const row=skills.get(skill)||{planned:0};row.planned+=base+(index<extra?1:0);skills.set(skill,row);});
  }}
  $("stats-plan-count").textContent=plans.length;$("stats-planned-total").textContent=durationLabel(planned);$("stats-team-label").textContent=team?.name||"";
  const max=Math.max(1,...[...skills.values()].map(x=>x.planned));
  $("skill-stats").innerHTML=[...skills.entries()].sort((a,b)=>b[1].planned-a[1].planned).map(([skill,v])=>`<div class="skill-stat-row"><div class="skill-stat-label"><span class="skill-dot" style="background:${skillColor(skill)}"></span><strong>${esc(skill)}</strong><span>${skillTime(v.planned)} planned</span></div><div class="stat-track"><i style="width:${Math.max(1,Math.round(v.planned/max*100))}%;background:${skillColor(skill)}"></i></div></div>`).join("")||'<div class="empty-state">Add skills to drills to see skill stats.</div>';
  $("stats-history").innerHTML=plans.slice().sort((a,b)=>(b.date||"").localeCompare(a.date||"")).map(plan=>`<div class="history-row"><span><strong>${esc(plan.name)}</strong><small>${esc(plan.date||"No date")}</small></span><b>${durationLabel(totalPracticeMinutes(plan))}</b><small>${flattenDrills(plan).length} drills</small></div>`).join("")||'<div class="empty-state">No practice plans yet.</div>';
}
export function renderEquipmentSheet() {
  const plan=activePlan();if(!plan)return;
  const list=equipmentTotals(plan);
  $("equipment-checklist").innerHTML=list.length?list.map(item=>`<div class="equipment-check-row"><span class="equipment-check-name"><strong>${esc(item.name)}</strong><small>${esc([...new Set(item.uses)].join(", "))}</small></span><b>× ${item.quantity}</b></div>`).join(""):'<div class="empty-state">No equipment assigned.</div>';
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
  $("skill-list").innerHTML=[...SKILLS].sort((a,b)=>a.localeCompare(b)).map(skill=>`<div class="skill-edit-row">
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
  const summary=$("edit-skill-summary");if(summary)summary.textContent=selected.length?selected.length+" skills selected":"All skills";
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
  $("edit-steps").innerHTML=values.map((step,i)=>`<div class="edit-step-row" draggable="true" data-step-row="${i}"><span class="step-grip" title="Drag to reorder">⠿</span><textarea data-step-index="${i}" rows="2" maxlength="1600" placeholder="Instruction or coaching cue">${esc(step)}</textarea><button class="mini-icon danger-text" type="button" data-remove-step="${i}" aria-label="Remove step">×</button></div>`).join("");
}
export function renderStationEditor(block) {$("station-name").value=block.name;$("station-minutes").value=block.minutes||15;$("station-lanes-editor").innerHTML=block.stations.map((station,index)=>`<section class="station-editor-card"><div class="station-lane-edit"><input data-station-name="${esc(station.id)}" value="${esc(station.name)}" maxlength="50" aria-label="Station name"><span>${station.drills.length} drills</span><button class="mini-icon danger-text" data-remove-lane="${esc(station.id)}" type="button" aria-label="Remove station">×</button></div></section>`).join("");}
