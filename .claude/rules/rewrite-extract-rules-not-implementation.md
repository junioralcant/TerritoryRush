# Rule: Reescrita extrai regras, não implementação

## Regra

Ao reescrever uma tela, hook, service ou qualquer peça do legado dentro do AcquisitionNew ou CheckinNew, **extrair apenas as regras de negócio e o comportamento observável** — nunca se apegar a detalhes de implementação, nomes de variáveis/funções/arquivos, organização de pastas, estrutura de dados interna ou padrões de código do legado.

O legado serve para responder **"o que a tela faz e por quê"** (regras, validações, fluxos, estados, ramificações de negócio). Ele **não** dita **"como o código novo é escrito"** (camadas, nomes, pastas, tipos, libs) — isso é decidido pela arquitetura do AcquisitionNew ou CheckinNew (`.claude/rules/architecture-acquisition-new.md`), nunca pelo legado.

## O que SE extrai do legado (a regra)

- **Comportamento de negócio** — o que acontece em cada ação do usuário, condições, ramificações.
- **Validações e estados** — quando um botão habilita/desabilita, quando um erro aparece, estados de loading/empty/erro.
- **Fluxos e navegação** — de onde vem, para onde vai, o que dispara cada transição.
- **Regras de domínio** — cálculos, elegibilidades, limites, ordenações (a lógica, não o código que a implementa).
- **Casos de borda** — tratamentos especiais que o legado cobre e a reescrita precisa preservar.

## O que NÃO se copia do legado (a implementação)

- **Nomes** — de variáveis, funções, hooks, componentes, props internas, constantes. Renomear para o padrão novo (`use{Name}ScreenNew`, `to{Name}Entity`, etc.).
- **Estrutura de pastas** — o legado pode ter qualquer organização; a nova segue a estrutura canônica do módulo. Não espelhar pastas do legado.
- **Camadas e padrões de código** — se o legado mistura fetch no componente, usa Redux, Context, classes, etc., **ignorar**. A reescrita usa screen fina + hook + store Zustand + SDK 3 camadas.
- **Formato de dados interno / tipos** — modelar os tipos do zero em `types.ts` conforme o contrato novo (BFF, adapter). Não importar nem replicar shapes legados.
- **Libs e utilitários legados** — não reaproveitar; usar Tangerina, MSW, Zustand e os utils do módulo novo.

## Exceções (copiadas idênticas, por contrato)

Apenas **dois** aspectos são copiados literais do legado, e cada um tem rule própria:

- **Translations** — chaves e textos i18n idênticos. → `.claude/rules/translations-from-legacy.md`
- **A11y** — props de acessibilidade e `testID` idênticos. → `.claude/rules/a11y-from-legacy.md`

Fora desses dois, nada do legado é copiado — só a regra é extraída.

## Por quê

- A reescrita existe para limpar dívida técnica e padronizar (`.claude/rules/no-legacy-code.md`). Replicar nomes/pastas/estrutura do legado reintroduz a dívida sob nova roupagem.
- Apegar-se à implementação legada gera traduções 1:1 de código ruim, em vez de uma tela nova que cumpre as mesmas regras com a arquitetura do módulo.
- Uniformidade absoluta do módulo: o código novo deve parecer escrito por uma só pessoa, seguindo a estrutura canônica — e não carregar a marca da organização do legado.
- Separar **regra** (estável, vinda do legado) de **implementação** (nova, vinda da arquitetura) deixa claro o que precisa ser preservado e o que precisa ser repensado.

## Como aplicar

1. Ler a tela/peça legada para **entender o comportamento** — anotar regras, validações, fluxos, estados e casos de borda.
2. **Descartar** mentalmente nomes, pastas e estrutura de código do legado.
3. Modelar a peça nova do zero seguindo `.claude/rules/architecture-acquisition-new.md` (screen fina + main hook + store + SDK 3 camadas) e demais rules do módulo.
4. Copiar **somente** translations e a11y idênticas (exceções acima).
5. Validar paridade pelo **comportamento** (testes de "Paridade legado" em `Regras da tela`), não pela semelhança de código.

## Anti-pattern

```ts
// ❌ Replicar o nome do hook legado
import {useFlightSearch} from '@legacy/...';
export const useFlightSearch = () => { ... }; // deveria ser useSearchTripScreenNew

// ❌ Espelhar a estrutura de pastas do legado
screens/AirSearch/containers/AirSearchContainer/...   // legado
// reescrita deveria ser screens/SearchTripScreenNew/ com a estrutura canônica

// ❌ Replicar o shape de dados interno do legado em vez de modelar o contrato novo
type Flight = LegacyFlightModel; // copiar tipo legado

// ❌ "Vou manter esse nome/estrutura pra ficar mais fácil de comparar com o legado"
```

```ts
// ✅ Extrair a regra, reimplementar com a arquitetura nova
// Legado: botão de busca só habilita com origem, destino e data preenchidos
const isFormValid = Boolean(origin && destination && departureDate);
```

## Relação com outras rules

- `.claude/rules/no-legacy-code.md` — não importar/reusar código legado (esta rule reforça: nem a estrutura/nomes).
- `.claude/rules/translations-from-legacy.md` e `.claude/rules/a11y-from-legacy.md` — as duas únicas exceções de cópia literal.
- `.claude/rules/architecture-acquisition-new.md` — a fonte de verdade de "como" o código novo é escrito.
