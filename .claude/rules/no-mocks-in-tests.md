# Rule: Sem mocks em testes (de tela)

## Regra

Em testes de integração de tela do AcquisitionNew, **jamais** usar `jest.mock(...)` para mockar APIs, serviços do gol-sdk ou stores Zustand. Mocks de API vão via **MSW**; estado vai via **store real seedada com `setState`**.

## Por quê

Mocks divergem da implementação real e mascaram bugs (ex: contrato mudou, mock ficou velho, teste continua passando). O padrão MSW intercepta a camada HTTP de verdade — o código rodando no teste é o mesmo que roda em produção até o socket.

## Como aplicar

### APIs → MSW

```tsx
import {mswServer} from '@Modernization/test';
import {http, HttpResponse} from 'msw';
import {ACQUISITION_API} from '@Modernization/test/mswServer/Acquisition/constants';

mswServer.use(
  http.post(ACQUISITION_API.FLIGHTS_BFF, () =>
    HttpResponse.json(flightsBffApiMockResponse),
  ),
);
```

Setup global no `.test.tsx`:

```tsx
beforeAll(() => { initModules(); mswServer.listen(); });
afterEach(() => { mswServer.resetHandlers(); jest.clearAllMocks(); });
afterAll(() => { mswServer.close(); jest.resetAllMocks(); });
```

Mocks reutilizáveis: importar de `@Modernization/test/mswServer/Acquisition/mocks/`. Quando overrides são compartilhados entre testes, criar helper em `testUtils.tsx` (ex: `mockFlightsBffFailure(500)`).

### Stores Zustand → setState

```tsx
// seed
useSearchTripNewStore.setState({originAirport: {iata: 'GRU', ...}});

// reset
useSearchTripNewStore.getState().reset();
```

Helpers no `testUtils.tsx`: `seed{X}State`, `setupData()` (registra `beforeEach` global com reset).

## Anti-pattern

```ts
// ❌ NUNCA
jest.mock('@Modernization/services/flights');
jest.mock('../../../store/SearchTripNewStore');
global.fetch = jest.fn();
```

## Exceções permitidas

A regra fala de **API, services do gol-sdk e stores Zustand do AcquisitionNew**. UI libs e libs de plataforma podem ser mockadas porque não é o objeto sob teste — é dependência de runtime que o React Native rende impraticável rodar de verdade no Jest.

Permitido `jest.mock` para:

- **Tangerina** (UI lib) — quando um componente Tangerina dificulta interação no `render()` do RTL (ex: Portal/Modal sem `testID` acessível), mockar apenas o subcomponente problemático
- **`react-i18next`** — quando o teste precisa congelar `t()` para retornar a chave ou um literal específico (caso raro; geralmente o loader de translations real basta)
- **`react-navigation`** — `mockNavigation` já é o padrão do `@Modernization/test`; usar o helper existente em vez de inventar
- **Bridges legacy isoladas em `__legacyBridge__/`** — código dentro de `__legacyBridge__/` pode mockar imports legacy (`@Acquisition/...`) porque essas pastas existem justamente como fronteira de exceção; a regra `no_legacy_code` formaliza essa convenção

Fora dessa lista, vale a regra: API → MSW, store → `setState`.

## Origem da regra

Incidente passado: mocks de API divergiram do contrato real, testes passavam mas a migração quebrou em produção. Daí: integração tem que falar HTTP de verdade — só que com MSW interceptando.
