# Territory Rush

## Visão Geral

Territory Rush é um aplicativo mobile gamificado que transforma corridas reais em uma disputa por territórios no mundo real.

Os usuários conectam suas contas Strava ou Garmin e, a cada atividade concluída, conquistam ruas, acumulam pontos, desbloqueiam conquistas e competem pelo domínio da cidade.

O objetivo é criar o primeiro grande jogo de corrida baseado em território, exploração e competição individual.

---

# Slogan

Corra. Explore. Domine.

---

# Problema

Aplicativos atuais de corrida focam principalmente em métricas esportivas:

- Distância
- Tempo
- Ritmo
- Frequência cardíaca

Após algum tempo muitos corredores perdem o interesse porque não existe um objetivo contínuo além de acumular quilômetros.

Territory Rush adiciona uma camada de jogo sobre a corrida real.

Cada rua pode ser conquistada.

Cada bairro pode ser dominado.

Cada corrida possui um impacto direto no mapa.

---

# Público-Alvo

## Primário

- Corredores amadores
- Usuários Strava
- Usuários Garmin
- Assessorias esportivas
- Participantes de provas de rua

## Secundário

- Caminhantes
- Ciclistas (futuro)
- Trilheiros
- Comunidades esportivas

Faixa etária:

18 a 55 anos

---

# Diferencial

O aplicativo não recompensa apenas quem corre mais quilômetros.

Ele recompensa:

- Exploração
- Consistência
- Estratégia
- Descoberta de novas rotas
- Manutenção de territórios

---

# Integrações

## Strava

Importação automática de:

- Corridas
- GPS
- Distância
- Tempo
- Ritmo

## Garmin

Importação automática de:

- Atividades
- GPS
- Distância
- Tempo
- Frequência cardíaca

Arquitetura preparada para:

- COROS
- Polar
- Suunto

---

# Mecânica Principal

## Conquista de Ruas

Cada rua possui:

- Identificador único
- Nome
- Cidade
- Proprietário atual
- Ranking histórico
- Pontuação acumulada

Ao percorrer uma rua:

- O GPS identifica o trecho percorrido.
- O sistema calcula a pontuação.
- O ranking da rua é atualizado.
- O mapa é atualizado.

---

# Sistema de Pontuação

## Exploração

Primeira vez em uma rua:

+100 pontos

Rua já conhecida:

+10 pontos

---

## Nova Região

Novo bairro:

+500 pontos

Nova cidade:

+2.000 pontos

---

## Consistência

7 dias consecutivos:

+500 pontos

30 dias consecutivos:

+2.000 pontos

90 dias consecutivos:

+10.000 pontos

---

## Defesa

Manter domínio da rua:

1 semana:
+100 pontos

1 mês:
+500 pontos

3 meses:
+2.000 pontos

---

# Domínio Territorial

Cada rua possui um ranking.

Exemplo:

Rua Maranhão

1º Junior — 1.250 pontos 👑

2º Carlos — 1.050 pontos

3º João — 890 pontos

O corredor com maior pontuação torna-se o proprietário.

Se outro corredor ultrapassar a pontuação:

- A rua muda de dono.
- Ambos recebem notificações.
- O histórico da rua é atualizado.

---

# Mapa Interativo

Baseado em OpenStreetMap.

Estados visuais:

Cinza:
Rua sem proprietário

Azul:
Rua dominada pelo usuário

Vermelho:
Rua dominada por outro corredor

Ao clicar em uma rua:

Exibir:

- Proprietário atual
- Ranking
- Histórico de domínio
- Tempo de posse
- Quantidade de disputas

---

# Perfil do Corredor

Exibir:

- Foto
- Nome
- Cidade
- Ruas dominadas
- Bairros explorados
- Distância total
- Sequência de dias ativos
- Ranking local
- Ranking nacional

---

# Conquistas

Primeira corrida

Primeira rua dominada

10 ruas dominadas

50 ruas dominadas

100 ruas dominadas

500 ruas dominadas

1.000 ruas dominadas

100 km corridos

500 km corridos

1.000 km corridos

Primeiro bairro conquistado

Primeira cidade explorada

---

# Ranking

## Cidade

Maior número de ruas dominadas

## Estado

Maior pontuação acumulada

## País

Maior pontuação acumulada

## Exploradores

Maior número de ruas únicas visitadas

---

# Notificações

Você conquistou uma nova rua.

Você perdeu uma rua.

Você entrou no Top 10 da cidade.

Você conquistou um novo bairro.

Um corredor tomou seu território.

Você atingiu uma nova conquista.

---

# Anti-Cheat

Detectar:

- GPS falso
- GPS spoofing
- Corridas de carro
- Corridas de moto
- Velocidades incompatíveis

Validar:

- Distância
- Ritmo médio
- Tempo de atividade
- Frequência cardíaca quando disponível
- Origem da atividade (Strava ou Garmin)

---

# Tecnologias

Frontend

- React Native
- TypeScript
- Expo

Backend

- NestJS
- TypeScript

Banco

- PostgreSQL
- PostGIS

Mapas

- OpenStreetMap

Infraestrutura

- AWS

Autenticação

- Google
- Apple
- Strava

---

# MVP

## Versão 1

- Cadastro
- Login
- Integração Strava
- Integração Garmin
- Importação automática de atividades
- Mapa territorial
- Conquista de ruas
- Perfil do corredor
- Ranking municipal
- Notificações básicas

---

# Objetivo de Negócio

Criar o primeiro aplicativo de corrida baseado em domínio territorial, transformando cada atividade esportiva em uma experiência competitiva, social e contínua.

O sucesso do produto será medido pela frequência com que usuários retornam ao aplicativo para recuperar territórios perdidos, expandir sua área de domínio e explorar novas regiões.
