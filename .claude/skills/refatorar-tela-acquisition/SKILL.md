---
name: refatorar-tela-acquisition
description: "Use ao refatorar/reescrever uma tela do legado para o módulo AcquisitionNew (modernization/modules/AcquisitionNew). Define a arquitetura padrão consolidada nas telas de Passengers: tela presentational consumindo um único hook (viewModel), zero regra de negócio em telas/componentes, lógica em hooks próprios + utils puros, um componente exportado por arquivo, store Zustand com seletores granulares + service hook + legacy bridge, analytics, traduções e testes (Fluxos/Regras da tela/Tagueamento). Inclui o padrão de services do SDK (modules/gol-sdk/src/services/acquisitionNew): camadas middle/adapter/error + orquestrador retornando Result<Domain, Error>. Trigger on: \"refatorar tela para AcquisitionNew\", \"reescrever tela de aquisição\", \"criar nova tela no AcquisitionNew\", \"modernizar tela seguindo o padrão de Passengers\", \"nova tela acquisition new\", \"criar service no SDK acquisitionNew\", \"nova chamada de API acquisition\"."
---

## Quando usar

Ao **reescrever uma tela do fluxo legado de aquisição** para dentro de
`modernization/modules/AcquisitionNew/`, seguindo o padrão já consolidado nas
telas de `screens/Passengers/` (PassengerSelection, PassengerForm,
SpecialNeeds, SelectSpecialNeed, ChooseSpecialNeed).

Use também para criar uma tela nova no AcquisitionNew do zero, ou para revisar
se uma tela em andamento está aderente ao padrão.

## Fonte de verdade: `.claude/rules`

Esta skill é o guia operacional do padrão; a **fonte de verdade normativa** são
as rules em `.claude/rules/`. Onde houver dúvida, a rule vence. Mapa:

- `architecture-acquisition-new.md` — camadas, estrutura de pastas, clusters, checklist de PR.
- `presentation-layer-only.md` — `.tsx` só renderiza; lógica no hook.
- `types-in-types-ts.md` — todo tipo exportado vive em `types.ts`.
- `no-comments.md` — código sem comentários (exceções estritas).
- `testutils-centralization.md` — tudo em `testUtils.tsx`; `.test.tsx` só `describe`/`it`.
- `no-mocks-in-tests.md` — API via MSW, store real via `setState`; nunca `jest.mock` de API/gol-sdk/store.
- `sdk-service-3-layers.md` — middle (HTTP) / service (erro + orquestra) / adapter (transformação pura).
- `no-legacy-code.md` — não importar/reusar legado; fronteira isolada em `__legacyBridge__/`.
- `rewrite-extract-rules-not-implementation.md` — extrair regra, não implementação/nomes/pastas do legado.
- `translations-from-legacy.md` e `a11y-from-legacy.md` — únicas cópias literais do legado (chaves i18n + props a11y).
- `qed-acquisition-flag.md` — flag única do módulo (`acquisition_qed_new`).
- `stopover-acquisition-new.md` — decisões fechadas de stopover (endpoint, storefront, flag própria).

## Quando NÃO usar

- Ajustar tela legada sem modernizar → editar direto, sem essa skill.
- Apenas escrever testes de uma tela já pronta → `create-tests` / `unit-tests`.
- Apenas checar tipos → `typecheck-acquisition`.
- Validar no simulador → `executar-maestro`.

## Princípios inegociáveis

1. **Paridade com o legado — mas só a REGRA, não a implementação.** A tela
   modernizada espelha exatamente o **comportamento** do legado (dados, labels,
   validações, drawers, navegações, eventos). Não inventar estados ou fluxos que
   não existem no original. Porém **nomes, pastas, camadas, tipos e libs do
   legado são descartados** — a implementação nova nasce da arquitetura do
   módulo, não do código antigo. Únicas cópias literais: **translations** e
   **a11y** (ver `translations-from-legacy.md` e `a11y-from-legacy.md`). Detalhe
   em `rewrite-extract-rules-not-implementation.md`.
2. **Tela e componente são presentational.** Zero regra de negócio em arquivos
   `.tsx`. Nada de `if` de domínio, cálculo, fetch, formatação, navegação
   condicional ou montagem de payload dentro do JSX. A tela só lê de um
   `viewModel` e renderiza. (ver `presentation-layer-only.md`)
3. **Toda lógica mora em hook próprio + funções puras em `utils/`.** O hook
   orquestra; os arquivos em `utils/` fazem as transformações puras e testáveis.
   Funções auxiliares vão **SEMPRE em `utils/`** — nunca `helpers/`, `domain/`,
   `lib/` nem qualquer outro nome (ver `architecture-acquisition-new.md`).
4. **Um componente exportado por arquivo.** Cada componente tem seu próprio
   arquivo, com `types.ts`, `index.ts` e (quando tem estado/efeito) um hook
   irmão `use<Componente>.ts`. Não empilhar dois componentes exportados no
   mesmo arquivo.
