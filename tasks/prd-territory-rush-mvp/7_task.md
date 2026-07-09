# Tarefa 7.0: Anti-cheat básico (guarda no worker)

<critical>Ler os arquivos de prd.md e techspec.md desta pasta, se você não ler esses arquivos sua tarefa será invalidada</critical>

## Visão Geral

Adicionar a validação anti-cheat básica como guarda no pipeline: antes de casar/pontuar, a atividade passa por validadores de ritmo/velocidade, coerência entre distância×tempo×ritmo, sinal de FC (quando disponível) e origem. Atividades reprovadas são rejeitadas com motivo e não pontuam. Garante justiça mínima no ranking.

<skills>
### Conformidade com Skills Padrões

- `create-tests` e `unit-tests` — cobertura dos validadores e do gating do pipeline.
- `executar-review` — revisão pré-merge.
</skills>

<requirements>
- Módulo `anti-cheat` com validadores: velocidade/ritmo incompatíveis com corrida (indício de carro/moto), coerência distância×tempo×ritmo, FC como sinal adicional quando presente, origem da atividade (RF-10.1, RF-10.2, RF-10.3).
- Guarda no worker executando o anti-cheat **antes** do map-matching/pontuação; reprovação marca a `activity` como `rejected` com `rejection_reason`.
- Motivo de rejeição disponível ao usuário (via `GET /activities`) para transparência.
</requirements>

## Subtarefas

- [ ] 7.1 Módulo `anti-cheat`: validadores puros e composição do veredito.
- [ ] 7.2 Plugar a guarda no worker antes das etapas de matching/scoring.
- [ ] 7.3 Persistir `rejection_reason` e expor no status da atividade.

## Detalhes de Implementação

Ver `techspec.md`: "Arquitetura → Fluxo de dados" (posição do anti-cheat), "Modelos de Dados" (`activity.status`, `rejection_reason`) e PRD (RF-10). Referenciar, não duplicar.

## Critérios de Sucesso

- Atividade com velocidade/ritmo incompatível é rejeitada com motivo e não gera pontos.
- Incoerência distância×tempo×ritmo é detectada; FC é usada como sinal quando presente.
- Atividades válidas passam sem falso-positivo relevante e seguem para matching/scoring.

## Testes da Tarefa

- [ ] Testes de unidade — cada validador (ritmo/velocidade, coerência, FC, origem) e a composição do veredito.
- [ ] Testes de integração — worker rejeita atividade fraudulenta (não pontua) e aprova atividade válida, com motivo persistido.
- [ ] Testes E2E (se aplicável) — não nesta tarefa.

<critical>SEMPRE CRIE E EXECUTE OS TESTES DA TAREFA ANTES DE CONSIDERÁ-LA FINALIZADA</critical>

## Arquivos relevantes

- `apps/api/src/modules/anti-cheat/`, `apps/api/src/workers/ingest-activity/`
- `supabase/migrations/` (uso de `activity.rejection_reason`)
