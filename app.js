let departments = [];
let workers = [];
let tasks = [];
let activity = [];
let globalState = { agents: 0, active: 0, tasks: 0, costToday: '$0.00' };

function showUiError(title, err) {
  const detail = document.getElementById('taskDetail');
  if (!detail) return;
  detail.classList.remove('empty-state');
  detail.innerHTML = `
    <div class="detail-block" style="border-color: rgba(239,68,68,.35)">
      <h3 style="margin:0 0 8px 0;">${escapeHtml(title)}</h3>
      <p class="small">${escapeHtml((err && (err.stack || err.message)) ? (err.stack || err.message) : String(err || ''))}</p>
      <p class="small">Si ves esto, es un bug JS del panel (no del dato). Me lo dices y lo arreglo.</p>
    </div>`;
}

window.addEventListener('error', (e) => {
  showUiError('Error del panel', e.error || e.message);
});

const statusPill = {
  idle: '<span class="pill green">Libre</span>',
  working: '<span class="pill blue">Trabajando</span>',
  review: '<span class="pill amber">Revisión</span>',
  blocked: '<span class="pill red">Bloqueado</span>',
};

async function loadLiveData() {
  const res = await fetch('./live-data.json', { cache: 'no-store' });
  return res.json();
}

async function boot() {
  try {
    const data = await loadLiveData();
    departments = data.departments || [];
    workers = data.workers || [];
    tasks = data.tasks || [];
    activity = data.activity || [];
    globalState = data.global || globalState;
  } catch (err) {
    console.error('No se pudo cargar live-data.json', err);
  }

  renderAll();
  // Selección inicial: primera tarea si no hay nada seleccionado
  if (!selectedWorkerId && !selectedTaskId && tasks[0]) showTask(tasks[0].id);
}

function renderAll() {
  renderHierarchy();
  renderDepartments();
  renderWorkers();
  renderTasks();
  renderFlow();
  renderActivity();
  // No forzar selección aquí: si no, rompe el click en agentes y el estado actual de la UI.
}

function renderHierarchy() {
  const root = document.getElementById('hierarchyTree');
  root.innerHTML = `
    <div class="tree-level">
      <div class="tree-card executive"><div class="role">HUMANO</div><div class="name">Jan</div><div class="small">Define objetivos y prioridades</div></div>
    </div>
    <div class="tree-level">
      <div class="tree-card executive clickable" data-worker-id="main"><div class="role">DIRECCIÓN GENERAL</div><div class="name">Jarvis</div><div class="small">(clic) Ver actividad real</div></div>
    </div>
    <div class="tree-level">
      <div class="tree-card executive clickable" data-worker-id="dev-cto"><div class="role">DIRECCIÓN TÉCNICA</div><div class="name">CEO Desarrollo</div><div class="small">(clic) Ver actividad real</div></div>
    </div>
    ${departments.map(dep => `
      <div class="tree-level dept-line"><div class="department-chip">Departamento: ${dep.name}</div></div>
      <div class="tree-level">
        ${workers.filter(w => dep.workers.includes(w.id)).map(w => `
          <div class="tree-card department clickable" data-worker-id="${w.id}"><div class="role">WORKER</div><div class="name">${w.name}</div><div class="small">(clic) ${w.specialty}</div></div>
        `).join('')}
      </div>
    `).join('')}`;

  root.querySelectorAll('[data-worker-id]').forEach(el => {
    el.addEventListener('click', () => showWorker(el.dataset.workerId));
  });
}

function renderDepartments() {
  const container = document.getElementById('departmentsGrid');
  if (!container) return;
  container.innerHTML = departments.map(dep => {
    const depWorkers = workers.filter(w => dep.workers.includes(w.id));
    return `
      <div class="department-card ${dep.color}">
        <div class="department-head">
          <div>
            <div class="section-kicker">DEPARTMENT</div>
            <h3>${dep.name}</h3>
          </div>
          <div class="department-lead">Lead: ${dep.lead}</div>
        </div>
        <p class="small">${dep.mission}</p>
        <div class="department-workers">
          ${depWorkers.map(w => `<span class="mini-worker ${w.status}" data-worker-id="${w.id}">${w.name}</span>`).join('')}
        </div>
      </div>`;
  }).join('');

  container.querySelectorAll('[data-worker-id]').forEach(el => {
    el.addEventListener('click', () => showWorker(el.dataset.workerId));
  });
}