5. **Effects nomeados em closure.** A função do `useEffect`/`useFocusEffect` é
   extraída para uma função nomeada dentro da closure do hook; o effect apenas
   a chama. (ver exemplo em `useSecureFlightDrawer.ts`)
6. **Tipos exportados em `types.ts`.** Toda `type`/`interface`/`enum` **exportado**
   vive no `types.ts` do diretório — nunca inline num arquivo de implementação
   (`.tsx`/`.ts`). Preferir `type` a `interface` no módulo (composição por
   interseção `A & B`, não `extends`). Constantes de runtime (mapas, `Record`,
   listas) vão em `constants.ts`, não em `types.ts`. Exceções fechadas na seção
   4 e em `types-in-types-ts.md` (tipo interno não exportado; `ReturnType<typeof useX>`).
7. **Código sem comentários.** Não escrever `//`, `/* */` nem JSDoc — nomes
   descritivos substituem a explicação. Se um trecho "precisa" de comentário,
   refatore (extraia função nomeada, renomeie). **Exceções estritas (e somente
   estas):** `@ts-expect-error <motivo pt-BR>`, `@ts-ignore <motivo pt-BR>`
   (preferir `@ts-expect-error`), `eslint-disable-next-line <regra> <motivo pt-BR>`
   e pragmas obrigatórios do framework. Ao remover comentários em massa, use o
   parser do TS (não regex sobre texto, que corrompe strings/regex como
   `/^[\p{L}'.-]+$/u`). (ver `no-comments.md`)
8. **Uma função por arquivo + constantes fora do arquivo da função.** Cada
   arquivo de implementação tem **no máximo uma função top-level** (declarada ou
   const-arrow) — helpers privados, componentes e hooks cada um em seu próprio
   arquivo. NÃO contam: callbacks/arrows inline dentro de outra função e métodos
   dentro de objeto literal. **Nenhuma constante de módulo** convive com uma
   função: `styles` (de `StyleSheet.create`) vai em `styles.ts`; demais consts
   (mapas, listas, magic values, atalhos `I18N`) em `constants.ts`. Um arquivo
   só-de-consts (sem função) é permitido. **Hooks só em arquivos `use<Nome>.ts(x)`**.
   **Exceções (padrões das seções 5 e 10):** o arquivo de **store**
   (`<Nome>Store.ts` — `create` + seletores granulares + `use<Store>Service` +
   `INITIAL_STATE` juntos) e o **`adapter/adapter.ts`** do SDK (objeto `adapter`
   + funções `to*` puras juntas) mantêm múltiplas funções/consts por design.
   Formalizada como rule sempre-carregada em `.claude/rules/one-function-per-file.md`.

---

## Anatomia de uma tela (estrutura de pastas)

Cada tela é uma pasta `NomeDaTelaScreenNew/` dentro de uma família/cluster
(`screens/Passengers/`, `screens/Fare/`, `screens/Extras/`, `screens/TripDetails/`):

```
NomeDaTelaScreenNew/
├── NomeDaTelaScreenNew.tsx        # componente da tela (presentational)
├── index.ts                       # barrel: exporta a tela + tipo de rota
├── types.ts                       # ViewModel, params de rota, tipos de item de lista
├── hooks/
│   ├── index.ts                   # re-exporta o hook principal
│   └── useNomeDaTelaScreenNew/    # hook principal em pasta quando tem sub-hooks/utils
│       ├── useNomeDaTelaScreenNew.ts
│       ├── types.ts               # tipos internos do hook
│       ├── useSubHookX.ts         # sub-hooks focados (flat dentro de hooks/ ou da pasta do hook)
│       ├── utils/                 # transformações puras (1 função por arquivo)
│       └── __tests__/
├── components/
│   └── NomeComponente/
│       ├── NomeComponente.tsx     # 1 componente exportado
│       ├── useNomeComponente.ts   # hook do componente (se tiver estado/efeito)
│       ├── types.ts               # Props + Params/Result do hook
│       ├── index.ts
│       └── __tests__/
├── analytics/                     # constants.ts (SCREENS/LOG as const) + useLog* + index.ts
│   ├── constants.ts
│   ├── types.ts
│   ├── useLog*.ts
│   └── index.ts
├── translations/                  # en/es/pt-BR (+ fr) .json + expectedTranslations + __tests__
│   ├── en.json, es.json, pt-BR.json, fr-FR.json
│   ├── expectedTranslations.ts
│   └── __tests__/translations.test.ts
├── utils/                         # funções puras da tela (1 função por arquivo) + __tests__
└── __tests__/
    ├── NomeDaTelaScreenNew.test.tsx
    └── testUtils.tsx              # harness: makeSUT, setupData, helpers, checks
```

Regra de promoção: hook simples (sem sub-hooks) pode ser um único arquivo
`hooks/useNomeDaTelaScreenNew.ts`. Quando ganhar sub-hooks ou funções em
`utils/`, promova para a pasta `hooks/useNomeDaTelaScreenNew/`.

