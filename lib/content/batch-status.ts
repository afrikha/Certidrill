import type { ContentStatus } from "@prisma/client";

/** The statuses a batch may set in the back-office: retired is the seed's (a file removed), needs_review the reports'. */
export const BATCH_STATUSES = ["draft", "reviewed", "published"] as const satisfies readonly ContentStatus[];
export type BatchStatus = (typeof BATCH_STATUSES)[number];
export const isBatchStatus = (value: unknown): value is BatchStatus => (BATCH_STATUSES as readonly unknown[]).includes(value);
