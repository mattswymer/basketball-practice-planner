// State Management
const STORAGE_KEY_TEAMS = 'cyb_teams_v1';
const STORAGE_KEY_BANK = 'cyb_drill_bank_v1';
const STORAGE_KEY_SCHEDULE = 'cyb_active_schedule_v1';

let state = {
  teams: [],
  activeTeamId: null,
  drillBank: [],
  schedule: [],
  schedulesByTeam: {},
  live: {
    active: false,
    currentIndex: 0,
    intervalId: null,
    timeRemainingSec: 0
  }
};


// Defensive storage and rendering helpers
const STORAGE_KEY_ACTIVE_TEAM = 'cyb_active_team_v1';
const STORAGE_KEY_TEAM_SCHEDULES = 'cyb_team_schedules_v1';
const STORAGE_KEY_META = 'cyb_practice_meta_v1';

function readStoredJSON(key, fallback) {
  try {
    const raw = localStorage.getItem(key);
    return raw === null ? fallback : JSON.parse(raw);
  } catch (error) {
    console.warn('Could not read saved app data for ' + key, error);
    return fallback;
  }
}
function makeId(prefix) {
  return prefix + '_' + Date.now().toString(36) + Math.random().toString(36).slice(2, 8);
}
function localDateValue(date) {
  const d = date || new Date();
  const year = d.getFullYear();
  const month = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return year + '-' + month + '-' + day;
}
function escapeHTML(value) {
  return String(value == null ? '' : value).replace(/[&<>"']/g, function(character) {
    return {'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[character];
  });
}
function normalizeDrill(drill, index, scheduled) {
  const item = drill && typeof drill === 'object' ? drill : {};
  const clean = Object.assign({}, item);
  clean.id = typeof item.id === 'string' && item.id ? item.id : makeId('drill' + index);
  clean.name = typeof item.name === 'string' && item.name.trim() ? item.name.trim() : 'Untitled activity';
  clean.duration = Math.max(1, Math.min(240, Math.round(Number(item.duration) || 10)));
  clean.equipment = typeof item.equipment === 'string' ? item.equipment : '';
  clean.notes = typeof item.notes === 'string' ? item.notes : '';
  clean.tags = Array.isArray(item.tags) ? item.tags.filter(function(tag) { return typeof tag === 'string'; }) : [];
  if (scheduled) clean.schedId = typeof item.schedId === 'string' && item.schedId ? item.schedId : makeId('scheduled');
  return clean;
}

// Initialization
document.addEventListener('DOMContentLoaded', () => {
  loadData();
  bindEvents();
  renderAll();
  initCharts();
});

function loadData() {
  const defaultTeams = [
    { id: 't1', name: 'CYB Indian Knoll 3B-2', roster: ['10 Jordan', '12 Alex', '15 Sam', '22 Taylor', '30 Chris'] },
    { id: 't2', name: 'CYB 1B-2 Team', roster: ['3 Morgan', '5 Riley', '11 Casey', '14 Jamie'] }
  ];
  const savedTeams = readStoredJSON(STORAGE_KEY_TEAMS, defaultTeams);
  state.teams = Array.isArray(savedTeams) ? savedTeams.filter(Boolean).map(function(team, index) {
    return {
      id: typeof team.id === 'string' && team.id ? team.id : makeId('team' + index),
      name: typeof team.name === 'string' && team.name.trim() ? team.name.trim() : 'Team ' + (index + 1),
      roster: Array.isArray(team.roster) ? team.roster.map(String) : []
    };
  }) : defaultTeams;
  if (!state.teams.length) state.teams = [{ id: makeId('team'), name: 'My Team', roster: [] }];

  const savedActiveTeamId = localStorage.getItem(STORAGE_KEY_ACTIVE_TEAM);
  state.activeTeamId = state.teams.some(function(team) { return team.id === savedActiveTeamId; })
    ? savedActiveTeamId : state.teams[0].id;

  const savedBank = readStoredJSON(STORAGE_KEY_BANK, null);
  state.drillBank = Array.isArray(savedBank)
    ? savedBank.map(function(drill, index) { return normalizeDrill(drill, index, false); })
    : JSON.parse(JSON.stringify(PRESET_DRILLS));

  const savedSchedulesByTeam = readStoredJSON(STORAGE_KEY_TEAM_SCHEDULES, {});
  state.schedulesByTeam = {};
  if (savedSchedulesByTeam && typeof savedSchedulesByTeam === 'object' && !Array.isArray(savedSchedulesByTeam)) {
    Object.keys(savedSchedulesByTeam).forEach(function(teamId) {
      if (Array.isArray(savedSchedulesByTeam[teamId])) {
        state.schedulesByTeam[teamId] = savedSchedulesByTeam[teamId].map(function(item, index) {
          return normalizeDrill(item, index, true);
        });
      }
    });
  }

  // Migrate the original single-schedule storage into the currently selected team.
  const legacySchedule = readStoredJSON(STORAGE_KEY_SCHEDULE, null);
  if (!Object.prototype.hasOwnProperty.call(state.schedulesByTeam, state.activeTeamId)) {
    state.schedulesByTeam[state.activeTeamId] = Array.isArray(legacySchedule)
      ? legacySchedule.map(function(item, index) { return normalizeDrill(item, index, true); })
      : state.drillBank.slice(0, 5).map(function(drill) {
          const item = JSON.parse(JSON.stringify(drill));
          item.schedId = makeId('scheduled');
          return item;
        });
  }
  state.schedule = JSON.parse(JSON.stringify(state.schedulesByTeam[state.activeTeamId]));

  const meta = readStoredJSON(STORAGE_KEY_META, {});
  document.getElementById('practice-date').value = meta.date || localDateValue();
  document.getElementById('practice-start-time').value = meta.startTime || '18:00';
  document.getElementById('practice-end-time').value = meta.endTime || '19:30';
}
function saveData() {
  try {
    localStorage.setItem(STORAGE_KEY_TEAMS, JSON.stringify(state.teams));
    localStorage.setItem(STORAGE_KEY_ACTIVE_TEAM, state.activeTeamId || '');
    localStorage.setItem(STORAGE_KEY_BANK, JSON.stringify(state.drillBank));
    state.schedulesByTeam[state.activeTeamId] = JSON.parse(JSON.stringify(state.schedule));
    localStorage.setItem(STORAGE_KEY_TEAM_SCHEDULES, JSON.stringify(state.schedulesByTeam));
    localStorage.setItem(STORAGE_KEY_SCHEDULE, JSON.stringify(state.schedule));
    localStorage.setItem(STORAGE_KEY_META, JSON.stringify({
      date: document.getElementById('practice-date').value,
      startTime: document.getElementById('practice-start-time').value,
      endTime: document.getElementById('practice-end-time').value
    }));
  } catch (error) {
    console.error('Could not save the practice planner data.', error);
    alert('The browser could not save your changes. Export a JSON backup before closing this page.');
  }
}

// Event Bindings
function bindEvents() {
  document.getElementById('active-team-select').addEventListener('change', (e) => {
    if (state.live.active) stopLivePractice();
    saveData();
    state.activeTeamId = e.target.value;
    state.schedule = Array.isArray(state.schedulesByTeam[state.activeTeamId])
      ? JSON.parse(JSON.stringify(state.schedulesByTeam[state.activeTeamId])) : [];
    state.live.completed = false;
    state.live.currentIndex = 0;
    saveData();
    renderTeamSelects();
    renderSchedule();
    updateCharts();
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

  document.getElementById('practice-start-time').onchange = () => { saveData(); renderSchedule(); };
  document.getElementById('practice-end-time').onchange = () => { saveData(); renderSchedule(); };
  document.getElementById('practice-date').onchange = saveData;
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

  document.getElementById('bank-list').addEventListener('click', function(event) {
    const card = event.target.closest('[data-drill-id]');
    if (card) addDrillToSchedule(card.dataset.drillId);
  });
  document.getElementById('schedule-board').addEventListener('click', function(event) {
    const control = event.target.closest('[data-action]');
    if (!control) return;
    const action = control.dataset.action;
    if (action === 'edit') openEditModal(control.dataset.id);
    if (action === 'move-up') moveScheduledItem(Number(control.dataset.index), -1);
    if (action === 'move-down') moveScheduledItem(Number(control.dataset.index), 1);
    if (action === 'delete') deleteScheduledItem(control.dataset.id);
  });
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
  activeSelect.innerHTML = state.teams.map(function(team) {
    return '<option value="' + escapeHTML(team.id) + '"' +
      (team.id === state.activeTeamId ? ' selected' : '') + '>' + escapeHTML(team.name) + '</option>';
  }).join('');
  rosterSelect.innerHTML = state.teams.map(function(team) {
    return '<option value="' + escapeHTML(team.id) + '">' + escapeHTML(team.name) + '</option>';
  }).join('');
  rosterSelect.value = state.activeTeamId;
  rosterSelect.onchange = function() {
    const team = state.teams.find(function(item) { return item.id === rosterSelect.value; });
    document.getElementById('team-roster-input').value = team ? team.roster.join('\n') : '';
  };
}

function renderTagFilterOptions() {
  const select = document.getElementById('bank-tag-filter');
  select.innerHTML = '<option value="">All Skill Tags</option>' + DEFAULT_TAGS.map(t => `<option value="${t}">${t.toUpperCase()}</option>`).join('');
}

function renderDrillBank() {
  const search = document.getElementById('bank-search').value.toLowerCase().trim();
  const tagFilter = document.getElementById('bank-tag-filter').value;
  const list = document.getElementById('bank-list');
  const filtered = state.drillBank.filter(function(drill) {
    const searchable = (drill.name + ' ' + (drill.equipment || '') + ' ' + (drill.notes || '')).toLowerCase();
    return searchable.includes(search) && (!tagFilter || drill.tags.includes(tagFilter));
  });
  if (!filtered.length) {
    list.innerHTML = '<div class="empty-state">No drills match those filters.</div>';
    return;
  }
  list.innerHTML = filtered.map(function(drill) {
    return '<button type="button" class="bank-item" data-drill-id="' + escapeHTML(drill.id) + '">' +
      '<span class="bank-item-title"><span>' + escapeHTML(drill.name) + '</span><span>' + drill.duration + 'm</span></span>' +
      '<span class="bank-item-meta">' + drill.tags.map(function(tag) {
        return '<span class="tag-badge">' + escapeHTML(tag) + '</span>';
      }).join('') + '</span></button>';
  }).join('');
}

function getActiveTeam() {
  return state.teams.find(function(team) { return team.id === state.activeTeamId; }) || state.teams[0] || null;
}
function getPracticeWindowMinutes() {
  const start = (document.getElementById('practice-start-time').value || '18:00').split(':').map(Number);
  const end = (document.getElementById('practice-end-time').value || '19:30').split(':').map(Number);
  const startMinutes = start[0] * 60 + start[1];
  const endMinutes = end[0] * 60 + end[1];
  return endMinutes >= startMinutes ? endMinutes - startMinutes : endMinutes + 1440 - startMinutes;
}
function calculateTiming() {
  const start = (document.getElementById('practice-start-time').value || '18:00').split(':').map(Number);
  let currentMinutes = start[0] * 60 + start[1];
  return state.schedule.map(function(item) {
    const itemStart = currentMinutes;
    const itemEnd = currentMinutes + item.duration;
    currentMinutes = itemEnd;
    return Object.assign({}, item, {
      startFormatted: formatMins(itemStart), endFormatted: formatMins(itemEnd),
      startMins: itemStart, endMins: itemEnd
    });
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
  const totalPlanned = state.schedule.reduce(function(total, item) { return total + item.duration; }, 0);
  const allotted = getPracticeWindowMinutes();
  const difference = totalPlanned - allotted;
  const summary = document.getElementById('time-summary-banner');

  if (!allotted) {
    summary.className = 'summary-banner overtime';
    summary.textContent = 'Set an end time later than the start time to calculate the practice window.';
  } else if (difference > 0) {
    summary.className = 'summary-banner overtime';
    summary.textContent = 'Planned: ' + totalPlanned + ' min | Available: ' + allotted + ' min | ' + difference + ' min over.';
  } else if (difference < 0) {
    summary.className = 'summary-banner';
    summary.textContent = 'Planned: ' + totalPlanned + ' min | Available: ' + allotted + ' min | ' + Math.abs(difference) + ' min available.';
  } else {
    summary.className = 'summary-banner';
    summary.textContent = 'Planned: ' + totalPlanned + ' min | Practice fits the allotted window exactly.';
  }

  const focus = document.getElementById('live-drill-detail');
  if (focus) {
    const current = state.schedule[state.live.currentIndex];
    if ((state.live.active || state.live.completed) && current) {
      focus.hidden = false;
      focus.innerHTML = '<h3>' + (state.live.completed ? 'Practice complete: ' : 'Current activity: ') + escapeHTML(current.name) + '</h3>' +
        '<div class="live-detail-meta">' + current.duration + ' min' +
        (current.equipment ? ' · Equipment: ' + escapeHTML(current.equipment) : '') + '</div>' +
        '<p>' + (current.notes ? escapeHTML(current.notes).replace(/\n/g, '<br>') : 'No coaching notes have been added for this activity.') + '</p>';
    } else {
      focus.hidden = true;
      focus.innerHTML = '';
    }
  }

  if (!timedSchedule.length) {
    board.innerHTML = '<div class="empty-state">Your practice is empty. Add activities from the Drill Bank.</div>';
    updateLiveUI();
    return;
  }

  board.innerHTML = timedSchedule.map(function(item, index) {
    const active = state.live.active && index === state.live.currentIndex;
    const next = timedSchedule[index + 1];
    const tags = item.tags.map(function(tag) { return '<span class="tag-badge">' + escapeHTML(tag) + '</span>'; }).join('');
    return '<div class="scheduled-card ' + (active ? 'is-active-drill' : '') + '">' +
      '<div class="left-info"><div class="time-badge">' + item.startFormatted + ' – ' + item.endFormatted + ' (' + item.duration + 'm)</div>' +
      '<div class="drill-details"><button type="button" class="drill-name" data-action="edit" data-id="' + escapeHTML(item.schedId) + '">' +
      escapeHTML(item.name) + '</button><div class="drill-sub">' + tags +
      (item.equipment ? ' | Equipment: ' + escapeHTML(item.equipment) : '') + '</div>' +
      (active && next ? '<div class="next-equip-box"><strong>UP NEXT:</strong> ' + escapeHTML(next.name) +
        (next.equipment ? ' (Need: ' + escapeHTML(next.equipment) + ')' : '') + '</div>' : '') +
      '</div></div><div class="card-actions">' +
      '<button type="button" class="btn btn-sm" data-action="move-up" data-index="' + index + '"' + (index === 0 ? ' disabled' : '') + '>▲</button>' +
      '<button type="button" class="btn btn-sm" data-action="move-down" data-index="' + index + '"' + (index === timedSchedule.length - 1 ? ' disabled' : '') + '>▼</button>' +
      '<button type="button" class="btn btn-sm btn-danger" data-action="delete" data-id="' + escapeHTML(item.schedId) + '">Remove</button>' +
      '</div></div>';
  }).join('');
  updateLiveUI();
}

// Schedule Operations
function addDrillToSchedule(bankId) {
  const drill = state.drillBank.find(function(item) { return item.id === bankId; });
  if (!drill) return;
  const added = JSON.parse(JSON.stringify(drill));
  added.schedId = makeId('scheduled');
  state.schedule.push(added);
  saveData();
  renderSchedule();
}
function moveScheduledItem(index, direction) {
  const nextIndex = index + direction;
  if (nextIndex < 0 || nextIndex >= state.schedule.length) return;
  const currentIndex = state.live.currentIndex;
  const swap = state.schedule[index];
  state.schedule[index] = state.schedule[nextIndex];
  state.schedule[nextIndex] = swap;
  if (state.live.active) {
    if (currentIndex === index) state.live.currentIndex = nextIndex;
    else if (currentIndex === nextIndex) state.live.currentIndex = index;
    resetLiveDrillTimer();
  }
  saveData();
  renderSchedule();
}
function deleteScheduledItem(schedId) {
  const removedIndex = state.schedule.findIndex(function(item) { return item.schedId === schedId; });
  if (removedIndex < 0) return;
  state.schedule.splice(removedIndex, 1);

  if (state.live.active) {
    if (!state.schedule.length) {
      stopLivePractice();
      saveData();
      return;
    }
    if (removedIndex < state.live.currentIndex) state.live.currentIndex--;
    else if (removedIndex === state.live.currentIndex) {
      state.live.currentIndex = Math.min(state.live.currentIndex, state.schedule.length - 1);
    }
    resetLiveDrillTimer();
  } else if (!state.schedule.length) {
    state.live.completed = false;
    state.live.currentIndex = 0;
  } else if (state.live.completed) {
    state.live.currentIndex = Math.min(state.live.currentIndex, state.schedule.length - 1);
  }

  saveData();
  renderSchedule();
}

function fitToAllottedTime() {
  const target = getPracticeWindowMinutes();
  if (!target || !state.schedule.length) {
    alert('Set a valid practice window and add at least one activity first.');
    return;
  }
  if (target < state.schedule.length) {
    alert('There are more activities than available minutes. Remove activities or extend the practice window.');
    return;
  }

  const weights = state.schedule.map(function(item) { return Math.max(1, Number(item.duration) || 1); });
  const totalWeight = weights.reduce(function(sum, value) { return sum + value; }, 0);
  const quotas = weights.map(function(value) { return target * value / totalWeight; });
  const durations = quotas.map(function(value) { return Math.max(1, Math.floor(value)); });
  let difference = target - durations.reduce(function(sum, value) { return sum + value; }, 0);

  while (difference > 0) {
    let best = 0;
    for (let i = 1; i < quotas.length; i++) {
      if (quotas[i] - Math.floor(quotas[i]) > quotas[best] - Math.floor(quotas[best])) best = i;
    }
    durations[best]++;
    quotas[best] = Math.floor(quotas[best]);
    difference--;
  }
  while (difference < 0) {
    let best = -1;
    let overage = -Infinity;
    for (let i = 0; i < durations.length; i++) {
      if (durations[i] > 1 && durations[i] - quotas[i] > overage) {
        best = i;
        overage = durations[i] - quotas[i];
      }
    }
    if (best < 0) break;
    durations[best]--;
    difference++;
  }

  state.schedule.forEach(function(item, index) { item.duration = durations[index]; });
  if (state.live.active) resetLiveDrillTimer();
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
  const name = document.getElementById('edit-item-name').value.trim();
  const durationInput = parseInt(document.getElementById('edit-item-duration').value, 10);
  const duration = Math.max(1, Math.min(120, Number.isFinite(durationInput) ? durationInput : 5));
  const equipment = document.getElementById('edit-item-equipment').value.trim();
  const notes = document.getElementById('edit-item-notes').value;
  const selectedTags = Array.from(document.querySelectorAll('.tag-check:checked')).map(function(cb) { return cb.value; });

  if (!name) {
    alert('Enter a name for this activity.');
    document.getElementById('edit-item-name').focus();
    return;
  }

  if (id === 'NEW_BANK') {
    state.drillBank.push({
      id: makeId('drill'), name: name, duration: duration,
      equipment: equipment, notes: notes, tags: selectedTags
    });
  } else {
    const itemIndex = state.schedule.findIndex(function(item) { return item.schedId === id; });
    const item = state.schedule[itemIndex];
    if (item) {
      item.name = name;
      item.duration = duration;
      item.equipment = equipment;
      item.notes = notes;
      item.tags = selectedTags;
      if (state.live.active && itemIndex === state.live.currentIndex) resetLiveDrillTimer();
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
    return;
  }
  if (!state.schedule.length) {
    alert('Add at least one activity before starting practice.');
    return;
  }
  state.live.active = true;
  state.live.completed = false;
  state.live.currentIndex = 0;
  resetLiveDrillTimer();
  state.live.intervalId = setInterval(tickLiveTimer, 250);
  renderSchedule();
}
function resetLiveDrillTimer() {
  const current = state.schedule[state.live.currentIndex];
  if (!current) return;
  state.live.endAt = Date.now() + current.duration * 60 * 1000;
  state.live.timeRemainingSec = current.duration * 60;
  updateTimerDisplay();
}
function tickLiveTimer() {
  if (!state.live.active) return;
  state.live.timeRemainingSec = Math.max(0, Math.ceil((state.live.endAt - Date.now()) / 1000));
  if (state.live.timeRemainingSec <= 0) {
    if (state.live.currentIndex < state.schedule.length - 1) {
      stepLiveDrill(1);
      return;
    }
    state.live.active = false;
    state.live.completed = true;
    clearInterval(state.live.intervalId);
    state.live.intervalId = null;
    state.live.timeRemainingSec = 0;
    renderSchedule();
    return;
  }
  updateTimerDisplay();
}
function updateTimerDisplay() {
  const seconds = Math.max(0, state.live.timeRemainingSec || 0);
  document.getElementById('live-timer-readout').textContent =
    Math.floor(seconds / 60) + ':' + String(seconds % 60).padStart(2, '0');
}
function stepLiveDrill(direction) {
  if (!state.live.active) return;
  const nextIndex = state.live.currentIndex + direction;
  if (nextIndex < 0 || nextIndex >= state.schedule.length) return;
  state.live.currentIndex = nextIndex;
  resetLiveDrillTimer();
  renderSchedule();
}
function updateLiveUI() {
  const start = document.getElementById('btn-start-practice');
  const stop = document.getElementById('btn-stop-practice');
  const previous = document.getElementById('btn-prev-drill');
  const next = document.getElementById('btn-next-drill');
  document.getElementById('live-indicator').classList.toggle('active', state.live.active);
  document.getElementById('live-status-text').textContent = state.live.active
    ? 'Live Practice Running' : (state.live.completed ? 'Practice Complete' : 'Practice Offline');
  start.style.display = state.live.active ? 'none' : 'inline-block';
  start.textContent = state.live.completed ? 'Restart Practice' : 'Start Live Practice';
  stop.style.display = state.live.active || state.live.completed ? 'inline-block' : 'none';
  stop.textContent = state.live.completed ? 'Reset' : 'End Practice';
  previous.disabled = !state.live.active || state.live.currentIndex <= 0;
  next.disabled = !state.live.active || state.live.currentIndex >= state.schedule.length - 1;
  if (state.live.active) updateTimerDisplay();
  else document.getElementById('live-timer-readout').textContent = state.live.completed ? '0:00' : '--:--';
}
function stopLivePractice() {
  clearInterval(state.live.intervalId);
  state.live.intervalId = null;
  state.live.active = false;
  state.live.completed = false;
  state.live.currentIndex = 0;
  state.live.endAt = null;
  state.live.timeRemainingSec = 0;
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
          <strong>${escapeHTML(equip)}</strong>
          <span style="font-size:11px; color:#7f8c8d;">(Needed for: ${drills.map(escapeHTML).join(', ')})</span>
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
  if (state.live.active) stopLivePractice();
  const newTeam = { id: makeId('team'), name: name, roster: [] };
  state.teams.push(newTeam);
  state.schedulesByTeam[newTeam.id] = [];
  state.activeTeamId = newTeam.id;
  state.schedule = [];
  state.live.completed = false;
  state.live.currentIndex = 0;
  document.getElementById('new-team-name').value = '';
  document.getElementById('team-roster-input').value = '';
  saveData();
  renderTeamSelects();
  renderSchedule();
  updateCharts();
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

  const shuffled = [...team.roster];
  for (let i = shuffled.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
  }
  const groups = Array.from({ length: count }, () => []);

  shuffled.forEach((player, i) => {
    groups[i % count].push(player);
  });

  container.innerHTML = groups.map((g, idx) => `
    <div class="group-card">
      <h4>Group ${idx + 1} (${g.length})</h4>
      <ul>${g.map(p => `<li>${escapeHTML(p)}</li>`).join('')}</ul>
    </div>
  `).join('');
}

// JSON Export & Import (Standardized Filenames: TeamName_YYYY-MM-DD_HHMM.json)
function buildStandardFilename(extension) {
  const activeTeam = getActiveTeam();
  const team = (activeTeam ? activeTeam.name : 'Team').replace(/[^a-zA-Z0-9_-]/g, '_');
  const date = document.getElementById('practice-date').value || localDateValue();
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

function importJSON(event) {
  const file = event.target.files && event.target.files[0];
  if (!file) return;
  const reader = new FileReader();
  reader.onload = function(loadEvent) {
    try {
      const data = JSON.parse(loadEvent.target.result);
      if (!data || typeof data !== 'object' || !Array.isArray(data.schedule)) {
        throw new Error('This file is not a valid practice plan.');
      }
      state.schedule = data.schedule.map(function(item, index) {
        if (!item || typeof item.name !== 'string' || !item.name.trim()) {
          throw new Error('A scheduled activity is missing its name.');
        }
        return normalizeDrill(item, index, true);
      });
      if (Array.isArray(data.bank)) {
        state.drillBank = data.bank.map(function(item, index) { return normalizeDrill(item, index, false); });
      }
      if (data.team && typeof data.team.name === 'string' && data.team.name.trim()) {
        let team = state.teams.find(function(existing) {
          return existing.name.toLowerCase() === data.team.name.trim().toLowerCase();
        });
        if (!team) {
          team = {
            id: makeId('team'), name: data.team.name.trim(),
            roster: Array.isArray(data.team.roster) ? data.team.roster.map(String) : []
          };
          state.teams.push(team);
        }
        state.activeTeamId = team.id;
      }
      if (typeof data.startTime === 'string') document.getElementById('practice-start-time').value = data.startTime;
      if (typeof data.endTime === 'string') document.getElementById('practice-end-time').value = data.endTime;
      if (typeof data.date === 'string') document.getElementById('practice-date').value = data.date;
      stopLivePractice();
      saveData();
      renderAll();
      alert('Practice imported successfully.');
    } catch (error) {
      console.error('Practice import failed:', error);
      alert('Could not import this file. Make sure it is a valid Basketball Practice Planner JSON export.');
    } finally {
      event.target.value = '';
    }
  };
  reader.onerror = function() {
    alert('The selected file could not be read.');
    event.target.value = '';
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
  if (!win) {
    alert('Allow pop-ups for this page to print the practice plan.');
    return;
  }
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
      <h1>${escapeHTML(team ? team.name : 'Team')} - Practice Plan</h1>
      <div class="meta">Date: ${escapeHTML(date)} | Time: ${escapeHTML(startTime)} - ${escapeHTML(endTime)}</div>
      
      <div class="equip-box">
        <strong>Master Equipment List:</strong> 
        ${Array.from(new Set(state.schedule.map(i => i.equipment).filter(Boolean))).map(escapeHTML).join(' · ') || 'None specified'}
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
              <td><strong>${escapeHTML(i.name)}</strong></td>
              <td>${i.tags ? i.tags.map(escapeHTML).join(', ') : ''}</td>
              <td>${escapeHTML(i.equipment || '')}</td>
              <td>${i.notes ? escapeHTML(i.notes).replace(/\n/g, '<br>') : ''}</td>
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
  if (typeof Chart === 'undefined') {
    document.querySelector('.analytics-grid').innerHTML = '<div class="empty-state">Skill charts are unavailable while the chart library cannot be reached. The planner and practice timer still work.</div>';
    return;
  }
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