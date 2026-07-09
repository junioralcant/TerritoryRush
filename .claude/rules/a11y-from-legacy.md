# Rule: A11y vinda do legacy

## Regra

Em reescritas de tela, as props de acessibilidade (`accessibilityHint`, `accessibilityLabel`, `accessibilityRole`, `testID`, `accessible`) devem ser **copiadas da tela legacy correspondente**. Não inventar rótulos, dicas, roles nem testIDs.

## Por quê

- A11y do legacy foi testada com VoiceOver/TalkBack e auditada — reescrever cria regressão silenciosa.
- `testID` consistente garante que os testes existentes (e o que vamos escrever no padrão MSW) continuam funcionando.
- Mudar a11y "de passagem" mascara o motivo da reescrita (a UI muda; a a11y não deveria).

## Como aplicar

1. Abrir o componente legacy correspondente.
2. Listar todas as props a11y/`testID` usadas em cada elemento interativo.
3. Para cada elemento equivalente na nova tela, **copiar exatamente** essas props.
4. As strings de a11y vêm do i18n no subnamespace `A11y` — manter as mesmas chaves (ver `.claude/rules/translations-from-legacy.md`).

## Pattern correto

```tsx
// Legacy
<Button
  testID="btn_search"
  accessibilityLabel="Buscar voos"
  accessibilityHint="Inicia a busca por voos disponíveis"
  accessibilityRole="button"
/>

// Reescrito (idêntico nas props a11y; UI pode usar TgrButtonPrimary)
<TgrButtonPrimary
  testID="btn_search"
  accessibilityLabel={translate('AcquisitionNew.AirSearchScreen.A11y.SearchButtonLabel')}
  accessibilityHint={translate('AcquisitionNew.AirSearchScreen.A11y.SearchButtonHint')}
  accessibilityRole="button"
  label={translate('AcquisitionNew.AirSearchScreen.Search')}
/>
```

## Anti-pattern

- Inventar `testID="search-btn-new"` quando o legacy usa `btn_search` → testes de paridade falham
- Trocar `accessibilityHint` por uma versão "melhor"
- Omitir `accessibilityRole` "porque é óbvio pelo componente"
- Mudar a string e deixar a chave i18n antiga → divergência silenciosa
