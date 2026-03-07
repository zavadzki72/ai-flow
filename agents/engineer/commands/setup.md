# ⚙️ Comando: /setup

## Objetivo

Configurar um projeto para usar o `ai-flow` interativamente, criando todos os arquivos e estruturas necessárias sem que o dev precise fazer nada manualmente.

---

## Ativação

```
/setup
```

---

## ⚠️ Regras do Setup

- Faça **uma pergunta por vez**, aguardando resposta antes de prosseguir
- **Nunca sobrescreva** um arquivo existente sem perguntar
- Ao final, mostre um **resumo completo** do que foi feito
- Se qualquer etapa falhar, informe claramente e ofereça alternativa

---

## Etapa 1 — Boas-vindas e Diagnóstico

Exiba:

```
🚀 ai-flow setup

Vou configurar este projeto para usar o Software Engineer Agent.
Isso vai criar os arquivos necessários aqui em: [caminho atual]

Antes de começar, deixa eu ver o que já existe...
```

Verifique silenciosamente:
- [ ] Existe `PERSONA.MD` na raiz?
- [ ] Existe `.azure-mcp.json`?
- [ ] Existe `docs/prd/`?
- [ ] Existe `docs/plan/`?
- [ ] Existe `AI_MEMORY.md`?

Exiba o diagnóstico:

```
📋 Diagnóstico:

  PERSONA.md          → [✅ já existe | ❌ não encontrado]
  .azure-mcp.json    → [✅ já existe | ❌ não encontrado]
  docs/prd/          → [✅ já existe | ❌ não encontrado]
  docs/plan/         → [✅ já existe | ❌ não encontrado]
  AI_MEMORY.md   → [✅ já existe | ❌ não encontrado]

Vou configurar o que está faltando. Pode prosseguir?
```

Aguarde confirmação.

---

## Etapa 2 — PERSONA.md

Se já existe → pergunte: **"Já existe um PERSONA.md. Deseja substituí-lo pelo do ai-flow?"**
Se não existe → prossiga.

Pergunte:

```
📄 PERSONA.md

Como prefere instalar?

  1. Symlink (recomendado) — mudanças no ai-flow refletem automaticamente
  2. Cópia — arquivo independente, sem vínculo com o ai-flow

Qual opção? (1/2)
```

**Se symlink:**
```bash
ln -s [caminho-do-ai-flow]/agents/engineer/PERSONA.MD PERSONA.md
```

**Se cópia:**
```bash
cp [caminho-do-ai-flow]/agents/engineer/PERSONA.MD PERSONA.md
```

Confirme: **"✅ PERSONA.md criado via [symlink/cópia]"**

---

## Etapa 3 — Estrutura de Pastas

Se `docs/prd/` e `docs/plan/` não existem, crie sem perguntar:

```bash
mkdir -p docs/prd
mkdir -p docs/plan
```

Crie também um `.gitkeep` em cada uma para preservar as pastas no git:

```bash
touch docs/prd/.gitkeep
touch docs/plan/.gitkeep
```

Confirme: **"✅ Pastas docs/prd/ e docs/plan/ criadas"**

---

## Etapa 4 — Integração Azure DevOps

Pergunte:

```
🔷 Azure DevOps

Deseja configurar a integração com Azure DevOps?
Isso permite buscar cards, criar Tasks e abrir PRs automaticamente.

(s/n)
```

**Se não:** pule para a Etapa 5.

**Se sim**, faça as perguntas abaixo, uma por vez:

```
1. URL da organização:
   (ex: https://dev.azure.com/minha-empresa)

2. Nome do projeto:
   (ex: MeuProjeto)

3. Nome do repositório:
   (ex: meu-repo)

4. Nome do time (para associar Tasks à sprint):
   (ex: Time Backend — deixe em branco para usar o padrão)

5. Area Path (para organizar Work Items):
   (ex: MeuProjeto\Backend — deixe em branco para usar a raiz)

6. Iteration Path (sprint atual):
   (ex: MeuProjeto\Sprint 5 — deixe em branco para usar a sprint atual)

7. PAT (Personal Access Token) com Full Access:
   ⚠️  Será salvo localmente em .azure-mcp.json (não será commitado)
   Como obter: Azure DevOps → seu avatar → Personal Access Tokens → New Token → Full Access
```

Crie o arquivo `.azure-mcp.json`:

```json
{
  "organization": "[resposta 1]",
  "project": "[resposta 2]",
  "repository": "[resposta 3]",
  "defaultTeam": "[resposta 4 ou '']",
  "defaultAreaPath": "[resposta 5 ou '']",
  "defaultIterationPath": "[resposta 6 ou '']",
  "pat": "[resposta 7]"
}
```

Verifique se `.azure-mcp.json` está no `.gitignore`. Se não estiver, adicione:

```bash
echo ".azure-mcp.json" >> .gitignore
```

Confirme: **"✅ Azure DevOps configurado e .azure-mcp.json protegido no .gitignore"**

Teste a conexão fazendo uma chamada simples à API:
```
GET {organization}/_apis/projects?api-version=7.1
```

- Se sucesso: **"✅ Conexão com Azure DevOps verificada com sucesso!"**
- Se falhar: **"⚠️ Não foi possível conectar. Verifique a URL e o PAT. Configuração salva mesmo assim — você pode corrigir o .azure-mcp.json depois."**

---

## Etapa 5 — AI_MEMORY.md

Pergunte:

```
🧠 Memória do Projeto

Deseja criar um AI_MEMORY.md?
Ele permite ao agent acumular contexto do projeto entre sessões
(stack, decisões de arquitetura, padrões do time, etc.)

(s/n)
```

**Se sim**, faça as perguntas abaixo para pré-preencher o arquivo:

```
1. Qual é o nome do projeto?

2. Qual é o stack principal?
   (ex: .NET 8 + React 18 + PostgreSQL)

3. Qual padrão arquitetural vocês usam?
   (ex: Clean Architecture, Layered, MVC — ou "não definido")

4. Tem alguma convenção específica do time que o agent deve saber?
   (ex: "usamos Result pattern", "controllers sem lógica", "testes obrigatórios" — ou "nenhuma por agora")
```

Gere o `AI_MEMORY.md` com as respostas preenchidas, usando o template em `../../shared/memory-template.md`.

Confirme: **"✅ AI_MEMORY.md criado com contexto inicial do projeto"**

---

## Etapa 6 — .gitignore

Verifique se `.gitignore` existe. Se não existir, crie com o mínimo:

```
.azure-mcp.json
```

Se existir, apenas garanta que `.azure-mcp.json` está listado (feito na Etapa 4 se Azure foi configurado).

---

## Etapa 7 — Resumo Final

Exiba o resumo completo:

```
✅ Setup concluído!

O que foi configurado:

  ✅ PERSONA.md              → via [symlink/cópia]
  ✅ docs/prd/              → criado
  ✅ docs/plan/             → criado
  [✅ .azure-mcp.json       → Azure DevOps configurado]
  [✅ AI_MEMORY.md      → contexto inicial preenchido]
  ✅ .gitignore             → .azure-mcp.json protegido

Estrutura do projeto:
  [caminho-do-projeto]/
  ├── PERSONA.md
  ├── .azure-mcp.json  (não commitado)
  ├── AI_MEMORY.md
  └── docs/
      ├── prd/
      └── plan/

---
🎯 Próximo passo: digite /spec para começar a especificar sua primeira feature!
```