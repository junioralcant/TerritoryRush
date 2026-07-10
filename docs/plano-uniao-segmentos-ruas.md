# Plano — União de segmentos contíguos de rua (uma via = um território)

**Status:** proposta (não implementado)
**Origem:** investigação de 2026-07-10 — usuário clicou na mesma via física em dois pontos e obteve dois resultados: um trecho "Rua Primavera" (dele) e o trecho vizinho "Via sem nome (414501786)" (livre). Confirmado no banco: os dois trechos têm `ST_Intersects = true` (distância 0,0 m), um com dono e o outro livre.
**Alternativa complementar (fora deste plano):** snap-to-nearest no toque do mapa (correção de UX no app) — mitiga a percepção sem mudar o dado. Este documento cobre só a correção de **dados/modelagem**.

## Problema

Uma via física única é quebrada pelo OSM em vários *ways*. Alguns carregam a tag `name` ("Rua Primavera"); os trechos de conexão/cruzamento frequentemente **não têm nome**. Hoje a derivação agrupa ruas por `(cityId, osm_name)` e cada *way* sem nome vira uma rua própria `Via sem nome (osmId)`.

Consequências:
- Uma mesma via vira **N entidades** `street` distintas — umas nomeadas, outras "Via sem nome".
- Cada uma é **conquistável separadamente**. Correr a via inteira pode conquistar só os trechos nomeados e deixar os connectors sem nome como "livres" colados nos seus.
- UX confusa: clicar em pontos diferentes da "mesma rua" retorna donos/pontuações diferentes.

Isso hoje é **por design** — ver o comentário em `street-aggregation.ts`: *"unnamed ways get a deterministic per-way fallback so distinct physical ways are never merged"*. Este plano revisita essa decisão para o caso de segmentos **contíguos e colineares**.

## Objetivo

Fazer com que segmentos **sem nome** que sejam claramente **continuação física** de uma via nomeada sejam absorvidos por ela, de modo que **uma via = uma entidade `street` = um território**. Preservar a separação apenas quando o segmento sem nome for de fato uma via distinta (viela de serviço, ramais, etc.).

## Comportamento atual (para referência)

- **Fonte de verdade (produção):** SQL `deriveStreetsFromOsmRoads()` em `apps/api/src/modules/geo/repositories/street.repository.ts`, rodado por `npm run geo:derive` (`apps/api/src/modules/geo/derive-cli.ts`) sobre a staging `geo.osm_road`.
- **Espelho testável (JS):** `aggregateOsmRoads()` + `resolveStreetName()` em `apps/api/src/modules/geo/street-aggregation.ts` — mesmo agrupamento, unit-testado.
- **Chave de agrupamento:** `(cityId, resolvedName)`, onde `resolvedName = name ?? "Via sem nome (osmId)"`.
- **Tabela `street`:** `unique(city_id, osm_name)`, `geom geometry(MultiLineString,4326)`.

## Proposta

Adicionar uma etapa de **atribuição de nome por continuidade** antes/durante a agregação: um *way* sem nome herda o nome de uma via nomeada adjacente quando os critérios abaixo forem satisfeitos; caso contrário, mantém o fallback `Via sem nome (osmId)`.

### Regras de merge (todas precisam valer)

1. **Contiguidade:** o segmento sem nome compartilha um extremo com a via nomeada (`ST_Intersects` nos endpoints, ou `ST_DWithin <= ~2 m`).
2. **Colinearidade:** o *bearing* do segmento sem nome no ponto de junção continua o da via nomeada dentro de uma tolerância (ex.: desvio angular `<= 25–30°`). Evita fundir uma via que apenas **cruza** (interseção em T/X).
3. **Classe compatível:** mesma faixa de `highway` (ou compatível — ex.: `residential`↔`unclassified`; **nunca** fundir `service`/`footway`/`path` num `residential`).
4. **Não-ambiguidade:** se o segmento sem nome for elegível para **mais de uma** via nomeada, escolher a de **maior colinearidade**; empate → **não** fundir (mantém sem nome).

### Resultado esperado

