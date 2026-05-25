# Cursor

Adapters para usar as skills do ai-flow no Cursor.

## Como Usar

Cursor reconhece comandos customizados a partir de arquivos Markdown em `.cursor/commands`.

Para instalar uma skill em um projeto:
1. Crie a pasta `.cursor/commands` no repositório onde o dev trabalha.
2. Copie o conteúdo de `CURSOR/SKILLS/{skill}/SKILL.md`.
3. Salve como `.cursor/commands/{skill}.md`.
4. No chat do Cursor, execute `/{skill}`.

Exemplo:
```powershell
New-Item -ItemType Directory -Path ".cursor\commands" -Force | Out-Null
Copy-Item "C:\Projects\Personal\IA\ai-flow\CURSOR\SKILLS\implementar\SKILL.md" ".cursor\commands\implementar.md"
```

Para contexto persistente do ai-flow no Cursor, copie também `CURSOR/RULES/ai-flow.mdc` para `.cursor/rules/ai-flow.mdc`.

## Skills Disponíveis

| Skill | Arquivo para `.cursor/commands` |
|-------|---------------------------------|
| `code-review` | `code-review.md` |
| `implementar` | `implementar.md` |
| `planejar` | `planejar.md` |
| `spec` | `spec.md` |
| `setup-project` | `setup-project.md` |

## Observações

- Os comandos Cursor são Markdown simples. O nome do arquivo define o comando com `/`.
- Commands do Cursor ainda são beta; mantenha os adapters em Markdown simples e evite depender de sintaxe especial.
- A lógica central continua em `SKILLS/SHARED`; os adapters Cursor só traduzem o uso para o Agent, busca do workspace e terminal integrado.
- Se a skill for usada fora deste repositório, mantenha o ai-flow disponível no workspace ou ajuste os paths para `SKILLS/SHARED`.
