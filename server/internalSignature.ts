export type InternalSigner = { name: string; email: string; order: number; role?: string };

export function normalizeInternalSigners(signers: InternalSigner[]) {
  return [...signers].sort((first, second) => first.order - second.order).map((signer, index) => ({ ...signer, order: index + 1 }));
}

export function buildInternalEnvelope(input: { ownerId: number; dealId: number; contractId: number; signers: InternalSigner[]; expiresAt?: Date | null }) {
  return { ownerId: input.ownerId, dealId: input.dealId, contractId: input.contractId, provider: "outro" as const, status: "pronto" as const, signers: normalizeInternalSigners(input.signers), expiresAt: input.expiresAt ?? null };
}
