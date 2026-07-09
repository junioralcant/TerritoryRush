---
name: fix-failing-tests
description: Roda os testes que estão falhando, analisa os erros e corrige os testes para fazê-los passar. Use quando o usuário pedir para rodar e ajustar testes falhos, consertar testes quebrados, ou quando testes precisam ser atualizados após mudanças de código.
---

# Fix Failing Tests

## Quando usar

- Usuário pede para rodar e ajustar testes que estão falhando
- Testes quebram após refatoração ou mudança de código de produção
- Testes precisam ser atualizados para refletir novo comportamento

## Regra de Ouro

Corrija **apenas o código de teste**. **Nunca altere código de produção**, mesmo que pareça a solução mais simples. Se a causa raiz for um bug real no código de produção, sinalize ao usuário e pare — a correção do código de produção é responsabilidade do desenvolvedor, não desta skill.

---

## Workflow

### Passo 1 — Identificar os arquivos com falha

1. Se o usuário indicar arquivos/módulos específicos, use-os diretamente.
2. Caso contrário, rode o suite completo relevante para identificar falhas:

```bash
# Testes do modernization e SDK (principal)
npx jest modernization/ modules/ --no-coverage --forceExit 2>&1 | tail -60

# Ou filtrar apenas arquivos com M (modificados) do git status
git diff --name-only | grep '__tests__' | xargs npx jest --no-coverage --forceExit 2>&1 | tail -80
```

3. Colete a lista de arquivos de teste com falha a partir da saída.

---

### Passo 2 — Rodar cada arquivo de teste individualmente

Para cada arquivo de teste com falha, rode isoladamente para obter o erro completo e limpo:

```bash
npx jest <caminho/do/arquivo.test.ts> --no-coverage --forceExit 2>&1
```

Capture e anote para cada arquivo:

- Nome do(s) `it`/`test` que falhou
- Mensagem de erro exata
- Stack trace relevante (primeiras linhas úteis)
- Tipo de falha (mock desatualizado, assertion errada, import quebrado, tipo incorreto, etc.)

---

### Passo 3 — Ler o contexto necessário

Antes de corrigir, leia:

1. O arquivo de teste com falha completo
2. O arquivo de código de produção correspondente (hook, componente, store, adapter)
3. Se o erro envolver mocks, leia os arquivos de mock (`__mocks__`, `testUtils`, `setup.ts`)
4. Se necessário, leia `.claude/skills/create-tests/SKILL.md` para padrões do projeto

---

### Passo 4 — Diagnosticar a causa raiz

Classifique cada falha em uma categoria:

| Categoria               | Sintoma típico                                                   | Ação                                               |
| ----------------------- | ---------------------------------------------------------------- | -------------------------------------------------- |
| **Mock desatualizado**  | `Cannot read property X of undefined`, mock retorna shape errada | Atualizar mock para bater com a interface atual    |
| **Assertion errada**    | `Expected X but received Y` com valor diferente do esperado      | Atualizar `expect` para o novo valor correto       |
| **Import quebrado**     | `Cannot find module`, `SyntaxError`                              | Corrigir path ou alias no import                   |
| **Tipo TypeScript**     | Erro de compilação no teste                                      | Atualizar tipos/interfaces no teste                |
| **Setup desatualizado** | Store/provider não inicializado corretamente                     | Atualizar `setup.ts` / `testUtils.tsx`             |
| **Comportamento mudou** | Lógica do hook/componente foi alterada                           | Atualizar o teste para refletir novo comportamento |
| **Bug real no código**  | Teste correto, código errado                                     | **Sinalizar ao usuário e parar** — não alterar produção |

---

### Passo 5 — Corrigir os testes

Aplique as correções seguindo os padrões do projeto:

**Regras obrigatórias:**

- Não remova cenários de teste — corrija-os
- Não use `// @ts-ignore` ou `as any` para mascarar erros de tipo — resolva o tipo correto
- Mantenha a estrutura `describe` / `it` existente
- Siga o padrão `makeSUT` do projeto (ver `.claude/skills/create-tests/SKILL.md`)
- Mocks devem usar `jest.mocked()` ou tipagem explícita, nunca cast bruto
- Para hooks: use `renderHook` + `act` do `@testing-library/react-hooks`
- Para componentes: use `render` + queries do `@testing-library/react-native`

**Path aliases válidos do projeto:**

```
@Modernization  →  ./modernization
@Checkin        →  ./src/Modules/Checkin
@gol/services   →  ./modules/gol-sdk/src/services
@gol/analytics  →  ./modules/gol-sdk/src/analytics
```

---

### Passo 6 — Verificar as correções

Após cada correção, rode o teste para confirmar que passou:

```bash
npx jest <caminho/do/arquivo.test.ts> --no-coverage --forceExit 2>&1
```

Se ainda falhar, volte ao Passo 3 para reanalisar.

---

### Passo 7 — Rodar o suite completo dos arquivos corrigidos

Após corrigir todos os arquivos individualmente, rode todos juntos para garantir que não há regressão entre eles:

```bash
npx jest <arquivo1> <arquivo2> ... --no-coverage --forceExit 2>&1 | tail -40
```

---

### Passo 8 — Relatório final

Ao concluir, reporte ao usuário:

```
## Testes corrigidos

| Arquivo | Causa | Correção aplicada |
|---------|-------|-------------------|
| path/to/file.test.ts | Mock desatualizado (shape de X mudou) | Atualizado retorno do mock para incluir campo Y |
| ... | ... | ... |

## Status
✅ Todos os X arquivos passando
```

Se algum arquivo não puder ser corrigido sem alterar código de produção, liste-o separadamente com a explicação do bug identificado para que o desenvolvedor trate a correção.

---

## Comandos de referência rápida

```bash
# Rodar um arquivo específico
npx jest <path> --no-coverage --forceExit

# Rodar com verbose para ver cada it
npx jest <path> --no-coverage --forceExit --verbose

# Rodar apenas um describe/it pelo nome
npx jest <path> --no-coverage --forceExit -t "nome do teste"

# Rodar módulo inteiro
npx jest modernization/modules/CheckIn --no-coverage --forceExit
npx jest modernization/modules/Acquisition --no-coverage --forceExit
npx jest modernization/modules/MyTrips --no-coverage --forceExit
npx jest modules/gol-sdk --no-coverage --forceExit

# Ver apenas falhas (sem logs de setup)
npx jest <path> --no-coverage --forceExit --silent 2>&1
```

## Erros comuns e soluções rápidas

### `Cannot read properties of undefined (reading 'X')`

→ Mock não retorna o objeto esperado. Verifique se o mock está retornando a estrutura correta.

### `Element type is invalid`

→ Import errado ou export não encontrado. Verifique barrel exports e path aliases.

### `Warning: An update to X inside a test was not wrapped in act(...)`

→ Envolva chamadas assíncronas em `await act(async () => { ... })`.

### `jest.fn() not called` / `Expected mock to have been called`

→ O fluxo que chama a função mudou. Atualize o cenário do teste.

### TypeScript `Type 'X' is not assignable to type 'Y'`

→ Interface mudou. Atualize o mock/dado de teste para bater com a nova tipagem.
