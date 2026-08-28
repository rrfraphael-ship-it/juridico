export const BRAZILIAN_STATES = [
  ["AC", "Acre"], ["AL", "Alagoas"], ["AP", "Amapá"], ["AM", "Amazonas"], ["BA", "Bahia"], ["CE", "Ceará"], ["DF", "Distrito Federal"], ["ES", "Espírito Santo"], ["GO", "Goiás"], ["MA", "Maranhão"], ["MT", "Mato Grosso"], ["MS", "Mato Grosso do Sul"], ["MG", "Minas Gerais"], ["PA", "Pará"], ["PB", "Paraíba"], ["PR", "Paraná"], ["PE", "Pernambuco"], ["PI", "Piauí"], ["RJ", "Rio de Janeiro"], ["RN", "Rio Grande do Norte"], ["RS", "Rio Grande do Sul"], ["RO", "Rondônia"], ["RR", "Roraima"], ["SC", "Santa Catarina"], ["SP", "São Paulo"], ["SE", "Sergipe"], ["TO", "Tocantins"],
] as const;

export type DiligenceCategory = "federal" | "trabalhista" | "estadual" | "municipal" | "registral" | "imovel" | "outro";
export type CatalogItem = { code: string; title: string; category: DiligenceCategory; issuer: string; purpose: string; issuanceUrl?: string; requiresState?: boolean; stateLinkKind?: "judicial" | "fiscal"; };

export const STATE_CERTIFICATE_PORTALS: Record<string, { judicial: string; fiscal: string }> = {
  AC: { judicial: "https://certidoes.tjac.jus.br/", fiscal: "https://sefazonline.ac.gov.br/sefazonline/app.cndprincipal" },
  AL: { judicial: "https://www2.tjal.jus.br/sco/abrirCadastro.do", fiscal: "https://contribuinte.sefaz.al.gov.br/certidao/" },
  AP: { judicial: "https://tucujuris.tjap.jus.br/pages/certidao-publica/certidao-publica.html", fiscal: "https://www.sefaz.ap.gov.br/sate/seg/SEGf_AcessarFuncao.jsp?cdFuncao=DIA_060" },
  AM: { judicial: "https://consultasaj.tjam.jus.br/sco/abrirCadastro.do", fiscal: "https://sistemas.sefaz.am.gov.br/GAE/mnt/dividaAtiva/certidaoNegativa/emitirCertidaoNegativaNaoContPortal.do" },
  BA: { judicial: "https://portalcertidoes.tjba.jus.br/#/primeirograu", fiscal: "https://servicos.sefaz.ba.gov.br/sistemas/DSCRE/Modulos/Publico/EmissaoCertidao.aspx" },
  CE: { judicial: "https://sirece.tjce.jus.br/sirece-web/nova/solicitacao.jsf", fiscal: "https://consultapublica.sefaz.ce.gov.br/certidaonegativa/preparar-consultar" },
  DF: { judicial: "https://cnc.tjdft.jus.br/solicitacao-externa", fiscal: "https://ww1.receita.fazenda.df.gov.br/cidadao/certidoes/Certidao" },
  ES: { judicial: "https://sistemas.tjes.jus.br/certidaonegativa/sistemas/certidao/CERTIDAOPESQUISA.cfm", fiscal: "https://s2-internet.sefaz.es.gov.br/certidao/cnd" },
  GO: { judicial: "https://www.tjgo.jus.br/index.php/processos/emissao-de-certidoes", fiscal: "https://www.sefaz.go.gov.br/Certidao/Emissao/default.asp" },
  MA: { judicial: "https://jurisconsult.tjma.jus.br/#/certidao-generate-state-certificate-form", fiscal: "https://sistemas1.sefaz.ma.gov.br/certidoes/jsp/emissaoCertidaoNegativa/emissaoCertidaoNegativa.jsf" },
  MT: { judicial: "https://sec.tjmt.jus.br/", fiscal: "https://www.sefaz.mt.gov.br/cnd/certidao/servlet/ServletRotdAberto?origem=60" },
  MS: { judicial: "https://esaj.tjms.jus.br/sco/abrirCadastro.do", fiscal: "https://servicos.efazenda.ms.gov.br/pndfis/home/emissao" },
  MG: { judicial: "https://rupe.tjmg.jus.br/rupe/justica/publico/certidoes/criarSolicitacaoCertidao.rupe?solicitacaoPublica=true", fiscal: "https://www2.fazenda.mg.gov.br/sol/ctrl/SOL/CDT/SERVICO_829?ACAO=INICIAR" },
  PA: { judicial: "https://portal-certidao.tjpa.jus.br/", fiscal: "https://app.sefa.pa.gov.br/emissao-certidao/emitirCertidao.action" },
  PB: { judicial: "https://app.tjpb.jus.br/certo/paginas/publico/solicitarCertidao.jsf", fiscal: "https://www.sefaz.pb.gov.br/servirtual/certidoes/emissao-de-certidao-de-debitos-cidadao" },
  PR: { judicial: "https://www.tjpr.jus.br/certidoes", fiscal: "https://www.fazenda.pr.gov.br/servicos/Mais-buscados/Certidoes/Emitir-Certidao-Negativa-Receita-Estadual-kZrX5gol" },
  PE: { judicial: "https://certidoesunificadas.app.tjpe.jus.br/", fiscal: "https://efisco.sefaz.pe.gov.br/sfi_trb_gcc/PREmitirCertidaoRegularidadeFiscalMovel" },
  PI: { judicial: "https://europa.tjpi.jus.br/certidao/unificada", fiscal: "https://webas.sefaz.pi.gov.br/portaldocontribuinte/" },
  RJ: { judicial: "https://www3.tjrj.jus.br/CJE/certidao/judicial/", fiscal: "https://pge.rj.gov.br/divida-ativa-certidao-de-regularidade-fiscal" },
  RN: { judicial: "https://www.tjrn.jus.br/certidoes/", fiscal: "https://uvt.sefaz.rn.gov.br/#/services/certidao-negativa/emitir" },
  RS: { judicial: "https://www.tjrs.jus.br/novo/processos-e-servicos/servicos-processuais/emissao-de-antecedentes-e-certidoes/", fiscal: "https://www.sefaz.rs.gov.br/sat/CertidaoSitFiscalSolic.aspx" },
  RO: { judicial: "https://www.tjro.jus.br/certidao-unificada/", fiscal: "https://portalcontribuinte.sefin.ro.gov.br/Publico/certidaoNegativa.jsp" },
  RR: { judicial: "https://certidao.tjrr.jus.br/certidao/pages/certidao/certidao-negativa.xhtml", fiscal: "https://portalweb.sefaz.rr.gov.br/cnd/servlet/wp_siate_emitircndcentralservicopublica" },
  SC: { judicial: "https://certidoes.tjsc.jus.br/", fiscal: "https://tributario.sef.sc.gov.br/tax.NET/Sat.CtaCte.Web/SolicitacaoCnd.aspx" },
  SP: { judicial: "https://esaj.tjsp.jus.br/sco/abrirCadastro.do", fiscal: "https://www.dividaativa.pge.sp.gov.br/" },
  SE: { judicial: "https://www.tjse.jus.br/portal/servicos/judiciais/certidao-judicial", fiscal: "https://www.sefaz.se.gov.br/SitePages/certidoes.aspx" },
  TO: { judicial: "https://www.tjto.jus.br/servicos/certidoes", fiscal: "https://portal.sefaz.to.gov.br/debitos-fiscais" },
};

