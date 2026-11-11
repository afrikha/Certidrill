import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { act, renderHook } from "@testing-library/react";
import { api, ApiError, getView } from "@/components/exam/api";
import { formatDuration, useCountdown } from "@/components/exam/use-countdown";
import { useSaveQueue } from "@/components/exam/use-save-queue";
import { res } from "./fixtures";

const fetchMock = vi.fn<typeof fetch>();

beforeEach(() => {
  fetchMock.mockReset();
  vi.stubGlobal("fetch", fetchMock);
  localStorage.clear();
});
afterEach(() => {
  vi.useRealTimers();
  vi.unstubAllGlobals();
  vi.restoreAllMocks();
});

describe("api", () => {
  it("GETs JSON without a body", async () => {
    fetchMock.mockResolvedValue(res(200, { ok: 1 }));
    await expect(api("/x")).resolves.toEqual({ ok: 1 });
    expect(fetchMock).toHaveBeenCalledWith("/x", { method: "GET", headers: undefined, body: undefined, credentials: "same-origin", cache: "no-store" });
  });

  it("sends a JSON body", async () => {
    fetchMock.mockResolvedValue(res(200, {}));
    await api("/y", { method: "PUT", body: { a: 1 } });
    expect(fetchMock).toHaveBeenCalledWith("/y", expect.objectContaining({ method: "PUT", headers: { "Content-Type": "application/json" }, body: '{"a":1}' }));
  });

  it("throws ApiError with the server code", async () => {
    fetchMock.mockResolvedValue(res(409, { error: "expired" }));
    const err = await api("/z").catch((e: unknown) => e);
    expect(err).toBeInstanceOf(ApiError);
    expect(err).toMatchObject({ status: 409, code: "expired", message: "expired" });
  });

  it("falls back to 'error' when the body is not JSON", async () => {
    fetchMock.mockResolvedValue({ ok: false, status: 500, json: () => Promise.reject(new SyntaxError("x")) } as unknown as Response);
    await expect(api("/z")).rejects.toMatchObject({ status: 500, code: "error" });
  });

  it("returns {} for a successful empty body", async () => {
    fetchMock.mockResolvedValue({ ok: true, status: 204, json: () => Promise.reject(new SyntaxError("x")) } as unknown as Response);
    await expect(api("/z")).resolves.toEqual({});
  });

  it("propagates network errors", async () => {
    fetchMock.mockRejectedValue(new TypeError("Failed to fetch"));
    await expect(api("/z")).rejects.toBeInstanceOf(TypeError);
  });

  it("getView fetches the attempt", async () => {
    fetchMock.mockResolvedValue(res(200, { id: "a" }));
    await getView("a");
    expect(fetchMock.mock.calls[0]![0]).toBe("/api/attempts/a");
  });
});

describe("formatDuration", () => {
  it.each([
    [0, "00:00"],
    [999, "00:01"],
    [61_000, "01:01"],
    [59 * 60_000 + 59_000, "59:59"],
    [3_600_000, "1:00:00"],
    [3_600_000 + 5 * 60_000 + 7_000, "1:05:07"],
  ])("%i ms → %s", (ms, out) => expect(formatDuration(ms)).toBe(out));
});

describe("useCountdown", () => {
  it("returns null without a deadline", () => {
    const { result } = renderHook(() => useCountdown(null, new Date().toISOString()));
    expect(result.current).toBeNull();
  });

  it("counts down using the server clock offset and stops at 0", async () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date("2026-01-01T10:00:00Z"));
    // Server is 10 s ahead of the browser.
    const { result } = renderHook(() => useCountdown("2026-01-01T10:01:10Z", "2026-01-01T10:00:10Z"));
    expect(result.current).toBe(60_000);
    await act(() => vi.advanceTimersByTimeAsync(10_000));
    expect(result.current).toBe(50_000);
    await act(() => vi.advanceTimersByTimeAsync(120_000));
    expect(result.current).toBe(0);
  });

  it("shows the new remaining time in the same render when the exam starts (regression: timer appeared one tick late)", () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date("2026-01-01T10:00:00Z"));
    const { result, rerender } = renderHook(({ d, now }) => useCountdown(d, now), {
      initialProps: { d: null as string | null, now: "2026-01-01T09:59:00Z" },
    });
    expect(result.current).toBeNull();
    // Start: the server returns its deadline and its clock; no timer has run yet.
    rerender({ d: "2026-01-01T11:40:05Z", now: "2026-01-01T10:00:05Z" });
    expect(result.current).toBe(100 * 60_000);
  });

  it("resets when the deadline changes", async () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date("2026-01-01T10:00:00Z"));
    const { result, rerender } = renderHook(({ d }) => useCountdown(d, "2026-01-01T10:00:00Z"), { initialProps: { d: "2026-01-01T10:01:00Z" as string | null } });
    expect(result.current).toBe(60_000);
    rerender({ d: "2026-01-01T10:02:00Z" });
    await act(() => vi.advanceTimersByTimeAsync(1));
    expect(result.current).toBe(120_000);
    rerender({ d: null });
    await act(() => vi.advanceTimersByTimeAsync(500));
    expect(result.current).toBeNull();
  });
});

