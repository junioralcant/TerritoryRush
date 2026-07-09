# Tarefa 2.0: Malha viária OSM (módulo `geo`) + `GET /streets?bbox=`

<critical>Ler os arquivos de prd.md e techspec.md desta pasta, se você não ler esses arquivos sua tarefa será invalidada</critical>

## Visão Geral

Importar a rede viária do OpenStreetMap para o PostGIS e modelar a unidade territorial do jogo: a **rua nomeada agregada por cidade** (todos os segmentos com o mesmo nome numa cidade formam uma `street`). Expor a consulta espacial por bbox que alimenta o mapa. É a fonte de verdade geográfica das conquistas.

<skills>
### Conformidade com Skills Padrões

- `create-tests` e `unit-tests` — cobertura da agregação por nome/cidade e da consulta por bbox.
- `executar-review` — revisão pré-merge.
</skills>

<requirements>
- Pipeline de carga de um extrato regional do OSM para o PostGIS (`osm2pgsql`) no schema `geo`.
- Modelagem da tabela `street` como rua nomeada agregada por cidade, com `geom` MULTILINESTRING (SRID 4326) e índice GIST.
- Tratamento de vias sem nome (fallback definido) e associação de cada rua a uma cidade (`city_ref`).
- Endpoint `GET /streets?bbox=` retornando ruas dentro do bbox com estado de posse (inicialmente sem dono) (RF-5.1).
</requirements>

## Subtarefas

- [ ] 2.1 Script/rotina de importação do OSM para PostGIS e derivação das ruas nomeadas agregadas por cidade.
- [ ] 2.2 Migração das tabelas `street`, `city_ref` e schema `geo` com índices espaciais.
- [ ] 2.3 Módulo `geo`: consulta por bbox (`ST_Intersects`/índice GIST) e resolução de rua por nome+cidade.
- [ ] 2.4 Endpoint `GET /streets?bbox=` com contrato de resposta para o mapa.

## Detalhes de Implementação

Ver `techspec.md`: "Modelos de Dados" (`street`, `city_ref`, schema `geo`), "Decisões Principais" (rua nomeada agregada) e "Endpoints de API" (`GET /streets?bbox=`). Referenciar, não duplicar.

## Critérios de Sucesso

- Extrato OSM importado; ruas de uma cidade-piloto consultáveis.
- Segmentos com mesmo nome na mesma cidade colapsam em uma única `street`; vias sem nome tratadas pelo fallback.
- `GET /streets?bbox=` retorna as ruas do bbox em tempo hábil, com estado de posse.

## Testes da Tarefa

- [ ] Testes de unidade — agregação por (nome, cidade), fallback de via sem nome, montagem do contrato de resposta.
- [ ] Testes de integração — importação de um extrato pequeno + consulta por bbox contra PostGIS de teste.
- [ ] Testes E2E (se aplicável) — não nesta tarefa.

<critical>SEMPRE CRIE E EXECUTE OS TESTES DA TAREFA ANTES DE CONSIDERÁ-LA FINALIZADA</critical>

## Arquivos relevantes

- `apps/api/src/modules/geo/`
- `infra/geo/import/` (osm2pgsql), `supabase/migrations/` (schema `geo`, `street`, `city_ref`)
