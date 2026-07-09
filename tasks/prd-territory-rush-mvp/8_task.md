# Tarefa 8.0: APIs de leitura — detalhe da rua + perfil + rankings

<critical>Ler os arquivos de prd.md e techspec.md desta pasta, se você não ler esses arquivos sua tarefa será invalidada</critical>

## Visão Geral

Expor as APIs de leitura que o app consome para mostrar o estado do jogo: detalhe da rua (dono, ranking, histórico, tempo de posse, disputas), perfil com agregados e leaderboards municipal e de exploradores. Torna visível o resultado do pipeline.

<skills>
### Conformidade com Skills Padrões

- `create-tests` e `unit-tests` — cobertura dos contratos de resposta e do cálculo de agregados/leaderboards.
- `executar-review` — revisão pré-merge.
</skills>

<requirements>
- `GET /streets/:id` — proprietário atual, ranking, histórico de domínio, tempo de posse e quantidade de disputas (RF-5.2).
- `GET /me/profile` — foto, nome, cidade, ruas dominadas, bairros explorados, distância total, streak, ranking local e nacional (RF-6).
- `GET /rankings/city/:cityId` (ruas dominadas) e `GET /rankings/explorers` (ruas únicas visitadas); estado/país exibidos quando houver dado (RF-7).
- Leaderboards via materialized views para performance de leitura.
</requirements>

## Subtarefas

- [x] 8.1 Endpoint `GET /streets/:id` com detalhe completo da rua.
- [x] 8.2 Enriquecer `GET /me/profile` com os agregados do corredor.
- [x] 8.3 Módulo `rankings`: materialized views + endpoints de cidade e exploradores.
- [x] 8.4 Estratégia de atualização/refresh das materialized views.

## Detalhes de Implementação

Ver `techspec.md`: "Endpoints de API" (`/streets/:id`, `/me/profile`, `/rankings/*`), "Modelos de Dados" (`street`, `street_score`, `street_ownership_history`, `runner_profile`) e "Arquitetura → rankings". Referenciar, não duplicar.

## Critérios de Sucesso

- `GET /streets/:id` retorna dono, ranking ordenado, histórico, tempo de posse e disputas.
- `GET /me/profile` traz todos os agregados exigidos pelo PRD.
- Rankings municipal e de exploradores retornam ordenação correta e em tempo hábil.

## Testes da Tarefa

- [x] Testes de unidade — montagem dos contratos de resposta e cálculo dos agregados/ordenções.
- [x] Testes de integração — endpoints contra dados semeados no Postgres de teste, incluindo refresh das materialized views.
- [ ] Testes E2E (se aplicável) — não nesta tarefa (telas cobertas em 10.0/11.0).

<critical>SEMPRE CRIE E EXECUTE OS TESTES DA TAREFA ANTES DE CONSIDERÁ-LA FINALIZADA</critical>

## Arquivos relevantes

- `apps/api/src/modules/{territory,profile,rankings}/`
- `supabase/migrations/` (materialized views de ranking)
