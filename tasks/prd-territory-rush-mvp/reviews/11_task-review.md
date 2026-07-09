# Code Review — Tarefa 11.0: App mobile — perfil, ranking, conquistas, central de notificações

- **Branch:** `feat/task-11-mobile-profile-ranking`
- **Base do diff:** tag `task-10-done` → `HEAD` (`git diff task-10-done...HEAD`, worktrees `.claude/worktrees/*` ignorados)
- **Commit da task:** `9943ec0 feat(mobile): perfil, ranking, conquistas e central de notificações`
- **Escopo:** majoritariamente `apps/mobile` (Expo / React Native / TypeScript) — `src/screens/{Profile,Ranking,Achievements,Notifications}`, `src/services/api` (+ `useApiResource`), `App.tsx`; pequena adição no `apps/api` (endpoint `POST /me/notifications/:id/read` + `cityId` no perfil). Também marcação em `tasks.md`/`11_task.md`.
- **Data:** 2026-07-09
- **Revisor:** revisor sênior (skill `task-review` → `executar-review`)
- **Convenção transversal aplicável:** `interface` só em `*.port.ts`; `type` no resto. As regras/skills de `AcquisitionNew` **não se aplicam** (outro app/stack).

---

## 1. Resumo

A Tarefa 11.0 fecha a jornada de identidade e competição do app mobile, entregando as quatro telas previstas e o encanamento de dados para consumi-las.

**Camada de dados** — Foi introduzido um hook genérico `useApiResource<T>` (loading/error/reload) que padroniza o consumo das rotas de leitura; ele exige um `loader` estável (encapsulado em `useCallback` em cada tela). O `ApiClient` (port único do app, `api-client.port.ts`) ganhou os seis novos métodos da task — `getProfile`, `getCityRanking`, `getExplorerRanking`, `getAchievements`, `getNotifications`, `markNotificationRead`, `registerDeviceToken` — e a implementação HTTP (`createHttpApiClient`) mapeia cada um para a rota correta (`GET /me/profile`, `GET /rankings/city/:id`, `GET /rankings/explorers`, `GET /me/achievements`, `GET /me/notifications`, `POST /me/notifications/:id/read`, `POST /me/device-tokens`). Os tipos de resposta (`RunnerProfileDetail`, `CityRankingEntry`, `ExplorerRankingEntry`, `AchievementView`, `NotificationItem`) foram adicionados a `types.ts` e conferem com os contratos do backend (`NotificationRecord` é campo-a-campo igual a `NotificationItem`).

**Telas** — Arquitetura consistente e enxuta: cada tela é apresentacional, consome um `ApiClient` por prop e usa `useApiResource` para carregar. `ProfileScreen` exibe nome, cidade, ruas dominadas, ruas exploradas, distância (m→km), streak e rankings local/nacional. `RankingScreen` mostra os dois leaderboards (municipal por ruas dominadas e exploradores por ruas únicas), com `RankingRoute` resolvendo o `cityId` via perfil. `AchievementsScreen` lista conquistas com estado desbloqueada/pendente. `NotificationsCenter` lista notificações e expõe o botão "Marcar como lida" que chama `markNotificationRead` e recarrega. `usePushRegistration` encapsula o registro best-effort do device token (com `getPushToken` injetado).

**Acessibilidade** — Bem tratada e não dependente só de cor: containers com `accessibilityLabel` ("Perfil do corredor", "Rankings", "Conquistas", "Central de notificações") e, em conquistas/notificações, o `accessibilityLabel` por item embute o estado textual ("desbloqueada"/"pendente", "lida"/"não lida"). `testID` consistente em todos os elementos, viabilizando os testes.

**Navegação** — As quatro telas novas + Conexões são alcançáveis pelo `HeaderNav` no header do `MapScreen` (botões Perfil/Ranking/Conquistas/Avisos/Conexões). Isso também sana a observação (b) da review 10.0 (Conexões não navegável), agora corrigida.

