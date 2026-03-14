const departments = [
  {
    id: 'development',
    name: 'Development',
    lead: 'CEO Desarrollo',
    mission: 'Construir, corregir, validar y estabilizar el sistema técnico.',
    color: 'cyan',
    workers: ['dev-cto', 'dev-n8n', 'dev-backend', 'dev-web', 'dev-qa'],
  },
];

const workers = [
  {
    id: 'jarvis',
    name: 'Jarvis',
    role: 'Director general',
    department: 'executive',
    status: 'working',
    model: 'openai-codex/gpt-5.4',
    specialty: 'Dirección, priorización, revisión y síntesis',
    current: 'Coordinar estabilidad del sistema de mods y diseño del panel oficina',
    cost: '$0.21',
    reasoning: 'Recibe la orden, decide si delega, define el nivel de exigencia y pide evidencia antes de cerrar.',
    delegationRule: 'Nunca asumir desarrollo directo salvo excepción.',
    processes: [
      'Analizando petición de Jan',
      'Decidiendo si delega o ejecuta directo',
      'Asignando al CEO de desarrollo',
      'Revisando evidencia y estado del equipo',
      'Preparando actualización ejecutiva para Jan'
    ]
  },
  {
    id: 'dev-cto',
    name: 'CEO Desarrollo',
    role: 'Dirección técnica',
    department: 'development',
    status: 'working',
    model: 'openai-codex/gpt-5.4',
    specialty: 'Arquitectura, reparto técnico, criterio de ejecución',
    current: 'Separar ownership entre n8n y QA con evidencia por worker',
    cost: '$0.18',
    reasoning: 'Traduce el objetivo en líneas de trabajo, divide por campo y valida si los workers están devolviendo entregables reales.',
    delegationRule: 'No ejecutar el fix principal; obligar a delegación real.',
    processes: [
      'Leyendo misión enviada por Jarvis',
      'Dividiendo el problema en flujos n8n + validación QA',
      'Activando workers por especialidad',
      'Comparando resultados por worker',
      'Escalando bloqueos a Jarvis'
    ]
  },
  {
    id: 'dev-n8n',
    name: 'dev-n8n',
    role: 'Workflow engineer',
    department: 'development',
    status: 'blocked',
    model: 'openrouter/qwen/qwen3-coder:free',
    specialty: 'n8n, tools, automatización, payloads',
    current: 'Bloqueado por acceso/API; pendiente de ownership técnico real',
    cost: '$0.03',
    reasoning: 'Debe blindar la cadena conversacional, los payloads y el contrato de salida entre workflows.',
    delegationRule: 'Solo toca workflows y lógica de orquestación.',
    processes: [
      'Intentando leer workflow SERVER MANAGER por API',
      'Intentando leer INSTALL_MODS por API',
      'Validando credenciales y headers',
      'Pendiente de acceso efectivo para aplicar cambios'
    ]
  },
  {
    id: 'dev-backend',
    name: 'dev-backend',
    role: 'Backend engineer',
    department: 'development',
    status: 'idle',
    model: 'openrouter/qwen/qwen3-coder:free',
    specialty: 'APIs, contratos, persistencia, eventos',
    current: 'Disponible para integrar datos reales en el panel',
    cost: '$0.00',
    reasoning: 'Sería el dueño natural de exponer estados, eventos y costes si se conecta esto a back real.',
    delegationRule: 'No tocar frontend si no hace falta.',
    processes: [
      'Sin proceso activo',
      'Esperando asignación o integración de eventos'
    ]
  },
  {
    id: 'dev-web',
    name: 'dev-web',
    role: 'Frontend engineer',
    department: 'development',
    status: 'working',
    model: 'openrouter/qwen/qwen3-coder:free',
    specialty: 'Interfaz, experiencia visual, paneles',
    current: 'Construcción del panel visual tipo oficina / war room',
    cost: '$0.06',
    reasoning: 'Convierte estructura, delegación y actividad del equipo en una interfaz operativa y clara.',
    delegationRule: 'No tocar ownership técnico de n8n.',
    processes: [
      'Diseñando layout de war room',
      'Agrupando equipo por departamentos',
      'Pintando jerarquía y delegación',
      'Añadiendo detalle visual de procesos por agente',
      'Preparando vista para datos live'
    ]
  },
  {
    id: 'dev-qa',
    name: 'dev-qa',
    role: 'QA / Validación',
    department: 'development',
    status: 'review',
    model: 'openrouter/qwen/qwen3-coder:free',
    specialty: 'E2E, regresión, evidencia por ejecución',
    current: 'Validando casos reales del flujo de instalación de mods',
    cost: '$0.04',
    reasoning: 'No asume que algo funciona; compara intención, tool call, payload, ejecución y respuesta final.',
    delegationRule: 'Sin evidencia, no hay cierre.',
    processes: [
      'Preparando caso de prueba E2E',
      'Enviando mensaje al SERVER MANAGER',
      'Verificando tool call real',
      'Comprobando payload enviado a INSTALL_MODS',
      'Comparando respuesta final con ejecución real'
    ]
  },
];

