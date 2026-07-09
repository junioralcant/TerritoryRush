# Code Review — Tarefa 1.0: Fundações do backend + Supabase + Auth + Perfil

- **Projeto:** Territory Rush (MVP)
- **Branch revisada:** `feat/task-1-foundations` (diff `main...HEAD`)
- **Commit:** `c70a9c3 feat(api): fundações — scaffold NestJS, PostGIS, auth JWT e perfil`
- **Data da review:** 2026-07-09
- **Revisor:** Code Review (skill `task-review` → `executar-review`)
- **Escopo do diff:** 50 arquivos de produção (`apps/api/**`, `supabase/migrations/**`, `infra/docker-compose.yml`, `package.json`, `README.md`) + `package-lock.json`. Artefatos `.claude/worktrees/*` ignorados (pré-existentes no baseline).

---

## 1. Resumo

A Tarefa 1.0 entrega a fundação do backend exatamente como especificado: um monólito modular NestJS (DDD/Clean Architecture) com os 14 módulos de domínio previstos na Tech Spec scaffolded, pool `pg` global, runner de migrações SQL idempotente, migrações base (`0001_init` com PostGIS + extensões + schema `geo`, `0002_runner_profile`, `0003_provider_connection`), autenticação por JWT do Supabase (verifier + guard + decorator `@CurrentUser`), criação idempotente de perfil no primeiro acesso e o endpoint protegido `GET /me/profile`. A convenção de tipagem (`interface` só em `*.port.ts`, `type` no resto) está fixada por ESLint e foi validada empiricamente.

A qualidade do código é alta: separação clara de camadas (port/contrato → serviço → repositório), injeção por token (`Symbol`), verificação de JWT segura (algoritmo fixado, audience validada, mapeamento de erros para `UnauthorizedException`), criação de perfil race-safe via `INSERT ... ON CONFLICT DO NOTHING` com fallback, e teardown do pool via `OnModuleDestroy`. A cobertura de testes cobre os cenários da task (unidade do verifier/guard/serviço + integração ponta-a-ponta com PostGIS via testcontainers).

**Todos os 4 gates de validação passaram** (unit 16/16, lint limpo, build OK, integração 5/5). Os achados são todos de severidade menor / observações de hardening, nenhum bloqueante e nenhum fora do escopo desta task.

**Veredito:** `APPROVED WITH OBSERVATIONS`.

---

## 2. Resultado da validação de testes (execução real)

Todos os comandos foram executados de fato neste ambiente (Docker de pé).

### Unit — `cd apps/api && npx jest --config jest.config.ts`

```
PASS src/modules/profile/profile.service.spec.ts
PASS src/modules/auth/guards/supabase-jwt.guard.spec.ts
PASS src/modules/auth/verifiers/supabase-jwt.verifier.spec.ts

Test Suites: 3 passed, 3 total
Tests:       16 passed, 16 total
Time:        1.749 s
```
**Resultado: PASSOU (16/16, esperado 16).**

### Lint — `cd apps/api && npx eslint "src/**/*.ts" "test/**/*.ts"`

```
EXIT=0
```
**Resultado: LIMPO (exit 0).**

### Build — `cd apps/api && npx nest build`

```
EXIT=0
```
**Resultado: OK (exit 0).**

### Integração — `cd apps/api && npx jest --config test/jest-int.config.ts --runInBand`

```
PASS test/profile.int-spec.ts (6.492 s)
  Profile flow (integration)
    ✓ rejects GET /me/profile without a token (401)
    ✓ rejects GET /me/profile with an invalid token (401)
    ✓ creates the runner profile on first authenticated access (200)
    ✓ is idempotent: a repeated request returns the same profile without duplicating it
    ✓ creates a distinct profile per authenticated user

Test Suites: 1 passed, 1 total
Tests:       5 passed, 5 total
Time:        6.527 s
```
**Resultado: PASSOU (5/5, esperado 5).**

### Verificação empírica do critério de lint (`interface` em DTO deve falhar)

Sonda criada e removida durante a review:

