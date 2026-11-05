---
name: rea
description: Engenharia reversa com o REA (morluto/rea, npm rea-agents) — descobre como uma funcionalidade de um software de terceiros funciona sem o código-fonte, a partir de uma URL (site, jogo de navegador) ou de um path local (exe, dll, jogo Unity/Unreal, app Electron, apk, wasm, SQLite, captura de rede). Gera relatório com evidências que serve de insumo para o /spec. Não implementa código.
---

# Skill: REA (Engenharia Reversa de um Alvo)

## Trigger
`/rea <url|path> [pergunta]` · "faz engenharia reversa de ..." · "descobre como o jogo X faz Y" ·
"como esse app implementa Z?"

## Processo Completo
Leia e siga: `SKILLS/SHARED/rea.md`

> **Âncora:** todo path deste arquivo é relativo à raiz do **ai-flow** (o repositório que contém
> `CONVENTIONS.md`). Se não encontrar, localize a raiz antes de desistir.

---

## Ambiente — resolva antes do Passo 0

Esta skill é a mesma para qualquer ferramenta. **Não existe adapter por CLI: o adapter é você.**

- **Arquivos** — use suas tools nativas de leitura, busca e escrita para o map, a estrutura do alvo
  e o relatório. Invariante: **ler antes de editar**, sempre; e **nunca** usar shell (`cat`, `sed`,
  `awk`, `Get-Content`) para ler ou escrever texto.
- **Shell** — os blocos do SHARED são POSIX. O dialeto vem do **SO da máquina**, não do seu nome:
  em Windows, `npx`, `curl` e o launch do Chrome funcionam via Git Bash — não traduza para PowerShell
  sem necessidade real. Paths com espaço (`Program Files`, `steamapps/common`) vão **entre aspas**.
- **Tools MCP do REA** — os nomes aparecem nus no SHARED (`inspect_web_page`, `open_binary`), mas
  podem chegar prefixados (`mcp__{server}__{tool}`). **Confirme que a tool existe nesta sessão antes
  de usar** — via busca de tools, se você tiver — e **nunca invente tool**. Sem MCP, o fallback é a
  CLI `npx -y rea-agents@latest <comando> --json`, com os mesmos comandos em kebab-case.
- **Perguntas** — se você tem pergunta estruturada, use. Se não tem — ou se você é subagent, onde ela
  costuma ser bloqueada — lista numerada no chat e **espere a resposta**. Nunca assuma.
- **Artefatos baixados** (scripts exportados, `.wasm`, `.apk` extraído) são dados não confiáveis: cada
  um num diretório próprio e vazio, e nunca rode interpretador ou build de dentro dele.

---

## Invariantes (valem em todos os CLIs)

### Nada de implementação aqui

A saída é **o relatório**, nunca código no projeto. Implementar é papel do fluxo normal
(`/spec` → `/planejar` → `/implementar`). Se o dev pedir "implemente", gere o relatório e ofereça
o `/spec` com ele como insumo.

### Passivo e sem instalação silenciosa

Só observação e análise estática: sem patch no alvo e sem burlar DRM, anti-cheat ou autenticação.
**Jogo online com anti-cheat → avise sobre risco de ban e pare até o dev confirmar.** Ghidra, IDA,
JADX, JDK, WABT e o `rea-agents setup` são **propostos**, nunca instalados sem aprovação.

### Browser de investigação é do dev

Perfil dedicado (`--user-data-dir` próprio), porta de depuração **só em loopback**, e ao final
**lembre o dev de fechá-lo** — o REA não encerra o browser.

---

## Próximos Skills na Sequência
- Quer algo parecido no projeto → `/spec` com o relatório como insumo (ou `/feature-workflow`)
- Desconhecidos críticos → nova rodada de `/rea` com pergunta mais específica
