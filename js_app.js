// State Management
const STORAGE_KEY_TEAMS = 'cyb_teams_v1';
const STORAGE_KEY_BANK = 'cyb_drill_bank_v1';
const STORAGE_KEY_SCHEDULE = 'cyb_active_schedule_v1';

let state = {
  teams: [],
  activeTeamId: null,
  drillBank: [],
  schedule: [],
  live: {
    active: false,
    currentIndex: 0,
    intervalId: null,
    timeRemainingSec: 0
  }
};

// Initialization
document.addEventListener('DOMContentLoaded', () => {
  loadData();
  bindEvents();
  renderAll();
  initCharts();
});

function loadData() {
  const savedTeams = localStorage.getItem(STORAGE_KEY_TEAMS);
  state.teams = savedTeams ? JSON.parse(savedTeams) : [
    { id: 't1', name: 'CYB Indian Knoll 3B-2', roster: ['10 Jordan', '12 Alex', '15 Sam', '22 Taylor', '30 Chris'] },
    { id: 't2', name: 'CYB 1B-2 Team', roster: ['3 Morgan', '5 Riley', '11 Casey', '14 Jamie'] }
  ];
  state.activeTeamId = state.teams[0].id;

  const savedBank = localStorage.getItem(STORAGE_KEY_BANK);
  state.drillBank = savedBank ? JSON.parse(savedBank) : JSON.parse(JSON.stringify(PRESET_DRILLS));

  const savedSchedule = localStorage.getItem(STORAGE_KEY_SCHEDULE);
  if (savedSchedule) {
    state.schedule = JSON.parse(savedSchedule);
  } else {
    // Default initial practice plan from preset bank
    state.schedule = state.drillBank.slice(0, 5).map(d => ({
      ...JSON.parse(JSON.stringify(d)),
      schedId: 's_' + Math.random().toString(36).substr(2, 9)
    }));
  }

  document.getElementById('practice-date').value = new Date().toISOString().split('T')[0];
}

function saveData() {
  localStorage.setItem(STORAGE_KEY_TEAMS, JSON.stringify(state.teams));
  localStorage.setItem(STORAGE_KEY_BANK, JSON.stringify(state.drillBank));
  localStorage.setItem(STORAGE_KEY_SCHEDULE, JSON.stringify(state.schedule));
}

// Event Bindings
function bindEvents() {
  document.getElementById('active-team-select').addEventListener('change', (e) => {
    state.activeTeamId = e.target.value;
    saveData();
  });

  document.getElementById('btn-manage-teams').onclick = () => openTeamsModal();
  document.getElementById('btn-add-team').onclick = addTeam;
  document.getElementById('btn-save-roster').onclick = saveRoster;
  document.getElementById('btn-close-teams').onclick = () => document.getElementById('dialog-teams').close();

  document.getElementById('btn-view-planner').onclick = () => switchView('planner');
  document.getElementById('btn-view-analytics').onclick = () => { switchView('analytics'); updateCharts(); };

  document.getElementById('bank-search').oninput = renderDrillBank;
  document.getElementById('bank-tag-filter').onchange = renderDrillBank;

  document.getElementById('btn-new-bank-drill').onclick = () => openEditModal(null, true);
  document.getElementById('form-edit-item').onsubmit = saveEditModal;
  document.getElementById('btn-cancel-edit').onclick = () => document.getElementById('dialog-edit-item').close();
  document.getElementById('btn-remove-scheduled').onclick = removeScheduledItem;
  document.getElementById('btn-update-bank-default').onclick = updateBankDefaultFromModal;

  document.getElementById('practice-start-time').onchange = renderSchedule;
  document.getElementById('practice-end-time').onchange = renderSchedule;
  document.getElementById('btn-fit-practice').onclick = fitToAllottedTime;

  document.getElementById('btn-equipment').onclick = openEquipmentModal;
  document.getElementById('btn-close-equipment').onclick = () => document.getElementById('dialog-equipment').close();

  document.getElementById('btn-grouping').onclick = openGroupingModal;
  document.getElementById('btn-generate-groups').onclick = generateGroups;
  document.getElementById('btn-close-grouping').onclick = () => document.getElementById('dialog-grouping').close();

  document.getElementById('btn-export-json').onclick = exportJSON;
  document.getElementById('btn-import-json').onclick = () => document.getElementById('input-import-file').click();
  document.getElementById('input-import-file').onchange = importJSON;
  document.getElementById('btn-export-pdf').onclick = exportPDF;

  // Live Practice Companion Controls
  document.getElementById('btn-start-practice').onclick = toggleLivePractice;
  document.getElementById('btn-prev-drill').onclick = () => stepLiveDrill(-1);
  document.getElementById('btn-next-drill').onclick = () => stepLiveDrill(1);
  document.getElementById('btn-stop-practice').onclick = stopLivePractice;
}

