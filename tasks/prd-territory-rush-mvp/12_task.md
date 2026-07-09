# Tarefa 12.0: Garmin atrás de feature flag

<critical>Ler os arquivos de prd.md e techspec.md desta pasta, se você não ler esses arquivos sua tarefa será invalidada</critical>

## Visão Geral

Implementar a integração Garmin (push-based) reutilizando o contrato de provider agnóstico já usado pelo Strava, porém **atrás de feature flag** — ligável sem redeploy quando o acesso ao programa parceiro Garmin sair. O restante do pipeline (ingestão → matching → scoring) permanece intacto.

<skills>
### Conformidade com Skills Padrões

- `create-tests` e `unit-tests` — cobertura do receiver push e do contrato de provider com a flag ligada/desligada.
- `executar-review` — revisão pré-merge.
</skills>

<requirements>
- Módulo `integrations/garmin` implementando o mesmo contrato interno de provider do Strava (atividade normalizada `ProviderActivity`).
- Receiver push-based `POST /webhooks/garmin` que valida e enfileira `IngestActivityJob` (mesmo pipeline).
- Feature flag controlando exposição/ativação da integração (desligada por padrão até aprovação parceira).
- Conectar/desconectar conta Garmin (`provider_connection` com `provider = 'garmin'`).
</requirements>

## Subtarefas

- [ ] 12.1 Contrato de provider agnóstico + normalização de atividade (`Provider`, `ProviderActivity`).
- [ ] 12.2 Módulo `integrations/garmin`: OAuth 2.0 PKCE + connect/disconnect.
- [ ] 12.3 `POST /webhooks/garmin` (push) validando e enfileirando no mesmo pipeline.
- [ ] 12.4 Feature flag (default off) gateando exposição no app e no backend.

## Detalhes de Implementação

Ver `techspec.md`: "Pontos de Integração → Garmin", "Decisões Principais" (Strava-first, Garmin atrás de flag), "Riscos Conhecidos" (programa suspenso; agregador como plano B) e "Modelos de Dados" (`provider_connection`, `IngestActivityJob`). Referenciar, não duplicar.

## Critérios de Sucesso

- Com a flag ligada, um push Garmin gera atividade que percorre o mesmo pipeline do Strava.
- Com a flag desligada, a integração fica invisível/inerte, sem afetar o fluxo Strava.
- O pipeline não precisa de mudanças para tratar a origem Garmin (contrato agnóstico).

## Testes da Tarefa

- [ ] Testes de unidade — normalização de atividade Garmin, validação do push, comportamento da flag on/off.
- [ ] Testes de integração — push Garmin → fila → pipeline (flag on); nenhum efeito com flag off (Garmin mockado).
- [ ] Testes E2E (se aplicável) — não nesta tarefa.

<critical>SEMPRE CRIE E EXECUTE OS TESTES DA TAREFA ANTES DE CONSIDERÁ-LA FINALIZADA</critical>

## Arquivos relevantes

- `apps/api/src/modules/integrations/garmin/`
- Configuração de feature flag (backend + mobile)
