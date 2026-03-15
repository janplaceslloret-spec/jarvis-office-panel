#!/usr/bin/env python3
import json, os, glob, re
from pathlib import Path
from datetime import datetime, timezone

ROOT = Path(os.path.expanduser('~/.openclaw'))
CFG = ROOT / 'openclaw.json'
OUT = Path(__file__).resolve().parent / 'live-data.json'
NOW = datetime.now(timezone.utc)
RECENT_COST_MESSAGES = 12
RECENT_EVENTS_PER_AGENT = 30
MAX_TEXT_CHARS = 280

DEPARTMENTS = [
    {
        'id': 'development',
        'name': 'Development',
        'lead': 'CEO Desarrollo',
        'mission': 'Construir, corregir, validar y estabilizar el sistema técnico.',
        'color': 'cyan',
        'workers': ['dev-cto', 'dev-n8n', 'dev-backend', 'dev-web', 'dev-qa'],
    }
]

SPECIALTY = {
    'main': 'Dirección, priorización, revisión y síntesis',
    'dev-cto': 'Arquitectura, reparto técnico, criterio de ejecución',
    'dev-n8n': 'n8n, tools, automatización, payloads',
    'dev-backend': 'APIs, contratos, persistencia, eventos',
    'dev-web': 'Interfaz, experiencia visual, paneles',
    'dev-qa': 'E2E, regresión, evidencia por ejecución',
}
ROLES = {
    'main': 'Director general',
    'dev-cto': 'Dirección técnica',
    'dev-n8n': 'Workflow engineer',
    'dev-backend': 'Backend engineer',
    'dev-web': 'Frontend engineer',
    'dev-qa': 'QA / Validación',
}
DISPLAY = {
    'main': 'Jarvis',
    'dev-cto': 'CEO Desarrollo',
    'dev-n8n': 'dev-n8n',
    'dev-backend': 'dev-backend',
    'dev-web': 'dev-web',
    'dev-qa': 'dev-qa',
}
RULES = {
    'main': 'Nunca asumir desarrollo directo salvo excepción.',
    'dev-cto': 'No ejecutar el fix principal; obligar a delegación real.',
    'dev-n8n': 'Solo toca workflows y lógica de orquestación.',
    'dev-backend': 'No tocar frontend si no hace falta.',
    'dev-web': 'No tocar ownership técnico de n8n.',
    'dev-qa': 'Sin evidencia, no hay cierre.',
}


def ts(s):
    try:
        if isinstance(s, (int, float)):
            return datetime.fromtimestamp(s/1000 if s > 10_000_000_000 else s, tz=timezone.utc)
        return datetime.fromisoformat(s.replace('Z', '+00:00'))
    except Exception:
        return NOW


def age_label(dt):
    secs = max(0, int((NOW - dt).total_seconds()))
    if secs < 60:
        return 'Ahora'
    mins = secs // 60
    if mins < 60:
        return f'Hace {mins} min'
    hrs = mins // 60
    return f'Hace {hrs} h'


def clamp_text(s: str, n: int = MAX_TEXT_CHARS):
    s = (s or '').strip()
    s = re.sub(r'\s+', ' ', s)
    return s[:n] + ('…' if len(s) > n else '')


def short_process_from_toolcall(name, args):
    if name == 'exec':
        cmd = (args or {}).get('command', '')
        cmd = re.sub(r'\s+', ' ', cmd).strip()
        return f'Exec: {cmd[:90] + ("…" if len(cmd) > 90 else "")}' if cmd else 'Exec de shell'
    if name == 'process':
        return f"Process: {(args or {}).get('action','acción')}"
    if name == 'read':
        return f"Leyendo archivo: {(args or {}).get('path') or (args or {}).get('file_path','archivo')}"
    if name == 'write':
        return f"Escribiendo: {(args or {}).get('path') or (args or {}).get('file_path','archivo')}"
    if name == 'edit':
        return f"Editando: {(args or {}).get('path') or (args or {}).get('file_path','archivo')}"
    if name == 'sessions_spawn':
        return 'Delegando en subagente'
    return f'Herramienta: {name}'


