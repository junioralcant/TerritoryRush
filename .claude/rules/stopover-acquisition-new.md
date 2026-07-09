# Rule: Stopover no AcquisitionNew

## Decisões fechadas

- **Endpoint** — `/flights/search-stopover` (separado de `/flights`). Não reusar o handler de busca normal.
- **Modalidades suportadas** — apenas `roundTrip` e `oneWay`. **Não** vai para `multipleTrips`.
- **Storefront** — `purchase_b2c_stopover` (diferente do `purchase_b2c` usual).
- **Feature flag** — controlada via `useStopoverFlag` dentro do AcquisitionNew. Exceção válida à regra de "uma flag por módulo" (ver `.claude/rules/qed-acquisition-flag.md`).

## Como aplicar

Quando implementar/ajustar stopover:

1. **Service SDK** — criar service próprio (3 camadas) apontando para `/flights/search-stopover`, não estender o de `/flights`.
2. **Hook de busca** — branch separado em `useSearchTrips`: se stopover ativo → chama service de stopover; senão → service normal.
3. **Storefront** — passar `purchase_b2c_stopover` como storefront em qualquer chamada que dependa de storefront.
4. **UI** — componente `Stopover/` em `SearchTripScreenNew/components/Stopover/` controla a UI; estado no `SearchTripNewStore`.
5. **Modal** — `FilterModal` do SelectTripScreenNew só fecha em **X** ou **Aplicar** — **nunca** em Limpar (ver feedback do usuário).

## Onde estado e flag vivem

- Estado: dentro do `SearchTripNewStore` (`StopoverState` faz parte do store geral)
- Flag: `useStopoverFlag` (loading + enabled)

## Anti-pattern

- Reaproveitar `/flights` com um parâmetro `?stopover=true` → endpoint próprio
- Forçar storefront `purchase_b2c` em chamada de stopover
- Adicionar suporte a `multipleTrips` para stopover sem decisão explícita do produto
