# Skill: Criar Testes

**Quando usar:** Ao escrever ou complementar testes para screens, hooks, stores, componentes e funções.

**Princípio central:** Teste o comportamento, não a implementação.
Isso significa simular interações reais do usuário e validar o que o sistema entrega — nunca mockar lógica interna nem acoplar a detalhes de implementação.

---

## O que fazemos vs. o que evitamos

| ✅ Fazemos                                             | 🚫 Evitamos                                                |
| ------------------------------------------------------ | ---------------------------------------------------------- |
| Simular interações reais (toque, seleção, confirmação) | Mockar lógica interna                                      |
| Validar UI, navegação e estado                         | Acoplar a detalhes de implementação                        |
| Usar store real (Zustand)                              | `jest.mock(...)` excessivo                                 |
| Usar MSW como backend simulado                         | Mockar chamadas HTTP manualmente                           |
| Helpers como linguagem de domínio                      | `fireEvent/waitFor/getByTestId` direto nos testes          |
| Testar resultado (não processo)                        | `expect(useHook).toHaveBeenCalled()`                       |
|                                                        | Mocar components `jest.mock('@Modernization/StickyHeader'` |
|                                                        | Mocar components que venham da lib tangerina               |
| `useStore.getState().setX(value)`                      | `jest.mock('@MyTrips/Containers', ...)`                    |
| Strings literais em expects                            | Regex em expects (`/texto/i`)                              |
| Caminhos absolutos via constante de API                | Regex em handlers MSW (`/.*\/path/`)                       |

## Estrutura de um arquivo de teste

```tsx
describe('Tela: NomeDaTela', () => {
  setupData();

  describe('Fluxos', () => {
    it('cenário principal do usuário', async () => {
      makeSUT();

      // ações do usuário via helpers
      // validações de comportamento
    });
  });

  describe('Regras da tela', () => {
    describe('Header', () => {
      it('deve validar uma regra específica', async () => {
        makeSUT();
        // validação de UI ou regra isolada
      });
    });

    describe('Lista', () => {
      it('deve validar comportamento específico', async () => {
        makeSUT();
        // validação específica
      });
    });
  });
});
```

Modelo mental:

```
Tela
 ├── Fluxos          ← jornadas completas do usuário
 └── Regras
      ├── Header
      ├── Conteúdo
      └── Footer
```

---

## As 3 partes de um teste

### 1. `makeSUT` — renderiza a tela (somente isso)

```tsx
export function makeSUT() {
  return renderScreen(<NomeDaTelaScreen />);
}
```

Quando a tela ou componente aceita props que alteram o comportamento, `makeSUT` pode receber parâmetros:

```tsx
type SutParams = {
  disabled?: boolean;
};

function makeSUT({disabled = false}: SutParams = {}) {
  renderScreen(<Button disabled={disabled}>title</Button>);
}

describe('Button', () => {
  it('deve renderizar o botão ativo quando disabled for false', () => {
    makeSUT({disabled: false});

    expect(screen.getByTestId('button-ds')).toBeTruthy();
  });

  it('deve renderizar o botão desabilitado quando disabled for true', () => {
    makeSUT({disabled: true});

    expect(screen.getByTestId('disabled-button')).toBeTruthy();
  });
});
```

**Regras:**

- ❌ não configura dados
- ❌ não contém lógica
- ✅ apenas monta o sistema sob teste
- ✅ pode receber parâmetros para variar props do componente

### 2. `setupData` — prepara o estado via store real

```tsx
function setupData() {
  beforeEach(() => {
    const { result } = renderHook(() => useNomeStore());

    result.current.setTripDetails([...]);
    result.current.setPaxCounter({...});
  });
}
```

**Regras:**

- ✅ usa stores reais (nunca mocks de store)
- ✅ centraliza dados grandes
- ❌ não fica dentro do `it(...)`

### 3. Helpers — linguagem de domínio do teste

Transformam código de baixo nível em ações legíveis:

