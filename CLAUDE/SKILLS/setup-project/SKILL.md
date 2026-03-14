---
name: setup-project
description: Cria um novo projeto no ai-flow. Coleta todas as informações necessárias via perguntas guiadas em blocos (projeto, stack, arquitetura, repositórios, tooling e contexto opcional), gera a estrutura completa em MAPS/{slug}/ com map.json e context.md preenchidos, e configura o .ai-project nos repositórios locais informados.
---

# Skill: Setup Project (Criar Novo Projeto)

## Trigger
`/setup-project` · "criar projeto" · "novo projeto" · "adicionar projeto"

## Processo Completo
Leia e siga: `SKILLS/SHARED/setup-project.md`

---

## Notas Específicas do Claude Code

### Criação de Arquivos e Pastas

Use as ferramentas nativas — nunca bash para criar arquivos de texto:
- `Write` — para criar `map.json`, `context.md` e `.ai-project`
- `Bash` — apenas para criar as pastas (`mkdir -p`) e os `.gitkeep`

Para as pastas do map, executar:
```bash
mkdir -p "MAPS/{slug}/prd" "MAPS/{slug}/plan" "MAPS/{slug}/adr"
touch "MAPS/{slug}/prd/.gitkeep" "MAPS/{slug}/plan/.gitkeep" "MAPS/{slug}/adr/.gitkeep"
```

### Verificação de Caminho Existente

Para checar se o path local do repositório existe antes de criar o `.ai-project`:
```bash
[ -d "{path}" ] && echo "exists" || echo "not_found"
```

### Derivação do Slug

Regras para derivar o slug a partir do nome do projeto:
1. Converter para minúsculas
2. Substituir acentos e cedilhas pelos equivalentes sem acento (ã→a, ç→c, é→e, etc.)
3. Substituir espaços e underscores por hífens
4. Remover qualquer caractere que não seja letra, número ou hífen
5. Remover hífens duplicados ou nas extremidades

Exemplos:
- "Meu Sistema" → `meu-sistema`
- "Order Manager 2.0" → `order-manager-20`
- "Clarity" → `clarity`
- "Gestão de KPIs" → `gestao-de-kpis`

### Verificação de Projeto Existente

Antes de criar, verificar se `MAPS/{slug}/` já existe:
```bash
[ -d "MAPS/{slug}" ] && echo "exists" || echo "ok"
```

Se existir, avisar o dev e pedir confirmação antes de prosseguir.

### Próximo Skill na Sequência
Após o setup, sugerir: `/spec` para criar o primeiro PRD do projeto.
