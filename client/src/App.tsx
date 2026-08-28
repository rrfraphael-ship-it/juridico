import { Toaster } from "@/components/ui/sonner";
import { Button } from "@/components/ui/button";
import { trpc } from "@/lib/trpc";
import NotFound from "@/pages/NotFound";
import { ArchivePage, CopilotPage, DealPanelPage, DealsPage, ObligationsPage, OverviewPage, ProposalHubPage, SettingsPage } from "@/pages/CrmPages";
import { BrokerProposalPage, ClientPortalPage, ContractReviewPage, IntakePublicPage, ProposalPublicPage } from "@/pages/PublicPages";
import { Link2, Loader2 } from "lucide-react";
import { toast } from "sonner";
import { Route, Switch } from "wouter";
import ErrorBoundary from "./components/ErrorBoundary";
import { ThemeProvider } from "./contexts/ThemeContext";

function BrokerProposalLauncher() {
  const createLink = trpc.proposals.createBrokerLink.useMutation({ onSuccess: async result => { try { await navigator.clipboard.writeText(`${window.location.origin}${result.path}`); toast.success("Link do corretor copiado. Ele permanece válido por 14 dias."); } catch { toast.error("O link foi criado, mas não pôde ser copiado automaticamente."); } }, onError: error => toast.error(error.message) });
  return <Button className="fixed bottom-5 right-5 z-40 shadow-lg" onClick={() => createLink.mutate({ proposalId: null })} disabled={createLink.isPending}>{createLink.isPending ? <Loader2 className="size-4 animate-spin" /> : <Link2 className="size-4" />} Formulário do corretor</Button>;
}

function ProposalRoute() { return <><ProposalHubPage /><BrokerProposalLauncher /></>; }

function Router() {
  return <Switch><Route path="/" component={OverviewPage} /><Route path="/negocios" component={DealsPage} /><Route path="/negocios/:id" component={DealPanelPage} /><Route path="/propostas" component={ProposalRoute} /><Route path="/copiloto" component={CopilotPage} /><Route path="/obrigacoes" component={ObligationsPage} /><Route path="/arquivo" component={ArchivePage} /><Route path="/configuracoes" component={SettingsPage} /><Route path="/intake/:token" component={IntakePublicPage} /><Route path="/proposta-corretor/:token" component={BrokerProposalPage} /><Route path="/proposta/:token" component={ProposalPublicPage} /><Route path="/cliente/:token" component={ClientPortalPage} /><Route path="/revisao/:token" component={ContractReviewPage} /><Route path="/404" component={NotFound} /><Route component={NotFound} /></Switch>;
}

export default function App() { return <ErrorBoundary><ThemeProvider defaultTheme="light"><Toaster richColors position="top-right" /><Router /></ThemeProvider></ErrorBoundary>; }
