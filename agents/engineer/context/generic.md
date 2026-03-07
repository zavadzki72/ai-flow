# 🌐 Contexto: Genérico (Multi-linguagem)

Este contexto é ativado quando o stack não se encaixa nos contextos específicos disponíveis (Go, Rust, Java, Ruby, etc.), ou quando múltiplos stacks estão presentes.

---

## Princípios Universais de Código

Estes princípios se aplicam independentemente da linguagem:

### Naming
- Nomes revelam intenção: `getUserById` > `getU` > `g`
- Funções são verbos: `calculateTotal`, `sendEmail`, `validateInput`
- Booleanos são predicados: `isActive`, `hasPermission`, `canRetry`
- Evite abreviações não universais: `customer` > `cust`, `response` > `resp`
- Consistência > preferência pessoal: siga o padrão já existente no repo

### Funções e Métodos
- Uma função = uma responsabilidade (Single Responsibility)
- Trate funções com muitos parâmetros como sinal de código complexo demais
- Prefira retornar cedo (guard clauses) a aninhamento profundo
- Side effects devem ser explícitos, não ocultos

### Tratamento de Erros
- Nunca ignore um erro silenciosamente
- Diferencie erros esperados (negócio) de erros inesperados (técnicos)
- Mensagens de erro devem ser acionáveis para quem as lê
- Log o contexto necessário para diagnóstico, nunca dados sensíveis

### Legibilidade
- O código é lido muito mais do que é escrito
- Comente o "porquê", não o "o quê"
- Código complexo merece um comentário de intenção
- Prefira clareza a "cleverness"

---

## Regras de Detecção de Stack

Ao identificar a linguagem, adapte:

| Linguagem detectada | Adapte para |
|---|---|
| `go.mod` / `*.go` | Idiomas Go: error returns, interfaces implícitas, goroutines |
| `Cargo.toml` / `*.rs` | Idiomas Rust: ownership, Result/Option, traits |
| `pom.xml` / `*.java` | Idiomas Java: checked exceptions, Spring patterns |
| `Gemfile` / `*.rb` | Idiomas Ruby: convenções Rails se presentes |
| `*.php` | PHP moderno (8+): tipos, PSR standards |
| `*.kt` | Kotlin: null safety, coroutines, extension functions |
| `*.swift` | Swift: optionals, protocols, value types |

---

## Checklist Universal de Qualidade

Independente da linguagem, sempre verifique:

### Corretude
- [ ] O código faz o que a especificação pede?
- [ ] Edge cases estão tratados? (null/nil/empty, valores extremos, erros)
- [ ] Existe tratamento adequado de erros?

### Segurança Básica
- [ ] Inputs externos são validados antes de usar?
- [ ] Não há interpolação de inputs em queries ou comandos shell?
- [ ] Dados sensíveis não estão em logs ou respostas de API?
- [ ] Autenticação/autorização está correta onde necessário?

### Performance Óbvia
- [ ] Não há operações desnecessariamente repetidas em loops?
- [ ] Recursos (arquivos, conexões, streams) são liberados?
- [ ] Não há carregamento de dados desnecessários?

### Manutenibilidade
- [ ] O código é legível sem precisar de comentário extenso?
- [ ] Não há duplicação que deveria ser abstraída?
- [ ] Segue as convenções do projeto/linguagem?

### Testes
- [ ] Existe cobertura para o comportamento principal?
- [ ] Casos de erro estão testados?

---

## Como Adaptar Recomendações

Quando trabalhando com uma linguagem não familiar, siga esta ordem de prioridade:

1. **Siga o código existente** — consistência com o projeto é mais importante que preferência pessoal
2. **Siga as convenções oficiais da linguagem** — Go tem `gofmt`, Rust tem `rustfmt`, etc.
3. **Aplique os princípios universais** deste documento
4. **Sinalize incerteza** — se não tiver certeza de um idioma específico da linguagem, diga isso explicitamente

---

## Sinais de Alerta Universais

Independente da linguagem, estes padrões merecem atenção:

```
⚠️  Funções com mais de 50 linhas
⚠️  Aninhamento de mais de 3 níveis
⚠️  Strings sendo concatenadas para formar queries ou comandos
⚠️  Catch/recover vazio sem log ou comentário explicativo
⚠️  Variáveis globais mutáveis
⚠️  Código comentado em vez de deletado
⚠️  TODO/FIXME sem owner ou tracking issue
⚠️  Números e strings mágicas sem nome ou constante
⚠️  Código duplicado em mais de 2 lugares
```