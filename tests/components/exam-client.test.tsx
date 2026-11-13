import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { act, fireEvent, screen, waitFor, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import type { AttemptView } from "@/lib/exam/session";
import { ExamClient } from "@/components/exam/exam-client";
import { renderIntl } from "./render";
import { item, polyfillDialog, res, section, seriesBody, view } from "./fixtures";

const { replace, push } = vi.hoisted(() => ({ replace: vi.fn(), push: vi.fn() }));
vi.mock("next/navigation", () => ({ useRouter: () => ({ replace, push, refresh: vi.fn() }), usePathname: () => "/exam/att1" }));

polyfillDialog();

type Handler = (body: unknown) => Response | Promise<Response>;
const fetchMock = vi.fn<typeof fetch>();
let routes: Record<string, Handler> = {};

/** Routes "METHOD /path" to a handler; unknown routes answer 200 {}. */
function mockApi(r: Record<string, Handler>) {
  routes = r;
}
const calls = () => fetchMock.mock.calls.map(([url, init]) => `${init?.method ?? "GET"} ${String(url)}`);
const callBodies = (key: string) =>
  fetchMock.mock.calls.filter(([url, init]) => `${init?.method ?? "GET"} ${String(url)}` === key).map(([, init]) => JSON.parse(String(init?.body)));

beforeEach(() => {
  replace.mockReset();
  fetchMock.mockReset();
  routes = {};
  fetchMock.mockImplementation(async (url, init) => {
    const key = `${init?.method ?? "GET"} ${String(url)}`;
    const h = routes[key];
    return h ? h(init?.body ? JSON.parse(String(init.body)) : undefined) : res(200, {});
  });
  vi.stubGlobal("fetch", fetchMock);
  localStorage.clear();
});
afterEach(() => {
  vi.useRealTimers();
  vi.unstubAllGlobals();
});

const A = "/api/attempts/att1";
const dialog = () => screen.getByRole("dialog");

/** Main section only (3 single-choice questions). */
const mainView = (extra: Partial<AttemptView> = {}) => view(extra);

/** Case study (2 q) → main (2 q). */
function caseThenMain(current: "cs" | "m" = "cs") {
  const items = [item("c1", 1, "cs"), item("c2", 2, "cs"), item("m1", 3, "m"), item("m2", 4, "m")];
  return view({
    items,
    currentSectionId: current,
    sections: [
      section("cs", 1, "case_study", ["c1", "c2"], {
        locked: current === "m",
        caseStudy: {
          titleHtml: "Contoso <b>Ltd</b>",
          tabs: [
            { key: "overview", titleHtml: "Overview", html: "<p>Overview text</p>" },
            { key: "reqs", titleHtml: "Requirements", html: "<p>Requirements text</p>" },
            { key: "tech", titleHtml: "Technical", html: "<p>Technical text</p>" },
          ],
        },
      }),
      section("m", 2, "main", ["m1", "m2"]),
    ],
  });
}

/** Main (1 q) → series (2 q, last section). */
function mainThenSeries(current: "m" | "se" = "m", answered: string[] = []) {
  const items = [
    item("m1", 1, "m"),
    item("y1", 2, "se", seriesBody(1), { answered: answered.includes("y1"), response: answered.includes("y1") ? { value: true } : null }),
    item("y2", 3, "se", seriesBody(2), { answered: answered.includes("y2") }),
  ];
  return view({
    items,
    currentSectionId: current,
    sections: [section("m", 1, "main", ["m1"], { locked: current === "se" }), section("se", 2, "series", ["y1", "y2"], { seriesStemHtml: "<p>Goal: secure the VM</p>" })],
  });
}

/** Series (2 q) → main (1 q). */
function seriesThenMain(current: "se" | "m" = "se", answered: string[] = []) {
  const items = [
    item("y1", 1, "se", seriesBody(1), { answered: answered.includes("y1") }),
    item("y2", 2, "se", seriesBody(2), { answered: answered.includes("y2") }),
    item("m1", 3, "m"),
  ];
  return view({
    items,
    currentSectionId: current,
    sections: [section("se", 1, "series", ["y1", "y2"], { seriesStemHtml: "<p>Goal</p>" }), section("m", 2, "main", ["m1"])],
  });
}

describe("ExamClient — start", () => {
  it("shows the welcome screen and starts the exam", async () => {
    mockApi({ [`POST ${A}/start`]: () => res(200, mainView()) });
    renderIntl(<ExamClient initial={mainView({ status: "not_started", sections: [], items: [], startedAt: null, deadlineAt: null, totalQuestions: 3 })} resumed={false} />);
    expect(screen.getByRole("heading", { name: "AZ-104 mock exam" })).toBeInTheDocument();
    await userEvent.click(screen.getByRole("button", { name: "Start" }));
    expect(await screen.findByText("Question 1 of 3")).toBeInTheDocument();
    expect(screen.getByRole("timer", { name: "Time left" })).toHaveTextContent(/^1:\d\d:\d\d$/);
    expect(calls()).toEqual([`POST ${A}/start`]);
  });

  it("shows an error and refreshes when starting fails", async () => {
    mockApi({ [`POST ${A}/start`]: () => res(500, { error: "boom" }), [`GET ${A}`]: () => res(500) });
    renderIntl(<ExamClient initial={mainView({ status: "not_started" })} resumed={false} />);
    await userEvent.click(screen.getByRole("button", { name: "Start" }));
    expect(await screen.findByRole("alert")).toHaveTextContent("Something went wrong. Please try again.");
    expect(calls()).toEqual([`POST ${A}/start`, `GET ${A}`]);
    expect(screen.getByRole("button", { name: "Start" })).toBeEnabled();
  });

  it("sends to the offer screen when access is refused at the start", async () => {
    mockApi({ [`POST ${A}/start`]: () => res(402, { error: "quota_exhausted" }) });
    renderIntl(<ExamClient initial={mainView({ status: "not_started" })} resumed={false} />);
    await userEvent.click(screen.getByRole("button", { name: "Start" }));
    await waitFor(() => expect(push).toHaveBeenCalledWith(`/offer?reason=quota_exhausted&certification=${mainView().certification.code}`));
    expect(calls()).toEqual([`POST ${A}/start`]);
  });

  it("shows an error, not the offer screen, for a refusal that no offer lifts", async () => {
    for (const [status, error, text] of [[403, "email_unverified", "Confirm your e-mail address before starting a mock exam."], [402, "something_new", "Something went wrong"]] as const) {
      push.mockClear();
      mockApi({ [`POST ${A}/start`]: () => res(status, { error }), [`GET ${A}`]: () => res(200, mainView({ status: "not_started" })) });
      const { unmount } = renderIntl(<ExamClient initial={mainView({ status: "not_started" })} resumed={false} />);
      await userEvent.click(screen.getByRole("button", { name: "Start" }));
      expect(await screen.findByRole("alert")).toHaveTextContent(text);
      expect(push).not.toHaveBeenCalled();
      unmount();
    }
  });

  it("goes to the results when the attempt is already finished", async () => {
    mockApi({ [`POST ${A}/start`]: () => res(409, { error: "finished" }) });
    renderIntl(<ExamClient initial={mainView({ status: "not_started" })} resumed={false} />);
    await userEvent.click(screen.getByRole("button", { name: "Start" }));
    await waitFor(() => expect(replace).toHaveBeenCalledWith("/results/att1"));
  });

  it("goes to the results when the started view comes back submitted", async () => {
    mockApi({ [`POST ${A}/start`]: () => res(200, mainView({ status: "submitted" })) });
    renderIntl(<ExamClient initial={mainView({ status: "not_started" })} resumed={false} />);
    await userEvent.click(screen.getByRole("button", { name: "Start" }));
    await waitFor(() => expect(replace).toHaveBeenCalledWith("/results/att1"));
  });

  it("announces a resumed exam", () => {
    renderIntl(<ExamClient initial={mainView()} resumed />);
    expect(screen.getByText(/Exam resumed/)).toBeInTheDocument();
  });

  it("shows a status when there is no open section", () => {
    renderIntl(<ExamClient initial={mainView({ currentSectionId: null })} resumed={false} />);
    expect(screen.getByRole("status")).toHaveTextContent("Submitting…");
  });

  it("renders in French", () => {
    renderIntl(<ExamClient initial={mainView({ locale: "fr" })} resumed />, "fr");
    expect(screen.getByText("Question 1 sur 3")).toBeInTheDocument();
    expect(screen.getByText(/Examen repris/)).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /Suivant/ })).toBeInTheDocument();
    expect(screen.getByTestId("save-status")).toHaveTextContent("Toutes les réponses sont enregistrées");
  });
});

