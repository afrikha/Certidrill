/**
 * Why a Pass is given or withdrawn by hand: a code from a closed list, never
 * free text, so that nothing personal (a name, an address) stays in the audit
 * log once the account is deleted. A support ticket number, 1 to 8 digits, may
 * go with it (too short for a phone number); the details live in the ticket.
 */
export const GRANT_REASONS = ["goodwill", "technical_issue", "held_payment", "test", "other"] as const;
export const REVOKE_REASONS = ["refund", "mistake", "test", "other"] as const;