function renderWorkers() {
  const grid = document.getElementById('workersGrid');
  grid.innerHTML = workers.map(w => `
    <div class="worker-card" data-worker-id="${w.id}">
      <h3>${w.name}</h3>
      <div class="small">${w.role}</div>
      <p class="small">${w.specialty}</p>
      <p>${w.current}</p>
      <div class="cost-row">
        <span>${w.model}</span>
        <strong>${w.cost}</strong>
      </div>
      <div class="small">Coste real · ${w.costWindow || 'últimas 24h'}</div>
      <div class="worker-footer">
        ${statusPill[w.status]}
        <span class="small">${w.delegationRule}</span>
      </div>
      <div class="process-preview">
        ${w.processes.slice(0, 3).map(p => `<span class="code-chip">${p}</span>`).join('')}
      </div>
    </div>`).join('');

  document.getElementById('statAgents').textContent = globalState.agents || workers.length;
  document.getElementById('statBusy').textContent = globalState.active || workers.filter(w => w.status === 'working' || w.status === 'review').length;
  document.getElementById('statTasks').textContent = globalState.tasks || tasks.length;
  document.getElementById('statCost').textContent = globalState.costToday || '$0.00';

  document.querySelectorAll('.worker-card').forEach(el => el.addEventListener('click', () => showWorker(el.dataset.workerId)));
}

function taskCard(task) {
  return `
    <div class="task-card" data-task-id="${task.id}">
      <h4>${task.title}</h4>
      <p>${task.description}</p>
      <div class="task-meta">
        <span>${task.owner}</span>
        <span>${task.priority}</span>
      </div>
    </div>`;
}

function renderTasks() {
  const map = { inbox: [], delegated: [], doing: [], done: [] };
  tasks.forEach(t => map[t.stage].push(taskCard(t)));
  document.getElementById('colInbox').innerHTML = map.inbox.join('');
  document.getElementById('colDelegated').innerHTML = map.delegated.join('');
  document.getElementById('colDoing').innerHTML = map.doing.join('');
  document.getElementById('colDone').innerHTML = map.done.join('');

  document.querySelectorAll('.task-card').forEach(el => el.addEventListener('click', () => showTask(el.dataset.taskId)));
}

function renderFlow() {
  const flow = document.getElementById('delegationFlow');
  const task = tasks[0];
  if (!task) return;
  flow.innerHTML = task.chain.map((step, i) => `${i ? '<div class="flow-arrow">→</div>' : ''}<div class="flow-step">${step}</div>`).join('');
}

function relativeTime(isoTs) {
  try {
    const dt = new Date(isoTs);
    const secs = Math.max(0, Math.floor((Date.now() - dt.getTime()) / 1000));
    if (secs < 60) return 'Ahora';
    const mins = Math.floor(secs / 60);
    if (mins < 60) return `Hace ${mins} min`;
    const hrs = Math.floor(mins / 60);
    return `Hace ${hrs} h`;
  } catch {
    return '';
  }
}

function renderActivity() {
  const feed = document.getElementById('activityFeed');
  // activity ahora puede venir como [label,text] o como eventos por ts
  feed.innerHTML = (activity || []).map((row) => {
    // soporta: ["Hace 5 min", "texto"] o {ts,text}
    if (Array.isArray(row)) {
      return `<div class="feed-item"><div>${escapeHtml(row[1] || '')}</div><div class="time">${escapeHtml(row[0] || '')}</div></div>`;
    }
    const when = row.ts ? relativeTime(row.ts) : '';
    return `<div class="feed-item"><div>${escapeHtml(row.text || '')}</div><div class="time">${escapeHtml(when)}</div></div>`;
  }).join('');
}

