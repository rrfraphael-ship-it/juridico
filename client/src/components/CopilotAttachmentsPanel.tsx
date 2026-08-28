import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Checkbox } from "@/components/ui/checkbox";
import { trpc } from "@/lib/trpc";
import { FileDiff, FileText, Files, Loader2, ShieldAlert, UploadCloud } from "lucide-react";
import { useRef, useState } from "react";
import { toast } from "sonner";

type Agent = "venda" | "locacao" | "diligencia" | "comparador";
type Props = { sessionId: string; agent: Agent; onComparison: (content: string) => void };

function formatBytes(bytes: number) {
  if (bytes < 1024 * 1024) return `${Math.max(1, Math.round(bytes / 1024))} KB`;
  return `${(bytes / (1024 * 1024)).toLocaleString("pt-BR", { maximumFractionDigits: 1 })} MB`;
}

export function CopilotAttachmentsPanel({ sessionId, agent, onComparison }: Props) {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [selectedIds, setSelectedIds] = useState<number[]>([]);
  const utils = trpc.useUtils();
  const attachments = trpc.copiloto.listAttachments.useQuery({ sessionId });
  const upload = trpc.copiloto.uploadAttachment.useMutation({
    onSuccess: result => {
      toast.success(`${result.name} disponível para análise.`);
      void utils.copiloto.listAttachments.invalidate({ sessionId });
    },
    onError: error => toast.error(error.message),
  });
  const compare = trpc.copiloto.compareMinutas.useMutation({
    onSuccess: result => {
      onComparison(result.content);
      toast.success("Comparação assistida concluída.");
    },
    onError: error => toast.error(error.message),
  });
  const toggle = (id: number) => setSelectedIds(current => current.includes(id) ? current.filter(item => item !== id) : current.length >= 2 ? [current[1], id] : [...current, id]);
  const selectFile = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    event.target.value = "";
    if (!file) return;
    if (file.size > 10 * 1024 * 1024) { toast.error("Cada arquivo deve ter até 10 MB."); return; }
    const allowed = /\.(docx|pdf|txt)$/i.test(file.name);
    if (!allowed) { toast.error("Anexe uma minuta em DOCX, PDF ou TXT."); return; }
    const reader = new FileReader();
    reader.onerror = () => toast.error("Não foi possível ler o arquivo selecionado.");
    reader.onload = () => {
      const source = typeof reader.result === "string" ? reader.result : "";
      const dataBase64 = source.split(",")[1];
      if (!dataBase64) { toast.error("Não foi possível preparar o arquivo para envio."); return; }
      upload.mutate({ sessionId, fileName: file.name, mimeType: file.type || "application/octet-stream", dataBase64 });
    };
    reader.readAsDataURL(file);
  };
  const compareFiles = () => {
    if (selectedIds.length !== 2) { toast.error("Selecione duas minutas para comparar."); return; }
    compare.mutate({ sessionId, firstAttachmentId: selectedIds[0], secondAttachmentId: selectedIds[1] });
  };
  const comparatorMode = agent === "comparador";

  return <Card className="border-border/80"><CardHeader className="pb-3"><div className="flex items-start justify-between gap-4"><div><CardTitle className="flex items-center gap-2 font-display text-lg"><Files className="size-4" /> Minutas e anexos</CardTitle><CardDescription className="mt-1">DOCX, PDF ou TXT de até 10 MB. Os arquivos são usados somente como contexto desta conversa.</CardDescription></div><Button type="button" variant="outline" size="sm" disabled={upload.isPending} onClick={() => fileInputRef.current?.click()}>{upload.isPending ? <Loader2 className="size-4 animate-spin" /> : <UploadCloud className="size-4" />} Anexar</Button><input ref={fileInputRef} type="file" accept=".docx,.pdf,.txt,application/pdf,text/plain,application/vnd.openxmlformats-officedocument.wordprocessingml.document" className="hidden" onChange={selectFile} /></div></CardHeader><CardContent className="space-y-3">{attachments.isLoading ? <div className="flex items-center gap-2 py-2 text-sm text-muted-foreground"><Loader2 className="size-4 animate-spin" /> Carregando anexos…</div> : attachments.data?.length ? <div className="space-y-2">{attachments.data.map(file => <label key={file.id} className={`flex cursor-pointer items-center gap-3 rounded-lg border p-3 transition ${selectedIds.includes(file.id) ? "border-violet-300 bg-violet-50/70" : "border-border bg-background hover:bg-muted/50"}`}><Checkbox checked={selectedIds.includes(file.id)} onCheckedChange={() => toggle(file.id)} aria-label={`Selecionar ${file.name} para comparação`} /><FileText className="size-4 shrink-0 text-muted-foreground" /><span className="min-w-0 flex-1"><span className="block truncate text-sm font-medium">{file.name}</span><span className="mt-0.5 block text-xs text-muted-foreground">{file.mimeType === "application/pdf" ? "PDF" : file.mimeType === "text/plain" ? "TXT" : "DOCX"} · {formatBytes(file.byteSize)}</span></span>{selectedIds.includes(file.id) ? <Badge variant="secondary" className="shrink-0 text-[10px]">{selectedIds.indexOf(file.id) + 1}</Badge> : null}</label>)}</div> : <div className="rounded-lg border border-dashed bg-muted/20 p-4 text-sm leading-6 text-muted-foreground">Anexe uma minuta ou documento para que o Copiloto considere seu conteúdo na orientação.</div>}{comparatorMode ? <div className="rounded-lg border border-violet-200 bg-violet-50/70 p-4"><div className="flex gap-3"><FileDiff className="mt-0.5 size-4 shrink-0 text-violet-700" /><div><p className="text-sm font-semibold text-violet-950">Comparar duas minutas</p><p className="mt-1 text-xs leading-5 text-violet-800">Selecione dois arquivos acima. O comparador destacará diferenças textuais, operacionais e pontos que requerem revisão humana.</p></div></div><Button className="mt-3 w-full" disabled={selectedIds.length !== 2 || compare.isPending} onClick={compareFiles}>{compare.isPending ? <Loader2 className="size-4 animate-spin" /> : <FileDiff className="size-4" />} Comparar {selectedIds.length === 2 ? "minutas selecionadas" : "duas minutas"}</Button></div> : <div className="flex gap-2 rounded-lg border border-amber-200 bg-amber-50/70 p-3 text-xs leading-5 text-amber-950"><ShieldAlert className="mt-0.5 size-4 shrink-0" />Arquivos e respostas são apoio de análise. Confirme o conteúdo e a consequência jurídica com o profissional responsável.</div>}</CardContent></Card>;
}