Cluster: sub-tela alcançada **exclusivamente** a partir de outra tela do módulo
mora dentro do cluster correspondente (`Passengers/`, `Extras/`, `Fare/`,
`TripDetails/`), nunca solta na raiz de `screens/`. Artefatos compartilhados por
uma família (quando fazem sentido) ficam um nível acima das telas
(`Passengers/store/`, `Passengers/utils/`), mas **`translations/` e `analytics/`
são por-tela** (ver seções 6 e 7).

---

## 1. A tela (`.tsx`) — só renderiza

```tsx
export const NomeDaTelaScreenNew = () => {
  const viewModel = useNomeDaTelaScreenNew();

  if (viewModel.isLoading) {
    return <NomeDaTelaLoader testID="nome_da_tela_loader" />;
  }

  const renderItem = ({item}: {item: AlgumItem}) => (
    <TgrListSelect ... onPress={() => viewModel.onPressOption(item)} />
  );

  return (
    <>
      <NewFlowFlag />
      <TemplateScreen
        header={{
          title: viewModel.title,
          canGoBack: true,
          onClosePress: viewModel.onClose,
          size: 'compact',
        }}
        scroll="none"
        footer={
          <TemplateFooter>
            <TgrButtonPrimary
              testID="btn_continue_..."
              label={viewModel.continueLabel}
              accessibilityLabel={viewModel.continueAccessibilityLabel}
              disabled={viewModel.isContinueDisabled}
              onPress={viewModel.onContinue}
              blocked
            />
          </TemplateFooter>
        }
        fsClass="fs-unmask"
      >
        <TemplateContent paddingTop="s3x">
          ...conteúdo lendo de viewModel...
        </TemplateContent>
      </TemplateScreen>
    </>
  );
};

export default NomeDaTelaScreenNew;
```

Regras da tela:

- Primeira linha do corpo: `const viewModel = useNomeDaTelaScreenNew();`. **Sem
  desestruturar, sem renomear** (`vm`/`data` proibidos). **Tudo** vem do
  `viewModel` — labels já traduzidos, dados, flags (`isXDisabled`), handlers
  (`onX`). A tela nunca chama `useTranslation`, `useNavigation`, store ou SDK.
- **Nenhum `useState` no `.tsx`** — estado de UI (modal aberto, toggle, drawer)
  vive no main hook, exposto via `viewModel.isXOpen` + `viewModel.openX/closeX`.
- Sempre envelopar em `<NewFlowFlag />` + `<TemplateScreen>` com
  `<TemplateContent>` e `<TemplateFooter>` (de `@Modernization/components`).
- Componentes visuais vêm de `@gol-smiles/tangerina-react-native-core` (`Tgr*`)
  e de `@Modernization/components` (`GolBox`, `Template*`). Sem `styles.ts`:
  layout via props do `GolBox` (`gap="s2x"`, `marginTop="s2x"`) e das Tangerinas.
- **Loading é a única lógica inline tolerada:** `if (viewModel.isLoading) return <Loader/>;`
  antes do JSX principal. Nada de montar/transformar dados do skeleton no `.tsx`.
- Drawers/modais ficam no fim do JSX, abertos por flags do viewModel
  (`viewModel.xDrawer.isOpen`) e fechados por handlers do viewModel.
- `renderItem` inline é permitido (é view), mas o `onPress` só delega para
  `viewModel.onX(item)` — nenhuma decisão dentro dele.
- `export const` nomeado **e** `export default` no fim (a navegação consome o
  default; o barrel reexporta o nomeado).
- **Nada de lógica no `.tsx`.** Um `if` que não é puramente renderização de UI
  pertence ao hook — exponha uma flag/valor no viewModel.

---

## 2. O hook principal — orquestra e devolve um ViewModel achatado

```ts
export const useNomeDaTelaScreenNew = (): NomeDaTelaScreenViewModel => {
  useScreenView(SCREENS.NOME_DA_TELA);

  const {t} = useTranslation();
  const {params} = useRoute<RouteProp<{params: Params}, 'params'>>();
  const navigation = useNavigation<NomeNavigation>();

  const {algo} = useAlgumaCoisaState();

  const [isDrawerOpen, setIsDrawerOpen] = useState(false);
  const items = useMemo(() => buildItems(algo), [algo]);
  const isDisabled = useMemo(() => isFormInvalid(algo), [algo]);

  const onContinue = useCallback(() => { ... }, [deps]);
  const onClose = useCallback(() => closeFlow(navigation), [navigation]);

  return {
    title: t('AcquisitionNew.NomeDaTela.Title'),
    continueLabel: t('AcquisitionNew.NomeDaTela.Continue'),
    items,
    isContinueDisabled: isDisabled,
    isDrawerOpen,
    openDrawer: () => setIsDrawerOpen(true),
    closeDrawer: () => setIsDrawerOpen(false),
    onContinue,
    onClose,
  };
};
```