export const DILIGENCE_CATALOG: CatalogItem[] = [
  { code: "matricula_onus", title: "Matrícula atualizada e certidão de ônus", category: "registral", issuer: "Registro de Imóveis competente", purpose: "Verificar titularidade, cadeia registral e ônus que recaem sobre o imóvel.", issuanceUrl: "https://www.registrodeimoveis.org.br/servicos/certidao" },
  { code: "acoes_reais", title: "Certidão de ações reais ou pessoais reipersecutórias", category: "registral", issuer: "Registro de Imóveis competente", purpose: "Identificar ações ou restrições com reflexo potencial sobre o imóvel.", issuanceUrl: "https://www.registrodeimoveis.org.br/servicos/certidao" },
  { code: "regularidade_federal", title: "Certidão de regularidade fiscal federal", category: "federal", issuer: "Receita Federal e PGFN", purpose: "Consultar a regularidade fiscal federal da parte envolvida.", issuanceUrl: "https://servicos.receitafederal.gov.br/servico/certidoes/" },
  { code: "cndt", title: "Certidão Negativa de Débitos Trabalhistas", category: "trabalhista", issuer: "Tribunal Superior do Trabalho", purpose: "Verificar débitos trabalhistas da pessoa física ou jurídica.", issuanceUrl: "https://cndt-certidao.tst.jus.br/" },
  { code: "judicial_federal", title: "Certidão judicial federal unificada", category: "federal", issuer: "Conselho da Justiça Federal", purpose: "Consultar distribuição judicial federal em nome da parte.", issuanceUrl: "https://certidao-unificada.cjf.jus.br/" },
  { code: "protesto", title: "Certidão de protesto", category: "outro", issuer: "CENPROT Nacional", purpose: "Verificar protestos vinculados ao CPF ou CNPJ pesquisado.", issuanceUrl: "https://www.pesquisaprotesto.com.br/servico/pedido-certidao" },
  { code: "fgts", title: "Certificado de Regularidade do FGTS", category: "federal", issuer: "Caixa Econômica Federal", purpose: "Aplicável principalmente a pessoas jurídicas e empregadores.", issuanceUrl: "https://consulta-crf.caixa.gov.br/" },
  { code: "judicial_estadual_civel", title: "Certidão estadual de distribuição cível", category: "estadual", issuer: "Tribunal de Justiça da UF", purpose: "Consultar a distribuição cível em nome da parte na UF selecionada.", requiresState: true, stateLinkKind: "judicial" },
  { code: "judicial_estadual_falencia", title: "Certidão estadual de falência, recuperação e insolvência", category: "estadual", issuer: "Tribunal de Justiça da UF", purpose: "Verificar ocorrências empresariais quando aplicáveis à parte pesquisada.", requiresState: true, stateLinkKind: "judicial" },
  { code: "regularidade_estadual", title: "Certidão de regularidade fiscal estadual", category: "estadual", issuer: "SEFAZ ou PGE da UF", purpose: "Consultar débitos e regularidade fiscal estadual na UF selecionada.", requiresState: true, stateLinkKind: "fiscal" },
];

export function getCatalogItem(code: string, stateCode?: string | null) {
  const item = DILIGENCE_CATALOG.find(entry => entry.code === code);
  if (!item) return null;
  if (item.requiresState) {
    const portals = stateCode ? STATE_CERTIFICATE_PORTALS[stateCode] : undefined;
    return { ...item, issuanceUrl: portals ? portals[item.stateLinkKind ?? "judicial"] : undefined };
  }
  return item;
}
