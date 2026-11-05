# Skill: REA (Engenharia Reversa de um Alvo)

## Descrição
Investiga **como uma funcionalidade de um software de terceiros funciona** sem ter o código-fonte,
usando o **REA — Reverse Engineer Anything** (`github.com/morluto/rea`, pacote npm `rea-agents`).
O alvo pode ser uma **URL** (site, jogo de navegador) ou um **path local** (exe, dll, jogo, app
Electron, apk, wasm, banco SQLite, captura de rede).

A saída é um **relatório de pesquisa com evidências**: explica o fluxo, cita a origem de cada
conclusão e lista o que ficou desconhecido. O relatório é **insumo** para o `/spec`. Esta skill
**não implementa código**: quem implementa é o fluxo normal (`/spec` → `/planejar` → `/implementar`
ou `/feature-workflow`).

---

## Regras Fundamentais

- **Evidência primeiro.** Toda conclusão cita a origem: função/endereço, classe/método, arquivo:linha
  do bundle ou requisição observada. Inferência é marcada como inferência; o que não foi visto vai
  para "Desconhecidos".
- **Só observação passiva e análise estática.** Não modifique o alvo, não aplique patches em
  binários, não burle DRM, anti-cheat, licença ou autenticação.
- **Jogos online com anti-cheat** (EasyAntiCheat, BattlEye, Vanguard etc.): pare e avise o dev sobre
  risco de ban e violação dos termos de uso **antes** de qualquer análise. Só continue com
  confirmação explícita.
- **Nada é instalado sem aprovação.** Ghidra, IDA, JADX, JDK, WABT e o registro MCP do REA são
  propostos ao dev, nunca instalados por conta própria.
- **Reimplementar, não copiar.** O relatório descreve a mecânica. Código proprietário recuperado
  aparece só em trechos curtos, como evidência, nunca como base para colar no projeto.

---

## Processo

### Passo 0: Entrada e Contexto

**0.1. Interpretar os argumentos**

`/rea <alvo> [pergunta]`:
- **alvo** = primeiro token (path com espaços vem entre aspas).
  - Se o dev der só o **nome** de um app ou jogo, procure o path nos lugares usuais (biblioteca da
    Steam, `Program Files`, `~/AppData/Local/Programs`, `/Applications`) e **confirme com o dev**
    antes de seguir.
- **pergunta** = o resto. Se estiver vazia, pergunte ao dev **uma vez**: "Qual funcionalidade
  quer entender?" e espere a resposta.

**0.2. Projeto ativo (opcional)**

Verifique se existe `.ai-project` na raiz do repositório atual:
- **Se existir:** leia `{slug}-map.json` e `{slug}-context.md`. O relatório será salvo no map
  (Passo 5) e o "Próximos passos" deve falar a língua do projeto (stack, arquitetura).
- **Se não existir:** **não pergunte.** Investigar não depende de projeto; o relatório fica no
  diretório atual (Passo 5).

### Passo 1: Garantir o REA

1. **MCP:** verifique se as tools do REA estão disponíveis na sessão (ex.: `inspect_web_page`,
   `open_binary`, `analyze_javascript_application`). Se estiverem, prefira-as.
2. **CLI (fallback):** sem MCP, use `npx -y rea-agents@latest <comando> ... --json`. Se o `rea`
   estiver instalado globalmente, use `rea <comando>`.
   - Requer Node 22.x (>=22.19), 24.x (>=24.11) ou 26+. Confira com `node -v`. Fora disso,
     informe o dev e pare.
3. **Registro permanente:** se o dev usa o REA com frequência, sugira (sem executar):
   `npx rea-agents@latest setup --client <cliente> --dry-run --json` para revisar e depois o mesmo
   comando com `--yes`, reiniciando o cliente. O setup também instala a skill
   `reverse-engineer-anything` do REA; se ela estiver disponível, siga o fluxo de investigação dela
   **dentro** deste processo.

### Passo 2: Classificar o Alvo

Para um **diretório**, liste a estrutura (uns 2 níveis) **antes** de escolher o caminho.

| Alvo | Como reconhecer | Caminho |
|---|---|---|
| URL `http(s)://` | prefixo | **Navegador** (Passo 3A) |
| Jogo Unity (Mono) | `*_Data/Managed/Assembly-CSharp.dll` | **.NET** (Passo 3C) no `Assembly-CSharp.dll` |
| Jogo Unity (IL2CPP) | `GameAssembly.dll` + `*_Data/il2cpp_data/` | **Nativo** (Passo 3B) no `GameAssembly.dll` |
| Electron / app JS | `resources/app.asar`, `resources/app/`, `package.json` | `analyze-javascript-application <dir-ou-asar>` |
| `.exe` / `.dll` .NET | tente `inspect-managed-artifact` primeiro | **.NET** (Passo 3C) |
| `.exe` / `.dll` / `.so` / `.dylib` nativo | demais binários | **Nativo** (Passo 3B) |
| `.apk` | extensão | `inspect-android-package`, `search-android-classes`, `inspect-android-method` (JADX + JDK). Flutter (`libapp.so`): `identify-flutter-build`, `inspect-dart-aot` |
| `.wasm` | extensão | `inspect-wasm-artifact <path> --format json` (WABT 1.0.42) |
| `.db` / `.sqlite` | extensão/magic | `inspect-sqlite-database` |
| `.har` / `.saz` / `.pcap` | extensão | ferramentas de captura de rede do REA |

Informe o dev do tipo detectado (engine, versão se aparecer) antes de aprofundar.

