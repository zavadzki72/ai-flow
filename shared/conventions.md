# 📏 Convenções Globais

Padrões que se aplicam a todos os agents do repositório `ai-flow`.

---

## Commits

Siga o padrão **Conventional Commits**:

```
<type>(<scope>): <descrição curta>

[corpo opcional]

[rodapé opcional]
```

### Types
| Type | Quando usar |
|---|---|
| `feat` | Nova funcionalidade |
| `fix` | Correção de bug |
| `refactor` | Refatoração sem mudança de comportamento |
| `perf` | Melhoria de performance |
| `test` | Adição ou correção de testes |
| `docs` | Documentação |
| `chore` | Tarefas de manutenção (deps, config, CI) |
| `style` | Formatação, ponto-e-vírgula, etc. |
| `ci` | Mudanças em CI/CD |
| `revert` | Reversão de commit |

### Exemplos
```
feat(orders): add bulk cancellation endpoint
fix(auth): prevent token refresh race condition
refactor(users): extract email validation to domain service
test(orders): add edge cases for discount calculation
```

### Regras
- Primeira linha: máximo 72 caracteres
- Tempo presente, imperativo: "add" não "added" / "adds"
- Sem ponto final na primeira linha
- Corpo explica o "porquê", não o "o quê"
- Breaking changes: adicione `!` após o tipo → `feat!: remove v1 API`

---

## Branches

```
main / master      → produção, sempre deployável
develop            → integração (se usar gitflow)
feature/<slug>     → nova funcionalidade
fix/<slug>         → correção de bug
hotfix/<slug>      → correção urgente em produção
refactor/<slug>    → refatoração
chore/<slug>       → manutenção
```

Exemplos:
```
feature/bulk-order-cancellation
fix/auth-token-race-condition
hotfix/payment-timeout
```

---

## Pull Requests

### Título
Mesmo formato do Conventional Commit:
```
feat(orders): add bulk cancellation endpoint
```

### Template de Descrição
```markdown
## O que esse PR faz
[Descrição clara e objetiva]

## Por que essa mudança é necessária
[Contexto e motivação]

## Como testar
1. [Passo 1]
2. [Passo 2]

## Checklist
- [ ] Testes adicionados/atualizados
- [ ] Documentação atualizada (se necessário)
- [ ] Breaking changes documentados
- [ ] Variáveis de ambiente documentadas (se novas)

## Screenshots / evidências (se UI)
[Cole aqui]

## Issue relacionada
Closes #[número]
```

---

## Versionamento

Siga **Semantic Versioning (SemVer):**

```
MAJOR.MINOR.PATCH

MAJOR → breaking change (incompatibilidade com versão anterior)
MINOR → nova funcionalidade (compatível com versão anterior)
PATCH → correção de bug (compatível com versão anterior)
```

---

## Documentação

- `README.md` → Como rodar, configurar e contribuir com o projeto
- `docs/` → Documentação técnica de arquitetura e decisões (ADRs)
- `CHANGELOG.md` → Histórico de mudanças por versão
- Código → Comente "porquê", não "o quê"

---

## Variáveis de Ambiente

- Nunca comite `.env` com valores reais
- Sempre mantenha `.env.example` atualizado
- Nomes em `SCREAMING_SNAKE_CASE`
- Prefixe com o módulo quando relevante: `DATABASE_URL`, `REDIS_HOST`, `SMTP_PORT`
- Documente cada variável no `.env.example` com comentário de exemplo