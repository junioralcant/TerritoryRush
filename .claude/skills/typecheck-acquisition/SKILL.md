---
name: typecheck-acquisition
description: "Use when the user wants to run TypeScript + ESLint checking scoped to AcquisitionNew + SDK acquisitionNew (NOT the whole project). Cria um tsconfig temporário estendendo o tsconfig.json raiz, com moduleResolution=bundler e allowJs=false, incluindo apenas modernization/modules/AcquisitionNew/**/*.{ts,tsx} e modules/gol-sdk/src/services/acquisitionNew/**/*.ts, roda npx tsc --noEmit nesse config, roda eslint --quiet nesse escopo (pega import/order e demais regras como erro) e filtra a saída para mostrar apenas erros desses paths. Trigger on: \"typecheck acquisition\", \"checar tipos do AcquisitionNew\", \"rodar tsc no AcquisitionNew\", \"validar tipos da reescrita\", \"typescript errors AcquisitionNew\", \"lint do AcquisitionNew\", \"import/order AcquisitionNew\"."
---

## When to use

O usuário quer verificar erros de TypeScript **e ESLint** (ex: `import/order`) **apenas** no escopo da reescrita:

- `modernization/modules/AcquisitionNew/`
- `modules/gol-sdk/src/services/acquisitionNew/`

Útil para validar uma fase/PR sem ruído de erros pré-existentes em outras partes do repo.

## When NOT to use

- Typecheck/lint do projeto inteiro → `npx tsc --noEmit` / `yarn lint` direto (sem essa skill)
- Checar tipos de teste específico → rodar Jest diretamente

## Procedure

Executar este script inline no Bash:

```bash
ROOT="$(pwd)"
TMP_CONFIG="$ROOT/.tsconfig.acq.tmp.json"
trap 'rm -f "$TMP_CONFIG"' EXIT

cat > "$TMP_CONFIG" <<EOF
{
  "extends": "$ROOT/tsconfig.json",
  "compilerOptions": {
    "moduleResolution": "bundler",
    "allowJs": false
  },
  "include": [
    "$ROOT/modernization/modules/AcquisitionNew/**/*.ts",
    "$ROOT/modernization/modules/AcquisitionNew/**/*.tsx",
    "$ROOT/modules/gol-sdk/src/services/acquisitionNew/**/*.ts"
  ]
}
EOF

SCOPE="modernization/modules/AcquisitionNew modules/gol-sdk/src/services/acquisitionNew"

# 1) TypeScript
TS_OUTPUT="$(npx tsc --noEmit -p "$TMP_CONFIG" 2>&1 \
  | grep -E "^(modernization/modules/AcquisitionNew|modules/gol-sdk/src/services/acquisitionNew)" \
  | grep -v "error TS7016")"

# 2) ESLint (--quiet => só erros, ignora warnings de prettier auto-fixáveis)
#    --rule import/no-duplicates: equivalente ao SonarQube S3863 ("imported multiple times"),
#    não habilitado no .eslintrc do projeto, então forçado aqui sem alterar a config global.
LINT_OUTPUT="$(npx eslint --quiet --format compact \
  --rule '{"import/no-duplicates":"error"}' $SCOPE 2>/dev/null \
  | grep -E ', (Error|Warning) -' || true)"

if [ -z "$TS_OUTPUT" ] && [ -z "$LINT_OUTPUT" ]; then
  echo "✓ Zero TS/ESLint errors in AcquisitionNew + SDK acquisitionNew"
else
  [ -n "$TS_OUTPUT" ]   && { echo "[TypeScript]"; echo "$TS_OUTPUT"; }
  [ -n "$LINT_OUTPUT" ] && { echo "[ESLint]";     echo "$LINT_OUTPUT"; }
fi
```

Notas:

- Rodar a partir da raiz do repo (`/Users/user/Workspace/GOL_APP_Mobile`). Se o cwd não for a raiz, ajustar `ROOT` para apontar para ela.
- **O tmp config precisa morar dentro do repo** (não em `/tmp/`). Caso contrário, `tsc` não resolve `node_modules/@types/{node,jest}` e aborta com TS2688 **antes** de checar qualquer arquivo — o filtro `grep` não casa nada, e o script reporta falsamente "Zero TS errors".
- `moduleResolution=bundler` + `allowJs=false` casam com a resolução real do Metro e impedem que `.js` legado seja parseado.
- Filtro `grep -v "error TS7016"`: imports de `.js` legacy via bridges (`__legacyBridge__/`, `store/use*LegacyBridge.ts`) são intencionais — `allowJs: false` os marcaria como TS7016. Filtrar evita esse ruído de bridges. Erros reais (TS2322, TS2345, TS2741, etc.) continuam aparecendo.
- **ESLint** usa `--quiet`: só conta `error` (ex: `import/order`), ignorando warnings (ex: `prettier/prettier` auto-fixável) para não virar ruído. Para auto-corrigir o que dá, pode-se rodar `npx eslint --fix $SCOPE` antes de reportar.
- O bloco `if [ -z ... ]` cobre o caso de zero erros sem mascarar falhas do `tsc`/`eslint` em si.

## Output esperado

- **Sem erros**: `✓ Zero TS/ESLint errors in AcquisitionNew + SDK acquisitionNew`
- **Com erros**: bloco `[TypeScript]` com linhas `...(L,C): error TSxxxx: ...` e/ou bloco `[ESLint]` com linhas `...: line L, col C, Error - msg (regra)`

## After running

Se houver erros, **corrigir imediatamente** sem perguntar ao usuário:

1. Para cada erro reportado, ler o arquivo afetado e aplicar a correção via `Edit`.
2. Após aplicar todas as correções, rodar o script novamente para validar que zerou.
3. Reportar ao usuário o que foi corrigido (lista curta: arquivo + descrição da correção) e o resultado final (`✓ Zero TS/ESLint errors` esperado).

Regra: a skill só termina quando o output é `✓ Zero TS/ESLint errors in AcquisitionNew + SDK acquisitionNew`. Se uma correção introduzir novo erro, corrigir também e re-rodar até estabilizar. Erros de `import/order` e afins geralmente saem com `npx eslint --fix` no arquivo/escopo.

Exceções (não corrigir automaticamente, perguntar antes):

- Erro exige decisão de produto/UX (ex: trocar contrato de API, remover prop usada em outro fluxo).
- Correção exige apagar arquivo/pasta — apagar exige confirmação do usuário (regra `no_delete_without_ask`).
- Mais de ~10 erros distintos ou erros em arquivos de domínios diferentes — pedir prioridade antes de mergulhar.
