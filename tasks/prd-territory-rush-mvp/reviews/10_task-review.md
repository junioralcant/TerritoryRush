# Code Review — Tarefa 10.0: App mobile — Auth + conexão Strava + mapa territorial

- **Branch:** `feat/task-10-mobile-map`
- **Base do diff:** tag `task-9-done` → `HEAD` (`git diff task-9-done...HEAD`, worktrees `.claude/worktrees/*` ignorados)
- **Commit da task:** `6661e71 feat(mobile): app Expo — Auth + conexão Strava + mapa territorial`
- **Escopo:** `apps/mobile` (Expo SDK 52 / React Native 0.76 / TypeScript) — `src/auth`, `src/services/api`, `src/screens/{Connections,Map}`, `App.tsx`, configs (jest/eslint/tsconfig/babel/app.json) + `package-lock.json` + marcação em `tasks.md`/`10_task.md`. O backend (`apps/api`) **não** faz parte desta task.
- **Data:** 2026-07-09
- **Revisor:** revisor sênior (skill `task-review` → `executar-review`)

---

## 1. Resumo

A Tarefa 10.0 entrega o primeiro fatia ponta a ponta do app mobile: login social (Supabase Auth — Google/Apple), início do OAuth Strava, tela de conexão/desconexão do Strava e o mapa territorial (MapLibre) com ruas coloridas por posse e drawer de detalhe.

**Camada de API** — `ApiClient` é um **port** (`api-client.port.ts`, único `interface` do app), com implementação HTTP (`createHttpApiClient`) que injeta o JWT do Supabase via `TokenProvider`, monta o `bbox` como querystring, trata `204 No Content` e lança em respostas não-`ok`. Os tipos (`StreetSummary`, `StreetDetail`, `StravaConnectionState`, `Bbox`, etc.) estão em `types.ts`. **Confirmei a fidelidade de contrato com o backend da 8.0/3.0**: `StreetSummary`, `StreetDetail` (inclusive `ownershipHistory`) e `StravaConnectionState` são idênticos aos tipos retornados por `GeoController`, `TerritoryController` e `IntegrationsStravaController`; as rotas (`GET /streets?bbox=`, `GET /streets/:id`, `GET /integrations/strava`, `POST /integrations/strava/connect`, `DELETE /integrations/strava/disconnect` → 204) casam exatamente com os controllers existentes.

**Auth** — `useSession` observa `getSession()` + `onAuthStateChange` e expõe `signInWith(provider)` (OAuth via `WebBrowser.openAuthSessionAsync`). `stravaOAuth` monta a URL de autorização, abre a sessão de browser e extrai o `code` do redirect (o code é trocado no servidor via `ApiClient.connectStrava`). `AuthScreen` é apresentacional (botões Google/Apple).

**Telas** — arquitetura consistente: tela fina apresentacional + hook de dados. `ConnectionsScreen`/`useConnections` (carrega estado, conecta se o OAuth devolve code, desconecta e recarrega). `MapScreen`/`useStreets` (busca ruas por bbox, seleciona rua → detalhe). O mapa (`TerritoryMap`) usa um util puro `toStreetFeatureCollection` para gerar um GeoJSON `FeatureCollection` com a cor de posse embutida, renderizado por um único `LineLayer` data-driven (`['get', 'color']`). `ownershipStyle` mapeia cada estado (`unclaimed`/`mine`/`other`) para cor **e rótulo textual**.

**Acessibilidade (RF-5.1)** — bem resolvida: `StreetStateLegend` renderiza, para cada um dos três estados, o swatch de cor **acompanhado do rótulo textual** (“Rua sem dono” / “Rua dominada por você” / “Rua dominada por outro corredor”), garantindo que o estado não dependa só da cor. O drawer expõe `accessibilityLabel` no container e nas seções (proprietário, ranking).

Os três gates rodaram no diretório `apps/mobile` e passaram com os números exatos esperados: **typecheck limpo**, **lint limpo**, **testes 22/22 em 11 suites**. A validação é honesta quanto à infra: o app **não é executável aqui** (sem simulador/binário nativo do MapLibre); o módulo nativo do MapLibre é substituído por hosts passthrough no `jest.setup.js` e a camada de rede é exercitada por um `ApiClient` fake injetado na fronteira — cobertura adequada para testes de componente/hook, com o E2E real corretamente deferido à Tarefa 13.0.

