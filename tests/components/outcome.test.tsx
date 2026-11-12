import { beforeEach, describe, expect, it, vi } from "vitest";
import { screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { renderIntl } from "./render";

const { reportOutcomeAction, deleteOutcomeAction } = vi.hoisted(() => ({ reportOutcomeAction: vi.fn(), deleteOutcomeAction: vi.fn() }));
vi.mock("@/lib/actions/outcome", () => ({ reportOutcomeAction, deleteOutcomeAction }));

import { OutcomeCard } from "@/components/progress/outcome-card";

beforeEach(() => {
  reportOutcomeAction.mockReset();
  deleteOutcomeAction.mockReset();
});

describe("OutcomeCard", () => {
  it("asks for the date, the result and an optional score, and thanks for a pass (EN)", async () => {
    reportOutcomeAction.mockResolvedValue({ ok: "passed" });
    renderIntl(<OutcomeCard certification="az-104" maxScore={1000} passScore={700} today="2026-11-13" outcomes={[]} />);
    const card = screen.getByRole("region", { name: "You took the real exam?" });
    const date = within(card).getByLabelText("Date of the exam");
    expect(date).toHaveAttribute("max", "2026-11-13");
    expect(date).toBeRequired();
    expect(within(card).getByLabelText("Score (optional, out of 1000)")).toHaveAttribute("max", "1000");
    expect(within(card).queryByRole("heading", { name: "My results" })).toBeNull();

    await userEvent.type(date, "2026-11-05");
    await userEvent.click(within(card).getByRole("radio", { name: "Passed" }));
    await userEvent.type(within(card).getByLabelText(/Score/), "812");
    await userEvent.click(within(card).getByRole("button", { name: "Save" }));
    expect(await within(card).findByText(/Congratulations, and thank you/)).toBeInTheDocument();
    const data = reportOutcomeAction.mock.calls[0]![1] as FormData;
    expect(Object.fromEntries(data)).toEqual({ certification: "az-104", takenOn: "2026-11-05", result: "passed", score: "812" });
  });

  it("names the pass mark when the score contradicts the result", async () => {
    reportOutcomeAction.mockResolvedValue({ error: "inconsistent_score" });
    renderIntl(<OutcomeCard certification="az-104" maxScore={1000} passScore={700} today="2026-11-13" outcomes={[]} />, "fr");
    await userEvent.type(screen.getByLabelText("Date de l'examen"), "2026-11-05");
    await userEvent.click(screen.getByRole("radio", { name: "Réussi" }));
    await userEvent.click(screen.getByRole("button", { name: "Enregistrer" }));
    expect(await screen.findByRole("alert")).toHaveTextContent("Ce score ne correspond pas au résultat : le seuil de réussite est de 700.");
  });

  it("explains the limit of reports", async () => {
    reportOutcomeAction.mockResolvedValue({ error: "too_many" });
    renderIntl(<OutcomeCard certification="az-104" maxScore={1000} passScore={700} today="2026-11-13" outcomes={[]} />);
    await userEvent.type(screen.getByLabelText("Date of the exam"), "2026-11-05");
    await userEvent.click(screen.getByRole("radio", { name: "Failed" }));
    await userEvent.click(screen.getByRole("button", { name: "Save" }));
    expect(await screen.findByRole("alert")).toHaveTextContent("You already reported 5 results for this certification: delete one to add another.");
  });

  it("shows an error from the server", async () => {
    reportOutcomeAction.mockResolvedValue({ error: "future_date" });
    renderIntl(<OutcomeCard certification="az-104" maxScore={1000} passScore={700} today="2026-11-13" outcomes={[]} />);
    await userEvent.type(screen.getByLabelText("Date of the exam"), "2026-11-05");
    await userEvent.click(screen.getByRole("radio", { name: "Failed" }));
    await userEvent.click(screen.getByRole("button", { name: "Save" }));
    expect(await screen.findByRole("alert")).toHaveTextContent("The date of the exam cannot be in the future.");
  });

  it("lists the user's results with a delete button each (FR)", async () => {
    renderIntl(
      <OutcomeCard
        certification="az-104"
        maxScore={1000}
        passScore={700}
        today="2026-11-13"
        outcomes={[
          { id: "o1", takenOn: "2026-11-05", passed: true, score: 812 },
          { id: "o2", takenOn: "2026-10-01", passed: false, score: null },
        ]}
      />,
      "fr",
    );
    expect(screen.getByRole("heading", { name: "Mes résultats" })).toBeInTheDocument();
    const first = document.querySelector('[data-outcome="2026-11-05"]') as HTMLElement;
    expect(first).toHaveTextContent("5 novembre 2026Réussi812 / 1000");
    expect(document.querySelector('[data-outcome="2026-10-01"]')).toHaveTextContent("1 octobre 2026Échoué");
    await userEvent.click(within(first).getByRole("button", { name: "Supprimer le résultat du 2026-11-05" }));
    expect(Object.fromEntries(deleteOutcomeAction.mock.calls[0]![0] as FormData)).toEqual({ id: "o1" });
    expect(screen.getByText(/sans votre nom/)).toBeInTheDocument();
  });
});