describe("ExamClient — main section", () => {
  it("navigates with Previous / Next and reaches the review screen", async () => {
    renderIntl(<ExamClient initial={mainView()} resumed={false} />);
    expect(screen.getByText("AZ-104".toLowerCase())).toBeInTheDocument();
    expect(screen.getByRole("navigation", { name: "Questions" })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /Previous/ })).toBeDisabled();
    await userEvent.click(screen.getByRole("button", { name: /Next/ }));
    expect(screen.getByText("Question 2 of 3")).toBeInTheDocument();
    expect(screen.getByRole("article", { name: "Stem qi2" })).toBeInTheDocument();
    await userEvent.click(screen.getByRole("button", { name: /Previous/ }));
    expect(screen.getByText("Question 1 of 3")).toBeInTheDocument();
    await userEvent.click(screen.getByRole("button", { name: /Next/ }));
    await userEvent.click(screen.getByRole("button", { name: /Next/ }));
    expect(screen.getByText("Question 3 of 3")).toBeInTheDocument();
    expect(screen.queryByRole("button", { name: /Next/ })).not.toBeInTheDocument();
    await userEvent.click(screen.getByRole("button", { name: "Review →" }));
    expect(screen.getByRole("heading", { name: "Review your answers" })).toBeInTheDocument();
    await userEvent.click(screen.getByRole("button", { name: /Go to question 2/ }));
    expect(screen.getByText("Question 2 of 3")).toBeInTheDocument();
    await userEvent.click(screen.getByRole("button", { name: "Review" }));
    await userEvent.click(screen.getByRole("button", { name: /Back to the questions/ }));
    expect(screen.getByText("Question 2 of 3")).toBeInTheDocument();
  });

  it("autosaves answers and flags", async () => {
    renderIntl(<ExamClient initial={mainView()} resumed={false} />);
    const status = screen.getByTestId("save-status");
    expect(status).toHaveTextContent("✓ All answers saved");
    await userEvent.click(screen.getByLabelText(/Beta/));
    expect(status).toHaveTextContent("Saving…");
    await userEvent.click(screen.getByRole("checkbox", { name: "Mark for review" }));
    expect(screen.getByRole("checkbox", { name: "Mark for review" })).toBeChecked();
    await waitFor(() => expect(status).toHaveTextContent("All answers saved"));
    expect(callBodies(`PUT ${A}/items/i1`)).toEqual([{ response: { optionId: "b" }, flagged: true }]);
    await userEvent.click(screen.getByRole("button", { name: "Review" }));
    expect(screen.getByRole("button", { name: "Go to question 1 — Answered — Flagged" })).toBeInTheDocument();
  });

  it("shows 'not saved' when the network fails, and refuses to submit while an answer is unsaved (regression)", async () => {
    mockApi({
      [`PUT ${A}/items/i1`]: () => Promise.reject(new TypeError("offline")),
      [`GET ${A}`]: () => res(200, mainView()),
    });
    renderIntl(<ExamClient initial={mainView()} resumed={false} />);
    await userEvent.click(screen.getByLabelText(/Beta/));
    await waitFor(() => expect(screen.getByTestId("save-status")).toHaveTextContent("⚠ Not saved — retrying"));
    expect(screen.getByTestId("save-status")).toHaveClass("text-danger");
    await userEvent.click(screen.getByRole("button", { name: "Review" }));
    await userEvent.click(screen.getByRole("button", { name: "Finish the exam" }));
    await userEvent.click(within(dialog()).getByRole("button", { name: "Finish the exam" }));
    // Submitting now would lose the unsaved answer: the exam stays open.
    expect(await screen.findByRole("alert")).toHaveTextContent("Some answers are not saved yet");
    expect(calls()).not.toContain(`POST ${A}/submit`);
    expect(replace).not.toHaveBeenCalled();
    await userEvent.click(screen.getByRole("button", { name: /Back to the questions/ }));
    expect(screen.getByLabelText(/Beta/)).toBeChecked();
  });

  it("keeps unsent local answers over a refreshed server state after an error", async () => {
    mockApi({
      [`POST ${A}/submit`]: () => res(500),
      [`GET ${A}`]: () => res(200, mainView()),
    });
    renderIntl(<ExamClient initial={mainView()} resumed={false} />);
    await userEvent.click(screen.getByLabelText(/Beta/));
    await waitFor(() => expect(screen.getByTestId("save-status")).toHaveTextContent("All answers saved"));
    await userEvent.click(screen.getByRole("button", { name: "Review" }));
    await userEvent.click(screen.getByRole("button", { name: "Finish the exam" }));
    await userEvent.click(within(dialog()).getByRole("button", { name: "Finish the exam" }));
    expect(await screen.findByRole("alert")).toHaveTextContent("Something went wrong");
    expect(calls()).toContain(`GET ${A}`);
    expect(replace).not.toHaveBeenCalled();
  });

  it("names each confirmation dialog after its own title (regression)", async () => {
    renderIntl(<ExamClient initial={mainView()} resumed={false} />);
    await userEvent.click(screen.getByRole("button", { name: "Review" }));
    await userEvent.click(screen.getByRole("button", { name: "Finish the exam" }));
    expect(screen.getByRole("dialog", { name: /^Finish the exam\?/ })).toBeInTheDocument();
  });

  it("finishes the exam after confirmation", async () => {
    renderIntl(<ExamClient initial={mainView()} resumed={false} />);
    await userEvent.click(screen.getByLabelText(/Alpha/));
    await userEvent.click(screen.getByRole("button", { name: "Review" }));
    await userEvent.click(screen.getByRole("button", { name: "Finish the exam" }));
    expect(dialog()).toHaveTextContent("Finish the exam? You will not be able to change your answers.");
    expect(dialog()).toHaveTextContent("2 questions are not answered.");
    // Cancel first.
    await userEvent.click(within(dialog()).getByRole("button", { name: "Cancel" }));
    expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
    await userEvent.click(screen.getByRole("button", { name: "Finish the exam" }));
    await userEvent.click(within(dialog()).getByRole("button", { name: "Finish the exam" }));
    await waitFor(() => expect(replace).toHaveBeenCalledWith("/results/att1"));
    // The pending answer is flushed before submitting.
    expect(calls()).toEqual([`PUT ${A}/items/i1`, `POST ${A}/submit`]);
    expect(screen.getByRole("status")).toHaveTextContent("Submitting…");
  });

  it("goes to the results when a save hits an expired attempt", async () => {
    mockApi({ [`PUT ${A}/items/i1`]: () => res(409, { error: "expired" }) });
    renderIntl(<ExamClient initial={mainView()} resumed={false} />);
    await userEvent.click(screen.getByLabelText(/Beta/));
    await waitFor(() => expect(replace).toHaveBeenCalledWith("/results/att1"));
  });

  it("refreshes the view on another save conflict", async () => {
    const next = mainView({ items: [item("i1", 1, "s1", undefined, { response: { optionId: "a" } }), item("i2", 2, "s1"), item("i3", 3, "s1")] });
    mockApi({ [`PUT ${A}/items/i1`]: () => res(409, { error: "section_locked" }), [`GET ${A}`]: () => res(200, next) });
    renderIntl(<ExamClient initial={mainView()} resumed={false} />);
    await userEvent.click(screen.getByLabelText(/Beta/));
    await waitFor(() => expect(calls()).toContain(`GET ${A}`));
    await waitFor(() => expect(screen.getByLabelText(/Alpha/)).toBeChecked());
    expect(replace).not.toHaveBeenCalled();
  });

  it("focuses the question top when navigating", async () => {
    renderIntl(<ExamClient initial={mainView()} resumed={false} />);
    await userEvent.click(screen.getByRole("button", { name: /Next/ }));
    expect(document.activeElement).toBe(document.getElementById("question-top"));
  });
});