function switchView(viewName) {
  document.querySelectorAll('.btn-tab').forEach(b => b.classList.remove('active'));
  document.querySelectorAll('.view-panel').forEach(p => p.classList.remove('active'));
  if (viewName === 'planner') {
    document.getElementById('btn-view-planner').classList.add('active');
    document.getElementById('view-planner').classList.add('active');
  } else {
    document.getElementById('btn-view-analytics').classList.add('active');
    document.getElementById('view-analytics').classList.add('active');
  }
}

// Rendering
function renderAll() {
  renderTeamSelects();
  renderTagFilterOptions();
  renderDrillBank();
  renderSchedule();
}

function renderTeamSelects() {
  const activeSelect = document.getElementById('active-team-select');
  const rosterSelect = document.getElementById('roster-team-select');
  activeSelect.innerHTML = state.teams.map(t => `<option value="${t.id}" ${t.id === state.activeTeamId ? 'selected' : ''}>${t.name}</option>`).join('');
  rosterSelect.innerHTML = state.teams.map(t => `<option value="${t.id}">${t.name}</option>`).join('');
  
  rosterSelect.onchange = () => {
    const t = state.teams.find(x => x.id === rosterSelect.value);
    document.getElementById('team-roster-input').value = t ? t.roster.join('\n') : '';
  };
}

function renderTagFilterOptions() {
  const select = document.getElementById('bank-tag-filter');
  select.innerHTML = '<option value="">All Skill Tags</option>' + DEFAULT_TAGS.map(t => `<option value="${t}">${t.toUpperCase()}</option>`).join('');
}

function renderDrillBank() {
  const search = document.getElementById('bank-search').value.toLowerCase();
  const tagFilter = document.getElementById('bank-tag-filter').value;
  const list = document.getElementById('bank-list');

  const filtered = state.drillBank.filter(d => {
    const matchesSearch = d.name.toLowerCase().includes(search) || (d.equipment && d.equipment.toLowerCase().includes(search));
    const matchesTag = !tagFilter || (d.tags && d.tags.includes(tagFilter));
    return matchesSearch && matchesTag;
  });

  list.innerHTML = filtered.map(d => `
    <div class="bank-item" onclick="addDrillToSchedule('${d.id}')">
      <div class="bank-item-title">
        <span>${d.name}</span>
        <span>${d.duration}m</span>
      </div>
      <div class="bank-item-meta">
        ${d.tags.map(t => `<span class="tag-badge">${t}</span>`).join('')}
      </div>
    </div>
  `).join('');
}

function getActiveTeam() {
  return state.teams.find(t => t.id === state.activeTeamId) || state.teams[0];
}

function calculateTiming() {
  const startTimeVal = document.getElementById('practice-start-time').value || "18:00";
  const [startH, startM] = startTimeVal.split(':').map(Number);
  let currentMins = startH * 60 + startM;

  return state.schedule.map((item, idx) => {
    const itemStartMins = currentMins;
    const itemEndMins = currentMins + item.duration;
    currentMins = itemEndMins;

    return {
      ...item,
      startFormatted: formatMins(itemStartMins),
      endFormatted: formatMins(itemEndMins),
      startMins: itemStartMins,
      endMins: itemEndMins
    };
  });
}

