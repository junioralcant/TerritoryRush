# Tarefa 10.0: App mobile — Auth + conexão Strava + mapa territorial

<critical>Ler os arquivos de prd.md e techspec.md desta pasta, se você não ler esses arquivos sua tarefa será invalidada</critical>

## Visão Geral

Entregar o primeiro fluxo ponta a ponta no app (Expo/React Native): login social, conexão da conta Strava e o mapa territorial com ruas coloridas por posse (cinza/azul/vermelho) e o drawer de detalhe da rua. É o momento "abri o app e vi meu território".

<skills>
### Conformidade com Skills Padrões

- `create-tests` e `unit-tests` — cobertura de render dos estados do mapa e do fluxo de conexão.
- `executar-review` — revisão pré-merge.
- Skills de `AcquisitionNew` (GOL) **não se aplicam** (outro app/stack).
</skills>

<requirements>
- `AuthFlow`: login Google/Apple via Supabase Auth e início do OAuth Strava a partir do app (RF-1).
- `ConnectionsScreen`: conectar/desconectar Strava consumindo as APIs da 3.0.
- `MapScreen`: mapa OSM (MapLibre GL Native) consumindo `GET /streets?bbox=`, com ruas coloridas por posse e drawer de detalhe via `GET /streets/:id` (RF-5).
- Acessibilidade: estados do mapa com rótulo textual (não depender só de cor); áreas de toque adequadas; suporte a leitor de tela no drawer.
- Convenção de tipagem `interface`/`type` aplicada no app.
</requirements>

## Subtarefas

- [x] 10.1 Configuração do app Expo, cliente de API e sessão Supabase.
- [x] 10.2 `AuthFlow` (Google/Apple + início do OAuth Strava).
- [x] 10.3 `ConnectionsScreen` (conectar/desconectar Strava).
- [x] 10.4 `MapScreen` com ruas por bbox, cores de posse e drawer de detalhe.

## Detalhes de Implementação

Ver `techspec.md`: "Arquitetura → Mobile" (`AuthFlow`, `MapScreen`, `ConnectionsScreen`), "Endpoints de API" consumidos e o PRD ("Experiência do Usuário", acessibilidade). Referenciar, não duplicar.

## Critérios de Sucesso

- Usuário faz login, conecta o Strava e vê no mapa suas ruas (azul), de terceiros (vermelho) e sem dono (cinza).
- Tocar numa rua abre o drawer com dono, ranking, histórico, tempo de posse e disputas.
- Rótulos de acessibilidade presentes nos estados do mapa e no drawer.

## Testes da Tarefa

- [x] Testes de unidade — render dos três estados de rua, montagem do drawer, fluxo de conexão (API mockada na camada de rede).
- [x] Testes de integração — telas contra respostas de API de fixture.
- [ ] Testes E2E — coberto de forma consolidada na 13.0 (Playwright).

<critical>SEMPRE CRIE E EXECUTE OS TESTES DA TAREFA ANTES DE CONSIDERÁ-LA FINALIZADA</critical>

## Arquivos relevantes

- `apps/mobile/src/auth/`, `apps/mobile/src/screens/{Connections,Map}/`, `apps/mobile/src/services/api/`
