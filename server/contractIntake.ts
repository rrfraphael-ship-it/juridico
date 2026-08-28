import { z } from "zod";

export const contractPartySchema = z.object({
  name: z.string().trim().min(3).max(180),
  document: z.string().trim().min(5).max(40),
  maritalStatus: z.string().trim().min(3).max(80),
  occupation: z.string().trim().min(2).max(120),
  address: z.string().trim().min(8).max(280),
  email: z.string().email(),
  phone: z.string().trim().min(8).max(40),
});

export const contractPartnerSchema = contractPartySchema.extend({
  commissionAmount: z.coerce.number().nonnegative(),
});

export const paymentEntrySchema = z.object({
  amount: z.coerce.number().positive(),
  description: z.string().trim().min(3).max(1000),
});

const commonSchema = z.object({
  propertyAddress: z.string().trim().min(8).max(280),
  registryNumber: z.string().trim().min(2).max(100),
  registryOffice: z.string().trim().min(2).max(180),
  city: z.string().trim().min(2).max(120),
  state: z.string().trim().length(2),
  forumCity: z.string().trim().min(2).max(120),
  sellerOrLandlord: contractPartySchema,
  buyerOrTenant: contractPartySchema,
  sellers: z.array(contractPartySchema).min(1).optional(),
  buyers: z.array(contractPartySchema).min(1).optional(),
  partners: z.array(contractPartnerSchema).optional(),
});

export const saleContractDataSchema = commonSchema.extend({
  transactionType: z.literal("venda"),
  price: z.coerce.number().positive(),
  paymentEntries: z.array(paymentEntrySchema).optional(),
  paymentMethod: z.string().trim().min(3).max(100),
  paymentSchedule: z.string().trim().min(8).max(3000),
  depositAmount: z.coerce.number().nonnegative(),
  possessionDate: z.string().date(),
  deedDeadline: z.string().date(),
  commissionAmount: z.coerce.number().nonnegative(),
  commissionPayer: z.string().trim().min(3).max(180),
  conditions: z.string().trim().min(3).max(3000),
});

export const rentalContractDataSchema = commonSchema.extend({
  transactionType: z.literal("locacao"),
  rentAmount: z.coerce.number().positive(),
  termMonths: z.coerce.number().int().min(1).max(240),
  startDate: z.string().date(),
  paymentDueDay: z.coerce.number().int().min(1).max(28),
  adjustmentIndex: z.string().trim().min(2).max(50),
  guaranteeType: z.string().trim().min(3).max(100),
  condoResponsibility: z.string().trim().min(3).max(300),
  iptuResponsibility: z.string().trim().min(3).max(300),
  specialConditions: z.string().trim().min(3).max(3000),
});

export const otherContractDataSchema = commonSchema.extend({
  transactionType: z.literal("outro"),
  commercialTerms: z.string().trim().min(12).max(5000),
  specialConditions: z.string().trim().min(3).max(3000),
});

export const contractDataSchema = z.discriminatedUnion("transactionType", [saleContractDataSchema, rentalContractDataSchema, otherContractDataSchema]);
export type ContractData = z.infer<typeof contractDataSchema>;

export const strictIntakeSubmissionSchema = z.object({
  token: z.string().min(12),
  contractData: contractDataSchema,
});

const draftPartySchema = z.object({
  name: z.string().max(180).optional(),
  document: z.string().max(40).optional(),
  maritalStatus: z.string().max(80).optional(),
  occupation: z.string().max(120).optional(),
  address: z.string().max(280).optional(),
  email: z.string().max(320).optional(),
  phone: z.string().max(40).optional(),
});

const draftPartnerSchema = draftPartySchema.extend({
  commissionAmount: z.coerce.number().finite().nonnegative().optional(),
});

const draftCommonSchema = z.object({
  transactionType: z.enum(["venda", "locacao", "outro"]),
  propertyAddress: z.string().max(280).optional(),
  registryNumber: z.string().max(100).optional(),
  registryOffice: z.string().max(180).optional(),
  city: z.string().max(120).optional(),
  state: z.string().max(2).optional(),
  forumCity: z.string().max(120).optional(),
  sellerOrLandlord: draftPartySchema.optional(),
  buyerOrTenant: draftPartySchema.optional(),
  sellers: z.array(draftPartySchema).optional(),
  buyers: z.array(draftPartySchema).optional(),
  partners: z.array(draftPartnerSchema).optional(),
});

