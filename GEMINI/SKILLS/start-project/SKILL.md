# Skill: Start Project (Zero ao MVP_000001 Rodando)

## Trigger
`/start-project` · "começar projeto" · "novo projeto do zero" · "criar projeto e MVP"

## Processo Completo
Leia e siga: `SKILLS/SHARED/start-project.md`

Esta skill é um **orquestrador** que reusa a lógica de outras skills SHARED.
Sempre que o processo mandar "delegar para `SKILLS/SHARED/X.md`", carregue
aquele arquivo e execute seus passos dentro desta conversa.

Skills referenciadas:
- `SKILLS/SHARED/setup-project.md` (Passo 6)
- `SKILLS/SHARED/spec.md` (Passo 8A — caminho enxuto)
- `SKILLS/SHARED/planejar.md` (Passo 9 — caminho enxuto; não roda no completo)
- `SKILLS/SHARED/epic-workflow.md` (Passo 8B — caminho completo, sempre com `--so-planejar`)

---

## Notas Específicas do Gemini

### Estilo da Conversa

O Passo 1 (Descoberta) deve ser **conversacional**, não um questionário rígido.
Faça as 4 perguntas em uma única mensagem mas deixe claro que o dev pode
responder em estilo livre. Capture o que vier e siga.

Para escolhas com opções predefinidas (boilerplate, slicing do MVP, confirmações
de `git init`/`install`), apresente uma lista curta e numerada de opções e
peça uma escolha explícita do dev antes de prosseguir.

### Leitura das Skills Reusadas

Antes de executar os passos 4, 6 e 7, leia o arquivo SHARED correspondente.
Não confie na memória — releia o conteúdo atualizado a cada uso.

### Criação de Arquivos e Pastas

Use as capacidades nativas do Gemini para criar e escrever arquivos locais.

Estrutura do map a criar:
```
MAPS/{slug}/
  prd/.gitkeep
  plan/.gitkeep
  adr/.gitkeep
  epic/.gitkeep
  e2e/.gitkeep
  {slug}-map.json
  {slug}-context.md
```

### Listagem de Boilerplates

Liste o conteúdo de:
- `BOILERPLATES/BACK/`
- `BOILERPLATES/FRONT/`

Para cada boilerplate, tente ler o `README.md` dele (se existir) e mostre uma
descrição curta junto da opção.

### Cópia de Boilerplate

Use uma operação recursiva de cópia da pasta `BOILERPLATES/{categoria}/{nome}/`
para o path local do repo. Preservar a estrutura de subpastas.

Substituir placeholders comuns (`{{PROJECT_NAME}}`, `{{REPO_NAME}}`, etc.) pelos
valores reais após a cópia, se o boilerplate usar essa convenção.

### Comandos com Confirmação

Antes de rodar `git init`, `npm install`, `dotnet restore`, etc., **sempre**
confirmar explicitamente com o dev. Não execute silenciosamente.

### Verificação de Path Existente

Antes de aplicar boilerplate ou criar `.ai-project`:
- Se o path não existe → criar a pasta e prosseguir
- Se o path existe e está vazio → prosseguir
- Se o path existe e tem conteúdo → parar, avisar e pedir decisão (pular / usar mesmo assim / cancelar)

### Bifurcação Enxuto × Completo (Passo 2)

O recorte do Passo 2 pode terminar em **dois formatos de saída**, e é o dev quem escolhe.
As condições, as opções e o que cada caminho produz estão **só** no SHARED
(`start-project.md` § Enxuto × Completo e Passo 2) — leia de lá e não decida por memória:
este menu já mudou uma vez, e os adaptadores que o copiaram ficaram oferecendo o menu antigo.

Aqui só a mecânica: apresentar as opções com uma lista curta e numerada, e respeitar a escolha nos Passos 8/9/10
sem perguntar de novo.

### Próximo Skill na Sequência
Depende do caminho — o Passo 10 do SHARED (10A enxuto / 10B completo) traz o comando exato.
