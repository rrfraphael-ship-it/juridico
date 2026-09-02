import { describe, expect, it } from "vitest";
import { getProposalDeliveryState } from "../shared/proposalTracking";

describe("rastreio de proposta", () => {
  it("distingue rascunho, envio e visualização sem resposta", () => {
    expect(getProposalDeliveryState("rascunho")).toMatchObject({ sent: false, viewed: false, responded: false, responseLabel: "Resposta pendente" });
    expect(getProposalDeliveryState("enviada", "2026-08-28T12:00:00.000Z")).toMatchObject({ sent: true, viewed: true, responded: false, responseLabel: "Resposta pendente" });
  });

  it("considera aceita, recusada e convertida como propostas respondidas", () => {
    expect(getProposalDeliveryState("aceita")).toMatchObject({ sent: true, viewed: true, responded: true, responseLabel: "Aceita" });
    expect(getProposalDeliveryState("recusada")).toMatchObject({ sent: true, viewed: true, responded: true, responseLabel: "Recusada" });
    expect(getProposalDeliveryState("convertida")).toMatchObject({ sent: true, viewed: true, responded: true, responseLabel: "Aceita" });
  });
});
