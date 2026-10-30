"use strict";
const $=id=>document.getElementById(id),clone=x=>JSON.parse(JSON.stringify(x));
const K={teams:"cyb_teams_v1",active:"cyb_active_team_v1",oldBank:"cyb_drill_bank_v1",bank:"cyb_drill_bank_v2",oldSchedule:"cyb_active_schedule_v1",schedules:"cyb_team_schedules_v2",meta:"cyb_practice_meta_v2",equipment:"cyb_equipment_catalog_v1"};
const DEFAULT_EQUIPMENT=["Basketballs","Cones","Jerseys / pinnies","Whistle","Stopwatch","Clipboards","Floor tape","Hurdles","Resistance bands","First-aid kit"];
let state={teams:[],activeTeamId:null,drillBank:[],schedulesByTeam:{},schedule:[],practice:{date:"",start:"18:00",end:"19:30"},equipmentCatalog:[],live:{active:false,paused:false,completed:false,currentId:null,endAt:null,remainingSec:0,intervalId:null}};
let undoStack=[],editing=null,stationId=null,stationDraft=[],equipmentDraft=[],grouping={assignments:[],count:2},dragging=null,draggingBankId=null,draggingPlayer=null,toastTimer=null;
function readJSON(k,f){try{const x=localStorage.getItem(k);return x===null?f:JSON.parse(x)}catch(e){console.warn("Could not read saved data:",k,e);return f}}
function uid(p){return (p||"id")+"-"+Date.now().toString(36)+"-"+Math.random().toString(36).slice(2,8)}
function esc(s){return String(s==null?"":s).replace(/[&<>"']/g,c=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"}[c]))}
function localDate(){const d=new Date();return d.getFullYear()+"-"+String(d.getMonth()+1).padStart(2,"0")+"-"+String(d.getDate()).padStart(2,"0")}
function team(){return state.teams.find(x=>x.id===state.activeTeamId)||state.teams[0]||null}
function normalizeEquipmentItems(a){return Array.isArray(a)?a.filter(x=>x&&typeof x==="object").map(x=>({optionId:String(x.optionId||x.id||""),quantity:Math.max(1,Math.round(Number(x.quantity)||1))})).filter(x=>x.optionId):[]}
function normalizeTags(a){return Array.isArray(a)?[...new Set(a.filter(t=>DEFAULT_TAGS.includes(t)))]:[]}
function normalizeBank(x,i){x=x||{};return {id:x.id||uid("drill"+i),name:String(x.name||"Untitled drill"),duration:Math.max(1,Math.min(240,Math.round(Number(x.duration)||10))),equipment:String(x.equipment||""),equipmentItems:normalizeEquipmentItems(x.equipmentItems),notes:String(x.notes||""),tags:normalizeTags(x.tags),source:x.source||"custom"}}
function normalizeScheduled(x){
 x=x||{};
 if(x.type==="station")return {type:"station",schedId:x.schedId||x.id||uid("schedule"),name:String(x.name||"Station rotation"),duration:Math.max(1,Math.min(240,Math.round(Number(x.duration)||15))),stations:(Array.isArray(x.stations)?x.stations:[]).map((s,i)=>({id:s.id||uid("station"),label:s.label||"Station "+(i+1),drillId:s.drillId||"",name:s.name||"Choose a drill",equipment:String(s.equipment||""),equipmentItems:normalizeEquipmentItems(s.equipmentItems),notes:String(s.notes||""),tags:normalizeTags(s.tags)}))};
 return {type:"activity",schedId:x.schedId||x.id||uid("schedule"),bankId:x.bankId||x.id||"",name:String(x.name||"Untitled activity"),duration:Math.max(1,Math.min(240,Math.round(Number(x.duration)||10))),equipment:String(x.equipment||""),equipmentItems:normalizeEquipmentItems(x.equipmentItems),notes:String(x.notes||""),tags:normalizeTags(x.tags)};
}
function loadData(){
 const defaults=[{id:"t1",name:"CYB Indian Knoll 3B-2",roster:[]},{id:"t2",name:"CYB 1B-2 Team",roster:[]}],teams=readJSON(K.teams,defaults);
 state.teams=Array.isArray(teams)?teams.filter(Boolean).map((t,i)=>({id:t.id||uid("team"+i),name:String(t.name||"Team "+(i+1)),roster:Array.isArray(t.roster)?t.roster.map(String):[]})):clone(defaults);
 if(!state.teams.length)state.teams=clone(defaults);
 const active=localStorage.getItem(K.active);state.activeTeamId=state.teams.some(t=>t.id===active)?active:state.teams[0].id;
 const base=PRESET_DRILLS.map(normalizeBank),savedBank=readJSON(K.bank,readJSON(K.oldBank,null));
 const savedItems=Array.isArray(savedBank)?savedBank:[];
 const merged=base.map(seed=>{
  const prior=savedItems.find(x=>x&&((x.id&&x.id===seed.id)||((x.name||"").toLowerCase()===seed.name.toLowerCase()&&x.source!=="custom")));
  if(!prior)return seed;
  const old=normalizeBank(prior,0);
  return {...seed,...old,id:seed.id,source:seed.source,equipmentItems:old.equipmentItems.length?old.equipmentItems:seed.equipmentItems};
 });
 const names=new Set(base.map(x=>x.name.toLowerCase()));
 const custom=savedItems.map(normalizeBank).filter(x=>x.source==="custom"&&!names.has(x.name.toLowerCase()));
 state.drillBank=merged.concat(custom);
 const saved=readJSON(K.schedules,{});state.schedulesByTeam={};
 if(saved&&typeof saved==="object"&&!Array.isArray(saved))Object.keys(saved).forEach(id=>{const a=Array.isArray(saved[id])?saved[id]:saved[id]?.schedule;if(Array.isArray(a))state.schedulesByTeam[id]=a.map(normalizeScheduled)});
 if(!Object.prototype.hasOwnProperty.call(state.schedulesByTeam,state.activeTeamId)){const old=readJSON(K.oldSchedule,null);state.schedulesByTeam[state.activeTeamId]=Array.isArray(old)?old.map(normalizeScheduled):[]}
 state.schedule=clone(state.schedulesByTeam[state.activeTeamId]||[]);
 const meta=readJSON(K.meta,{});state.practice={date:meta.date||localDate(),start:meta.start||meta.startTime||"18:00",end:meta.end||meta.endTime||"19:30"};
 const savedEquipment=readJSON(K.equipment,null);
 state.equipmentCatalog=Array.isArray(savedEquipment)?savedEquipment.map(x=>({id:x.id||uid("equip"),name:String(x.name||"").trim()})).filter(x=>x.name):DEFAULT_EQUIPMENT.map(name=>({id:uid("equip"),name}));
 const migrateEquipment=x=>{if(x&&!x.equipmentItems?.length&&x.equipment)x.equipmentItems=parseLegacyEquipment(x.equipment)};
 state.drillBank.forEach(migrateEquipment);state.schedule.forEach(x=>x.type==="station"?x.stations.forEach(migrateEquipment):migrateEquipment(x));
 Object.values(state.schedulesByTeam).forEach(list=>list.forEach(x=>x.type==="station"?x.stations.forEach(migrateEquipment):migrateEquipment(x)));
 $("practice-date").value=state.practice.date;$("practice-start-time").value=state.practice.start;$("practice-end-time").value=state.practice.end;saveData();
}
function saveData(){
 try{
  if(state.activeTeamId)state.schedulesByTeam[state.activeTeamId]=clone(state.schedule);
  localStorage.setItem(K.teams,JSON.stringify(state.teams));localStorage.setItem(K.active,state.activeTeamId||"");
  localStorage.setItem(K.bank,JSON.stringify(state.drillBank));localStorage.setItem(K.schedules,JSON.stringify(state.schedulesByTeam));
  localStorage.setItem(K.meta,JSON.stringify(state.practice));localStorage.setItem(K.equipment,JSON.stringify(state.equipmentCatalog));
  $("save-status").textContent="Saved";
 }catch(e){console.error(e);$("save-status").textContent="Save unavailable · Backup";toast("Browser storage failed. Download a backup.")}
}
function remember(){undoStack.push({teams:clone(state.teams),activeTeamId:state.activeTeamId,bank:clone(state.drillBank),schedule:clone(state.schedule),schedules:clone(state.schedulesByTeam),equipment:clone(state.equipmentCatalog)});if(undoStack.length>35)undoStack.shift();$("btn-undo").disabled=false}
function undo(){const x=undoStack.pop();if(!x)return;resetLive();state.teams=x.teams;state.activeTeamId=x.activeTeamId;state.drillBank=x.bank;state.schedule=x.schedule;state.schedulesByTeam=x.schedules;state.equipmentCatalog=x.equipment;$("btn-undo").disabled=!undoStack.length;saveData();renderAll();toast("Last change undone.")}
function toast(s){$("toast").textContent=s;clearTimeout(toastTimer);toastTimer=setTimeout(()=>$("toast").textContent="",4500)}
function colour(t){return TAG_COLORS[t]||"#788894"}
function skillTags(tags){return (tags||[]).map(t=>`<span class="skill-tag">${esc(t)}</span>`).join("")}
function equipmentOption(id){return state.equipmentCatalog.find(x=>x.id===id)||null}
function parseLegacyEquipment(text){
 const source=String(text||"").toLowerCase(),result=[];
 const idFor=name=>state.equipmentCatalog.find(x=>x.name.toLowerCase()===name.toLowerCase())?.id;
 const countFrom=word=>({one:1,two:2,three:3,four:4,five:5,six:6,seven:7,eight:8,nine:9,ten:10}[String(word).toLowerCase()]||Number(word)||1);
 const balls=source.match(/\b(one|two|three|four|five|six|\d+)\s+balls?\b/i);
 if(/\bballs?\b/i.test(source)){const id=idFor("Basketballs");if(id)result.push({optionId:id,quantity:balls?countFrom(balls[1]):1})}
 const coneMatches=[...source.matchAll(/\b(one|two|three|four|five|six|\d+)\s+cones?\b/gi)];
 if(coneMatches.length){const id=idFor("Cones");if(id)result.push({optionId:id,quantity:coneMatches.reduce((sum,x)=>sum+countFrom(x[1]),0)})}
 else if(/\bcones?\b/i.test(source)){const id=idFor("Cones");if(id)result.push({optionId:id,quantity:(source.match(/\bcones?\b/gi)||[]).length})}
 if(/\b(jerseys?|pinnies)\b/i.test(source)){const id=idFor("Jerseys / pinnies");if(id)result.push({optionId:id,quantity:1})}
 return result;
}
function equipmentText(item){const list=normalizeEquipmentItems(item.equipmentItems).map(x=>{const op=equipmentOption(x.optionId);return op?op.name+" × "+x.quantity:null}).filter(Boolean);return list.length?list.join(", "):(item.equipment||"")}
function renderTeams(){
 $("active-team-select").innerHTML=state.teams.map(t=>`<option value="${esc(t.id)}">${esc(t.name)}</option>`).join("");$("active-team-select").value=state.activeTeamId;
 $("roster-team-select").innerHTML=state.teams.map(t=>`<option value="${esc(t.id)}">${esc(t.name)}</option>`).join("");
 $("team-count-label").textContent=state.teams.length+" team"+(state.teams.length===1?"":"s");$("btn-delete-team").disabled=state.teams.length<=1;
}
function renderTagFilter(){const v=$("bank-tag-filter").value;$("bank-tag-filter").innerHTML='<option value="">All skills</option>'+DEFAULT_TAGS.map(t=>`<option value="${esc(t)}">${esc(t)}</option>`).join("");if(DEFAULT_TAGS.includes(v))$("bank-tag-filter").value=v}
function renderBank(){
 const q=$("bank-search").value.trim().toLowerCase(),tag=$("bank-tag-filter").value,sort=$("bank-sort").value;
 const a=state.drillBank.filter(x=>(x.name+" "+x.equipment+" "+equipmentText(x)+" "+x.notes+" "+x.tags.join(" ")).toLowerCase().includes(q)&&(!tag||x.tags.includes(tag)));
 a.sort((x,y)=>sort==="time"?x.duration-y.duration||x.name.localeCompare(y.name):sort==="time-desc"?y.duration-x.duration||x.name.localeCompare(y.name):x.name.localeCompare(y.name));
 $("bank-count").textContent=a.length+" of "+state.drillBank.length+" drills";
 $("bank-list").innerHTML=a.length?a.map(x=>`<article class="bank-item" data-bank-item="${esc(x.id)}" draggable="true" style="--tag:${colour(x.tags[0])}"><button class="bank-title" data-bank-edit="${esc(x.id)}" type="button">${esc(x.name)}</button><span class="bank-duration">${x.duration} min</span><div class="bank-meta">${skillTags(x.tags)}</div><button type="button" class="bank-plus" data-add-drill="${esc(x.id)}" aria-label="Add ${esc(x.name)}">+</button></article>`).join(""):'<div class="empty-state">No drills match those filters.</div>';
}
function minutesWindow(){const a=($("practice-start-time").value||"18:00").split(":").map(Number),b=($("practice-end-time").value||"19:30").split(":").map(Number);let n=b[0]*60+b[1]-(a[0]*60+a[1]);if(n<=0)n+=1440;return n}
function formatClock(n){n=Math.max(0,Math.round(n));const d=Math.floor(n/1440),h=Math.floor(n/60)%24,m=n%60;return (h%12||12)+":"+String(m).padStart(2,"0")+(h>=12?" PM":" AM")+(d?" +"+d+"d":"")}
function timing(){const [h,m]=($("practice-start-time").value||"18:00").split(":").map(Number);let p=h*60+m;return state.schedule.map(x=>{const start=p,end=p+x.duration;p=end;return {start,end}})}
function renderTimeSummary(){
 const planned=state.schedule.reduce((n,x)=>n+x.duration,0),avail=minutesWindow(),d=avail-planned,el=$("allotted-summary");el.classList.remove("over","good");
 $("allotted-window").textContent="Allotted time: "+avail+" minutes";$("allotted-planned").textContent="Planned: "+planned+" minutes";
 if(!state.schedule.length){$("allotted-remaining").textContent="Add activities";return}
 if(d<0){el.classList.add("over");$("allotted-remaining").textContent=Math.abs(d)+" minutes over"}
 else{el.classList.add("good");$("allotted-remaining").textContent=d===0?"Fits exactly":d+" minutes unplanned"}
}
function isCurrent(x){return (state.live.active||state.live.paused)&&state.live.currentId===x.schedId}
function renderActivity(x,i,t){
 const equip=equipmentText(x);
 return `<article class="schedule-card ${isCurrent(x)?"current-activity":""}" data-schedule-id="${esc(x.schedId)}" draggable="true" style="--tag:${colour(x.tags[0])}">
 <div class="schedule-card-header"><div class="time-block"><strong>${formatClock(t.start)} – ${formatClock(t.end)}</strong><span>${x.duration} min allotted</span></div>
 <div class="drill-details"><button type="button" class="scheduled-name" data-edit-activity="${esc(x.schedId)}">${esc(x.name)}</button><div class="drill-sub">${skillTags(x.tags)}</div></div>
 <div class="card-actions"><button class="btn" data-move-index="${i}" data-direction="-1" ${i===0?"disabled":""} aria-label="Move up">↑</button><button class="btn" data-move-index="${i}" data-direction="1" ${i===state.schedule.length-1?"disabled":""} aria-label="Move down">↓</button><button class="btn remove" data-delete-schedule="${esc(x.schedId)}" aria-label="Remove">×</button></div></div>
 ${equip?`<div class="equipment-inline">Equipment: ${esc(equip)}</div>`:""}${x.notes?`<div class="drill-instructions">${esc(x.notes)}</div>`:""}
 </article>`;
}
function renderStation(x,i,t){
 const stations=(x.stations||[]).map((s,j)=>`<article class="station-card" data-station-drop="${esc(x.schedId)}" data-station-id="${esc(s.id)}"><button type="button" class="remove-station-drill" data-remove-station-drill="${esc(x.schedId)}" data-station-id="${esc(s.id)}" aria-label="Remove station">×</button><h4>${esc(s.label||"Station "+(j+1))}: ${esc(s.name||"Choose a drill")}</h4>${skillTags(s.tags)}${s.notes?`<p>${esc(s.notes)}</p>`:""}${equipmentText(s)?`<div class="station-equipment">Equipment: ${esc(equipmentText(s))}</div>`:""}<select data-station-replace="${esc(x.schedId)}" data-station-id="${esc(s.id)}" aria-label="Change station drill"><option value="">Choose a drill…</option>${state.drillBank.map(d=>`<option value="${esc(d.id)}" ${d.id===s.drillId?"selected":""}>${esc(d.name)}</option>`).join("")}</select></article>`).join("");
 return `<section class="station-block ${isCurrent(x)?"current-activity":""}" data-schedule-id="${esc(x.schedId)}" draggable="true"><div class="station-block-header"><div><div class="station-label">Station rotation · concurrent</div><button type="button" class="station-block-title" data-edit-station="${esc(x.schedId)}">${esc(x.name)}</button></div><span class="station-time">${formatClock(t.start)} – ${formatClock(t.end)} · ${x.duration} min allotted</span><div class="station-actions"><button class="btn btn-small" data-move-index="${i}" data-direction="-1" ${i===0?"disabled":""}>↑</button><button class="btn btn-small" data-move-index="${i}" data-direction="1" ${i===state.schedule.length-1?"disabled":""}>↓</button><button class="btn btn-small" data-edit-station="${esc(x.schedId)}">Edit</button><button class="btn btn-small" data-delete-schedule="${esc(x.schedId)}">×</button></div></div><div class="station-grid">${stations}</div><button type="button" class="btn btn-small" data-add-station-slot="${esc(x.schedId)}">+ Add station</button></section>`;
}
function renderSchedule(){
 const times=timing();$("planner-team-name").textContent=team()?.name||"Practice schedule";
 $("schedule-list").innerHTML=state.schedule.length?state.schedule.map((x,i)=>x.type==="station"?renderStation(x,i,times[i]):renderActivity(x,i,times[i])).join(""):'<div class="empty-state">Add activities from the drill bank. Each scheduled item will show its allotted time.</div>';
 $("schedule-finish").textContent=times.length?"Scheduled finish: "+formatClock(times[times.length-1].end):"";
 renderTimeSummary();renderLiveControls();
}
function renderAll(){$("practice-date").value=state.practice.date;$("practice-start-time").value=state.practice.start;$("practice-end-time").value=state.practice.end;renderTeams();renderTagFilter();renderBank();renderSchedule()}
function bankItem(id){return state.drillBank.find(x=>x.id===id)||null}
function copyDrill(x){return {type:"activity",schedId:uid("scheduled"),bankId:x.id,name:x.name,duration:x.duration,equipment:x.equipment||"",equipmentItems:clone(x.equipmentItems||[]),notes:x.notes||"",tags:clone(x.tags||[])}}
function addDrill(id,index){const x=bankItem(id);if(!x)return;remember();const copy=copyDrill(x);state.schedule.splice(Number.isInteger(index)?Math.max(0,Math.min(index,state.schedule.length)):state.schedule.length,0,copy);saveData();renderSchedule();toast("Added "+x.name+".")}
function moveItem(i,d){const n=i+d;if(n<0||n>=state.schedule.length)return;remember();const [x]=state.schedule.splice(i,1);state.schedule.splice(n,0,x);saveData();renderSchedule()}
function deleteScheduledItem(id){const i=state.schedule.findIndex(x=>x.schedId===id);if(i<0)return;remember();state.schedule.splice(i,1);if(state.live.currentId===id){if(state.schedule.length)liveSet(Math.min(i,state.schedule.length-1));else resetLive()}saveData();renderSchedule()}
function fitPractice(){
 const target=minutesWindow(),list=state.schedule;if(!target||!list.length){toast("Set a valid practice window and add activities.");return}if(target<list.length){toast("Each scheduled block needs at least one minute.");return}
 remember();const w=list.map(x=>Math.max(1,x.duration)),sum=w.reduce((a,b)=>a+b,0),q=w.map(x=>target*x/sum),v=q.map(x=>Math.max(1,Math.floor(x)));let d=target-v.reduce((a,b)=>a+b,0);
 if(d>0){const order=q.map((x,i)=>({i,r:x-Math.floor(x)})).sort((a,b)=>b.r-a.r);let n=0;while(d>0){v[order[n++%order.length].i]++;d--}}
 else while(d<0){let best=-1,ex=-Infinity;v.forEach((x,i)=>{if(x>1&&x-q[i]>ex){best=i;ex=x-q[i]}});if(best<0)break;v[best]--;d++}
 list.forEach((x,i)=>x.duration=v[i]);if(state.live.active||state.live.paused)refreshLiveCurrent();saveData();renderSchedule();toast("Practice fitted to "+target+" minutes.");
}

