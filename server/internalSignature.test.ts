import { describe, expect, it } from "vitest";
import { buildInternalEnvelope, normalizeInternalSigners } from "./internalSignature";

describe("envelope interno de assinatura", () => {
  it("normaliza a ordem definida para os signatários", () => {
    expect(normalizeInternalSigners([{ name: "Segundo", email: "segundo@exemplo.com", order: 2 }, { name: "Primeiro", email: "primeiro@exemplo.com", order: 1 }])).toEqual([{ name: "Primeiro", email: "primeiro@exemplo.com", order: 1 }, { name: "Segundo", email: "segundo@exemplo.com", order: 2 }]);
  });

  it("prepara o envelope sem exigir conexão com provedor externo", () => {
    expect(buildInternalEnvelope({ ownerId: 1, dealId: 2, contractId: 3, signers: [{ name: "Cliente", email: "cliente@exemplo.com", order: 1, role: "Comprador" }] })).toMatchObject({ ownerId: 1, dealId: 2, contractId: 3, provider: "outro", status: "pronto" });
  });
});
