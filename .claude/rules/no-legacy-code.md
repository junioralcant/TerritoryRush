# Rule: Sem código legado

## Regra

Em AcquisitionNew, **nunca** importar/reusar código do fluxo legacy (`legacy/`, `modules/Acquisition/` antigo, hooks/stores antigos). Tudo novo deve nascer dentro de `modernization/modules/AcquisitionNew/`.

## Por quê

A reescrita existe para limpar dívidas técnicas, padronizar com Tangerina + Zustand + MSW e remover acoplamentos antigos. Reutilizar legacy invalida esses ganhos e cria pontes que nunca serão removidas.

## Como aplicar

- Quando precisar de algo similar ao legacy, **copiar o padrão** (organização, responsabilidades, nomenclatura), **não o código**.
- Se o trecho legacy serve como referência, leitura é OK; importação não.
- Para a11y e i18n, há exceções explícitas — copiar **textos/chaves** (não a implementação). Ver `.claude/rules/a11y-from-legacy.md` e `.claude/rules/translations-from-legacy.md`.

## Anti-pattern

```ts
// ❌ NUNCA
import {useOldSearch} from '@legacy/Acquisition/hooks/useOldSearch';
import {convertOldPassenger} from '@legacy/Acquisition/utils/convertOldPassenger';
```

## Exceção: `__legacyBridge__/`

Quando uma reescrita ainda não cobre 100% do legado e uma parte específica precisa continuar consumindo o fluxo antigo (ex: tela legacy renderizada atrás de feature flag), **isolar** essa fronteira em uma pasta `__legacyBridge__/` dentro da tela do AcquisitionNew que faz a ponte.

Regras da bridge:

- Qualquer arquivo que ainda importa de `@Acquisition/...` (ou outro path legacy) **mora dentro de `__legacyBridge__/`** — nunca solto na estrutura da tela nova
- O nome da pasta é literalmente `__legacyBridge__/` (com underscores) — sinaliza visualmente "fronteira temporária / código de exceção"
- Bridge tem seu próprio `index.ts` que reexporta só o que a tela nova precisa; ninguém importa diretamente de dentro do `__legacyBridge__/`
- Bridge pode mockar legacy em testes (exceção à regra `no_mocks_in_tests`)
- Bridge é **temporária por contrato**: cada `__legacyBridge__/` traz no top do `index.ts` (ou em PR) qual o plano de remoção (ex: "remover quando reescrita de X estiver feita")

Estrutura visível em: `screens/Passengers/PassengerSelectionScreenNew/__legacyBridge__/PassengerChooseBookingWithFlag/`.

## Quando duvidar

Se "reaproveitar economiza muito código", pare. A regra explícita do projeto é criar novo. Em caso de dúvida real, perguntar ao usuário antes — não decidir sozinho a favor do legacy.
