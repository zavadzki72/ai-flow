# 🔷 Azure Integration — Work Items

## Endpoints e Operações

Base URL: `{organization}/{project}/_apis/wit`
API Version: `?api-version=7.1`

---

## 1. Buscar Work Item por ID

**Usado por:** `/spec` ao receber número de card

```
GET {base}/_apis/wit/workitems/{id}?$expand=all&api-version=7.1

Headers:
  Authorization: Basic base64(:PAT)
```

**Campos relevantes na resposta:**
```json
{
  "id": 1042,
  "fields": {
    "System.Title": "Título do card",
    "System.Description": "Descrição HTML",
    "System.WorkItemType": "User Story | Bug | Task | Feature",
    "System.State": "New | Active | Resolved | Closed",
    "System.AssignedTo": { "displayName": "Nome" },
    "System.AreaPath": "Projeto\\Area",
    "System.IterationPath": "Projeto\\Sprint 1",
    "Microsoft.VSTS.Common.AcceptanceCriteria": "Critérios de aceite HTML",
    "System.Tags": "tag1; tag2"
  }
}
```

**Como apresentar ao dev:**
```
📋 Work Item encontrado:

#1042 — [Título]
Tipo: [User Story / Bug / Feature]
Status: [New / Active]
Assignado: [Nome ou "Não atribuído"]

Descrição:
[Descrição limpa, sem HTML]

Critérios de aceite:
[Se existirem]
```

---

## 2. Buscar Work Item por URL

Se o dev passar uma URL completa:
```
https://dev.azure.com/{org}/{project}/_workitems/edit/1042
```
Extraia o ID (1042) e use o endpoint acima.

---

## 3. Atualizar Work Item

**Usado por:** `/spec` para linkar PRD ao card

```
PATCH {base}/_apis/wit/workitems/{id}?api-version=7.1

Body:
[
  {
    "op": "add",
    "path": "/fields/System.Description",
    "value": "HTML atual + link para PRD"
  }
]
```

---

## 4. Criar Work Item (Task filho)

**Usado por:** `/planejar` para criar uma Task por step

```
POST {base}/_apis/wit/workitems/$Task?api-version=7.1

Body:
[
  {
    "op": "add",
    "path": "/fields/System.Title",
    "value": "STEP-01 — [Título do step]"
  },
  {
    "op": "add",
    "path": "/fields/System.Description",
    "value": "[Objetivo e tarefas do step em HTML]"
  },
  {
    "op": "add",
    "path": "/fields/System.AreaPath",
    "value": "[AreaPath do config]"
  },
  {
    "op": "add",
    "path": "/fields/System.IterationPath",
    "value": "[IterationPath do config]"
  },
  {
    "op": "add",
    "path": "/fields/Microsoft.VSTS.Scheduling.OriginalEstimate",
    "value": "[horas estimadas como número]"
  }
]
```

---

## 5. Vincular Task ao Work Item pai

**Usado por:** `/planejar` após criar cada Task

```
PATCH {base}/_apis/wit/workitems/{task-id}?api-version=7.1

Body:
[
  {
    "op": "add",
    "path": "/relations/-",
    "value": {
      "rel": "System.LinkTypes.Hierarchy-Reverse",
      "url": "{base}/_apis/wit/workitems/{parent-id}"
    }
  }
]
```

---

## 6. Atualizar Status de Task

**Usado por:** `/implementar` ao concluir um step

```
PATCH {base}/_apis/wit/workitems/{task-id}?api-version=7.1

Body:
[
  {
    "op": "add",
    "path": "/fields/System.State",
    "value": "Done"
  },
  {
    "op": "add",
    "path": "/fields/Microsoft.VSTS.Scheduling.CompletedWork",
    "value": [horas reais]
  }
]
```

**Estados válidos (Task):** `To Do` → `In Progress` → `Done`

---

## 7. Buscar Work Items de uma Sprint

**Usado por:** contexto geral para listar cards ativos

```
POST {base}/_apis/wit/wiql?api-version=7.1

Body:
{
  "query": "SELECT [System.Id], [System.Title], [System.State]
            FROM WorkItems
            WHERE [System.TeamProject] = '{project}'
            AND [System.IterationPath] = '{iterationPath}'
            AND [System.WorkItemType] IN ('User Story', 'Bug', 'Feature')
            AND [System.State] <> 'Closed'
            ORDER BY [System.CreatedDate] DESC"
}
```

---

## Mapeamento de IDs de Tasks no PLAN

Quando tasks são criadas no Azure, registre o mapeamento no PLAN:

```markdown
## Azure Tasks

| Step | Azure Task ID | URL |
|------|--------------|-----|
| STEP-01 | #2001 | https://dev.azure.com/org/proj/_workitems/edit/2001 |
| STEP-02 | #2002 | https://dev.azure.com/org/proj/_workitems/edit/2002 |
```