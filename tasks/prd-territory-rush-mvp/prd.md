# PRD — Territory Rush (MVP Versão 1)

## Visão Geral

Territory Rush é um aplicativo mobile gamificado que transforma corridas reais em uma disputa por territórios no mundo real. O corredor conecta sua conta Strava ou Garmin e, a cada atividade concluída, conquista ruas, acumula pontos e disputa o domínio da sua cidade.

**Problema:** os apps de corrida atuais focam em métricas esportivas (distância, tempo, ritmo, frequência cardíaca). Depois de algum tempo, muitos corredores perdem o interesse por não existir um objetivo contínuo além de acumular quilômetros. Territory Rush adiciona uma camada de jogo sobre a corrida: cada rua pode ser conquistada, cada bairro pode ser dominado e cada corrida tem impacto direto no mapa.

**Para quem (MVP):** corredores amadores de 12 a 55 anos, usuários de Strava e Garmin, participantes de provas de rua e assessorias esportivas. Público secundário (caminhantes, trilheiros) é atendido de forma incidental, sem recursos dedicados nesta versão.

**Por que é valioso:** cria um motivo recorrente para voltar a correr — recuperar territórios perdidos, defender o que já é seu e explorar regiões novas — recompensando exploração, consistência e estratégia, não apenas volume de quilômetros.

Este PRD cobre a **Versão 1 (MVP)** completa: cadastro/login, integração Strava e Garmin, importação automática de atividades, mapa territorial, conquista de ruas, perfil do corredor, ranking municipal, notificações básicas e validação anti-cheat básica.

## Objetivos

- **Retenção como métrica-Norte:** o sucesso é medido pela frequência com que os usuários retornam ao app. Metas do MVP:
  - **Retenção D7 ≥ 35%** (usuários que voltam até o 7º dia).
  - **Retenção D30 ≥ 20%** (usuários que voltam até o 30º dia).
- **Ativação:** ≥ 70% dos novos usuários conectam pelo menos uma conta (Strava ou Garmin) e têm ao menos uma atividade importada em até 24h do cadastro.
- **Loop territorial funcionando:** ≥ 60% dos usuários ativos conquistam ao menos uma rua na primeira semana; ao menos uma disputa de território (troca de dono) ocorre por usuário ativo/mês.
- **Confiabilidade do dado:** ≥ 95% das atividades válidas importadas resultam em atualização correta de mapa e ranking; atividades fraudulentas óbvias são rejeitadas pela validação básica.
- **Objetivo de negócio:** consolidar Territory Rush como o primeiro app de corrida baseado em domínio territorial, transformando cada atividade em uma experiência competitiva e contínua.

## Histórias de Usuário

**Persona primária — Corredor amador ("Junior"):** corre 2 a 4 vezes por semana, já usa Strava/Garmin e gosta de acompanhar progresso.

- Como corredor, quero **conectar minha conta Strava/Garmin** para que minhas corridas sejam importadas automaticamente, sem registro manual.
- Como corredor, quero **ver no mapa quais ruas conquistei** depois de correr, para sentir o impacto imediato da atividade.
- Como corredor, quero **ganhar pontos por explorar ruas novas e manter sequência de dias**, para ter objetivos além da distância.
- Como corredor, quero **ser notificado quando perco uma rua** para outro corredor, para que eu volte a correr e a reconquiste.
- Como corredor, quero **ver meu ranking na cidade** e o dono de cada rua, para me comparar e disputar.

**Persona secundária — Explorador ("Carla"):** valoriza descobrir rotas novas mais do que competir.

- Como exploradora, quero **acumular pontos por visitar ruas e regiões inéditas**, para ser reconhecida no ranking de exploradores.
- Como exploradora, quero **ver meu histórico de bairros explorados** no perfil, para acompanhar minha cobertura da cidade.

**Casos de borda:**

- Como usuário, quero **entender por que uma atividade não pontuou** (ex.: rejeitada por velocidade incompatível), para confiar no sistema.
- Como usuário sem GPS confiável em parte da rota, quero que **apenas os trechos válidos sejam considerados**, sem perder a atividade inteira.