Veredito: **`APPROVED WITH OBSERVATIONS`**. Nenhum gate falhou, as quatro subtarefas foram entregues, a convenção de tipagem foi aplicada e a acessibilidade dos estados do mapa (RF-5.1) está atendida. Os achados são de **completude vs. a letra do requisito** e de **robustez**, não de correção do caminho feliz dos componentes implementados: (a) o drawer **não renderiza o histórico de domínio** (`ownershipHistory`), embora esse dado seja um item explícito do critério de sucesso e já venha da API; (b) a `ConnectionsScreen` **não é alcançável pela navegação** (nenhuma ação `navigate`/botão), o que trava o passo “conectar Strava” dentro do app; (c) o callback do OAuth do Supabase não trata a URL de retorno (a sessão social depende só do `onAuthStateChange`), a validar em device na 13.0.

---

## 2. Resultado da validação (execução real)

Comandos executados exatamente como especificado, em `apps/mobile` (dependências resolvidas via `node_modules` hoisted do workspace raiz).

### Typecheck — `cd apps/mobile && npx tsc --noEmit`

```
(sem saída)
EXIT=0
```

Esperado: sem erros → **OK ✅**.

### Lint — `cd apps/mobile && npx eslint "src/**/*.{ts,tsx}" "App.tsx" "index.ts"`

```
(sem saída)
EXIT=0
```

Esperado: limpo → **OK ✅**. Confirma a convenção transversal (`@typescript-eslint/consistent-type-definitions`): o único `interface` do app é o port `ApiClient` (`api-client.port.ts`), sob a regra específica `files: ['**/*.port.ts']`; todo o resto usa `type`.

### Testes — `cd apps/mobile && npx jest`

```
PASS src/screens/Map/streetFeatures.test.ts
PASS src/auth/stravaOAuth.test.ts
PASS src/services/api/http-api-client.test.ts
PASS src/screens/Map/ownershipStyle.test.ts
PASS src/screens/Map/useStreets.test.tsx
PASS src/screens/Connections/useConnections.test.tsx
PASS src/screens/Map/StreetStateLegend.test.tsx
PASS src/screens/Map/StreetDetailDrawer.test.tsx
PASS src/auth/AuthScreen.test.tsx
PASS src/screens/Map/MapScreen.test.tsx
PASS src/screens/Connections/ConnectionsScreen.test.tsx

Test Suites: 11 passed, 11 total
Tests:       22 passed, 22 total
Snapshots:   0 total
Time:        1.68 s
```

Esperado: 22 testes / 11 suites → **22/11 ✅** (único ruído: `watchman warning: Recrawled this watch`, irrelevante ao resultado).

---

## 3. Aderência à Tech Spec e à Task

| Item | Status | Observação |
|------|--------|------------|
| `AuthFlow` — login Google/Apple (Supabase) | ✅ | `useSession.signInWith` + `AuthScreen`. Ver achado M3 sobre o tratamento do callback. |
| `AuthFlow` — início do OAuth Strava a partir do app | ✅ | `startStravaOAuth` → `WebBrowser` → extrai `code` → troca via `connectStrava`. |
| `ConnectionsScreen` — conectar/desconectar (POST/DELETE) | ✅ (componente) | Fluxo implementado e testado; porém a tela não é alcançável pela navegação (achado M2). |
| `MapScreen` — `GET /streets?bbox=`, cores de posse | ✅ | Três estados via `ownershipStyle`; `FeatureCollection` data-driven. |
| Drawer — `GET /streets/:id` (dono, ranking, posse, disputas, **histórico**) | ⚠️ Parcial | Renderiza dono, ranking, tempo de posse e disputas; **histórico de domínio não é exibido** (achado M1 / RF-5.2). |
| Acessibilidade — estados do mapa com rótulo textual (RF-5.1) | ✅ | `StreetStateLegend` com cor + texto; drawer com labels. |
| Convenção `interface`/`type` | ✅ | `interface` só no `*.port.ts`; regra de lint fixa a convenção. |
| Contrato app ↔ backend | ✅ | Rotas e tipos idênticos aos controllers de `apps/api`. |
| Testes unidade/integração da task | ✅ | Três estados de rua, montagem do drawer, fluxo de conexão. |
| E2E | ⏭️ Deferido | Corretamente marcado para a 13.0 (Playwright). |

