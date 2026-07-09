# Rule: Uma função por arquivo + constantes em `constants.ts`

## Regra

Todo arquivo de implementação em `modernization/modules/AcquisitionNew/` e em `modules/gol-sdk/src/services/acquisitionNew/` tem **no máximo uma função top-level** (declarada com `function` ou `const arrow`). Helpers privados, componentes e hooks moram **cada um em seu próprio arquivo**.

Além disso, **nenhuma constante de módulo convive com uma função**: toda `const` de nível de módulo (mapas, listas, magic values, delays, prefixos de `I18N`, objetos de estilo) vive em `constants.ts` na mesma pasta. O arquivo de implementação **importa** a constante — nunca a declara.

## O que NÃO conta (pode ficar dentro da função)

- Callbacks/arrows **inline** dentro de outra função (`useCallback`, `.map(x => ...)`, handlers locais).
- Métodos dentro de objeto literal retornado/consumido pela função.
- Tipo utilitário interno **não exportado** e local a uma função (ver `types-in-types-ts.md`).

## Por quê

- Uniformidade absoluta do módulo: abrir qualquer arquivo e encontrar exatamente uma unidade (uma função, um componente, um hook) é previsível — não precisa caçar helpers empilhados no meio de outro arquivo (mesmo objetivo de `no-comments.md`).
- Helper privado em arquivo próprio é testável isoladamente (todo `.ts` produtivo tem `__tests__/<base>.test.ts`) e reusável entre camadas.
- `constants.ts` vira a superfície de valores fixos da pasta — mudar um magic value é um diff localizado, e o arquivo da função fica só com lógica.
- Consistente com "lógica pura vai para `utils/`" (`architecture-acquisition-new.md`): quando um hook/serviço cria um helper puro, ele desce para `utils/` como arquivo próprio, não fica solto no arquivo do hook.

## Como aplicar

- Arquivo com 2+ funções top-level → dividir: cada função vira `nomeDaFuncao.ts` (utils puros) ou `use<Nome>.ts(x)` (hooks) / `<Componente>.tsx` (componentes), com seu `__tests__/<base>.test.ts`.
- Helper puro dentro de um hook → mover para `utils/<helper>.ts` e importar.
- `const` de módulo ao lado de uma função → mover para `constants.ts` da pasta e importar. Um arquivo **só-de-consts** (sem função) é permitido e esperado.
- Hooks **só** em arquivos `use<Nome>.ts(x)`.
- Atualizar o barrel (`index.ts`) ao criar os novos arquivos.

### Detecção rápida (revisão de PR / varredura)

```bash
# arquivos de implementação com 2+ funções top-level
for f in $(find modernization/modules/AcquisitionNew modules/gol-sdk/src/services/acquisitionNew \
  -type f \( -name '*.ts' -o -name '*.tsx' \) \
  | grep -v '__tests__' | grep -vE '/(types|index|constants)\.ts$' \
  | grep -vE 'Store\.ts$|adapter/adapter\.ts$'); do
  n=$(grep -cE '^(export )?(async )?const [A-Za-z0-9_]+ *= *(async )?\(|^(export )?(async )?function [A-Za-z]' "$f")
  [ "$n" -ge 2 ] && echo "$n  $f"
done

# consts de módulo (valores) convivendo com função
grep -rnE '^const [A-Za-z0-9_]+ *=|^export const [A-Z0-9_]+ *=' \
  modernization/modules/AcquisitionNew modules/gol-sdk/src/services/acquisitionNew \
  --include='*.ts' --include='*.tsx' \
  | grep -vE '__tests__|/(types|index|constants)\.ts:' \
  | grep -vE '= *\(|= *async|=>|create<|=  *use[A-Z]'
```

Cada linha que sobra (descontando as exceções abaixo) é uma violação.

## Exceções (fechadas — nada além destas)

1. **Arquivo de store** (`<Nome>NewStore.ts`) — `create` + seletores granulares + `use<Store>Service` + `INITIAL_STATE` juntos por design (ver seção de store em `architecture-acquisition-new.md`).
2. **`adapter/adapter.ts` do SDK** — objeto `adapter` + funções `to*` puras co-localizadas por design (ver `sdk-service-3-layers.md`).
3. **Tipo interno não exportado** local a uma função pode ficar inline (ver `types-in-types-ts.md`).

## Pattern correto

```ts
// utils/constants.ts
export const SHARE_MESSAGE = 'Confira este voo na GOL \n\n';

// utils/buildShareLink.ts
import {buildVooSelecionado} from './buildVooSelecionado';
import {SHARE_MESSAGE} from './constants';
export const buildShareLink = (params: BuildShareLinkParams): ShareLinkResult => { ... };

// utils/buildVooSelecionado.ts  ← helper privado em arquivo próprio
export const buildVooSelecionado = (segment: ShareLinkSegment): string => { ... };
```

## Anti-pattern

```ts
// ❌ Duas funções top-level no mesmo arquivo
const getTripPrice = (trip, hashCode) => { ... };
const toShareSegment = (trip, hashCode) => ({ ... });
export const useSuccessShare = () => { ... };

// ❌ Três formatadores empilhados num "grab-bag"
export const spellOut = (c?: string) => ...;
export const cleanDate = (d?: string) => ...;
export const formatHour = (h?: string) => ...;

// ❌ Const de módulo convivendo com a função
const FOCUS_DELAY = 300;
export const useSuccessTitleFocus = (isReady: boolean) => { ... };
// → FOCUS_DELAY vai para constants.ts; o hook importa
```

## Referência canônica

- `modernization/modules/AcquisitionNew/screens/AcquisitionSuccessScreenNew/utils/` — uma função por arquivo (`spellOut.ts`, `cleanDate.ts`, `buildVooSelecionado.ts`, `getTripPrice.ts`, `toShareSegment.ts`) + `constants.ts` para `SHARE_MESSAGE`.
- `.claude/skills/refatorar-tela-acquisition/SKILL.md` (item 8) — origem da regra.
