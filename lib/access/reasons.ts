/**
 * Why a Pass is given or withdrawn by hand: a code from a closed list, never
 * free text, so that nothing personal (a name, an address) stays in the audit
 * log once the account is deleted. No ticket number either: a run of digits
 * can still be a phone number or a birth date. The details live in the
 * support exchange, outside the audit log.
 */
export const GRANT_REASONS = ["goodwill", "technical_issue", "held_payment", "test", "other"] as const;
export const REVOKE_REASONS = ["refund", "mistake", "test", "other"] as const;