Regras do hook:

- **Assinatura tipada com o ViewModel:** `(): NomeDaTelaScreenViewModel`. O
  ViewModel é o contrato entre hook e tela (definido em `types.ts`).
- Chama `useScreenView(SCREENS.X)` no topo (1× no mount). Devolve um **objeto
  plano**: strings já traduzidas, dados de lista prontos, flags booleanas e
  handlers `on*`. A tela não deveria precisar derivar nada — **nem JSX**.
- `useTranslation`, `useRoute`, `useNavigation`, stores e SDK são consumidos
  **aqui**, nunca na tela.
- **Estado de UI (`useState`) vive aqui**, não no `.tsx`. Estado de domínio
  compartilhado entre telas → store Zustand.
- Toda transformação não-trivial vira função pura em `utils/` (`buildOptionItems`,
  `collectCategoriesSubmission`, `buildSegmentDetails`) e o hook só a invoca
  dentro de `useMemo`. Funções em `utils/` não conhecem React.
- Handlers em `useCallback` com deps corretas; derivados em `useMemo`.
- **Sub-hooks** quando o hook cresce: cada um foca uma responsabilidade
  (`useDrawersController`, `useDocumentsFlow`, `usePersonalForm`) e recebe por
  parâmetro só o que precisa. O hook principal os compõe e mescla os retornos no
  ViewModel. Veja `usePassengerFormScreenNew.ts`.
- Effects: extrair a lógica para função nomeada na closure e o `useEffect` só
  chamá-la (padrão `resetSecureFlightStateOnOpen` em `useSecureFlightDrawer.ts`).
- `loadAcquisitionNewTranslations()` é chamada **uma única vez no fluxo**, no
  main hook da tela de entrada (`useSearchTripScreenNew`) — não repetir nas demais.
- `hooks/index.ts` re-exporta o hook principal:
  `export {useNomeDaTelaScreenNew} from './useNomeDaTelaScreenNew/useNomeDaTelaScreenNew';`

---

## 3. Componentes (drawers, sub-views) — um por arquivo, com hook irmão

Cada componente vive na própria pasta. O `.tsx` é presentational; estado/efeito
vão no hook irmão `use<Componente>.ts`; os tipos no `types.ts`. Componente
puramente apresentacional (só props → JSX) **não** precisa de hook.

```tsx
// SecureFlightDrawer.tsx
export const SecureFlightDrawer = ({isOpen, onClose, onConfirm}: SecureFlightDrawerProps) => {
  const {number, error, handleChange} = useSecureFlightDrawer({isOpen, secureFlightNumber});
  return (<TgrSuperDrawer opened={isOpen} onClose={onClose}> ... </TgrSuperDrawer>);
};
```

```ts
// types.ts  — Props do componente + Params/Result do hook
export type SecureFlightDrawerProps = {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: (n: string) => void;
};
export type UseSecureFlightDrawerParams = {isOpen: boolean; secureFlightNumber?: string};
export type UseSecureFlightDrawerResult = {number: string; error: string; handleChange: (v: string) => void};
```

```ts
// index.ts
export * from './SecureFlightDrawer';
export type * from './types';
```

Regras de componente:

- **Um componente exportado por arquivo.** Nada de `export` duplicado de
  componentes no mesmo arquivo.
- Recebe dados e callbacks via props; não acessa store/SDK/navigation direto —
  quem injeta é o hook da tela. (Formulários recebem `control`/`setValue` do
  react-hook-form e callbacks `on*` já prontos — ver `PassengerPersonalForm.tsx`.)
- Estado/efeito/derivação do componente → `use<Componente>.ts` irmão (nunca
  regra de negócio no `.tsx` — ver `presentation-layer-only.md`).
- `index.ts` exporta o componente nomeado + os tipos.

---

## 4. Tipos (`types.ts`)

- **Todo tipo exportado mora em `types.ts` — nunca inline na implementação.** Um
  `type X = {...}` declarado dentro de um `.tsx`/`.ts` de implementação
  (adapter, middle, hook, componente, store) deve ser movido para o `types.ts`
  do mesmo diretório; o arquivo passa a importá-lo. Vale para `type`, `interface`
  e `enum`. (ver `types-in-types-ts.md`)
- **Preferir `type` a `interface`.** Composição via interseção (`A & B`), não
  `extends`: `type PaymentFormStore = PaymentFormStoreState & PaymentFormStoreActions;`.
- **Exceção — tipos derivados de um VALOR local via `typeof` ficam co-locados.**
  `z.infer<ReturnType<typeof buildSchema>>`, `ReturnType<typeof useX>` e similares
  permanecem no arquivo que define a função/valor de origem (mover criaria import
  circular). Tipos derivados de outros **tipos** (`Omit`, `Pick`) podem ser movidos.
- **Constantes de runtime não são tipos → `constants.ts`.** Um
  `const cardTypes: Record<string, string> = {...}` vai para `constants.ts`; o
  `types.ts` contém só declarações de tipo.
