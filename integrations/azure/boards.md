# 🔷 Azure Integration — Boards (Sprints e Backlog)

## Base URL

```
{organization}/{project}/_apis
```

---

## 1. Listar Sprints do Time

**Usado por:** `/planejar` para associar Tasks à sprint correta

```
GET {org}/{project}/{team}/_apis/work/teamsettings/iterations
  ?$timeframe=current
  &api-version=7.1
```

Resposta relevante:
```json
{
  "value": [{
    "id": "sprint-guid",
    "name": "Sprint 5",
    "path": "Projeto\\Sprint 5",
    "attributes": {
      "startDate": "2024-03-11T00:00:00Z",
      "finishDate": "2024-03-24T00:00:00Z",
      "timeFrame": "current"
    }
  }]
}
```

---

## 2. Mover Work Item para Sprint

**Usado por:** `/planejar` ao criar Tasks

```
PATCH {org}/_apis/wit/workitems/{id}?api-version=7.1

Body:
[{
  "op": "add",
  "path": "/fields/System.IterationPath",
  "value": "Projeto\\Sprint 5"
}]
```

---

## 3. Listar Backlog da Sprint Atual

**Usado por:** contexto geral — mostrar cards da sprint

```
GET {org}/{project}/{team}/_apis/work/teamsettings/iterations/{iteration-id}/workitems
  ?api-version=7.1
```

---

## 4. Listar Work Items do Backlog por Area

```
POST {org}/{project}/_apis/wit/wiql?api-version=7.1

Body:
{
  "query": "SELECT [System.Id], [System.Title], [System.State], [System.AssignedTo]
            FROM WorkItems
            WHERE [System.TeamProject] = '{project}'
            AND [System.AreaPath] UNDER '{areaPath}'
            AND [System.State] IN ('New', 'Active')
            ORDER BY [Microsoft.VSTS.Common.Priority] ASC,
                     [System.CreatedDate] ASC"
}
```

---

## 5. Verificar Capacidade do Time na Sprint

```
GET {org}/{project}/{team}/_apis/work/teamsettings/iterations/{iteration-id}/capacities
  ?api-version=7.1
```

---

## Uso no Fluxo

### No `/planejar`:
1. Buscar sprint atual → `GET iterations?timeframe=current`
2. Para cada Task criada → associar à sprint atual
3. Verificar capacidade disponível (informativo)

### No `/implementar`:
1. Ao concluir step → atualizar Task para "Done" (via work-items.md)
2. O board é atualizado automaticamente pelo Azure DevOps

### Relatório de progresso (opcional):
```
📊 Progresso da Sprint

Feature: [nome]
Sprint: Sprint 5 (11/03 - 24/03)

Steps:
✅ STEP-01 — Task #2001 — Done
✅ STEP-02 — Task #2002 — Done  
🔄 STEP-03 — Task #2003 — In Progress ← atual
⬜ STEP-04 — Task #2004 — To Do
⬜ STEP-05 — Task #2005 — To Do

Progresso: 2/5 steps (40%)
```