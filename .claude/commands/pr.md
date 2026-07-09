---
model: sonnet
---

Agora é solicitado que você faça um PR. Siga estes passos cuidadosamente para completar a tarefa:

1. Primeiro, garanta que todos os testes estão funcionando para a branch atual. Execute a suíte de testes apropriada para seu projeto e confirme que todos os testes passam. Se algum teste falhar, corrija os problemas antes de prosseguir.

2. Faça commit das mudanças que você fez. Use uma mensagem de commit clara e concisa que resuma as alterações.

3. Solicite a target_branch do usuário para o PR. Use este branch como o branch base para o PR.

4. Determine o título do PR seguindo o padrão do projeto:
   a. Use Conventional Commits como prefixo (feat:, fix:, docs:, refactor:, test:, chore:, etc.)
   b. Depois do prefixo, use o nome do branch ou uma descrição em português
   c. Exemplos:
      - "feat: Story/279197/novo endpoint para cadastro de integracoes personalizadas"
      - "fix: Bug/279417/Ajuste-na-geracao-do-token-embed"
      - "docs: Atualização da documentação de APIs"
   d. Mantenha o restante do título em português

5. Use o gh cli e abra um Pull Request (PR), passando o target_branch informado pelo usuário como o branch base para o PR, junto com os detalhes da implementação:
   a. **IMPORTANTE**: Escreva toda a descrição do PR em PORTUGUÊS
   b. Inclua resumo das mudanças, funcionalidades, arquitetura, testes, e notas de deployment
   c. Use markdown para formatação clara e organizada

6. Aguarde 3 minutos e verifique comentários da ferramenta automatizada de code review. Se nenhum comentário aparecer, aguarde mais 3 minutos e verifique novamente.

7. Uma vez que você receba comentários da ferramenta automatizada de code review, analise cada comentário cuidadosamente. Determine quais comentários requerem correções e quais podem ser ignorados com segurança ou explicados. Apresente suas sugestões ao usuário e peça permissão para fazer as mudanças.

8. Para os comentários que requerem correções:
   a. Faça as mudanças necessárias no código
   b. Faça commit dessas mudanças com uma mensagem de commit clara
   c. Faça push do(s) novo(s) commit(s) para a mesma branch

9. Após abordar os comentários e fazer push das atualizações, notifique o usuário que a tarefa está completa e pronta para sua revisão final e merge manual.

REGRA DE OURO: Sempre faça commit APENAS dos arquivos que você alterou. Não use `git add .` para prevenir commits de arquivos que não deveriam ser commitados.

Seu output final deve ser uma mensagem para o usuário, formatada da seguinte forma:

<task_completion_message>
Tarefa completada:
- Testes estão passando
- Mudanças commitadas
- Card do Linear [INSERT CARD ID] movido para "In Review"
- PR aberto: [INSERT PR TITLE]
- Comentários do code review automatizado abordados e correções pushed

O PR está agora pronto para sua revisão final e merge manual.

[INSERT PR LINK]
</task_completion_message>