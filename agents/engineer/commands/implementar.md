# ⚙️ Comando: /implementar

## Objetivo

Executar **um único step** do PLAN, entregando código production-ready, testes e atualizando o status do PLAN ao final.

---

## Ativação

```
/implementar <STEP-ID>

Exemplos:
/implementar STEP-01
/implementar STEP-03
```

O dev tem controle total sobre qual step executar e quando. Não há execução automática ou sequencial.

---

## Etapa 0 — Validação

### Localizar o PLAN ativo:
- Procure por arquivos em `docs/plan/` com steps pendentes.
- Se houver mais de um PLAN ativo, pergunte: **"Encontrei múltiplos PLANs ativos. Qual devo usar?"**
- Se não houver PLAN: **"Nenhum PLAN encontrado em docs/plan/. Execute /planejar primeiro."**

### Validar o step solicitado:
- O step `<STEP-ID>` existe no PLAN?
- O step já está concluído? → **"STEP-XX já está marcado como ✅ Concluído. Deseja re-executá-lo?"**
- O step está bloqueado por dependência não concluída? → **"STEP-XX depende de STEP-YY que ainda está pendente. Deseja prosseguir mesmo assim?"**

---

## Etapa 1 — Briefing do Step

Antes de escrever qualquer código, apresente o briefing completo:

```
## Executando: [STEP-ID] — [Título]

**Objetivo:** [do PLAN]

**Tarefas:**
- [ ] [tarefa 1]
- [ ] [tarefa 2]

**Arquivos previstos:**
- path/to/file.ext

**Contexto ativo:** [stack detectado — dotnet / typescript / python / sql / generic]

**Critério de conclusão:** [do PLAN]

---
Posso prosseguir com a implementação?
```

Aguarde confirmação explícita do dev antes de implementar.

---

## Etapa 2 — Implementação

Execute a skill `skills/code-generation.md` com as seguintes diretrizes adicionais:

### Antes de escrever:
- Releia o PRD de origem para manter fidelidade às regras de negócio
- Verifique os steps anteriores concluídos para manter consistência
- Carregue o contexto da stack ativa (`context/<stack>.md`)

### Durante a escrita:
- Implemente **somente** o que está no escopo deste step
- Não antecipe steps futuros (over-engineering)
- Mantenha consistência com código já gerado em steps anteriores
- Trate todos os edge cases descritos no PRD

### Estrutura de entrega:

Para cada arquivo, entregue no formato:

````
### 📄 `path/to/arquivo.ext`

```linguagem
[código completo do arquivo]
```

**Por que:** [decisão de design relevante, se houver]
````

---

## Etapa 3 — Verificação do Step

Após a implementação, execute o checklist:

```
### Verificação — [STEP-ID]

[ ] Todas as tarefas do step foram implementadas?
[ ] O código segue as convenções do context/<stack>.md?
[ ] Tratamento de erros está completo?
[ ] Testes foram incluídos (se o step prevê testes)?
[ ] O critério de conclusão do PLAN é atendido?
[ ] Não há dependência de steps futuros introduzida?
```

Se qualquer item falhar, corrija antes de prosseguir.

---

## Etapa 4 — Atualização do PLAN

Após a implementação bem-sucedida, atualize o arquivo `docs/plan/PLAN-[slug].md`:

1. Marque o step como `✅ Concluído` na tabela de resumo
2. Marque todas as tarefas do step como `[x]`
3. Registre a data de conclusão no step

```markdown
### STEP-01 — [Título] ✅

**Concluído em:** [YYYY-MM-DD]
**Arquivos criados/modificados:**
- `path/to/file.ext` ✅
```

---

## Etapa 5 — Relatório Final do Step

```
## ✅ STEP-XX concluído — [Título]

### O que foi implementado
[Resumo do que foi entregue]

### Arquivos criados/modificados
- `path/to/file.ext` — [descrição]

### Decisões tomadas durante a implementação
[Qualquer desvio ou decisão não prevista no PLAN]

### Como verificar
[Como o dev pode testar/validar manualmente]

---
### Próximo step sugerido: STEP-[próximo] — [título]
Para executar: `/implementar STEP-[próximo]`

Steps restantes: [N] de [total]
```

---

## Integração Azure (opcional)

Se a integração Azure estiver configurada:

1. **Atualizar Task no Azure DevOps** — Mude status da Task correspondente para "Done"
   → Consulte `integrations/azure/work-items.md`

2. **Registrar horas** — Se o dev quiser registrar o tempo gasto

Pergunte ao final: **"Deseja que eu atualize a Task STEP-XX no Azure DevOps para 'Done'?"**

---

## Comportamento em Erros Durante Implementação

Se durante a implementação o agent encontrar algo bloqueante:

```
⚠️ Bloqueio encontrado em STEP-XX

**Problema:** [descrição clara do que está bloqueando]
**Impacto:** [o que não pode ser implementado sem isso]
**Opções:**
1. [opção A para contornar]
2. [opção B para contornar]
3. Aguardar resolução e retomar depois

Como deseja prosseguir?
```

Nunca tome uma decisão bloqueante sozinho — sempre escale para o dev.