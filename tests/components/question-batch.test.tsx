import { describe, expect, it, vi } from "vitest";
import { screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { renderIntl } from "./render";

vi.mock("@/lib/actions/publish", () => ({ setQuestionStatusesAction: vi.fn(), setCertificationActiveAction: vi.fn(), setCourseStatusesAction: vi.fn() }));
const { QuestionBatchForm } = await import("@/app/admin/certifications/forms");

describe("QuestionBatchForm", () => {
  it("confirms for the questions not yet at the status chosen, and offers nothing when all are", async () => {
    renderIntl(<QuestionBatchForm code="az-900" filters={{}} byStatus={{ draft: 3, reviewed: 2, published: 5 }} />);
    expect(screen.getByText(/The 10 filtered questions of AZ-900/)).toBeInTheDocument();
    expect(screen.getByLabelText("I confirm for 5 questions")).toBeInTheDocument();
    await userEvent.selectOptions(screen.getByRole("combobox"), "draft");
    expect(screen.getByLabelText("I confirm for 7 questions")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Apply" })).toBeEnabled();
  });

  it("disables the batch when every question is already at the status chosen", () => {
    renderIntl(<QuestionBatchForm code="az-900" filters={{ status: "published" }} byStatus={{ draft: 0, reviewed: 0, published: 4 }} />);
    expect(screen.getByLabelText("I confirm for 0 questions")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Apply" })).toBeDisabled();
  });
});
