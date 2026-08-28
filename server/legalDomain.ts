export type IntakeDealInput = {
  transactionType: "venda" | "locacao" | "outro";
  propertyAddress: string;
  estimatedValue?: number | null;
  deadline?: string | null;
};

export function buildDealFieldsFromIntake(input: IntakeDealInput) {
  return {
    title: input.propertyAddress,
    transactionType: input.transactionType,
    propertyAddress: input.propertyAddress,
    estimatedValue: input.estimatedValue ?? null,
    deadline: input.deadline ? new Date(input.deadline) : null,
  };
}

export function nextContractVersion(version: number) {
  return Math.max(1, version + 1);
}

export function canStoreDiligenceFile(byteLength: number, maxBytes = 8 * 1024 * 1024) {
  return byteLength > 0 && byteLength <= maxBytes;
}
