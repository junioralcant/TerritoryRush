# Tecnologias

## Frontend

- React Native
- TypeScript
- Expo

## Backend

- NestJS
- TypeScript

## Banco de Dados

- Supabase
- PostgreSQL
- PostGIS

## Supabase

Utilizar o Supabase como camada principal para:

- Autenticação
- Banco PostgreSQL
- Storage de imagens
- Realtime para atualizações futuras
- Gerenciamento inicial da infraestrutura

## Mapas

- OpenStreetMap

## Infraestrutura

- Supabase
- Backend NestJS hospedado separadamente

## Autenticação

- Supabase Auth
- Login com Google
- Login com Apple
- Login com Strava

## Integrações Esportivas

- Strava
- Garmin

# Arquitetura do Sistema

## Estratégia Inicial

O Territory Rush será desenvolvido inicialmente utilizando uma arquitetura monolítica.

O objetivo é acelerar o desenvolvimento do produto, reduzir a complexidade operacional e validar rapidamente as hipóteses de negócio do MVP.

Neste estágio, a prioridade é velocidade de entrega, facilidade de manutenção e simplicidade da infraestrutura.

---

## Arquitetura Monolítica

Todo o backend será desenvolvido em uma única aplicação NestJS contendo:

- Autenticação
- Usuários
- Perfis
- Integrações Strava
- Integrações Garmin
- Processamento de atividades
- Sistema de pontuação
- Domínio territorial
- Rankings
- Conquistas
- Notificações

Os módulos serão separados internamente seguindo princípios de Domain-Driven Design (DDD) e Clean Architecture, permitindo futura extração para microsserviços caso necessário.

---

## Banco de Dados

Utilizar um único banco de dados PostgreSQL hospedado no Supabase.

Extensões utilizadas:

- PostGIS para processamento geoespacial
- Realtime (uso futuro)
- Storage para imagens de perfil e assets

---

## Escalabilidade Futura

A arquitetura deverá ser preparada para evolução gradual.

Caso o crescimento da plataforma exija maior escalabilidade, alguns módulos poderão ser extraídos para serviços independentes, como:

- Processamento de atividades GPS
- Sistema de rankings
- Notificações
- Integrações esportivas
- Motor de cálculo territorial

Entretanto, microsserviços não fazem parte da estratégia inicial.

---

## Princípio de Arquitetura

"Monólito primeiro, microsserviços quando houver necessidade real."

O sucesso do produto será validado antes de qualquer aumento de complexidade arquitetural.