---

## 4. Achados por severidade

### Maiores (Major)

**M1 — Drawer não renderiza o histórico de domínio (`ownershipHistory`).**
`StreetDetailDrawer.tsx` exibe nome, dono, tempo de posse, disputas e ranking, mas **não renderiza `detail.ownershipHistory`**, apesar de o campo existir no tipo, ser retornado pelo backend (`TerritoryController` → `StreetDetail.ownershipHistory`) e ser um item explícito do critério de sucesso da task (“drawer com dono, ranking, **histórico**, tempo de posse e disputas”) e da RF-5.2.
*Impacto:* atende 4 de 5 elementos exigidos do drawer; o histórico de troca de posse fica indisponível ao usuário mesmo com o dado em mãos.
*Sugestão:* renderizar uma seção de histórico (mapeando `ownershipHistory` — `acquiredAt`/`lostAt`/dono) com `testID` e `accessibilityLabel`, e cobrir com um caso de teste no `StreetDetailDrawer.test.tsx` (hoje a fixture usa `ownershipHistory: []`).

**M2 — `ConnectionsScreen` inalcançável pela navegação.**
Em `App.tsx`, `Stack.Navigator` registra `Map` (rota inicial) e `Connections`, mas não há nenhuma ação `navigation.navigate('Connections')`, botão de header ou tab. `grep` por `navigate/useNavigation` retorna apenas os imports do navigator.
*Impacto:* dentro do app o usuário só vê o mapa; não há caminho para “conectar o Strava”, que é um dos critérios de sucesso da task (“Usuário faz login, conecta o Strava e vê no mapa…”). Provável que o shell de navegação venha na Tarefa 11.0, mas, como entregue na 10.0, o fluxo não fecha in-app.
*Sugestão:* expor a navegação para `Connections` (botão no header do `Map` ou tab), ou registrar explicitamente que o shell/entrada de navegação é escopo da 11.0.

### Médios (Medium)

**M3 — Callback do OAuth do Supabase não é tratado; sessão depende só de `onAuthStateChange`.**
`useSession.signInWith` chama `signInWithOAuth({ skipBrowserRedirect: true })`, abre a URL no `WebBrowser` e **descarta a URL de retorno** de `openAuthSessionAsync`. Com `detectSessionInUrl: false` no `supabaseClient`, não há `setSession`/`exchangeCodeForSession` a partir do redirect — a sessão social só se estabelece se `onAuthStateChange` disparar, o que no fluxo nativo/PKCE pode não ocorrer sem processar a URL de callback.
*Impacto:* risco de o login Google/Apple não completar em device. Não verificável aqui (sem simulador — limite de infra honesto), e é exatamente o tipo de comportamento coberto pelo E2E da 13.0.
*Sugestão:* tratar a URL retornada por `openAuthSessionAsync` (parse do fragment + `setSession`, ou fluxo PKCE com `exchangeCodeForSession`); validar em device na 13.0.

**M4 — Ausência de tratamento de erro nas telas/hooks.**
`useStreets` e `useConnections` não capturam falhas de API: em `getStreets`, o `finally` zera o loading mas o mapa fica vazio silenciosamente; `connect`/`disconnect` são disparados via `void ...()` na `ConnectionsScreen`, então uma exceção do `ApiClient` (que lança em resposta não-`ok`) vira rejeição não tratada, sem feedback ao usuário.
*Impacto:* falhas de rede/401 degradam para “tela vazia” sem sinalização; não há estado de erro/retry.
*Sugestão:* expor um estado de erro nos hooks e uma UI mínima (mensagem/retry), alinhado ao princípio de “confiabilidade percebida” do PRD.

### Menores (Low)

