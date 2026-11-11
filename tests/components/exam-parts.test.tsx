import { describe, expect, it, vi } from "vitest";
import { fireEvent, render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { ConfirmDialog } from "@/components/exam/confirm-dialog";
import { ReviewScreen, itemState } from "@/components/exam/review-screen";
import { Welcome } from "@/components/exam/welcome";
import { QuestionView } from "@/components/questions/question-view";
import type { PublicBody } from "@/lib/questions/public";
import { renderIntl } from "./render";
import { item, polyfillDialog, question, view } from "./fixtures";

polyfillDialog();

describe("ConfirmDialog", () => {
  const props = { title: "Sure?", confirmLabel: "Yes", cancelLabel: "No" };

  it("is closed, then opens as a modal labelled by its title", () => {
    const { rerender } = render(<ConfirmDialog open={false} {...props} onConfirm={vi.fn()} onCancel={vi.fn()} />);
    expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
    rerender(<ConfirmDialog open {...props} onConfirm={vi.fn()} onCancel={vi.fn()}>Body text</ConfirmDialog>);
    const d = screen.getByRole("dialog", { name: "Sure?" });
    expect(d).toHaveTextContent("Body text");
    rerender(<ConfirmDialog open={false} {...props} onConfirm={vi.fn()} onCancel={vi.fn()} />);
    expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
  });

  it("calls onConfirm / onCancel from the buttons", async () => {
    const onConfirm = vi.fn();
    const onCancel = vi.fn();
    render(<ConfirmDialog open {...props} onConfirm={onConfirm} onCancel={onCancel} />);
    await userEvent.click(screen.getByRole("button", { name: "Yes" }));
    await userEvent.click(screen.getByRole("button", { name: "No" }));
    expect(onConfirm).toHaveBeenCalledOnce();
    expect(onCancel).toHaveBeenCalledOnce();
  });

  it("routes Escape (cancel event) to onCancel and prevents the native close", () => {
    const onCancel = vi.fn();
    render(<ConfirmDialog open {...props} onConfirm={vi.fn()} onCancel={onCancel} />);
    const d = screen.getByRole("dialog");
    const ev = new Event("cancel", { cancelable: true });
    fireEvent(d, ev);
    expect(onCancel).toHaveBeenCalledOnce();
    expect(ev.defaultPrevented).toBe(true);
  });

  it("disables both buttons while busy", () => {
    render(<ConfirmDialog open {...props} busy onConfirm={vi.fn()} onCancel={vi.fn()} />);
    expect(screen.getByRole("button", { name: "Yes" })).toBeDisabled();
    expect(screen.getByRole("button", { name: "No" })).toBeDisabled();
  });
});

describe("Welcome", () => {
  it("lists the rules with all section kinds and the short-bank notice (EN)", async () => {
    const onStart = vi.fn();
    const v = view({ status: "not_started", sectionKinds: ["case_study", "series", "main"], totalQuestions: 3 });
    renderIntl(<Welcome view={v} onStart={onStart} busy={false} error={null} blueprintRange={{ min: 40, max: 60 }} />);
    expect(screen.getByRole("heading", { level: 1, name: "AZ-104 mock exam" })).toBeInTheDocument();
    expect(screen.getByText("Azure Administrator")).toBeInTheDocument();
    expect(screen.getByText(/Duration: 100 minutes/)).toBeInTheDocument();
    expect(screen.getByText("Number of questions: 3")).toBeInTheDocument();
    expect(screen.getByText(/Case studies:/)).toBeInTheDocument();
    expect(screen.getByText(/Yes\/No series:/)).toBeInTheDocument();
    expect(screen.getByText("Exam language: English")).toBeInTheDocument();
    expect(screen.getByRole("status")).toHaveTextContent("this exam contains 3 questions instead of the 40–60");
    await userEvent.click(screen.getByRole("button", { name: "Start" }));
    expect(onStart).toHaveBeenCalledOnce();
  });

  it("hides optional rules, shows errors and the busy state (FR)", () => {
    const v = view({ status: "not_started", sectionKinds: ["main"], locale: "fr", totalQuestions: 50 });
    renderIntl(<Welcome view={v} onStart={vi.fn()} busy error="Boom" blueprintRange={{ min: 40, max: 60 }} />, "fr");
    expect(screen.getByRole("heading", { level: 1, name: "Examen blanc AZ-104" })).toBeInTheDocument();
    expect(screen.queryByText(/Études de cas/)).not.toBeInTheDocument();
    expect(screen.queryByText(/Série Oui\/Non/)).not.toBeInTheDocument();
    expect(screen.getByText("Langue de l'examen : Français")).toBeInTheDocument();
    expect(screen.queryByRole("status")).not.toBeInTheDocument();
    expect(screen.getByRole("alert")).toHaveTextContent("Boom");
    expect(screen.getByRole("button", { name: "Démarrage…" })).toBeDisabled();
  });

  it("works without a blueprint range", () => {
    renderIntl(<Welcome view={view({ totalQuestions: 1 })} onStart={vi.fn()} busy={false} error={null} />);
    expect(screen.queryByRole("status")).not.toBeInTheDocument();
  });
});

describe("ReviewScreen", () => {
  const multi: PublicBody = { type: "multi", choose: 2, options: [{ id: "a", html: "A" }, { id: "b", html: "B" }, { id: "c", html: "C" }] };
  const items = [item("i1", 1, "s1"), item("i2", 2, "s1", multi), item("i3", 3, "s1")];
  const responses = { i1: { optionId: "a" }, i2: { optionIds: ["a"] }, i3: null };
  const flags = { i2: true };

  it("computes item states", () => {
    expect(itemState(items[0]!, responses.i1)).toBe("answered");
    expect(itemState(items[1]!, responses.i2)).toBe("incomplete");
    expect(itemState(items[2]!, null)).toBe("unanswered");
  });

  it("shows every question with its state and the filter counts (EN)", () => {
    renderIntl(<ReviewScreen items={items} responses={responses} flags={flags} onOpen={vi.fn()} onBack={vi.fn()} onFinish={vi.fn()} finishLabel="Finish" />);
    expect(screen.getByRole("heading", { name: "Review your answers" })).toBeInTheDocument();
    const group = screen.getByRole("radiogroup", { name: "Review your answers" });
    expect(within(group).getByRole("radio", { name: "All (3)" })).toHaveAttribute("aria-checked", "true");
    expect(within(group).getByRole("radio", { name: "Flagged (1)" })).toHaveAttribute("aria-checked", "false");
    expect(within(group).getByRole("radio", { name: "Incomplete (2)" })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Go to question 1 — Answered" })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Go to question 2 — Incomplete — Flagged" })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Go to question 3 — Not answered" })).toBeInTheDocument();
  });

  it("filters flagged and incomplete questions", async () => {
    renderIntl(<ReviewScreen items={items} responses={responses} flags={flags} onOpen={vi.fn()} onBack={vi.fn()} onFinish={vi.fn()} finishLabel="Finish" />);
    await userEvent.click(screen.getByRole("radio", { name: /Flagged/ }));
    expect(screen.getAllByRole("button", { name: /Go to question/ })).toHaveLength(1);
    await userEvent.click(screen.getByRole("radio", { name: /Incomplete/ }));
    expect(screen.getAllByRole("button", { name: /Go to question/ }).map((b) => b.textContent?.[0])).toEqual(["2", "3"]);
    await userEvent.click(screen.getByRole("radio", { name: /All/ }));
    expect(screen.getAllByRole("button", { name: /Go to question/ })).toHaveLength(3);
  });

  it("opens a question, goes back and finishes", async () => {
    const onOpen = vi.fn();
    const onBack = vi.fn();
    const onFinish = vi.fn();
    renderIntl(<ReviewScreen items={items} responses={responses} flags={{}} onOpen={onOpen} onBack={onBack} onFinish={onFinish} finishLabel="Finish now" />);
    await userEvent.click(screen.getByRole("button", { name: /Go to question 3/ }));
    expect(onOpen).toHaveBeenCalledWith(items[2]);
    await userEvent.click(screen.getByRole("button", { name: /Back to the questions/ }));
    expect(onBack).toHaveBeenCalledOnce();
    await userEvent.click(screen.getByRole("button", { name: "Finish now" }));
    expect(onFinish).toHaveBeenCalledOnce();
  });

  it("is translated in French", () => {
    renderIntl(<ReviewScreen items={items} responses={responses} flags={flags} onOpen={vi.fn()} onBack={vi.fn()} onFinish={vi.fn()} finishLabel="Terminer" />, "fr");
    expect(screen.getByRole("radio", { name: "Toutes (3)" })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Aller à la question 2 — Incomplète — Marquée" })).toBeInTheDocument();
  });
});

describe("QuestionView", () => {
  const bodies: [string, PublicBody, RegExp | string][] = [
    ["single", { type: "single", options: [{ id: "a", html: "Opt A" }] }, "Choose one answer."],
    ["multi", { type: "multi", choose: 2, options: [{ id: "a", html: "Opt A" }] }, "Choose 2 answers."],
    ["yesno", { type: "yesno_statements", statements: [{ id: "s", html: "Stmt" }] }, "Statement"],
    ["dropdown", { type: "dropdown", layout: "text", segments: [{ kind: "slot", id: "x", options: [] }] }, "— Select —"],
    ["dragdrop", { type: "dragdrop", reuse: false, items: [], targets: [{ id: "t", html: "Tgt" }] }, "Answer area"],
    ["ordering", { type: "ordering", count: 1, actions: [{ id: "a", html: "Act" }] }, "Actions"],
    ["hotarea", { type: "hotarea", prompts: [{ id: "p", html: "Prompt" }], rows: [[{ html: "Cell", area: "a" }]] }, "Prompt"],
    ["series", { type: "series_yesno", solutionHtml: "Sol" }, "Does this solution meet the goal?"],
  ];

  it.each(bodies)("renders the %s input", (_n, body, text) => {
    renderIntl(<QuestionView question={question("q1", body)} response={null} onChange={vi.fn()} />);
    expect(screen.getByRole("article", { name: "Stem q1" })).toBeInTheDocument();
    expect(screen.getAllByText(text).length).toBeGreaterThan(0);
  });

  it("shows exhibits and the series stem; hides the own stem visually in a series (FR)", () => {
    const q = question("q2", { type: "series_yesno", solutionHtml: "Sol" }, { exhibits: [{ id: "e1", titleHtml: "Exhibit <b>1</b>", html: "<p>Table</p>" }] });
    const { container } = renderIntl(<QuestionView question={q} response={{ value: true }} onChange={vi.fn()} seriesStemHtml="<p>Shared goal</p>" />, "fr");
    expect(screen.getByText(/Cette question fait partie d'une série/)).toBeInTheDocument();
    expect(screen.getByText("Shared goal")).toBeInTheDocument();
    expect(container.querySelector("#q-q2-stem")).toHaveClass("sr-only");
    expect(container.querySelector("details")).toHaveAttribute("open");
    expect(screen.getByText("Table")).toBeInTheDocument();
    expect(screen.getByRole("radio", { name: "Oui" })).toBeChecked();
  });

  it("forwards changes and the disabled flag", async () => {
    const onChange = vi.fn();
    const { unmount } = renderIntl(<QuestionView question={question("q3", { type: "single", options: [{ id: "a", html: "Opt A" }] })} response={null} onChange={onChange} />);
    await userEvent.click(screen.getByLabelText(/Opt A/));
    expect(onChange).toHaveBeenCalledWith({ optionId: "a" });
    unmount();
    renderIntl(<QuestionView question={question("q3", { type: "single", options: [{ id: "a", html: "Opt A" }] })} response={null} onChange={onChange} disabled />);
    expect(screen.getByLabelText(/Opt A/)).toBeDisabled();
  });
});
