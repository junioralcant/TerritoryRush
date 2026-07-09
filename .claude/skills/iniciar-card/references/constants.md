# Constantes — iniciar-card

Valores **padrão** (defaults). Se não baterem com o ambiente, resolver dinamicamente
(ex.: `getAccessibleAtlassianResources` para o `cloudId`) em vez de assumir cegamente.

## Jira (cards)
- Base: `https://smiles.atlassian.net`
- `cloudId` padrão (MCP Atlassian): `713b4d5a-0e95-4420-87ae-be0166579b03`
- Link do card: `https://smiles.atlassian.net/browse/<CHAVE>` (ex.: `CDQED-274`)
- Formato de chave: `[A-Z]+-\d+`

## Branches
- Padrão de branch de issue: `bot/issue/is#<CHAVE-DO-CARD>` (a chave do card aparece após o `#`).
- A correspondência por chave (`*<CHAVE>*`) também cobre outros prefixos (`bot/bug/`, `bot/feature/`, etc.).
