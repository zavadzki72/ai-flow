# 🟦 Contexto: TypeScript / React

## Stack Assumida

- TypeScript 5+ (strict mode)
- React 18+
- Next.js 14+ (App Router) quando aplicável
- Tailwind CSS para estilização
- Zod para validação de schema
- React Query / TanStack Query para server state
- Zustand para client state complexo
- Vitest + Testing Library para testes

---

## Convenções de Código

### Naming
```typescript
// Componentes React: PascalCase
function UserProfileCard() { }

// Hooks: camelCase com prefixo "use"
function useOrderStatus(orderId: string) { }

// Funções e variáveis: camelCase
const calculateTotal = (items: CartItem[]) => { }
let isLoading = false;

// Tipos e Interfaces: PascalCase
type OrderStatus = 'pending' | 'paid' | 'shipped';
interface UserProfile { }

// Constantes globais: SCREAMING_SNAKE_CASE
const MAX_RETRY_ATTEMPTS = 3;

// Arquivos de componente: PascalCase
// UserProfileCard.tsx, OrderList.tsx

// Arquivos utilitários: kebab-case
// format-currency.ts, use-debounce.ts
```

### TypeScript Strict
```typescript
// ✅ Sempre ative strict no tsconfig
{
  "compilerOptions": {
    "strict": true,
    "noUncheckedIndexedAccess": true
  }
}

// ✅ Prefira tipos explícitos em funções públicas
function getUser(id: string): Promise<User> { }

// ✅ Use discriminated unions ao invés de boolean flags
type RequestState =
  | { status: 'idle' }
  | { status: 'loading' }
  | { status: 'success'; data: User }
  | { status: 'error'; error: string };

// ❌ Evitar: any, as (type assertion sem verificação)
const user = response as User; // perigoso
```

---

## Componentes React

### Estrutura preferida
```typescript
// ✅ Componente funcional com props tipadas
interface OrderCardProps {
  orderId: string;
  onCancel?: (id: string) => void;
}

export function OrderCard({ orderId, onCancel }: OrderCardProps) {
  // 1. Hooks primeiro
  const { data: order, isLoading } = useOrder(orderId);

  // 2. Handlers derivados
  const handleCancel = useCallback(() => {
    onCancel?.(orderId);
  }, [orderId, onCancel]);

  // 3. Estados de loading/error/empty
  if (isLoading) return <OrderCardSkeleton />;
  if (!order) return null;

  // 4. Render principal
  return (
    <div>
      <h2>{order.number}</h2>
      <button onClick={handleCancel}>Cancelar</button>
    </div>
  );
}
```

### Regras de Componentes
```typescript
// ✅ Componentes pequenos e focados (< 100 linhas como guia)
// ✅ Extraia lógica para custom hooks
// ✅ Prefira composição a props drilling profundo
// ✅ Evite useEffect para lógica de negócio (use React Query)

// ❌ Evitar: componentes "deus" com centenas de linhas
// ❌ Evitar: useEffect para fetch de dados
// ❌ Evitar: prop drilling > 2 níveis (use Context ou composição)
```

---

## Estado

```typescript
// Server state → React Query
const { data, isLoading, error } = useQuery({
  queryKey: ['orders', filters],
  queryFn: () => fetchOrders(filters),
  staleTime: 1000 * 60 * 5, // 5 minutos
});

// Client state simples → useState / useReducer
const [isOpen, setIsOpen] = useState(false);

// Client state complexo / global → Zustand
const useCartStore = create<CartStore>((set) => ({
  items: [],
  addItem: (item) => set((state) => ({
    items: [...state.items, item]
  })),
}));

// ❌ Evitar: Redux para apps novos sem necessidade clara
// ❌ Evitar: Context para state que muda frequentemente (re-renders)
```

---

## Validação com Zod

```typescript
// ✅ Defina schemas e derive tipos a partir deles
const createOrderSchema = z.object({
  customerId: z.string().uuid(),
  items: z.array(z.object({
    productId: z.string().uuid(),
    quantity: z.number().int().positive(),
  })).min(1),
});

type CreateOrderInput = z.infer<typeof createOrderSchema>;

// ✅ Valide na borda (API routes, formulários)
const result = createOrderSchema.safeParse(body);
if (!result.success) {
  return { error: result.error.flatten() };
}
```

---

## Estrutura de Projeto (Next.js App Router)

```
src/
├── app/                    # Rotas (App Router)
│   ├── (auth)/
│   ├── dashboard/
│   └── api/
├── components/
│   ├── ui/                 # Componentes genéricos (Button, Input, Modal)
│   └── features/           # Componentes de domínio (OrderCard, UserProfile)
├── hooks/                  # Custom hooks
├── lib/                    # Utilitários, configurações
├── services/               # Camada de API/fetch
├── stores/                 # Zustand stores
└── types/                  # Tipos globais e schemas Zod
```

---

## Testes

```typescript
// ✅ Teste comportamento, não implementação
test('should show error message when order creation fails', async () => {
  // Arrange
  server.use(
    http.post('/api/orders', () => HttpResponse.json({ error: 'Out of stock' }, { status: 422 }))
  );

  render(<CreateOrderForm />);

  // Act
  await userEvent.click(screen.getByRole('button', { name: /criar pedido/i }));

  // Assert
  expect(await screen.findByText(/out of stock/i)).toBeInTheDocument();
});

// ✅ Use Testing Library queries acessíveis (getByRole, getByLabelText)
// ❌ Evitar: getByTestId como primeira opção
// ❌ Evitar: testar detalhes de implementação (estado interno, métodos privados)
```

---

## Anti-patterns a Evitar

| Anti-pattern | Por quê evitar | Alternativa |
|---|---|---|
| `useEffect` para fetch | Race conditions, complexidade | React Query |
| `any` no TypeScript | Perde type safety | Tipo correto ou `unknown` |
| Prop drilling profundo | Acoplamento, verbosidade | Context, composição, Zustand |
| Mutação direta de estado | Bugs silenciosos no React | Spread, immer |
| `key={index}` em listas | Bugs em re-renders | ID estável como key |
| CSS inline para layout | Difícil manutenção | Tailwind classes |
| Componentes anônimos | Dificulta debugging | Componentes nomeados |