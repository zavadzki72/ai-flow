# 🐍 Contexto: Python

## Stack Assumida

- Python 3.11+
- Type hints obrigatórios
- `uv` ou `poetry` para gerenciamento de dependências
- `ruff` para linting e formatting
- `pytest` para testes
- `pydantic` para validação e serialização
- FastAPI para APIs (quando aplicável)

---

## Convenções de Código (PEP 8 + extras)

### Naming
```python
# Módulos e arquivos: snake_case
order_service.py, user_repository.py

# Classes: PascalCase
class OrderService: ...
class UserRepository: ...

# Funções, métodos e variáveis: snake_case
def calculate_total(items: list[OrderItem]) -> Decimal: ...
customer_name = "João"

# Constantes: SCREAMING_SNAKE_CASE
MAX_RETRY_ATTEMPTS = 3
DEFAULT_TIMEOUT_SECONDS = 30

# Privados: prefixo _
def _validate_internal(self) -> None: ...
self._cache: dict[str, Any] = {}
```

### Type Hints (obrigatório)
```python
# ✅ Sempre tipado
def get_user(user_id: str) -> User | None: ...
def process_orders(orders: list[Order]) -> dict[str, int]: ...

# ✅ Use | None ao invés de Optional (Python 3.10+)
def find_by_email(email: str) -> User | None: ...

# ✅ TypeAlias para tipos complexos
type UserId = str
type OrderMap = dict[str, list[Order]]

# ❌ Evitar: Any sem justificativa
def process(data: Any) -> Any: ...
```

---

## Padrões Preferidos

### Dataclasses e Pydantic
```python
# ✅ Pydantic para dados externos (APIs, configs, inputs)
from pydantic import BaseModel, field_validator

class CreateOrderRequest(BaseModel):
    customer_id: str
    items: list[OrderItemSchema]
    
    @field_validator('items')
    @classmethod
    def items_not_empty(cls, v: list) -> list:
        if not v:
            raise ValueError('Order must have at least one item')
        return v

# ✅ dataclass para objetos internos de domínio
from dataclasses import dataclass, field

@dataclass
class Order:
    id: str
    customer_id: str
    items: list[OrderItem] = field(default_factory=list)
    status: OrderStatus = OrderStatus.PENDING
```

### Tratamento de Erros
```python
# ✅ Exceções específicas de domínio
class OrderNotFoundError(Exception):
    def __init__(self, order_id: str) -> None:
        super().__init__(f"Order {order_id} not found")
        self.order_id = order_id

# ✅ Nunca silenciar exceções
try:
    result = process()
except SpecificError as e:
    logger.error("Failed to process: %s", e)
    raise  # ou trate adequadamente

# ❌ Evitar: bare except
try:
    process()
except:  # captura tudo, incluindo KeyboardInterrupt
    pass
```

### Context Managers e Recursos
```python
# ✅ Sempre use context manager para recursos
with open(filepath, 'r', encoding='utf-8') as f:
    content = f.read()

async with httpx.AsyncClient() as client:
    response = await client.get(url)

# ✅ Crie seus próprios com @contextmanager
from contextlib import contextmanager

@contextmanager
def transaction(session: Session):
    try:
        yield session
        session.commit()
    except Exception:
        session.rollback()
        raise
```

### Async
```python
# ✅ Async nativo para I/O
import asyncio
import httpx

async def fetch_orders(customer_id: str) -> list[Order]:
    async with httpx.AsyncClient() as client:
        response = await client.get(f"/orders?customer={customer_id}")
        response.raise_for_status()
        return [Order(**item) for item in response.json()]

# ✅ asyncio.gather para operações paralelas independentes
results = await asyncio.gather(
    fetch_user(user_id),
    fetch_orders(user_id),
    fetch_permissions(user_id),
)
```

---

## Estrutura de Projeto

```
src/
├── domain/          # Entidades, value objects, interfaces
│   ├── models.py
│   └── repositories.py   # Interfaces (Abstract Base Classes)
├── application/     # Use cases, services
│   └── order_service.py
├── infrastructure/  # Implementações concretas
│   ├── database/
│   └── external_apis/
└── api/             # FastAPI routers, schemas de entrada/saída
    ├── routers/
    └── schemas/
tests/
├── unit/
├── integration/
└── conftest.py
```

---

## Testes com pytest

```python
# ✅ Nome descritivo
def test_process_order_raises_when_stock_insufficient():
    ...

# ✅ Arrange / Act / Assert explícito
def test_calculate_total_includes_tax():
    # Arrange
    items = [OrderItem(price=Decimal("100.00"), quantity=2)]
    tax_rate = Decimal("0.1")

    # Act
    total = calculate_total(items, tax_rate)

    # Assert
    assert total == Decimal("220.00")

# ✅ Fixtures para setup compartilhado
@pytest.fixture
def sample_order() -> Order:
    return Order(id="ord-1", customer_id="cust-1", items=[...])

# ✅ Parametrize para múltiplos cenários
@pytest.mark.parametrize("qty,expected", [(1, 100), (2, 200), (0, 0)])
def test_total_by_quantity(qty: int, expected: int):
    assert calculate_total(qty, unit_price=100) == expected
```

---

## Anti-patterns a Evitar

| Anti-pattern | Por quê evitar | Alternativa |
|---|---|---|
| Variáveis globais mutáveis | Estado compartilhado gera bugs | Injeção de dependência |
| `import *` | Polui namespace, dificulta trace | Imports explícitos |
| Strings mágicas | Sem type safety | Enums ou constantes |
| Lógica em `__init__.py` | Importações circulares | Módulos dedicados |
| Exceções genéricas | Perde contexto do erro | Exceções específicas |
| Concatenação de SQL | SQL Injection | Parâmetros bindados |
| `print()` para debug | Não vai para produção corretamente | `logging` |