import { describe, expect, it } from "vitest";
import { validateContractIntakeForm, type ContractIntakeFormState } from "./contractIntakeClientValidation";

const blank: ContractIntakeFormState = { contact: { contactName: "", contactEmail: "", contactPhone: "" }, type: "venda", base: { propertyAddress: "", registryNumber: "", registryOffice: "", city: "", state: "", forumCity: "", sellerOrLandlord: { name: "", document: "", maritalStatus: "", occupation: "", address: "", email: "", phone: "" }, buyerOrTenant: { name: "", document: "", maritalStatus: "", occupation: "", address: "", email: "", phone: "" } }, sale: { price: "", paymentMethod: "", paymentSchedule: "", depositAmount: "", possessionDate: "", deedDeadline: "", commissionAmount: "", commissionPayer: "", conditions: "" }, rental: { rentAmount: "", termMonths: "", startDate: "", paymentDueDay: "", adjustmentIndex: "", guaranteeType: "", condoResponsibility: "", iptuResponsibility: "", specialConditions: "" }, other: { commercialTerms: "", specialConditions: "" } };

describe("validação cliente do intake contratual", () => {
  it("expõe mensagens por campo antes de qualquer envio ao servidor", () => {
    const errors = validateContractIntakeForm(blank);
    expect(errors["contact.contactEmail"]).toBe("Informe um e-mail válido para contato.");
    expect(errors["sellerOrLandlord.address"]).toContain("Endereço");
    expect(errors["sale.price"]).toContain("Preço");
  });

  it("aceita telefone brasileiro formatado quando há quantidade válida de dígitos", () => {
    const state = structuredClone(blank);
    state.contact.contactPhone = "(11) 99999-9999";
    state.base.sellerOrLandlord.phone = "(11) 99999-9999";
    state.base.buyerOrTenant.phone = "(11) 99999-9999";
    const errors = validateContractIntakeForm(state);
    expect(errors["contact.contactPhone"]).toBeUndefined();
    expect(errors["sellerOrLandlord.phone"]).toBeUndefined();
  });
});
