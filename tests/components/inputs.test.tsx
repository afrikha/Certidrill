import { describe, expect, it, vi } from "vitest";
import { screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { MultiInput } from "@/components/questions/multi";
import { YesNoStatementsInput } from "@/components/questions/yesno-statements";
import { DropdownInput } from "@/components/questions/dropdown";
import { HotAreaInput } from "@/components/questions/hotarea";
import { SeriesYesNoInput } from "@/components/questions/series-yesno";
import { Html } from "@/components/questions/html";
import { renderIntl } from "./render";
import { render } from "@testing-library/react";
import type { BodyOf } from "@/components/questions/types";

describe("Html", () => {
  it("renders block HTML in a prose div", () => {
    const { container } = render(<Html html="<p>Hello <em>world</em></p>" className="x" />);
    const div = container.firstElementChild!;
    expect(div.tagName).toBe("DIV");
    expect(div).toHaveClass("prose-q", "x");
    expect(div.querySelector("em")).toHaveTextContent("world");
  });
  it("renders inline HTML in a span without the prose class", () => {
    const { container } = render(<Html html="<b>x</b>" inline />);
    const span = container.firstElementChild!;
    expect(span.tagName).toBe("SPAN");
    expect(span).not.toHaveClass("prose-q");
  });
});

describe("MultiInput", () => {
  const body: BodyOf<"multi"> = { type: "multi", choose: 2, options: [{ id: "a", html: "A1" }, { id: "b", html: "B1" }, { id: "c", html: "C1" }] };

  it("shows the instruction and the selection count (EN)", () => {
    renderIntl(<MultiInput body={body} response={{ optionIds: ["a"] }} onChange={vi.fn()} uid="m" />);
    expect(screen.getByRole("group", { name: "Choose 2 answers." })).toBeInTheDocument();
    expect(screen.getByText("1 of 2 selected")).toBeInTheDocument();
    expect(screen.getByLabelText(/A1/)).toBeChecked();
    expect(screen.getByText("C.")).toBeInTheDocument();
  });

  it("shows the French texts", () => {
    renderIntl(<MultiInput body={body} response={null} onChange={vi.fn()} uid="m" />, "fr");
    expect(screen.getByRole("group", { name: "Choisissez 2 réponses." })).toBeInTheDocument();
    expect(screen.getByText("0 sur 2 sélectionnée(s)")).toBeInTheDocument();
  });

  it("adds a selection", async () => {
    const onChange = vi.fn();
    renderIntl(<MultiInput body={body} response={{ optionIds: ["a"] }} onChange={onChange} uid="m" />);
    await userEvent.click(screen.getByLabelText(/B1/));
    expect(onChange).toHaveBeenCalledWith({ optionIds: ["a", "b"] });
  });

  it("removes a selection, and sends null when nothing is left", async () => {
    const onChange = vi.fn();
    renderIntl(<MultiInput body={body} response={{ optionIds: ["a", "c"] }} onChange={onChange} uid="m" />);
    await userEvent.click(screen.getByLabelText(/A1/));
    expect(onChange).toHaveBeenLastCalledWith({ optionIds: ["c"] });
  });

  it("sends null when the last selection is removed (keyboard Space)", async () => {
    const onChange = vi.fn();
    renderIntl(<MultiInput body={body} response={{ optionIds: ["a"] }} onChange={onChange} uid="m" />);
    screen.getByLabelText(/A1/).focus();
    await userEvent.keyboard(" ");
    expect(onChange).toHaveBeenCalledWith(null);
  });

  it("is disabled as a whole", async () => {
    const onChange = vi.fn();
    renderIntl(<MultiInput body={body} response={null} onChange={onChange} disabled uid="m" />);
    expect(screen.getByRole("group")).toBeDisabled();
    await userEvent.click(screen.getByLabelText(/A1/));
    expect(onChange).not.toHaveBeenCalled();
  });
});

describe("YesNoStatementsInput", () => {
  const body: BodyOf<"yesno_statements"> = { type: "yesno_statements", statements: [{ id: "s1", html: "Sky is blue" }, { id: "s2", html: "Grass is red" }] };

  it("renders a table with a caption, headers and labelled radios (EN)", () => {
    renderIntl(<YesNoStatementsInput body={body} response={null} onChange={vi.fn()} uid="y" />);
    const table = screen.getByRole("table", { name: /For each statement/ });
    expect(within(table).getByRole("columnheader", { name: "Statement" })).toBeInTheDocument();
    expect(within(table).getByRole("rowheader", { name: "Sky is blue" })).toBeInTheDocument();
    const yes = screen.getAllByRole("radio", { name: "Yes" });
    expect(yes).toHaveLength(2);
    expect(yes[0]).toHaveAccessibleDescription("Sky is blue");
  });

  it("renders French labels", () => {
    renderIntl(<YesNoStatementsInput body={body} response={null} onChange={vi.fn()} uid="y" />, "fr");
    expect(screen.getAllByRole("radio", { name: "Oui" })).toHaveLength(2);
    expect(screen.getAllByRole("radio", { name: "Non" })).toHaveLength(2);
  });

  it("merges each answer into the existing values", async () => {
    const onChange = vi.fn();
    renderIntl(<YesNoStatementsInput body={body} response={{ values: { s1: true } }} onChange={onChange} uid="y" />);
    expect(screen.getAllByRole("radio", { name: "Yes" })[0]).toBeChecked();
    await userEvent.click(screen.getAllByRole("radio", { name: "No" })[1]!);
    expect(onChange).toHaveBeenCalledWith({ values: { s1: true, s2: false } });
  });

  it("starts from empty values", async () => {
    const onChange = vi.fn();
    renderIntl(<YesNoStatementsInput body={body} response={null} onChange={onChange} uid="y" />);
    await userEvent.click(screen.getAllByRole("radio", { name: "Yes" })[0]!);
    expect(onChange).toHaveBeenCalledWith({ values: { s1: true } });
  });

  it("disables every radio", () => {
    renderIntl(<YesNoStatementsInput body={body} response={null} onChange={vi.fn()} disabled uid="y" />);
    screen.getAllByRole("radio").forEach((r) => expect(r).toBeDisabled());
  });
});

describe("DropdownInput", () => {
  const textBody: BodyOf<"dropdown"> = {
    type: "dropdown",
    layout: "text",
    segments: [
      { kind: "html", html: "Use <b>this</b>" },
      { kind: "slot", id: "x", options: [{ id: "o1", html: "<code>Get</code>" }, { id: "o2", html: "A &amp; B &lt;c&gt; &quot;d&quot; &#39;e&#x27;" }] },
      { kind: "html", html: " then " },
      { kind: "slot", id: "y", options: [{ id: "p1", html: "One" }] },
    ],
  };
  const codeBody: BodyOf<"dropdown"> = {
    type: "dropdown",
    layout: "code",
    language: "bash",
    segments: [{ kind: "text", text: "az vm " }, { kind: "slot", id: "x", options: [{ id: "o1", html: "create" }] }],
  };

  it("renders numbered slots with plain-text options (EN)", () => {
    const { container } = renderIntl(<DropdownInput body={textBody} response={null} onChange={vi.fn()} uid="d" />);
    expect(container.querySelector("#d")!.tagName).toBe("DIV");
    const s1 = screen.getByRole("combobox", { name: "Answer list 1" });
    expect(screen.getByRole("combobox", { name: "Answer list 2" })).toBeInTheDocument();
    expect(within(s1).getByRole("option", { name: "— Select —" })).toBeInTheDocument();
    expect(within(s1).getByRole("option", { name: "Get" })).toBeInTheDocument();
    expect(within(s1).getByRole("option", { name: `A & B <c> "d" 'e'` })).toBeInTheDocument();
    expect(screen.getByText("this").tagName).toBe("B");
  });

  it("renders the code layout in a <pre> with raw text (FR)", () => {
    const { container } = renderIntl(<DropdownInput body={codeBody} response={{ values: { x: "o1" } }} onChange={vi.fn()} uid="d" />, "fr");
    const pre = container.querySelector("pre#d")!;
    expect(pre).toHaveTextContent("az vm");
    const sel = screen.getByRole("combobox", { name: "Liste de réponses 1" });
    expect(sel).toHaveValue("o1");
    expect(sel).toHaveClass("font-mono");
  });

  it("sets and merges slot values", async () => {
    const onChange = vi.fn();
    renderIntl(<DropdownInput body={textBody} response={{ values: { y: "p1" } }} onChange={onChange} uid="d" />);
    await userEvent.selectOptions(screen.getByRole("combobox", { name: "Answer list 1" }), "o2");
    expect(onChange).toHaveBeenCalledWith({ values: { y: "p1", x: "o2" } });
  });

  it("clears a slot and sends null when no value remains", async () => {
    const onChange = vi.fn();
    renderIntl(<DropdownInput body={textBody} response={{ values: { x: "o1" } }} onChange={onChange} uid="d" />);
    await userEvent.selectOptions(screen.getByRole("combobox", { name: "Answer list 1" }), "");
    expect(onChange).toHaveBeenCalledWith(null);
  });

  it("keeps other values when one slot is cleared", async () => {
    const onChange = vi.fn();
    renderIntl(<DropdownInput body={textBody} response={{ values: { x: "o1", y: "p1" } }} onChange={onChange} uid="d" />);
    await userEvent.selectOptions(screen.getByRole("combobox", { name: "Answer list 2" }), "");
    expect(onChange).toHaveBeenCalledWith({ values: { x: "o1" } });
  });

  it("disables the selects", () => {
    renderIntl(<DropdownInput body={textBody} response={null} onChange={vi.fn()} disabled uid="d" />);
    screen.getAllByRole("combobox").forEach((s) => expect(s).toBeDisabled());
  });
});

describe("HotAreaInput", () => {
  const single: BodyOf<"hotarea"> = {
    type: "hotarea",
    prompts: [{ id: "p1", html: "Pick the subnet" }],
    caption: "Network <i>map</i>",
    header: ["Name", "Value"],
    rows: [
      [{ html: "Subnet" }, { html: "10.0.0.0/24", area: "a1" }],
      [{}, { area: "a2" }],
    ],
  };
  const multi: BodyOf<"hotarea"> = {
    type: "hotarea",
    prompts: [{ id: "p1", html: "First" }, { id: "p2", html: "Second" }],
    rows: [[{ html: "X", area: "a1" }, { html: "Y", area: "a2" }]],
  };

  it("renders a single prompt, caption, headers and area buttons (EN)", () => {
    renderIntl(<HotAreaInput body={single} response={{ values: { p1: "a1" } }} onChange={vi.fn()} uid="h" />);
    expect(screen.getByText("Pick the subnet")).toBeInTheDocument();
    expect(screen.queryByRole("radio")).not.toBeInTheDocument();
    expect(screen.getByRole("table", { name: "Network map" })).toBeInTheDocument();
    expect(screen.getByRole("columnheader", { name: "Name" })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "10.0.0.0/24" })).toHaveAttribute("aria-pressed", "true");
    expect(screen.getByRole("button", { name: "Area" })).toHaveAttribute("aria-pressed", "false");
  });

  it("labels empty areas in French", () => {
    renderIntl(<HotAreaInput body={single} response={null} onChange={vi.fn()} uid="h" />, "fr");
    expect(screen.getByRole("button", { name: "Zone" })).toBeInTheDocument();
  });

  it("assigns the clicked area to the active prompt", async () => {
    const onChange = vi.fn();
    renderIntl(<HotAreaInput body={single} response={null} onChange={onChange} uid="h" />);
    await userEvent.click(screen.getByRole("button", { name: "Area" }));
    expect(onChange).toHaveBeenCalledWith({ values: { p1: "a2" } });
  });

  it("with several prompts, chooses the prompt first then the area", async () => {
    const onChange = vi.fn();
    renderIntl(<HotAreaInput body={multi} response={{ values: { p1: "a1" } }} onChange={onChange} uid="h" />);
    expect(screen.getByRole("group", { name: "Select a prompt, then click the matching area." })).toBeInTheDocument();
    expect(screen.getByRole("radio", { name: /First/ })).toBeChecked();
    expect(screen.getByText("✓")).toBeInTheDocument();
    // Area used by another prompt is greyed once the other prompt is active.
    await userEvent.click(screen.getByRole("radio", { name: /Second/ }));
    expect(screen.getByRole("radio", { name: /Second/ })).toBeChecked();
    expect(screen.getByRole("button", { name: "X" })).toHaveClass("bg-muted");
    expect(screen.getByRole("button", { name: "X" })).toHaveAttribute("aria-pressed", "false");
    await userEvent.click(screen.getByRole("button", { name: "Y" }));
    expect(onChange).toHaveBeenCalledWith({ values: { p1: "a1", p2: "a2" } });
  });

  it("disables area buttons", async () => {
    const onChange = vi.fn();
    renderIntl(<HotAreaInput body={multi} response={null} onChange={onChange} disabled uid="h" />);
    expect(screen.getByRole("button", { name: "X" })).toBeDisabled();
    await userEvent.click(screen.getByRole("button", { name: "X" }));
    expect(onChange).not.toHaveBeenCalled();
  });

  it("handles a body without prompts", () => {
    renderIntl(<HotAreaInput body={{ ...single, prompts: [] }} response={null} onChange={vi.fn()} uid="h" />);
    expect(screen.queryByText("Pick the subnet")).not.toBeInTheDocument();
  });
});

