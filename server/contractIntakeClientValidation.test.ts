import { describe, expect, it } from "vitest";
import { validateContractIntakeForm, type ContractIntakeFormState } from "../shared/contractIntakeClientValidation";

const party = { name: "", document: "", maritalStatus: "", occupation: "", address: "", email: "", phone: "" };
const blank: ContractIntakeFormState = { type: "venda", base: { propertyAddress: "", registryNumber: "", registryOffice: "", city: "", state: "", forumCity: "" }, sellers: [], buyers: [], partners: [], sale: { price: "", paymentEntries: [], paymentMethod: "", paymentSchedule: "", depositAmount: "", possessionDate: "", deedDeadline: "", commissionAmount: "", commissionPayer: "", conditions: "" }, rental: { rentAmount: "", termMonths: "", startDate: "", paymentDueDay: "", adjustmentIndex: "", guaranteeType: "", condoResponsibility: "", iptuResponsibility: "", specialConditions: "" }, other: { commercialTerms: "", specialConditions: "" } };

describe("proteção do intake parcial no cliente", () => {
  it("bloqueia valores vazios com uma mensagem associada a cada campo", () => {
    const errors = validateContractIntakeForm(blank);
    expect(errors).toMatchObject({
      "base.propertyAddress": "Endereço completo do imóvel é obrigatório.",
      sellers: "Adicione ao menos um vendedor.",
      buyers: "Adicione ao menos um comprador.",
    });
  });

  it("aceita telefone com máscara quando há oito ou mais dígitos", () => {
    const form = structuredClone(blank);
    form.sellers = [{ ...party, phone: "(11) 99999-9999" }];
    form.buyers = [{ ...party, phone: "(11) 99999-9999" }];
    const errors = validateContractIntakeForm(form);
    expect(errors["sellers.0.phone"]).toBeUndefined();
    expect(errors["buyers.0.phone"]).toBeUndefined();
  });

  it("exige o valor de comissão quando um parceiro é adicionado", () => {
    const form = structuredClone(blank);
    form.partners = [{ ...party, commissionAmount: "" }];
    const errors = validateContractIntakeForm(form);
    expect(errors["partners.0.commissionAmount"]).toBe("Valor da comissão do parceiro deve ser informado com um valor válido.");
  });

  it("valida o valor e a descrição de cada forma detalhada de pagamento", () => {
    const form = structuredClone(blank);
    form.sale.paymentEntries = [{ amount: "", description: "" }];
    const errors = validateContractIntakeForm(form);
    expect(errors["sale.paymentEntries.0.amount"]).toBe("Valor da forma de pagamento deve ser informado com um valor válido.");
    expect(errors["sale.paymentEntries.0.description"]).toBe("Descrição da forma de pagamento é obrigatório.");
  });
});
