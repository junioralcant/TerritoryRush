# Rule: Types em `types.ts`

## Regra

Toda `interface`, `type` ou `enum` **exportado** vive em um arquivo `types.ts` dedicado, **nunca** inline em `.ts`/`.tsx` de implementação (service, adapter, middle, hook, componente, store, util, analytics).

A regra vale para **toda forma de declaração de tipo nomeada e exportada**, sem exceção de sintaxe:

- `export interface X { ... }`
- `export type X = ...` — incluindo union (`type Modality = 'roundTrip' | 'oneWay'`), intersection, mapped types e conditional types
- `export enum X { ... }` (e `export const enum`)
- Props de componente (`XProps`), state/store types (`XState`, `XStore`), request/response do middle, retorno do adapter, payloads de analytics, route params
- Tipos genéricos exportados (`export type Result<T, E> = ...`)

Se é um tipo **nomeado e exportado**, ele mora em `types.ts`. O arquivo de implementação **importa** o tipo — nunca o declara.

## Por quê

- Co-locação por **camada de implementação** vira ruído (uma interface no meio de uma função).
- Separar tipos facilita: import, leitura, refactor automático, e respeita o padrão já vigente em todo AcquisitionNew + gol-sdk.
- Uniformidade absoluta do módulo: ao abrir qualquer pasta, o leitor sabe que os tipos estão em `types.ts` — não precisa caçar declaração espalhada no meio de um service ou componente.
- `types.ts` vira a **superfície de contrato** da pasta: o que aquela camada recebe e devolve fica legível em um arquivo só.

## Como aplicar

Cada pasta com lógica tem o seu `types.ts`:

- `screens/{Name}ScreenNew/types.ts` — route params, tipos locais da tela
- `screens/{Name}ScreenNew/components/{X}/types.ts` — `XProps`
- `screens/{Name}ScreenNew/utils/types.ts` — tipos de entradas/saídas de helpers (quando exportados)
- `screens/{Name}ScreenNew/analytics/types.ts` — payload types
- `store/{Name}NewStore/types.ts` (ou `screens/{Cluster}/store/{Name}NewStore/types.ts`) — `{Name}State`, `{Name}Store`
- `services/acquisition/{name}/types.ts` — request público + adapter return types
- `services/acquisition/{name}/middle/types.ts` — request/response middle
- `services/acquisition/{name}/adapter/types.ts` — tipos auxiliares do adapter
- `services/acquisition/{name}/error/types.ts` (opcional) — para tipos de erro complexos

### Detecção rápida (revisão de PR / varredura)

Tipo nomeado e exportado fora de `types.ts` aparece com:

```bash
grep -rnE '^\s*export (interface|enum|type|const enum) ' \
  modernization/modules/AcquisitionNew \
  modules/gol-sdk/src/services/acquisitionNew \
  --include='*.ts' --include='*.tsx' \
  | grep -v '/types.ts:'
```

Cada linha que sobra (descontando a exceção #2 do `ReturnType`) é uma violação a mover para o `types.ts` da pasta.

## Pattern correto

```ts
// types.ts
export interface RoundTripFormProps {
  onSubmit: () => void;
}

// RoundTripForm.tsx
import {RoundTripFormProps} from './types';
export const RoundTripForm = ({onSubmit}: RoundTripFormProps) => { ... };
```

## Anti-pattern

```ts
// ❌ Interface de props declarada no componente
interface RoundTripFormProps {
  onSubmit: () => void;
}
export const RoundTripForm = ({onSubmit}: RoundTripFormProps) => { ... };

// ❌ Union/enum exportado solto no arquivo de implementação
export type Modality = 'roundTrip' | 'oneWay' | 'multipleTrips';
export const getModality = (...) => { ... };

// ❌ Tipo de request/response declarado dentro do middle
export interface SearchTripsMiddleResponse { ... }
export const searchTripsMiddle = async (...) => { ... };

// ❌ Retorno do adapter tipado inline no service
export const searchTrips = async (...): Promise<{itinerary: Itinerary[]}> => { ... };

// ❌ State/Store da Zustand declarado no create()
interface SearchTripNewState { origin: Airport | null; }
export const useSearchTripNewStore = create<SearchTripNewState>(...);

// ❌ Payload de analytics tipado inline no useLog*
export type SearchLogParams = {origin: string; destination: string};
export const useLogSearch = () => { ... };
```

Em todos os casos: a declaração sai do arquivo de implementação e vai para o `types.ts` da pasta; o arquivo passa a **importar** o tipo.

## Exceções razoáveis (fechadas — nada além destas)

1. **Tipo utilitário interno, não exportado**, usado em uma única função pontual, pode ficar inline. No instante em que ganha `export`, muda para `types.ts`.

   ```ts
   const buildPayload = (raw: Raw) => {
     type Acc = Record<string, number>;
     return raw.items.reduce<Acc>((acc, item) => { ... }, {});
   };
   ```

2. **`ReturnType<typeof useX>` de hook** pode ser declarado e exportado no próprio `.ts` do hook, desde que na forma `export type X = ReturnType<typeof useX>;` ao final do arquivo (ver `useBaseAnalyticsParams.ts`). Isso não é "declarar um tipo nomeado novo" — é derivar do valor que já vive ali.

3. **Inferência anônima inline** (sem nome, sem `export`) — anotar um parâmetro/retorno com um objeto literal pequeno e local. Se o shape merece um nome ou se repete, vira tipo nomeado em `types.ts`.

Qualquer `interface`/`type`/`enum` **nomeado e exportado** fora de `types.ts` é desvio, mesmo que pequeno — sem exceção de "é só um type de uma linha".
