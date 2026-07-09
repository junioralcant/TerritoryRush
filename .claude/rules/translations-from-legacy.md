# Rule: Translations vindas do legacy

## Regra

Quando uma tela do AcquisitionNew é **reescrita** de uma tela legacy, as chaves e textos i18n devem ser **copiados idênticos** do legacy. Não inventar novas chaves nem reescrever textos.

## Por quê

- O texto legacy passou por revisão de UX/legal/i18n; reescrever cria divergência sem ganho.
- Manter chaves idênticas facilita rastrear cobertura entre legacy e novo durante a transição.
- Se o texto está ruim, abrir um item separado com UX — não corrigir "de passagem" na reescrita.

## Como aplicar

1. Localizar a tela legacy correspondente em `legacy/` (ou onde quer que viva).
2. Listar **todas** as chaves usadas (`translate('X.Y.Z')`).
3. Para cada chave, copiar **valor idêntico** nos 3 idiomas (`en.json`, `es.json`, `pt-BR.json`).
4. Manter a mesma **estrutura semântica do path** quando possível, ajustando apenas o prefixo para o namespace `AcquisitionNew.{Screen}.{...}`.
5. Subnamespace `A11y` para labels de acessibilidade (também copiadas do legacy — ver `.claude/rules/a11y-from-legacy.md`).

## Pattern correto

```jsonc
// translations/SearchTripScreenNew/pt-BR.json
{
  "AirSearchScreen": {
    "Title": "Comprar passagem",
    "A11y": {
      "ScreenAnnounced": "Tela de busca de voos",
      "SwapHint": "Trocar origem e destino"
    }
  }
}
```

Registrar via `loadAcquisitionNewTranslations()` em `translations/index.ts`.

## Anti-pattern

- "Vou simplificar esse texto, soa formal demais" → não, criar item separado com UX
- Inventar `OriginText1`, `OriginText2` → usar caminhos semânticos (`OriginSelect.Label`, `OriginSelect.Placeholder`)
- Pular idioma — todas as chaves devem existir em en/es/pt-BR
- Texto diferente do legacy "porque é mais bonito"
