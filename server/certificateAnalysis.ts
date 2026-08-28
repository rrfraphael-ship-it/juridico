import { z } from "zod";
import { invokeLLM } from "./_core/llm";
import { storageGetSignedUrl } from "./storage";

const analysisSchema = z.object({
  riskLevel: z.enum(["baixo", "moderado", "alto", "indeterminado"]),
  summary: z.string().min(1).max(2400),
  findings: z.array(z.object({
    title: z.string().min(1).max(180),
    severity: z.enum(["baixo", "moderado", "alto"]),
    detail: z.string().min(1).max(1600),
    recommendation: z.string().min(1).max(1000),
  })).max(12),
  limitations: z.string().min(1).max(1400),
});

export type CertificateAnalysis = z.infer<typeof analysisSchema>;

export function isSupportedCertificateMime(mimeType: string) {
  const normalized = mimeType.toLowerCase();
  return normalized === "application/pdf" || normalized.startsWith("image/");
}

export function parseCertificateAnalysis(raw: string) {
  return analysisSchema.parse(JSON.parse(raw));
}

export async function analyzeCertificate(input: { storageKey: string; mimeType: string; fileName: string }) {
  const mimeType = input.mimeType.toLowerCase();
  if (!isSupportedCertificateMime(mimeType)) {
    return { supported: false as const, reason: "A análise automática aceita certidões em PDF ou imagem." };
  }
  const signedUrl = await storageGetSignedUrl(input.storageKey);
  const attachment = mimeType === "application/pdf"
    ? { type: "file_url" as const, file_url: { url: signedUrl, mime_type: "application/pdf" as const } }
    : { type: "image_url" as const, image_url: { url: signedUrl, detail: "high" as const } };
  const response = await invokeLLM({
    messages: [
      { role: "system", content: "Você é um assistente de triagem documental para due diligence imobiliária no Brasil. Leia somente o conteúdo visível da certidão fornecida. Extraia sinais objetivos que mereçam revisão: restrições, pendências, datas de validade, gravames, indisponibilidades, inconsistências de identificação, processos ou informação ausente. Não afirme validade jurídica, não invente fatos, não conclua que uma operação é segura ou insegura. Se o documento estiver ilegível, incompleto ou não apresentar dados suficientes, marque risco indeterminado e explique a limitação. As recomendações devem indicar conferência humana ou documento complementar, nunca uma decisão jurídica definitiva." },
      { role: "user", content: [{ type: "text", text: `Analise a certidão "${input.fileName}" e devolva a triagem estruturada.` }, attachment] },
    ],
    response_format: {
      type: "json_schema",
      json_schema: {
        name: "certificate_risk_analysis",
        strict: true,
        schema: {
          type: "object",
          properties: {
            riskLevel: { type: "string", enum: ["baixo", "moderado", "alto", "indeterminado"] },
            summary: { type: "string" },
            findings: { type: "array", items: { type: "object", properties: { title: { type: "string" }, severity: { type: "string", enum: ["baixo", "moderado", "alto"] }, detail: { type: "string" }, recommendation: { type: "string" } }, required: ["title", "severity", "detail", "recommendation"], additionalProperties: false } },
            limitations: { type: "string" },
          },
          required: ["riskLevel", "summary", "findings", "limitations"],
          additionalProperties: false,
        },
      },
    },
    max_tokens: 1800,
  });
  const raw = response.choices[0]?.message?.content;
  if (typeof raw !== "string") throw new Error("A análise não retornou conteúdo estruturado.");
  return { supported: true as const, analysis: parseCertificateAnalysis(raw) };
}