- "Rua Primavera" absorve o connector sem nome contíguo/colinear → uma `street` só, com a geometria unida (`ST_LineMerge`/`ST_Collect`).
- Uma viela de serviço que só encosta na esquina **não** é fundida.

## Onde mexe

- **SQL `deriveStreetsFromOsmRoads` (source of truth):** adicionar CTE de atribuição de nome por continuidade (grafo de adjacência entre *ways* nomeados e sem nome; cálculo de bearing via `ST_Azimuth` nos endpoints; escolha do melhor candidato). Agrupar por `(cityId, nome_efetivo)`.
- **Espelho `aggregateOsmRoads` (`street-aggregation.ts`):** replicar a mesma regra para manter paridade e permitir unit test; ajustar/So o comentário do design.
- **Testes:** casos em `street-aggregation` — continuação colinear funde; cruzamento em T não funde; ambiguidade não funde; classe incompatível não funde. Fixtures geométricas.
- **Re-derivação:** rodar `npm run geo:derive` para regenerar `street` a partir da staging.

## Impacto e migração (crítico)

Mudar a identidade das `street` afeta tudo que referencia `street.id`:

- `activity_street.street_id`, `street.owner_user_id`, `street_score`, `street_ownership_history`, `street_ownership` (posse/ranking/histórico).
- **Risco de perder posse/pontuação** se a re-derivação recriar ids. Necessário um passo de **reconciliação**: mapear ids antigos → novo id fundido e **re-somar** pontuação/posse (a via fundida deve consolidar as pontuações dos trechos que a compõem).
- A derivação precisa continuar **idempotente** e, idealmente, **estável de id** (usar a via nomeada existente como âncora, absorvendo os trechos, em vez de recriar do zero).
- Ambiente de dev atual (São Mateus/MA, 519 ruas, 29 do usuário) serve como caso de teste da migração — validar que a posse do usuário é preservada/consolidada após re-derivar.

## Riscos / edge cases

- Fundir errado uma `service`/viela por proximidade → mitigado pela regra de classe + colinearidade.
- Vias que continuam com **nome diferente** após o cruzamento (não fundir entre nomes distintos).
- Rotatórias e loops (bearing ambíguo) → tratar como não-elegível.
- Segmento sem nome entre **duas** vias nomeadas colineares (ex.: mesmo eixo, nomes diferentes) → não fundir (ambiguidade) ou definir regra de produto.
- Custo de performance do grafo de adjacência em bases grandes (produção) — indexar `geom` (já há GiST) e limitar o join por proximidade.

## Alternativas consideradas

- **A) Snap-to-nearest no app** (priorizando ruas do usuário): resolve a percepção imediata, não muda o dado. Recomendada como paliativo imediato, independente deste plano.
- **C) Não fazer nada:** mantém a fragmentação; UX e correção do jogo permanecem prejudicadas.

## Plano de implementação (incremental)

1. Especificar tolerâncias (ângulo, distância) e a matriz de compatibilidade de `highway`.
2. Implementar a regra no espelho JS `aggregateOsmRoads` + testes unitários com fixtures geométricas.
3. Portar para o SQL `deriveStreetsFromOsmRoads` (paridade com o espelho).
4. Definir e implementar a **reconciliação** de `activity_street`/posse/score/histórico (mapa id-antigo→id-novo, consolidação de pontuação).
5. Re-derivar em dev (São Mateus/MA) e validar que a posse do usuário é preservada e que o caso "Rua Primavera + connector" vira uma rua só.
6. Rodar suíte + typecheck; documentar o novo comportamento no README do geo.

## Critérios de aceite

- Clicar em qualquer ponto da via física "Rua Primavera" (incluindo o antigo connector sem nome) retorna **a mesma** rua, com dono/pontuação consistentes.
- Uma via de serviço adjacente **continua** separada.
- Re-derivação idempotente; posse/pontuação do usuário preservadas (consolidadas) após a migração.
- Paridade entre SQL e espelho JS coberta por testes.

## Fora de escopo

- Snap-to-nearest no app (alternativa A) — item separado.
- Renomear/qualidade de dados do OSM upstream.
- Fusão entre vias de **nomes diferentes**.
