# ADR 0005 — Cliente MCP do Visor nativo em .NET (`ModelContextProtocol` 1.4.0)

- **Status**: Proposto (revisável pelo dev)
- **Data**: 2026-07-06
- **Contexto**: PRD 004 — Handoff §17 item 1; dossiê `mz-finance-visor-mcp-integration`
- **Decisores**: Arquiteto de Software Sênior (humano ausente)

## Contexto

O Visor Finance **não expõe REST API** — a única via de dados é um **servidor MCP remoto** (`https://mcp.visorfinance.app`, Streamable HTTP / JSON-RPC), cuja tool central `get_transactions` lista as transações com filtros e paginação. O mz-finance (backend .NET 10, alvo produção Coolify) precisa atuar como **cliente MCP headless**, autenticado por Bearer obtido do fluxo OAuth (ADR 0006). O SDK oficial .NET evoluiu rápido; APIs 0.x-preview e 2.0.0-preview coexistem com a linha estável.

## Decisão

1. Usar o pacote NuGet **`ModelContextProtocol` 1.4.0** (estável, TFM `net10.0` nativo), núcleo em `ModelContextProtocol.Core`. **Não** usar `2.0.0-preview.1` nem `0.x`.
2. Transporte **`HttpClientTransport`** com `HttpClientTransportOptions.AdditionalHeaders["Authorization"] = "Bearer <token>"` (token do `IVisorTokenProvider`, headless). `TransportMode` default (AutoDetect) serve.
3. Criação via **`McpClient.CreateAsync(transport)`** e chamada via **`CallToolAsync("get_transactions", args, ct)`** / `ListToolsAsync()`. **Não** usar `SseClientTransport`, `McpClientFactory` (APIs 0.x) nem `ClientOAuthOptions` (OAuth interativo — o token vem do provider).
4. Isolar tudo atrás da porta **`IVisorMcpClient`** (`Domain/Interfaces`), impl em `Infra/Integrations/Visor/VisorMcpClient.cs`. Paginação completa (percorre `page`/`page_size` até `total_count`) e mapeamento `payload → VisorTransactionDto` internos. "Ambos" resolvido por **duas chamadas** (uma por `type`).
5. Falha/timeout de transporte → `VisorIntegrationException` (traduzida em notificação pelo handler; nunca exception crua ao cliente da API).

## Consequências

- (+) Sem runtime Node/ponte em produção; um só processo .NET no Coolify.
- (+) Porta isola o SDK: mudanças de versão ficam contidas na Infra; handler testa contra o mock.
- (−) Dependência de um SDK jovem — mitigado por fixar 1.4.0 e testar o mapeamento com payloads fixos.
- (−) Teste real exige token+servidor Visor → coberto no `/test-e2e`, não no unit test.

## Alternativas consideradas

- **Ponte/proxy MCP em Node** (ex.: mcp-remote): adiciona runtime e superfície de deploy — rejeitada para uso pessoal em VPS/Coolify.
- **Falar JSON-RPC "na mão"** sobre HttpClient: reinventa handshake/negociação que o SDK já entrega — rejeitada.
- **`2.0.0-preview`**: instável; risco de breaking antes de GA — rejeitada em favor do 1.4.0 estável.