**Backend** — Adição mínima e coerente com a arquitetura DDD já vigente: o `NotificationRepository` (port) ganhou `markRead(userId, id): Promise<boolean>`, com implementação SQL idempotente (`... where id=$1 and user_id=$2 and read_at is null`), e o controller expõe `POST /me/notifications/:id/read` (204, `ParseUUIDPipe`). O perfil passou a devolver `cityId` (usado pela `RankingScreen`).

**Gates** — Os seis gates rodaram de verdade (Docker de pé; integração via Testcontainers) e **todos passaram com os números exatos esperados**: mobile tsc limpo, mobile eslint limpo, mobile jest **33/17**; backend unit **167/36**, backend eslint limpo, backend integração **40/9** (~54,7s). A validação é honesta quanto à infra: o app não roda aqui (sem device/simulador); os testes de tela injetam um `ApiClient` fake na fronteira e o push real + navegação em device ficam para a 13.0 (E2E). "Bairros explorados" está deferido, usando `streetsExplored` (ruas exploradas) como proxy — consistente com a nota de escopo.

**Veredito: `APPROVED WITH OBSERVATIONS`.** Nenhum gate falhou; as quatro subtarefas e seus testes foram entregues; a convenção `interface`/`type` foi respeitada; acessibilidade e navegabilidade atendidas. Os achados são de **completude vs. a letra do requisito** e de **robustez/cobertura**, não de correção do caminho feliz: (a) `ProfileScreen` **não renderiza a foto** (`photoUrl`), embora "foto" seja item explícito do RF-6.1 e do requisito da task; (b) `usePushRegistration` está implementado e testado mas **não é invocado em lugar nenhum do app** — o device token nunca é registrado em runtime; (c) os novos métodos HTTP do `ApiClient` **não têm teste unitário** (a construção de URL de `/me/notifications/:id/read` e `/me/device-tokens` não é exercida).

---

## 2. Resultado da validação (execução real)

Todos os comandos foram executados exatamente como especificado. Docker em execução (v29.2.1); os testes de integração sobem Postgres+Redis efêmeros via Testcontainers.

### Mobile — `cd apps/mobile && npx tsc --noEmit`
```
(sem saída)
EXIT=0
```
Esperado: sem erros → **OK ✅**

### Mobile — `npx eslint "src/**/*.{ts,tsx}" "App.tsx" "index.ts"`
```
(sem saída)
EXIT=0
```
Esperado: limpo → **OK ✅**. Confirma a convenção transversal: o único `interface` do app é o port `ApiClient` (`api-client.port.ts`); todo o resto (props de tela, `ApiResource`, `TokenProvider`, tipos de API) usa `type`.

### Mobile — `npx jest`
```
Test Suites: 17 passed, 17 total
Tests:       33 passed, 33 total
Snapshots:   0 total
Time:        1.922 s
```
Esperado: 33 testes / 17 suites → **OK ✅** (bate exatamente). Novas suites: `ProfileScreen`, `RankingScreen`, `AchievementsScreen`, `NotificationsCenter`, `usePushRegistration`, `useApiResource`.

### Backend — `cd apps/api && npx jest --config jest.config.ts`
```
Test Suites: 36 passed, 36 total
Tests:       167 passed, 167 total
```
Esperado: 167 → **OK ✅** (bate exatamente). Inclui o novo caso `NotificationsService › marks a notification as read`.

### Backend — `npx eslint "src/**/*.ts" "test/**/*.ts"`
```
(sem saída)
EXIT=0
```
Esperado: limpo → **OK ✅**

### Backend — `npx jest --config test/jest-int.config.ts --runInBand`
```
Test Suites: 9 passed, 9 total
Tests:       40 passed, 40 total
Time:        54.673 s
```
Esperado: 40 (~55s) → **OK ✅** (bate exatamente). Inclui o novo caso de integração `POST /me/notifications/:id/read marks a notification as read`, que valida `read_at` persistido no banco.

**Conclusão dos gates:** 6/6 verdes com contagens exatas. Nenhum motivo de `REJECTED`.

---

## 3. Aderência à Task, PRD e Tech Spec

