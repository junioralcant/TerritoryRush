# Skill: Testes Unitários com Cobertura Total

**Quando usar:** Ao criar testes unitários para componentes, screens, hooks ou stores, garantindo 100% de cobertura de branches e cenários.

**Padrão obrigatório:** Todos os testes DEVEM seguir rigorosamente o padrão definido em `.claude/skills/create-tests/SKILL.md`. Leia esse arquivo antes de qualquer implementação.

---

## Workflow Multi-Agente

Este skill opera em **duas fases obrigatórias e sequenciais**:

### Fase 1 — Plano (Sonnet 4.6)

**Modelo:** `claude-sonnet-4-6`

O agente de planejamento deve:

1. Ler o arquivo `.claude/skills/create-tests/SKILL.md` para carregar o padrão de testes.
2. Para cada componente/arquivo alvo:
   - Ler o código-fonte completo
   - Ler os arquivos de tipos, props e dependências relevantes
   - Identificar **todos** os branches, condições e cenários possíveis
3. Produzir um plano de testes estruturado contendo:
   - Lista de arquivos de teste a criar
   - Para cada arquivo: todos os `describe` e `it` com descrição precisa do cenário
   - Quais dados de setup são necessários (stores, props, MSW handlers)
   - Quais helpers serão criados
   - Mocks de infraestrutura necessários (apenas os não cobertos pelo `jest.setup.js`)

**Formato do plano por componente:**

```
## Componente: NomeDoComponente
Arquivo de teste: path/to/__tests__/NomeDoComponente.test.tsx

### Dados de setup (setupData)
- store.setX(valorEsperado)

### Helpers
- pressX(): pressiona o botão X
- checkY(): valida que Y está visível

### describe('NomeDoComponente')
  describe('Fluxos')
    it('deve [cenário principal]')
    it('deve [cenário alternativo]')
  describe('Regras do componente')
    describe('Header')
      it('deve exibir [elemento] quando [condição]')
      it('deve ocultar [elemento] quando [condição oposta]')
    describe('Conteúdo')
      it('deve [regra específica]')
    describe('Footer / Ações')
      it('deve [comportamento de interação]')
```

---

### Fase 2 — Execução (Haiku 4.5)

**Modelo:** `claude-haiku-4-5-20251001`

O agente de execução recebe o plano completo da Fase 1 e implementa cada teste. Deve:

1. Ler `.claude/skills/create-tests/SKILL.md` para aplicar o padrão corretamente.
2. Implementar cada arquivo de teste exatamente conforme o plano.
3. Garantir que cada `it` do plano está implementado — nenhum pode ser omitido.
4. Para cada teste, verificar o checklist abaixo antes de prosseguir.

---

## Regras de implementação

Estas regras são **não-negociáveis** e complementam o `create-tests/SKILL.md`:

### Cobertura

- Cobrir **todas** as props e suas variações (`true/false`, `undefined`, valores alternativos)
- Cobrir **todos** os branches condicionais (`if`, `&&`, ternário, `||`)
- Cobrir interações do usuário: press, scroll, input, swipe
- Cobrir estados: loading, erro, vazio, dado parcial, dado completo
- Cobrir callbacks e funções passadas como props

### `makeSUT` — Componentes

- Aceita parâmetros para variar props que alteram comportamento
- Nunca contém lógica ou setup de dados
- Apenas monta o sistema sob teste

### `makeSUT` — Hooks

Hooks exigem um padrão diferente de componentes. Use `renderHook` em vez de `render`:

```ts
import {renderHook, act} from '@testing-library/react-native';

type SutTypes = {
  paramA?: string;
  paramB?: boolean;
};

const makeSut = ({paramA = 'default', paramB = false}: SutTypes = {}) => {
  // Permitido: setar mock de retorno de store hooks aqui, quando o valor
  // varia por cenário de teste
  (useSomeStore as jest.Mock).mockReturnValue(paramB);

  return renderHook(() => useMyHook({paramA}));
};
```

