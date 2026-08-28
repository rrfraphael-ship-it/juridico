import { useAuth } from "@/_core/hooks/useAuth";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { Sidebar, SidebarContent, SidebarFooter, SidebarHeader, SidebarInset, SidebarMenu, SidebarMenuButton, SidebarMenuItem, SidebarProvider, SidebarTrigger } from "@/components/ui/sidebar";
import { startLogin } from "@/const";
import { useIsMobile } from "@/hooks/useMobile";
import { Archive, BriefcaseBusiness, CalendarClock, FileSignature, LayoutDashboard, LogOut, PanelLeft, Scale, Settings2, ShieldCheck } from "lucide-react";
import { type CSSProperties, useEffect, useRef, useState } from "react";
import { useLocation } from "wouter";
import { DashboardLayoutSkeleton } from "./DashboardLayoutSkeleton";

const menuItems = [
  { icon: LayoutDashboard, label: "Visão geral", path: "/" },
  { icon: BriefcaseBusiness, label: "Negócios", path: "/negocios" },
  { icon: FileSignature, label: "Central de Propostas", path: "/propostas" },
  { icon: Scale, label: "Copiloto Jurídico", path: "/copiloto" },
  { icon: CalendarClock, label: "Obrigações", path: "/obrigacoes" },
  { icon: Archive, label: "Arquivo", path: "/arquivo" },
  { icon: Settings2, label: "Configurações", path: "/configuracoes" },
];
const SIDEBAR_WIDTH_KEY = "imoblegal-sidebar-width";
const DEFAULT_WIDTH = 272;
const MIN_WIDTH = 220;
const MAX_WIDTH = 380;

export default function DashboardLayout({ children }: { children: React.ReactNode }) {
  const [sidebarWidth, setSidebarWidth] = useState(() => Number(localStorage.getItem(SIDEBAR_WIDTH_KEY)) || DEFAULT_WIDTH);
  const { loading, user } = useAuth();
  useEffect(() => { localStorage.setItem(SIDEBAR_WIDTH_KEY, String(sidebarWidth)); }, [sidebarWidth]);
  if (loading) return <DashboardLayoutSkeleton />;
  if (!user) return <div className="flex min-h-screen items-center justify-center bg-[#fafaf9] p-5"><div className="w-full max-w-md rounded-2xl border bg-card p-8 text-center shadow-sm"><div className="mx-auto flex size-12 items-center justify-center rounded-xl bg-[#19171d] text-white"><ShieldCheck className="size-6" /></div><h1 className="mt-6 font-display text-3xl font-semibold tracking-tight">ImobLegal</h1><p className="mt-2 text-sm leading-6 text-muted-foreground">Acesse seu ambiente de operações jurídicas imobiliárias para continuar.</p><Button className="mt-7 w-full" onClick={() => startLogin()}>Entrar na plataforma</Button></div></div>;
  return <SidebarProvider style={{ "--sidebar-width": `${sidebarWidth}px` } as CSSProperties}><DashboardLayoutContent setSidebarWidth={setSidebarWidth}>{children}</DashboardLayoutContent></SidebarProvider>;
}