### Passo 3A: Navegador (URL)

1. **Browser com depuração.** Verifique se já existe um:
   ```bash
   curl -s http://127.0.0.1:9222/json/version
   ```
   Se não houver, **avise o dev** e abra um Chrome/Edge/Chromium com **perfil dedicado**:
   ```bash
   "<chrome>" --remote-debugging-port=9222 --user-data-dir="${TMPDIR:-/tmp}/rea-browser" "<URL>" &
   ```
   Onde `<chrome>` é, por SO:
   - Windows: `/c/Program Files/Google/Chrome/Application/chrome.exe` (ou o `msedge.exe` em
     `/c/Program Files (x86)/Microsoft/Edge/Application/`)
   - macOS: `/Applications/Google Chrome.app/Contents/MacOS/Google Chrome`
   - Linux: `google-chrome` / `chromium`

   A porta fica **só em loopback**; nunca a exponha. Se o alvo exigir login, o dev loga nessa janela.
2. `list-browser-targets http://127.0.0.1:9222 --json` e escolha a aba da origem da URL.
3. `inspect-web-page <endpoint> <TARGET_ID> --observation-ms 1000 --json`: scripts, recursos,
   rede, WebSocket, workers.
4. `analyze-web-bundle <endpoint> <TARGET_ID> --json`, pedindo source maps: chunks, rotas,
   endpoints, vendors (Phaser, PixiJS, Three.js, Unity loader, Godot etc.).
5. **Comportamento que depende de ação do usuário:** diga ao dev **exatamente** o que fazer
   ("quando eu avisar, faça um combo de 3 golpes"), espere ele confirmar que está pronto e então
   arme `observe-web-session <endpoint> <TARGET_ID> --observation-ms 15000 --json`.
6. **JS a fundo:** exporte os scripts capturados (`export-web-scripts`) para um diretório próprio e
   rode `analyze-javascript-application` neles.
7. **Lógica em `.wasm`** (Unity WebGL, Godot, Emscripten): salve o artefato num diretório próprio e
   siga para `inspect-wasm-artifact`. Avise que o resultado é baixo nível (WAT).
8. **Lógica no servidor** (multiplayer): deixe explícito que só o **protocolo observado** está
   disponível (mensagens, payloads, ordem), não o código do servidor.
9. Ao terminar, lembre o dev de **fechar o browser de investigação**. O REA não o encerra.

### Passo 3B: Nativo

1. **Provider:** verifique se há Ghidra (`GHIDRA_INSTALL_DIR` ou instalação conhecida), IDA, Hopper
   (só macOS/Linux) ou, para inspeção offline, rizin/objdump.
2. **Sem provider:** explique as opções (Ghidra é gratuito; no Windows o suporte do REA a Ghidra
   ainda é experimental) e **pare esta trilha**. Continue o que der sem provider: strings, build
   info de Go/Rust, recursos e metadados do pacote.
3. **Com provider:**
   - `inspect <bin> --provider <p> --json`
   - `search <bin> <termo> --kind procedures --provider <p> --json` (termos derivados da pergunta:
     nomes, strings da UI, mensagens de erro)
   - `function <bin> <procedimento> --provider <p> --json` para o dossiê
   - Siga chamadas e referências até a lógica da funcionalidade.
   - Binário grande: aumente `REA_GHIDRA_STARTUP_TIMEOUT_MS` / `REA_HOPPER_STARTUP_TIMEOUT_MS`.

### Passo 3C: .NET (inclui Unity Mono)

1. `inspect-managed-artifact <dll> --json` para metadados, tipos e dependências nativas.
2. `inspect-managed-members <dll> --type <Namespace.Tipo> --json` nos tipos ligados à pergunta.
   Comece por nomes óbvios (ex.: `Player`, `Damage`, `Score`, `Inventory`) e siga as referências.

### Passo 4: Gerar o Relatório

```markdown
# REA — {funcionalidade} em {alvo}
> Data: {AAAA-MM-DD} · Alvo: {path ou URL} · Tipo: {tipo/engine/versão} · REA: {versão} · Via: {MCP|CLI}

## Pergunta
{a pergunta do dev}

## Como funciona
{o fluxo, passo a passo, em linguagem de negócio + técnica}

## Evidências
- `{função/classe/arquivo:linha/requisição}` — {o que prova}

## Código recuperado (trechos)
{pseudocódigo/C#/JS curtos — só o necessário para provar o fluxo}

## Regras e números observados
{fórmulas, constantes, limites, tempos, payloads — o que um /spec precisaria}

## Desconhecidos e limitações
- {o que não foi visto e por quê}

## Próximos passos
- {como levar isso para o projeto — sem código, nível /spec}
```

### Passo 5: Salvar e Apresentar

- **Com projeto ativo:** salve em `{AI_FLOW_ROOT}/{map-path}/{docs.research ou "research/"}rea-{alvo-slug}-{AAAA-MM-DD}.md`
  (crie o diretório se não existir).
- **Sem projeto ativo:** salve em `./rea-{alvo-slug}-{AAAA-MM-DD}.md` no diretório atual.
- Apresente ao dev um resumo curto (3 a 6 linhas) + o path do relatório + os principais
  desconhecidos.

---

## Próximos Skills na Sequência
- Quer algo parecido no projeto → `/spec` passando o relatório como insumo
  (ou `/feature-workflow` direto, se a feature for pequena e clara)
- Desconhecidos críticos → nova rodada de `/rea` com pergunta mais específica
