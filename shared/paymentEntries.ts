export type PaymentEntry = { amount: string; description: string };

export const emptyPaymentEntry = (): PaymentEntry => ({ amount: "", description: "" });

export const addPaymentEntry = (entries: PaymentEntry[]) => [...entries, emptyPaymentEntry()];

export const updatePaymentEntry = (entries: PaymentEntry[], index: number, field: keyof PaymentEntry, value: string) => entries.map((entry, entryIndex) => entryIndex === index ? { ...entry, [field]: value } : entry);

export const removePaymentEntry = (entries: PaymentEntry[], index: number) => entries.filter((_, entryIndex) => entryIndex !== index);

export const serializePaymentEntries = (entries: PaymentEntry[]) => entries.map(entry => ({ amount: entry.amount.trim() ? Number(entry.amount) : undefined, description: entry.description }));
