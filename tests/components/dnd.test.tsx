import { afterEach, describe, expect, it, vi } from "vitest";
import { act, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { DragDropInput } from "@/components/questions/dragdrop";
import { OrderingInput } from "@/components/questions/ordering";
import type { BodyOf } from "@/components/questions/types";
import { renderIntl } from "./render";

/**
 * jsdom has no layout: give list items a deterministic geometry so that the
 * dnd-kit keyboard sensor can compute collisions.
 */
function mockLayout() {
  return vi.spyOn(Element.prototype, "getBoundingClientRect").mockImplementation(function (this: Element) {
    const li = this.tagName === "LI" ? this : null;
    const index = li?.parentElement ? Array.from(li.parentElement.children).indexOf(li) : 0;
    const top = index * 50;
    return { x: 0, y: top, top, left: 0, width: 200, height: 40, right: 200, bottom: top + 40, toJSON: () => ({}) } as DOMRect;
  });
}

afterEach(() => vi.restoreAllMocks());

describe("DragDropInput", () => {
  const body: BodyOf<"dragdrop"> = {
    type: "dragdrop",
    reuse: false,
    items: [{ id: "i1", html: "<b>VNet</b>" }, { id: "i2", html: "NSG &amp; ASG" }],
    targets: [{ id: "t1", html: "<em>Isolate</em>" }, { id: "t2", html: "Filter" }],
  };

  it("renders the item pool, targets and accessible selects (EN)", () => {
    renderIntl(<DragDropInput body={body} response={null} onChange={vi.fn()} uid="dd" />);
    expect(screen.getByRole("region", { name: "Items" })).toBeInTheDocument();
    const area = screen.getByRole("region", { name: "Answer area" });
    const sel = within(area).getByRole("combobox", { name: "Item for: Isolate" });
    expect(within(sel).getByRole("option", { name: "— Select —" })).toBeInTheDocument();
    expect(within(sel).getByRole("option", { name: "NSG & ASG" })).toBeInTheDocument();
    // The pool items are draggable buttons with the screen-reader instructions.
    const draggables = within(screen.getByRole("region", { name: "Items" })).getAllByRole("button");
    expect(draggables).toHaveLength(2);
    expect(screen.getByText(/Press Space or Enter to pick up an item/)).toBeInTheDocument();
  });

  it("renders French labels", () => {
    renderIntl(<DragDropInput body={body} response={{ mapping: { t1: "i1" } }} onChange={vi.fn()} uid="dd" />, "fr");
    expect(screen.getByRole("region", { name: "Éléments" })).toBeInTheDocument();
    expect(screen.getByRole("combobox", { name: "Élément pour : Isolate" })).toHaveValue("i1");
    expect(screen.getByRole("button", { name: "Retirer" })).toBeInTheDocument();
  });

  it("assigns an item via the select", async () => {
    const onChange = vi.fn();
    renderIntl(<DragDropInput body={body} response={null} onChange={onChange} uid="dd" />);
    await userEvent.selectOptions(screen.getByRole("combobox", { name: "Item for: Filter" }), "i2");
    expect(onChange).toHaveBeenCalledWith({ mapping: { t2: "i2" } });
  });

  it("removes used items from the pool and moves an item between targets when reuse is off", async () => {
    const onChange = vi.fn();
    renderIntl(<DragDropInput body={body} response={{ mapping: { t1: "i1" } }} onChange={onChange} uid="dd" />);
    const pool = screen.getByRole("region", { name: "Items" });
    expect(within(pool).getAllByRole("button")).toHaveLength(1);
    expect(within(pool).queryByText("VNet")).not.toBeInTheDocument();
    await userEvent.selectOptions(screen.getByRole("combobox", { name: "Item for: Filter" }), "i1");
    expect(onChange).toHaveBeenCalledWith({ mapping: { t2: "i1" } });
  });

  it("keeps items in the pool and allows duplicates when reuse is on", async () => {
    const onChange = vi.fn();
    renderIntl(<DragDropInput body={{ ...body, reuse: true }} response={{ mapping: { t1: "i1" } }} onChange={onChange} uid="dd" />);
    expect(within(screen.getByRole("region", { name: "Items" })).getAllByRole("button")).toHaveLength(2);
    await userEvent.selectOptions(screen.getByRole("combobox", { name: "Item for: Filter" }), "i1");
    expect(onChange).toHaveBeenCalledWith({ mapping: { t1: "i1", t2: "i1" } });
  });

  it("removes an assignment with the Remove button (null when empty)", async () => {
    const onChange = vi.fn();
    renderIntl(<DragDropInput body={body} response={{ mapping: { t1: "i1" } }} onChange={onChange} uid="dd" />);
    await userEvent.click(screen.getByRole("button", { name: "Remove" }));
    expect(onChange).toHaveBeenCalledWith(null);
  });

  it("clears a target via the empty option, keeping the others", async () => {
    const onChange = vi.fn();
    renderIntl(<DragDropInput body={body} response={{ mapping: { t1: "i1", t2: "i2" } }} onChange={onChange} uid="dd" />);
    await userEvent.selectOptions(screen.getByRole("combobox", { name: "Item for: Isolate" }), "");
    expect(onChange).toHaveBeenCalledWith({ mapping: { t2: "i2" } });
  });

  it("drops an item on a target with the keyboard", async () => {
    mockLayout();
    const onChange = vi.fn();
    renderIntl(<DragDropInput body={body} response={null} onChange={onChange} uid="dd" />);
    const handle = within(screen.getByRole("region", { name: "Items" })).getAllByRole("button")[0]!;
    handle.focus();
    await userEvent.keyboard(" ");
    await userEvent.keyboard("{ArrowDown}");
    await act(async () => {
      await userEvent.keyboard(" ");
    });
    expect(onChange).toHaveBeenCalledWith({ mapping: { t1: "i1" } });
  });

  it("disables selects, remove buttons and dragging", () => {
    renderIntl(<DragDropInput body={body} response={{ mapping: { t1: "i1" } }} onChange={vi.fn()} disabled uid="dd" />);
    screen.getAllByRole("combobox").forEach((s) => expect(s).toBeDisabled());
    expect(screen.getByRole("button", { name: "Remove" })).toBeDisabled();
    const handle = within(screen.getByRole("region", { name: "Items" })).getAllByRole("button")[0]!;
    expect(handle).toHaveAttribute("aria-disabled", "true");
  });
});

describe("OrderingInput", () => {
  const body: BodyOf<"ordering"> = {
    type: "ordering",
    count: 3,
    actions: [{ id: "a", html: "Create RG" }, { id: "b", html: "Create VNet" }, { id: "c", html: "Create VM" }, { id: "d", html: "Distractor" }],
  };

  it("lists available actions and the answer counter (EN)", () => {
    renderIntl(<OrderingInput body={body} response={{ sequence: ["b"] }} onChange={vi.fn()} uid="o" />);
    const actions = screen.getByRole("region", { name: "Actions" });
    expect(within(actions).getAllByRole("button", { name: /Add/ })).toHaveLength(3);
    expect(within(actions).queryByText("Create VNet")).not.toBeInTheDocument();
    const answer = screen.getByRole("region", { name: /Answer area/ });
    expect(answer).toHaveTextContent("(1 of 3)");
    expect(within(answer).getByText("1.")).toBeInTheDocument();
    expect(within(answer).getByRole("button", { name: "Drag to reorder" })).toBeInTheDocument();
  });

  it("renders French labels", () => {
    renderIntl(<OrderingInput body={body} response={{ sequence: ["a", "b"] }} onChange={vi.fn()} uid="o" />, "fr");
    expect(screen.getAllByRole("button", { name: /Ajouter/ })).toHaveLength(2);
    expect(screen.getByRole("region", { name: /Zone de réponse/ })).toHaveTextContent("(2 sur 3)");
    expect(screen.getAllByRole("button", { name: "Monter" })).toHaveLength(2);
  });

  it("adds an action at the end", async () => {
    const onChange = vi.fn();
    renderIntl(<OrderingInput body={body} response={{ sequence: ["b"] }} onChange={onChange} uid="o" />);
    const row = screen.getByText("Create RG").closest("li")!;
    await userEvent.click(within(row).getByRole("button", { name: /Add/ }));
    expect(onChange).toHaveBeenCalledWith({ sequence: ["b", "a"] });
  });

  it("starts from an empty sequence", async () => {
    const onChange = vi.fn();
    renderIntl(<OrderingInput body={body} response={null} onChange={onChange} uid="o" />);
    expect(screen.getByRole("region", { name: /Answer area/ })).toHaveTextContent("(0 of 3)");
    await userEvent.click(within(screen.getByText("Create VM").closest("li")!).getByRole("button", { name: /Add/ }));
    expect(onChange).toHaveBeenCalledWith({ sequence: ["c"] });
  });

  it("blocks adding once the count is reached", () => {
    renderIntl(<OrderingInput body={body} response={{ sequence: ["a", "b", "c"] }} onChange={vi.fn()} uid="o" />);
    expect(screen.getByRole("button", { name: /Add/ })).toBeDisabled();
  });

  it("moves steps up and down, with edge buttons disabled", async () => {
    const onChange = vi.fn();
    renderIntl(<OrderingInput body={body} response={{ sequence: ["a", "b", "c"] }} onChange={onChange} uid="o" />);
    const up = screen.getAllByRole("button", { name: "Move up" });
    const down = screen.getAllByRole("button", { name: "Move down" });
    expect(up[0]).toBeDisabled();
    expect(down[2]).toBeDisabled();
    await userEvent.click(up[1]!);
    expect(onChange).toHaveBeenLastCalledWith({ sequence: ["b", "a", "c"] });
    await userEvent.click(down[1]!);
    expect(onChange).toHaveBeenLastCalledWith({ sequence: ["a", "c", "b"] });
  });

  it("removes a step, and sends null when the sequence becomes empty", async () => {
    const onChange = vi.fn();
    const { unmount } = renderIntl(<OrderingInput body={body} response={{ sequence: ["a", "b"] }} onChange={onChange} uid="o" />);
    await userEvent.click(screen.getAllByRole("button", { name: "Remove" })[0]!);
    expect(onChange).toHaveBeenLastCalledWith({ sequence: ["b"] });
    unmount();
    renderIntl(<OrderingInput body={body} response={{ sequence: ["a"] }} onChange={onChange} uid="o" />);
    await userEvent.click(screen.getByRole("button", { name: "Remove" }));
    expect(onChange).toHaveBeenLastCalledWith(null);
  });

  it("ignores unknown ids in the sequence", () => {
    renderIntl(<OrderingInput body={body} response={{ sequence: ["zz", "a"] }} onChange={vi.fn()} uid="o" />);
    expect(screen.getAllByRole("button", { name: "Remove" })).toHaveLength(1);
  });

  it("reorders with the keyboard on the drag handle", async () => {
    mockLayout();
    const onChange = vi.fn();
    renderIntl(<OrderingInput body={body} response={{ sequence: ["a", "b", "c"] }} onChange={onChange} uid="o" />);
    screen.getAllByRole("button", { name: "Drag to reorder" })[0]!.focus();
    await userEvent.keyboard(" ");
    await userEvent.keyboard("{ArrowDown}");
    await act(async () => {
      await userEvent.keyboard(" ");
    });
    expect(onChange).toHaveBeenCalledWith({ sequence: ["b", "a", "c"] });
  });

  it("dropping a step on itself does nothing", async () => {
    mockLayout();
    const onChange = vi.fn();
    renderIntl(<OrderingInput body={body} response={{ sequence: ["a", "b"] }} onChange={onChange} uid="o" />);
    screen.getAllByRole("button", { name: "Drag to reorder" })[0]!.focus();
    await userEvent.keyboard(" ");
    await act(async () => {
      await userEvent.keyboard(" ");
    });
    expect(onChange).not.toHaveBeenCalled();
  });

  it("disables every control", () => {
    renderIntl(<OrderingInput body={body} response={{ sequence: ["a", "b"] }} onChange={vi.fn()} disabled uid="o" />);
    screen.getAllByRole("button", { name: /Add|Move up|Move down|Remove/ }).forEach((b) => expect(b).toBeDisabled());
  });
});
