#!/usr/bin/env bash
# Liga os maps privados (repo ai-flow-maps) em MAPS/{slug}.
#
# O ai-flow é público e guarda a FERRAMENTA; os maps são DADOS e vivem no repo
# privado ai-flow-maps. Este script cria um symlink por projeto, de modo que
# MAPS/{slug} continue resolvendo — .ai-project, skills e docs seguem iguais.
#
# Os links são RELATIVOS: funcionam em qualquer máquina, desde que os dois
# repositórios estejam clonados lado a lado.
#
# Uso: ./scripts/link-maps.sh [caminho-do-ai-flow-maps]
#      default: ../ai-flow-maps
set -euo pipefail

AF_ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
MAPS_REPO="$(cd "${1:-$AF_ROOT/../ai-flow-maps}" 2>/dev/null && pwd || true)"

if [ -z "$MAPS_REPO" ] || [ ! -d "$MAPS_REPO" ]; then
  cat >&2 <<ERRO
erro: não achei o repo de maps em: ${1:-$AF_ROOT/../ai-flow-maps}

Clone-o lado a lado do ai-flow:
  git clone git@github.com:zavadzki72/ai-flow-maps.git

Ou passe o caminho explicitamente:
  ./scripts/link-maps.sh /caminho/para/ai-flow-maps
ERRO
  exit 1
fi

mkdir -p "$AF_ROOT/MAPS"
linked=0
pulados=0

for dir in "$MAPS_REPO"/*/; do
  slug="$(basename "$dir")"
  [ "$slug" = "_template" ] && continue    # o template é ferramenta: vive no ai-flow, versionado
  target="$AF_ROOT/MAPS/$slug"

  # Nunca sobrescrever um diretório real — pode ser trabalho ainda não movido.
  if [ -e "$target" ] && [ ! -L "$target" ]; then
    echo "  ! MAPS/$slug é um diretório real — não vou tocar."
    echo "    Se já está no repo de maps, apague-o daqui e rode de novo."
    pulados=$((pulados + 1))
    continue
  fi

  # Link relativo (../../ai-flow-maps/{slug}), para ser portável entre máquinas.
  rel="$(python3 -c 'import os,sys; print(os.path.relpath(sys.argv[1], sys.argv[2]))' "${dir%/}" "$AF_ROOT/MAPS")"
  ln -sfn "$rel" "$target"
  echo "  ✓ MAPS/$slug -> $rel"
  linked=$((linked + 1))
done

echo ""
if [ "$pulados" -gt 0 ]; then
  echo "$linked projeto(s) ligado(s), $pulados pulado(s)."
else
  echo "$linked projeto(s) ligado(s)."
fi

# Sanidade: todo link resolve?
quebrados=0
for l in "$AF_ROOT"/MAPS/*; do
  if [ -L "$l" ] && [ ! -e "$l" ]; then
    echo "  ✗ QUEBRADO: $l"
    quebrados=$((quebrados + 1))
  fi
done

if [ "$quebrados" -eq 0 ]; then
  echo "Todos os links resolvem."
else
  exit 1
fi
