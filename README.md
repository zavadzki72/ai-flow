# 🤖 ai-flow

Repositório central de agents de IA e skills pré-configuradas para uso no dia a dia com Claude Code/Gemini.

---

## Estrutura

```
ai-flow/
├── agents/
│   └── software-engineer/
│       ├── PERSONA.md              # Identidade e ponto de entrada do agent
│       ├── commands/              # Comandos do ciclo de desenvolvimento
│       │   ├── spec.md            # /spec → entrevista + PRD
│       │   ├── planejar.md        # /planejar → PLAN com steps
│       │   └── implementar.md     # /implementar <STEP> → execução
│       ├── skills/                # Capacidades do agent
│       │   ├── _index.md
│       │   ├── prd-template.md    # Template do PRD
│       │   ├── plan-template.md   # Template do PLAN
│       │   ├── code-review.md
│       │   ├── code-generation.md
│       │   ├── architecture.md
│       │   └── debugging.md
│       ├── context/               # Adaptações por stack
│       │   ├── dotnet.md
│       │   ├── typescript.md
│       │   ├── python.md
│       │   ├── sql.md
│       │   └── generic.md
│       └── flows/                 # Tarefas complexas fora do ciclo
│           ├── pr-review.md
│           ├── new-feature.md
│           └── bug-fix.md
├── integrations/
│   └── azure/
│       ├── setup.md               # Configuração e autenticação (PAT)
│       ├── work-items.md          # Ler/criar/atualizar cards
│       ├── repos.md               # Branches e Pull Requests
│       └── boards.md              # Sprints e backlog
└── shared/
    ├── conventions.md
    ├── output-formats.md
    └── memory-template.md
```

---

## Como usar

### 1. Clone o repositório

```bash
git clone https://github.com/seu-usuario/ai-flow.git ~/ai-flow
```

### 2. No repositório alvo, crie um symlink

```bash
cd ~/meu-projeto
ln -s ~/ai-flow/agents/software-engineer/PERSONA.md PERSONA.md
```

### 3. (Opcional) Configure a integração Azure

```bash
# Crie o arquivo de configuração (NÃO commitar)
cat > .azure-mcp.json << EOF
{
  "organization": "https://dev.azure.com/sua-org",
  "project": "seu-projeto",
  "repository": "seu-repo",
  "defaultTeam": "seu-time",
  "pat": "SEU_PAT_AQUI"
}
EOF

echo ".azure-mcp.json" >> .gitignore
```

### 4. Inicie o CLI de AI

```bash
claude
```

```bash
gemini
```

---

## Ciclo de Desenvolvimento com Comandos

```
┌─────────────────────────────────────────────────────────────────┐
│                        CICLO COMPLETO                           │
├─────────────────────────────────────────────────────────────────┤
│                                                                  │
│  /spec                                                           │
│  ├── Dev descreve a feature ou passa o card Azure               │
│  ├── Agent faz 25 perguntas (UMA POR VEZ, sem deduzir nada)    │
│  ├── Gera PRD em docs/prd/PRD-YYYY-MM-DD-slug.md               │
│  └── (Opcional) Atualiza Work Item no Azure DevOps              │
│                          ↓                                       │
│  /planejar                                                       │
│  ├── Lê o PRD gerado                                            │
│  ├── Faz perguntas de planejamento técnico                      │
│  ├── Gera PLAN em docs/plan/PLAN-slug.md                        │
│  │   └── Steps numerados com tarefas, arquivos e critérios     │
│  └── (Opcional) Cria Tasks no Azure + branch de feature         │
│                          ↓                                       │
│  /implementar STEP-01                                            │
│  ├── Dev escolhe qual step executar                             │
│  ├── Agent mostra briefing e aguarda confirmação                │
│  ├── Implementa o código completo do step                       │
│  ├── Atualiza o PLAN (marca step como ✅)                       │
│  └── (Opcional) Atualiza Task no Azure para "Done"              │
│                          ↓                                       │
│  /implementar STEP-02  (controlado pelo dev, step por step)    │
│  ...                                                             │
│                          ↓                                       │
│  Último step → Sugestão de abrir PR no Azure Repos              │
│                                                                  │
└─────────────────────────────────────────────────────────────────┘
```

---

## Estrutura de pastas criada no projeto alvo

```
meu-projeto/
├── PERSONA.md              ← symlink para o agent
├── .azure-mcp.json        ← config Azure (no .gitignore)
├── AI_MEMORY.md       ← memória do projeto (opcional)
└── docs/
    ├── prd/
    │   └── PRD-2024-03-15-minha-feature.md
    └── plan/
        └── PLAN-minha-feature.md
```

---

## Agents disponíveis

| Agent | Descrição | Comandos |
|---|---|---|
| Software Engineer | Ciclo completo de dev com PRD, PLAN e implementação step-by-step | `/spec` `/planejar` `/implementar` |

---

## Como atualizar

Como o `PERSONA.md` é um symlink, basta atualizar o repositório `ai-flow`:

```bash
cd ~/ai-flow
git pull
# Todos os projetos com symlink estão atualizados automaticamente
```