**Regras específicas para hooks:**

- Sempre use `renderHook` de `@testing-library/react-native` (a antiga `@testing-library/react-hooks` está deprecated; o projeto migrou para a lib oficial atual)
- O retorno de `makeSUT` **deve ser** o resultado de `renderHook()` (diretamente ou como propriedade de um objeto)
- Acesse os valores retornados pelo hook via `result.current`
- Envolva chamadas a funções do hook com `await act(async () => { ... })` sempre que elas disparem efeitos colaterais ou atualizações de estado
- É permitido setar `mockReturnValue` dentro do `makeSUT` para valores que variam por cenário (ao contrário de componentes, onde isso vai no `setupData`)
- Funções de fábrica de dados complexos (`seatMapDataMock()`, `passengerMock()`) são encorajadas para evitar inline de dados extensos nos `it(...)`

**Padrão de acesso e asserção:**

```ts
it('deve retornar isVisible como true quando condição X', async () => {
  const {result} = makeSut({paramB: true});

  await act(async () => Promise.resolve());

  expect(result.current.isVisible).toBe(true);
});

it('deve chamar handleConfirm e navegar para Tela Y', async () => {
  const {result} = makeSut();

  await act(async () => {
    result.current.handleConfirm();
  });

  expect(mockNavigate).toHaveBeenCalledWith(
    'TelaY',
    expect.objectContaining({id: '123'}),
  );
});
```

**O que NÃO fazer em testes de hooks:**

```ts
// ❌ Não use render — hooks não são componentes
const {getByTestId} = render(<MyHook />);

// ❌ Não acesse result fora de act quando há efeitos assíncronos
const {result} = makeSut();
expect(result.current.data).toBeDefined(); // pode estar undefined antes do efeito

// ❌ Não use regex em expects de strings
expect(result.current.errorMessage).toMatch(/erro/i);

// ✅ Aguarde os efeitos antes de acessar valores assíncronos
await act(async () => Promise.resolve());
expect(result.current.data).toEqual({id: '1'});
```

### Organização com `testUtils`

Para testes de hook com muitos builders, mocks de infraestrutura, fixtures ou
helpers de renderização, extraia essas utilidades para `testUtils.ts` ou
`testUtils.tsx` no mesmo diretório do teste.

**Aplicação esperada:**

- `useMyHook.test.ts` fica responsável pelos cenários
- `testUtils` concentra `makeSUT`, `flushHook`, factories de dados e setup
- o nome preferencial do arquivo é `testUtils`, seguindo o padrão já usado no projeto

### `setupData`

- Sempre usando store real via `useStore.getState().setX(value)`
- Nunca dentro de `it(...)`
- Centraliza todos os dados grandes e reutilizados

### Helpers

- Criados para qualquer sequência repetida de 2+ ações
- Nomeados como ações de domínio (`pressConfirm`, `selectOption`, `checkVisibility`)
- Nunca usam `getByTestId` diretamente nos `it(...)`

### Expects

- Sempre strings literais — nunca regex (`/texto/i`)
- Valida o que o usuário vê ou o que o sistema faz
- Nunca verifica se um mock foi chamado (exceto navegação)

### Mocks

- Nunca repetir mocks já presentes no `jest.setup.js`
- Nunca mockar stores com `jest.mock`
- Nunca mockar componentes de UI internos ao projeto
- Nunca mockar ícones de `@Modernization/assets/icons`
- Permitido apenas: navegação, infraestrutura nativa ausente do setup global

#### Mocks permitidos (apenas para infraestrutura)

```ts
// Navigation (mock de infraestrutura — não de lógica de negócio)
const mockNavigate = jest.fn();
jest.mock('@react-navigation/native', () => ({
  useNavigation: () => ({navigate: mockNavigate, goBack: jest.fn()}),
  useRoute: () => ({params: {}}),
}));
```

##### Mock de estado (stores)

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