def extract_events_from_latest_session(latest_lines):
    """Devuelve eventos reales (no inferidos) a partir del JSONL de la última sesión."""
    events = []
    for obj in latest_lines:
        if obj.get('type') != 'message':
            continue
        msg = obj.get('message', {})
        role = msg.get('role')
        dt = ts(obj.get('timestamp') or msg.get('timestamp'))
        content = msg.get('content') or []

        def text_from(parts):
            if isinstance(parts, str):
                return clamp_text(parts)
            out = []
            for p in parts:
                if isinstance(p, dict) and p.get('type') == 'text' and p.get('text'):
                    out.append(p.get('text'))
            return clamp_text(' '.join(out))

        if role == 'user':
            events.append({
                'ts': dt.isoformat(),
                'kind': 'user',
                'text': text_from(content),
            })

        elif role == 'assistant':
            # assistant can contain text and/or tool calls
            txt = text_from(content)
            if txt:
                events.append({'ts': dt.isoformat(), 'kind': 'assistant', 'text': txt})
            for p in content:
                if isinstance(p, dict) and p.get('type') == 'toolCall':
                    name = p.get('name')
                    args = p.get('arguments') or {}
                    events.append({
                        'ts': dt.isoformat(),
                        'kind': 'tool_call',
                        'tool': name,
                        'args': clamp_text(json.dumps(args, ensure_ascii=False), 420),
                    })

        elif role == 'toolResult':
            txt = text_from(content)
            tool_name = None
            # sometimes present in toolResult metadata
            if msg.get('toolName'):
                tool_name = msg.get('toolName')
            events.append({
                'ts': dt.isoformat(),
                'kind': 'tool_result',
                'tool': tool_name,
                'text': txt,
            })

    return events[-RECENT_EVENTS_PER_AGENT:]


