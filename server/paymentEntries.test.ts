import { describe, expect, it } from "vitest";
import { addPaymentEntry, removePaymentEntry, serializePaymentEntries, updatePaymentEntry } from "../shared/paymentEntries";

describe("formas de pagamento dos Dados do negócio", () => {
  it("adiciona, atualiza e remove pagamentos sem alterar os demais itens", () => {
    const withEntry = addPaymentEntry([]);
    const completed = updatePaymentEntry(updatePaymentEntry(withEntry, 0, "amount", "125000"), 0, "description", "Sinal na assinatura");
    const withSecond = [...completed, { amount: "375000", description: "Financiamento bancário" }];
    expect(withSecond).toHaveLength(2);
    expect(removePaymentEntry(withSecond, 0)).toEqual([{ amount: "375000", description: "Financiamento bancário" }]);
  });

  it("serializa valor numérico e preserva a descrição para o payload do autosave", () => {
    expect(serializePaymentEntries([{ amount: "125000", description: "Sinal na assinatura" }])).toEqual([{ amount: 125000, description: "Sinal na assinatura" }]);
    expect(serializePaymentEntries([{ amount: "", description: "A definir" }])).toEqual([{ amount: undefined, description: "A definir" }]);
  });
});
