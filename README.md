# ROKUHARA KAGE CLAN

Central IFJ, portal dos membros e bot Discord para o **DISTRITO ROKUHARA KAGE CLAN**, com identidade laranja. O distrito usa o servidor que antes era a primeira divisão.

## Atualizar no Render

1. Publique o conteúdo desta pasta `projeto` no repositório do serviço existente. Build: `npm ci --omit=dev`. Start: `npm start`. Node 22.12 ou superior. Health check: `/health`. Execute uma instância do bot.
2. Mantenha `DATABASE_URL`, `DISCORD_TOKEN`, `SESSION_SECRET` e `APP_ORIGIN` existentes. Os IFJs e as contas continuam no mesmo banco.
3. Mantenha os antigos `DIV_1_*` até concluir a configuração inicial do SBI: eles ajudam a reconhecer os cargos e canais atuais. Instalações novas dispensam esses IDs.
4. Ative **Server Members Intent** no Developer Portal. Instale o bot com os escopos `bot` e `applications.commands`. Deixe **Interactions Endpoint URL** vazio: o projeto recebe interações pelo Gateway.
5. No servidor atual da primeira divisão, um dono/administrador Discord executa **`/criar`**. O bot reaproveita a estrutura identificada, atualiza cargos/canais, renomeia o servidor e salva os IDs no banco.
6. Confira o inventário privado retornado pelo comando e **Bot e histórico** no painel. O aviso de imigração é publicado automaticamente. Repetir `/criar` retoma uma configuração incompleta ou atualiza a existente.

O bot precisa de Gerenciar servidor para renomear, Gerenciar cargos/canais, Ver canais, Enviar mensagens, Incorporar links, Anexar arquivos, Ler histórico, Conectar e Falar. Criar convite permite salvar um convite no SBI. Coloque o cargo do bot acima dos cargos que ele gerencia. Os cargos automáticos, inclusive Equipe, devem permanecer sem Administrator ou permissões globais de gestão.

O SBI armazena servidor, cargos, canais, categorias, convite e progresso em `sbi_district`. Após a configuração, reinícios recuperam esse estado sem copiar IDs para variáveis. A segunda divisão deixa de ser um destino ativo e seus cadastros passam ao distrito único. Recursos antigos não são apagados pela migração.

## Imigração

- O embed **IMIGRAÇÃO ROKUHARA PRA DISTRITO ROKUHARA KAGE CLAN** pede o IFJ existente e o nome no Shigaku. O Discord do solicitante precisa ser o titular daquele IFJ.
- Em **Imigração**, administradores e sub líderes aprovam ou recusam com motivo. Aprovar mantém os 15 números do IFJ, atualiza o nome e o nome no Shigaku, confirma o cadastro e coloca os cargos e a carteira PNG na fila.
- A carteira é enviada somente ao privado do titular. DMs bloqueadas aparecem em **Bot e histórico**, com opção de tentar novamente após liberar mensagens.
- **Parar imigrações** bloqueia novos pedidos imediatamente e coloca a remoção dos embeds na fila. Pedidos recebidos continuam disponíveis para análise. Reiniciar ou repetir `/criar` não reabre a campanha.
- Um pedido pendente não pode ser duplicado. Se os dados do IFJ mudarem durante a análise, a aprovação exige um novo pedido.

A atualização do banco preserva IFJs, nomes, contas e senhas. Os cadastros anteriores são marcados para imigração uma única vez; a execução seguinte não desfaz aprovações. A verificação anterior continua válida enquanto os dados não forem alterados.

## Carteiras e portal

As carteiras têm brasões próprios: máscara Kage para membros, coroa com escudo RK e louros para a patente Líder, e elos entrelaçados para aliados. O brasão de Líder usa a patente exata; Sub líder e High member mantêm o brasão de membro. Cadastros do tipo aliado sempre usam o selo de aliança.

**`/ver-sua-carteira`** pode ser usado no distrito por qualquer pessoa cujo Discord tenha IFJ verificado. O comando não recebe alvo: envia somente a carteira do próprio usuário por DM. Se o privado estiver fechado, explica como liberar.

O portal fica em **`/membros`**. Cadastre IFJ e senha e confirme o código enviado ao Discord já vinculado ao cadastro. Contas anteriores mantêm a senha, usando agora o IFJ como login. O portal oferece mural oficial, busca, ficha do membro, download da própria carteira verificada e acompanhamento da imigração. A sessão do membro é independente da equipe.

Na administração, **Avisos oficiais** permite criar, editar, fixar, publicar ou salvar rascunhos. Somente os publicados aparecem para membros. Esses comunicados são do mural; o aviso de imigração do Discord é gerenciado separadamente.

## Permissões e bot

- Administrador e Sub líder têm todas as opções administrativas. Moderadores e recrutadores veem, editam e excluem seus próprios IFJs.
- `/warn`: moderadores e administradores/sub líderes ativos com Discord confirmado, além do dono/Administrator do servidor. Recrutadores não recebem essa permissão pelo vínculo.
- High member também recebe **Equipe** na sincronização. Equipe sozinho não autoriza `/warn`.
- Botões com ação do bot têm intervalo de **3 segundos por usuário**. O primeiro clique é imediato; enviar um formulário já aberto continua permitido.
- **Publicar / atualizar guia e botões** salva uma tarefa na fila e retorna ao painel. Embeds reconhecidos são editados.
- Aliança: **RYUKETSU**, convite `https://discord.gg/2xQgZQ3ZMV`. O convite antigo da HYDRA é substituído automaticamente. `RYUKETSU_INVITE_URL` é opcional para mudanças futuras.

## Inicialização

Variáveis de acesso: `NODE_ENV`, `APP_ORIGIN`, `DATABASE_URL`, `SESSION_SECRET` e, com o bot ativado, `DISCORD_TOKEN`. `INITIAL_ADMIN_USERNAME`/`INITIAL_ADMIN_PASSWORD` são necessárias apenas em um banco sem equipe. A URL PostgreSQL em produção usa `sslmode=verify-full`. O Render fornece `PORT`.

A porta HTTP abre em `0.0.0.0` durante a inicialização. As rotas do painel só são liberadas após as verificações do banco e Discord. Um HTTP 429 inicial respeita o prazo recebido e tenta novamente com um cliente novo. Durante essa espera, `/health` verifica o banco e informa `ready:false`. `/ready` só fica disponível após liberar a aplicação. Repetir deploys não encurta o prazo do Discord.

Referências: [porta do Render](https://render.com/docs/web-services#port-binding) e [interações do Discord](https://docs.discord.com/developers/interactions/receiving-and-responding).

## Verificação local

```sh
npm ci
npm test -- --test-concurrency=2
npm run check
```

Os testes usam PostgreSQL em memória (PGlite) e Discord simulado. Cobrem autorização, titularidade, privacidade, aprovação, encerramento, SBI, atualização incremental e inicialização. Não publicam em servidores reais. Consulte `VALIDACAO.md` e `../EXEMPLOS`.
