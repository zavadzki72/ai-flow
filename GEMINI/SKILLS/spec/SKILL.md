# Skill: Spec (Criar PRD)

## Trigger
`/spec` · `/prd` · `/criar-spec` · `/criar-prd` · "criar especificação" · "nova feature"

## Processo Completo
Leia e siga: `SKILLS/SHARED/spec.md`

---

## Notas Específicas do Gemini

### Integração com Ferramentas de Gestão

Se `map.tooling.project-management.type == "azure-devops"`, usar a extensão/plugin disponível
para buscar work items, adicionar comentários e atualizar tags.

Se `map.tooling.project-management.type == "jira"`, usar a integração Jira disponível para
buscar issues e adicionar comentários.

Projetos/boards a usar:
- Work items → `map.tooling.project-management.workitems-project`

### Leitura de Arquivos

Use as capacidades nativas do Gemini para ler arquivos locais e explorar a estrutura
de pastas dos repositórios referenciados no `map.json`.

### Próximo Skill na Sequência
Após gerar o PRD, sugerir: `/planejar`