#### Mocks globais — nunca repita no arquivo de teste

Os módulos abaixo já estão configurados no `jest.setup.js`. Repetir esses mocks em testes individuais é redundante e pode gerar comportamento inesperado (o mock local sobrescreve o global com uma versão incompleta).

##### Infraestrutura React Native

| Módulo                                                   | O que já está mockado                                        |
| -------------------------------------------------------- | ------------------------------------------------------------ |
| `react-native-config`                                    | Todas as variáveis de ambiente (`API_BASE_*`, tokens, flags) |
| `react-native-safe-area-context`                         | `useSafeAreaInsets`, `SafeAreaProvider`, `SafeAreaView`      |
| `react-native-reanimated`                                | Mock completo via `react-native-reanimated/mock`             |
| `react-native-gesture-handler`                           | Todos os handlers e wrappers como `View`                     |
| `react-native/Libraries/Alert/Alert`                     | `alert: jest.fn()`                                           |
| `react-native/Libraries/Utilities/PixelRatio`            | `get`, `roundToNearestPixel`, `getFontScale`                 |
| `react-native/Libraries/StyleSheet/StyleSheet`           | `create`, `flatten`, `compose`                               |
| `react-native/Libraries/EventEmitter/NativeEventEmitter` | Mock automático                                              |
| `react-native-permissions`                               | Via `react-native-permissions/mock`                          |
| `react-native-share`                                     | `Share.open`                                                 |
| `react-native-webview`                                   | Mock do componente `WebView`                                 |
| `react-native-view-shot`                                 | Componente mock que renderiza `View`                         |
| `react-native-device-info`                               | `getVersion`, `getSystemName`, `getBundleId`                 |
| `react-native-public-ip`                                 | Retorna `'1.2.3.4'`                                          |
| `react-native-simple-crypto`                             | `AES.encrypt/decrypt`, `utils.*`                             |
| `@react-native-async-storage/async-storage`              | `mockAsyncStorage` completo                                  |
| `@react-native-clipboard/clipboard`                      | `setString`, `getString`                                     |
| `@react-native-community/netinfo`                        | `addEventListener`, `fetch`                                  |
| `rn-fetch-blob`                                          | Todas as APIs                                                |
| `nanoid/non-secure`                                      | `nanoid: () => 'nanoid'`                                     |

##### Firebase

| Módulo                                    | O que já está mockado                        |
| ----------------------------------------- | -------------------------------------------- |
| `@react-native-firebase/analytics`        | `logEvent`, `setUserId`, `setUserProperties` |
| `@react-native-firebase/crashlytics`      | `log`, `recordError`                         |
| `@react-native-firebase/messaging`        | `getToken`, `onMessage`, `requestPermission` |
| `@react-native-firebase/dynamic-links`    | `getInitialLink`, `onLink`                   |
| `@react-native-firebase/in-app-messaging` | `triggerEvent`                               |
| `@react-native-firebase/app`              | `onReady`                                    |
| `@react-native-firebase/perf`             | `newHttpMetric` com `start/stop`             |

##### Analytics e terceiros

| Módulo                               | O que já está mockado                                   |
| ------------------------------------ | ------------------------------------------------------- |
| `@amplitude/analytics-react-native`  | `logEvent`, `identify`, `init`, `setUserId`, `Identify` |
| `@fullstory/react-native`            | `event`, `FSPage`                                       |
| `@oracle/react-native-pushiomanager` | `registerApp`, `getDeviceID`, `registerUserId`, etc.    |

##### Internos do projeto

