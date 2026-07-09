# Rule: Tudo em `testUtils.tsx`

## Regra

No padrão de testes do AcquisitionNew (**testes de tela E de componente**), o arquivo `.test.tsx` é minimalista: contém apenas `describe`, `it`, nomes de teste e chamadas a helpers. Toda lógica de **setup**, **interação UI**, **asserção**, **factories de dados** (`makeProps`, `makeFare`, `makeSection`, etc.), **fixtures** e o próprio **`makeSUT`** vive em `testUtils.tsx` (ou em arquivo separado importado por ele).

A regra vale para qualquer `__tests__/` dentro do módulo: tela, componente, sub-componente, hook. Toda função/factory/constante consumida pelo `.test.tsx` mora no testUtils correspondente.

## O que conta como "util de teste" (tudo vai pro `testUtils`)

Sem exceção, todos os itens abaixo moram em `testUtils.tsx` (ou arquivo importado por ele) — **nunca** soltos no `.test.tsx`:

- **Setup global** — `setupData()`, resets de store, analytics spy, route params, flags, orquestração de `beforeEach`
- **Seeds de store** — `seed{X}State(partial)` para semear Zustand
- **Ações UI** — `press*`, `fill*`, `select*`, `open*`, `close*`, `tap*` (sempre `async`)
- **Asserções** — `check*` (encapsulam `waitFor` + `expect`)
- **Mocks MSW reutilizáveis** — `mock{Endpoint}Failure(status)`, `mock{Endpoint}EmptyResponse()` (quando aparecem em ≥ 2 testes)
- **Factories de dados** — `createSelectedTrip()`, `createFareAttributes()`, builders de payload
- **Constantes de fixtures** — objetos longos consumidos por múltiplos testes (`MOCK_FLIGHTS`, `MOCK_PASSENGERS`)
- **Helpers de seletor** — `getByTestIdInside{Component}`, `queryAllErrors`

## Por quê

- O `.test.tsx` lido como prosa: "renderizar a tela, preencher o formulário, apertar buscar, conferir navegação" — sem ruído de `fireEvent`/`waitFor`/`expect` espalhados.
- Helpers no `testUtils.tsx` são reusáveis entre testes e entre os 3 describes top-level obrigatórios (Fluxos / Regras da tela / Tagueamento) — incluindo sub-describes nested em Regras da tela (Acessibilidade, Paridade legado, etc.).
- Mudanças em UI/seletor afetam **um helper**, não 30 testes.

## Como aplicar

### testUtils.tsx exporta

1. **`makeSUT()`** — render da tela
2. **`setupData()`** — função que registra `beforeEach` global (reset de store, analytics spy, route params, flags)
3. **Seeds**: `seed{X}State(partial)` para semear store
4. **Ações UI** (`async`, prefixadas por verbo): `pressSubmitButton`, `fillRoundTripForm`, `selectAirport`, `openPassengersModal`, `closeFilterModal`
5. **Asserções** (`async` quando usam `waitFor`, prefixadas por `check`): `checkNavigatedToX`, `checkErrorDrawerVisible`, `checkSearchButtonEnabled`
6. **Helpers de analytics**: `checkAnalyticsEventCalledTimes`, `checkAnalyticsEventNotCalled`, `checkAnalyticsShortcut`
7. **Mocks MSW reutilizáveis**: `mock{Endpoint}Failure(status)`, `mock{Endpoint}EmptyResponse()` — quando o mesmo override é usado em ≥2 testes
8. **Factories de dados** (objetos longos): `createSelectedTrip`, `createFareAttributes`, ou em arquivo separado

### `.test.tsx` é só leitura

```tsx
describe('Tela: {Name}ScreenNew', () => {
  setupData();

  describe('Fluxos', () => {
    it('Deve buscar voos e navegar para SelectTripScreenNew', async () => {
      makeSUT();
      await fillRoundTripForm();
      await pressSearchButton();
      await checkNavigatedToSelectTrip();
    });
  });

  describe('Regras da tela', () => {
    it('Deve manter o botão de submit desabilitado quando o formulário estiver inválido', () => { ... });

    describe('Acessibilidade', () => {
      it('Deve expor accessibilityLabel correto no botão buscar', () => { ... });
    });

    // describe('Paridade legado', () => { ... })  ← se for reescrita
  });

  describe('Tagueamento', () => {
    it('Deve disparar evento search uma única vez ao concluir a busca', async () => { ... });
  });
});
```

