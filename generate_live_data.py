#!/usr/bin/env python3
import json, os, glob, re
from pathlib import Path
from datetime import datetime, timezone

ROOT = Path(os.path.expanduser('~/.openclaw'))
CFG = ROOT / 'openclaw.json'
OUT = Path(__file__).resolve().parent / 'live-data.json'
NOW = datetime.now(timezone.utc)

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


def parse_session(agent_id):
    session_files = sorted(glob.glob(str(ROOT / 'agents' / agent_id / 'sessions' / '*.jsonl')), key=os.path.getmtime)
    if not session_files:
        return None
    f = Path(session_files[-1])
    lines = []
    with open(f, 'r', encoding='utf-8') as fh:
        for line in fh:
            try:
                lines.append(json.loads(line))
            except Exception:
                pass
    messages = [x for x in lines if x.get('type') == 'message']
    last_dt = ts(lines[-1].get('timestamp')) if lines else NOW
    tool_calls = []
    assistant_texts = []
    decision_trace = []
    total_cost = 0.0
    last_user = None
    for entry in messages:
        msg = entry.get('message', {})
        role = msg.get('role')
        if role == 'user':
            content = msg.get('content') or []
            text = ' '.join(part.get('text','') for part in content if isinstance(part, dict) and part.get('type') == 'text').strip()
            if text:
                last_user = text
        elif role == 'assistant':
            usage = msg.get('usage') or {}
            cost = (((usage.get('cost') or {}).get('total')) or 0)
            if isinstance(cost, (int, float)) and 0 <= cost < 10:
                total_cost += cost
            for part in msg.get('content', []):
                if part.get('type') == 'text' and part.get('text'):
                    txt = part['text'].strip()
                    assistant_texts.append(txt)
                elif part.get('type') == 'toolCall':
                    tool_calls.append((part.get('name'), part.get('arguments') or {}))
        elif role == 'toolResult':
            usage = msg.get('usage') or {}
            cost = (((usage.get('cost') or {}).get('total')) or 0)
            if isinstance(cost, (int, float)) and 0 <= cost < 10:
                total_cost += cost
            content = msg.get('content') or []
            txt = ' '.join(part.get('text','') for part in content if isinstance(part, dict) and part.get('type') == 'text').strip()
            if txt:
                decision_trace.append(txt[:180])

    processes = [short_process_from_toolcall(name, args) for name, args in tool_calls[-5:]]
    if not processes and last_user:
        processes = [f'Procesando instrucción: {last_user[:100]}']
    reasoning = assistant_texts[-1][:220] if assistant_texts else (last_user[:220] if last_user else 'Sin texto reciente visible')

    # status heuristic from real logs
    status = 'idle'
    if (NOW - last_dt).total_seconds() < 4 * 3600:
        status = 'working'
    joined = ' '.join((processes[-2:] + decision_trace[-2:] + assistant_texts[-1:])).lower()
    if 'blocked' in joined or 'bloqueado' in joined or 'header required' in joined or ' 401' in joined:
        status = 'blocked'
    elif any(k in joined for k in ['veredicto: pass', 'pass', 'validó', 'validated', 'review']):
        status = 'review'
    elif (NOW - last_dt).total_seconds() < 4 * 3600:
        status = 'working'

    # Cleaner trace
    trace = []
    if last_user:
        trace.append(f'Última instrucción: {last_user[:140]}')
    for p in processes[-3:]:
        trace.append(p)
    for t in decision_trace[-2:]:
        trace.append(t[:160])

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
        'reasoning': reasoning,
        'delegationRule': RULES.get(agent_id, ''),
        'processes': processes or ['Sin procesos visibles recientes'],
        'decisionTrace': trace,
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
            'reasoning': 'Sin actividad reciente disponible en las sesiones locales.',
            'delegationRule': RULES.get(a, ''),
            'processes': ['Sin procesos visibles recientes'],
            'decisionTrace': ['Sin trazas recientes'],
            '_last_dt': NOW,
            '_cost_raw': 0.0,
        })
workers.sort(key=lambda w: (0 if w['id']=='main' else 1, w['name']))

active = sum(1 for w in workers if w['status'] in ('working', 'review'))
cost_today = sum(w['_cost_raw'] for w in workers)

activity = []
for w in sorted(workers, key=lambda x: x['_last_dt'], reverse=True)[:12]:
    if w['decisionTrace']:
        activity.append([age_label(w['_last_dt']), f"{w['name']}: {w['decisionTrace'][-1][:140]}"])
    else:
        activity.append([age_label(w['_last_dt']), f"{w['name']}: actividad reciente detectada"])

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
    'evidence': [a[1] for a in activity[:3]],
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
