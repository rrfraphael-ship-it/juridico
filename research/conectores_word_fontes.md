# Evidências de conectores e editores documentais

## Estado da sessão

- O conector **Google Workspace** está disponível na sessão, porém desabilitado.
- Não foi encontrado conector Microsoft Word/OneDrive ou Microsoft 365 pronto para uso.

## Google Docs e Google Drive

- A Google Docs API cria e modifica documentos do Google Docs, com estruturas e intervalos nomeados que podem ser associados a trechos de texto.
- A Docs API também suporta sugestões, que não alteram o texto original até aprovação.
- O Drive API armazena arquivos DOCX e usa upload resumível para arquivos maiores ou situações com maior risco de interrupção.
- Consequência arquitetural: Google é adequado a um fluxo de colaboração externa, mas exige que a plataforma trate OAuth, propriedade do arquivo, permissões e a eventual conversão entre Google Docs e DOCX.

## Microsoft 365 / Word via Microsoft Graph

- O Graph pode carregar ou substituir arquivos em OneDrive ou SharePoint e requer permissões específicas, como `Files.ReadWrite` ou `Files.ReadWrite.All`.
- Para edição com a experiência nativa do Word, a aplicação deve complementar o Graph com o mecanismo de abertura/edição do Microsoft 365; o Graph é principalmente a camada de arquivos, permissões e conteúdo.
- Consequência arquitetural: é o caminho de maior fidelidade para clientes que já são Microsoft 365, mas não é uma integração simples de “editor Word embutido”.

## OnlyOffice Docs

- O OnlyOffice incorpora um editor DOCX diretamente em uma aplicação web, oferece modos de coedição e exige que o integrador implemente `callbackUrl` para persistir alterações.
- O editor aceita configuração de usuário, templates, criação de documento e callbacks de ações.
- Consequência arquitetural: fornece maior controle de experiência dentro do ImobLegal, mas precisa de serviço de documentos hospedado e de uma implementação segura de callback e armazenamento.

## Fontes

- Google Docs API: https://developers.google.com/docs/api
- Google Drive uploads: https://developers.google.com/drive/api/guides/manage-uploads
- Microsoft Graph upload de arquivos: https://learn.microsoft.com/en-us/graph/api/driveitem-put-content
- OnlyOffice Docs API — editor: https://api.onlyoffice.com/docs/docs-api/usage-api/config/editor/
