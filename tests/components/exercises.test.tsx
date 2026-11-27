import { useState } from "react";
import { describe, expect, it, vi } from "vitest";
import { screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { CommandInput } from "@/components/questions/command";
import { ManifestInput } from "@/components/questions/manifest";
import { ExerciseChecks } from "@/components/questions/exercise-checks";
import type { BodyOf } from "@/components/questions/types";
import { renderIntl } from "./render";

const files = [
  { name: "deploy.yaml", content: "apiVersion: apps/v1\nkind: Deployment\n" },
  { name: "app.env", content: "MODE=prod\n" },
];

describe("CommandInput", () => {
  const body: BodyOf<"command"> = { type: "command", mode: "object", tools: ["kubectl"], namespace: "shop", files };

  it("shows the files in tabs, the prompt with the namespace and the allowed tools (FR)", async () => {
    renderIntl(<CommandInput body={body} response={null} onChange={vi.fn()} uid="c" />, "fr");
    const tabs = within(screen.getByRole("tablist", { name: "Fichiers" })).getAllByRole("tab");
    expect(tabs.map((t) => t.textContent)).toEqual(["deploy.yaml", "app.env"]);
    expect(tabs[0]).toHaveAttribute("aria-selected", "true");
    expect(screen.getByRole("tabpanel")).toHaveTextContent("kind: Deployment");
    await userEvent.click(tabs[1]!);
    expect(screen.getByRole("tabpanel")).toHaveTextContent("MODE=prod");
    // The arrow keys move between tabs.
    await userEvent.keyboard("{ArrowLeft}");
    expect(screen.getByRole("tab", { name: "deploy.yaml" })).toHaveFocus();
    expect(screen.getByText("shop $")).toBeInTheDocument();
    expect(screen.getByLabelText("Commande")).toHaveAccessibleDescription("Une seule commande, sur une ligne. Namespace du contexte : shop. Outils : kubectl.");
  });

  it("sends the command as typed, and nothing once emptied (EN)", async () => {
    const onChange = vi.fn();
    function Harness() {
      const [r, setR] = useState<{ command: string } | null>(null);
      return <CommandInput body={{ ...body, files: [] }} response={r} onChange={(v) => { setR(v); onChange(v); }} uid="c" />;
    }
    renderIntl(<Harness />);
    expect(screen.queryByRole("tablist")).toBeNull();
    const input = screen.getByLabelText("Command");
    await userEvent.type(input, "k get po{Enter}");
    expect(onChange).toHaveBeenLastCalledWith({ command: "k get po" });
    await userEvent.clear(input);
    expect(onChange).toHaveBeenLastCalledWith(null);
  });

  it("is read-only once disabled", () => {
    renderIntl(<CommandInput body={body} response={{ command: "kubectl get pods" }} onChange={vi.fn()} disabled uid="c" />);
    expect(screen.getByLabelText("Command")).toBeDisabled();
    expect(screen.getByLabelText("Command")).toHaveValue("kubectl get pods");
  });
});

describe("ManifestInput", () => {
  const body: BodyOf<"manifest"> = { type: "manifest", starter: "apiVersion: v1\nkind: Pod\n", files: [] };

  function Harness({ onChange }: Readonly<{ onChange: (v: unknown) => void }>) {
    const [r, setR] = useState<{ manifest: string } | null>(null);
    return <ManifestInput body={body} response={r} onChange={(v) => { setR(v); onChange(v); }} uid="m" />;
  }

  it("starts with the starter and numbers the lines", () => {
    const { container } = renderIntl(<ManifestInput body={body} response={null} onChange={vi.fn()} uid="m" />, "fr");
    expect(screen.getByLabelText("Manifeste YAML")).toHaveValue("apiVersion: v1\nkind: Pod\n");
    expect(container.querySelector("[aria-hidden=true]")).toHaveTextContent("123");
  });

  it("inserts two spaces on Tab, and lets Tab leave the editor after Escape", async () => {
    const onChange = vi.fn();
    renderIntl(<Harness onChange={onChange} />);
    const editor = screen.getByLabelText("YAML manifest");
    await userEvent.click(editor);
    (editor as HTMLTextAreaElement).setSelectionRange(body.starter.length, body.starter.length);
    await userEvent.keyboard("{Tab}");
    expect(onChange).toHaveBeenLastCalledWith({ manifest: `${body.starter}  ` });
    expect(editor).toHaveFocus();
    await userEvent.keyboard("{Escape}{Tab}");
    expect(editor).not.toHaveFocus();
  });
});

describe("ExerciseChecks", () => {
  const checks = [
    { id: "kind", labelHtml: "The object is a <code>Deployment</code>", passed: true },
    { id: "replicas", labelHtml: "It runs 3 replicas", passed: false },
  ];

  it("lists each check passed or failed, with the count (FR)", () => {
    renderIntl(<ExerciseChecks checks={checks} />, "fr");
    expect(screen.getByRole("heading", { name: "Vérifications : 1 sur 2" })).toBeInTheDocument();
    const items = screen.getAllByRole("listitem");
    expect(items[0]).toHaveTextContent("✓Vérification réussieThe object is a Deployment");
    expect(items[1]).toHaveTextContent("✗Vérification échouéeIt runs 3 replicas");
    expect(screen.queryByTestId("exercise-error")).toBeNull();
  });

  it("shows why the answer could not be checked, and nothing without checks", () => {
    renderIntl(<ExerciseChecks checks={checks.map((c) => ({ ...c, passed: false }))} error="YAML: bad indentation" />);
    expect(screen.getByTestId("exercise-error")).toHaveTextContent("Your answer could not be checked: YAML: bad indentation");
    const { container } = renderIntl(<ExerciseChecks />);
    expect(container).toBeEmptyDOMElement();
  });
});