function DashboardLayoutContent({ children, setSidebarWidth }: { children: React.ReactNode; setSidebarWidth: (width: number) => void }) {
  const { user, logout } = useAuth();
  const [location, setLocation] = useLocation();
  const [isResizing, setIsResizing] = useState(false);
  const sidebarRef = useRef<HTMLDivElement>(null);
  const isMobile = useIsMobile();
  useEffect(() => { const move = (event: MouseEvent) => { if (!isResizing) return; const left = sidebarRef.current?.getBoundingClientRect().left ?? 0; const width = event.clientX - left; if (width >= MIN_WIDTH && width <= MAX_WIDTH) setSidebarWidth(width); }; const up = () => setIsResizing(false); if (isResizing) { document.addEventListener("mousemove", move); document.addEventListener("mouseup", up); document.body.style.cursor = "col-resize"; document.body.style.userSelect = "none"; } return () => { document.removeEventListener("mousemove", move); document.removeEventListener("mouseup", up); document.body.style.cursor = ""; document.body.style.userSelect = ""; }; }, [isResizing, setSidebarWidth]);
  const active = menuItems.find(item => location === item.path || (item.path === "/negocios" && location.startsWith("/negocios/")));
  return <><div className="relative" ref={sidebarRef}><Sidebar collapsible="icon" className="border-r border-sidebar-border bg-sidebar"><SidebarHeader className="h-auto px-4 py-5"><div className="flex items-center gap-3"><button className="flex size-8 shrink-0 items-center justify-center rounded-lg border border-border bg-[#19171d] text-white" onClick={() => setLocation("/")} aria-label="Ir para visão geral"><ShieldCheck className="size-4" /></button><div className="min-w-0 group-data-[collapsible=icon]:hidden"><p className="font-display text-xl font-semibold leading-none tracking-tight">ImobLegal</p><p className="mt-1.5 text-[9px] font-semibold tracking-[0.16em] text-muted-foreground">LEGAL OPERATIONS SYSTEM</p></div><button className="ml-auto flex size-7 items-center justify-center rounded-md text-muted-foreground hover:bg-muted group-data-[collapsible=icon]:hidden" onClick={() => document.querySelector<HTMLButtonElement>("[data-sidebar=rail]")?.click()} aria-label="Recolher menu"><PanelLeft className="size-4" /></button></div></SidebarHeader><SidebarContent className="px-3 py-3"><p className="px-2 pb-2 text-[10px] font-bold uppercase tracking-[0.15em] text-muted-foreground group-data-[collapsible=icon]:hidden">Operação</p><SidebarMenu>{menuItems.map(item => <SidebarMenuItem key={item.path}><SidebarMenuButton isActive={active?.path === item.path} onClick={() => setLocation(item.path)} tooltip={item.label} className="h-10 rounded-lg px-3 font-medium data-[active=true]:bg-[#19171d] data-[active=true]:text-white data-[active=true]:hover:bg-[#19171d]"><item.icon className="size-4" /><span>{item.label}</span></SidebarMenuButton></SidebarMenuItem>)}</SidebarMenu><div className="mx-0 mt-8 rounded-xl border border-border/80 bg-muted/30 p-3 group-data-[collapsible=icon]:hidden"><div className="flex items-center gap-2 text-sm font-semibold"><Scale className="size-4" /> Copiloto com fontes</div><p className="mt-2 text-xs leading-5 text-muted-foreground">IA assistiva baseada na biblioteca jurídica configurada.</p></div></SidebarContent><SidebarFooter className="border-t px-3 py-4"><DropdownMenu><DropdownMenuTrigger asChild><button className="flex w-full items-center gap-3 rounded-lg p-2 text-left transition hover:bg-muted"><Avatar className="size-8 shrink-0 border"><AvatarFallback className="bg-muted text-xs font-semibold">{user?.name?.charAt(0).toUpperCase() ?? "I"}</AvatarFallback></Avatar><div className="min-w-0 group-data-[collapsible=icon]:hidden"><p className="truncate text-sm font-medium">{user?.name ?? "Operador"}</p><p className="mt-0.5 truncate text-xs text-muted-foreground">{user?.email ?? ""}</p></div></button></DropdownMenuTrigger><DropdownMenuContent align="end" className="w-48"><DropdownMenuItem onClick={logout} className="text-destructive focus:text-destructive"><LogOut className="mr-2 size-4" /> Sair</DropdownMenuItem></DropdownMenuContent></DropdownMenu></SidebarFooter></Sidebar><div className="absolute right-0 top-0 z-50 h-full w-1 cursor-col-resize hover:bg-foreground/10" onMouseDown={() => setIsResizing(true)} /></div><SidebarInset className="min-h-screen bg-[#fafaf9]">{isMobile ? <div className="sticky top-0 z-30 flex h-14 items-center gap-2 border-b bg-background/90 px-3 backdrop-blur"><SidebarTrigger className="size-9" /><span className="font-display text-lg font-semibold tracking-tight">{active?.label ?? "ImobLegal"}</span></div> : null}<main className="min-w-0 flex-1">{children}</main></SidebarInset></>;
}
