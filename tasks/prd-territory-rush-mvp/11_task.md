# Tarefa 11.0: App mobile — perfil, ranking, conquistas, central de notificações

<critical>Ler os arquivos de prd.md e techspec.md desta pasta, se você não ler esses arquivos sua tarefa será invalidada</critical>

## Visão Geral

Completar a experiência mobile com as telas de identidade e competição: perfil do corredor com agregados, rankings (municipal e exploradores), lista de conquistas e a central de notificações. Fecha a jornada de comparação e retorno ao app.

<skills>
### Conformidade com Skills Padrões

- `create-tests` e `unit-tests` — cobertura de render por dados de API e navegação.
- `executar-review` — revisão pré-merge.
- Skills de `AcquisitionNew` (GOL) **não se aplicam** (outro app/stack).
</skills>

<requirements>
- `ProfileScreen`: foto, nome, cidade, ruas dominadas, bairros explorados, distância total, streak, ranking local e nacional (RF-6).
- `RankingScreen`: leaderboard municipal (ruas dominadas) e de exploradores (ruas únicas); estado/país quando houver dado (RF-7).
- `AchievementsScreen`: conquistas desbloqueadas e pendentes (RF-8).
- `NotificationsCenter`: histórico de notificações + marcação de lidas, consumindo `GET /me/notifications` (RF-9).
- Acessibilidade e convenção de tipagem `interface`/`type` aplicadas.
</requirements>

## Subtarefas

- [ ] 11.1 `ProfileScreen` consumindo `GET /me/profile`.
- [ ] 11.2 `RankingScreen` (cidade + exploradores).
- [ ] 11.3 `AchievementsScreen` consumindo `GET /me/achievements`.
- [ ] 11.4 `NotificationsCenter` consumindo `GET /me/notifications` + recebimento de push.

## Detalhes de Implementação

Ver `techspec.md`: "Arquitetura → Mobile" (telas), "Endpoints de API" consumidos e PRD (RF-6, RF-7, RF-8, RF-9 + acessibilidade). Referenciar, não duplicar.

## Critérios de Sucesso

- Perfil exibe todos os agregados do PRD; rankings ordenados corretamente.
- Conquistas mostram estado desbloqueado/pendente; notificações listadas e marcáveis como lidas.
- Push recebido abre o contexto correto no app.

## Testes da Tarefa

- [ ] Testes de unidade — render de cada tela por dados de API de fixture e navegação entre elas.
- [ ] Testes de integração — telas contra respostas de API semeadas.
- [ ] Testes E2E — coberto de forma consolidada na 13.0 (Playwright).

<critical>SEMPRE CRIE E EXECUTE OS TESTES DA TAREFA ANTES DE CONSIDERÁ-LA FINALIZADA</critical>

## Arquivos relevantes

- `apps/mobile/src/screens/{Profile,Ranking,Achievements,Notifications}/`
