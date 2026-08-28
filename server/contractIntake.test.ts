import { describe, expect, it } from "vitest";
import { buildPartiesFromContractData, contractDataToDealFields, draftIntakeSubmissionSchema, listMissingContractFields, saleContractDataSchema, strictIntakeSubmissionSchema } from "./contractIntake";

const sale = {
  transactionType: "venda" as const, propertyAddress: "Rua do Imóvel, 100", registryNumber: "12.345", registryOffice: "1º Registro de Imóveis", city: "São Paulo", state: "SP", forumCity: "São Paulo",
  sellerOrLandlord: { name: "Vendedora Exemplo", document: "123.456.789-00", maritalStatus: "Solteira", occupation: "Empresária", address: "Rua A, 10", email: "vendedor@example.com", phone: "11999999999" },
  buyerOrTenant: { name: "Comprador Exemplo", document: "987.654.321-00", maritalStatus: "Casado", occupation: "Administrador", address: "Rua B, 20", email: "comprador@example.com", phone: "11888888888" },
  price: 750000, paymentMethod: "Transferência bancária", paymentSchedule: "Sinal na assinatura e saldo na escritura.", depositAmount: 75000, possessionDate: "2026-10-01", deedDeadline: "2026-11-01", commissionAmount: 45000, commissionPayer: "Vendedor", conditions: "Sujeita à aprovação da diligência documental.",
};

describe("intake contratual", () => {
  it("aceita uma compra e venda com todos os campos contratuais essenciais", () => {
    expect(saleContractDataSchema.safeParse(sale).success).toBe(true);
    expect(contractDataToDealFields(sale)).toMatchObject({ transactionType: "venda", estimatedValue: 750000, propertyAddress: "Rua do Imóvel, 100" });
  });
  it("lista informações obrigatórias ausentes antes de permitir a minuta", () => {
    expect(listMissingContractFields({ transactionType: "venda", propertyAddress: "Rua do Imóvel, 100" }, "venda")).toContain("número da matrícula");
  });

  it("aceita dados parciais para salvamento automático, mas preserva o bloqueio da minuta", () => {
    const partial = {
      token: "link-seguro-dados-negocio",
      contactName: "Ana",
      contractData: { transactionType: "venda" as const, propertyAddress: "Rua do Imóvel, 100" },
    };
    expect(draftIntakeSubmissionSchema.safeParse(partial).success).toBe(true);
    expect(strictIntakeSubmissionSchema.safeParse(partial).success).toBe(false);
    expect(listMissingContractFields(partial.contractData, "venda")).toContain("número da matrícula");
  });

  it("preserva vendedores, compradores e parceiros adicionais com sua comissão", () => {
    const data = {
      ...sale,
      sellers: [sale.sellerOrLandlord, { ...sale.sellerOrLandlord, name: "Segundo Vendedor", document: "111.222.333-44", email: "segundo.vendedor@example.com" }],
      buyers: [sale.buyerOrTenant, { ...sale.buyerOrTenant, name: "Segunda Compradora", document: "555.666.777-88", email: "segunda.compradora@example.com" }],
      partners: [{ ...sale.sellerOrLandlord, name: "Imobiliária Parceira", document: "12.345.678/0001-90", email: "contato@parceira.com", commissionAmount: 15000 }],
    };
    expect(saleContractDataSchema.safeParse(data).success).toBe(true);
    expect(buildPartiesFromContractData(data)).toEqual(expect.arrayContaining([
      expect.objectContaining({ role: "vendedor", party: expect.objectContaining({ name: "Segundo Vendedor" }) }),
      expect.objectContaining({ role: "comprador", party: expect.objectContaining({ name: "Segunda Compradora" }) }),
      expect.objectContaining({ role: "parceiro", party: expect.objectContaining({ commissionAmount: 15000 }) }),
    ]));
  });
});
