import { describe, expect, it } from "vitest";
import { buildDealFieldsFromIntake, canStoreDiligenceFile, nextContractVersion } from "./legalDomain";

describe("intake, contratos e dossiê", () => {
  it("constrói os campos do negócio a partir do intake para criação e atualização", () => {
    const result = buildDealFieldsFromIntake({
      transactionType: "venda",
      propertyAddress: "Rua das Palmeiras, 10",
      estimatedValue: 750000,
      deadline: "2026-09-01T12:00:00.000Z",
    });
    expect(result).toMatchObject({ title: "Rua das Palmeiras, 10", transactionType: "venda", propertyAddress: "Rua das Palmeiras, 10", estimatedValue: 750000 });
    expect(result.deadline).toEqual(new Date("2026-09-01T12:00:00.000Z"));
  });

  it("incrementa a versão a cada revisão contratual", () => {
    expect(nextContractVersion(1)).toBe(2);
    expect(nextContractVersion(0)).toBe(1);
  });

  it("aceita somente anexos de diligência com tamanho válido", () => {
    expect(canStoreDiligenceFile(1)).toBe(true);
    expect(canStoreDiligenceFile(8 * 1024 * 1024)).toBe(true);
    expect(canStoreDiligenceFile(0)).toBe(false);
    expect(canStoreDiligenceFile(8 * 1024 * 1024 + 1)).toBe(false);
  });
});
