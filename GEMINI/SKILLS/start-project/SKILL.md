# Skill: Start Project (Zero ao MVP_000001 Rodando)

## Trigger
`/start-project` · "começar projeto" · "novo projeto do zero" · "criar projeto e MVP"

## Processo Completo
Leia e siga: `SKILLS/SHARED/start-project.md`

Esta skill é um **orquestrador** que reusa a lógica de outras skills SHARED.
Sempre que o processo mandar "delegar para `SKILLS/SHARED/X.md`", carregue
aquele arquivo e execute seus passos dentro desta conversa.

Skills referenciadas:
- `SKILLS/SHARED/setup-project.md` (Passo 4)
- `SKILLS/SHARED/spec.md` (Passo 6)
- `SKILLS/SHARED/planejar.md` (Passo 7)

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
  map.json
  context.md
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

### Detecção de Tamanho do MVP

Após o dev confirmar o recorte (Passo 2), conte os fluxos. Se > 5 OU envolve
integrações externas complexas, apresente o alerta de slicing com as 3
opções (fatiar / manter / outro recorte) antes de prosseguir.

### Sem Limite Duro

A skill **não impõe** um limite de tamanho para o MVP_000001. Apenas alerta
e oferece slicing. Se o dev disser "manter como está", siga adiante.

### Próximo Skill na Sequência
Após o `/start-project`, o dev deve rodar `/implementar ETAPA 1` para começar
a execução do MVP_000001.