function selectedTags(){return [...$("edit-item-tags").querySelectorAll("input:checked")].map(x=>x.value)}
function renderTagPicker(selected){$("edit-item-tags").innerHTML=DEFAULT_TAGS.map(t=>`<label class="tag-option"><input type="checkbox" value="${esc(t)}" ${selected.includes(t)?"checked":""}><span>${esc(t)}</span></label>`).join("")}
function equipmentDisplay(items){return (items||[]).map(x=>{const op=equipmentOption(x.optionId);return op?op.name+" × "+x.quantity:null}).filter(Boolean).join(", ")}
function openActivity(id,mode){
 const fresh=mode==="new",x=fresh?{id:uid("drill"),name:"",duration:10,equipment:"",equipmentItems:[],notes:"",tags:[],source:"custom"}:mode==="bank"?bankItem(id):state.schedule.find(y=>y.schedId===id);
 if(!x)return;if(x.type==="station"){toast("Use Edit rotation for station blocks.");return}
 editing={id:mode==="schedule"?x.schedId:x.id,mode};$("edit-dialog-title").textContent=fresh?"New drill":mode==="bank"?"Edit bank drill":"Edit scheduled drill";
 $("edit-item-id").value=editing.id;$("edit-item-mode").value=mode;$("edit-item-name").value=x.name||"";$("edit-item-duration").value=x.duration||10;$("edit-item-notes").value=x.notes||"";
 equipmentDraft=normalizeEquipmentItems(x.equipmentItems);$("edit-equipment-summary").textContent=equipmentDisplay(equipmentDraft)||"No equipment selected.";
 $("legacy-equipment-note").hidden=!(x.equipment&&!equipmentDraft.length);$("legacy-equipment-note").textContent=x.equipment&&!equipmentDraft.length?"Existing equipment note: "+x.equipment+" · Choose equipment to replace it.":"";
 renderTagPicker(x.tags||[]);$("btn-remove-bank").hidden=mode!=="bank";$("btn-remove-scheduled").hidden=mode!=="schedule";$("btn-update-bank-default").hidden=mode!=="schedule";$("dialog-edit-item").showModal();
}
function saveActivity(e){
 e.preventDefault();if(!editing)return;const name=$("edit-item-name").value.trim();if(!name){$("edit-item-name").focus();return}
 const eq=clone(equipmentDraft),data={name,duration:Math.max(1,Math.min(240,Math.round(Number($("edit-item-duration").value)||10))),equipment:equipmentDisplay(eq),equipmentItems:eq,notes:$("edit-item-notes").value,tags:selectedTags()};
 remember();
 if(editing.mode==="new")state.drillBank.push({id:editing.id,...data,source:"custom"});
 else if(editing.mode==="bank"){const x=bankItem(editing.id);if(x)Object.assign(x,data)}
 else{const x=state.schedule.find(y=>y.schedId===editing.id);if(x&&x.type==="activity"){Object.assign(x,data);if(state.live.currentId===x.schedId&&(state.live.active||state.live.paused))refreshLiveCurrent()}}
 saveData();renderAll();$("dialog-edit-item").close();editing=null;toast("Drill saved.");
}
function deleteBankDrill(){if(!editing||editing.mode!=="bank")return;const x=bankItem(editing.id);if(!x||!confirm("Delete "+x.name+" from the drill bank? Scheduled copies remain."))return;remember();state.drillBank=state.drillBank.filter(y=>y.id!==x.id);saveData();renderAll();$("dialog-edit-item").close();editing=null}
function updateBankDefault(){
 if(!editing||editing.mode!=="schedule")return;const x=state.schedule.find(y=>y.schedId===editing.id);if(!x||!confirm("Update the drill bank with this scheduled version?"))return;remember();
 const d=x.bankId?bankItem(x.bankId):state.drillBank.find(y=>y.name.toLowerCase()===x.name.toLowerCase()),data={name:x.name,duration:x.duration,equipment:x.equipment,equipmentItems:clone(x.equipmentItems),notes:x.notes,tags:clone(x.tags)};
 if(d)Object.assign(d,data);else{const n={id:uid("drill"),...data,source:"custom"};state.drillBank.push(n);x.bankId=n.id}
 saveData();renderAll();toast("Drill bank updated.");
}
function closeEdit(){$("dialog-edit-item").close();editing=null}