```
src/modules/profile/_lint_probe.dto.ts
  1:18  error  Use a `type` instead of an `interface`  @typescript-eslint/consistent-type-definitions
DTO_EXIT=1
--- port file com interface (deve passar) ---
PORT_EXIT=0
```
**Resultado: critério confirmado** — DTO com `interface` falha o lint; `*.port.ts` com `interface` passa.

| Gate | Esperado | Obtido | Status |
|------|----------|--------|--------|
| Unit | 16 | 16 | OK |
| Lint | limpo | exit 0 | OK |
| Build | OK | exit 0 | OK |
| Integração | 5 | 5 | OK |
| Lint falha p/ `interface` DTO | falha | falha (exit 1) | OK |

---

## 3. Aderência ao escopo da Tarefa 1.0 e critérios de sucesso

| Item | Status | Evidência |
|------|--------|-----------|
| 1.1 Scaffold NestJS + módulos de domínio + lint/tsconfig com convenção de tipagem | Atendido | `app.module.ts` importa os 14 módulos da Tech Spec (`auth`, `profile`, `geo`, `integrations/strava`, `integrations/garmin`, `activities`, `matching`, `scoring`, `territory`, `anti-cheat`, `rankings`, `achievements`, `notifications`) + `workers/ingest-activity`; `eslint.config.mjs` com `consistent-type-definitions`. |
| 1.2 Provisionar PostGIS + pool de conexão | Atendido | `0001_init.sql` habilita `postgis`; `database.module.ts` provê `Pool` (`max: 10`) via `useFactory`. Supabase em si é infra externa (não versionável no repo); local dev via `infra/docker-compose.yml` (`postgis/postgis:16-3.4`). |
| 1.3 Migrações base (`runner_profile`, `provider_connection`) | Atendido | `0002_runner_profile.sql`, `0003_provider_connection.sql` em `supabase/migrations/`. |
| 1.4 Módulo `auth` (verificação JWT) + `profile` (criação no 1º acesso) | Atendido | `SupabaseJwtVerifier` + `SupabaseJwtGuard`; `ProfileService.ensureProfileForUser`. |
| 1.5 Endpoint protegido `GET /me/profile` | Atendido | `ProfileController` com `@UseGuards(SupabaseJwtGuard)`. |
| CS: `GET /me/profile` responde 401 sem token e 200 autenticado | Atendido | Testes de integração 401 (sem/ inválido) e 200 (autenticado). |
| CS: perfil criado no 1º acesso associado ao `user_id` | Atendido | Teste "creates the runner profile on first authenticated access". |
| CS: lint falha ao declarar modelo/DTO com `interface` | Atendido | Confirmado empiricamente (seção 2). |
| CS: login Google/Apple gera JWT válido do Supabase | Fora do backend | Depende de config no painel Supabase (Auth providers); o backend apenas verifica o JWT emitido — comportamento coberto pelos testes de verifier/guard. |

Os módulos ainda não implementados (`geo`, `strava`, etc.) estão corretamente scaffolded com `@Module({})` e comentário apontando a task dona — coerente com "demais tabelas/funcionalidades nas tarefas donas".

---

## 4. Conformidade com a Tech Spec e convenções

- **Convenção de tipagem:** correta. `interface` aparece só em `token-verifier.port.ts` e `profile-repository.port.ts`; todos os modelos/DTOs (`AuthUser`, `RunnerProfile`, `RunnerProfileRow`, `CreateRunnerProfileInput`, `AppConfig`, `SupabaseJwtClaims`) usam `type`. Grep confirmou zero `interface` fora de `*.port.ts` em `apps/api/src`.
- **Camadas:** contrato (`*.port.ts` com `Symbol` de DI) → serviço (`ProfileService`, regra pura de "existe? senão cria") → repositório (`PgProfileRepository`, SQL) → controller fino. Verifier isolado atrás do port `TokenVerifier`, permitindo trocar a estratégia sem tocar no guard. Excelente aderência a DDD/Clean.
- **Pool `pg`:** `DatabaseModule` global, `useFactory` lendo `databaseUrl` do `ConfigService`, `PgPoolCloser` fecha o pool em `onModuleDestroy` (teardown correto — confirmado pelo `afterAll` da integração encerrando app + pool + container sem vazamento).
- **Migrações em `supabase/migrations/`:** runner idempotente com tabela `schema_migrations`, cada arquivo aplicado em transação (`begin`/`commit`/`rollback`). Path resolve tanto em `ts-node`/ts-jest (`src/database`) quanto compilado (`dist/database`) por terem a mesma profundidade — validado pela integração verde.
- **Regras `.claude/rules` do AcquisitionNew:** corretamente **não aplicadas** (stack distinto, conforme Tech Spec). Os comentários/JSDoc presentes no código NÃO são violação aqui (a regra `no-comments` é escopada a `AcquisitionNew`/`gol-sdk`).