function formatMins(m) {
  const hrs = Math.floor(m / 60) % 24;
  const mins = m % 60;
  const h12 = hrs % 12 || 12;
  const ampm = hrs >= 12 ? 'PM' : 'AM';
  return `${h12}:${mins < 10 ? '0' : ''}${mins} ${ampm}`;
}

function renderSchedule() {
  const timedSchedule = calculateTiming();
  const board = document.getElementById('schedule-board');

  const endTimeVal = document.getElementById('practice-end-time').value || "19:30";
  const [endH, endM] = endTimeVal.split(':').map(Number);
  const allottedEndMins = endH * 60 + endM;

  const totalMinsPlanned = state.schedule.reduce((acc, i) => acc + i.duration, 0);
  const [startH, startM] = (document.getElementById('practice-start-time').value || "18:00").split(':').map(Number);
  const totalMinsAllotted = allottedEndMins - (startH * 60 + startM);
  const diff = totalMinsPlanned - totalMinsAllotted;

  const summary = document.getElementById('time-summary-banner');
  if (diff > 0) {
    summary.className = "summary-banner overtime";
    summary.textContent = `Planned: ${totalMinsPlanned} mins | Allotted: ${totalMinsAllotted} mins (${diff} mins OVER runtime window)`;
  } else if (diff < 0) {
    summary.className = "summary-banner";
    summary.textContent = `Planned: ${totalMinsPlanned} mins | Allotted: ${totalMinsAllotted} mins (${Math.abs(diff)} mins available)`;
  } else {
    summary.className = "summary-banner";
    summary.textContent = `Planned: ${totalMinsPlanned} mins | Fits allotted practice window exactly!`;
  }

  board.innerHTML = timedSchedule.map((item, idx) => {
    const isActive = state.live.active && idx === state.live.currentIndex;
    const nextItem = timedSchedule[idx + 1];

    return `
      <div class="scheduled-card ${isActive ? 'is-active-drill' : ''}">
        <div class="left-info">
          <div class="time-badge">${item.startFormatted} - ${item.endFormatted} (${item.duration}m)</div>
          <div class="drill-details">
            <span class="drill-name" onclick="openEditModal('${item.schedId}')">${item.name}</span>
            <div class="drill-sub">
              ${item.tags.map(t => `<span class="tag-badge">${t}</span>`).join('')}
              ${item.equipment ? ` | 📦 ${item.equipment}` : ''}
            </div>
            ${isActive && nextItem ? `
              <div class="next-equip-box">
                <strong>UP NEXT:</strong> ${nextItem.name} ${nextItem.equipment ? `(Need: ${nextItem.equipment})` : ''}
              </div>
            ` : ''}
          </div>
        </div>
        <div class="card-actions">
          <button class="btn btn-sm" onclick="moveScheduledItem(${idx}, -1)" ${idx === 0 ? 'disabled' : ''}>▲</button>
          <button class="btn btn-sm" onclick="moveScheduledItem(${idx}, 1)" ${idx === timedSchedule.length - 1 ? 'disabled' : ''}>▼</button>
          <button class="btn btn-sm btn-danger" onclick="deleteScheduledItem('${item.schedId}')">✕</button>
        </div>
      </div>
    `;
  }).join('');
}

// Schedule Operations
function addDrillToSchedule(bankId) {
  const drill = state.drillBank.find(d => d.id === bankId);
  if (!drill) return;
  state.schedule.push({
    ...JSON.parse(JSON.stringify(drill)),
    schedId: 's_' + Math.random().toString(36).substr(2, 9)
  });
  saveData();
  renderSchedule();
}

function moveScheduledItem(index, direction) {
  const newIndex = index + direction;
  if (newIndex < 0 || newIndex >= state.schedule.length) return;
  const temp = state.schedule[index];
  state.schedule[index] = state.schedule[newIndex];
  state.schedule[newIndex] = temp;
  saveData();
  renderSchedule();
}

