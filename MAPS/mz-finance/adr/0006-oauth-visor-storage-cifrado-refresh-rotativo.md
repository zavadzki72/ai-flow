# ADR 0006 — Vínculo OAuth do Visor: storage cifrado + refresh rotativo single-flight

- **Status**: Proposto (revisável pelo dev)
- **Data**: 2026-07-06
- **Contexto**: PRD 004 — Handoff §17 item 2; RNF01; DP10; dossiê validado end-to-end
- **Decisores**: Arquiteto de Software Sênior (humano ausente)

## Contexto

O acesso ao MCP do Visor exige **OAuth 2.1** (cliente **público**, PKCE S256, grants `authorization_code` + `refresh_token`, sem `client_credentials`). Fatos validados: o **access token expira ~24h** e o **refresh token é ROTATIVO** — cada uso invalida o anterior e devolve um novo. Isso proíbe guardar o refresh em variável de ambiente; exige **storage mutável** atualizado a cada refresh, com proteção contra corrida (dois refreshes simultâneos queimam o token um do outro). O material é **sensível** (dá acesso à conta bancária agregada) e o alvo é produção **Coolify**, onde o key ring do Data Protection é efêmero por container.

## Decisão

1. **Persistir** o vínculo numa tabela `VisorOAuthTokenSet` (por usuário): `Status` (`Connected/Expired/Revoked`), `AccessTokenCipher`, `RefreshTokenCipher`, `AccessTokenExpiresAt`, `ClientId` (do Dynamic Client Registration), timestamps. Pendência PKCE em `VisorOAuthAuthorizationRequest` (`state`, `code_verifier` cifrado, `userId`, TTL curto).
2. **Cifrar** as colunas de token/verifier com **ASP.NET Core Data Protection** (`IDataProtector`, protector `"visor-oauth"`), via um `TokenProtector` fino. Nunca gravar/logar texto puro (RNF01/RNF02).
3. **Key ring persistente** (armadilha Coolify): `AddDataProtection().SetApplicationName("mz-finance").PersistKeysToDbContext<MzFinanceContext>()` — senão um redeploy torna todos os cifrados ilegíveis.
4. **Refresh rotativo single-flight**: `SemaphoreSlim(1,1)` por processo **+** `SELECT … FOR UPDATE` na linha do vínculo, dentro de uma **transação/contexto próprios** (`IDbContextFactory<MzFinanceContext>` — instância dedicada, não o `MzFinanceContext` scoped do request). O token novo é **commitado imediatamente**.
5. **Reconciliação com a atomicidade do import (RN07)**: como o token é persistido fora da transação do import e commitado na hora, um rollback posterior do import **não** perde o token rotacionado. O import faz **fetch-all antes de persistir** qualquer `Transaction`.
6. **Estados**: refresh com `invalid_grant` → `MarkRevoked` + exigir reconsentimento (C13). Ausência de vínculo → "NotConnected" (C2).

## Consequências

- (+) Sobrevive a redeploys; refresh seguro contra corrida; credenciais nunca em texto puro.
- (+) O import pode falhar/rollback sem sacrificar a sessão do Visor.
- (−) Complexidade extra (contexto dedicado + lock) — justificada pela rotação.
- (−) `FOR UPDATE` acopla ao PostgreSQL (aceitável — é o banco do projeto).

## Alternativas consideradas

- **Refresh em env var / appsettings**: impossível — o token muda a cada uso (rotativo).
- **Cache em memória / DataProtection efêmero**: perde tudo no redeploy do Coolify — rejeitado.
- **Refresh dentro da transação do import**: queima a credencial em qualquer rollback — rejeitado (é o bug que este ADR previne).
- **Volume persistente para as chaves** (em vez de `PersistKeysToDbContext`): viável, mas acopla ao provisionamento do container; a persistência no DB é autocontida.
