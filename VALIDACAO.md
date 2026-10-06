# Validação · ROKUHARA KAGE CLAN

Verificado localmente em **05/10/2026**.

- **129 testes automatizados aprovados, zero falhas**: `node --test --test-concurrency=2`.
- Sintaxe conferida em **39 arquivos JavaScript** de `src`, `public` e `scripts`, além do assistente offline.
- Banco de testes PGlite: atualização de cadastros das duas divisões para um distrito único, preservação dos IFJs e senhas, compatibilidade com contas antigas com username obrigatório e repetição da migração sem desfazer aprovações.
- Discord simulado: comando de carteira sem seleção de terceiros, verificação do titular, PNG por DM, tratamento de privado bloqueado e liberação após falha; intervalo de 3 segundos por usuário sem bloquear formulários.
- Imigração: publicação/edição do mesmo aviso, recusa de IFJ de outra pessoa, pedido sem duplicação, permissão administrativa, preservação do IFJ na aprovação, rejeição de dados desatualizados, fila privada, encerramento imediato dos pedidos e remoção dos embeds sem reabrir no próximo publish.
- SBI: criação e reaproveitamento de recursos, cores do distrito, progresso salvo após falha parcial, reinício, autorização e exclusão mútua de configuração.
- Render/Discord: porta de estado antes de ativar a aplicação, 429 inicial com espera e cliente novo, saúde dependente do banco durante a espera, cancelamento e preservação do prazo informado.
- Aliança Ryuketsu: convite atualizado inclusive quando a variável antiga ainda guarda o convite padrão da HYDRA.

## Navegador

Edge automatizado, com a aplicação real e banco PGlite local; Discord substituído por envio simulado. Nenhuma credencial de produção foi utilizada.

- Administração: publicar/fixar avisos, trocar entre Meu Discord e categorias, aprovar imigração, parar a campanha e enfileirar atualização dos painéis.
- Membros: cadastrar com IFJ e código privado, abrir mural, buscar comunicados, consultar e baixar a própria carteira, atualizar dados e acompanhar aprovação.
- Desktop em 1440 px e celular em 390 px: sem erros JavaScript ou transbordamento horizontal nos fluxos conferidos.
- Assistente offline: as nove etapas essenciais concluídas no navegador, sem solicitar IDs de cargos/canais.
- Carteira e capturas novas inspecionadas visualmente.

As capturas em `../EXEMPLOS` usam dados fictícios. Esta validação não executou deploy no Render nem alterou o servidor Discord real. A atualização pública depende de publicar esta pasta e executar `/criar` no servidor atual da primeira divisão.

## Revisão dos brasões · 06/10/2026

- `node --test test/identity.test.js`: 3 testes aprovados, sem falhas, incluindo geração PNG com os textos no tamanho máximo.
- `node --check src/cards.js` e `node --check src/card-crests.js`: aprovados.
- Carteiras de membro, Líder e aliado regeneradas. Líder e aliado inspecionados visualmente, sem cortes ou sobreposição com os dados.
- Coroa exclusiva da patente exata Líder; o tipo aliado tem prioridade sobre a patente. Regras de acesso não foram alteradas.
- Pacote completo atualizado em `ROKUHARA-KAGE-CLAN-atualizado-2026-10-06.zip`, incluindo a logo do servidor e as novas prévias.