- Define o **ViewModel** da tela: `type NomeDaTelaScreenViewModel = { ...campos e handlers... }`.
- Define o tipo de **item de lista** consumido pelo `renderItem` (já no formato
  de view, com `testID`, `label`, `index`, e opcionalmente `raw`).
- Define os **params de rota** (`...Params`) e o tipo de rota exportado
  (`NomeDaTelaScreenNewRoute`) reexportado no `index.ts` da tela.
- Hooks de componente declaram `...Params` e `...Result`.

---

## 5. Store (Zustand) — seletores granulares + service hook + legacy bridge

Padrão em `Passengers/store/<NomeStore>/` (ou no cluster dono; nunca no
módulo-level, salvo flag stores):

```ts
export const useNomeNewStore = create<NomeStore>()(persist(set => ({
  ...INITIAL_STATE,
  setX: value => set({x: value}),
}), {name: 'nome-new-store'}));

export const useXByPassenger = (i: number) => useNomeNewStore(s => s.byPassenger[i]?.x);

export const useNomeStoreService = (): Omit<NomeStore, keyof NomeStoreState> => {
  const setX = useNomeNewStore(s => s.setX);
  return {setX};
};
```

Regras:

- Nome com sufixo `NewStore` (`SpecialNeedsNewStore`). Estado e ações tipados em
  `types.ts`; `INITIAL_STATE` + `buildInitialState()` exportados (testes resetam
  com isso).
- **Leitura** via seletores granulares (`useXByPassenger`) para minimizar
  re-render; **selector composto (múltiplos campos) usa `useShallow`**,
  single-field não. **Escrita** via `useNomeStoreService()` (só ações).
- `index.ts` reexporta seletores, service e tipos.
- Integração com Redux/estado legado fica em `use*LegacyBridge.ts` separado
  (`useShoppingCartLegacyBridge`) — fronteira com o legado, isolada dos hooks de
  tela. Código que ainda importa de `@Acquisition/...` mora em `__legacyBridge__/`
  (ver `no-legacy-code.md`).

---

## 6. Analytics

- Pasta `analytics/` **por tela** com `constants.ts` (`SCREENS` e `LOG` como
  `as const`), `types.ts`, hooks `useLog*` / `use*AnalyticsParams` e `index.ts`.
- O main hook chama `useScreenView(SCREENS.X)` no topo (1× no mount). Eventos de
  ação disparam via `useLog*` com **fingerprint via `useRef`** (evita disparo
  duplicado). Params montados em `use*AnalyticsParams` (memoizado), reusando
  `useBaseAnalyticsParams`; helpers puros em `analytics/utils/`.
- **Nenhuma chamada de analytics dentro do `.tsx`.** O disparo é
  responsabilidade de hook/tela — nunca de componente puro.

---

## 7. Traduções

- Subpasta `translations/` **dentro de cada tela** com `en.json`, `es.json`,
  `pt-BR.json` (e `fr-FR.json` — francês registrado sob `fr`), além de
  `expectedTranslations.ts` e `__tests__/translations.test.ts` (consistência +
  conteúdo) próprios.
- Namespace `AcquisitionNew.<NomeDaTela>.<Chave>`; subnamespace `A11y` para
  labels de acessibilidade. Sempre via `t(...)` no hook (nunca string fixa de UI
  no componente); as strings entram no ViewModel já traduzidas.
- Registrar via `loadAcquisitionNewTranslations()` no `translations/index.ts`
  módulo-level, que importa de cada `translations/` co-localizada. A função é
  chamada **uma única vez no fluxo**, no main hook da tela de entrada
  (`useSearchTripScreenNew`).
- **Reescrita copia chaves e textos idênticos do legado** nos 3+ idiomas — não
  inventar chaves nem reescrever textos (ver `translations-from-legacy.md`).

---

## 8. Convenções de nomes, testID e a11y

- Telas, hooks e stores levam sufixo `New` (`PassengerFormScreenNew`,
  `useChooseSpecialNeedScreenNew`, `SpecialNeedsNewStore`).
- `testID` por prefixo de tipo: `btn_*` (botões), `chk_*` (check/radio),
  `inpt_*` (inputs), e `*-drawer` / `*-form` para containers.
- **A11y é copiada idêntica do legado** (`accessibilityLabel`,
  `accessibilityHint`, `accessibilityRole`, `accessibilityState`, `testID`) —
  não inventar rótulos/dicas/roles/testIDs. Vem do viewModel. (ver
  `a11y-from-legacy.md`)

---

## 9. Testes (segue `create-tests` + `unit-tests`)

Duas camadas, ambas obrigatórias.

### Teste de tela — `__tests__/<Tela>.test.tsx` + `testUtils.tsx`

Toda a fiação (harness, mocks de infra, MSW, helpers, checks, factories) mora em
`testUtils.tsx`; o `.test.tsx` só contém `describe`/`it` legíveis (ver
`testutils-centralization.md`).