function equipmentOptionList(){
 const chosen=new Map(equipmentDraft.map(x=>[x.optionId,x.quantity]));
 $("equipment-picker-list").innerHTML=state.equipmentCatalog.map(x=>`<div class="equipment-picker-row"><input type="checkbox" data-equipment-check="${esc(x.id)}" ${chosen.has(x.id)?"checked":""}><strong>${esc(x.name)}</strong><input type="number" min="1" max="999" step="1" data-equipment-quantity="${esc(x.id)}" value="${chosen.get(x.id)||1}" aria-label="Quantity of ${esc(x.name)}" ${chosen.has(x.id)?"":"disabled"}></div>`).join("")||'<div class="empty-state">No equipment options yet.</div>';
}
function openEquipmentPicker(){equipmentOptionList();$("dialog-equipment-picker").showModal()}
function collectEquipment(){equipmentDraft=[...$("equipment-picker-list").querySelectorAll("[data-equipment-check]:checked")].map(x=>{const q=$("equipment-picker-list").querySelector('[data-equipment-quantity="'+x.dataset.equipmentCheck+'"]');return {optionId:x.dataset.equipmentCheck,quantity:Math.max(1,Math.min(999,Math.round(Number(q?.value)||1)))}})}
function updateEquipmentSummary(){$("edit-equipment-summary").textContent=equipmentDisplay(equipmentDraft)||"No equipment selected."}
function renderEquipmentCatalog(){$("equipment-catalog-list").innerHTML=state.equipmentCatalog.map(x=>`<div class="equipment-catalog-row"><input type="text" maxlength="80" value="${esc(x.name)}" data-edit-equipment-name="${esc(x.id)}" aria-label="Equipment name"><button class="btn btn-small" data-save-equipment-name="${esc(x.id)}">Save</button><button class="btn btn-small btn-danger" data-delete-equipment-option="${esc(x.id)}">×</button></div>`).join("")}
function openEquipmentCatalog(){renderEquipmentCatalog();$("dialog-equipment-catalog").showModal()}
function addEquipmentOption(){const name=$("new-equipment-name").value.trim();if(!name)return;if(state.equipmentCatalog.some(x=>x.name.toLowerCase()===name.toLowerCase())){toast("That item already exists.");return}state.equipmentCatalog.push({id:uid("equip"),name});$("new-equipment-name").value="";saveData();renderEquipmentCatalog();equipmentOptionList();toast("Equipment option added.")}
function saveEquipmentName(id){const input=$("equipment-catalog-list").querySelector('[data-edit-equipment-name="'+id+'"]');if(!input)return;const name=input.value.trim();if(!name)return;if(state.equipmentCatalog.some(x=>x.id!==id&&x.name.toLowerCase()===name.toLowerCase())){toast("That name already exists.");return}const x=equipmentOption(id);if(x)x.name=name;saveData();renderEquipmentCatalog();equipmentOptionList();renderAll();updateEquipmentSummary()}
function deleteEquipmentOption(id){const x=equipmentOption(id);if(!x||!confirm("Remove "+x.name+" from options and all drills using it?"))return;remember();state.equipmentCatalog=state.equipmentCatalog.filter(y=>y.id!==id);const clean=y=>{y.equipmentItems=(y.equipmentItems||[]).filter(z=>z.optionId!==id);y.equipment=equipmentDisplay(y.equipmentItems)};state.drillBank.forEach(clean);state.schedule.forEach(y=>y.type==="station"?y.stations.forEach(clean):clean(y));equipmentDraft=equipmentDraft.filter(y=>y.optionId!==id);saveData();renderEquipmentCatalog();equipmentOptionList();renderAll();updateEquipmentSummary()}

