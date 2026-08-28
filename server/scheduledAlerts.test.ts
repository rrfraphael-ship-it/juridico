import { describe, expect, it } from "vitest";
import { shouldAlert } from "./scheduledAlerts";

describe("alertas de obrigações", () => {
  const today = new Date("2026-08-25T12:00:00Z");

  it("alerta obrigações dentro da antecedência configurada apenas uma vez por dia", () => {
    expect(shouldAlert(new Date("2026-08-27T12:00:00Z"), null, 3, today)).toBe(true);
    expect(shouldAlert(new Date("2026-08-27T12:00:00Z"), new Date("2026-08-25T08:00:00Z"), 3, today)).toBe(false);
  });

  it("não alerta obrigações fora da janela ou já vencidas", () => {
    expect(shouldAlert(new Date("2026-09-01T12:00:00Z"), null, 3, today)).toBe(false);
    expect(shouldAlert(new Date("2026-08-24T12:00:00Z"), null, 3, today)).toBe(false);
  });
});