---

## 5. Achados

Nenhum achado bloqueante. Todos são de severidade **Menor** / observações de hardening, a maioria referente a itens cujo dono é uma task futura.

### 5.1 [Menor] Pool `pg` sem listener de `'error'` — risco de crash do processo

- **Arquivo:** `apps/api/src/database/database.module.ts:14-22`
- **Impacto:** o `Pool` do `pg` emite o evento `'error'` em clients ociosos quando o backend Postgres derruba a conexão (restart do DB, timeout de rede, failover). Conforme a documentação do `node-postgres`, se um `EventEmitter` emite `'error'` sem listener registrado, o Node lança e **derruba o processo**. Como não há `pool.on('error', ...)`, uma queda transitória do Postgres pode tirar a API do ar inteira, não só a request afetada. (Nota: o próprio teste de integração registra `pool.on('error', () => undefined)` no seu pool — o pool da aplicação não tem equivalente.)
- **Sugestão:** anexar um handler no `useFactory`, ex.:
  ```ts
  const pool = new Pool({ connectionString: config.get('databaseUrl', { infer: true }), max: 10 });
  pool.on('error', (err) => Logger.error(err.message, 'PgPool'));
  return pool;
  ```

### 5.2 [Menor] `ValidationPipe` global sem `class-validator`/`class-transformer` declarados

- **Arquivo:** `apps/api/src/main.ts:9`
- **Impacto:** `new ValidationPipe({ whitelist: true, transform: true })` depende de `class-validator` e `class-transformer` em runtime, mas nenhum dos dois está em `apps/api/package.json` nem instalado (verificado: ausentes em `node_modules`). Inofensivo **hoje** — não há DTO com metatype de classe e a integração de `GET /me/profile` passou (sem body/param validável). Torna-se um erro de runtime no primeiro endpoint com DTO de corpo (ex.: `POST /integrations/strava/connect`, Task 3).
- **Sugestão:** adicionar `class-validator` e `class-transformer` às dependências de `apps/api` já nesta fundação (ou na task que introduzir o primeiro DTO), para que o pipe global funcione quando for exercido.

### 5.3 [Observação] `GET /me/profile` cria recurso (efeito colateral em verbo GET)

- **Arquivo:** `apps/api/src/modules/profile/profile.controller.ts:13-16` + `profile.service.ts:20-26`
- **Impacto:** semanticamente, GET deveria ser "safe"/sem efeito; aqui o primeiro GET cria a linha em `runner_profile`. Isso é **intencional e exigido pela task** ("perfil criado automaticamente no primeiro acesso" + critério de que `GET /me/profile` responde 200 com o perfil). A criação é idempotente (`ON CONFLICT DO NOTHING` + fallback), então não há duplicação nem dano. Registro apenas como observação de design para consideração futura (ex.: mover a criação para um hook pós-login/`POST` de bootstrap se a pureza de GET passar a importar).
- **Sugestão:** manter para o MVP; reavaliar se/quando houver um passo explícito de onboarding.

### 5.4 [Observação] Verificação de JWT: só HS256, sem validação de `issuer`

