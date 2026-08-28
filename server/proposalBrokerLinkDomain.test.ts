import { describe, expect, it } from "vitest";
import { canBrokerEditProposal, isBrokerProposalLinkAvailable } from "./proposalBrokerLinkDomain";

describe("link seguro de proposta para corretor", () => {
  it("aceita links dentro da validade e recusa links expirados", () => {
    const now = new Date("2026-08-27T12:00:00.000Z");
    expect(isBrokerProposalLinkAvailable(new Date("2026-08-27T12:00:00.000Z"), now)).toBe(true);
    expect(isBrokerProposalLinkAvailable(new Date("2026-08-27T11:59:59.000Z"), now)).toBe(false);
  });

  it("impede a edição pelo corretor depois que a proposta foi convertida", () => {
    expect(canBrokerEditProposal("rascunho")).toBe(true);
    expect(canBrokerEditProposal("enviada")).toBe(false);
    expect(canBrokerEditProposal("aceita")).toBe(false);
    expect(canBrokerEditProposal("convertida")).toBe(false);
  });
});
