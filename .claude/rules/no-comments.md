# Rule: Sem comentários

## Regra

Código produzido em `modernization/modules/AcquisitionNew/` e em `modules/gol-sdk/src/services/acquisitionNew/` **não tem comentários**. Sem `//`, sem `/* */`, sem JSDoc, sem comentários em JSX (`{/* ... */}`).

## Por quê

- Identifiers bem nomeados (`fillRoundTripForm`, `checkErrorDrawerVisible`, `to{Name}Entity`, `acquisition_qed_new`) são autodocumentação.
- Comentários divergem do código com o tempo — viram mentira silenciosa.
- O objetivo do AcquisitionNew é uniformidade absoluta: "não deve ser perceptível que pessoas diferentes codaram". Comentários inserem voz autoral e ruído visual entre contribuidores.
- Testes em pt-BR já narram intenção via `describe`/`it` + nomes de helpers do `testUtils` — não precisa de comentário.

## Exceções estritas (e somente estas)

1. `// @ts-expect-error <motivo curto>` — quando inevitável. Motivo é obrigatório, em pt-BR.
2. `// @ts-ignore <motivo curto>` — preferir `@ts-expect-error`; usar `@ts-ignore` só quando o TS não permite o expect.
3. `// eslint-disable-next-line <rule-name> <motivo curto>` — quando inevitável. Motivo é obrigatório.
4. Pragmas/directives obrigatórios do framework (ex: `'use client'`, `'use server'`). Não se aplicam hoje no AcquisitionNew, mas listados para completude.

Tudo o mais é desvio.

## Anti-pattern

```ts
// ❌ Comentário que descreve o que a função faz — o nome já diz
// Converte response do middle em formato de tela
export const toSearchTripsEntity = (raw: SearchTripsMiddleResponse) => { ... };

// ❌ Comentário de seção
// --- helpers ---
const buildItinerary = () => { ... };

// ❌ JSDoc em service/adapter/middle/store/hook
/**
 * Busca voos no BFF e devolve o adapter pronto.
 * @param params Parâmetros da busca
 */
export const getSearchTrips = async (params) => { ... };

// ❌ TODO / FIXME — abrir issue no tracker
// TODO: tratar erro de Sabre quando session expira
return failure(error);

// ❌ Comentário em teste — o it() em pt-BR já narra
it('Deve buscar voos', async () => {
  // Setup
  makeSUT();
  // Ação
  await fillRoundTripForm();
  // Asserção
  await checkNavigatedToSelectTrip();
});

// ❌ Comentário em JSX
return (
  <GolBox>
    {/* botão de submit */}
    <TgrButtonPrimary onPress={onSubmit} />
  </GolBox>
);

// ❌ Comentário "explicando regra de negócio" — extrair para função com nome
// Stopover só vale para roundTrip e oneWay
if (modality !== 'multipleTrips') { ... }
// →
if (isStopoverEligibleModality(modality)) { ... }
```

## Pattern correto

```ts
export const toSearchTripsEntity = (raw: SearchTripsMiddleResponse) => { ... };

export const getSearchTrips = async (params: GetSearchTripsRequest) => { ... };

it('Deve buscar voos e navegar para SelectTripScreenNew', async () => {
  makeSUT();
  await fillRoundTripForm();
  await pressSearchButton();
  await checkNavigatedToSelectTrip();
});

return (
  <GolBox>
    <TgrButtonPrimary onPress={viewModel.onSubmit} />
  </GolBox>
);
```

## Como aplicar

- Em código novo: simplesmente não escrever comentário. Extrair função/constante com nome significativo quando sentir vontade de comentar.
- Em código existente sob escopo do AcquisitionNew/SDK acquisitionNew: remover na varredura da Fase 5 do `normalization-plan/`.
- Em revisão de PR: comentário no diff = pedido de mudança automático (extrair função/renomear identifier/criar issue para TODO).

## Onde NÃO se aplica

- Arquivos de configuração (`.eslintrc`, `tsconfig.json`, scripts shell, GitHub Actions) — comentários permitidos quando úteis.
- Markdown (rules, skills, READMEs, plano) — esta regra é sobre código, não documentação.
- Código fora de `AcquisitionNew/` e `acquisitionNew/` SDK — outras áreas seguem seus próprios padrões.
