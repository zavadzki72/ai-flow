#!/usr/bin/env bash
# Liga as skills do ai-flow (SKILLS/ e MCP/) em qualquer cliente que siga o
# padrão Agent Skills (pasta por skill com SKILL.md dentro): Claude Code,
# Copilot CLI, Codex, etc.
#
# Roda por symlink — nada é copiado. Editar a skill no repo passa a valer na
# hora (menos para a sessão já aberta: o registro de skills é snapshot de
# startup, então reinicie o cliente depois de linkar).
#
# O symlink é de ARQUIVO, nunca de diretório: `ln -sfn` contra um diretório
# existente aninha em silêncio em vez de substituir.
#
# Uso:
#   ./scripts/link-skills.sh                    # clientes detectados na máquina
#   ./scripts/link-skills.sh ~/.codex/skills    # só o(s) destino(s) passado(s)
#   ./scripts/link-skills.sh .github/skills     # skills no nível do repo (Copilot)
#
# Sem argumentos, instala para todo cliente conhecido cujo diretório de config
# exista (~/.claude, ~/.copilot, ~/.codex). Com argumentos, instala só neles —
# qualquer caminho serve, desde que o cliente leia skills dali.
set -euo pipefail

# Windows/Git Bash: ln -s copia por padrão — força symlink nativo (exige Modo
# Desenvolvedor ou shell elevado).
case "$(uname -s)" in
  MINGW*|MSYS*) export MSYS="winsymlinks:nativestrict" ;;
esac

AF_ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"

# ── Destinos ───────────────────────────────────────────────────────────────
destinos=()
if [ "$#" -gt 0 ]; then
  destinos=("$@")
else
  # A presença do diretório de config indica que o cliente está instalado.
  [ -d "$HOME/.claude" ]  && destinos+=("$HOME/.claude/skills")
  [ -d "$HOME/.copilot" ] && destinos+=("$HOME/.copilot/skills")
  [ -d "$HOME/.codex" ]   && destinos+=("$HOME/.codex/skills")
fi

if [ "${#destinos[@]}" -eq 0 ]; then
  cat >&2 <<'ERRO'
erro: nenhum cliente detectado (~/.claude, ~/.copilot, ~/.codex).

Passe o destino explicitamente:
  ./scripts/link-skills.sh /caminho/para/skills
ERRO
  exit 1
fi

# ── Fontes ─────────────────────────────────────────────────────────────────
# Skills de processo (SKILLS/) e de setup de MCP (MCP/) — ambas seguem o
# padrão: pasta com SKILL.md dentro. O slug vem do frontmatter `name:`
# (em MCP/ o nome é setup-mcp-{provider}, diferente do basename).
fontes=()
for dir in "$AF_ROOT"/SKILLS/*/ "$AF_ROOT"/MCP/*/; do
  case "$(basename "$dir")" in
    SHARED)    continue ;;                    # SHARED é o processo, não é uma skill
    _template) continue ;;                    # template de provider MCP, não é uma skill
  esac
  [ -f "$dir/SKILL.md" ] || continue
  fontes+=("$dir")
done

# ── Links ──────────────────────────────────────────────────────────────────
total=0
for dest in "${destinos[@]}"; do
  echo "→ $dest"
  # Destino que é symlink é resquício da abordagem antiga (link do diretório
  # inteiro, quebra quando o repo move) — troca por diretório real.
  [ -L "$dest" ] && rm "$dest"
  mkdir -p "$dest"
  n=0
  for dir in "${fontes[@]}"; do
    slug="$(sed -n 's/^name:[[:space:]]*//p' "$dir/SKILL.md" | head -1)"
    [ -n "$slug" ] || slug="$(basename "$dir")"

    [ -L "$dest/$slug" ] && rm "$dest/$slug"   # mesmo resquício, no nível da skill
    mkdir -p "$dest/$slug"
    ln -sf "$dir/SKILL.md" "$dest/$slug/SKILL.md"
    echo "  ✓ $slug"
    n=$((n + 1))
  done
  total=$((total + n))
done

# ── Sanidade ───────────────────────────────────────────────────────────────
quebrados=0
for dest in "${destinos[@]}"; do
  while IFS= read -r l; do
    [ -e "$l" ] || { echo "  ✗ QUEBRADO: $l"; quebrados=$((quebrados + 1)); }
  done < <(find "$dest" -type l 2>/dev/null)
done

echo ""
echo "$total link(s) de skill em ${#destinos[@]} destino(s)."
if [ "$quebrados" -gt 0 ]; then
  echo "$quebrados link(s) quebrado(s) — algo está errado."
  exit 1
fi
echo "Reinicie a sessão do cliente: o registro de skills é lido no startup."
