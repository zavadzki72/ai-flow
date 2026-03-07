# 🔷 Azure Integration — Repos (Branches e PRs)

## Base URL

```
{organization}/{project}/_apis/git/repositories/{repository}
```

API Version: `?api-version=7.1`

---

## 1. Criar Branch de Feature

**Usado por:** `/planejar` ao iniciar o planejamento

### Convenção de nome de branch:
```
feature/[slug-do-prd]
feature/[azure-id]-[slug]

Exemplos:
feature/bulk-order-cancellation
feature/1042-user-export
```

### Obter SHA da branch base (main/master):
```
GET {base}/refs?filter=heads/main&api-version=7.1
```

Resposta relevante:
```json
{
  "value": [{
    "objectId": "abc123...",  ← use este SHA
    "name": "refs/heads/main"
  }]
}
```

### Criar a branch:
```
POST {base}/refs?api-version=7.1

Body:
[{
  "name": "refs/heads/feature/bulk-order-cancellation",
  "newObjectId": "abc123...",  ← SHA do main
  "oldObjectId": "0000000000000000000000000000000000000000"
}]
```

---

## 2. Listar Branches Existentes

**Usado por:** verificar se branch já existe antes de criar

```
GET {base}/refs?filter=heads/feature&api-version=7.1
```

---

## 3. Criar Pull Request

**Usado por:** ao concluir o último step do PLAN

```
POST {base}/pullrequests?api-version=7.1

Body:
{
  "title": "[tipo]: [descrição da feature]",
  "description": "[gerado automaticamente — veja template abaixo]",
  "sourceRefName": "refs/heads/feature/[slug]",
  "targetRefName": "refs/heads/main",
  "reviewers": [],
  "workItemRefs": [
    { "id": "[azure-work-item-id]" }
  ]
}
```

### Template de descrição do PR:
```markdown
## O que esse PR faz
[Resumo da feature baseado no PRD]

## PRD
[Link para docs/prd/PRD-*.md]

## PLAN executado
[Link para docs/plan/PLAN-*.md]

## Steps implementados
- ✅ STEP-01 — [título]
- ✅ STEP-02 — [título]
[...]

## Como testar
[Baseado nos critérios de aceite do PRD]

## Work Item
#[id] — [título do card]
```

---

## 4. Adicionar Reviewer ao PR

```
PUT {base}/pullrequests/{pr-id}/reviewers/{reviewer-id}?api-version=7.1

Body:
{
  "vote": 0,
  "isRequired": true
}
```

---

## 5. Buscar PRs Abertos

```
GET {base}/pullrequests?searchCriteria.status=active&api-version=7.1
```

---

## 6. Obter Status do Pipeline (Build)

**Usado por:** verificar se CI passou após push

```
GET {organization}/{project}/_apis/build/builds
  ?definitions={pipeline-id}
  &branchName=refs/heads/feature/{slug}
  &$top=1
  &api-version=7.1
```

Resposta relevante:
```json
{
  "value": [{
    "status": "completed",
    "result": "succeeded | failed | canceled",
    "buildNumber": "20240315.1",
    "_links": { "web": { "href": "URL do build" } }
  }]
}
```

---

## Fluxo Completo de Branch + PR

```
/planejar
  → Criar branch: feature/[slug]
  → Registrar branch no PLAN

/implementar STEP-01 ... STEP-N
  → Código gerado localmente
  → Dev faz commits e push manualmente

Após último step:
  → Verificar se todos os steps estão ✅
  → Perguntar: "Deseja que eu crie o PR agora?"
  → Criar PR com template preenchido
  → Linkar Work Item ao PR
  → Exibir URL do PR criado
```