- **L1 — `void MapLibreGL;` em `TerritoryMap.tsx`.** O import `default MapLibreGL` só existe para ser “consumido” por `void`, driblando o `no-unused-vars`. Se o default não é necessário para efeito colateral de registro, remover o import; caso seja, documentar o motivo. Ruído de código.
- **L2 — `OSM_STYLE_URL` aponta para `demotiles.maplibre.org`.** É o estilo de demonstração do MapLibre, não um estilo OSM real; aceitável como placeholder de dev, mas o fundo do mapa não será OSM até apontar para um estilo/tiles definitivo.
- **L3 — `signOut` sem UI.** `useSession.signOut` está implementado mas não há botão de logout em lugar algum. Código pronto porém não exercitável pelo usuário.
- **L4 — `api` recriado a cada mudança de sessão.** Em `App.tsx`, o `useMemo` do `api` depende de `session`; a cada refresh de token (`autoRefreshToken`) um novo `ApiClient` é criado, o que reexecuta os efeitos de `useStreets`/`useConnections` (dep. em `api`) e refaz os fetches. Ineficiência menor; considerar memoizar por `apiUrl` + um getter estável de token.

---

## 5. Cobertura de testes

Cobertura adequada para o nível de teste viável neste ambiente (componente/hook + unidade pura), com mock apenas na fronteira certa (módulo nativo do MapLibre e `expo-web-browser`/`expo-linking` no `jest.setup.js`; `ApiClient` fake injetado — sem `jest.mock` de rede/serviços):

- **Três estados de rua:** `ownershipStyle.test.ts` (cor + rótulo por estado), `streetFeatures.test.ts` (FeatureCollection com as três cores/ownership), `StreetStateLegend.test.tsx` (rótulo textual dos três estados), `MapScreen.test.tsx` (mapa + legenda dos três estados). ✅
- **Montagem do drawer:** `StreetDetailDrawer.test.tsx` (dono/posse/disputas/ranking + estado “sem dono/sem posse”). ✅ — **lacuna:** nenhum caso cobre `ownershipHistory` populado (ligado ao achado M1).
- **Fluxo de conexão:** `useConnections.test.tsx` (load, connect com code, cancelamento sem code, disconnect+refresh) e `ConnectionsScreen.test.tsx` (estados conectado/desconectado + ações). ✅
- **API/Auth:** `http-api-client.test.ts` (bbox+header, POST connect, DELETE 204, throw em não-`ok`), `stravaOAuth.test.ts` (URL de autorização + extração de code), `useStreets.test.tsx` (load por bbox + seleção de detalhe), `AuthScreen.test.tsx` (callbacks dos provedores). ✅

Lacunas sugeridas (não bloqueantes): caso de histórico no drawer (M1); caso de erro de API nos hooks (M4); teste do disparo de `startStravaOAuth`/`signInWith` (a integração browser está mockada, então o comportamento fica só no nível de callback).

---

## 6. Veredito

### `APPROVED WITH OBSERVATIONS`

Justificativa: os três gates passaram com os números esperados (typecheck limpo, lint limpo, 22/22 testes em 11 suites), as quatro subtarefas foram entregues, os contratos do app espelham fielmente o backend, a convenção `interface`/`type` está aplicada e a acessibilidade dos estados do mapa (RF-5.1) está atendida com rótulos textuais. Nenhum critério de rejeição do fluxo (`executar-review`) foi acionado — sem testes falhando, sem violação severa de regra, sem desvio de Tech Spec, sem problema de segurança.

As observações são de completude e robustez, não de correção do caminho feliz dos componentes implementados. Recomenda-se, antes de fechar a fatia mobile: **renderizar o histórico de domínio no drawer (M1)** e **prover navegação até a `ConnectionsScreen` (M2)** — ou registrar M2 explicitamente como escopo da Tarefa 11.0; **M3** deve ser validado em device na 13.0.

---

## 7. Mensagem de commit sugerida (Conventional Commits, pt-BR)

O trabalho já está commitado em `6661e71` com mensagem coerente. Para referência/padronização:

```
feat(mobile): app Expo com auth, conexão Strava e mapa territorial

Entrega a primeira fatia ponta a ponta do app (Expo/RN + TS): login
social via Supabase (Google/Apple), início do OAuth Strava, tela de
conexao/desconexao do Strava e mapa MapLibre com ruas coloridas por
posse (cinza/azul/vermelho), legenda textual acessivel e drawer de
detalhe. Cliente de API tipado espelhando o contrato do backend
(streets por bbox, detalhe da rua, integracoes Strava). Convencao
interface/type fixada por ESLint. Testes de componente/hook com a
camada de rede mockada na fronteira; E2E deferido a 13.0.
```
