# 🗄️ Contexto: SQL

## Stack Assumida

- PostgreSQL como padrão (adaptações para SQL Server e MySQL quando indicado)
- Migrações versionadas (Flyway, Liquibase, EF Migrations, Alembic)
- ORMs como complemento, não substituto do SQL

---

## Convenções de Nomenclatura

```sql
-- Tabelas: snake_case, plural
CREATE TABLE orders (...);
CREATE TABLE order_items (...);

-- Colunas: snake_case
customer_id, created_at, is_active

-- PKs: sempre "id"
id UUID DEFAULT gen_random_uuid() PRIMARY KEY

-- FKs: {tabela_referenciada_singular}_id
customer_id, order_id, product_id

-- Índices: idx_{tabela}_{colunas}
CREATE INDEX idx_orders_customer_id ON orders(customer_id);

-- Constraints: {tipo}_{tabela}_{coluna}
CONSTRAINT uq_users_email UNIQUE (email)
CONSTRAINT ck_orders_positive_total CHECK (total > 0)

-- Stored Procedures / Functions: snake_case, verbo
CREATE FUNCTION calculate_order_total(...)
```

---

## Design de Schema

### Boas práticas
```sql
-- ✅ Sempre inclua colunas de auditoria
created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW(),
updated_at  TIMESTAMPTZ NOT NULL DEFAULT NOW(),
created_by  UUID REFERENCES users(id)

-- ✅ Use UUID para PKs expostas externamente
id UUID DEFAULT gen_random_uuid() PRIMARY KEY

-- ✅ BIGSERIAL para PKs internas de alta performance
id BIGSERIAL PRIMARY KEY

-- ✅ TIMESTAMPTZ (com timezone) ao invés de TIMESTAMP
created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()

-- ✅ Soft delete quando histórico importa
deleted_at TIMESTAMPTZ  -- NULL = ativo, valor = deletado

-- ✅ NOT NULL como padrão — seja explícito quando aceitar NULL
```

### Integridade Referencial
```sql
-- ✅ Defina o comportamento de FK explicitamente
CONSTRAINT fk_order_items_order
    FOREIGN KEY (order_id)
    REFERENCES orders(id)
    ON DELETE CASCADE   -- ou RESTRICT, SET NULL — escolha conscientemente

-- ✅ Índice em toda FK (não criado automaticamente no Postgres)
CREATE INDEX idx_order_items_order_id ON order_items(order_id);
```

---

## Queries Eficientes

### Índices
```sql
-- ✅ Índice composto: coloque a mais seletiva primeiro
CREATE INDEX idx_orders_status_created ON orders(status, created_at)
WHERE deleted_at IS NULL;  -- índice parcial

-- ✅ Índice para buscas por texto
CREATE INDEX idx_products_name_trgm ON products
USING GIN (name gin_trgm_ops);

-- ✅ Analise antes de criar — índice tem custo de escrita
EXPLAIN (ANALYZE, BUFFERS) SELECT ...;
```

### Evitando N+1
```sql
-- ❌ N+1: buscar pedidos e depois cada cliente separado
-- ✅ JOIN traz tudo em uma query
SELECT 
    o.id,
    o.total,
    c.name AS customer_name,
    c.email AS customer_email
FROM orders o
JOIN customers c ON c.id = o.customer_id
WHERE o.status = 'pending';
```

### CTEs para Legibilidade
```sql
-- ✅ CTEs tornam queries complexas legíveis
WITH monthly_revenue AS (
    SELECT 
        DATE_TRUNC('month', created_at) AS month,
        SUM(total) AS revenue
    FROM orders
    WHERE status = 'completed'
    GROUP BY 1
),
revenue_growth AS (
    SELECT
        month,
        revenue,
        LAG(revenue) OVER (ORDER BY month) AS prev_revenue
    FROM monthly_revenue
)
SELECT
    month,
    revenue,
    ROUND((revenue - prev_revenue) / prev_revenue * 100, 2) AS growth_pct
FROM revenue_growth
ORDER BY month;
```

### Paginação Eficiente
```sql
-- ❌ OFFSET fica lento em grandes volumes
SELECT * FROM orders ORDER BY created_at DESC OFFSET 10000 LIMIT 20;

-- ✅ Keyset pagination — O(log n) com índice
SELECT * FROM orders
WHERE created_at < :last_seen_created_at
   OR (created_at = :last_seen_created_at AND id < :last_seen_id)
ORDER BY created_at DESC, id DESC
LIMIT 20;
```

---

## Migrações

```sql
-- ✅ Sempre reversíveis (Up / Down)
-- ✅ Nomeie com timestamp e descrição
-- V20240315_01__add_index_orders_customer_id.sql

-- ✅ Migrações de dados separadas de migrações de schema
-- ✅ Nunca modifique uma migração já aplicada em produção
-- ✅ Teste rollback antes de aplicar em produção

-- ✅ Adicionar coluna NOT NULL com DEFAULT (seguro em Postgres 11+)
ALTER TABLE orders ADD COLUMN priority INT NOT NULL DEFAULT 0;

-- ⚠️ Remover coluna: faça em 2 deploys
-- Deploy 1: parar de usar a coluna no código
-- Deploy 2: DROP COLUMN
```

---

## Segurança

```sql
-- ❌ NUNCA concatene inputs em SQL — SQL Injection
query = "SELECT * FROM users WHERE email = '" + email + "'"

-- ✅ Sempre use parâmetros bindados
-- C#: command.Parameters.AddWithValue("@email", email)
-- Python: cursor.execute("SELECT ... WHERE email = %s", (email,))
-- Node: db.query("SELECT ... WHERE email = $1", [email])

-- ✅ Princípio do menor privilégio
-- Usuário da aplicação: SELECT, INSERT, UPDATE, DELETE (sem DDL)
-- Usuário de migração: DDL + DML
-- Sem acesso direto a produção por desenvolvedores

-- ✅ Nunca exponha dados sensíveis em logs de query
```

---

## Anti-patterns a Evitar

| Anti-pattern | Por quê evitar | Alternativa |
|---|---|---|
| `SELECT *` | Over-fetching, quebra com mudanças de schema | Selecione colunas explícitas |
| OFFSET alto | Performance O(n) | Keyset pagination |
| FK sem índice | Joins e deletes lentos | Índice em toda FK |
| TIMESTAMP sem timezone | Bugs em ambientes multi-timezone | TIMESTAMPTZ |
| Lógica de negócio na view | Acoplamento, difícil testar | Application layer |
| Stored procedures para tudo | Difícil versionar, testar e debugar | Use com moderação |
| NULL para "falso" em booleano | Semântica ambígua | `BOOLEAN NOT NULL DEFAULT false` |