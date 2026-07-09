# Tarefa 13.0: Endurecimento — E2E (Playwright) + observabilidade

<critical>Ler os arquivos de prd.md e techspec.md desta pasta, se você não ler esses arquivos sua tarefa será invalidada</critical>

## Visão Geral

Consolidar a qualidade do MVP: testes ponta a ponta com Playwright cobrindo os fluxos-chave (frontend + backend) e a camada de observabilidade (logs estruturados, métricas Prometheus, Sentry). Garante que o loop completo funciona e é monitorável antes do lançamento.

<skills>
### Conformidade com Skills Padrões

- `create-tests` e `unit-tests` — suporte à estratégia de testes.
- `executar-review` — revisão pré-merge final.
</skills>

<requirements>
- Suíte E2E com **Playwright** exercitando frontend + backend: conectar Strava → atividade processada → ruas conquistadas no mapa → detalhe da rua → perfil e ranking municipal → notificação de troca de domínio (via seed de atividade de outro corredor).
- Observabilidade nova (não há Grafana existente): logs estruturados (pino/Nest Logger) com correlação por `activityId`, endpoint `/metrics` Prometheus e Sentry para erros.
- Métricas expostas: duração do job de ingestão, latência do OSRM `/match`, taxa de rejeição anti-cheat, hits de rate limit Strava, profundidade/idade da fila, trocas de domínio.
- Validação dos alvos de confiabilidade do PRD (≥ 95% das atividades válidas atualizam mapa/ranking).
</requirements>

## Subtarefas

- [x] 13.1 Configurar Playwright e ambiente E2E (API + app + serviços de apoio com dados semeados).
- [x] 13.2 Fluxos E2E dos caminhos-chave do PRD.
- [x] 13.3 Logs estruturados + correlação e integração com Sentry.
- [x] 13.4 Endpoint `/metrics` Prometheus com as métricas da techspec.

## Detalhes de Implementação

Ver `techspec.md`: "Abordagem de Testes → Testes de E2E", "Monitoramento e Observabilidade" e o PRD ("Objetivos" — confiabilidade/retenção). Referenciar, não duplicar.

## Critérios de Sucesso

- Suíte Playwright verde cobrindo os fluxos-chave ponta a ponta.
- `/metrics` expõe as métricas listadas; erros chegam ao Sentry; logs correlacionáveis por atividade.
- Loop completo validado (atividade válida → mapa/ranking/notificação corretos).

## Testes da Tarefa

- [x] Testes de unidade — utilitários de instrumentação/formatação de métricas e logs.
- [x] Testes de integração — smoke do endpoint `/metrics` e emissão de logs/erros.
- [x] Testes E2E — fluxos-chave em Playwright (frontend + backend).

<critical>SEMPRE CRIE E EXECUTE OS TESTES DA TAREFA ANTES DE CONSIDERÁ-LA FINALIZADA</critical>

## Arquivos relevantes

- `e2e/` (Playwright), `apps/api/src/observability/`
- Configuração de Sentry e endpoint `/metrics`