const tasks = [
  {
    id: crypto.randomUUID(),
    title: 'Fiabilidad total al instalar mods',
    description: 'Que instalar mods funcione siempre, con tool call obligatorio, payload limpio y respuesta final consistente.',
    priority: 'Crítica',
    stage: 'doing',
    owner: 'Jarvis',
    chain: ['Jan', 'Jarvis', 'CEO Desarrollo', 'dev-n8n', 'dev-qa'],
    subtasks: [
      'Blindar la cadena SERVER MANAGER → INSTALL_MODS',
      'Eliminar omisión de tool',
      'Filtrar payloads sucios (.jar, fabricloader, mixinextras, etc.)',
      'Validar repetición estable en varios casos'
    ],
    blockers: ['dev-n8n bloqueado por acceso/API'],
    updates: [
      'QA validó una instalación E2E correcta con Just Enough Items',
      'Todavía no está demostrado que funcione siempre en repetición'
    ],
    evidence: [
      'Ejecuciones success en cadena: SERVER MANAGER + INSTALL_MODS + SSH + Supabase',
      'Payload limpio en caso JEI',
      'Respuesta final coherente con la instalación real'
    ],
    reasoningSummary: 'Jarvis no cierra el tema con una sola prueba buena. Exige repetición, ownership correcto y evidencia por worker.',
    cost: '$0.31',
    liveTrace: [
      ['Entrada', 'Jan pide que funcione siempre.'],
      ['Delegación', 'Jarvis lo pasa al CEO de desarrollo.'],
      ['Reparto', 'CTO separa n8n y QA.'],
      ['Validación', 'QA ejecuta caso real con JEI.'],
      ['Estado', 'Mejora clara, pero no cierre definitivo.']
    ]
  },
  {
    id: crypto.randomUUID(),
    title: 'Panel oficina visual',
    description: 'Crear una web bonita, moderna y útil para ver jerarquía, delegación, estados, costes y trazabilidad.',
    priority: 'Alta',
    stage: 'doing',
    owner: 'Jarvis',
    chain: ['Jan', 'Jarvis', 'dev-web'],
    subtasks: [
      'Diseñar war room moderno',
      'Mostrar jerarquía y delegación',
      'Añadir coste, razonamiento resumido y detalle de tarea'
    ],
    blockers: [],
    updates: [
      'MVP ya visible por URL pública',
      'Ahora agrupando agentes por departamentos y mostrando procesos exactos'
    ],
    evidence: [
      'Proyecto separado en repo propio',
      'Publicación independiente'
    ],
    reasoningSummary: 'No basta con una lista funcional. Tiene que ser visual, bonita y útil de verdad para entender el sistema.',
    cost: '$0.12',
    liveTrace: [
      ['Entrada', 'Jan pide un panel tipo oficina.'],
      ['Decisión', 'Jarvis decide hacerlo directamente.'],
      ['Ejecución', 'dev-web construye la interfaz.'],
      ['Publicación', 'Se separa del producto en repo propio.']
    ]
  },
  {
    id: crypto.randomUUID(),
    title: 'Desbloquear ownership técnico de n8n',
    description: 'Conseguir que dev-n8n tenga acceso real para ser dueño de fixes y mantenimiento.',
    priority: 'Alta',
    stage: 'delegated',
    owner: 'CEO Desarrollo',
    chain: ['Jan', 'Jarvis', 'CEO Desarrollo', 'dev-n8n'],
    subtasks: ['Revisar permisos API', 'Confirmar credenciales', 'Validar acceso efectivo'],
    blockers: ['Acceso actual insuficiente'],
    updates: ['Detectado bloqueo de acceso/API en worker n8n'],
    evidence: ['Worker activado pero bloqueado'],
    reasoningSummary: 'Sin acceso real no hay ownership técnico real.',
    cost: '$0.05',
    liveTrace: [
      ['Problema', 'El worker correcto no puede tocar su área.'],
      ['Impacto', 'El ownership técnico queda cojo.']
    ]
  },
  {
    id: crypto.randomUUID(),
    title: 'Integración live con OpenClaw',
    description: 'Conectar el panel a sesiones, estados, costes y eventos reales del sistema.',
    priority: 'Media',
    stage: 'inbox',
    owner: 'Jan',
    chain: ['Jan', 'Jarvis'],
    subtasks: ['Leer sesiones', 'Pintar estado real', 'Costes por agente', 'Actividad live'],
    blockers: [],
    updates: [],
    evidence: [],
    reasoningSummary: 'El panel visual gana mucho cuando se conecta a datos reales.',
    cost: '$0.00',
    liveTrace: []
  }
];

