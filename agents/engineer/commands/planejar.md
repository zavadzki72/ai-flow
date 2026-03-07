# 🗺️ Comando: /planejar

## Objetivo

Ler o PRD gerado pelo `/spec` e produzir um PLAN — um arquivo com steps numerados, sequenciados e prontos para execução pelo `/implementar`.

---

## Ativação

```
/planejar
/planejar "PRD-2024-03-15-bulk-order-cancellation"
/planejar <caminho do PRD>
```

---

## Etapa 0 — Localizar o PRD

### Se o dev passou o nome ou caminho:
→ Carregue o arquivo correspondente em `docs/prd/`.

### Se o dev digitou apenas `/planejar`:
→ Liste os PRDs disponíveis em `docs/prd/` com status.
→ Pergunte: **"Qual PRD deseja planejar?"**

### Se não houver nenhum PRD:
→ Informe: **"Nenhum PRD encontrado em docs/prd/. Execute /spec primeiro para criar um."**
→ Encerre.

---

## Etapa 1 — Análise do PRD

Antes de gerar o PLAN, faça a leitura completa do PRD e responda internamente:

```
[ ] O PRD está com status "Aprovado" ou o dev confirmou que pode prosseguir?
[ ] Todos os critérios de aceite estão definidos?
[ ] As integrações necessárias estão identificadas?
[ ] As regras de negócio estão claras o suficiente para implementar?
[ ] Existem decisões técnicas pendentes que bloqueiam a implementação?
```

Se qualquer item estiver bloqueante, **informe o dev e pergunte como prosseguir** antes de gerar o PLAN.

---

## Etapa 2 — Perguntas de Planejamento

Faça as seguintes perguntas **antes** de gerar o PLAN. Uma por vez, aguardando resposta:

```
1. Qual é o stack principal deste repositório?
   (se não detectado automaticamente pelo PERSONA.md)

2. Existe alguma convenção de estrutura de pastas deste projeto que devo respeitar?
   (ex: onde ficam os controllers, services, testes)

3. Os steps devem incluir a criação de testes junto com cada feature,
   ou em um step separado ao final?

4. Existe alguma ordem de prioridade ou restrição de sequência que devo respeitar?
   (ex: "o banco precisa ser alterado antes da API")

5. Deseja que o PLAN inclua steps de configuração de Azure DevOps?
   (criar Tasks, vincular ao Work Item, etc.)
```

---

## Etapa 3 — Geração do PLAN

Gere o PLAN seguindo o template em `skills/plan-template.md`.

### Princípios de decomposição dos steps:

**Cada step deve ser:**
- Executável de forma isolada e independente
- Verificável — tem um critério claro de "concluído"
- Granular o suficiente para ser implementado em uma sessão
- Nomeado com verbo de ação: "Criar", "Implementar", "Configurar", "Adicionar", "Atualizar"

**Ordem recomendada dos steps:**
1. Infraestrutura e schema (banco, migrations, modelos de dados)
2. Domínio e regras de negócio (entidades, value objects, validações)
3. Application layer (use cases, services, handlers)
4. Infraestrutura de persistência (repositórios, queries)
5. Integrações externas (APIs, filas, serviços)
6. Interface de entrada (controllers, endpoints, commands)
7. Testes unitários por camada
8. Testes de integração
9. Documentação e configuração

**Regras de dependência:**
- Se o step B depende do step A, declare explicitamente: `Depende de: STEP-01`
- Steps sem dependência podem teoricamente ser paralelizados

### Nome do arquivo:
```
docs/plan/PLAN-[slug-do-prd].md

Exemplo:
docs/plan/PLAN-bulk-order-cancellation.md
```

---

## Etapa 4 — Revisão do PLAN

Após gerar, apresente um resumo:

```
## PLAN gerado: [nome]

Total de steps: [N]
Estimativa total: [soma das estimativas]

Steps:
- STEP-01: [título] (~Xh)
- STEP-02: [título] (~Xh)
...

Arquivo salvo em: docs/plan/PLAN-[slug].md

---
O PLAN está correto? Deseja ajustar algum step, reordenar ou detalhar mais algum ponto?
```

Aguarde confirmação antes de encerrar.

---

## Etapa 5 — Integração Azure (opcional)

Se a integração Azure estiver configurada e o dev confirmar:

1. **Criar Tasks no Azure DevOps** — Um Work Item filho (Task) por step do PLAN.
   → Consulte `integrations/azure/work-items.md`

2. **Vincular ao Work Item pai** — Link do PLAN ao card original.

3. **Criar branch de feature** — Baseado no nome do PRD.
   → Consulte `integrations/azure/repos.md`

Pergunte: **"Deseja que eu crie as Tasks no Azure DevOps e a branch de feature agora?"**