#!/usr/bin/env node
'use strict';

// Emissor de eventos ao vivo para o ai-flow · Orchestrator (Camada 2b).
// Chamado pelos hooks PreToolUse/PostToolUse do Claude Code no tool `Agent`.
// Lê o JSON do hook no stdin, deriva um evento enxuto e faz POST fire-and-forget
// para o daemon. NUNCA falha nem bloqueia o tool (erros são engolidos de propósito).
//
// Wire em ~/.claude/settings.json (ou .claude-personal/settings.json) — ver README.

const http = require('http');

const PORT = Number(process.env.AIFLOW_ORCH_PORT || 4319);

let raw = '';
process.stdin.setEncoding('utf8');
process.stdin.on('data', (c) => (raw += c));
process.stdin.on('end', () => {
  let hook = {};
  try {
    hook = JSON.parse(raw || '{}');
  } catch {}

  const input = hook.tool_input || {};
  const cwd = hook.cwd || '';
  // slug do projeto = último segmento do cwd (heurística; o dashboard casa por slug)
  const slug = cwd.split('/').filter(Boolean).pop() || null;

  const evtName = hook.hook_event_name || 'unknown';
  // "started" para os eventos de início; "finished" para os de término
  const isStart = /Pre|Start/i.test(evtName);

  // o tipo do agente aparece em campos diferentes conforme o evento:
  // - PreToolUse/PostToolUse no tool Agent: tool_input.subagent_type
  // - SubagentStart/SubagentStop: subagent_type / agent_type no topo
  const agent =
    input.subagent_type ||
    hook.subagent_type ||
    hook.agent_type ||
    hook.agent ||
    (hook.tool_name === 'Agent' ? 'agent' : null);

  const description = input.description || hook.description || null;

  // tarefa completa = o prompt de delegação (o que o agente foi incumbido de fazer)
  const task = input.prompt || input.task || description || null;

  // resultado = o que o agente devolveu (só no término). Pode vir string, objeto
  // ou blocos de conteúdo aninhados ({content:[{type:'text',text:…}]}) — extrai o texto.
  function textOf(v) {
    if (v == null) return null;
    if (typeof v === 'string') return v;
    if (Array.isArray(v)) {
      const parts = v.map(textOf).filter(Boolean);
      return parts.length ? parts.join('\n') : null;
    }
    if (typeof v === 'object') {
      if (typeof v.text === 'string') return v.text;
      if (v.content != null) return textOf(v.content);
      if (v.output != null) return textOf(v.output);
      return JSON.stringify(v);
    }
    return String(v);
  }
  const result = textOf(hook.tool_response);

  const clip = (s, n) => (typeof s === 'string' && s.length > n ? s.slice(0, n) + '…' : s);

  const evt = {
    runId: hook.session_id || 'unknown',
    // id p/ correlacionar Pre↔Post do mesmo agente (quando o Claude Code fornece)
    toolUseId: hook.tool_use_id || hook.tool_use?.id || null,
    event: evtName, // PreToolUse | PostToolUse | SubagentStart | SubagentStop
    status: isStart ? 'started' : 'finished',
    toolName: hook.tool_name || null,
    agent,
    description,
    task: clip(task, 4000),
    result: clip(result, 8000),
    cwd,
    slug,
    ts: Date.now(),
  };

  const body = JSON.stringify(evt);
  const req = http.request(
    {
      host: '127.0.0.1',
      port: PORT,
      path: '/api/events',
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'Content-Length': Buffer.byteLength(body) },
      timeout: 800,
    },
    (res) => res.resume()
  );
  req.on('error', () => {}); // daemon offline? tudo bem, ignora
  req.on('timeout', () => req.destroy());
  req.write(body);
  req.end(() => process.exit(0));
});

// se nada chegar no stdin em 1s, sai limpo
setTimeout(() => process.exit(0), 1000);
