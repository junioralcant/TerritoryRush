# Rule: SDK em 3 camadas (middle / service / adapter)

## Regra

Todo service SDK em `modules/gol-sdk/src/services/acquisition/{name}/` segue 3 camadas com responsabilidades estritas:

1. **Middle** (`middle/{name}Middle.ts`) — **HTTP puro**: faz `middleRequest`, atualiza `setSession` quando aplicável, captura `HttpError` em try/catch e retorna `Result<MiddleResponse, HttpError>`. **Não** transforma dados, **não** trata erros de domínio.
2. **Service** (`{name}.ts`) — orquestra: consome middle, mapeia `HttpError`/payload de erro Sabre para classe própria (`{Name}SabreError`, `{Name}SessionError`), **decide todo bloqueio/erro de domínio** (elegibilidade, regras de negócio que abortam o fluxo), chama adapter e envolve o retorno em `success(...)`, retornando `Result<AdapterType, DomainError>`. **Toda construção de `failure`/erro vive aqui** — o adapter nunca retorna `failure`.
3. **Adapter** (`adapter/adapter.ts`) — **transformação pura**: sem `await`, sem efeitos colaterais, **sem `failure`/`Result` de erro**. Recebe `MiddleResponse` e devolve **`AdapterType` diretamente** (formato consumido pela tela) — assume que o service já validou e desbloqueou o fluxo. Pode delegar para sub-funções (`getItinerary`, `getPassengers`) co-localizadas dentro de `adapter/`. Quando precisa de uma **decisão de bloqueio/elegibilidade**, expõe um util puro que devolve a decisão (ex: `getCheckInBlock(...) → Block | null`); é o **service** que transforma essa decisão em `failure`. **`adapter/` é sempre pasta**, com `adapter.ts` + `types.ts` (e sub-funções quando útil), nunca um arquivo solto.

## Por quê

- Cada camada tem teste e responsabilidade isolada.
- Middle não conhece domínio → reutilizável.
- Service concentra políticas de erro → mudar regra de erro Sabre ou de bloqueio de domínio é um diff localizado.
- Adapter puro (só `AdapterType`, nunca `failure`) → testável sem rede, sem ramos de erro, e fácil de raciocinar; a árvore de decisão de erro fica num único lugar (service).

## Estrutura de pasta

```
modules/gol-sdk/src/services/acquisition/{name}/
├── {name}.ts                      # service (orquestrador)
├── middle/
│   ├── {name}Middle.ts            # HTTP puro
│   └── types.ts                   # request/response middle
├── adapter/
│   ├── adapter.ts                 # transformação pura
│   ├── types.ts                   # tipos do adapter (entradas auxiliares, etc.)
│   └── {subFn}.ts                 # sub-funções opcionais (getItinerary, getPassengers)
├── error/                         # classes de erro de domínio
├── types.ts                       # tipos finais (AdapterType) consumidos pela tela
└── index.ts                       # barrel (não exporta middle)
```

Tipos: middle types em `middle/types.ts`; tipos auxiliares do adapter em `adapter/types.ts`; `AdapterType` final (consumido pela tela) em `types.ts` da raiz. Nunca inline (ver `.claude/rules/types-in-types-ts.md`).

## Barrel correto (`index.ts`)

O barrel da service exporta **apenas** o que é consumido fora: service, tipo final do adapter (`AdapterType`) e classes de erro de domínio. **Nunca** exporta middle (nem `*Middle`, nem `MiddleRequest`/`MiddleResponse`).

```ts
export {{name}} from './{name}';
export type {{Name}Adapter} from './types';
export {{Name}SabreError, {Name}SessionError} from './error';
```

Anti-pattern de barrel:

```ts
export * from './middle';
export type {{Name}MiddleResponse} from './middle/types';
```

Quando um tipo do middle vaza para fora da service (consumido por outra camada), é sinal de modelagem errada: mover o tipo necessário para o `types.ts` raiz ou expor um tipo já adaptado.

## Pattern correto

```ts
// middle/{name}Middle.ts
export const {name}Middle = async (params: {Name}MiddleRequest):
  Promise<Result<{Name}MiddleResponse, HttpError>> => {
  try {
    const response = await middleRequest<{Name}MiddleResponse>('booking', {
      method: 'POST',
      path: '/...',
      body: params,
    });
    setSession('booking', response.session);
    return success(response.data);
  } catch (error) {
    return failure(error as HttpError);
  }
};

// adapter/adapter.ts
export const to{Name}Entity = (raw: {Name}MiddleResponse): {Name}Adapter => {
  return /* determinístico, sem await, sem failure */;
};

// {name}.ts
export const {name} = async (params: {Name}Request):
  Promise<Result<{Name}Adapter, {Name}DomainError>> => {
  const middleResult = await {name}Middle(toMiddleRequest(params));
  if (isFailure(middleResult)) {
    return failure(map{Name}Error(middleResult.error));
  }

  const block = get{Name}Block(middleResult.value);
  if (block) {
    return failure(new {Name}DomainError(block));
  }

  return success(to{Name}Entity(middleResult.value));
};
```

## Anti-pattern

- Middle chamando adapter → quebra a camada
- Service fazendo `fetch` direto → bypassa middle
- Adapter com `await` ou efeitos → não é puro
- **Adapter retornando `failure`/`Result` de erro** ou contendo early-return de bloqueio/elegibilidade → decisão de erro pertence ao service; o adapter só devolve `AdapterType`
- Service chamando o adapter e repassando o retorno sem `success(...)` (quando o adapter já devolve `AdapterType` puro, o service é quem envolve em `success`)
- Tipos inline em `{name}.ts`, `adapter/adapter.ts`, `*Middle.ts`
- `adapter` como arquivo solto (`adapter.ts` na raiz) em vez de pasta `adapter/`
- Barrel exportando `middle` ou tipos do middle (`*MiddleRequest`/`*MiddleResponse`)

## Referência canônica

- `modules/gol-sdk/src/services/acquisition/postScorePurchaseAcquisition/`