| Módulo                                       | O que já está mockado                                                                    |
| -------------------------------------------- | ---------------------------------------------------------------------------------------- |
| `react-i18next`                              | `useTranslation: () => ({t: key => key, i18n: {language: 'pt-BR'}})`                     |
| `i18next`                                    | `t: key => key, language: 'pt-BR'`                                                       |
| `@Modernization/hooks/useTranslationSupport` | `useTranslationSupport: () => ({t: jest.fn(key => key)})`                                |
| `@Modernization/hooks`                       | `useLegacyClone` (user com profile completo), `useAppSafeArea`                           |
| `@Modernization/components`                  | `Box`, `Text`, `GolBox`, `Frame`, `TemplateFooter`, `TemplateScroll`, `BounceBackground` |
| `@Common/Utils`                              | `formatLocalDate`, `formatPhone`, `responsiveSize`, `accessibility`                      |
| `@/Translations`                             | `t: key => key`, `language: 'pt-BR'`                                                     |
| `@/styles/styles`                            | `Colors`, `Layout`, `FontSize`, `Type` completos                                         |
| `@MyTrips/Containers`                        | `loadTranslationMyTrips`, `useChangeSeatStore`                                           |
| `react-redux`                                | `useSelector`, `useDispatch`, `connect`                                                  |
| `redux-persist`                              | `persistReducer`, `persistStore`                                                         |
| `@gol/storage`                               | `storage.getItem`, `storage.setItem`, `storage.removeItem`                               |

```ts
// ❌ Não faça — já está no jest.setup.js
jest.mock('react-i18next', () => ({
  useTranslation: () => ({t: (key: string) => key, i18n: {language: 'pt-BR'}}),
}));

jest.mock('react-native-config', () => ({Config: {API_BASE_B2C: '...'}}));

jest.mock('@react-native-firebase/analytics', () => ({...}));

// ❌ Não faça — accessibility de @Common/Utils já está mockado globalmente
jest.mock('@Common/Utils', () => ({
  ...jest.requireActual('@Common/Utils'),
  accessibility: jest.fn((id: string) => ({testID: id, accessibilityLabel: id})),
}));
```

#### Mocks de ícones não precisam ser feitos

Ícones de `@Modernization/assets/icons` são apenas componentes visuais e não afetam o comportamento testado. Deixe que renderizem naturalmente.

```tsx
// ❌ Não faça isso
jest.mock('@Modernization/assets/icons', () => ({
  SeatDisabled: () => <View testID="seat-disabled" />,
  CheckBoldIcon: () => <View testID="check-icon" />,
  // ... mais 50 ícones ...
}));

// ✅ Simplesmente teste o comportamento sem mockar
it('deve renderizar o assento desabilitado', async () => {
  makeSUT();

  expect(screen.getByTestId('seat-disabled-container')).toBeTruthy();
  // ícone renderiza naturalmente, sem mock
});
```

---

## Checklist por teste

Antes de finalizar cada `it(...)`:

- [ ] Simula ação real do usuário (ou valida estado inicial visível)
- [ ] Valida o que o usuário vê (`getByText`, `getByTestId`)
- [ ] Valida efeito no sistema quando aplicável (store, navegação)
- [ ] Usa helpers em vez de `fireEvent`/`waitFor` direto
- [ ] Usa string literal no `expect` (não regex)
- [ ] Não contém mock redundante (já coberto pelo setup global)

---

## Checklist de entrega

Ao concluir todos os testes:

- [ ] Todos os `it(...)` do plano foram implementados
- [ ] Todos os branches do componente estão cobertos
- [ ] Nenhuma prop sem teste de variação de comportamento
- [ ] `setupData` fora dos `it(...)`
- [ ] `makeSUT` sem lógica (componentes) / usa `renderHook` corretamente (hooks)
- [ ] Nenhum mock proibido presente
- [ ] Nenhum mock do `jest.setup.js` repetido
- [ ] Todos os expects com strings literais

---

## Invocação do workflow

Ao receber este skill, execute **sequencialmente**:

```
1. [Sonnet 4.6] Leia os componentes alvo e produza o plano completo
2. [Haiku 4.5]  Implemente todos os testes conforme o plano
```

Não comece a escrever código antes de o plano estar completo.
Não omita nenhum `it(...)` do plano durante a execução.