describe("SeriesYesNoInput", () => {
  const body: BodyOf<"series_yesno"> = { type: "series_yesno", solutionHtml: "<p>Deploy a VM</p>" };

  it("shows the solution and the Yes/No question (EN)", () => {
    renderIntl(<SeriesYesNoInput body={body} response={null} onChange={vi.fn()} uid="s" />);
    expect(screen.getByText("Solution")).toBeInTheDocument();
    expect(screen.getByText("Deploy a VM")).toBeInTheDocument();
    expect(screen.getByRole("group", { name: "Does this solution meet the goal?" })).toBeInTheDocument();
    expect(screen.getByRole("radio", { name: "Yes" })).not.toBeChecked();
  });

  it("shows French labels and the current value", () => {
    renderIntl(<SeriesYesNoInput body={body} response={{ value: false }} onChange={vi.fn()} uid="s" />, "fr");
    expect(screen.getByRole("radio", { name: "Non" })).toBeChecked();
    expect(screen.getByRole("radio", { name: "Oui" })).not.toBeChecked();
  });

  it("emits the chosen boolean", async () => {
    const onChange = vi.fn();
    renderIntl(<SeriesYesNoInput body={body} response={null} onChange={onChange} uid="s" />);
    await userEvent.click(screen.getByRole("radio", { name: "Yes" }));
    expect(onChange).toHaveBeenCalledWith({ value: true });
    await userEvent.click(screen.getByRole("radio", { name: "No" }));
    expect(onChange).toHaveBeenLastCalledWith({ value: false });
  });

  it("is disabled", async () => {
    const onChange = vi.fn();
    renderIntl(<SeriesYesNoInput body={body} response={null} onChange={onChange} disabled uid="s" />);
    await userEvent.click(screen.getByRole("radio", { name: "Yes" }));
    expect(onChange).not.toHaveBeenCalled();
  });
});