function deleteScheduledItem(schedId) {
  state.schedule = state.schedule.filter(i => i.schedId !== schedId);
  saveData();
  renderSchedule();
}

function fitToAllottedTime() {
  const [startH, startM] = (document.getElementById('practice-start-time').value || "18:00").split(':').map(Number);
  const [endH, endM] = (document.getElementById('practice-end-time').value || "19:30").split(':').map(Number);
  const targetTotal = (endH * 60 + endM) - (startH * 60 + startM);

  if (targetTotal <= 0 || !state.schedule.length) return;

  const currentTotal = state.schedule.reduce((acc, i) => acc + i.duration, 0);
  if (currentTotal <= 0) return;

  let remaining = targetTotal;
  state.schedule.forEach((item, idx) => {
    if (idx === state.schedule.length - 1) {
      item.duration = Math.max(1, remaining);
    } else {
      const scaled = Math.max(1, Math.round((item.duration / currentTotal) * targetTotal));
      item.duration = scaled;
      remaining -= scaled;
    }
  });

  saveData();
  renderSchedule();
}

// Editing Modal
function openEditModal(schedId, isNewBank = false) {
  const dialog = document.getElementById('dialog-edit-item');
  const tagContainer = document.getElementById('edit-item-tags');
  
  tagContainer.innerHTML = DEFAULT_TAGS.map(t => `
    <label><input type="checkbox" value="${t}" class="tag-check"> ${t}</label>
  `).join('');

  if (isNewBank) {
    document.getElementById('edit-dialog-title').textContent = "Create New Bank Drill";
    document.getElementById('edit-item-id').value = "NEW_BANK";
    document.getElementById('edit-item-name').value = "";
    document.getElementById('edit-item-duration').value = 10;
    document.getElementById('edit-item-equipment').value = "";
    document.getElementById('edit-item-notes').value = "";
    document.getElementById('btn-remove-scheduled').style.display = "none";
    document.getElementById('btn-update-bank-default').style.display = "none";
  } else {
    const item = state.schedule.find(i => i.schedId === schedId);
    if (!item) return;
    document.getElementById('edit-dialog-title').textContent = "Edit Scheduled Activity";
    document.getElementById('edit-item-id').value = schedId;
    document.getElementById('edit-item-name').value = item.name;
    document.getElementById('edit-item-duration').value = item.duration;
    document.getElementById('edit-item-equipment').value = item.equipment || "";
    document.getElementById('edit-item-notes').value = item.notes || "";
    document.getElementById('btn-remove-scheduled').style.display = "inline-block";
    document.getElementById('btn-update-bank-default').style.display = "inline-block";

    document.querySelectorAll('.tag-check').forEach(cb => {
      cb.checked = item.tags && item.tags.includes(cb.value);
    });
  }

  dialog.showModal();
}

function saveEditModal(e) {
  e.preventDefault();
  const id = document.getElementById('edit-item-id').value;
  const name = document.getElementById('edit-item-name').value;
  const duration = parseInt(document.getElementById('edit-item-duration').value) || 5;
  const equipment = document.getElementById('edit-item-equipment').value;
  const notes = document.getElementById('edit-item-notes').value;
  const selectedTags = Array.from(document.querySelectorAll('.tag-check:checked')).map(cb => cb.value);

  if (id === "NEW_BANK") {
    const newDrill = {
      id: 'd_' + Math.random().toString(36).substr(2, 9),
      name, duration, equipment, notes, tags: selectedTags
    };
    state.drillBank.push(newDrill);
  } else {
    const item = state.schedule.find(i => i.schedId === id);
    if (item) {
      item.name = name;
      item.duration = duration;
      item.equipment = equipment;
      item.notes = notes;
      item.tags = selectedTags;
    }
  }

  saveData();
  renderAll();
  document.getElementById('dialog-edit-item').close();
}