```tsx
// ❌ Sem helpers
fireEvent.press(getByTestId('origin-button'));
await waitFor(() => getByTestId('airport-GRU'));
fireEvent.press(getByTestId('airport-GRU'));

// ✅ Com helpers
await selectAirport('origin', 'GRU');
```

Exemplos de helpers:

```tsx
async function selectAirport(field: 'origin' | 'destination', code: string) { ... }
async function selectDate(day: string) { ... }
async function selectPassengers(pax: { adults: number; teenagers?: number }) { ... }
function pressSearchButton() { ... }
async function checkStoreDataAfterSearch() { ... }
```

### Arquivo `testUtils`

Quando um arquivo de teste começar a acumular builders, mocks compartilhados,
fixtures, `setupData`, `makeSUT` ou helpers reutilizáveis, extraia esse
conteúdo para um arquivo `testUtils.ts` ou `testUtils.tsx` no mesmo diretório
do teste.

**Regra prática:**

- ✅ o arquivo de teste principal fica focado nos `describe`/`it`
- ✅ `testUtils` concentra harness, factories, fixtures e helpers repetidos
- ✅ use imports nomeados a partir de `./testUtils`
- ❌ não deixe o arquivo de teste principal inflado com utilidades de suporte
- ❌ não mova para `testUtils` asserts específicos de um cenário

Exemplo:

```tsx
// __tests__/testUtils.ts
export const makeSUT = () => renderHook(() => useMyHook());
export const makePassenger = () => ({name: 'Maria'});
export const flushHook = async (rerender: () => void) => {
  await act(async () => {
    rerender();
  });
};
```

```tsx
// __tests__/useMyHook.test.ts
import {flushHook, makePassenger, makeSUT} from './testUtils';
```

---

## Tipos de teste

### Testes de Fluxo — jornadas completas

```tsx
it('deve buscar uma viagem de ida', async () => {
  await selectTab(ONE_WAY);
  await selectAirport(ORIGIN, 'CGR');
  await selectAirport(DESTINATION, 'GRU');
  await selectDate(TODAY);
  await selectPassengers({adults: 1, teenagers: 1});

  pressSearchButton();

  await checkStoreDataAfterSearchTrip();
});
```

Valida: renderização → interação → store → navegação

### Testes de Regras da Tela — regras específicas e visíveis

```tsx
it('deve renderizar origem e destino', async () => {
  makeSUT();

  await checkOriginAndDestinationData();
});
```

---

## Como pensar um teste

Siga sempre essa ordem:

1. **O que o usuário faz?**

```tsx
 await selectAirport(...)
 await selectDate(...)
 pressButton(...)
```

2. **O que o usuário vê?**

```tsx
expect(screen.getByText('...')).toBeTruthy();
```

3. **O que o sistema faz?**

```tsx
expect(storeState.data[0].price).toEqual(1944.7);
expect(mockNavigation.navigate).toHaveBeenCalledWith('booking', {
  screen: 'FareSelectScreen',
});
```

---

## Store como estado observável

O store é tratado como resultado observável — nunca como mock.

```tsx
const storeState = useSelectTripStore.getState();
expect(storeState.data[0].price).toEqual(1944.7);
```

---

## MSW — backend simulado

Não mockamos chamadas HTTP. Usamos MSW.

```tsx
// setup (jest.setup.ts ou setupFilesAfterFramework)
import {server} from '@Modernization/test/msw/server';

beforeAll(() => server.listen());
afterEach(() => server.resetHandlers());
afterAll(() => server.close());

// handler customizado por teste
server.use(
  rest.get('/api/flights', (req, res, ctx) => res(ctx.json(flightsMock))),
);
```

### Imports em Handlers do MSW — Nunca via Barrel

Handlers do MSW são carregados por **todos os testes** que usam o servidor. Importar de um barrel (`./mocks`) força o carregamento de todos os mocks do diretório na memória — mesmo os não utilizados — causando OOM no CI.

**Regra:** Handlers devem sempre importar mocks diretamente por arquivo.