function stationSelectOptions(v){return '<option value="">Choose a drill…</option>'+state.drillBank.slice().sort((a,b)=>a.name.localeCompare(b.name)).map(x=>`<option value="${esc(x.id)}" ${x.id===v?"selected":""}>${esc(x.name)}</option>`).join("")}
function renderStationRows(){$("station-rows").innerHTML=stationDraft.map((x,i)=>`<div class="station-edit-row"><span class="station-number">${i+1}</span><select data-station-select="${i}" aria-label="Station ${i+1} activity">${stationSelectOptions(x.drillId)}</select><button type="button" data-remove-station-row="${i}" aria-label="Remove station">×</button></div>`).join("")}
function openStation(id){
 const old=id?state.schedule.find(x=>x.schedId===id&&x.type==="station"):null;stationId=old?old.schedId:null;
 $("station-dialog-title").textContent=old?"Edit station rotation":"New station rotation";$("station-id").value=stationId||"";$("station-name").value=old?old.name:"Station rotation";$("station-duration").value=old?old.duration:15;$("btn-delete-station").hidden=!old;
 stationDraft=old?clone(old.stations):[{id:uid("station"),label:"Station 1",drillId:""},{id:uid("station"),label:"Station 2",drillId:""}];renderStationRows();$("dialog-station").showModal();
}
function addStationRow(){stationDraft.push({id:uid("station"),label:"Station "+(stationDraft.length+1),drillId:""});renderStationRows()}
function stationFromDrill(id,label){const x=bankItem(id);return x?{id:uid("station"),label,drillId:x.id,name:x.name,equipment:x.equipment,equipmentItems:clone(x.equipmentItems||[]),notes:x.notes,tags:clone(x.tags)}:null}
function saveStation(e){
 e.preventDefault();const ids=[...$("station-rows").querySelectorAll("[data-station-select]")].map(x=>x.value).filter(Boolean);
 if(ids.length<2){toast("Choose at least two drills.");return}
 const stations=ids.map((id,i)=>stationFromDrill(id,"Station "+(i+1)));
 remember();const x={type:"station",schedId:stationId||uid("scheduled"),name:$("station-name").value.trim()||"Station rotation",duration:Math.max(1,Math.min(240,Math.round(Number($("station-duration").value)||15))),stations};
 if(stationId){const i=state.schedule.findIndex(y=>y.schedId===stationId);if(i>=0)state.schedule[i]=x;else state.schedule.push(x)}else state.schedule.push(x);
 if(state.live.currentId===x.schedId&&(state.live.active||state.live.paused))refreshLiveCurrent();
 saveData();renderSchedule();$("dialog-station").close();stationId=null;toast("Station rotation saved.");
}
function assignStationDrill(blockId,sId,drillId){
 const b=state.schedule.find(x=>x.schedId===blockId&&x.type==="station");if(!b)return;const i=b.stations.findIndex(x=>x.id===sId);if(i<0)return;
 const fresh=stationFromDrill(drillId,"Station "+(i+1));if(!fresh)return;remember();Object.assign(b.stations[i],fresh,{id:sId});
 if(state.live.currentId===blockId&&(state.live.active||state.live.paused))refreshLiveCurrent();saveData();renderSchedule();
}
function removeStationDrill(blockId,sId){
 const b=state.schedule.find(x=>x.schedId===blockId&&x.type==="station");if(!b)return;
 remember();b.stations=b.stations.filter(x=>x.id!==sId);b.stations.forEach((x,i)=>x.label="Station "+(i+1));
 if(!b.stations.length)state.schedule=state.schedule.filter(x=>x.schedId!==blockId);
 saveData();renderSchedule();toast(b.stations.length?"Station activity removed.":"Empty station block removed.");
}
function addStationSlot(blockId){const b=state.schedule.find(x=>x.schedId===blockId&&x.type==="station");if(!b)return;remember();b.stations.push({id:uid("station"),label:"Station "+(b.stations.length+1),drillId:"",name:"Choose a drill",equipment:"",equipmentItems:[],notes:"",tags:[]});saveData();renderSchedule()}
function deleteStationBlock(){if(!stationId||!confirm("Remove this station rotation?"))return;const id=stationId;stationId=null;$("dialog-station").close();deleteScheduledItem(id)}