function removeScheduledItem() {
  const id = document.getElementById('edit-item-id').value;
  deleteScheduledItem(id);
  document.getElementById('dialog-edit-item').close();
}

function updateBankDefaultFromModal() {
  const id = document.getElementById('edit-item-id').value;
  const item = state.schedule.find(i => i.schedId === id);
  if (!item) return;

  const bankItem = state.drillBank.find(d => d.id === item.id || d.name.toLowerCase() === item.name.toLowerCase());
  if (confirm(`Update default properties for "${item.name}" in the Activity Bank?`)) {
    if (bankItem) {
      bankItem.name = item.name;
      bankItem.duration = item.duration;
      bankItem.equipment = item.equipment;
      bankItem.notes = item.notes;
      bankItem.tags = item.tags;
    } else {
      state.drillBank.push({
        id: 'd_' + Math.random().toString(36).substr(2, 9),
        name: item.name,
        duration: item.duration,
        equipment: item.equipment,
        notes: item.notes,
        tags: item.tags
      });
    }
    saveData();
    renderDrillBank();
    alert("Bank default updated!");
  }
}

// Live Practice Companion
function toggleLivePractice() {
  if (state.live.active) {
    stopLivePractice();
  } else {
    if (!state.schedule.length) return;
    state.live.active = true;
    state.live.currentIndex = 0;
    state.live.timeRemainingSec = state.schedule[0].duration * 60;

    document.getElementById('live-indicator').classList.add('active');
    document.getElementById('live-status-text').textContent = "Live Practice Running";
    document.getElementById('btn-start-practice').style.display = "none";
    document.getElementById('btn-stop-practice').style.display = "inline-block";
    document.getElementById('btn-prev-drill').disabled = false;
    document.getElementById('btn-next-drill').disabled = false;

    state.live.intervalId = setInterval(tickLiveTimer, 1000);
    renderSchedule();
  }
}

function tickLiveTimer() {
  if (state.live.timeRemainingSec > 0) {
    state.live.timeRemainingSec--;
  } else {
    if (state.live.currentIndex < state.schedule.length - 1) {
      stepLiveDrill(1);
      return;
    }
  }
  updateTimerDisplay();
}

function updateTimerDisplay() {
  const m = Math.floor(state.live.timeRemainingSec / 60);
  const s = state.live.timeRemainingSec % 60;
  document.getElementById('live-timer-readout').textContent = `${m}:${s < 10 ? '0' : ''}${s}`;
}

function stepLiveDrill(dir) {
  const newIdx = state.live.currentIndex + dir;
  if (newIdx < 0 || newIdx >= state.schedule.length) return;
  state.live.currentIndex = newIdx;
  state.live.timeRemainingSec = state.schedule[newIdx].duration * 60;
  updateTimerDisplay();
  renderSchedule();
}

function stopLivePractice() {
  clearInterval(state.live.intervalId);
  state.live.active = false;
  document.getElementById('live-indicator').classList.remove('active');
  document.getElementById('live-status-text').textContent = "Practice Offline";
  document.getElementById('live-timer-readout').textContent = "--:--";
  document.getElementById('btn-start-practice').style.display = "inline-block";
  document.getElementById('btn-stop-practice').style.display = "none";
  document.getElementById('btn-prev-drill').disabled = true;
  document.getElementById('btn-next-drill').disabled = true;
  renderSchedule();
}

// Master Equipment Modal
function openEquipmentModal() {
  const list = document.getElementById('equipment-master-list');
  const equipMap = new Map();

  state.schedule.forEach(item => {
    if (item.equipment && item.equipment.trim()) {
      item.equipment.split(',').forEach(raw => {
        const clean = raw.trim();
        if (clean) {
          equipMap.set(clean, (equipMap.get(clean) || []).concat(item.name));
        }
      });
    }
  });

  if (!equipMap.size) {
    list.innerHTML = "<p>No equipment listed for scheduled items.</p>";
  } else {
    let html = "";
    equipMap.forEach((drills, equip) => {
      html += `
        <div class="equip-item-row">
          <input type="checkbox">
          <strong>${equip}</strong>
          <span style="font-size:11px; color:#7f8c8d;">(Needed for: ${drills.join(', ')})</span>
        </div>
      `;
    });
    list.innerHTML = html;
  }

  document.getElementById('dialog-equipment').showModal();
}

