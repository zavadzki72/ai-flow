# Skill: Setup Project (Criar Novo Projeto)

## Trigger
`/setup-project` · "criar projeto" · "novo projeto" · "adicionar projeto"

## Processo Completo
Leia e siga: `SKILLS/SHARED/setup-project.md`

---

## Notas Específicas do Gemini

### Criação de Arquivos e Pastas

Use as capacidades nativas do Gemini para criar e escrever arquivos locais.

Para as pastas do map, criar a seguinte estrutura:
```
MAPS/{slug}/
  prd/
  plan/
  adr/
```

Com arquivos `.gitkeep` em cada subpasta para que sejam rastreadas pelo git.

### Verificação de Caminho Existente

Antes de criar o `.ai-project` em cada repositório, verificar se o caminho local existe.
Somente criar o arquivo se o diretório existir. Reportar os que não existirem no resultado final.

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

Antes de criar, verificar se `MAPS/{slug}/` já existe no repositório ai-flow.
Se existir, avisar o dev e pedir confirmação antes de prosseguir.

### Próximo Skill na Sequência
Após o setup, sugerir: `/spec` para criar o primeiro PRD do projeto.
