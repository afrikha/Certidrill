import { describe, expect, it } from "vitest";
import { cartsOf } from "@/lib/billing/cart";

describe("cartsOf", () => {
  it("adds up what Stripe charged for each cart, in the charged currency", () => {
    const carts = cartsOf([
      { checkoutId: "a", chargedCents: 1289, chargedCurrency: "eur", currency: "EUR" },
      { checkoutId: "b", chargedCents: null, chargedCurrency: null, currency: "usd" },
      { checkoutId: "a", chargedCents: 611, chargedCurrency: "eur", currency: "EUR" },
    ]);
    expect(carts.get("a")).toEqual({ count: 2, charged: 1900, currency: "eur" });
    expect(carts.get("b")).toEqual({ count: 1, charged: 0, currency: "usd" });
  });
});
