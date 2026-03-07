# ⚙️ Skill: Code Generation

## Objetivo

Gerar código correto, idiomático e production-ready a partir de um requisito. Não apenas "código que funciona" — código que um engenheiro sênior ficaria orgulhoso de assinar.

---

## Processo de Geração

### 1. Clarificação (antes de escrever)

Se qualquer um desses pontos for ambíguo, **pergunte antes de gerar:**

- Qual é o comportamento esperado nos edge cases?
- Existe um padrão já adotado no projeto que devo seguir?
- Qual o nível de abstração esperado (simples e direto vs extensível)?
- Precisa de testes junto com o código?
- Existe alguma restrição de performance ou de dependências?

### 2. Planejamento

Antes de escrever, pense em voz alta (brevemente):
- Qual a estrutura geral da solução?
- Quais são os componentes principais?
- Existe algum pattern adequado aqui?

### 3. Implementação

Escreva o código seguindo:
- Convenções da linguagem/stack ativa (ver `context/`)
- Princípios SOLID quando aplicável
- Tratamento de erros adequado
- Sem over-engineering — só o necessário agora

### 4. Revisão Própria

Antes de entregar, releia o código como se fosse um reviewer:
- Está correto nos edge cases óbvios?
- Está legível sem precisar de explicação?
- Falta algum tratamento de erro?

---

## Padrões de Qualidade

### Naming
- Nomes devem revelar intenção
- Evite abreviações não universais (`usr` → `user`, `tmp` → `result`)
- Funções devem ser verbos (`GetUser`, `calculateTotal`, `send_email`)
- Booleanos devem ser predicados (`isActive`, `hasPermission`, `canRetry`)

### Funções e Métodos
- Uma função = uma responsabilidade
- Máximo 20-30 linhas como guia (não regra absoluta)
- Parâmetros: preferir até 3; se mais, usar objeto/record
- Evitar side effects ocultos

### Tratamento de Erros
- Nunca silenciar erros sem razão explícita
- Erros de negócio vs erros técnicos devem ser tratados diferente
- Mensagens de erro devem ser acionáveis

### Comentários
- Comente o "porquê", não o "o quê"
- Código complexo merece um comentário de contexto
- Evite comentários óbvios que apenas repetem o código

---

## Formato de Saída

Sempre entregue na seguinte estrutura:

```
### O que foi implementado
[Breve descrição da solução e decisões tomadas]

### Código
[bloco de código com linguagem especificada]

### Como usar
[Exemplo de uso se não for óbvio]

### O que não foi incluído / próximos passos
[Trade-offs conscientes, o que ficou de fora e por quê]
```

---

## Checklist Final

- [ ] O código compila / executa sem erros
- [ ] Edge cases óbvios estão tratados
- [ ] Erros são tratados adequadamente
- [ ] Naming está claro e consistente
- [ ] Não há duplicação desnecessária
- [ ] Segue os padrões do contexto ativo (ver `context/`)
- [ ] Testes foram incluídos (se solicitado ou necessário)