**Três `describe` top-level obrigatórios, nesta ordem e nomenclatura exatas:**
`Fluxos`, `Regras da tela`, `Tagueamento`. Acessibilidade, paridade com legado e
demais validações contextuais ficam como **sub-describes nested dentro de
`Regras da tela`**. Mesmo que algum venha vazio temporariamente, deixar o
`describe` presente.

```tsx
describe('Tela: NomeDaTelaScreenNew', () => {
  setupData();

  describe('Fluxos', () => {
    it('deve buscar e navegar ...', async () => { makeSUT(); await pressContinue(); await checkNavigatedToX(); });
  });

  describe('Regras da tela', () => {
    describe('Footer', () => { it('deve manter Continuar desabilitado ...', () => { ... }); });
    describe('Acessibilidade', () => { it('deve expor accessibilityLabel ...', () => { ... }); });
    describe('Paridade legado', () => { it('deve espelhar ...', () => { ... }); });
  });

  describe('Tagueamento', () => {
    it('deve disparar o evento X uma única vez ...', async () => { ... });
  });
});
```

`testUtils.tsx` expõe: `makeSUT` (`renderScreen(<Tela/>)`), `setupData`
(`beforeEach` com reset de store + mocks de **infra**: `useNavigation`,
`useRoute`, analytics spy), `flushAsync`, seeds de store (`seed{X}State`),
helpers de ação (`async` `press*`/`fill*`/`select*`) e checks (`async` `check*`
encapsulando `waitFor` + `expect`). Render vem de
`@Modernization/test/test-utils`; utilitários de `@testing-library/react-native`.

**Infra de dados (regra `no-mocks-in-tests.md`):**

- **API → MSW.** Nunca `jest.mock` de API/gol-sdk. Mocks reutilizáveis de
  `@Modernization/test/mswServer/Acquisition/mocks/`; overrides compartilhados
  viram helper no `testUtils` (`mockFlightsBffFailure(500)`). Única exceção
  inline no `it()`: `mswServer.use(...)` one-shot para um cenário único.
- **Store → real, seedada com `setState`.** Nunca `jest.mock` de store Zustand.
- Mockável: `react-navigation` (helper `mockNavigation`), UI libs (Tangerina)
  quando o `render` do RTL fica impraticável, `react-i18next` (raro), e imports
  legacy **apenas dentro de `__legacyBridge__/`**.

### Teste do hook — `hooks/__tests__/<hook>.test.ts`

`renderHook` **de `@testing-library/react-native`** (NÃO de
`@testing-library/react-hooks`, deprecado). Mocka só infra
(`useNavigation`/`useRoute`); store real; valida o ViewModel retornado e os
efeitos das ações (`act(() => result.current.onX())`).

### Teste por função extraída — um `.test` por arquivo de função

Cada função vive em seu próprio arquivo (princípio 8), então **cada arquivo de
função tem seu próprio teste dedicado** em `__tests__/` ao lado — não basta
cobertura indireta pelo consumidor. Vale para todo helper puro
(`sanitizeCardNumber`, `getBin`, validadores do schema...), cada hook extraído e
cada componente. Funções puras cobrem casos de borda (vazio/undefined, limites,
ramos); o teste do consumidor continua existindo para o fluxo.

Regras de teste (do `create-tests`): testar **comportamento, não implementação**;
strings literais nos `expect` (sem regex); store real (`getState().setX`);
mockar só infraestrutura; helpers como linguagem de domínio.

---

## 10. Services do SDK (`modules/gol-sdk/src/services/acquisitionNew/`)

Quando a tela precisa de uma **nova chamada de API**, ela NÃO faz fetch. Cria-se
um service no SDK em três camadas de responsabilidade estrita (um folder por
endpoint: `getShoppingCart`, `saveBookingPassengers`, `getSearchTrips`...). Cada
camada tem `index.ts`, `types.ts` e `__tests__/`. (ver `sdk-service-3-layers.md`)

```
<serviceName>/                      # verbo + recurso, camelCase (getShoppingCart)
├── <serviceName>.ts                # SERVICE/ORQUESTRADOR: decide todo erro de domínio
├── index.ts                        # barrel: função + Error + tipos públicos (NUNCA middle)
├── types.ts                        # tipos de domínio: request público + AdapterResponse
├── middle/                         # HTTP puro
│   ├── <serviceName>Middle.ts
│   ├── types.ts                    # request/response brutos da API
│   └── index.ts
├── adapter/                        # SEMPRE pasta — transformação PURA
│   ├── adapter.ts                  # sem await, sem efeito, SEM failure/Result de erro
│   ├── types.ts                    # AdapterResponse + tipos auxiliares
│   ├── constants.ts                # mapas/lookups de runtime (opcional)
│   └── index.ts
└── error/                          # erro tipado
    ├── error.ts                    # class <Serviço>Error extends Error
    ├── errorMapper.ts              # HttpError(status) → ErrorType (quando há mapeamento)
    ├── types.ts                    # union de literais: ErrorType
    └── index.ts
```