function fmtTime(isoTs) {
  try {
    const dt = new Date(isoTs);
    return dt.toLocaleString();
  } catch {
    return isoTs;
  }
}

function escapeHtml(s) {
  return (s || '').toString().replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
}

function clearSelectionHighlights() {
  document.querySelectorAll('.worker-card.selected, .tree-card.selected, .mini-worker.selected').forEach(el => {
    el.classList.remove('selected');
  });
}

function highlightWorker(workerId) {
  clearSelectionHighlights();
  document.querySelectorAll(`[data-worker-id="${workerId}"]`).forEach(el => el.classList.add('selected'));
}

function showWorker(workerId) {
  try {
    selectedWorkerId = workerId;
    selectedTaskId = null;
    highlightWorker(workerId);

    const w = workers.find(x => x.id === workerId);
    if (!w) {
      showUiError('No se encontró el agente', `workerId=${workerId} (workers cargados: ${workers.map(x=>x.id).join(', ')})`);
      return;
    }
    const detail = document.getElementById('taskDetail');
    detail.classList.remove('empty-state');

    const events = (w.events || []).slice().reverse(); // newest first
    const eventRows = events.map(e => {
    const kind = e.kind || 'event';
    if (kind === 'tool_call') {
      return `<div class="trace-line"><strong>${fmtTime(e.ts)}</strong><span><span class="code-chip">tool_call</span> <b>${escapeHtml(e.tool)}</b> <span class="small">${escapeHtml(e.args || '')}</span></span></div>`;
    }
    if (kind === 'tool_result') {
      return `<div class="trace-line"><strong>${fmtTime(e.ts)}</strong><span><span class="code-chip">tool_result</span> <b>${escapeHtml(e.tool || '')}</b> <span class="small">${escapeHtml(e.text || '')}</span></span></div>`;
    }
    if (kind === 'assistant') {
      return `<div class="trace-line"><strong>${fmtTime(e.ts)}</strong><span><span class="code-chip">assistant</span> ${escapeHtml(e.text || '')}</span></div>`;
    }
    if (kind === 'user') {
      return `<div class="trace-line"><strong>${fmtTime(e.ts)}</strong><span><span class="code-chip">user</span> ${escapeHtml(e.text || '')}</span></div>`;
    }
    return `<div class="trace-line"><strong>${fmtTime(e.ts)}</strong><span>${escapeHtml(JSON.stringify(e))}</span></div>`;
  }).join('') || '<p>Sin eventos reales visibles en la última sesión.</p>';

  detail.innerHTML = `
    <div class="detail-header">
      <div>
        <h3>${escapeHtml(w.name)}</h3>
        <p>${escapeHtml(w.role)} · ${escapeHtml(w.specialty)}</p>
      </div>
      <div>
        <span class="code-chip">Modelo: ${escapeHtml(w.model)}</span>
        <span class="code-chip">Coste: ${escapeHtml(w.cost)}</span>
        <span class="code-chip">Ventana: ${escapeHtml(w.costWindow || '')}</span>
      </div>
    </div>
    <div class="detail-grid">
      <div class="detail-block">
        <h4>Estado real</h4>
        <p>${escapeHtml(w.current)}</p>
        <p>${statusPill[w.status]}</p>
        <p class="small">Estado calculado solo con evidencia reciente (tool_call/tool_result), sin inferencias.</p>
      </div>
      <div class="detail-block">
        <h4>Último razonamiento visible</h4>
        <p>${escapeHtml(w.reasoning || '')}</p>
        <p class="small">Esto NO es chain-of-thought oculto. Es el último texto visible del log.</p>
      </div>
      <div class="detail-block" style="grid-column: span 2;">
        <h4>Qué está haciendo exactamente (eventos reales)</h4>
        <div class="activity-feed" style="max-height: 340px;">${eventRows}</div>
      </div>
    </div>`;

  // UX: llevarte al detalle para que sea obvio que "sí pasó algo"
  detail.scrollIntoView({ behavior: 'smooth', block: 'start' });

  } catch (err) {
    showUiError('Error al abrir agente', err);
  }
}

