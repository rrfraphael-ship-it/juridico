# Referência Pipeimob — elaboração de contratos por tópicos

> Observação: a análise foi feita em uma sessão autenticada fornecida pelo usuário. Este registro descreve apenas a estrutura funcional observada e não reproduz dados pessoais, valores ou conteúdo contratual específico.

## Estrutura observada

- O negócio reúne uma esteira superior de macroetapas: início, contrato assinado, escritura, comissão, registro e entrega de chaves.
- A página principal contém uma área de **Ações rápidas**, incluindo certidões e matrículas, elaborar contratos, assinatura eletrônica, cobranças, recibos e solicitações.
- A opção **Elaborar contratos** expande alternativas de modelo, incluindo contrato personalizado e o fluxo denominado **CCV Conjurer**.
- O andamento da venda é organizado em grupos de trabalho expansíveis: documentos, contrato/sinal, escritura/financiamento, etapas finais e relacionamento.
- Dentro de contrato/sinal, a minuta do contrato, assinatura e provisionamento da comissão aparecem como tarefas separadas e com estado próprio.

## Padrões aplicáveis ao ImobLegal

- Organizar a elaboração por tópicos orientados ao contexto da operação, preservando progresso e pendências por tópico.
- Mostrar uma esteira compacta acima do editor e tarefas detalhadas abaixo, evitando que o operador perca o estado do processo.
- Tratar certidões, minuta, assinatura e comentários do cliente como camadas relacionadas, mas com ações independentes.
- Permitir mais de uma trilha/modelo de elaboração por negócio, como modelo Word, minuta personalizada e fluxo guiado por tópicos.

## Tópicos internos observados

O fluxo **CCV Conjurer** apresenta uma lista lateral de tópicos contratuais: **Partes**, **Objeto**, **Compromisso**, **Preço**, **Posse**, **Título Definitivo**, **Comissões**, **Irretratabilidade e Cominações**, **Foro e Privacidade de Dados** e **Formatações**. A estrutura funciona como um questionário contratual orientado por cláusulas, com uma região principal para o conteúdo de cada tópico.

O sistema apresenta alertas diretamente associados aos tópicos, tais como status cadastral do imóvel, inconsistência na estrutura do preço e ausência do número mínimo de testemunhas. Também há um marcador de recomendação jurídico-comercial, uma área de versões, o estado de aprovação e ações de saída para abrir no Google Docs, salvar ou gerar PDF.

## Proteções de uso observadas

Antes do avanço, a ferramenta solicita confirmação de que o operador possui conhecimento técnico-jurídico, entende que a ferramenta pode ter erros de lógica ou de cláusulas, realizará revisão profissional e não usará o recurso para casos complexos ou vendas na planta. Esse padrão reforça que o ImobLegal deve posicionar o assistente como suporte à elaboração, com validação humana obrigatória.