def parse_session(agent_id):
    session_files = sorted(glob.glob(str(ROOT / 'agents' / agent_id / 'sessions' / '*.jsonl')), key=os.path.getmtime)
    if not session_files:
        return None

    latest_file = Path(session_files[-1])
    latest_lines = []
    with open(latest_file, 'r', encoding='utf-8') as fh:
        for line in fh:
            try:
                latest_lines.append(json.loads(line))
            except Exception:
                pass

    # Coste real reciente: últimos N mensajes con uso en la sesión visible.
    # Esto se acerca más a "qué me está costando ahora" que a toda la sesión larga.
    recent_costs = []
    try:
        with open(latest_file, 'r', encoding='utf-8') as fh:
            for line in fh:
                try:
                    obj = json.loads(line)
                except Exception:
                    continue
                if obj.get('type') != 'message':
                    continue
                msg = obj.get('message', {})
                usage = msg.get('usage') or {}
                cost = ((usage.get('cost') or {}).get('total'))
                if isinstance(cost, (int, float)) and 0 <= cost < 10:
                    recent_costs.append(cost)
    except Exception:
        pass
    total_cost = sum(recent_costs[-RECENT_COST_MESSAGES:])

    messages = [x for x in latest_lines if x.get('type') == 'message']
    last_dt = ts(latest_lines[-1].get('timestamp')) if latest_lines else NOW

    # Eventos reales para UI (sin inventar)
    events = extract_events_from_latest_session(latest_lines)

    # Para el "proceso actual" usamos última tool_call real si existe
    tool_calls = [e for e in events if e.get('kind') == 'tool_call']
    processes = []
    for e in tool_calls[-5:]:
        try:
            args = json.loads(e.get('args','{}')) if isinstance(e.get('args'), str) else e.get('args')
        except Exception:
            args = {}
        processes.append(short_process_from_toolcall(e.get('tool'), args if isinstance(args, dict) else {}))

    last_user = next((e.get('text') for e in reversed(events) if e.get('kind') == 'user' and e.get('text')), None)
    last_assistant = next((e.get('text') for e in reversed(events) if e.get('kind') == 'assistant' and e.get('text')), None)

    if not processes and last_user:
        processes = [f'Procesando instrucción: {clamp_text(last_user, 120)}']

    # Reasoning: resumen visible basado en el último mensaje asistente (si existe)
    reasoning = clamp_text(last_assistant or last_user or 'Sin texto reciente visible', 240)

    # decisionTrace: últimas líneas de eventos (reales)
    decision_trace = []
    if last_user:
        decision_trace.append(f'Último user: {clamp_text(last_user, 140)}')
    if processes:
        decision_trace.extend(processes[-2:])

    # status (sin mentir): requiere actividad reciente Y evidencia de acción
    status = 'idle'
    joined = ' '.join((processes[-2:] + decision_trace[-2:])).lower()
    if 'blocked' in joined or 'bloqueado' in joined or 'header required' in joined or ' 401' in joined:
        status = 'blocked'
    elif any(k in joined for k in ['veredicto: pass', 'validó', 'validated', 'review']):
        status = 'review'
    else:
        # Working SOLO si hay tool_call/tool_result y además el último evento es reciente
        recent_seconds = (NOW - last_dt).total_seconds()
        has_actions = any(e.get('kind') in ('tool_call','tool_result') for e in events[-10:])
        if has_actions and recent_seconds <= 15 * 60:
            status = 'working'
        else:
            status = 'idle'

    # Cleaner trace
    trace = []
    for t in decision_trace[-4:]:
        trace.append(clamp_text(t, 180))

    return {
        'id': agent_id,
        'name': DISPLAY.get(agent_id, agent_id),
        'role': ROLES.get(agent_id, agent_id),
        'department': 'executive' if agent_id == 'main' else 'development',
        'status': status,
        'model': next((a.get('model') for a in config.get('agents', {}).get('list', []) if a.get('id') == agent_id), 'unknown'),
        'specialty': SPECIALTY.get(agent_id, ''),
        'current': processes[-1] if processes else (last_user[:120] if last_user else 'Sin actividad reciente visible'),
        'cost': f'${total_cost:.4f}',
        'costWindow': f'últimos {RECENT_COST_MESSAGES} eventos con coste (OpenClaw usage)',
        'reasoning': reasoning,
        'delegationRule': RULES.get(agent_id, ''),
        'processes': processes or ['Sin procesos visibles recientes'],
        'decisionTrace': trace,
        'events': events,
        '_last_dt': last_dt,
        '_cost_raw': total_cost,
    }


with open(CFG, 'r', encoding='utf-8') as fh:
    config = json.load(fh)

agent_ids = [a['id'] for a in config.get('agents', {}).get('list', []) if a.get('id') in DISPLAY]
workers = [parse_session(a) for a in agent_ids]
workers = [w for w in workers if w]
seen_ids = {w['id'] for w in workers}
for a in agent_ids:
    if a not in seen_ids:
        workers.append({
            'id': a,
            'name': DISPLAY.get(a, a),
            'role': ROLES.get(a, a),
            'department': 'executive' if a == 'main' else 'development',
            'status': 'idle',
            'model': next((x.get('model') for x in config.get('agents', {}).get('list', []) if x.get('id') == a), 'unknown'),
            'specialty': SPECIALTY.get(a, ''),
            'current': 'Sin sesión reciente visible',
            'cost': '$0.0000',
            'costWindow': f'últimos {RECENT_COST_MESSAGES} eventos con coste (OpenClaw usage)',
            'reasoning': 'Sin actividad reciente disponible en las sesiones locales.',
            'delegationRule': RULES.get(a, ''),
            'processes': ['Sin procesos visibles recientes'],
            'decisionTrace': ['Sin trazas recientes'],
            'events': [],
            '_last_dt': datetime(1970,1,1,tzinfo=timezone.utc),
            '_cost_raw': 0.0,
        })