function openTeams(){renderTeams();$("roster-team-select").value=state.activeTeamId;$("team-roster-input").value=(team()?.roster||[]).join("\n");$("dialog-teams").showModal()}
function updateRosterEditor(){const x=state.teams.find(t=>t.id===$("roster-team-select").value);$("team-roster-input").value=x?x.roster.join("\n"):""}
function addTeam(){const name=$("new-team-name").value.trim();if(!name){$("new-team-name").focus();return}if(state.teams.some(x=>x.name.toLowerCase()===name.toLowerCase())){toast("That team already exists.");return}remember();const x={id:uid("team"),name,roster:[]};state.teams.push(x);state.schedulesByTeam[x.id]=[];$("new-team-name").value="";renderTeams();$("roster-team-select").value=x.id;$("team-roster-input").value="";toast("Team created.")}
function saveRoster(){const x=state.teams.find(t=>t.id===$("roster-team-select").value);if(!x)return;remember();x.roster=$("team-roster-input").value.split(/\r?\n/).map(s=>s.trim()).filter(Boolean);saveData();renderTeams();$("dialog-teams").close();toast("Roster saved.")}
function deleteTeam(){
 const id=$("roster-team-select").value,x=state.teams.find(t=>t.id===id);if(!x||state.teams.length<=1){toast("At least one team must remain.");return}
 if(!confirm("Delete "+x.name+" and its saved schedules? This cannot be undone."))return;
 remember();state.teams=state.teams.filter(t=>t.id!==id);delete state.schedulesByTeam[id];
 if(state.activeTeamId===id){state.activeTeamId=state.teams[0].id;state.schedule=clone(state.schedulesByTeam[state.activeTeamId]||[])}
 saveData();renderAll();$("roster-team-select").value=state.activeTeamId;$("team-roster-input").value=(team()?.roster||[]).join("\n");toast(x.name+" deleted.");
}
function switchTeam(id){saveData();resetLive();state.activeTeamId=id;state.schedule=clone(state.schedulesByTeam[id]||[]);undoStack=[];$("btn-undo").disabled=true;saveData();renderAll()}

function renderGroupPlayer(name,index,count){
 return `<div class="group-player" draggable="true" data-player-card="${index}"><span class="group-player-name">${esc(name)}</span><select data-player-move="${index}" aria-label="Move ${esc(name)}"><option value="-1" ${grouping.assignments[index]===-1?"selected":""}>Unassigned</option>${Array.from({length:count},(_,i)=>`<option value="${i}" ${grouping.assignments[index]===i?"selected":""}>Group ${i+1}</option>`).join("")}</select></div>`;
}
function renderGroupBoard(){
 const roster=team()?.roster||[],count=Math.max(2,Math.min(5,grouping.count||2));while(grouping.assignments.length<roster.length)grouping.assignments.push(-1);grouping.assignments=grouping.assignments.slice(0,roster.length).map(x=>Number.isInteger(x)&&x>=-1&&x<count?x:-1);
 const groups=Array.from({length:count},()=>[]),unassigned=[];roster.forEach((p,i)=>grouping.assignments[i]>=0?groups[grouping.assignments[i]].push({p,i}):unassigned.push({p,i}));
 let html=`<section class="group-card" data-group-drop="-1"><h4>Unassigned · ${unassigned.length}</h4>${unassigned.length?unassigned.map(x=>renderGroupPlayer(x.p,x.i,count)).join(""):'<div class="group-empty">All assigned.</div>'}</section>`;
 groups.forEach((g,i)=>{html+=`<section class="group-card" data-group-drop="${i}"><h4>Group ${i+1} · ${g.length}</h4>${g.length?g.map(x=>renderGroupPlayer(x.p,x.i,count)).join(""):'<div class="group-empty">Drop players here.</div>'}</section>`});
 $("grouping-board").innerHTML=html;
}
function openGrouping(){grouping={count:2,assignments:Array((team()?.roster||[]).length).fill(-1)};$("group-count-select").value="2";renderGroupBoard();$("dialog-grouping").showModal()}
function randomGroups(){
 const roster=team()?.roster||[],ids=roster.map((_,i)=>i);for(let i=ids.length-1;i>0;i--){const j=Math.floor(Math.random()*(i+1));[ids[i],ids[j]]=[ids[j],ids[i]]}
 const count=Math.min(Math.max(2,Number($("group-count-select").value)||2),Math.max(1,roster.length));grouping.count=count;grouping.assignments=Array(roster.length).fill(-1);ids.forEach((id,i)=>grouping.assignments[id]=i%count);renderGroupBoard();
}
function resetGroups(){grouping.assignments=Array((team()?.roster||[]).length).fill(-1);renderGroupBoard()}
function movePlayer(i,g){if(i<0||i>=grouping.assignments.length)return;grouping.assignments[i]=Number(g);renderGroupBoard()}

function equipmentItems(){
 const map=new Map(),add=x=>normalizeEquipmentItems(x.equipmentItems).forEach(v=>{const op=equipmentOption(v.optionId);if(!op)return;if(!map.has(v.optionId))map.set(v.optionId,{name:op.name,quantity:0,activities:[]});const z=map.get(v.optionId);z.quantity+=v.quantity;z.activities.push(x.name||"Station")});
 state.schedule.forEach(x=>x.type==="station"?x.stations.forEach(add):add(x));return [...map.values()].sort((a,b)=>a.name.localeCompare(b.name));
}
function openEquipment(){
 const list=equipmentItems();$("equipment-master-list").innerHTML=list.length?list.map(x=>`<div class="equipment-row"><input type="checkbox"><span><strong>${esc(x.name)}</strong><small>Used for: ${esc([...new Set(x.activities)].join(", "))}</small></span><span class="equipment-qty">× ${x.quantity}</span></div>`).join(""):'<div class="empty-state">No selectable equipment is assigned. Edit drills to add equipment.</div>';$("dialog-equipment").showModal();
}

