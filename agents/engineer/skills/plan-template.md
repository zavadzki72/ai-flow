# 📋 Skill: PLAN Template

Template oficial para geração de PLANs pelo comando `/planejar`.

---

## Template

```markdown
# PLAN — [Nome da Feature]

**PRD:** [link para o PRD de origem]
**Azure Work Item:** #[número] (se aplicável)
**Branch:** feature/[slug] (se aplicável)
**Data:** [YYYY-MM-DD]
**Status:** Pendente

---

## Resumo

[2-3 frases descrevendo o que será implementado e a abordagem técnica escolhida.]

---

## Stack e Convenções

- **Linguagem principal:** [C# / TypeScript / Python / etc.]
- **Padrão arquitetural:** [Clean Architecture / Layered / etc.]
- **Testes:** [xUnit / Vitest / pytest / etc.]
- **Convenções:** Ver `context/[stack].md`

---

## Steps de Implementação

### STEP-01 — [Título do step]

**Objetivo:** [O que será feito e por quê]

**Tarefas:**
- [ ] [Tarefa específica 1]
- [ ] [Tarefa específica 2]
- [ ] [Tarefa específica 3]

**Arquivos a criar/modificar:**
- `path/to/file.ext` — [descrição]
- `path/to/other.ext` — [descrição]

**Critério de conclusão:**
[Como saber que esse step está 100% feito. Deve ser verificável.]

**Depende de:** Nenhum
**Estimativa:** ~Xh

---

### STEP-02 — [Título do step]

**Objetivo:** [O que será feito e por quê]

**Tarefas:**
- [ ] [Tarefa específica 1]
- [ ] [Tarefa específica 2]

**Arquivos a criar/modificar:**
- `path/to/file.ext` — [descrição]

**Critério de conclusão:**
[Verificável e objetivo]

**Depende de:** STEP-01
**Estimativa:** ~Xh

---

[... repetir para cada step ...]

---

## Mapa de Dependências

```
STEP-01 (infra/schema)
    └── STEP-02 (domínio)
            ├── STEP-03 (application)
            │       └── STEP-05 (controller)
            └── STEP-04 (repositório)
                    └── STEP-05 (controller)
                            └── STEP-06 (testes integração)
STEP-07 (documentação) — independente
```

---

## Resumo de Estimativas

| Step | Título | Estimativa | Status |
|------|--------|------------|--------|
| STEP-01 | [título] | ~Xh | ⬜ Pendente |
| STEP-02 | [título] | ~Xh | ⬜ Pendente |
| **Total** | | **~Xh** | |

**Legenda de status:**
- ⬜ Pendente
- 🔄 Em andamento
- ✅ Concluído
- 🚫 Bloqueado

---

## Critérios de Aceite (do PRD)

[Cole aqui os critérios de aceite do PRD para referência rápida durante a implementação]

---

## Decisões Técnicas Tomadas

[Registre aqui as decisões tomadas durante o planejamento que não estavam no PRD]

| Decisão | Escolha | Motivo |
|---------|---------|--------|
| [tema] | [o que foi decidido] | [por quê] |

---

## Notas de Implementação

[Qualquer contexto, cuidado especial ou informação relevante para quem vai executar os steps]
```