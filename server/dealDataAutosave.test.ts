import { describe, expect, it, vi } from "vitest";
import { createDealDataAutosaveRequest, persistDealDataAutosave } from "../shared/dealDataAutosave";

describe("autosave dos Dados do negócio", () => {
  it("encaminha um rascunho parcial para o salvamento interno do negócio", () => {
    const request = createDealDataAutosaveRequest({
      dealId: 30001,
      payload: { contactName: "", contactEmail: "", contactPhone: "", contractData: { transactionType: "venda", propertyAddress: "" } },
    });
    expect(request).toEqual({ target: "interno", input: { dealId: 30001, contactName: "", contactEmail: "", contactPhone: "", contractData: { transactionType: "venda", propertyAddress: "" } } });
  });

  it("encaminha dados completos para o link compartilhável sem expor o id interno", () => {
    const request = createDealDataAutosaveRequest({
      token: "link-seguro-dados-negocio",
      payload: { contactName: "Responsável", contactEmail: "responsavel@exemplo.com", contactPhone: "11999999999", contractData: { transactionType: "venda", propertyAddress: "Rua do Imóvel, 100", price: 750000 } },
    });
    expect(request).toEqual({ target: "compartilhado", input: { token: "link-seguro-dados-negocio", contactName: "Responsável", contactEmail: "responsavel@exemplo.com", contactPhone: "11999999999", contractData: { transactionType: "venda", propertyAddress: "Rua do Imóvel, 100", price: 750000 } } });
  });

  it("não dispara persistência quando não há contexto interno nem link seguro", () => {
    expect(createDealDataAutosaveRequest({ payload: { contractData: { transactionType: "venda" } } })).toBeNull();
  });

  it("persiste o rascunho pelo procedimento interno e devolve o estado salvo", async () => {
    const request = createDealDataAutosaveRequest({ dealId: 30001, payload: { contactName: "", contractData: { transactionType: "venda" } } });
    if (!request) throw new Error("A requisição interna deveria existir.");
    const saveForDeal = vi.fn().mockResolvedValue({ dealId: 30001, isComplete: false });
    const savePublic = vi.fn();
    await expect(persistDealDataAutosave(request, { saveForDeal, savePublic })).resolves.toEqual({ status: "salvo", result: { dealId: 30001, isComplete: false } });
    expect(saveForDeal).toHaveBeenCalledWith(expect.objectContaining({ dealId: 30001 }));
    expect(savePublic).not.toHaveBeenCalled();
  });

  it("persiste pelo link compartilhável e trata a falha sem perder o rascunho local", async () => {
    const request = createDealDataAutosaveRequest({ token: "link-seguro-dados-negocio", payload: { contactName: "", contractData: { transactionType: "venda" } } });
    if (!request) throw new Error("A requisição compartilhável deveria existir.");
    const saveForDeal = vi.fn();
    const savePublic = vi.fn().mockRejectedValue(new Error("Link indisponível"));
    await expect(persistDealDataAutosave(request, { saveForDeal, savePublic })).resolves.toEqual({ status: "erro", message: "Não foi possível salvar os Dados do negócio. Tente novamente." });
    expect(savePublic).toHaveBeenCalledWith(expect.objectContaining({ token: "link-seguro-dados-negocio" }));
    expect(saveForDeal).not.toHaveBeenCalled();
  });
});
