import { describe, expect, it } from "vitest";
import { DILIGENCE_CATALOG, getCatalogItem, STATE_CERTIFICATE_PORTALS } from "../shared/diligenceCatalog";

describe("matriz documental de diligência", () => {
  it("mantém fichas nacionais com fonte oficial e fichas estaduais dependentes de UF", () => {
    expect(DILIGENCE_CATALOG.map(item => item.code)).toEqual(expect.arrayContaining(["matricula_onus", "regularidade_federal", "cndt", "judicial_federal", "protesto", "judicial_estadual_civel", "regularidade_estadual"]));
    expect(getCatalogItem("cndt")?.issuanceUrl).toBe("https://cndt-certidao.tst.jus.br/");
    expect(getCatalogItem("judicial_estadual_civel")?.issuanceUrl).toBeUndefined();
  });

  it("direciona certidões estaduais aos portais da UF escolhida", () => {
    expect(getCatalogItem("judicial_estadual_civel", "SP")?.issuanceUrl).toBe(STATE_CERTIFICATE_PORTALS.SP.judicial);
    expect(getCatalogItem("regularidade_estadual", "MG")?.issuanceUrl).toBe(STATE_CERTIFICATE_PORTALS.MG.fiscal);
    expect(Object.keys(STATE_CERTIFICATE_PORTALS)).toHaveLength(27);
  });
});