function liveIndex(){return state.schedule.findIndex(x=>x.schedId===state.live.currentId)}
function liveSet(i){const x=state.schedule[i];if(!x){resetLive();return}state.live.currentId=x.schedId;state.live.remainingSec=x.duration*60;state.live.endAt=Date.now()+state.live.remainingSec*1000;state.live.active=true;state.live.paused=false;state.live.completed=false;if(!state.live.intervalId)state.live.intervalId=setInterval(tickLive,250);renderSchedule()}
function refreshLiveCurrent(){const i=liveIndex(),x=state.schedule[i];if(!x)return;state.live.remainingSec=x.duration*60;state.live.endAt=Date.now()+state.live.remainingSec*1000;renderSchedule()}
function startLive(){if(!state.schedule.length){toast("Add an activity first.");return}liveSet(0);$("live-panel").scrollIntoView({block:"nearest",behavior:"smooth"});toast("Live practice started.")}
function tickLive(){
 if(!state.live.active||state.live.paused)return;state.live.remainingSec=Math.max(0,Math.ceil((state.live.endAt-Date.now())/1000));
 if(state.live.remainingSec<=0){const n=liveIndex()+1;if(n<state.schedule.length){liveSet(n);toast("Next activity: "+state.schedule[n].name)}else{state.live.active=false;state.live.paused=false;state.live.completed=true;clearInterval(state.live.intervalId);state.live.intervalId=null;renderSchedule();toast("Practice complete.")}}
 else renderLiveControls();
}
function stepLive(d){const n=liveIndex()+d;if(n<0||n>=state.schedule.length)return;liveSet(n)}
function pauseLive(){
 if(state.live.active){state.live.remainingSec=Math.max(0,Math.ceil((state.live.endAt-Date.now())/1000));state.live.active=false;state.live.paused=true;clearInterval(state.live.intervalId);state.live.intervalId=null}
 else if(state.live.paused){state.live.endAt=Date.now()+state.live.remainingSec*1000;state.live.active=true;state.live.paused=false;state.live.intervalId=setInterval(tickLive,250)}
 else return;
 renderSchedule();
}
function resetLive(){clearInterval(state.live.intervalId);state.live.intervalId=null;state.live.active=false;state.live.paused=false;state.live.completed=false;state.live.currentId=null;state.live.endAt=null;state.live.remainingSec=0;if($("live-status-text"))renderLiveControls()}
function renderLiveControls(){
 const i=liveIndex(),run=state.live.active,pause=state.live.paused,done=state.live.completed,r=run?Math.max(0,Math.ceil((state.live.endAt-Date.now())/1000)):state.live.remainingSec;
 $("live-status-text").textContent=done?"Complete":run?"Running":pause?"Paused":"Ready";$("live-indicator").classList.toggle("active",run);
 $("live-timer-readout").textContent=run||pause?Math.floor(r/60)+":"+String(r%60).padStart(2,"0"):done?"0:00":"--:--";
 $("live-current-label").textContent=i>=0?"Now: "+state.schedule[i].name:"Start live practice to highlight the current activity.";
 $("btn-start-practice").hidden=run||pause;$("btn-start-practice").textContent=done?"Restart":"Start live practice";
 $("btn-pause-practice").hidden=!run&&!pause;$("btn-pause-practice").disabled=!run&&!pause;$("btn-pause-practice").textContent=pause?"Resume":"Pause";
 $("btn-prev-drill").disabled=!run||i<=0;$("btn-next-drill").disabled=!run||i<0||i>=state.schedule.length-1;
 $("btn-stop-practice").hidden=!run&&!pause&&!done;$("btn-stop-practice").textContent=done?"Reset":"End";
}

function exportJSON(){
 saveData();const data={app:"basketball-practice-planner",version:3,exportedAt:new Date().toISOString(),team:team(),teams:state.teams,activeTeamId:state.activeTeamId,drillBank:state.drillBank,equipmentCatalog:state.equipmentCatalog,schedule:state.schedule,practice:state.practice,schedulesByTeam:state.schedulesByTeam};
 const url=URL.createObjectURL(new Blob([JSON.stringify(data,null,2)],{type:"application/json"})),a=document.createElement("a");a.href=url;a.download=((team()?.name)||"Team").replace(/[^a-z0-9_-]+/gi,"_")+"_"+state.practice.date+"_Practice.json";document.body.appendChild(a);a.click();a.remove();URL.revokeObjectURL(url);toast("Backup downloaded.");
}
function importJSON(e){
 const file=e.target.files&&e.target.files[0];if(!file)return;if(file.size>5000000){toast("Backup file is too large.");e.target.value="";return}
 const r=new FileReader();r.onload=event=>{try{
  const d=JSON.parse(event.target.result);if(!d||!Array.isArray(d.schedule))throw Error("Not a practice backup.");if(!confirm("Import this practice and its team data?"))return;remember();
  if(Array.isArray(d.teams)&&d.teams.length)state.teams=d.teams.map((x,i)=>({id:x.id||uid("team"+i),name:String(x.name||"Team "+(i+1)),roster:Array.isArray(x.roster)?x.roster.map(String):[]}));
  if(d.team&&d.team.name){let t=state.teams.find(x=>x.name.toLowerCase()===String(d.team.name).toLowerCase());if(!t){t={id:uid("team"),name:String(d.team.name),roster:d.team.roster||[]};state.teams.push(t)}state.activeTeamId=t.id}else if(d.activeTeamId&&state.teams.some(x=>x.id===d.activeTeamId))state.activeTeamId=d.activeTeamId;
  if(Array.isArray(d.equipmentCatalog))state.equipmentCatalog=d.equipmentCatalog.map(x=>({id:x.id||uid("equip"),name:String(x.name||"").trim()})).filter(x=>x.name);
  if(Array.isArray(d.drillBank))d.drillBank.map(normalizeBank).forEach(x=>{const old=state.drillBank.find(y=>y.id===x.id||y.name.toLowerCase()===x.name.toLowerCase());if(old)Object.assign(old,x);else state.drillBank.push(x)});
  if(d.schedulesByTeam&&typeof d.schedulesByTeam==="object"){state.schedulesByTeam={};Object.keys(d.schedulesByTeam).forEach(id=>{if(state.teams.some(x=>x.id===id)&&Array.isArray(d.schedulesByTeam[id]))state.schedulesByTeam[id]=d.schedulesByTeam[id].map(normalizeScheduled)})}
  state.schedule=d.schedule.map(normalizeScheduled);state.practice={date:d.practice?.date||d.date||state.practice.date,start:d.practice?.start||d.startTime||state.practice.start,end:d.practice?.end||d.endTime||state.practice.end};state.schedulesByTeam[state.activeTeamId]=clone(state.schedule);resetLive();saveData();renderAll();toast("Backup imported.");
 }catch(err){console.error(err);toast(err.message||"Could not import backup.")}finally{e.target.value=""}};r.onerror=()=>{toast("Could not read backup.");e.target.value=""};r.readAsText(file);
}
function ascii(s){return String(s||"").replace(/[’‘]/g,"'").replace(/[“”]/g,'"').replace(/[–—]/g,"-").replace(/×/g,"x").normalize("NFKD").replace(/[^\x20-\x7E]/g,"")}
function pdfEsc(s){return ascii(s).replace(/\\/g,"\\\\").replace(/\(/g,"\\(").replace(/\)/g,"\\)")}
function wrapPDF(text,max){const words=ascii(text).split(/\s+/),out=[];let line="";words.forEach(w=>{if(!w)return;const next=line?line+" "+w:w;if(next.length>(max||90)&&line){out.push(line);line=w}else line=next});if(line)out.push(line);return out.length?out:[""]}
function downloadPDF(){
 const pages=[];let lines=[],y=750;
 function newPage(){if(lines.length)pages.push(lines);lines=[];y=750}
 function line(text,size,step){if(y<55)newPage();lines.push({text:ascii(text),size:size||9,y});y-=step||13}
 function wrapped(text,size,step){wrapPDF(text,Math.floor(520/((size||9)*.52))).forEach(x=>line(x,size||9,step||12))}
 const t=timing();line(team()?.name||"Basketball Practice",18,26);line("Practice plan | "+state.practice.date+" | "+state.practice.start+" - "+state.practice.end,10,17);
 line("Allotted: "+minutesWindow()+" minutes | Planned: "+state.schedule.reduce((a,x)=>a+x.duration,0)+" minutes",10,22);
 state.schedule.forEach((x,i)=>{y-=4;line(formatClock(t[i].start)+" - "+formatClock(t[i].end)+" | "+x.duration+" MIN | "+x.name,12,17);
  if(x.type==="station")x.stations.forEach((s,j)=>{line("Station "+(j+1)+": "+s.name,10,13);const eq=equipmentText(s);if(eq)wrapped("Equipment: "+eq,9,11);if(s.notes)wrapped(s.notes,9,11)});
  else{const eq=equipmentText(x);if(eq)wrapped("Equipment: "+eq,9,11);if(x.notes)wrapped(x.notes,9,11)}y-=7;
 });
 if(lines.length)pages.push(lines);
 const objects=[];objects[1]="<< /Type /Catalog /Pages 2 0 R >>";objects[2]="";objects[3]="<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica >>";
 const kids=pages.map((p,i)=>(4+i*2)+" 0 R").join(" ");objects[2]="<< /Type /Pages /Kids [ "+kids+" ] /Count "+pages.length+" >>";
 pages.forEach((page,i)=>{const pid=4+i*2,cid=pid+1,stream=page.map(x=>"BT /F1 "+x.size+" Tf 46 "+x.y+" Td ("+pdfEsc(x.text)+") Tj ET").join("\n");objects[pid]="<< /Type /Page /Parent 2 0 R /MediaBox [0 0 612 792] /Resources << /Font << /F1 3 0 R >> >> /Contents "+cid+" 0 R >>";objects[cid]="<< /Length "+stream.length+" >>\nstream\n"+stream+"\nendstream"});
 let pdf="%PDF-1.4\n",offsets=[0];for(let i=1;i<objects.length;i++){offsets[i]=pdf.length;pdf+=i+" 0 obj\n"+objects[i]+"\nendobj\n"}
 const xref=pdf.length;pdf+="xref\n0 "+objects.length+"\n0000000000 65535 f \n";for(let i=1;i<objects.length;i++)pdf+=String(offsets[i]).padStart(10,"0")+" 00000 n \n";
 pdf+="trailer\n<< /Size "+objects.length+" /Root 1 0 R >>\nstartxref\n"+xref+"\n%%EOF";
 const blob=new Blob([pdf],{type:"application/pdf"}),url=URL.createObjectURL(blob),a=document.createElement("a");a.href=url;a.download=((team()?.name)||"Basketball-Practice").replace(/[^a-z0-9_-]+/gi,"_")+"_"+(state.practice.date||localDate())+".pdf";document.body.appendChild(a);a.click();a.remove();setTimeout(()=>URL.revokeObjectURL(url),2000);toast("PDF downloaded.");
}

