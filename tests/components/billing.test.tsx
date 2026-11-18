import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { act, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { BuyPass, isPaymentUrl } from "@/components/billing/buy-pass";
import { PurchaseStatus, type Purchase } from "@/components/billing/purchase-status";
import { renderIntl } from "./render";

const AZ = [{ code: "az-104", title: "Microsoft Azure Administrator", amountCents: 1900, currency: "eur" }];
const reply = (status: number, body: unknown) => Promise.resolve(new Response(JSON.stringify(body), { status, headers: { "content-type": "application/json" } }));

let fetchMock: ReturnType<typeof vi.fn>;
let assign: ReturnType<typeof vi.fn>;
beforeEach(() => {
  fetchMock = vi.fn();
  vi.stubGlobal("fetch", fetchMock);
  assign = vi.fn();
  vi.stubGlobal("location", { ...window.location, assign });
});
afterEach(() => {
  vi.unstubAllGlobals();
  vi.useRealTimers();
});

describe("BuyPass", () => {
  it("sends only the plan and the certification, then goes to the payment page", async () => {
    fetchMock.mockReturnValue(reply(200, { url: "https://checkout.stripe.test/cs_1" }));
    renderIntl(<BuyPass planCode="pass_90" certifications={AZ} />);
    expect(screen.queryByRole("checkbox")).toBeNull();
    await userEvent.click(screen.getByRole("button", { name: "Buy the Pass" }));
    expect(fetchMock).toHaveBeenCalledWith("/api/billing/checkout", expect.objectContaining({ method: "POST", body: JSON.stringify({ planCode: "pass_90", certificationCodes: ["az-104"] }) }));
    expect(assign).toHaveBeenCalledWith("https://checkout.stripe.test/cs_1");
    expect(screen.getByRole("button", { name: "Redirecting to payment…" })).toBeDisabled();
  });

  it("buys several Passes at once, the one the buyer came from ticked first, in the order of the list (FR)", async () => {
    fetchMock.mockReturnValue(reply(200, { url: "https://checkout.stripe.test/cs_2" }));
    const certifications = [...AZ, { code: "az-305", title: "Azure Solutions Architect", amountCents: 1900, currency: "eur" }, { code: "az-900", title: "Azure Fundamentals", amountCents: 900, currency: "eur" }];
    renderIntl(<BuyPass planCode="pass_90" certifications={certifications} defaultCertification="az-305" />, "fr");
    expect(screen.getByRole("checkbox", { name: /AZ-305/ })).toBeChecked();
    expect(screen.getByRole("checkbox", { name: /AZ-104/ })).not.toBeChecked();
    expect(screen.getByTestId("pass-price")).toHaveTextContent("Total : 19,00 €");
    await userEvent.click(screen.getByRole("checkbox", { name: /AZ-900/ }));
    await userEvent.click(screen.getByRole("checkbox", { name: /AZ-104/ }));
    expect(screen.getByTestId("pass-price")).toHaveTextContent("Total pour 3 Pass : 47,00 €");
    await userEvent.click(screen.getByRole("button", { name: "Acheter les 3 Pass" }));
    expect(JSON.parse(fetchMock.mock.calls[0]![1].body as string)).toEqual({ planCode: "pass_90", certificationCodes: ["az-104", "az-305", "az-900"] });
  });

  it("needs a certification, and stops at the largest cart", async () => {
    const many = Array.from({ length: 12 }, (_, i) => ({ code: `c-${String(i).padStart(2, "0")}`, title: `Cert ${i}`, amountCents: 1000, currency: "eur" }));
    renderIntl(<BuyPass planCode="pass_90" certifications={many} />);
    await userEvent.click(screen.getByRole("checkbox", { name: /C-00/ }));
    expect(screen.getByRole("button", { name: "Choose a certification" })).toBeDisabled();
    for (const c of many.slice(0, 10)) await userEvent.click(screen.getByRole("checkbox", { name: new RegExp(c.code.toUpperCase()) }));
    expect(screen.getByRole("button", { name: "Buy the 10 Passes" })).toBeEnabled();
    expect(screen.getByRole("checkbox", { name: /C-10/ })).toBeDisabled();
    expect(screen.getByText("10 Passes at most in one purchase.")).toBeInTheDocument();
  });

  it("explains a refusal and lets the buyer try again", async () => {
    renderIntl(<BuyPass planCode="pass_90" certifications={AZ} defaultCertification="unknown" />);
    for (const [code, text] of [
      ["sales_closed", "Online payment is not open yet."],
      ["email_unverified", "Please verify your e-mail address first"],
      ["rate_limited", "Too many attempts."],
      ["unavailable", "Payment is unavailable for the moment."],
      ["internal", "The payment could not start."],
    ] as const) {
      fetchMock.mockReturnValueOnce(reply(400, { error: code }));
      await userEvent.click(screen.getByRole("button", { name: "Buy the Pass" }));
      expect(await screen.findByRole("alert")).toHaveTextContent(text);
    }
    fetchMock.mockRejectedValueOnce(new TypeError("offline"));
    await userEvent.click(screen.getByRole("button", { name: "Buy the Pass" }));
    expect(await screen.findByRole("alert")).toHaveTextContent("The payment could not start.");
    expect(assign).not.toHaveBeenCalled();
  });

  it("goes only to an HTTPS payment page, or a local one in tests", async () => {
    for (const url of ["javascript:alert(1)", "http://evil.example/pay", "/relative", "not a url", 42]) {
      fetchMock.mockReturnValueOnce(reply(200, { url }));
      const { unmount } = renderIntl(<BuyPass planCode="pass_90" certifications={AZ} />);
      await userEvent.click(screen.getByRole("button", { name: "Buy the Pass" }));
      expect(await screen.findByRole("alert"), String(url)).toHaveTextContent("The payment could not start.");
      unmount();
    }
    expect(assign).not.toHaveBeenCalled();
    for (const url of ["https://checkout.stripe.com/c/pay/cs_1", "http://localhost:12111/pay/cs_1", "http://127.0.0.1:12111/pay/cs_1"]) expect(isPaymentUrl(url), url).toBe(true);
  });
});

type Pass = Purchase["passes"][number];
/** A purchase of one Pass, or of the passes given. */
const purchase = (p: Partial<Pass>, passes?: Pass[]): Purchase => {
  const pass: Pass = { status: "paid", certification: "az-104", startsAt: "2026-11-13T10:00:00Z", expiresAt: "2027-02-11T10:00:00Z", chained: false, ...p };
  return { status: pass.status, passes: passes ?? [pass] };
};

describe("PurchaseStatus", () => {
  it("shows an active Pass, or one that starts after the current one", () => {
    const { unmount } = renderIntl(<PurchaseStatus sessionId="cs_1" initial={purchase({})} />);
    expect(screen.getByRole("status")).toHaveTextContent("Your AZ-104 Pass is active until February 11, 2027.");
    expect(screen.getByRole("link", { name: "Go to the dashboard" })).toHaveAttribute("href", "/dashboard");
    unmount();
    renderIntl(<PurchaseStatus sessionId="cs_1" initial={purchase({ chained: true, startsAt: "2027-02-11T10:00:00Z", expiresAt: "2027-05-12T10:00:00Z" })} />, "fr");
    expect(screen.getByRole("status")).toHaveTextContent("Votre Pass AZ-104 commence le 11 février 2027, à la fin de votre Pass en cours, et dure jusqu'au 12 mai 2027.");
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it("lists the Passes of a purchase of several", () => {
    const passes: Pass[] = [
      { status: "paid", certification: "az-104", startsAt: "2026-11-13T10:00:00Z", expiresAt: "2027-02-11T10:00:00Z", chained: false },
      { status: "paid", certification: "az-900", startsAt: "2027-01-01T10:00:00Z", expiresAt: "2027-04-01T10:00:00Z", chained: true },
    ];
    renderIntl(<PurchaseStatus sessionId="cs_cart" initial={purchase({}, passes)} />);
    expect(screen.getByRole("status")).toHaveTextContent("Your 2 Passes are active:");
    const items = screen.getByTestId("purchase-passes").querySelectorAll("li");
    expect(items[0]).toHaveTextContent("Your AZ-104 Pass is active until February 11, 2027.");
    expect(items[1]).toHaveTextContent("Your AZ-900 Pass starts on January 1, 2027");
  });

  it("waits for the webhook, then shows the Pass", async () => {
    vi.useFakeTimers();
    fetchMock
      .mockImplementationOnce(() => Promise.reject(new TypeError("offline")))
      .mockImplementationOnce(() => reply(200, purchase({ status: "pending", startsAt: null, expiresAt: null })))
      .mockImplementation(() => reply(200, purchase({})));
    renderIntl(<PurchaseStatus sessionId="cs_9" initial={purchase({ status: "pending", startsAt: null, expiresAt: null })} />);
    expect(screen.getByRole("status")).toHaveTextContent("Payment received, activating your Pass…");
    for (let i = 0; i < 3; i++) await act(() => vi.advanceTimersByTimeAsync(2000));
    expect(fetchMock).toHaveBeenCalledWith("/api/billing/status?session_id=cs_9", expect.anything());
    expect(screen.getByTestId("purchase-status")).toHaveAttribute("data-status", "paid");
    expect(screen.getByRole("status")).toHaveTextContent("Your AZ-104 Pass is active until");
  });

  it("says a payment without a Pass is being checked, and stops polling", () => {
    renderIntl(<PurchaseStatus sessionId="cs_held" initial={purchase({ status: "paid", startsAt: null, expiresAt: null })} />, "fr");
    expect(screen.getByRole("status")).toHaveTextContent("Paiement reçu. Nous le vérifions avant d'activer votre Pass");
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it("stops waiting after a while and says the e-mail will follow", async () => {
    vi.useFakeTimers();
    fetchMock.mockImplementation(() => reply(200, purchase({ status: "pending", startsAt: null, expiresAt: null })));
    renderIntl(<PurchaseStatus sessionId="cs_slow" initial={purchase({ status: "pending", startsAt: null, expiresAt: null })} />);
    await act(() => vi.advanceTimersByTimeAsync(95_000));
    expect(screen.getByRole("status")).toHaveTextContent("Confirmation is taking longer than usual.");
    const calls = fetchMock.mock.calls.length;
    await act(() => vi.advanceTimersByTimeAsync(10_000));
    expect(fetchMock.mock.calls.length).toBe(calls);
  });

  it("says when the payment failed, expired or was refunded", () => {
    for (const [status, text] of [
      ["failed", "The payment did not go through"],
      ["expired", "The payment session expired without payment."],
      ["refunded", "This payment was refunded."],
      ["held", "We are checking it before activating your Pass"],
    ] as const) {
      const { unmount } = renderIntl(<PurchaseStatus sessionId="cs" initial={purchase({ status })} />);
      expect(screen.getByRole("status")).toHaveTextContent(text);
      if (status === "failed" || status === "expired") expect(screen.getByRole("link", { name: "Back to pricing" })).toHaveAttribute("href", "/pricing");
      unmount();
    }
  });
});