- **Arquivo:** `apps/api/src/modules/auth/verifiers/supabase-jwt.verifier.ts:25-28`
- **Impacto:** a verificação fixa `algorithms: ['HS256']` (bom — previne algorithm-confusion) e valida `audience` (bom), mas não valida `issuer`. Para o modelo de segredo compartilhado (HS256, "JWT Secret" do painel Supabase, conforme `.env.example`), um token de outro projeto não passaria na assinatura de qualquer forma, então o ganho de validar `iss` é pequeno. Fica a observação de que projetos Supabase modernos suportam chaves assimétricas (JWKS/ES256); se/quando migrar, o verifier precisará suportar JWKS.
- **Sugestão:** opcionalmente adicionar `issuer` às opções do `verify` para defesa em profundidade; planejar suporte a JWKS caso o projeto adote chaves assimétricas.

### 5.5 [Observação] `provider_connection` guarda tokens em `text` puro

- **Arquivo:** `supabase/migrations/0003_provider_connection.sql:16-17`
- **Impacto:** a Tech Spec exige tokens cifrados (Supabase Vault). A migração define `access_token`/`refresh_token` como `text` e o comentário do arquivo **explicitamente difere a cifragem para a Task 3** (dona do ciclo de vida OAuth). Aderente ao escopo — a migração base só estabelece o shape e a constraint de dedup `unique(user_id, provider)`. Registro para garantir que a cifragem não seja esquecida quando a Task 3 popular a tabela.
- **Sugestão:** a Task 3 deve escrever os tokens cifrados (Vault/pgcrypto — a extensão `pgcrypto` já é habilitada em `0001_init`).

---

## 6. Completude dos testes da tarefa

| Teste exigido pela task | Status | Observação |
|-------------------------|--------|------------|
| Unidade — guard (token válido/expirado/ausente) | Coberto | `guard.spec` cobre válido, sem header, esquema não-bearer, bearer sem token, propagação de rejeição; o caso "expirado" é coberto no `verifier.spec` (separação correta de responsabilidades). |
| Unidade — verifier | Coberto | válido, sem email, vazio, expirado, segredo errado, audience errada, sem `sub`. |
| Unidade — serviço de perfil (idempotência 1º acesso) | Coberto | retorna existente sem criar; cria derivando nome do email; cria com nome null; idempotência em 2ª chamada. |
| Integração — login → criação `runner_profile` → `GET /me/profile` com Postgres de teste | Coberto | 5 casos via testcontainers PostGIS, incluindo idempotência (contagem = 1) e isolamento por usuário. |
| E2E | N/A | Explicitamente fora desta task. |

Qualidade dos testes: sem `jest.mock` de infra real na integração (usa PostGIS de verdade via testcontainers, aderente ao princípio de "mock só de serviços externos"); teardown limpo; asserções verificam tanto a resposta HTTP quanto o estado no banco (contagem de linhas). Bom.

---

## 7. Veredito

### `APPROVED WITH OBSERVATIONS`

Justificativa: todos os 4 gates de validação passaram com os números esperados (unit 16/16, lint limpo, build OK, integração 5/5), o critério de lint foi confirmado empiricamente, e 100% do escopo e dos critérios de sucesso da Tarefa 1.0 foram atendidos com arquitetura e testes de boa qualidade. Os achados são todos de severidade menor / observações de hardening (nenhum bloqueante), com destaque para o listener de `'error'` do pool `pg` (5.1) e a dependência do `ValidationPipe` (5.2) — recomendados de endereçar, porém sem impacto no funcionamento atual nem no escopo entregue.

---

## 8. Mensagem de commit sugerida (Conventional Commits, pt-BR)

```
feat(api): estabelecer fundações do backend com auth e perfil

Scaffold do monólito modular NestJS (DDD/Clean Architecture) com os
módulos de domínio da Tech Spec, pool pg global e runner de migrações
SQL idempotente. Migrações base habilitam PostGIS e criam runner_profile
e provider_connection.

Adiciona verificação de JWT do Supabase (HS256, audience validada) via
guard + verifier atrás de port, criação idempotente de perfil no primeiro
acesso (ON CONFLICT) e o endpoint protegido GET /me/profile. Convenção de
tipagem interface-em-contratos / type-no-resto fixada por ESLint.
```