**Três `describe` top-level obrigatórios** em toda tela: `Fluxos`, `Regras da tela`, `Tagueamento`. Acessibilidade, Paridade legado e demais validações contextuais ficam **nested dentro de `Regras da tela`**.

### Pattern para testes de COMPONENTE (não tela)

Componentes (`{ComponentName}.tsx`) seguem a mesma regra, com estrutura mais enxuta:

```
{ComponentName}/
├── {ComponentName}.tsx
├── types.ts
├── index.ts
└── __tests__/
    ├── {ComponentName}.test.tsx   ← só describe/it + helpers
    └── testUtils.tsx               ← makeSUT, makeProps, factories, ações, asserts
```

**`testUtils.tsx` do componente exporta** (todos no mesmo arquivo, sem soltar nada no `.test.tsx`):

1. **`makeProps(overrides?)`** — factory de props do componente (com defaults). Tipada via `{ComponentName}Props` do `types.ts`. Aceita `Partial<{ComponentName}Props>`.
2. **`makeSUT(overrides?)`** — render do componente já chamando `makeProps()` por baixo. Aceita o mesmo `Partial<Props>` para sobrescrever em testes específicos.
3. **Factories auxiliares** — `makeFare(...)`, `makeSection(...)`, `makePassenger(...)`, builders de qualquer payload complexo consumido pelas props.
4. **Fixtures** — `MOCK_AIRPORTS`, `DEFAULT_BENEFITS`, etc. quando reusadas entre testes.
5. **Ações UI** (quando aplicável) — `pressX`, `fillX`, `selectX`.
6. **Asserções `check*`** (quando aplicável) — `checkVisible`, `checkCallbackFired`.
7. **Seeds de store** (quando o componente consome Zustand) — `seedXState(partial)`, `resetXStore()`.

**Estrutura mínima de describes em componente:**

```tsx
describe('Componente: {ComponentName}', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('Fluxos', () => {
    it('deve [callback/ação] ao [interação]', () => { ... });
  });

  describe('Regras', () => {
    it('deve [estado visível] quando [condição]', () => { ... });
  });
});
```

Apenas dois describes top-level no componente: `Fluxos` (interações de callback) e `Regras` (branches condicionais visuais, render, props derivadas). **Não** há `Tagueamento` em componente — eventos de analytics são responsabilidade de hooks/telas.

### Única exceção ao "tudo em testUtils"

`mswServer.use(...)` **inline** no `it()` para overrides one-shot — quando o mock só serve para aquele cenário. Se o mesmo override aparece em mais de um teste, mover para helper no testUtils.

## Anti-pattern

```tsx
it('Deve buscar voos', async () => {
  render(<SearchTripScreenNew />);
  fireEvent.press(screen.getByTestId('btn_origin'));
  fireEvent.changeText(screen.getByTestId('input_airport'), 'GRU');
  await waitFor(() => {
    expect(mockNavigation.navigate).toHaveBeenCalledWith(...);
  });
});
```

### Anti-pattern em teste de componente

```tsx
function makeProps(overrides = {}) {
  return {passenger: {...}, count: 0, onChange: jest.fn(), ...overrides};
}

function makeSUT(overrides = {}) {
  return renderScreen(<PassengerCounterCard {...makeProps(overrides)} />);
}

describe('Componente: PassengerCounterCard', () => {
  it('deve renderizar o card', () => {
    makeSUT({index: 2});
    expect(screen.getByTestId('baggage-item-2')).toBeTruthy();
  });
});
```

`makeSUT` e `makeProps` declarados no próprio `.test.tsx` violam a regra. Mover para `__tests__/testUtils.tsx` ao lado.

## Referência canônica

- `modernization/modules/AcquisitionNew/screens/SearchTripScreenNew/__tests__/testUtils.tsx` — helpers granulares de tela
- `modernization/modules/AcquisitionNew/screens/FareSelectScreenNew/__tests__/testUtils.tsx` — factories de dados pesados de tela
- `modernization/modules/AcquisitionNew/screens/Extras/Baggage/BaggageSelectPassengerScreenNew/components/PassengerCounterCard/__tests__/testUtils.tsx` — pattern de testUtils por componente (`makeProps` + `makeSUT` + factories)
