# Tarefa 9.0: Conquistas + notificações (Expo Push)

<critical>Ler os arquivos de prd.md e techspec.md desta pasta, se você não ler esses arquivos sua tarefa será invalidada</critical>

## Visão Geral

Fechar o loop de engajamento: desbloquear conquistas de marcos e disparar notificações push (Expo) para os eventos que trazem o corredor de volta (rua conquistada/perdida, top 10 da cidade, novo bairro, território tomado, nova conquista). Alimenta a métrica-Norte de retenção.

<skills>
### Conformidade com Skills Padrões

- `create-tests` e `unit-tests` — cobertura das regras de desbloqueio e do despacho de push (Expo mockado).
- `executar-review` — revisão pré-merge.
</skills>

<requirements>
- Módulo `achievements`: catálogo (`achievement`) e desbloqueio de marcos — primeira corrida; primeira rua; 10/50/100/500/1.000 ruas; 100/500/1.000 km; primeiro bairro; primeira cidade (RF-8.1).
- Módulo `notifications`: enfileiramento e despacho via Expo Push, com registro em `notification`; falha de push é não-bloqueante (retry) (RF-8.2, RF-9.1).
- Eventos cobertos: rua conquistada, rua perdida, entrada no Top 10 da cidade, novo bairro, território tomado por outro corredor, nova conquista.
- Registro do device token no login para envio do push.
</requirements>

## Subtarefas

- [ ] 9.1 Módulo `achievements`: catálogo + regras de desbloqueio disparadas após o processamento da atividade.
- [ ] 9.2 Módulo `notifications`: geração de eventos + cliente Expo Push com retry não-bloqueante.
- [ ] 9.3 Registro/atualização do device token e persistência de `notification`.
- [ ] 9.4 `GET /me/achievements` e `GET /me/notifications`.

## Detalhes de Implementação

Ver `techspec.md`: "Arquitetura → notifications/achievements", "Modelos de Dados" (`achievement`, `runner_achievement`, `notification`), "Endpoints de API" e "Pontos de Integração → Expo Push". Referenciar, não duplicar.

## Critérios de Sucesso

- Marcos são desbloqueados uma única vez e notificados.
- Os seis eventos do PRD geram push corretamente; falha de envio não quebra o pipeline.
- `GET /me/achievements` e `GET /me/notifications` refletem o estado do corredor.

## Testes da Tarefa

- [ ] Testes de unidade — regras de desbloqueio (idempotência), geração de eventos e despacho de push (Expo mockado).
- [ ] Testes de integração — atividade processada → conquista desbloqueada + notificação registrada + push enfileirado.
- [ ] Testes E2E (se aplicável) — não nesta tarefa (central de notificações coberta em 11.0).

<critical>SEMPRE CRIE E EXECUTE OS TESTES DA TAREFA ANTES DE CONSIDERÁ-LA FINALIZADA</critical>

## Arquivos relevantes

- `apps/api/src/modules/{achievements,notifications}/`
- `supabase/migrations/` (`achievement`, `runner_achievement`, `notification`)