// Team & Grouping Modals
function openTeamsModal() {
  renderTeamSelects();
  const activeTeam = getActiveTeam();
  document.getElementById('team-roster-input').value = activeTeam ? activeTeam.roster.join('\n') : '';
  document.getElementById('dialog-teams').showModal();
}

function addTeam() {
  const name = document.getElementById('new-team-name').value.trim();
  if (!name) return;
  const newTeam = { id: 't_' + Date.now(), name, roster: [] };
  state.teams.push(newTeam);
  state.activeTeamId = newTeam.id;
  document.getElementById('new-team-name').value = '';
  saveData();
  renderTeamSelects();
}

function saveRoster() {
  const teamId = document.getElementById('roster-team-select').value;
  const team = state.teams.find(t => t.id === teamId);
  if (team) {
    team.roster = document.getElementById('team-roster-input').value.split('\n').map(s => s.trim()).filter(Boolean);
    saveData();
    alert('Roster saved!');
  }
}

function openGroupingModal() {
  document.getElementById('dialog-grouping').showModal();
  generateGroups();
}

function generateGroups() {
  const team = getActiveTeam();
  const count = parseInt(document.getElementById('group-count-select').value) || 2;
  const container = document.getElementById('groups-output-container');

  if (!team || !team.roster.length) {
    container.innerHTML = "<p>No players in active team roster.</p>";
    return;
  }

  const shuffled = [...team.roster].sort(() => 0.5 - Math.random());
  const groups = Array.from({ length: count }, () => []);

  shuffled.forEach((player, i) => {
    groups[i % count].push(player);
  });

  container.innerHTML = groups.map((g, idx) => `
    <div class="group-card">
      <h4>Group ${idx + 1} (${g.length})</h4>
      <ul>${g.map(p => `<li>${p}</li>`).join('')}</ul>
    </div>
  `).join('');
}

// JSON Export & Import (Standardized Filenames: TeamName_YYYY-MM-DD_HHMM.json)
function buildStandardFilename(extension) {
  const team = getActiveTeam().name.replace(/[^a-zA-Z0-9_-]/g, '_');
  const date = document.getElementById('practice-date').value || new Date().toISOString().split('T')[0];
  const time = (document.getElementById('practice-start-time').value || "18:00").replace(':', '');
  return `${team}_${date}_${time}.${extension}`;
}

function exportJSON() {
  const exportData = {
    team: getActiveTeam(),
    date: document.getElementById('practice-date').value,
    startTime: document.getElementById('practice-start-time').value,
    endTime: document.getElementById('practice-end-time').value,
    schedule: state.schedule,
    bank: state.drillBank
  };

  const blob = new Blob([JSON.stringify(exportData, null, 2)], { type: 'application/json' });
  const a = document.createElement('a');
  a.href = URL.createObjectURL(blob);
  a.download = buildStandardFilename('json');
  a.click();
}

function importJSON(e) {
  const file = e.target.files[0];
  if (!file) return;
  const reader = new FileReader();
  reader.onload = (evt) => {
    try {
      const data = JSON.parse(evt.target.result);
      if (data.schedule) state.schedule = data.schedule;
      if (data.bank) state.drillBank = data.bank;
      if (data.startTime) document.getElementById('practice-start-time').value = data.startTime;
      if (data.endTime) document.getElementById('practice-end-time').value = data.endTime;
      if (data.date) document.getElementById('practice-date').value = data.date;
      saveData();
      renderAll();
      alert('Practice imported successfully!');
    } catch (err) {
      alert('Invalid practice JSON file.');
    }
  };
  reader.readAsText(file);
}