describe("ExamClient — case study", () => {
  it("shows the scenario tabs with keyboard navigation", async () => {
    renderIntl(<ExamClient initial={caseThenMain()} resumed={false} />);
    expect(screen.getByRole("region", { name: "Scenario" })).toHaveTextContent("Contoso Ltd");
    const tabs = screen.getAllByRole("tab");
    expect(tabs[0]).toHaveAttribute("aria-selected", "true");
    expect(screen.getByRole("tabpanel", { name: "Overview" })).toHaveTextContent("Overview text");
    expect(screen.queryByText("Requirements text")).not.toBeVisible();
    await userEvent.click(tabs[1]!);
    expect(tabs[1]).toHaveAttribute("aria-selected", "true");
    expect(screen.getByText("Requirements text")).toBeVisible();
    fireEvent.keyDown(tabs[1]!, { key: "ArrowRight" });
    expect(tabs[2]).toHaveAttribute("aria-selected", "true");
    expect(document.activeElement).toBe(tabs[2]);
    fireEvent.keyDown(tabs[2]!, { key: "ArrowRight" });
    expect(tabs[0]).toHaveAttribute("aria-selected", "true");
    fireEvent.keyDown(tabs[0]!, { key: "ArrowLeft" });
    expect(tabs[2]).toHaveAttribute("aria-selected", "true");
    fireEvent.keyDown(tabs[2]!, { key: "Enter" });
    expect(tabs[2]).toHaveAttribute("aria-selected", "true");
    expect(tabs[2]).toHaveAttribute("tabindex", "0");
    expect(tabs[0]).toHaveAttribute("tabindex", "-1");
  });

  it("navigates with the question buttons and has no review or flag", async () => {
    renderIntl(<ExamClient initial={caseThenMain()} resumed={false} />);
    expect(screen.getByText("Case study")).toBeInTheDocument();
    expect(screen.queryByRole("checkbox", { name: "Mark for review" })).not.toBeInTheDocument();
    const nav = screen.getByRole("navigation", { name: "Questions of the case study" });
    expect(within(nav).getByRole("button", { name: "Go to question 1" })).toHaveAttribute("aria-current", "step");
    await userEvent.click(screen.getByLabelText(/Alpha/));
    await userEvent.click(within(nav).getByRole("button", { name: "Go to question 2" }));
    expect(screen.getByText("Question 2 of 4")).toBeInTheDocument();
    expect(within(nav).getByRole("button", { name: "Go to question 1" })).toHaveClass("bg-blue-50");
    expect(screen.queryByRole("button", { name: /Next/ })).not.toBeInTheDocument();
    expect(screen.queryByRole("button", { name: /Review/ })).not.toBeInTheDocument();
  });

  it("locks the case study after confirmation and continues with the next section", async () => {
    mockApi({ [`GET ${A}`]: () => res(200, caseThenMain("m")) });
    renderIntl(<ExamClient initial={caseThenMain()} resumed={false} />);
    await userEvent.click(screen.getByLabelText(/Alpha/));
    await userEvent.click(screen.getByRole("button", { name: "Leave the case study" }));
    expect(dialog()).toHaveTextContent("Leave this case study? You will not be able to return to it.");
    expect(dialog()).toHaveTextContent("1 question of this case study is not answered.");
    await userEvent.click(within(dialog()).getByRole("button", { name: "Leave the case study" }));
    expect(await screen.findByText("Question 3 of 4")).toBeInTheDocument();
    expect(calls()).toEqual([`PUT ${A}/items/c1`, `POST ${A}/sections/cs/lock`, `GET ${A}`]);
    expect(screen.queryByRole("region", { name: "Scenario" })).not.toBeInTheDocument();
    expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
  });

  it("cancels leaving the case study", async () => {
    renderIntl(<ExamClient initial={caseThenMain()} resumed={false} />);
    await userEvent.click(screen.getByRole("button", { name: "Leave the case study" }));
    await userEvent.click(within(dialog()).getByRole("button", { name: "Cancel" }));
    expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it("shows an error when locking fails", async () => {
    mockApi({ [`POST ${A}/sections/cs/lock`]: () => res(500), [`GET ${A}`]: () => Promise.reject(new TypeError("offline")) });
    renderIntl(<ExamClient initial={caseThenMain()} resumed={false} />);
    await userEvent.click(screen.getByRole("button", { name: "Leave the case study" }));
    await userEvent.click(within(dialog()).getByRole("button", { name: "Leave the case study" }));
    expect(await screen.findByRole("alert")).toHaveTextContent("Something went wrong");
    expect(screen.getByText("Question 1 of 4")).toBeInTheDocument();
  });

  it("goes to the results when locking an expired attempt", async () => {
    mockApi({ [`POST ${A}/sections/cs/lock`]: () => res(409, { error: "expired" }) });
    renderIntl(<ExamClient initial={caseThenMain()} resumed={false} />);
    await userEvent.click(screen.getByRole("button", { name: "Leave the case study" }));
    await userEvent.click(within(dialog()).getByRole("button", { name: "Leave the case study" }));
    await waitFor(() => expect(replace).toHaveBeenCalledWith("/results/att1"));
  });

  it("offers to finish the exam when the case study is the last section", async () => {
    const v = caseThenMain();
    const only = view({ ...v, sections: [v.sections[0]!], items: v.items.slice(0, 2), currentSectionId: "cs" });
    renderIntl(<ExamClient initial={only} resumed={false} />);
    await userEvent.click(screen.getByRole("button", { name: "Finish the exam" }));
    expect(dialog()).toHaveTextContent("Finish the exam?");
    await userEvent.click(within(dialog()).getByRole("button", { name: "Finish the exam" }));
    await waitFor(() => expect(replace).toHaveBeenCalledWith("/results/att1"));
    expect(calls()).toEqual([`POST ${A}/submit`]);
  });
});

describe("ExamClient — main section followed by another", () => {
  it("finishes the section (lock) instead of the exam", async () => {
    mockApi({ [`GET ${A}`]: () => res(200, mainThenSeries("se")) });
    renderIntl(<ExamClient initial={mainThenSeries()} resumed={false} />);
    await userEvent.click(screen.getByRole("button", { name: "Review →" }));
    await userEvent.click(screen.getByRole("button", { name: "Finish this section" }));
    expect(dialog()).toHaveTextContent("Finish this section? You will not be able to return to these questions");
    expect(dialog()).toHaveTextContent("1 question is not answered.");
    await userEvent.click(within(dialog()).getByRole("button", { name: "Finish this section" }));
    expect(await screen.findByText("Goal: secure the VM")).toBeInTheDocument();
    expect(calls()).toEqual([`POST ${A}/sections/m/lock`, `GET ${A}`]);
  });
});

describe("ExamClient — leaving a main section", () => {
  it("cancels finishing the section", async () => {
    renderIntl(<ExamClient initial={mainThenSeries()} resumed={false} />);
    await userEvent.click(screen.getByRole("button", { name: "Review" }));
    await userEvent.click(screen.getByRole("button", { name: "Finish this section" }));
    await userEvent.click(within(dialog()).getByRole("button", { name: "Cancel" }));
    expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
    expect(screen.getByRole("heading", { name: "Review your answers" })).toBeInTheDocument();
  });
});

describe("ExamClient — Yes/No series", () => {
  it("requires an answer, does not autosave, and moves on after confirmation", async () => {
    mockApi({ [`GET ${A}`]: () => res(200, seriesThenMain("se", ["y1"])) });
    renderIntl(<ExamClient initial={seriesThenMain()} resumed={false} />);
    expect(screen.getByText("Yes/No series")).toBeInTheDocument();
    expect(screen.getByText(/This question is part of a series/)).toBeInTheDocument();
    expect(screen.getByText("Solution 1")).toBeInTheDocument();
    const next = screen.getByRole("button", { name: "Confirm and continue" });
    expect(next).toBeDisabled();
    expect(screen.getByText("Select Yes or No to continue.")).toBeInTheDocument();
    await userEvent.click(screen.getByRole("radio", { name: "No" }));
    expect(next).toBeEnabled();
    expect(screen.queryByText("Select Yes or No to continue.")).not.toBeInTheDocument();
    await new Promise((r) => setTimeout(r, 300));
    expect(fetchMock).not.toHaveBeenCalled(); // no autosave in a series
    await userEvent.click(next);
    expect(dialog()).toHaveTextContent("Your answer is final");
    await userEvent.click(within(dialog()).getByRole("button", { name: "Confirm" }));
    expect(await screen.findByText("Solution 2")).toBeInTheDocument();
    expect(calls()).toEqual([`PUT ${A}/items/y1`, `GET ${A}`]);
    expect(callBodies(`PUT ${A}/items/y1`)).toEqual([{ response: { value: false } }]);
  });

  it("cancels the confirmation", async () => {
    renderIntl(<ExamClient initial={seriesThenMain()} resumed={false} />);
    await userEvent.click(screen.getByRole("radio", { name: "Yes" }));
    await userEvent.click(screen.getByRole("button", { name: "Confirm and continue" }));
    await userEvent.click(within(dialog()).getByRole("button", { name: "Cancel" }));
    expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it("locks the series after its last question", async () => {
    mockApi({ [`GET ${A}`]: () => res(200, seriesThenMain("m", ["y1", "y2"])) });
    renderIntl(<ExamClient initial={seriesThenMain("se", ["y1"])} resumed={false} />);
    expect(screen.getByText("Solution 2")).toBeInTheDocument();
    await userEvent.click(screen.getByRole("radio", { name: "Yes" }));
    await userEvent.click(screen.getByRole("button", { name: "Confirm and continue" }));
    await userEvent.click(within(dialog()).getByRole("button", { name: "Confirm" }));
    expect(await screen.findByText("Question 3 of 3")).toBeInTheDocument();
    expect(calls()).toEqual([`PUT ${A}/items/y2`, `POST ${A}/sections/se/lock`, `GET ${A}`]);
  });

  it("submits the exam after the last question of the last section", async () => {
    renderIntl(<ExamClient initial={mainThenSeries("se", ["y1"])} resumed={false} />);
    await userEvent.click(screen.getByRole("radio", { name: "Yes" }));
    await userEvent.click(screen.getByRole("button", { name: "Confirm and continue" }));
    await userEvent.click(within(dialog()).getByRole("button", { name: "Confirm" }));
    await waitFor(() => expect(replace).toHaveBeenCalledWith("/results/att1"));
    expect(calls()).toEqual([`PUT ${A}/items/y2`, `POST ${A}/submit`]);
  });

  it("shows an error when the final answer is rejected", async () => {
    mockApi({ [`PUT ${A}/items/y1`]: () => res(422, { error: "invalid" }), [`GET ${A}`]: () => res(200, seriesThenMain()) });
    renderIntl(<ExamClient initial={seriesThenMain()} resumed={false} />);
    await userEvent.click(screen.getByRole("radio", { name: "Yes" }));
    await userEvent.click(screen.getByRole("button", { name: "Confirm and continue" }));
    await userEvent.click(within(dialog()).getByRole("button", { name: "Confirm" }));
    expect(await screen.findByRole("alert")).toHaveTextContent("Something went wrong");
    expect(screen.getByText("Solution 1")).toBeInTheDocument();
  });

  it("renders nothing for a series whose questions are all answered", () => {
    renderIntl(<ExamClient initial={seriesThenMain("se", ["y1", "y2"])} resumed={false} />);
    expect(screen.queryByRole("article")).not.toBeInTheDocument();
    expect(screen.getByRole("banner")).toBeInTheDocument();
  });
});

describe("ExamClient — timer", () => {
  const at = (msFromNow: number) => new Date(Date.now() + msFromNow).toISOString();

  it("announces time warnings and highlights the low timer", async () => {
    const now = new Date().toISOString();
    renderIntl(<ExamClient initial={mainView({ serverNow: now, deadlineAt: at(9.5 * 60_000) })} resumed={false} />);
    const banner = await screen.findByText("10 minutes left.", { selector: "output" });
    expect(banner).toBeInTheDocument();
    expect(screen.getByRole("timer")).toHaveClass("text-danger");
    expect(screen.getByRole("timer")).toHaveTextContent(/^09:[23]\d$/);
  });

  it("does not show the banner when a warning is far from the end", async () => {
    renderIntl(<ExamClient initial={mainView({ serverNow: new Date().toISOString(), deadlineAt: at(29.5 * 60_000), warningsMin: [30] })} resumed={false} />);
    await waitFor(() => expect(screen.getByText("30 minutes left.")).toBeInTheDocument());
    expect(screen.queryByText("30 minutes left.", { selector: "output" })).not.toBeInTheDocument();
    expect(screen.getByRole("timer")).not.toHaveClass("text-danger");
  });

  it("hides the timer without a deadline", () => {
    renderIntl(<ExamClient initial={mainView({ deadlineAt: null })} resumed={false} />);
    expect(screen.queryByRole("timer")).not.toBeInTheDocument();
  });

  it("at expiry, flushes pending answers, waits for the grace period and goes to the results", async () => {
    vi.useFakeTimers();
    localStorage.setItem("certidrill:pending:att1", JSON.stringify([["i1", { response: { optionId: "a" } }]]));
    mockApi({ [`GET ${A}`]: () => res(200, mainView({ status: "expired" })) });
    const now = new Date().toISOString();
    renderIntl(<ExamClient initial={mainView({ serverNow: now, deadlineAt: now })} resumed={false} />);
    await act(() => vi.advanceTimersByTimeAsync(100));
    expect(screen.getByText("Time is up: your exam has been submitted.", { selector: "output" })).toBeInTheDocument();
    expect(screen.getByRole("timer")).toHaveTextContent("00:00");
    expect(calls()).toEqual([`PUT ${A}/items/i1`]);
    await act(() => vi.advanceTimersByTimeAsync(5_000));
    expect(calls()).not.toContain(`GET ${A}`);
    await act(() => vi.advanceTimersByTimeAsync(600));
    expect(calls()).toContain(`GET ${A}`);
    expect(replace).toHaveBeenCalledWith("/results/att1");
  });

  it("goes to the results at expiry even if the view cannot be fetched", async () => {
    vi.useFakeTimers();
    mockApi({ [`GET ${A}`]: () => Promise.reject(new TypeError("offline")) });
    const now = new Date().toISOString();
    renderIntl(<ExamClient initial={mainView({ serverNow: now, deadlineAt: now })} resumed={false} />);
    await act(() => vi.advanceTimersByTimeAsync(6_000));
    expect(replace).toHaveBeenCalledWith("/results/att1");
  });
});

describe("ExamClient — full screen", () => {
  it("toggles full screen", async () => {
    const request = vi.fn(() => Promise.resolve());
    const exit = vi.fn(() => Promise.reject(new Error("not allowed")));
    document.documentElement.requestFullscreen = request;
    document.exitFullscreen = exit;
    renderIntl(<ExamClient initial={mainView()} resumed={false} />);
    await userEvent.click(screen.getByRole("button", { name: "Full screen" }));
    expect(request).toHaveBeenCalledOnce();
    Object.defineProperty(document, "fullscreenElement", { configurable: true, value: document.documentElement });
    act(() => {
      document.dispatchEvent(new Event("fullscreenchange"));
    });
    await userEvent.click(screen.getByRole("button", { name: "Exit full screen" }));
    expect(exit).toHaveBeenCalledOnce();
    Object.defineProperty(document, "fullscreenElement", { configurable: true, value: null });
    act(() => {
      document.dispatchEvent(new Event("fullscreenchange"));
    });
    expect(screen.getByRole("button", { name: "Full screen" })).toBeInTheDocument();
  });
});
