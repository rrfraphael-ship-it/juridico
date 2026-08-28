export type DealDataAutosavePayload = {
  contactName?: string;
  contactEmail?: string;
  contactPhone?: string;
  contractData: unknown;
};

export type DealDataAutosaveRequest<TPayload extends DealDataAutosavePayload = DealDataAutosavePayload> =
  | { target: "interno"; input: TPayload & { dealId: number } }
  | { target: "compartilhado"; input: TPayload & { token: string } };

export function createDealDataAutosaveRequest<TPayload extends DealDataAutosavePayload>({ dealId, token, payload }: { dealId?: number; token?: string; payload: TPayload }): DealDataAutosaveRequest<TPayload> | null {
  if (dealId) return { target: "interno", input: { ...payload, dealId } };
  if (token) return { target: "compartilhado", input: { ...payload, token } };
  return null;
}

export async function persistDealDataAutosave<TPayload extends DealDataAutosavePayload, TResult>(request: DealDataAutosaveRequest<TPayload>, handlers: { saveForDeal: (input: TPayload & { dealId: number }) => Promise<TResult>; savePublic: (input: TPayload & { token: string }) => Promise<TResult> }) {
  try {
    const result = request.target === "interno" ? await handlers.saveForDeal(request.input) : await handlers.savePublic(request.input);
    return { status: "salvo" as const, result };
  } catch {
    return { status: "erro" as const, message: "Não foi possível salvar os Dados do negócio. Tente novamente." };
  }
}