**Contrato de retorno:** todo service público devolve
`Promise<Result<AdapterResponse, ServiceError>>`. `Result`/`success`/`failure`
vêm de `../../../utils`. Nunca lançar para o consumidor — erros viram `failure`.

### Camada `middle/` — HTTP puro

Faz `middleRequest<Response>(module, {method, path, params, data})`, atualiza
`setSession` quando aplicável, captura `HttpError` e devolve
`Result<MiddleResponse, HttpError>`. **Não transforma dados, não trata erro de
domínio.**

```ts
export const getShoppingCartMiddle = async ():
  Promise<Result<GetShoppingCartMiddleResponse, HttpError>> => {
  try {
    const response = await middleRequest<GetShoppingCartMiddleResponse>('booking', {
      method: 'GET',
      path: '/...',
      params: {flow: 'Issue', context: 'B2C'},
    });
    setSession('booking', response.session);
    return success(response.data);
  } catch (error) {
    if (isHttpError(error)) return failure(error);
    throw error;
  }
};
```

Tipos brutos da API (request + response) em `middle/types.ts`. Normalização do
**request** mora aqui, como funções puras privadas.

### Camada `adapter/` — transformação PURA (nunca `failure`)

- `toXEntity(middleResponse): XAdapterResponse` — **determinístico, sem `await`,
  sem efeito, sem `failure`/`Result` de erro**. Assume que o service já validou e
  desbloqueou o fluxo; devolve o `AdapterResponse` (formato consumido pela tela)
  **diretamente**.
- Aplica defaults (`?? 0`, `?? 'BRL'`) e delega para sub-funções co-localizadas
  (`getItinerary`, `getPassengers`) quando útil.
- Quando precisa de uma **decisão de bloqueio/elegibilidade**, expõe um util puro
  que devolve a decisão (`getCheckInBlock(...) → Block | null`) — quem transforma
  isso em `failure` é o **service**, nunca o adapter.
- Exporta objeto `adapter = {toXEntity}` (+ a função nomeada, para testes).
- **Nenhum tipo/constante inline** no `adapter.ts` — tipos auxiliares em
  `adapter/types.ts`, mapas de runtime em `adapter/constants.ts`.

### Camada `error/` — erro tipado

- `XErrorType` = union de string literals (`'unknown' | 'unauthorized' | 'not_found'`).
- `class XError extends Error { type: XErrorType }`.
- `errorMapper.ts`: `mapHttpToErrorType(HttpError): XErrorType` por `status`
  (401/403 → `unauthorized`, 404 → `not_found`, resto → `unknown`). Só existe
  quando o service distingue erros; services simples usam só `'unknown'`.

### Service/Orquestrador `<serviceName>.ts` — decide TODO erro de domínio

Consome o middle, mapeia `HttpError`/erro Sabre para a classe própria, **decide
todo bloqueio/erro de domínio**, chama o adapter puro e **envolve o retorno em
`success(...)`**.

```ts
export const getShoppingCart = async (): Promise<
  Result<GetShoppingCartAdapterResponse, GetShoppingCartError>
> => {
  try {
    const middleResult = await getShoppingCartMiddle();
    if (middleResult.kind === 'failure') {
      return failure(new GetShoppingCartError(mapHttpToErrorType(middleResult.error)));
    }

    const block = getCheckInBlock(middleResult.value);
    if (block) {
      return failure(new GetShoppingCartError('blocked'));
    }

    return success(adapter.toShoppingCartEntity(middleResult.value));
  } catch (error) {
    return failure(new GetShoppingCartError('unknown'));
  }
};
```

Services com body recebem `params` tipados e repassam ao middle; quando não há
domínio a montar, o adapter é identidade (`toBookingResponse(x) => x`) e o
service ainda envolve em `success(...)`.

### Barrels

- `<serviceName>/index.ts`: exporta **só** a função, a classe de Error e os
  tipos públicos (`AdapterResponse`). **Nunca** exporta `middle` (nem `*Middle`,
  nem `*MiddleRequest`/`*MiddleResponse`).
- `types.ts` raiz contém os **tipos de domínio** (request público + `AdapterResponse`)
  — não reexporta tipos do middle. Se um tipo do middle "vaza" para fora, é sinal
  de modelagem errada: expor um tipo já adaptado no `types.ts` raiz.
- O `acquisitionNew/index.ts` agrega os services (`export * from './...'`, com
  reexports nomeados quando há colisão).

### Consumo pela tela (liga as duas metades)

O hook da tela (ou wrapper `use<Service>`) chama a função e ramifica no `kind`;
a tela continua só lendo o viewModel:

```ts
const result = await getShoppingCart();
if (result.kind === 'success') {
  setCart(result.value);
} else {
  handleError(result.error.type);
}
```

### Testes de service (uma suíte por camada)

