# Rule: Arquitetura AcquisitionNew

## Regra

Todo trabalho em `modernization/modules/AcquisitionNew/` segue uma arquitetura fixa de separação por camadas. Sair desse padrão exige justificativa explícita.

## Camadas

1. **Componente da tela** — `{Name}ScreenNew.tsx` é fino: importa o main hook e renderiza JSX. **Nenhuma lógica de negócio.** O consumo do main hook segue padrão fixo: `const viewModel = use{Name}ScreenNew()` no topo do componente; acesso a campos via `viewModel.x`. Sem desestruturação no topo e sem outros nomes (`vm`, `data`, etc.). Referência canônica: `screens/Passengers/PassengerFormScreenNew/PassengerFormScreenNew.tsx:25`. **Nenhum `useState` no `.tsx` de tela** — estado de UI (modais abertos, toggles, drawers) vai para o main hook (`useState` dentro do hook, exposto via `viewModel.isXOpen` + `viewModel.openX/closeX`). O `.tsx` da tela só renderiza JSX em função de `viewModel`.
2. **Main hook** — `hooks/use{Name}ScreenNew.ts` orquestra: `useScreenView(SCREENS.X)`, composição de sub-hooks (feature flags, store selectors, store service, fetchers). Retorna objeto, **nunca JSX**. **Toda tela tem main hook, sem exceção** — mesmo telas triviais (ex: tela puramente informativa que só chama `useScreenView`) têm seu `use{Name}ScreenNew.ts`. `loadAcquisitionNewTranslations()` é chamada **apenas** no main hook da primeira tela do fluxo (`useSearchTripScreenNew`) — uma vez registrado, o bundle cobre o fluxo inteiro; não repetir nas demais.
3. **Sub-hooks** — um por responsabilidade (`useSearchTrips`, `useDeepLinkParams`, `useQueueSession`). Composição é a regra; arquivos curtos.
4. **Store** — Zustand com `persist`, `types.ts` com state+actions, **selector hooks** (`use{X}State`) para leitura e **service hook** (`use{Name}StoreService`) para escrita.
5. **Service SDK** — em `modules/gol-sdk/src/services/acquisition/{name}/`, três camadas: middle (HTTP) / service (erro Sabre + sessão) / adapter (transformação pura). Detalhe em `.claude/rules/sdk-service-3-layers.md`.
6. **Analytics** — `analytics/constants.ts` (SCREENS, LOG `as const`), hooks `useLog*` com fingerprint via `useRef`, reusar `useBaseAnalyticsParams`.
7. **Translations** — subpasta `translations/` dentro de cada tela (`screens/{...}/{Name}ScreenNew/translations/`) com `en.json`/`es.json`/`pt-BR.json`, `expectedTranslations.ts` e `__tests__/translations.test.ts` próprio (consistência + conteúdo). Registrar via `loadAcquisitionNewTranslations()` no módulo-level `translations/index.ts`, que importa de cada `translations/` co-locada. **A função é chamada uma única vez no fluxo, no main hook da tela de entrada (`useSearchTripScreenNew`)**; demais telas consomem as keys diretamente via `useTranslation()` (ou via main hook que faça `t = useTranslation().t`). Namespace `AcquisitionNew.{Screen}.{Path}`; subnamespace `A11y` para acessibilidade.
8. **Testes** — `__tests__/testUtils.tsx` concentra TUDO (setup, ações, asserts); `__tests__/{Name}ScreenNew.test.tsx` é só `describe`/`it` + helpers. MSW para API. **Três describes top-level obrigatórios em toda tela**: `Fluxos`, `Regras da tela`, `Tagueamento` — nessa ordem e nessa nomenclatura exata. Acessibilidade, paridade com legacy e demais validações contextuais ficam como **sub-describes nested dentro de `Regras da tela`** (ex: `describe('Acessibilidade', ...)`, `describe('Paridade legado', ...)`). Mesmo que algum dos três top-level venha vazio temporariamente, deixar o `describe` presente para uniformidade visual.

## Estrutura de pastas (canônica)

```
screens/{Name}ScreenNew/
├── {Name}ScreenNew.tsx
├── index.ts, types.ts
├── hooks/
│   ├── use{Name}ScreenNew.ts
│   └── use*.ts (sub-hooks)
├── components/{ComponentName}/
│   ├── {ComponentName}.tsx, index.ts, types.ts
│   └── hooks/use{ComponentName}.ts
├── utils/
├── analytics/{constants,types}.ts, useLog*.ts, index.ts
├── translations/
│   ├── en.json, es.json, pt-BR.json
│   ├── expectedTranslations.ts
│   └── __tests__/translations.test.ts
└── __tests__/testUtils.tsx, {Name}ScreenNew.test.tsx
```

Sem `styles.ts` — layout via `GolBox` (`marginTop="s2x"`, `gap="s2x"`) e props das Tangerinas.

**Funções auxiliares (regras, formatação, builders): SEMPRE em `utils/`.** Não criar `helpers/`, `domain/`, `lib/` nem qualquer outro nome — todas servem ao mesmo propósito. Uma única pasta `utils/` por tela com `index.ts` (barrel), `types.ts` quando necessário, e `__tests__/`. Exceções legítimas para complexidade real e bem delimitada (ex: `forms/` + `schemas/` em `PassengerFormScreenNew` para RHF + Zod) ficam justificadas individualmente nesta rule.

## Clusters (sub-telas agrupadas)