workers.sort(key=lambda w: (0 if w['id']=='main' else 1, w['name']))

active = sum(1 for w in workers if w['status'] in ('working', 'review'))
cost_today = sum(w['_cost_raw'] for w in workers)

activity = []
for w in sorted(workers, key=lambda x: x['_last_dt'], reverse=True)[:12]:
    # activity como eventos con timestamp real
    msg = w.get('decisionTrace')[-1] if w.get('decisionTrace') else (w.get('current') or '')
    activity.append({
        'ts': w['_last_dt'].isoformat(),
        'text': f"{w['name']}: {clamp_text(msg, 140)}"
    })

# keep tasks semi-curated but derived from actual workers
mods_task = {
    'id': 'mods-reliability',
    'title': 'Fiabilidad total al instalar mods',
    'description': 'Estado derivado de sesiones reales del equipo de desarrollo sobre el flujo de instalación de mods.',
    'priority': 'Crítica',
    'stage': 'doing',
    'owner': 'Jarvis',
    'chain': ['Jan', 'Jarvis', 'CEO Desarrollo', 'dev-n8n', 'dev-qa'],
    'subtasks': [
        'Blindar SERVER MANAGER → INSTALL_MODS',
        'Eliminar omisión de tool',
        'Validar payload y respuesta final',
    ],
    'blockers': [w['current'] for w in workers if w['id']=='dev-n8n' and w['status']=='blocked'],
    'updates': [f"{w['name']}: {w['current']}" for w in workers if w['id'] in ('dev-cto','dev-n8n','dev-qa')],
    'evidence': [a.get('text','') for a in activity[:3]],
    'reasoningSummary': 'Resumen derivado de logs reales; no se inventa chain-of-thought oculto.',
    'cost': f"${sum(w['_cost_raw'] for w in workers if w['id'] in ('main','dev-cto','dev-n8n','dev-qa')):.4f}",
    'liveTrace': [[w['name'], w['current']] for w in workers if w['id'] in ('main','dev-cto','dev-n8n','dev-qa')],
}

panel_task = {
    'id': 'office-panel',
    'title': 'Panel oficina visual',
    'description': 'Conectar visualización con snapshot real generado desde las sesiones OpenClaw.',
    'priority': 'Alta',
    'stage': 'doing',
    'owner': 'Jarvis',
    'chain': ['Jan', 'Jarvis', 'dev-web', 'dev-backend'],
    'subtasks': ['Generar snapshot real', 'Pintar costes reales', 'Mostrar procesos exactos por agente'],
    'blockers': [],
    'updates': ['Snapshot real generado desde sesiones OpenClaw'],
    'evidence': ['live-data.json actualizado automáticamente por script local'],
    'reasoningSummary': 'Se muestran procesos reales observables y costes reales de sesión; no pensamiento oculto bruto.',
    'cost': f"${sum(w['_cost_raw'] for w in workers if w['id'] in ('main','dev-web','dev-backend')):.4f}",
    'liveTrace': [['dev-web','Pintando agentes, departamentos y detalle'], ['Jarvis','Conectando datos reales al panel']],
}

data = {
    'generatedAt': NOW.isoformat(),
    'global': {
        'agents': len(workers),
        'active': active,
        'tasks': 2,
        'costToday': f'${cost_today:.4f}',
    },
    'departments': DEPARTMENTS,
    'workers': [{k:v for k,v in w.items() if not k.startswith('_')} for w in workers],
    'tasks': [mods_task, panel_task],
    'activity': activity,
}

OUT.write_text(json.dumps(data, ensure_ascii=False, indent=2), encoding='utf-8')
print(f'Wrote {OUT}')
