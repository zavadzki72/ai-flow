# 🐛 Skill: Debugging

## Objetivo

Investigar e resolver problemas de forma sistemática. Debugging eficiente não é tentativa e erro — é formação de hipóteses, coleta de evidências e eliminação metódica de causas.

---

## Processo de Debugging

### 1. Coleta de Informações

Antes de qualquer análise, obtenha:

- **Qual é o comportamento atual?** (o que está acontecendo)
- **Qual é o comportamento esperado?** (o que deveria acontecer)
- **Quando começou?** (após um deploy? sempre existiu? aleatório?)
- **É reproduzível?** (sempre / às vezes / apenas em produção?)
- **Qual o ambiente?** (dev / staging / prod / SO / versão)
- **Stack trace completa** (se houver exceção)
- **Logs relevantes** (antes, durante e depois do erro)
- **O que mudou recentemente?** (código, config, dependências, dados)

### 2. Formulação de Hipóteses

Com base nas evidências, liste as causas mais prováveis em ordem de probabilidade. Pense em:

- Inputs inválidos ou inesperados
- Estado incorreto (variável, banco, cache)
- Condição de corrida ou problema de concorrência
- Dependência externa falhando (API, DB, fila)
- Configuração incorreta de ambiente
- Bug introduzido recentemente (git bisect é seu amigo)
- Comportamento diferente entre ambientes

### 3. Investigação

Para cada hipótese, defina:
- Como validar essa hipótese?
- Qual evidência confirmaria ou descartaria?

Estratégias de investigação:
- Adicionar logs/traces nos pontos de suspeita
- Reproduzir em ambiente isolado
- Testar com input mínimo que reproduz o problema
- Comparar comportamento com versão anterior
- Inspecionar estado do banco/cache no momento do erro

### 4. Identificação da Causa Raiz

Não pare no sintoma. Vá até a causa raiz com "5 Porquês":

```
Sintoma: Request retorna 500
Por quê? → NullReferenceException no OrderService
Por quê? → user.Address é null
Por quê? → Address não é carregado no include do EF
Por quê? → Include foi removido em um refactor recente
Causa raiz: Refactor quebrou o carregamento do relacionamento
```

### 5. Solução e Prevenção

- Corrija a causa raiz, não apenas o sintoma
- Adicione teste que reproduz o bug (para não regredir)
- Considere se o mesmo padrão existe em outros lugares
- Documente o problema se for não-óbvio

---

## Erros Comuns por Categoria

### NullReferenceException / NullPointerException
- Verifique o caminho de execução que pode retornar null
- Verifique includes/joins em ORM que podem não estar carregando relacionamentos
- Verifique deserialização de JSON com campos opcionais

### Timeout / Performance
- Verifique N+1 queries (log das queries SQL)
- Verifique ausência de índices
- Verifique operações síncronas bloqueando thread pool
- Verifique locks concorrentes no banco

### Comportamento Diferente entre Ambientes
- Compare variáveis de ambiente e configurações
- Compare versões de dependências
- Verifique dados diferentes (seeds, fixtures)
- Verifique timezone e locale

### Erros Intermitentes
- Suspeite de condições de corrida
- Verifique timeouts em dependências externas
- Verifique exaustão de recursos (pool de conexões, memória)
- Adicione correlation IDs para rastrear requests específicos

### Erros após Deploy
- Compare o diff do que foi deployado
- Verifique migrações de banco
- Verifique mudanças de configuração
- Considere rollback como opção imediata se for crítico

---

## Formato de Saída

```
### Diagnóstico
[O que o erro indica e qual a causa raiz identificada]

### Evidências
[O que levou a essa conclusão]

### Solução
[Código ou passos para corrigir]

### Como prevenir
[Teste a adicionar, padrão a seguir, ou alerta a configurar]
```

---

## Checklist

- [ ] Tenho o erro completo (stack trace + logs)?
- [ ] Sei reproduzir o problema?
- [ ] Identifiquei a causa raiz (não apenas o sintoma)?
- [ ] A solução resolve a raiz, não apenas mascara?
- [ ] Existe um teste que previne regressão?
- [ ] O mesmo padrão pode existir em outros lugares?