// PDF Export (Standardized Filename: TeamName_YYYY-MM-DD_HHMM.pdf)
function exportPDF() {
  const team = getActiveTeam();
  const date = document.getElementById('practice-date').value;
  const startTime = document.getElementById('practice-start-time').value;
  const endTime = document.getElementById('practice-end-time').value;
  const timed = calculateTiming();

  const win = window.open('', '_blank');
  win.document.write(`
    <!DOCTYPE html>
    <html>
    <head>
      <title>${buildStandardFilename('pdf')}</title>
      <style>
        body { font-family: system-ui, sans-serif; padding: 20px; color: #2c3e50; }
        h1 { margin: 0; font-size: 22px; color: #0d5c91; }
        .meta { margin-bottom: 15px; font-size: 13px; color: #5a6b7c; border-bottom: 2px solid #0d5c91; padding-bottom: 5px; }
        table { width: 100%; border-collapse: collapse; margin-top: 10px; }
        th, td { border: 1px solid #cbd5e1; padding: 8px; text-align: left; font-size: 12px; }
        th { background: #f1f5f9; }
        .equip-box { background: #fef3c7; border: 1px solid #fde68a; padding: 10px; margin-bottom: 15px; border-radius: 4px; font-size: 12px; }
      </style>
    </head>
    <body>
      <h1>${team.name} - Practice Plan</h1>
      <div class="meta">Date: ${date} | Time: ${startTime} - ${endTime}</div>
      
      <div class="equip-box">
        <strong>Master Equipment List:</strong> 
        ${Array.from(new Set(state.schedule.map(i => i.equipment).filter(Boolean))).join(' · ') || 'None specified'}
      </div>

      <table>
        <thead>
          <tr>
            <th>Time</th>
            <th>Dur</th>
            <th>Drill Name</th>
            <th>Tags</th>
            <th>Equipment</th>
            <th>Notes & Cues</th>
          </tr>
        </thead>
        <tbody>
          ${timed.map(i => `
            <tr>
              <td><strong>${i.startFormatted}</strong></td>
              <td>${i.duration}m</td>
              <td><strong>${i.name}</strong></td>
              <td>${i.tags ? i.tags.join(', ') : ''}</td>
              <td>${i.equipment || ''}</td>
              <td>${i.notes ? i.notes.replace(/\n/g, '<br>') : ''}</td>
            </tr>
          `).join('')}
        </tbody>
      </table>
      <script>
        window.onload = () => { window.print(); };
      </script>
    </body>
    </html>
  `);
}

// Chart.js Skill Analytics
let radarChart, barChart;

function initCharts() {
  const radarCtx = document.getElementById('skillRadarChart').getContext('2d');
  const barCtx = document.getElementById('drillBarChart').getContext('2d');

  radarChart = new Chart(radarCtx, {
    type: 'radar',
    data: { labels: DEFAULT_TAGS, datasets: [{ label: 'Minutes', data: [], backgroundColor: 'rgba(13, 92, 145, 0.2)', borderColor: '#0d5c91' }] },
    options: { responsive: true, scales: { r: { beginAtZero: true } } }
  });

  barChart = new Chart(barCtx, {
    type: 'bar',
    data: { labels: [], datasets: [{ label: 'Planned Mins', data: [], backgroundColor: '#5a6b7c' }] },
    options: { responsive: true, scales: { y: { beginAtZero: true } } }
  });

  updateCharts();
}

function updateCharts() {
  if (!radarChart || !barChart) return;

  const tagMins = {};
  DEFAULT_TAGS.forEach(t => tagMins[t] = 0);

  state.schedule.forEach(item => {
    if (item.tags) {
      item.tags.forEach(t => {
        if (tagMins[t] !== undefined) tagMins[t] += item.duration;
      });
    }
  });

  radarChart.data.datasets[0].data = DEFAULT_TAGS.map(t => tagMins[t]);
  radarChart.update();

  barChart.data.labels = state.schedule.map(i => i.name);
  barChart.data.datasets[0].data = state.schedule.map(i => i.duration);
  barChart.update();
}