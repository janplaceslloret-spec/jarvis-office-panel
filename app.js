let departments = [];
let workers = [];
let tasks = [];
let activity = [];
let globalState = { agents: 0, active: 0, tasks: 0, costToday: '$0.00' };

const statusPill = {
  idle: '<span class="pill green">Libre</span>',
  working: '<span class="pill blue">Trabajando</span>',
  review: '<span class="pill amber">Revisión</span>',
  blocked: '<span class="pill red">Bloqueado</span>',
};

async function boot() {
  try {
    const res = await fetch('./live-data.json', { cache: 'no-store' });
    const data = await res.json();
    departments = data.departments || [];
    workers = data.workers || [];
    tasks = data.tasks || [];
    activity = data.activity || [];
    globalState = data.global || globalState;
  } catch (err) {
    console.error('No se pudo cargar live-data.json', err);
  }

  renderHierarchy();
  renderDepartments();
  renderWorkers();
  renderTasks();
  renderFlow();
  renderActivity();
  if (tasks[0]) showTask(tasks[0].id);
}

function renderHierarchy() {
  const root = document.getElementById('hierarchyTree');
  root.innerHTML = `
    <div class="tree-level">
      <div class="tree-card executive"><div class="role">HUMANO</div><div class="name">Jan</div><div class="small">Define objetivos y prioridades</div></div>
    </div>
    <div class="tree-level">
      <div class="tree-card executive"><div class="role">DIRECCIÓN GENERAL</div><div class="name">Jarvis</div><div class="small">Orquesta, delega y exige evidencia</div></div>
    </div>
    <div class="tree-level">
      <div class="tree-card executive"><div class="role">DIRECCIÓN TÉCNICA</div><div class="name">CEO Desarrollo</div><div class="small">Divide el trabajo por campo</div></div>
    </div>
    ${departments.map(dep => `
      <div class="tree-level dept-line"><div class="department-chip">Departamento: ${dep.name}</div></div>
      <div class="tree-level">
        ${workers.filter(w => dep.workers.includes(w.id)).map(w => `
          <div class="tree-card department"><div class="role">WORKER</div><div class="name">${w.name}</div><div class="small">${w.specialty}</div></div>
        `).join('')}
      </div>
    `).join('')}`;
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
          ${depWorkers.map(w => `<span class="mini-worker ${w.status}">${w.name}</span>`).join('')}
        </div>
      </div>`;
  }).join('');
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

function renderActivity() {
  const feed = document.getElementById('activityFeed');
  feed.innerHTML = activity.map(([time, text]) => `<div class="feed-item"><div>${text}</div><div class="time">${time}</div></div>`).join('');
}

function showWorker(workerId) {
  const w = workers.find(x => x.id === workerId);
  if (!w) return;
  const detail = document.getElementById('taskDetail');
  detail.classList.remove('empty-state');
  detail.innerHTML = `
    <div class="detail-header">
      <div>
        <h3>${w.name}</h3>
        <p>${w.role} · ${w.specialty}</p>
      </div>
      <div>
        <span class="code-chip">Modelo: ${w.model}</span>
        <span class="code-chip">Coste real: ${w.cost}</span>
        <span class="code-chip">Ventana: ${w.costWindow || 'últimas 24h'}</span>
      </div>
    </div>
    <div class="detail-grid">
      <div class="detail-block">
        <h4>Estado actual</h4>
        <p>${w.current}</p>
        <p>${statusPill[w.status]}</p>
      </div>
      <div class="detail-block">
        <h4>Cómo está razonando</h4>
        <p>${w.reasoning}</p>
        <p class="small">No se muestra chain-of-thought bruto; sí proceso operativo y trazas de decisión.</p>
      </div>
      <div class="detail-block">
        <h4>Procesos exactos en curso</h4>
        <ul class="clean">${(w.processes || []).map(p => `<li>${p}</li>`).join('')}</ul>
      </div>
      <div class="detail-block">
        <h4>Trazas de decisión</h4>
        ${w.decisionTrace?.length ? w.decisionTrace.map(x => `<div class="trace-line"><strong>·</strong><span>${x}</span></div>`).join('') : '<p>Sin trazas.</p>'}
      </div>
    </div>`;
}

function showTask(taskId) {
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
boot();