## Funcionalidades Principais

### 1. Cadastro e Login

Onboarding rápido com autenticação social. Importante para reduzir atrito de ativação.

- **RF-1.1** O sistema deve permitir cadastro/login via Google e Apple.
- **RF-1.2** O sistema deve permitir login via Strava.
- **RF-1.3** O sistema deve criar um perfil de corredor associado à conta no primeiro acesso.

### 2. Integração e Importação de Atividades (Strava e Garmin)

Base do produto: sem atividade importada, não há conquista.

- **RF-2.1** O usuário deve poder conectar e desconectar as contas Strava e Garmin.
- **RF-2.2** O sistema deve importar automaticamente novas atividades de corrida após conclusão, incluindo trajeto de GPS, distância, tempo e ritmo (e frequência cardíaca quando disponível).
- **RF-2.3** O sistema deve identificar a origem de cada atividade (Strava ou Garmin) e evitar contabilizar a mesma atividade em duplicidade.
- **RF-2.4** O usuário deve poder consultar o status de importação de suas atividades (importada, processada, rejeitada).

### 3. Conquista de Ruas e Sistema de Pontuação

Núcleo do jogo. Cada rua tem identificador, nome, cidade, proprietário atual, ranking e pontuação acumulada.

- **RF-3.1** A partir do trajeto de GPS, o sistema deve identificar as ruas percorridas na atividade.
- **RF-3.2** O sistema deve calcular pontos de **exploração**: +100 na primeira vez em uma rua; +10 em rua já conhecida.
- **RF-3.3** O sistema deve conceder pontos de **nova região**: +500 por novo bairro; +2.000 por nova cidade.
- **RF-3.4** O sistema deve conceder pontos de **consistência**: +500 por 7 dias consecutivos; +2.000 por 30 dias; +10.000 por 90 dias.
- **RF-3.5** O sistema deve conceder pontos de **defesa** por manter o domínio de uma rua: +100 (1 semana), +500 (1 mês), +2.000 (3 meses).
- **RF-3.6** O sistema deve atualizar a pontuação acumulada e o ranking de cada rua percorrida após processar a atividade.

### 4. Domínio Territorial

- **RF-4.1** Cada rua deve manter um ranking de corredores por pontuação.
- **RF-4.2** O corredor com maior pontuação em uma rua deve ser definido como proprietário atual.
- **RF-4.3** Quando outro corredor ultrapassar a pontuação do dono, a rua deve mudar de proprietário, o histórico deve ser atualizado e ambos os envolvidos devem ser notificados.

### 5. Mapa Interativo

Baseado em OpenStreetMap, é onde o impacto da corrida se torna visível.

- **RF-5.1** O mapa deve exibir as ruas com estados visuais: cinza (sem dono), azul (dominada pelo usuário), vermelho (dominada por outro corredor).
- **RF-5.2** Ao tocar em uma rua, o sistema deve exibir proprietário atual, ranking, histórico de domínio, tempo de posse e quantidade de disputas.
- **RF-5.3** O mapa deve refletir o resultado de uma atividade após seu processamento.

### 6. Perfil do Corredor

- **RF-6.1** O perfil deve exibir foto, nome e cidade.
- **RF-6.2** O perfil deve exibir ruas dominadas, bairros explorados, distância total e sequência de dias ativos.
- **RF-6.3** O perfil deve exibir ranking local e nacional do usuário.

### 7. Ranking

- **RF-7.1** O sistema deve prover ranking municipal por número de ruas dominadas (obrigatório no MVP).
- **RF-7.2** O sistema deve prover ranking de exploradores por número de ruas únicas visitadas.
- **RF-7.3** Rankings de estado e país por pontuação acumulada devem ser exibidos quando houver dado disponível.

### 8. Conquistas (Achievements)