Quando uma tela é alcançada **exclusivamente** a partir de outra tela do módulo (não é entry-point do fluxo, não é navegável de fora), agrupar ambas em **cluster**: pasta intermediária dentro de `screens/` com nome do domínio (`Passengers/`, `Extras/`, `Fare/`, `TripDetails/`), contendo as telas filhas e seu próprio `index.ts` (barrel).

```
screens/
├── Passengers/
│   ├── index.ts
│   ├── PassengerSelectionScreenNew/
│   ├── PassengerFormScreenNew/
│   └── ...
├── Fare/
│   ├── index.ts
│   ├── FareSelectScreenNew/
│   └── FareDetailScreenNew/
└── TripDetails/
    ├── index.ts
    ├── TripDetailsScreenNew/
    └── TripDetailsImportantInfoScreenNew/
```

Padrão visível em `Passengers/`, `Extras/`, `Fare/`, `TripDetails/`. Sub-telas dentro de um cluster mantêm a mesma estrutura interna de uma tela normal (`hooks/`, `components/`, `utils/`, `analytics/`, `__tests__/`).

## Referências canônicas

- `modernization/modules/AcquisitionNew/screens/SearchTripScreenNew/` — padrão mais limpo
- `modernization/modules/AcquisitionNew/screens/SelectTripScreenNew/` — composição rica de sub-hooks

## Anti-pattern

- Lógica no `.tsx` da tela
- Main hook retornando JSX
- `useState` no `.tsx` da tela (mesmo para estado puramente de UI como modal aberto) — vai para o main hook
- Tela sem main hook (mesmo trivial)
- Estado de tela em `useState` no main hook quando faria sentido na store (estado de domínio compartilhado entre telas → store; estado puramente local de UI → `useState` no main hook)
- Importar componente da tela diretamente em outro stack sem passar pelo navigator
- Desestruturar o retorno do main hook no topo do componente (`const { a, b } = use{Name}ScreenNew()`) ou usar nome diferente de `viewModel`
- Criar `helpers/`, `domain/`, `lib/` ou qualquer pasta de funções auxiliares diferente de `utils/`
- Sub-tela alcançada só de outra tela do módulo solta na raiz de `screens/` em vez de dentro do cluster correspondente

## Checklist de PR

Antes de abrir PR em AcquisitionNew ou no SDK `acquisitionNew/`, conferir:

**Tela**
- [ ] `.tsx` da tela é fino: `const viewModel = use{Name}ScreenNew()` no topo + JSX em função de `viewModel.*`
- [ ] Nenhum `useState` no `.tsx`
- [ ] Existe main hook `use{Name}ScreenNew.ts` (mesmo para tela trivial)
- [ ] `useScreenView(SCREENS.X)` chamado no main hook (1x mount)
- [ ] `loadAcquisitionNewTranslations()` chamada apenas no main hook da tela de entrada do fluxo
- [ ] Sub-tela exclusiva de outra tela está dentro do cluster correto (`Passengers/`, `Extras/`, `Fare/`, `TripDetails/`)

**Estrutura**
- [ ] `hooks/`, `components/`, `utils/`, `analytics/`, `__tests__/` presentes + barrels `index.ts`
- [ ] Nenhuma pasta `helpers/`/`domain/`/`lib/` — só `utils/`
- [ ] Sub-componente em pasta própria (não arquivo solto dentro de outro componente)
- [ ] `types.ts` na raiz da tela com route params + tipos locais; nenhum `export type/interface` inline em `.ts`/`.tsx` de implementação

**Store**
- [ ] Nome `{Name}NewStore` (sufixo `NewStore`)
- [ ] Store da tela vive em `screens/{Tela}/store/` ou no cluster dono — não no módulo-level (exceções: flag stores em `featureFlag/`)
- [ ] Selectors compostos usam `useShallow`; selectors single-field não

**SDK**
- [ ] `adapter/` é pasta (`adapter.ts` + `types.ts` + sub-funções)
- [ ] Barrel do service **não** exporta `middle`
- [ ] `types.ts` raiz com tipos de domínio (request público + adapter return)
- [ ] `middle` puro HTTP; `service` mapeia erros Sabre + chama adapter; `adapter` puro

**Testes**
- [ ] `.test.tsx` da tela tem exatamente 3 `describe` top-level (`Fluxos`, `Regras da tela`, `Tagueamento`)
- [ ] Sub-validações (Acessibilidade, Paridade legado, etc.) nested dentro de `Regras da tela`
- [ ] Tudo em `testUtils` — `.test.tsx` é só `describe`/`it` + helpers (única exceção inline: `mswServer.use(...)` one-shot)
- [ ] Sem `jest.mock` de gol-sdk/stores/hooks próprios em teste de tela (MSW + stores reais)
- [ ] Todo `.ts`/`.tsx` produtivo tem `__tests__/<base>.test.{ts,tsx}` correspondente (exceto `types.ts`/`index.ts`)

**Outros**
- [ ] Sem comentários no código (exceções: `@ts-expect-error`/`@ts-ignore`/`eslint-disable-*` com motivo curto em pt-BR)
- [ ] Uma função top-level por arquivo de implementação; helper privado em arquivo próprio (ver `one-function-per-file.md`)
- [ ] Nenhuma constante de módulo convivendo com função — toda `const` de módulo em `constants.ts` da pasta
- [ ] Translations e a11y copiadas idênticas do legacy quando é reescrita
- [ ] Feature flag única do módulo (`acquisition_qed_new`) — não criar flag por tela