const activity = [
  ['Ahora', 'dev-web está metiendo departamentos y procesos exactos por agente en el panel.'],
  ['Hace 8 min', 'Jarvis separó el panel del producto y lo movió a repo propio.'],
  ['Hace 14 min', 'QA validó una prueba E2E buena con Just Enough Items.'],
  ['Hace 21 min', 'Jarvis rechazó dar el problema de mods por cerrado sin repetición suficiente.'],
  ['Hace 28 min', 'CTO demostró activación real de QA y activación bloqueada de dev-n8n.']
];

const statusPill = {
  idle: '<span class="pill green">Libre</span>',
  working: '<span class="pill blue">Trabajando</span>',
  review: '<span class="pill amber">Revisión</span>',
  blocked: '<span class="pill red">Bloqueado</span>',
};

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
    <div class="tree-level dept-line">
      <div class="department-chip">Departamento: Development</div>
    </div>
    <div class="tree-level">
      <div class="tree-card department"><div class="role">WORKER</div><div class="name">dev-n8n</div><div class="small">n8n / workflows / payloads</div></div>
      <div class="tree-card department"><div class="role">WORKER</div><div class="name">dev-backend</div><div class="small">APIs / contratos / eventos</div></div>
      <div class="tree-card department"><div class="role">WORKER</div><div class="name">dev-web</div><div class="small">UI / paneles / experiencia</div></div>
      <div class="tree-card department"><div class="role">WORKER</div><div class="name">dev-qa</div><div class="small">QA / regresión / evidencia</div></div>
    </div>`;
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
      <div class="worker-footer">
        ${statusPill[w.status]}
        <span class="small">${w.delegationRule}</span>
      </div>
      <div class="process-preview">
        ${w.processes.slice(0,3).map(p => `<span class="code-chip">${p}</span>`).join('')}
      </div>
    </div>`).join('');

  document.getElementById('statAgents').textContent = workers.length;
  document.getElementById('statBusy').textContent = workers.filter(w => w.status === 'working' || w.status === 'review').length;
  document.getElementById('statCost').textContent = '$0.73';

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
  document.getElementById('statTasks').textContent = tasks.length;

  document.querySelectorAll('.task-card').forEach(el => el.addEventListener('click', () => showTask(el.dataset.taskId)));
}

function renderFlow() {
  const flow = document.getElementById('delegationFlow');
  const task = tasks[0];
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
        <span class="code-chip">Coste: ${w.cost}</span>
      </div>
    </div>
    <div class="detail-grid">
      <div class="detail-block">
        <h4>Estado actual</h4>
        <p>${w.current}</p>
        <p>${statusPill[w.status]}</p>
      </div>
      <div class="detail-block">
        <h4>Cómo está pensando</h4>
        <p>${w.reasoning}</p>
      </div>
      <div class="detail-block">
        <h4>Procesos exactos en curso</h4>
        <ul class="clean">${w.processes.map(p => `<li>${p}</li>`).join('')}</ul>
      </div>
      <div class="detail-block">
        <h4>Regla operativa</h4>
        <p>${w.delegationRule}</p>
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
renderHierarchy();
renderDepartments();
renderWorkers();
renderTasks();
renderFlow();
renderActivity();
showTask(tasks[0].id);
