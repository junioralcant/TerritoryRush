# Rule: Feature flag única do módulo

## Regra

O módulo AcquisitionNew **inteiro** é gated por uma única feature flag: `acquisition_qed_new` (lida via `useQedAcquisitionFlag` / `useQedAcquisitionFlagStore`). **Não criar flag por tela** dentro do módulo.

## Por quê

- O fluxo todo (busca → seleção → fare → detalhes → checkout) precisa estar ligado ou desligado junto, porque telas dependem umas das outras.
- Flags por tela criariam combinações inválidas (ex: tela nova de busca apontando para tela velha de seleção).
- Rollout do módulo é uma decisão única do time — não uma decisão por tela.

## Como aplicar

- A flag é carregada no boot do app (`fetchQedAcquisitionFlag`) e guardada no Zustand store `useQedAcquisitionFlagStore`.
- No ponto de roteamento do booking, decide-se entre o stack novo (Screens `*ScreenNew`) e o stack legacy.
- Telas/hooks/components **dentro** do módulo AcquisitionNew **assumem** que a flag está ativa — não checar de novo dentro.

## Quando criar flag adicional

Apenas para **rollouts internos a uma tela** que precisem rollback independente (ex: novo banner, novo modo stopover). Mesmo nesses casos, considerar se um simples kill-switch já existente cobre.

Exemplos atuais:
- `useStopoverFlag` — controla a feature stopover dentro de SearchTripScreenNew
- `useAcquisitionBannerFlag` — controla banner promocional

Essas são exceções pontuais, **não** "uma flag por tela".

## Pattern correto

```tsx
// No nível do navigator / stack de booking
const {isQedAcquisitionFlagEnabled} = useQedAcquisitionFlag();
return isQedAcquisitionFlagEnabled
  ? <AcquisitionNewStack />
  : <AcquisitionLegacyStack />;
```

## Anti-pattern

```tsx
// ❌ Não criar isso
const useNewSearchScreenFlag = () => ...;
const useNewSelectScreenFlag = () => ...;
const useNewFareScreenFlag = () => ...;
```
