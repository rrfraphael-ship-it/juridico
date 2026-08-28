import type { GuidedTopic } from "./contractTopics";

export function buildTopicRewritePrompt(input: { topic: GuidedTopic; operatorNote?: string; diligenceSummary: string }) {
  return `Você é um assistente de redação jurídica imobiliária. Produza uma SUGESTÃO de mesclagem para somente o tópico "${input.topic.title}". O operador decidirá depois se aplica ou descarta a sugestão.

CLÁUSULA-BASE A PRESERVAR:
${input.topic.baseContent.slice(0, 15000)}

TEXTO ATUAL EDITÁVEL DA MINUTA:
${input.topic.content.slice(0, 15000)}

DADOS DO NEGÓCIO RELEVANTES A ESTE TÓPICO:
${input.topic.businessContext.slice(0, 8000)}

SÍNTESE DA DILIGÊNCIA:
${input.diligenceSummary || "Nenhuma evidência adicional disponível."}

ORIENTAÇÃO OPCIONAL DO OPERADOR:
${input.operatorNote?.trim() || "Nenhuma orientação adicional."}

Regras obrigatórias: preserve títulos, numeração, estrutura, salvaguardas jurídicas, coerência e linguagem da cláusula-base. Altere somente trechos diretamente afetados por dados explicitamente informados e pela orientação do operador. Não invente nomes, valores, datas, documentos, prazos ou condições. Não elimine proteções, obrigações, penalidades ou ressalvas sem base expressa nos dados. Se não houver informação negociada aplicável, mantenha o texto atual. Quando faltar dado material, indique que a confirmação jurídica é necessária dentro do próprio tópico. Não produza parecer, recomendação, título adicional ou texto fora do tópico.

Retorne JSON estrito no formato {"content":"texto jurídico sugerido","status":"preenchido|atencao|pendente","summary":"resumo objetivo das alterações"}.`;
}

export function parseTopicRewrite(content: string, fallback: GuidedTopic) {
  const parsed = JSON.parse(content) as { content?: unknown; status?: unknown; summary?: unknown };
  if (typeof parsed.content !== "string" || !parsed.content.trim()) throw new Error("A IA não retornou um texto válido para o tópico.");
  const status = parsed.status === "preenchido" || parsed.status === "atencao" || parsed.status === "pendente" ? parsed.status : fallback.status;
  return { content: parsed.content.trim(), status, summary: typeof parsed.summary === "string" ? parsed.summary.trim() : "Sugestão gerada a partir dos Dados do negócio." };
}
