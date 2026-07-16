#!/usr/bin/env bash
# Instala o ai-flow numa máquina: skills, agentes e maps.
#
# Roda tudo por symlink — nada é copiado. Editar um arquivo no repo passa a
# valer na hora (menos para a sessão já aberta: o registro de skills e agentes
# é snapshot de startup, então reinicie o cliente depois de instalar).
#
# Uso:
#   ./scripts/install.sh                 # instala em ../.claude (o workspace que contém o ai-flow)
#   ./scripts/install.sh ~/.claude       # instala para o usuário (vale em qualquer projeto)
#   ./scripts/install.sh /caminho/repo/.claude
set -euo pipefail

AF_ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
DEST="${1:-$(cd "$AF_ROOT/.." && pwd)/.claude}"

echo "ai-flow: $AF_ROOT"
echo "destino: $DEST"
echo ""

# ── Skills ─────────────────────────────────────────────────────────────────
# Delegado ao link-skills.sh (padrão Agent Skills: pasta por skill com
# SKILL.md dentro) — o mesmo script serve Copilot, Codex e afins.
echo "Skills:"
"$AF_ROOT/scripts/link-skills.sh" "$DEST/skills" | { grep '✓' || true; } | sed 's/^/  /'
skills=$(find "$DEST/skills" -name SKILL.md -type l 2>/dev/null | wc -l)

# ── Agentes ────────────────────────────────────────────────────────────────
# Claude-only: subagent em janela isolada não existe nos outros clientes.
echo ""
echo "Agentes:"
agents=0
mkdir -p "$DEST/agents"
for f in "$AF_ROOT"/AGENTS/SHARED/*.md; do
  papel="$(basename "$f" .md)"
  [ "$papel" = "DESIGN" ] && continue
  ln -sf "$f" "$DEST/agents/$papel.md"
  echo "  ✓ $papel"
  agents=$((agents + 1))
done

# ── Maps ───────────────────────────────────────────────────────────────────
# Vivem no repo privado ai-flow-maps. Se ele não estiver clonado, seguimos —
# a instalação das skills não depende disso.
echo ""
echo "Maps:"
if [ -d "$AF_ROOT/../ai-flow-maps" ]; then
  "$AF_ROOT/scripts/link-maps.sh" | sed 's/^/  /'
else
  echo "  ! repo de maps não encontrado em $AF_ROOT/../ai-flow-maps"
  echo "    clone-o lado a lado e rode ./scripts/link-maps.sh:"
  echo "      git clone https://github.com/zavadzki72/ai-flow-maps.git"
fi

# ── Sanidade ───────────────────────────────────────────────────────────────
echo ""
quebrados=0
while IFS= read -r l; do
  [ -e "$l" ] || { echo "  ✗ QUEBRADO: $l"; quebrados=$((quebrados + 1)); }
done < <(find "$DEST" -type l 2>/dev/null)

echo "$skills skill(s), $agents agente(s) instalados."
if [ "$quebrados" -gt 0 ]; then
  echo "$quebrados link(s) quebrado(s) — algo está errado."
  exit 1
fi
echo ""
echo "Reinicie a sessão do cliente: o registro de skills e agentes é lido no startup."