function showTask(taskId) {
  selectedTaskId = taskId;
  selectedWorkerId = null;
  const task = tasks.find(t => t.id === taskId);
  if (!task) return;

  document.getElementById('heroTaskTitle').textContent = task.title;
  document.getElementById('heroTaskText').textContent = task.description;

  const detail = document.getElementById('taskDetail');
  detail.classList.remove('empty-state');
  detail.innerHTML = `
    <div class="detail-header">
      <div>
        <h3>${task.title}</h3>
        <p>${task.description}</p>
      </div>
      <div>
        <span class="code-chip">Owner: ${task.owner}</span>
        <span class="code-chip">Prioridad: ${task.priority}</span>
        <span class="code-chip">Coste: ${task.cost}</span>
      </div>
    </div>

    <div class="detail-grid">
      <div class="detail-block">
        <h4>Cadena jerárquica</h4>
        <ul class="clean">${task.chain.map(x => `<li>${x}</li>`).join('')}</ul>
      </div>
      <div class="detail-block">
        <h4>Subtareas</h4>
        <ul class="clean">${task.subtasks.map(x => `<li>${x}</li>`).join('')}</ul>
      </div>
      <div class="detail-block">
        <h4>Razonamiento resumido</h4>
        <p>${task.reasoningSummary}</p>
      </div>
      <div class="detail-block">
        <h4>Bloqueos</h4>
        ${task.blockers.length ? `<ul class="clean">${task.blockers.map(x => `<li>${x}</li>`).join('')}</ul>` : '<p>Sin bloqueos.</p>'}
      </div>
      <div class="detail-block">
        <h4>Evidencia</h4>
        ${task.evidence.length ? `<ul class="clean">${task.evidence.map(x => `<li>${x}</li>`).join('')}</ul>` : '<p>Sin evidencia todavía.</p>'}
      </div>
      <div class="detail-block">
        <h4>Live trace</h4>
        ${task.liveTrace.length ? task.liveTrace.map(([a,b]) => `<div class="trace-line"><strong>${a}</strong><span>${b}</span></div>`).join('') : '<p>Sin trazas todavía.</p>'}
      </div>
    </div>`;
}

function createTask() {
  const text = document.getElementById('taskInput').value.trim();
  if (!text) return;
  const priority = document.getElementById('priorityInput').value;
  const route = document.getElementById('routeInput').value;
  const task = {
    id: crypto.randomUUID(),
    title: text.length > 54 ? text.slice(0, 54) + '…' : text,
    description: text,
    priority,
    stage: 'inbox',
    owner: route === 'Jarvis' ? 'Jan' : route,
    chain: route === 'Jarvis' ? ['Jan', 'Jarvis'] : ['Jan', route],
    subtasks: ['Pendiente de delegación'],
    blockers: [],
    updates: ['Tarea recién creada'],
    evidence: [],
    reasoningSummary: 'Tarea nueva pendiente de reparto.',
    cost: '$0.00',
    liveTrace: [['Entrada', 'Tarea creada desde el panel.']]
  };
  tasks.unshift(task);
  activity.unshift(['Ahora', `Nueva misión creada: ${task.title}`]);
  document.getElementById('taskInput').value = '';
  renderTasks();
  renderActivity();
  showTask(task.id);
}

document.getElementById('createTaskBtn').addEventListener('click', createTask);
let selectedWorkerId = null;
let selectedTaskId = null;

function preserveSelection() {
  // If user is viewing a worker, keep it after refresh
  if (selectedWorkerId) showWorker(selectedWorkerId);
  else if (selectedTaskId) showTask(selectedTaskId);
}

async function refreshLoop() {
  try {
    const data = await loadLiveData();
    departments = data.departments || departments;
    workers = data.workers || workers;
    tasks = data.tasks || tasks;
    activity = data.activity || activity;
    globalState = data.global || globalState;
    // re-render lists
    renderAll();
    preserveSelection();
  } catch (e) {
    // keep last render
  }
}

setInterval(() => {
  renderActivity();
}, 30_000);

setInterval(() => {
  refreshLoop();
}, 20_000);

boot();