const draftNumericField = z.coerce.number().finite().optional();
const draftPaymentEntrySchema = z.object({
  amount: draftNumericField,
  description: z.string().max(1000).optional(),
});

export const draftContractDataSchema = z.discriminatedUnion("transactionType", [
  draftCommonSchema.extend({
    transactionType: z.literal("venda"),
    price: draftNumericField,
    paymentEntries: z.array(draftPaymentEntrySchema).optional(),
    paymentMethod: z.string().max(100).optional(),
    paymentSchedule: z.string().max(3000).optional(),
    depositAmount: draftNumericField,
    possessionDate: z.string().max(32).optional(),
    deedDeadline: z.string().max(32).optional(),
    commissionAmount: draftNumericField,
    commissionPayer: z.string().max(180).optional(),
    conditions: z.string().max(3000).optional(),
  }),
  draftCommonSchema.extend({
    transactionType: z.literal("locacao"),
    rentAmount: draftNumericField,
    termMonths: draftNumericField,
    startDate: z.string().max(32).optional(),
    paymentDueDay: draftNumericField,
    adjustmentIndex: z.string().max(50).optional(),
    guaranteeType: z.string().max(100).optional(),
    condoResponsibility: z.string().max(300).optional(),
    iptuResponsibility: z.string().max(300).optional(),
    specialConditions: z.string().max(3000).optional(),
  }),
  draftCommonSchema.extend({
    transactionType: z.literal("outro"),
    commercialTerms: z.string().max(5000).optional(),
    specialConditions: z.string().max(3000).optional(),
  }),
]);

export const draftIntakeSubmissionSchema = z.object({
  token: z.string().min(12),
  contractData: draftContractDataSchema,
});

export function contractDataToDealFields(data: ContractData) {
  const value = data.transactionType === "venda" ? data.price : data.transactionType === "locacao" ? data.rentAmount : null;
  const deadline = data.transactionType === "venda" ? new Date(`${data.deedDeadline}T12:00:00`) : data.transactionType === "locacao" ? new Date(`${data.startDate}T12:00:00`) : null;
  return { title: data.propertyAddress, transactionType: data.transactionType, propertyAddress: data.propertyAddress, estimatedValue: value, deadline };
}

export function listMissingContractFields(payload: unknown, transactionType: "venda" | "locacao" | "outro") {
  const parsed = contractDataSchema.safeParse(payload);
  if (parsed.success && parsed.data.transactionType === transactionType) return [];
  const issues = parsed.success ? [{ path: ["transactionType"] }] : parsed.error.issues;
  const labels: Record<string, string> = {
    propertyAddress: "endereço completo do imóvel", registryNumber: "número da matrícula", registryOffice: "cartório competente", city: "cidade do imóvel", state: "UF do imóvel", forumCity: "foro de eleição", sellerOrLandlord: transactionType === "locacao" ? "qualificação do locador" : "qualificação do vendedor", buyerOrTenant: transactionType === "locacao" ? "qualificação do locatário" : "qualificação do comprador", price: "preço da operação", paymentMethod: "forma de pagamento", paymentSchedule: "cronograma de pagamento", depositAmount: "valor do sinal", possessionDate: "data de posse", deedDeadline: "prazo para escritura", commissionAmount: "valor da comissão", commissionPayer: "responsável pela comissão", conditions: "condições da operação", rentAmount: "valor do aluguel", termMonths: "prazo da locação", startDate: "início da locação", paymentDueDay: "dia de vencimento", adjustmentIndex: "índice de reajuste", guaranteeType: "garantia locatícia", condoResponsibility: "responsabilidade condominial", iptuResponsibility: "responsabilidade pelo IPTU", specialConditions: "condições especiais", commercialTerms: "condições comerciais",
  };
  return Array.from(new Set(issues.map(issue => {
    const field = issue.path[0];
    return field === undefined ? "dados contratuais obrigatórios" : labels[String(field)] ?? String(field);
  })));
}

export function buildPartiesFromContractData(data: ContractData) {
  const sellers = data.sellers?.length ? data.sellers : [data.sellerOrLandlord];
  const buyers = data.buyers?.length ? data.buyers : [data.buyerOrTenant];
  const roles = data.transactionType === "locacao" ? { seller: "locador" as const, buyer: "locatario" as const } : { seller: "vendedor" as const, buyer: "comprador" as const };
  return [
    ...sellers.map(party => ({ role: roles.seller, party })),
    ...buyers.map(party => ({ role: roles.buyer, party })),
    ...(data.partners ?? []).map(party => ({ role: "parceiro" as const, party })),
  ];
}