describe("useSaveQueue", () => {
  const KEY = "certidrill:pending:att1";
  const setup = (onConflict = vi.fn()) => ({ onConflict, ...renderHook(() => useSaveQueue("att1", onConflict)) });
  const tick = (ms: number) => act(() => vi.advanceTimersByTimeAsync(ms));
  const bodies = () => fetchMock.mock.calls.map(([url, init]) => [url, JSON.parse(String(init?.body))]);

  beforeEach(() => vi.useFakeTimers());

  it("debounces, merges patches of the same item, and saves", async () => {
    fetchMock.mockResolvedValue(res(200));
    const { result } = setup();
    expect(result.current.status).toBe("saved");
    act(() => result.current.enqueue("i1", { response: { optionId: "a" } }));
    act(() => result.current.enqueue("i1", { flagged: true }));
    expect(result.current.status).toBe("saving");
    expect(JSON.parse(localStorage.getItem(KEY)!)).toEqual([["i1", { response: { optionId: "a" }, flagged: true }]]);
    expect(result.current.pendingPatches().get("i1")).toEqual({ response: { optionId: "a" }, flagged: true });
    await tick(249);
    expect(fetchMock).not.toHaveBeenCalled();
    await tick(1);
    expect(bodies()).toEqual([["/api/attempts/att1/items/i1", { response: { optionId: "a" }, flagged: true }]]);
    expect(fetchMock.mock.calls[0]![1]!.method).toBe("PUT");
    expect(result.current.status).toBe("saved");
    expect(localStorage.getItem(KEY)).toBeNull();
    expect(result.current.pendingPatches().size).toBe(0);
  });

  it("sends several items in order", async () => {
    fetchMock.mockResolvedValue(res(200));
    const { result } = setup();
    act(() => {
      result.current.enqueue("i1", { flagged: true });
      result.current.enqueue("i2", { flagged: false });
    });
    await act(() => result.current.flush());
    expect(bodies().map(([u]) => u)).toEqual(["/api/attempts/att1/items/i1", "/api/attempts/att1/items/i2"]);
  });

  it("keeps changes offline and retries with exponential backoff", async () => {
    fetchMock.mockRejectedValueOnce(new TypeError("offline")).mockRejectedValueOnce(new TypeError("offline")).mockResolvedValue(res(200));
    const { result } = setup();
    act(() => result.current.enqueue("i1", { response: { value: true } }));
    await tick(250);
    expect(result.current.status).toBe("error");
    expect(localStorage.getItem(KEY)).not.toBeNull();
    // A new change while in error keeps the error status visible.
    act(() => result.current.enqueue("i1", { flagged: true }));
    expect(result.current.status).toBe("error");
    await tick(250); // debounce → second failure, backoff now 2 s
    expect(fetchMock).toHaveBeenCalledTimes(2);
    await tick(1999);
    expect(fetchMock).toHaveBeenCalledTimes(2);
    await tick(1);
    expect(fetchMock).toHaveBeenCalledTimes(3);
    expect(result.current.status).toBe("saved");
    expect(localStorage.getItem(KEY)).toBeNull();
  });

  it("treats 5xx as transient", async () => {
    fetchMock.mockResolvedValueOnce(res(503, { error: "unavailable" })).mockResolvedValue(res(200));
    const { result } = setup();
    act(() => result.current.enqueue("i1", { flagged: true }));
    await tick(250);
    expect(result.current.status).toBe("error");
    await tick(1000);
    expect(result.current.status).toBe("saved");
    expect(fetchMock).toHaveBeenCalledTimes(2);
  });

  it("caps the backoff at 15 s", async () => {
    fetchMock.mockRejectedValue(new TypeError("offline"));
    const { result } = setup();
    act(() => result.current.enqueue("i1", { flagged: true }));
    await tick(250);
    for (const ms of [1000, 2000, 4000, 8000, 15000, 15000]) await tick(ms);
    expect(fetchMock).toHaveBeenCalledTimes(7);
    await tick(14_999);
    expect(fetchMock).toHaveBeenCalledTimes(7);
    await tick(1);
    expect(fetchMock).toHaveBeenCalledTimes(8);
  });

  it("drops 4xx entries; 409/404 report a conflict, others continue silently", async () => {
    fetchMock
      .mockResolvedValueOnce(res(409, { error: "expired" }))
      .mockResolvedValueOnce(res(422, { error: "invalid" }))
      .mockResolvedValueOnce(res(404, {}))
      .mockResolvedValue(res(200));
    const { result, onConflict } = setup();
    act(() => {
      result.current.enqueue("i1", { flagged: true });
      result.current.enqueue("i2", { flagged: true });
      result.current.enqueue("i3", { flagged: true });
      result.current.enqueue("i4", { flagged: true });
    });
    await tick(250);
    expect(fetchMock).toHaveBeenCalledTimes(4);
    expect(onConflict.mock.calls).toEqual([["expired"], ["error"]]);
    expect(result.current.status).toBe("saved");
    expect(localStorage.getItem(KEY)).toBeNull();
  });

  it("uses the latest onConflict callback", async () => {
    fetchMock.mockResolvedValue(res(409, { error: "finished" }));
    const first = vi.fn();
    const second = vi.fn();
    const { result, rerender } = renderHook(({ cb }) => useSaveQueue("att1", cb), { initialProps: { cb: first } });
    rerender({ cb: second });
    act(() => result.current.enqueue("i1", { flagged: true }));
    await tick(250);
    expect(first).not.toHaveBeenCalled();
    expect(second).toHaveBeenCalledWith("finished");
  });

  it("re-sends a patch changed while its request was in flight", async () => {
    let resolveFirst!: (r: Response) => void;
    fetchMock.mockImplementationOnce(() => new Promise((r) => (resolveFirst = r))).mockResolvedValue(res(200));
    const { result } = setup();
    act(() => result.current.enqueue("i1", { response: { optionId: "a" } }));
    await tick(250);
    act(() => result.current.enqueue("i1", { response: { optionId: "b" } }));
    // A concurrent flush joins the running one.
    let joined: Promise<boolean> | undefined;
    act(() => {
      joined = result.current.flush();
    });
    await act(async () => {
      resolveFirst(res(200));
      await joined;
    });
    expect(bodies().map(([, b]) => b)).toEqual([{ response: { optionId: "a" } }, { response: { optionId: "b" } }]);
    expect(result.current.status).toBe("saved");
  });

  it("replays what a previous page left in localStorage", async () => {
    localStorage.setItem(KEY, JSON.stringify([["i9", { flagged: true }]]));
    fetchMock.mockResolvedValue(res(200));
    setup();
    await tick(0);
    expect(bodies()).toEqual([["/api/attempts/att1/items/i9", { flagged: true }]]);
    expect(localStorage.getItem(KEY)).toBeNull();
  });

  it("ignores corrupt localStorage content", async () => {
    localStorage.setItem(KEY, "{not json");
    const { result } = setup();
    await tick(0);
    expect(fetchMock).not.toHaveBeenCalled();
    expect(result.current.status).toBe("saved");
  });

  it("still works in memory when storage throws", async () => {
    vi.spyOn(Storage.prototype, "setItem").mockImplementation(() => {
      throw new Error("quota");
    });
    fetchMock.mockResolvedValue(res(200));
    const { result } = setup();
    act(() => result.current.enqueue("i1", { flagged: true }));
    await tick(250);
    expect(fetchMock).toHaveBeenCalledOnce();
    expect(result.current.status).toBe("saved");
  });

  it("flushes when the browser comes back online", async () => {
    fetchMock.mockRejectedValueOnce(new TypeError("offline")).mockResolvedValue(res(200));
    const { result } = setup();
    act(() => result.current.enqueue("i1", { flagged: true }));
    await tick(250);
    expect(result.current.status).toBe("error");
    await act(async () => {
      window.dispatchEvent(new Event("online"));
      await vi.advanceTimersByTimeAsync(0);
    });
    expect(fetchMock).toHaveBeenCalledTimes(2);
    expect(result.current.status).toBe("saved");
  });

  it("warns before unload only while changes are pending", async () => {
    fetchMock.mockResolvedValue(res(200));
    const { result, unmount } = setup();
    const ev1 = new Event("beforeunload", { cancelable: true });
    window.dispatchEvent(ev1);
    expect(ev1.defaultPrevented).toBe(false);
    act(() => result.current.enqueue("i1", { flagged: true }));
    const ev2 = new Event("beforeunload", { cancelable: true });
    window.dispatchEvent(ev2);
    expect(ev2.defaultPrevented).toBe(true);
    unmount();
    const ev3 = new Event("beforeunload", { cancelable: true });
    window.dispatchEvent(ev3);
    expect(ev3.defaultPrevented).toBe(false);
    await tick(1000);
    expect(fetchMock).not.toHaveBeenCalled(); // timer cleared on unmount
  });

  it("flush with nothing pending resolves as saved", async () => {
    const { result } = setup();
    await act(() => result.current.flush());
    expect(fetchMock).not.toHaveBeenCalled();
    expect(result.current.status).toBe("saved");
  });
});
