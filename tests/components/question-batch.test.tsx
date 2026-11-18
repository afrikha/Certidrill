import { describe, expect, it, vi } from "vitest";
import { screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { renderIntl } from "./render";

vi.mock("@/lib/actions/publish", () => ({ setQuestionStatusesAction: vi.fn(), setCertificationActiveAction: vi.fn(), setCourseStatusesAction: vi.fn() }));
const { QuestionBatchForm } = await import("@/app/admin/certifications/forms");
const { setQuestionStatusesAction } = await import("@/lib/actions/publish");

describe("QuestionBatchForm", () => {
  it("confirms for the questions not yet at the status chosen, and offers nothing when all are", async () => {
    renderIntl(<QuestionBatchForm code="az-900" filters={{}} byStatus={{ draft: 3, reviewed: 2, published: 5 }} groups={0} />);
    expect(screen.getByText(/The 10 filtered questions of AZ-900/)).toBeInTheDocument();
    expect(screen.getByLabelText("I confirm for 5 questions")).toBeInTheDocument();
    await userEvent.selectOptions(screen.getByRole("combobox"), "draft");
    expect(screen.getByLabelText("I confirm for 7 questions")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Apply" })).toBeEnabled();
  });

  it("disables the batch when every question is already at the status chosen", () => {
    renderIntl(<QuestionBatchForm code="az-900" filters={{ status: "published" }} byStatus={{ draft: 0, reviewed: 0, published: 4 }} groups={0} />);
    expect(screen.getByLabelText("I confirm for 0 questions")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Apply" })).toBeDisabled();
  });

  it("offers to publish the groups left in draft under questions already published", async () => {
    renderIntl(<QuestionBatchForm code="az-900" filters={{ status: "published" }} byStatus={{ draft: 0, reviewed: 0, published: 4 }} groups={2} />);
    expect(screen.getByLabelText("I confirm for 0 questions (and 2 case studies or series to publish)")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Apply" })).toBeEnabled();
    // Only a publishing batch publishes them.
    await userEvent.selectOptions(screen.getByRole("combobox"), "draft");
    expect(screen.getByLabelText("I confirm for 4 questions")).toBeInTheDocument();
  });

  it.each([
    ["published", "3 questions changed. 2 case studies or series published."],
    ["draft", "3 questions changed. 2 case studies or series taken out of exams."],
  ] as const)("reports the groups of a batch to %s by what happened to them", async (to, text) => {
    vi.mocked(setQuestionStatusesAction).mockResolvedValueOnce({ ok: true, count: 3, groups: 2, to });
    renderIntl(<QuestionBatchForm code="az-900" filters={{}} byStatus={{ draft: 3, reviewed: 0, published: 3 }} groups={0} />);
    await userEvent.selectOptions(screen.getByRole("combobox"), to);
    await userEvent.click(screen.getByRole("checkbox"));
    await userEvent.click(screen.getByRole("button", { name: "Apply" }));
    expect(await screen.findByText(text)).toBeInTheDocument();
  });
});
