# Validação visual — formas de pagamento

O formulário **Dados do negócio** foi revisado em desktop e mobile no negócio existente, sem alterar campos nem criar dados de demonstração. Na seção **Condições da compra e venda**, o bloco **Formas de pagamento** está posicionado logo após o campo **Preço total**. O botão **Adicionar forma de pagamento** permanece visível e acessível nas duas larguras.

Em tela estreita, o bloco conserva a ordem de leitura: preço, explicação da discriminação dos pagamentos, ação de inclusão e, quando houver itens, seus campos de valor, descrição e remoção. A alteração continua integrada ao salvamento automático e ao tópico jurídico de preço.

Na versão publicada, o formulário exibe a seção **Formas de pagamento** na aba Dados do negócio do registro existente, com a ação **Adicionar forma de pagamento** imediatamente após o preço. A lista inicia vazia e não altera os dados comerciais até que um pagamento seja efetivamente informado.

A inspeção do formulário publicado identificou o botão interativo **Adicionar forma de pagamento** na área de condições da compra e venda, imediatamente abaixo do campo Preço total. O próximo teste é deliberadamente reversível: adicionar o item vazio e removê-lo sem informar valor ou descrição.

O teste reversível foi concluído no formulário publicado: a inclusão exibiu os campos **Valor** e **Descrição** e a ação **Remover**; em seguida, a remoção restaurou a lista vazia. Nenhum valor, descrição ou condição comercial foi informado durante essa verificação.