- **RF-8.1** O sistema deve desbloquear conquistas de marcos: primeira corrida; primeira rua dominada; 10/50/100/500/1.000 ruas dominadas; 100/500/1.000 km corridos; primeiro bairro conquistado; primeira cidade explorada.
- **RF-8.2** Ao desbloquear uma conquista, o usuário deve ser notificado.

### 9. Notificações Básicas

Motor de retorno ao app.

- **RF-9.1** O sistema deve notificar: rua conquistada; rua perdida; entrada no Top 10 da cidade; novo bairro conquistado; território tomado por outro corredor; nova conquista atingida.

### 10. Validação Anti-Cheat Básica

Garante justiça mínima no ranking no MVP.

- **RF-10.1** O sistema deve validar cada atividade quanto a ritmo médio/velocidade incompatíveis com corrida (indício de carro/moto/bike) e rejeitar ou não pontuar atividades reprovadas.
- **RF-10.2** O sistema deve validar a coerência entre distância, tempo e ritmo, e usar frequência cardíaca como sinal adicional quando disponível.
- **RF-10.3** O sistema deve considerar a origem da atividade (Strava/Garmin) na validação e informar ao usuário quando uma atividade for rejeitada.

## Experiência do Usuário

- **Jornada principal:** cadastro → conexão da conta (Strava/Garmin) → corre normalmente → recebe notificação de importação/conquista → abre o app e vê o mapa atualizado com suas ruas → confere ranking e perfil → volta a correr para defender/expandir território.
- **Princípios de UX:** feedback imediato após cada atividade (o que foi conquistado e quantos pontos), leitura clara do mapa (código de cores consistente cinza/azul/vermelho) e caminho curto entre abrir o app e ver o próprio território.
- **Acessibilidade:** contraste adequado e rótulos textuais para os estados do mapa (não depender apenas de cor); suporte a leitores de tela nos fluxos de perfil, ranking e detalhes da rua; áreas de toque adequadas no mapa; textos escaláveis conforme configuração do sistema.
- **Confiabilidade percebida:** sempre explicar por que uma atividade não pontuou (validação anti-cheat), preservando confiança no ranking.

## Restrições Técnicas de Alto Nível

- **Integrações externas obrigatórias:** APIs de Strava e Garmin para autenticação e importação de atividades; arquitetura deve estar preparada para futura inclusão de COROS, Polar e Suunto.
- **Autenticação:** Google, Apple e Strava.
- **Dados geoespaciais:** base de ruas e mapa apoiados em OpenStreetMap; necessidade de processamento geoespacial (associar trajeto de GPS a ruas).
- **Privacidade e sensibilidade de dados:** dados de localização/GPS e biométricos (frequência cardíaca) são sensíveis; tratamento deve respeitar consentimento explícito na conexão de contas e legislação aplicável (ex.: LGPD/GDPR) e os termos de uso das APIs Strava/Garmin.
- **Performance:** o processamento de uma atividade e a atualização de mapa/ranking devem ocorrer em tempo hábil após a importação, sem bloquear a experiência do usuário.
- **Plataformas:** aplicativo mobile para iOS e Android.

*(Detalhes de implementação — modelagem, endpoints, algoritmos de map-matching e stack específica — pertencem à Tech Spec.)*

## Fora de Escopo

- **Monetização** (assinaturas, freemium, compras internas, anúncios) — considerada em versão futura.
- **Recursos sociais** — amigos, times, assessorias como grupos, chat, feed social e disputas por equipe.
- **Outras modalidades** — ciclismo, trilha e caminhada como categorias dedicadas com regras próprias.
- **Novos wearables** — COROS, Polar e Suunto (apenas a arquitetura fica preparada; a integração em si fica de fora).
- **Anti-cheat avançado** — detecção sofisticada de GPS falso/spoofing e machine learning de fraude; o MVP entrega apenas validação básica (RF-10).
- **Rankings de estado e país como recurso central** — presentes de forma secundária; a garantia de escopo do MVP é o ranking municipal.

*(Riscos e mitigações de implementação técnica serão detalhados na Tech Spec.)*