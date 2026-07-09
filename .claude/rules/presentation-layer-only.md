# Rule: Camada de apresentação pura (JSX) — lógica vai pro hook

## Regra

Todo `.tsx` de **tela** e de **componente** no AcquisitionNew é **apenas camada de apresentação**: importa um hook, lê o que ele expõe e renderiza JSX. Nenhuma lógica de negócio, cálculo derivado, efeito (`useEffect`), handler com regra, fetch ou `useState` mora no `.tsx`.

- **Tela** — o `.tsx` consome o main hook via `const viewModel = use{Name}ScreenNew()` e renderiza em função de `viewModel.*`. A única lógica tolerada inline é o **branch de loading** (`if (viewModel.isLoading) return <Loader />;` ou equivalente) antes do JSX principal. Tudo o mais — estado, efeitos, orquestração — vive no main hook.
- **Componente com lógica** — extrai a lógica para um hook próprio do componente em `components/{ComponentName}/hooks/use{ComponentName}.ts`. O `.tsx` consome esse hook e só renderiza.
- **Componente puramente apresentacional** (só recebe props e renderiza, sem estado/efeito/derivação) — **não** precisa de hook. Hook de componente só existe quando há lógica para extrair.

## Por quê

- Separa **o que renderiza** de **por que/quando renderiza** — o `.tsx` lido como árvore visual, o hook como comportamento.
- Lógica em hook é testável isoladamente e reaproveitável; lógica no `.tsx` só testa via render.
- Uniformidade do módulo: abrir qualquer `.tsx` e encontrar só JSX é previsível para qualquer contribuidor (ver objetivo de uniformidade em `.claude/rules/no-comments.md`).
- Consistente com a arquitetura de camadas do módulo (`.claude/rules/architecture-acquisition-new.md`): tela fina + main hook é o mesmo princípio estendido a componentes.

## Como aplicar

### Tela

```tsx
// {Name}ScreenNew.tsx
export const FareSelectScreenNew = () => {
  const viewModel = useFareSelectScreenNew();

  if (viewModel.isLoading) {
    return <GolLoader testID="fare_select_loader" />;
  }

  return (
    <GolBox gap="s2x">
      <FareList fares={viewModel.fares} onSelect={viewModel.onSelectFare} />
      <TgrButtonPrimary onPress={viewModel.onConfirm} label={viewModel.confirmLabel} />
    </GolBox>
  );
};
```

- `const viewModel = use{Name}ScreenNew()` no topo — sem desestruturar, sem renomear (regra fixa em `architecture-acquisition-new.md`).
- Loading inline é a **única** exceção. Erro/empty/conteúdo derivado: o que é decisão de negócio fica no hook expondo flags (`viewModel.showErrorDrawer`); o `.tsx` só ramifica em cima delas.

### Componente com lógica → hook do componente

```tsx
// components/RoundTripForm/RoundTripForm.tsx
export const RoundTripForm = ({onSubmit}: RoundTripFormProps) => {
  const {isFormValid, selectedDates, originLabel, onSwapAirports} = useRoundTripForm({onSubmit});

  return (
    <GolBox gap="s2x">
      <TgrFlightSearch originLabel={originLabel} onSwap={onSwapAirports} />
      <TgrInputDate value={selectedDates} />
      <TgrButtonPrimary disabled={!isFormValid} onPress={onSubmit} />
    </GolBox>
  );
};
```

```ts
// components/RoundTripForm/hooks/useRoundTripForm.ts
export const useRoundTripForm = ({onSubmit}: UseRoundTripFormParams) => {
  const {origin, destination} = useSearchTripState();
  const isFormValid = Boolean(origin && destination);
  const onSwapAirports = () => { ... };
  return {isFormValid, selectedDates, originLabel, onSwapAirports};
};
```

Diferença de consumo: **tela** usa `viewModel.*` sem desestruturar; **componente** pode desestruturar o retorno do seu hook (não há nome fixo `viewModel` para componentes).

### Componente sem lógica → sem hook

```tsx
// components/FareBadge/FareBadge.tsx
export const FareBadge = ({label, tone}: FareBadgeProps) => (
  <TgrChip label={label} tone={tone} />
);
```

## Anti-pattern

```tsx
// ❌ useState / useEffect / fetch no .tsx da tela
export const FareSelectScreenNew = () => {
  const [fares, setFares] = useState([]);
  useEffect(() => { fetchFares().then(setFares); }, []);
  return <FareList fares={fares} />;
};

// ❌ Regra de negócio / derivação inline no JSX
return (
  <TgrButtonPrimary
    disabled={!origin || !destination || passengers.adults === 0}
    onPress={() => { logEvent('search'); navigate('SelectTrip'); }}
  />
);

// ❌ Componente com lógica resolvendo tudo dentro do próprio .tsx (sem hook)
export const RoundTripForm = ({onSubmit}: RoundTripFormProps) => {
  const {origin, destination} = useSearchTripState();
  const [showModal, setShowModal] = useState(false);
  const isFormValid = Boolean(origin && destination);
  const handleSwap = () => { ... };
  return ( ... );
};

// ❌ Loading com lógica além do branch simples (montar/transformar dados no .tsx)
if (isLoading) {
  const partial = rawFares.map(toFareView).slice(0, 3);
  return <SkeletonList items={partial} />;
}
```

Correções: efeitos/estado/derivação/handlers com regra → main hook (tela) ou `use{ComponentName}` (componente). Loading no `.tsx` é só o `if` + retorno do loader; qualquer preparo de dados do skeleton vai pro hook.

## Exceções

- **Loading na tela** — branch simples no `.tsx` da tela é permitido (descrito acima). Em componente, prefira o hook expor a flag e o `.tsx` ramificar; transformar dados para o estado de loading nunca fica no `.tsx`.
- **JSX trivial sem lógica** — componente apresentacional puro dispensa hook.
- Estado de UI puramente local (modal aberto, toggle): vai pro hook (`useState` dentro do main hook da tela / dentro do `use{ComponentName}`), **nunca** no `.tsx` — ver `architecture-acquisition-new.md`.

## Referência canônica

- Tela: `screens/Passengers/PassengerFormScreenNew/PassengerFormScreenNew.tsx` (`const viewModel = ...`)
- Componente com hook: `screens/SearchTripScreenNew/components/RoundTripForm/` (`RoundTripForm.tsx` + `hooks/useRoundTripForm.ts`)
