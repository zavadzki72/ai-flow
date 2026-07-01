# Lente: React / TypeScript

Conhecimento idiomático **genérico** de React + TypeScript para apoiar o `dev-senior`.

> ⚠️ **Precedência:** o `docs/architecture/` **DO PROJETO** sempre vence esta lente.
> Esta lente é genérica da linguagem/framework; o `docs/architecture/` é a verdade específica do projeto.
> Em conflito, siga o projeto.

## Idiomas e boas práticas

- **`useEffect` é ponte para sistemas EXTERNOS** (DOM, subscriptions, timers, analytics), nunca reação
  a mudança de dado. Para "resetar" estado quando uma prop muda, use `key` para remontar o componente, não um efeito de sincronização.
- **Estado de servidor ≠ estado de UI:** use TanStack Query (ou o cliente do projeto) com query keys
  estruturadas e estáveis, `staleTime`/`gcTime` conscientes, invalidação por chave e `select` para derivar. `useEffect` + `fetch` manual só quando não há camada de data fetching.
- **Derive no render em vez de duplicar em estado.** Estado é só o que não dá para calcular a partir de props/outro estado. Menos `useState`, menos `useEffect`, menos dessincronização.
- **Modele estados como discriminated unions** (`{status:'loading'} | {status:'error';error} | {status:'ok';data}`),
  não flags booleanas soltas (`isLoading`, `hasError`) que permitem combinações impossíveis.
- **TS estrito (`strict: true`), zero `any`.** Use `unknown` + narrowing na entrada; tipe só as
  FRONTEIRAS (props, retornos públicos, respostas de API). Fuja de `as` — se precisou castar, o tipo provavelmente está errado.
- **Valide dado na fronteira de runtime com zod** (ou o validador do projeto) e derive o tipo com
  `z.infer`. O tipo declarado de uma resposta HTTP é uma promessa, não uma garantia — parse antes de confiar.
- **Componha em vez de configurar:** prefira `children`/slots/composição a uma proliferação de props booleanas. Componente puro e declarativo; lógica de dados/efeitos fora do JSX.
- **Extraia lógica reutilizável com estado para custom hooks** (`useX`), respeitando as regras dos hooks (topo, sem condicional/loop).
- **Context é escopo de subárvore, não store global.** Divida por domínio (auth, tema, feature) para limitar re-render; estado global de app usa o gerenciador que o projeto adotou.
- **Memoização é cirúrgica e justificada por profiler** (`useMemo`/`useCallback`/`React.memo`). Com
  React 19 / React Compiler, deixe o compilador otimizar e não polua o código com memo manual.
- **Formulários:** react-hook-form + resolver zod, com o schema como fonte única de validação e tipos. Controlado só quando precisa reagir a cada tecla.
- **`key` estável derivada do dado (id do domínio),** nunca do índice, em lista que reordena/filtra/insere. Onde o stack suportar, prefira Suspense + Error Boundary a espalhar `if (isLoading)`.

## Armadilhas comuns

- **Stale closure:** `useEffect`/`useCallback`/handlers capturam valor antigo por deps incompletas.
  Use updater funcional (`setX(prev => ...)`) ou `ref`, e corrija as deps — não o sintoma.
- **Loop de efeito por identidade referencial:** objeto/array/função recriado a cada render entra nas deps de um `useEffect`. Estabilize com `useMemo`/`useCallback` ou mova a criação para fora.
- **Silenciar `react-hooks/exhaustive-deps`** com `eslint-disable`: mascara o bug em vez de resolver. Se a regra reclama, o efeito está modelado errado.
- **Race condition em fetch manual:** resposta antiga sobrescreve a nova, ou set após unmount. Use `AbortController`/cleanup — ou delegue à camada de query.
- **Mutação direta de estado/props** (`arr.push`, `obj.campo = y`, `state.sort()`): React não detecta a mudança de identidade. Sempre crie novo objeto/array.
- **Assumir `setState` síncrono:** ler o valor logo após o `set` devolve o antigo; o novo só existe no próximo render.
- **Índice como `key` em lista dinâmica:** ao reordenar/inserir, React reaproveita o nó errado (inputs trocados, estado embaralhado).
- **`as`/`any` escondendo divergência** entre o tipo declarado e o dado real de runtime (típico em resposta de API).

## Testes

- Testing Library: consulte por papel/label/texto acessível (`getByRole`, `getByLabelText`) e teste o COMPORTAMENTO visível — não estado interno. Refatoração não deve quebrar o teste.
- Use `userEvent` (não `fireEvent`) e sempre `await` nas ações e em `findBy*`/`waitFor`; envolva updates assíncronos para eliminar warnings de `act`.
- Mocke na fronteira de rede com MSW (intercepta HTTP), não mockando `axios`/`fetch` — assim testa o wiring real.
- Cubra happy path + loading + erro + empty + interações; um componente com 3 estados e nenhum teste de erro está meio testado.
- `renderHook` para hooks; lógica pura (reducers, mappers, validações zod) em teste unitário sem render.
- Evite snapshots gigantes como rede de segurança — viram ruído aprovado sem ler. Prefira asserts explícitos do que importa.

## Segurança

- Nunca `dangerouslySetInnerHTML` sem sanitizar (DOMPurify). React escapa por padrão — não fure isso para HTML de usuário/API.
- Nada de segredos no cliente: tudo no bundle é público. `VITE_*`/`NEXT_PUBLIC_*` são visíveis — chaves ficam no backend.
- Valide/sanitize na fronteira todo dado externo (API, query string, params, `postMessage`) com zod antes de renderizar.
- Prefira cookie `httpOnly` a `localStorage` para token (localStorage é acessível a qualquer XSS); alinhe CSRF com a estratégia do projeto.
- `target="_blank"` exige `rel="noopener noreferrer"`; valide URLs antes de `href`/`src` (bloqueie `javascript:`).

## Nomenclatura e estrutura

- Componentes em `PascalCase`, um por arquivo (nome = componente); hooks `useCamelCase`; utilitários `camelCase`.
- Tipos/interfaces em `PascalCase`; props como `Props`/`ComponentProps` conforme o projeto — sem prefixo `I` a menos que o `docs/architecture/` mande.
- Colocation: componente, tipos, teste e estilos próximos do uso; separe apresentação de container/lógica conforme o `docs/architecture/`.

## Anti-patterns a evitar

- `useEffect` para derivar/sincronizar estado calculável no render; efeitos em cascata que se disparam mutuamente.
- God component (fetch + estado + lógica + UI num arquivo). Quebre em hook (dados) + componentes de apresentação.
- Prop drilling profundo — mas cuidado com o extremo oposto: Context global monolítico que re-renderiza a árvore inteira.
- `any`/`as` para calar o compilador e `eslint-disable` em `exhaustive-deps`.
- `key` por índice em lista dinâmica e mutação direta de estado.
- Memoização cargo-cult (memo em tudo sem profiler).
- Lógica de negócio dentro do JSX (ternários aninhados, cálculos inline) em vez de variáveis derivadas / funções puras testáveis.