| Requisito | Situação | Nota |
|---|---|---|
| **RF-6 Perfil** (foto, nome, cidade, ruas dominadas, bairros explorados, distância, streak, rank local+nacional) | ⚠️ Parcial | Nome, cidade, ruas dominadas, ruas exploradas (proxy de bairros), distância, streak, ranks: **OK**. **Foto não renderizada** (achado A). "Bairros explorados" deferido para `streetsExplored` (proxy) por nota de escopo. |
| **RF-7 Ranking** (municipal por ruas dominadas; exploradores por ruas únicas; estado/país quando houver) | ✅ Atendido | Municipal e exploradores implementados e ordenados pela `rank` da API. Estado/país não é obrigatório no MVP e não veio no contrato — coerente com "quando houver dado". |
| **RF-8 Conquistas** (desbloqueadas/pendentes) | ✅ Atendido | Estado textual + `accessibilityLabel` por item. |
| **RF-9 Notificações** (histórico via `GET /me/notifications` + marcar lida) | ✅ Atendido | Lista + `POST /me/notifications/:id/read` ponta-a-ponta (mobile→controller→repo→DB), coberto por unit e integração. |
| **Device token / push** | ⚠️ Parcial | Hook `usePushRegistration` + rota `POST /me/device-tokens` existem e são testados, mas o hook **não é montado no app** (achado B). Push real deferido à 13.0. |
| **Acessibilidade** | ✅ Atendido | Labels em todos os containers e estados não dependem só de cor. |
| **Convenção `interface`/`type`** | ✅ Atendido | `interface` só em `*.port.ts`; lint confirma. |
| **Telas alcançáveis via navegação** | ✅ Atendido | `HeaderNav` liga as 5 telas a partir do mapa. |
| Subtarefas 11.1–11.4 + testes unidade/integração | ✅ | E2E corretamente deferido à 13.0. |

---

## 4. Achados

### 🟡 A — `ProfileScreen` não renderiza a foto do corredor (completude de requisito)

`RF-6.1` e o requisito literal da task listam **"foto, nome, cidade"**. O campo `photoUrl` existe em `RunnerProfileDetail` e chega do backend, mas `ProfileScreen.tsx` importa apenas `ActivityIndicator, Text, View` — não há `Image` e `photoUrl` nunca é consumido (`grep` confirma ausência total).

- **Impacto:** item explícito do RF-6 não visível na UI. Baixo risco funcional (campo é anulável; MVP), mas é uma lacuna vs. a letra do requisito.
- **Sugestão:** renderizar `<Image source={{ uri: profile.photoUrl }} ... />` com fallback quando `null`, e um teste cobrindo o caso com/sem foto. Se a ausência for intencional para o MVP, registrar na nota de escopo da task como os "bairros explorados".

### 🟡 B — `usePushRegistration` implementado e testado, porém não conectado ao app

O hook registra o device token no mount, tem 2 testes e a rota `POST /me/device-tokens` existe. Mas `grep` por `usePushRegistration`/`registerDeviceToken`/`getPushToken` em `App.tsx` retorna vazio: **nenhum componente monta o hook**. Em runtime, o token nunca é enviado.

- **Impacto:** a parte "recebimento de push" da subtarefa 11.4 fica sem efeito prático no app. A nota de honestidade defere o push real ao device/13.0, mas o *wiring* do registro (chamar o hook no navegador autenticado, com um `getPushToken` real de `expo-notifications`) está ausente — não é só uma limitação de ambiente.
- **Sugestão:** montar `usePushRegistration(api, getExpoPushToken, Platform.OS)` dentro do `MainNavigator` (ou no App autenticado). Mesmo sem `expo-notifications` real aqui, o encanamento fica pronto e testável na 13.0.

### 🟢 C — Novos métodos do `http-api-client` sem teste unitário (cobertura)

`http-api-client.test.ts` cobre apenas `getStreets`, `connectStrava`, `disconnectStrava` e o caminho de erro (herdados da 10.0). Os **sete** métodos adicionados nesta task (perfil, rankings, conquistas, notificações, `markNotificationRead`, `registerDeviceToken`) não têm asserção de URL/método. As telas usam `ApiClient` fake, então a construção real de `POST /me/notifications/${id}/read` e `POST /me/device-tokens` (e o `JSON.stringify` do body) fica sem exercício.

