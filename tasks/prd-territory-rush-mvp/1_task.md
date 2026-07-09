# Tarefa 1.0: Fundações do backend + Supabase + Auth + Perfil

<critical>Ler os arquivos de prd.md e techspec.md desta pasta, se você não ler esses arquivos sua tarefa será invalidada</critical>

## Visão Geral

Estabelecer a base do produto: um monólito NestJS modular (DDD/Clean Architecture) conectado ao Supabase (Postgres + PostGIS), com autenticação social (Google/Apple) via Supabase Auth e criação automática do perfil do corredor no primeiro acesso. Entrega o esqueleto sobre o qual todas as demais tarefas se apoiam.

<skills>
### Conformidade com Skills Padrões

- `create-tests` e `unit-tests` — criação e cobertura dos testes do guard de auth e do serviço de perfil.
- `executar-review` — revisão pré-merge.
- As skills e `.claude/rules` de `AcquisitionNew` (GOL) **não se aplicam**: outro stack/codebase (ver techspec, "Conformidade com Skills Padrões").
</skills>

<requirements>
- Scaffold do monólito NestJS com módulos de domínio separados (DDD/Clean Architecture) conforme lista da techspec.
- Projeto Supabase provisionado com extensão PostGIS habilitada.
- Migrações base do schema (ao menos `runner_profile` e `provider_connection`; demais tabelas nas tarefas donas).
- Login via Google e Apple (Supabase Auth) e guard que valida o JWT do Supabase e resolve o corredor da requisição (RF-1.1, RF-1.3).
- Perfil de corredor criado automaticamente no primeiro acesso.
- Regra de lint `@typescript-eslint/consistent-type-definitions` fixando `interface` só em contratos e `type` no restante (app e backend).
</requirements>

## Subtarefas

- [x] 1.1 Scaffold do monólito NestJS com a estrutura de módulos de `apps/api/src/modules` (ver techspec) e configuração de lint/tsconfig com a convenção de tipagem.
- [x] 1.2 Provisionar Supabase, habilitar PostGIS e configurar pool de conexão do NestJS.
- [x] 1.3 Criar migrações base (`runner_profile`, `provider_connection`) em `supabase/migrations/`.
- [x] 1.4 Implementar módulo `auth` (verificação de JWT do Supabase) e `profile` (criação no primeiro acesso).
- [x] 1.5 Endpoint protegido `GET /me/profile` retornando o perfil do corredor autenticado.

## Detalhes de Implementação

Ver `techspec.md`: "Arquitetura do Sistema → Visão Geral dos Componentes" (módulos `auth`, `profile`), "Modelos de Dados" (`runner_profile`, `provider_connection`) e a "Convenção de tipagem". Não duplicar aqui.

## Critérios de Sucesso

- Usuário autentica com Google e Apple e recebe um JWT válido do Supabase.
- No primeiro acesso, um registro em `runner_profile` é criado e associado ao `user_id`.
- Rota `GET /me/profile` responde 401 sem token válido e 200 com o perfil quando autenticado.
- Lint falha ao declarar um modelo/DTO com `interface` (convenção aplicada).

## Testes da Tarefa

- [x] Testes de unidade — guard de verificação de JWT (token válido/expirado/ausente) e serviço de criação de perfil (idempotência no 1º acesso).
- [x] Testes de integração — fluxo login → criação de `runner_profile` → `GET /me/profile` com Postgres de teste.
- [ ] Testes E2E (se aplicável) — não nesta tarefa.

<critical>SEMPRE CRIE E EXECUTE OS TESTES DA TAREFA ANTES DE CONSIDERÁ-LA FINALIZADA</critical>

## Arquivos relevantes

- `apps/api/src/modules/auth/`, `apps/api/src/modules/profile/`
- `supabase/migrations/` (schema base + PostGIS)
- Configuração de lint/tsconfig do monorepo