```typescript
// ✅ CORRETO — importa apenas o arquivo necessário
import {seatMapApiMockResponse} from './mocks/seatMapApiMockResponse';

// ❌ ERRADO — dispara o barrel que carrega todos os mocks do diretório
import {seatMapApiMockResponse} from './mocks';
```

> Arquivos de teste individuais (`.test.tsx`) **podem** continuar importando do barrel normalmente. A restrição se aplica apenas aos arquivos de handler (`*Handlers.ts`).

---

## Template completo: Screen

```tsx
// __tests__/NomeDaTela.test.tsx
import React from 'react';
import { renderHook } from '@testing-library/react-native';
import { renderScreen } from '@Modernization/test/test-utils';
import { NomeDaTelaScreen } from '../NomeDaTelaScreen';
import { useNomeStore } from '../../Store/NomeStore';

// --- SUT ---
function makeSUT() {
  return renderScreen(<NomeDaTelaScreen />);
}

// --- Setup ---
function setupData() {
  beforeEach(() => {
    const { result } = renderHook(() => useNomeStore());
    result.current.setData({ ... });
  });
}

// --- Helpers ---
async function selectItem(label: string) { ... }
function pressConfirmButton() { ... }
async function checkStoreResult() {
  const state = useNomeStore.getState();
  expect(state.selectedItem).toBeTruthy();
}

// --- Testes ---
describe('Tela: NomeDaTela', () => {
  setupData();

  describe('Fluxos', () => {
    it('deve selecionar item e confirmar', async () => {
      makeSUT();

      await selectItem('Item A');
      pressConfirmButton();

      await checkStoreResult();
    });
  });

  describe('Regras da tela', () => {
    describe('Header', () => {
      it('deve exibir o título correto', async () => {
        makeSUT();
        expect(screen.getByText('Título Esperado')).toBeTruthy();
      });
    });
  });
});
```

---

## Template: Store (Zustand)

```ts
// __tests__/NomeStore.test.ts
import {act} from '@testing-library/react-native';
import {useNomeStore} from '../NomeStore';

describe('NomeStore', () => {
  beforeEach(() => {
    act(() => useNomeStore.getState().clearData());
  });

  it('deve definir dados', () => {
    const data = {id: '1', name: 'Test'};
    act(() => useNomeStore.getState().setData(data));
    expect(useNomeStore.getState().data).toEqual(data);
  });
});
```

---

## Mocks permitidos (apenas para infraestrutura)

```ts
// Navigation (mock de infraestrutura — não de lógica de negócio)
const mockNavigate = jest.fn();
jest.mock('@react-navigation/native', () => ({
  useNavigation: () => ({navigate: mockNavigate, goBack: jest.fn()}),
  useRoute: () => ({params: {}}),
}));
```

### 4. Mock de estado (stores)

- **Não** use `jest.mock('@MyTrips/Containers', ...)` para mockar stores ou containers.
- Para mockar estado, use diretamente o método do store:

```ts
// ❌ Não faça isso
jest.mock('@MyTrips/Containers', () => ({
  useReservationMyTripStore: () => ({reservation: defaultReservation}),
}));

// ✅ Forma correta
useReservationMyTripStore.getState().setReservation(defaultReservation);
```

---

## Proibições e Obrigações

| ❌ Proibido                             | ✅ Obrigatório                          |
| --------------------------------------- | --------------------------------------- |
| `jest.mock('@MyTrips/Containers', ...)` | `useStore.getState().setX(value)`       |
| Regex em expects (`/texto/i`)           | Strings literais em expects             |
| Regex em handlers MSW (`/.*\/path/`)    | Caminhos absolutos via constante de API |

---

## Checklist de um bom teste

- Dá pra entender sem ver a implementação
- Parece fluxo de usuário real
- Usa helpers como linguagem de domínio
- `setupData` fora dos `it(...)`
- `makeSUT` sem lógica
- Usa store real (não mock de store)
- Usa MSW (não mock de HTTP)
- Valida resultado, não processo
- Quebra quando comportamento muda