function bindEvents(){
 $("active-team-select").addEventListener("change",e=>{saveData();resetLive();state.activeTeamId=e.target.value;state.schedule=clone(state.schedulesByTeam[state.activeTeamId]||[]);undoStack=[];$("btn-undo").disabled=true;saveData();renderAll()});
 $("btn-manage-teams").addEventListener("click",openTeams);$("btn-add-team").addEventListener("click",addTeam);$("roster-team-select").addEventListener("change",updateRosterEditor);
 $("btn-delete-team").addEventListener("click",deleteTeam);$("btn-save-roster").addEventListener("click",saveRoster);$("btn-close-teams").addEventListener("click",()=>$("dialog-teams").close());$("btn-cancel-roster").addEventListener("click",()=>$("dialog-teams").close());
 $("btn-browse-drills").addEventListener("click",()=>$("bank-panel").scrollIntoView({block:"start",behavior:"smooth"}));
 $("btn-back-to-schedule").addEventListener("click",()=>$("planner-team-name").scrollIntoView({block:"start",behavior:"smooth"}));
 $("bank-search").addEventListener("input",renderBank);$("bank-tag-filter").addEventListener("change",renderBank);$("bank-sort").addEventListener("change",renderBank);$("btn-new-bank-drill").addEventListener("click",()=>openActivity(null,"new"));
 $("bank-list").addEventListener("click",e=>{const a=e.target.closest("[data-add-drill]"),b=e.target.closest("[data-bank-edit]");if(a)addDrill(a.dataset.addDrill);else if(b)openActivity(b.dataset.bankEdit,"bank")});
 $("bank-list").addEventListener("dragstart",e=>{const x=e.target.closest("[data-bank-item]");if(!x)return;draggingBankId=x.dataset.bankItem;e.dataTransfer.effectAllowed="copy";e.dataTransfer.setData("text/plain",draggingBankId)});
 $("bank-list").addEventListener("dragend",()=>{draggingBankId=null;document.querySelectorAll(".drop-target").forEach(x=>x.classList.remove("drop-target"))});
 $("form-edit-item").addEventListener("submit",saveActivity);$("btn-cancel-edit").addEventListener("click",closeEdit);$("form-edit-item").querySelector("[data-close-edit]").addEventListener("click",closeEdit);
 $("btn-remove-bank").addEventListener("click",deleteBankDrill);$("btn-remove-scheduled").addEventListener("click",()=>{if(editing){const id=editing.id;$("dialog-edit-item").close();editing=null;deleteScheduledItem(id)}});
 $("btn-update-bank-default").addEventListener("click",updateBankDefault);
 $("btn-edit-equipment").addEventListener("click",openEquipmentPicker);$("btn-close-equipment-picker").addEventListener("click",()=>$("dialog-equipment-picker").close());$("btn-cancel-equipment-picker").addEventListener("click",()=>$("dialog-equipment-picker").close());
 $("btn-save-equipment-picker").addEventListener("click",()=>{collectEquipment();updateEquipmentSummary();$("dialog-equipment-picker").close()});
 $("equipment-picker-list").addEventListener("change",e=>{const x=e.target.closest("[data-equipment-check]");if(x){const q=$("equipment-picker-list").querySelector('[data-equipment-quantity="'+x.dataset.equipmentCheck+'"]');if(q)q.disabled=!x.checked}});
 $("btn-manage-equipment-options").addEventListener("click",()=>{collectEquipment();updateEquipmentSummary();$("dialog-equipment-picker").close();openEquipmentCatalog()});
 $("btn-close-equipment-catalog").addEventListener("click",()=>$("dialog-equipment-catalog").close());$("btn-done-equipment-catalog").addEventListener("click",()=>$("dialog-equipment-catalog").close());
 $("btn-add-equipment-option").addEventListener("click",addEquipmentOption);$("equipment-catalog-list").addEventListener("click",e=>{const a=e.target.closest("[data-save-equipment-name]"),b=e.target.closest("[data-delete-equipment-option]");if(a)saveEquipmentName(a.dataset.saveEquipmentName);if(b)deleteEquipmentOption(b.dataset.deleteEquipmentOption)});
 $("form-station").addEventListener("submit",saveStation);$("btn-cancel-station").addEventListener("click",()=>$("dialog-station").close());$("btn-cancel-station-x").addEventListener("click",()=>$("dialog-station").close());$("btn-add-station-row").addEventListener("click",addStationRow);$("btn-delete-station").addEventListener("click",deleteStationBlock);
 $("station-rows").addEventListener("change",e=>{const x=e.target.closest("[data-station-select]");if(x&&stationDraft[Number(x.dataset.stationSelect)])stationDraft[Number(x.dataset.stationSelect)].drillId=x.value});
 $("station-rows").addEventListener("click",e=>{const x=e.target.closest("[data-remove-station-row]");if(x){stationDraft.splice(Number(x.dataset.removeStationRow),1);renderStationRows()}});
 $("schedule-list").addEventListener("click",e=>{
  const a=e.target.closest("[data-edit-activity]"),b=e.target.closest("[data-edit-station]"),m=e.target.closest("[data-move-index]"),d=e.target.closest("[data-delete-schedule]"),r=e.target.closest("[data-remove-station-drill]"),add=e.target.closest("[data-add-station-slot]");
  if(a)openActivity(a.dataset.editActivity,"schedule");else if(b)openStation(b.dataset.editStation);else if(m)moveItem(Number(m.dataset.moveIndex),Number(m.dataset.direction));else if(d)deleteScheduledItem(d.dataset.deleteSchedule);else if(r)removeStationDrill(r.dataset.removeStationDrill,r.dataset.stationId);else if(add)addStationSlot(add.dataset.addStationSlot);
 });
 $("schedule-list").addEventListener("change",e=>{const x=e.target.closest("[data-station-replace]");if(x)assignStationDrill(x.dataset.stationReplace,x.dataset.stationId,x.value)});
 $("schedule-list").addEventListener("dragstart",e=>{const x=e.target.closest("[data-schedule-id]");if(x){dragging=x.dataset.scheduleId;x.classList.add("dragging");e.dataTransfer.effectAllowed="move";e.dataTransfer.setData("text/plain",dragging)}});
 $("schedule-list").addEventListener("dragend",()=>{dragging=null;draggingBankId=null;document.querySelectorAll(".dragging,.drop-target").forEach(x=>x.classList.remove("dragging","drop-target"))});
 $("schedule-list").addEventListener("dragover",e=>{if(!dragging&&!draggingBankId)return;const station=e.target.closest("[data-station-drop]"),card=e.target.closest("[data-schedule-id]");if(draggingBankId){e.preventDefault();document.querySelectorAll(".drop-target").forEach(x=>x.classList.remove("drop-target"));if(station)station.classList.add("drop-target");else if(card)card.classList.add("drop-target");return}if(!card||card.dataset.scheduleId===dragging)return;e.preventDefault();document.querySelectorAll(".drop-target").forEach(x=>x.classList.remove("drop-target"));card.classList.add("drop-target")});
 $("schedule-list").addEventListener("drop",e=>{
  if(draggingBankId){e.preventDefault();const s=e.target.closest("[data-station-drop]");if(s)assignStationDrill(s.dataset.stationDrop,s.dataset.stationId,draggingBankId);else{const c=e.target.closest("[data-schedule-id]"),i=c?state.schedule.findIndex(x=>x.schedId===c.dataset.scheduleId):state.schedule.length;addDrill(draggingBankId,i<0?state.schedule.length:i)}draggingBankId=null;document.querySelectorAll(".drop-target").forEach(x=>x.classList.remove("drop-target"));return}
  if(!dragging)return;const c=e.target.closest("[data-schedule-id]");if(!c)return;e.preventDefault();const a=state.schedule.findIndex(x=>x.schedId===dragging),b=state.schedule.findIndex(x=>x.schedId===c.dataset.scheduleId);
  if(a>=0&&b>=0&&a!==b){remember();const [x]=state.schedule.splice(a,1);state.schedule.splice(b,0,x);saveData();renderSchedule()}dragging=null;
 });
 $("bank-panel").addEventListener("dragover",e=>{if(dragging)e.preventDefault()});$("bank-panel").addEventListener("drop",e=>{if(!dragging)return;e.preventDefault();const id=dragging;dragging=null;deleteScheduledItem(id);toast("Removed from practice. Drill bank copy kept.")});
 $("btn-fit-practice").addEventListener("click",fitPractice);$("btn-add-station-block").addEventListener("click",()=>openStation(null));
 $("btn-clear-schedule").addEventListener("click",()=>{if(!state.schedule.length||!confirm("Clear this team's schedule?"))return;remember();state.schedule=[];resetLive();saveData();renderSchedule()});
 $("practice-date").addEventListener("change",()=>{state.practice.date=$("practice-date").value;saveData()});$("practice-start-time").addEventListener("change",()=>{state.practice.start=$("practice-start-time").value;saveData();renderSchedule()});$("practice-end-time").addEventListener("change",()=>{state.practice.end=$("practice-end-time").value;saveData();renderSchedule()});
 $("btn-grouping").addEventListener("click",openGrouping);$("btn-close-grouping").addEventListener("click",()=>$("dialog-grouping").close());$("btn-done-groups").addEventListener("click",()=>$("dialog-grouping").close());
 $("btn-generate-groups").addEventListener("click",randomGroups);$("btn-reset-groups").addEventListener("click",resetGroups);$("group-count-select").addEventListener("change",e=>{const n=Math.max(2,Math.min(5,Number(e.target.value)||2));grouping.count=n;grouping.assignments=grouping.assignments.map(x=>x>=n?-1:x);renderGroupBoard()});
 $("grouping-board").addEventListener("change",e=>{const x=e.target.closest("[data-player-move]");if(x)movePlayer(Number(x.dataset.playerMove),Number(x.value))});
 $("grouping-board").addEventListener("dragstart",e=>{const x=e.target.closest("[data-player-card]");if(!x)return;draggingPlayer=Number(x.dataset.playerCard);e.dataTransfer.effectAllowed="move";e.dataTransfer.setData("text/plain",String(draggingPlayer))});
 $("grouping-board").addEventListener("dragover",e=>{if(draggingPlayer===null)return;const x=e.target.closest("[data-group-drop]");if(!x)return;e.preventDefault();document.querySelectorAll(".group-card").forEach(y=>y.classList.remove("drag-over"));x.classList.add("drag-over")});
 $("grouping-board").addEventListener("drop",e=>{if(draggingPlayer===null)return;const x=e.target.closest("[data-group-drop]");if(!x)return;e.preventDefault();grouping.assignments[draggingPlayer]=Number(x.dataset.groupDrop);draggingPlayer=null;renderGroupBoard()});
 $("grouping-board").addEventListener("dragend",()=>{draggingPlayer=null;document.querySelectorAll(".group-card").forEach(x=>x.classList.remove("drag-over"))});
 $("btn-equipment").addEventListener("click",openEquipment);$("btn-close-equipment").addEventListener("click",()=>$("dialog-equipment").close());$("btn-done-equipment").addEventListener("click",()=>$("dialog-equipment").close());
 $("btn-start-practice").addEventListener("click",startLive);$("btn-pause-practice").addEventListener("click",pauseLive);$("btn-prev-drill").addEventListener("click",()=>stepLive(-1));$("btn-next-drill").addEventListener("click",()=>stepLive(1));$("btn-stop-practice").addEventListener("click",()=>{resetLive();toast("Live practice ended.")});
 $("btn-undo").addEventListener("click",undo);$("btn-export-pdf").addEventListener("click",downloadPDF);$("btn-export-json").addEventListener("click",exportJSON);$("btn-import-json").addEventListener("click",()=>$("input-import-file").click());$("input-import-file").addEventListener("change",importJSON);
 $("btn-help").addEventListener("click",()=>$("dialog-help").showModal());$("btn-close-help").addEventListener("click",()=>$("dialog-help").close());
 document.querySelectorAll("dialog").forEach(d=>d.addEventListener("click",e=>{if(e.target===d)d.close()}));
}
document.addEventListener("DOMContentLoaded",()=>{loadData();bindEvents();renderAll();$("btn-undo").disabled=true});