- **Service/Orquestrador**: `jest.mock('../middle')` e cobre cada ramo —
  `success` → domínio; cada bloqueio de domínio → `failure`; cada `errorType` via
  `buildHttpError(status)`; `mockRejectedValue` → `'unknown'`. Asserts via
  `result.kind` + narrowing.
- **Adapter**: testado puro com fixtures (`SUCCESS_RESPONSE`), incluindo defaults.
  Como o adapter não retorna `failure`, não há ramo de erro para testar aqui —
  os utils de decisão (`getCheckInBlock`) têm teste próprio.
- **Middle**: mocka `middleRequest`; verifica path/params/data e o mapeamento
  success/failure.
- Fixtures e `buildHttpError`/`SUCCESS_RESPONSE` ficam em `__tests__/testUtils`.
- Validar tipos com `typecheck-acquisition` (cobre o escopo do SDK `acquisitionNew`).

### Stopover (exceção com regras próprias)

Ver `stopover-acquisition-new.md`: endpoint próprio `/flights/search-stopover`
(service próprio, não estender `/flights`), storefront `purchase_b2c_stopover`,
apenas `roundTrip`/`oneWay`, flag `useStopoverFlag`, estado no `SearchTripNewStore`.

---

## Feature flag do módulo

O módulo inteiro é gated por **uma única flag** `acquisition_qed_new`
(`useQedAcquisitionFlag`). Telas/hooks/components **dentro** do AcquisitionNew
assumem a flag ativa — **não checar de novo dentro**, não criar flag por tela.
Exceções pontuais (`useStopoverFlag`, `useAcquisitionBannerFlag`) só para rollout
interno a uma tela. (ver `qed-acquisition-flag.md`)

---

## Procedimento de refatoração (passo a passo)

1. **Mapear o legado — extrair a REGRA, não a implementação.** Ler a tela legada;
   listar dados, labels, validações, drawers, navegações e eventos. Descartar
   nomes, pastas, camadas e tipos do legado. Copiar literal só translations e a11y.
2. **Criar a pasta** `NomeDaTelaScreenNew/` com o esqueleto (tela, `index.ts`,
   `types.ts`, `hooks/`, `analytics/`, `translations/`, `utils/`, `__tests__/`).
3. **Definir o ViewModel** em `types.ts` (campos + handlers que a tela precisa).
4. **Escrever o hook** `useNomeDaTelaScreenNew` consumindo store/SDK/legacy
   bridge, montando o ViewModel; extrair transformações para `utils/` e
   responsabilidades grandes para sub-hooks. Se faltar API, criar o service no
   SDK antes (seção 10) e consumir via `result.kind`.
5. **Escrever a tela** presentational lendo só do viewModel (`NewFlowFlag` +
   `TemplateScreen`), com loading como única lógica inline.
6. **Extrair componentes** (drawers/sub-views) — um por arquivo, com hook irmão,
   `types.ts` e `index.ts`.
7. **Store/analytics/traduções** conforme necessário (seletores granulares +
   service + `useShallow` em compostos; `SCREENS`/`LOG` `as const`; chaves
   `AcquisitionNew.<Tela>.*` copiadas do legado).
8. **Testes**: hook + tela (`testUtils.tsx` + Fluxos/Regras da tela/Tagueamento)
   com MSW + store real, seguindo `create-tests`/`unit-tests`.
9. **Validar**: rodar `typecheck-acquisition` (zero erros) e os testes;
   opcionalmente `executar-maestro` para validar no simulador.
10. **Commit** só quando o usuário pedir explicitamente.

## Skills relacionadas

- `create-tests` / `unit-tests` — padrão de teste (obrigatório).
- `typecheck-acquisition` — checar tipos no escopo da reescrita.
- `executar-maestro` — validar o fluxo no simulador.
- `executar-review` / `task-review` — revisão antes do merge.

## Referências canônicas no código

- Tela + hook simples: `Passengers/SelectSpecialNeedsScreenNew/`
- Tela + hook com sub-hooks/utils: `Passengers/ChooseSpecialNeedScreenNew/`
- Orquestração complexa (vários sub-hooks + drawers + forms):
  `Passengers/PassengerFormScreenNew/`
- Componente com hook irmão + named effect:
  `Passengers/PassengerFormScreenNew/components/SecureFlightDrawer/`
- Store Zustand: `Passengers/store/SpecialNeedsNewStore/`
- Analytics (constants `as const` + useLog*): `SelectTripScreenNew/analytics/`
- Traduções por-tela: `SelectTripScreenNew/translations/`
- Harness de teste com MSW: `Fare/FareSelectScreenNew/__tests__/testUtils.tsx`
- Service SDK (adapter puro + service decide erro): `sdk-service-3-layers.md` +
  `gol-sdk/src/services/acquisition/postScorePurchaseAcquisition/`
- Tipo `Result`/`success`/`failure`: `gol-sdk/src/utils/result/result.ts`
