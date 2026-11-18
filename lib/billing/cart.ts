/** Passes in one purchase at most (one Stripe Checkout session); shared by the server and the purchase form. */
export const MAX_CART = 10;

/**
 * The carts among held payments: by checkoutId, how many Passes and what
 * Stripe charged in all. Their payments share one Stripe payment, so
 * refunding it refunds the whole cart.
 */
export function cartsOf(payments: readonly { checkoutId: string; chargedCents: number | null; chargedCurrency: string | null; currency: string }[]) {
  const carts = new Map<string, { count: number; charged: number; currency: string }>();
  for (const p of payments) {
    const cart = carts.get(p.checkoutId) ?? { count: 0, charged: 0, currency: p.chargedCurrency ?? p.currency };
    carts.set(p.checkoutId, { ...cart, count: cart.count + 1, charged: cart.charged + (p.chargedCents ?? 0) });
  }
  return carts;
}
