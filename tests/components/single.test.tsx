import { describe, expect, it, vi } from "vitest";
import { screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { SingleInput } from "@/components/questions/single";
import { renderIntl } from "./render";

const body = { type: "single" as const, options: [{ id: "a", html: "Alpha" }, { id: "b", html: "<b>Beta</b>" }] };

describe("SingleInput", () => {
  it("renders lettered radio options in a group with an accessible legend (EN)", () => {
    renderIntl(<SingleInput body={body} response={null} onChange={vi.fn()} uid="q1" />);
    expect(screen.getByRole("group", { name: "Choose one answer." })).toBeInTheDocument();
    const radios = screen.getAllByRole("radio");
    expect(radios).toHaveLength(2);
    expect(screen.getByText("A.")).toBeInTheDocument();
    expect(screen.getByText("B.")).toBeInTheDocument();
    expect(screen.getByText("Beta").tagName).toBe("B");
    radios.forEach((r) => expect(r).not.toBeChecked());
  });

  it("uses the French legend", () => {
    renderIntl(<SingleInput body={body} response={null} onChange={vi.fn()} uid="q1" />, "fr");
    expect(screen.getByRole("group", { name: "Choisissez une réponse." })).toBeInTheDocument();
  });

  it("calls onChange with the clicked option", async () => {
    const onChange = vi.fn();
    renderIntl(<SingleInput body={body} response={null} onChange={onChange} uid="q1" />);
    await userEvent.click(screen.getByLabelText(/Beta/));
    expect(onChange).toHaveBeenCalledWith({ optionId: "b" });
  });

  it("reflects the current response", () => {
    renderIntl(<SingleInput body={body} response={{ optionId: "a" }} onChange={vi.fn()} uid="q1" />);
    expect(screen.getByLabelText(/Alpha/)).toBeChecked();
    expect(screen.getByLabelText(/Beta/)).not.toBeChecked();
  });

  it("supports keyboard selection with arrow keys", async () => {
    const onChange = vi.fn();
    renderIntl(<SingleInput body={body} response={{ optionId: "a" }} onChange={onChange} uid="q1" />);
    screen.getByLabelText(/Alpha/).focus();
    await userEvent.keyboard("{ArrowDown}");
    expect(onChange).toHaveBeenCalledWith({ optionId: "b" });
  });

  it("does nothing when disabled", async () => {
    const onChange = vi.fn();
    renderIntl(<SingleInput body={body} response={null} onChange={onChange} disabled uid="q1" />);
    screen.getAllByRole("radio").forEach((r) => expect(r).toBeDisabled());
    await userEvent.click(screen.getByLabelText(/Beta/));
    expect(onChange).not.toHaveBeenCalled();
  });
});