- **Impacto:** baixo (código simples e uniforme), mas um erro de path/verbo passaria despercebido pelos testes atuais.
- **Sugestão:** replicar o padrão existente (spy em `fetch`) para ao menos `markNotificationRead` (POST + path com id) e `registerDeviceToken` (POST + body).

### 🟢 D — `markRead` responde 204 mesmo quando nada foi atualizado (robustez/semântica)

O service e o repositório já devolvem `boolean` (linha afetada ou não), mas `NotificationsController.markRead` ignora o retorno e sempre responde 204 — inclusive para um `id` inexistente ou de outro usuário.

- **Impacto:** baixo; o design é idempotente e não vaza dado de terceiros (o `where user_id=$2` protege). Porém mascara 404 e o `boolean` fica sem uso além do teste.
- **Sugestão:** se `markRead` retornar `false`, lançar `NotFoundException` (ou documentar a idempotência como decisão). Aproveitar o `boolean` já disponível.

### 🟢 E — Observações menores (sem ação obrigatória)

- **`RankingRoute` refaz `getProfile`** (também buscado pela `ProfileScreen`) só para obter `cityId`, e não trata loading/erro desse fetch: enquanto o perfil carrega, `cityId` é `null` e o ranking municipal aparece vazio até re-render. Degradação aceitável; poderia exibir um loader único.
- **JSDoc presente** em `useApiResource.ts`, `api-client.port.ts` e `usePushRegistration.ts`: permitido neste app (a regra "sem comentários" é do `AcquisitionNew` e não se aplica aqui). Sem ação.
- **`useApiResource`** duplica levemente a lógica de fetch entre o `useEffect` (com guarda `active`) e o `run` do `reload`; funcional e testado, mas consolidável no futuro.

---

## 5. Qualidade de código

- **Separação de camadas** limpa: telas apresentacionais + hook de dados genérico + port/adapter HTTP. Consistente com a 10.0.
- **Tipagem** correta e centralizada em `types.ts`; convenção `interface`/`type` respeitada e travada por lint.
- **Idempotência** do `markRead` no SQL é um cuidado positivo.
- **Testes** legíveis, com fixtures tipadas e asserções por `testID`/estado textual; cobrem caminhos feliz e de erro das telas (perfil com erro, ranking sem cidade, push sem token).
- **Sem regressão**: as suítes pré-existentes (mobile 10.0, backend inteiro) seguem verdes.

---

## 6. Veredito

## ✅ `APPROVED WITH OBSERVATIONS`

Todos os 6 gates passaram com as contagens exatas esperadas (mobile 33/17, backend unit 167/36, integração 40/9). As quatro subtarefas e seus testes foram entregues, a convenção de tipagem e a acessibilidade estão atendidas e as telas são navegáveis. Os achados **A** (foto do perfil não renderizada) e **B** (hook de push não plugado) são de completude vs. a letra do requisito e devem ser endereçados ou explicitamente deferidos por nota de escopo; **C** e **D** são melhorias de cobertura/robustez. Nenhum é bloqueante.

**Ações recomendadas antes de considerar RF-6/RF-9 100% fechados:** renderizar a foto no perfil (A) e montar `usePushRegistration` no app autenticado (B). Idealmente adicionar os testes de `http-api-client` (C).

---

## 7. Mensagem de commit sugerida

O trabalho já está commitado como `9943ec0`. Caso os achados sejam endereçados, sugestão para o commit de ajuste (Conventional Commits, pt-BR):

```
feat(mobile): perfil, ranking, conquistas e central de notificações

Adiciona ProfileScreen, RankingScreen, AchievementsScreen e
NotificationsCenter consumindo as rotas de leitura via useApiResource;
inclui marcar notificação como lida (POST /me/notifications/:id/read) e
cityId no perfil para o ranking municipal.
```
