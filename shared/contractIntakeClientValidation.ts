export type IntakeTransactionType = "venda" | "locacao" | "outro";
export type IntakePartyForm = { name: string; document: string; maritalStatus: string; occupation: string; address: string; email: string; phone: string };
export type IntakePartnerForm = IntakePartyForm & { commissionAmount: string };
export type IntakePaymentEntryForm = { amount: string; description: string };
export type ContractIntakeFormState = {
  type: IntakeTransactionType;
  base: { propertyAddress: string; registryNumber: string; registryOffice: string; city: string; state: string; forumCity: string };
  sellers: IntakePartyForm[];
  buyers: IntakePartyForm[];
  partners: IntakePartnerForm[];
  sale: { price: string; paymentEntries: IntakePaymentEntryForm[]; paymentMethod: string; paymentSchedule: string; depositAmount: string; possessionDate: string; deedDeadline: string; commissionAmount: string; commissionPayer: string; conditions: string };
  rental: { rentAmount: string; termMonths: string; startDate: string; paymentDueDay: string; adjustmentIndex: string; guaranteeType: string; condoResponsibility: string; iptuResponsibility: string; specialConditions: string };
  other: { commercialTerms: string; specialConditions: string };
};

const emailPattern = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const digits = (value: string) => value.replace(/\D/g, "");
const required = (errors: Record<string, string>, key: string, value: string, label: string, minimum = 1) => { if (value.trim().length < minimum) errors[key] = `${label} é obrigatório.`; };
const positive = (errors: Record<string, string>, key: string, value: string, label: string, allowZero = false) => { const parsed = Number(value); if (!value.trim() || !Number.isFinite(parsed) || (allowZero ? parsed < 0 : parsed <= 0)) errors[key] = `${label} deve ser informado com um valor válido.`; };

function validateParty(errors: Record<string, string>, prefix: string, party: IntakePartyForm, label: string) {
  required(errors, `${prefix}.name`, party.name, `Nome de ${label}`, 3);
  required(errors, `${prefix}.document`, party.document, `CPF ou CNPJ de ${label}`, 5);
  required(errors, `${prefix}.maritalStatus`, party.maritalStatus, `Estado civil de ${label}`, 3);
  required(errors, `${prefix}.occupation`, party.occupation, `Profissão de ${label}`, 2);
  required(errors, `${prefix}.address`, party.address, `Endereço de ${label}`, 8);
  if (!emailPattern.test(party.email.trim())) errors[`${prefix}.email`] = `Informe um e-mail válido para ${label}.`;
  if (digits(party.phone).length < 8) errors[`${prefix}.phone`] = `Informe um telefone válido para ${label}.`;
}

export function validateContractIntakeForm(state: ContractIntakeFormState) {
  const errors: Record<string, string> = {};
  required(errors, "base.propertyAddress", state.base.propertyAddress, "Endereço completo do imóvel", 8);
  required(errors, "base.registryNumber", state.base.registryNumber, "Número da matrícula", 2);
  required(errors, "base.registryOffice", state.base.registryOffice, "Cartório competente", 2);
  required(errors, "base.city", state.base.city, "Cidade", 2);
  if (state.base.state.trim().length !== 2) errors["base.state"] = "Informe a UF com duas letras.";
  required(errors, "base.forumCity", state.base.forumCity, "Foro de eleição", 2);
  const labels = state.type === "locacao" ? ["locador", "locatário"] : ["vendedor", "comprador"];
  if (!state.sellers.length) errors.sellers = `Adicione ao menos um ${labels[0]}.`;
  state.sellers.forEach((party, index) => validateParty(errors, `sellers.${index}`, party, labels[0]));
  if (!state.buyers.length) errors.buyers = `Adicione ao menos um ${labels[1]}.`;
  state.buyers.forEach((party, index) => validateParty(errors, `buyers.${index}`, party, labels[1]));
  state.partners.forEach((partner, index) => {
    validateParty(errors, `partners.${index}`, partner, "parceiro");
    positive(errors, `partners.${index}.commissionAmount`, partner.commissionAmount, "Valor da comissão do parceiro", true);
  });
  if (state.type === "venda") {
    positive(errors, "sale.price", state.sale.price, "Preço total");
    state.sale.paymentEntries.forEach((entry, index) => {
      positive(errors, `sale.paymentEntries.${index}.amount`, entry.amount, "Valor da forma de pagamento");
      required(errors, `sale.paymentEntries.${index}.description`, entry.description, "Descrição da forma de pagamento", 3);
    });
    positive(errors, "sale.depositAmount", state.sale.depositAmount, "Valor do sinal", true);
    positive(errors, "sale.commissionAmount", state.sale.commissionAmount, "Valor da comissão", true);
    required(errors, "sale.paymentMethod", state.sale.paymentMethod, "Forma de pagamento", 3);
    required(errors, "sale.paymentSchedule", state.sale.paymentSchedule, "Cronograma de pagamento", 8);
    required(errors, "sale.possessionDate", state.sale.possessionDate, "Data de posse");
    required(errors, "sale.deedDeadline", state.sale.deedDeadline, "Prazo para escritura");
    required(errors, "sale.commissionPayer", state.sale.commissionPayer, "Responsável pela comissão", 3);
    required(errors, "sale.conditions", state.sale.conditions, "Condições da operação", 3);
  } else if (state.type === "locacao") {
    positive(errors, "rental.rentAmount", state.rental.rentAmount, "Valor do aluguel");
    positive(errors, "rental.termMonths", state.rental.termMonths, "Prazo da locação");
    positive(errors, "rental.paymentDueDay", state.rental.paymentDueDay, "Dia de vencimento");
    required(errors, "rental.startDate", state.rental.startDate, "Início da locação");
    required(errors, "rental.adjustmentIndex", state.rental.adjustmentIndex, "Índice de reajuste", 2);
    required(errors, "rental.guaranteeType", state.rental.guaranteeType, "Garantia locatícia", 3);
    required(errors, "rental.condoResponsibility", state.rental.condoResponsibility, "Responsabilidade condominial", 3);
    required(errors, "rental.iptuResponsibility", state.rental.iptuResponsibility, "Responsabilidade pelo IPTU", 3);
    required(errors, "rental.specialConditions", state.rental.specialConditions, "Condições especiais", 3);
  } else {
    required(errors, "other.commercialTerms", state.other.commercialTerms, "Condições comerciais", 12);
    required(errors, "other.specialConditions", state.other.specialConditions, "Condições especiais", 3);
  }
  return errors;
}
