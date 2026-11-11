import { describe, expect, it, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { Button, buttonClasses } from "@/components/ui/button";
import { Alert, Card } from "@/components/ui/card";
import { Input, Label, Select } from "@/components/ui/input";
import { DomainBars } from "@/components/charts/domain-bars";
import { ScoreLine } from "@/components/charts/score-line";

describe("Button", () => {
  it("is a type=button primary button by default and handles clicks", async () => {
    const onClick = vi.fn();
    render(<Button onClick={onClick}>Go</Button>);
    const b = screen.getByRole("button", { name: "Go" });
    expect(b).toHaveAttribute("type", "button");
    expect(b).toHaveClass("bg-primary");
    await userEvent.click(b);
    expect(onClick).toHaveBeenCalledOnce();
  });

  it("supports variants, type and extra classes; disabled blocks clicks", async () => {
    const onClick = vi.fn();
    render(<Button variant="danger" type="submit" className="w-full" disabled onClick={onClick}>Del</Button>);
    const b = screen.getByRole("button", { name: "Del" });
    expect(b).toHaveAttribute("type", "submit");
    expect(b).toHaveClass("bg-danger", "w-full");
    await userEvent.click(b);
    expect(onClick).not.toHaveBeenCalled();
  });

  it("buttonClasses builds the same look for links", () => {
    expect(buttonClasses()).toContain("bg-primary");
    expect(buttonClasses("ghost", "x")).toMatch(/hover:bg-muted.*x/);
  });
});

describe("Card and Alert", () => {
  it("renders a card with merged classes", () => {
    render(<Card className="p-2" data-testid="c">Hi</Card>);
    const c = screen.getByTestId("c");
    expect(c).toHaveTextContent("Hi");
    expect(c).toHaveClass("p-2");
    expect(c).not.toHaveClass("p-6");
  });

  it("uses role=status for info/success and role=alert for errors", () => {
    render(
      <>
        <Alert>Info</Alert>
        <Alert tone="success">Ok</Alert>
        <Alert tone="error">Bad</Alert>
      </>,
    );
    const statuses = screen.getAllByRole("status");
    expect(statuses[0]).toHaveClass("bg-blue-50");
    expect(statuses[1]).toHaveClass("bg-green-50");
    expect(screen.getByRole("alert")).toHaveTextContent("Bad");
  });
});

describe("Input, Label, Select", () => {
  it("labels and types into an input", async () => {
    const onChange = vi.fn();
    render(
      <>
        <Label htmlFor="e">Email</Label>
        <Input id="e" className="mt-1" onChange={onChange} />
      </>,
    );
    const input = screen.getByLabelText("Email");
    expect(input).toHaveClass("mt-1");
    await userEvent.type(input, "ab");
    expect(input).toHaveValue("ab");
    expect(onChange).toHaveBeenCalledTimes(2);
  });

  it("renders a select", async () => {
    render(
      <Select aria-label="Lang" defaultValue="en" className="w-20">
        <option value="en">EN</option>
        <option value="fr">FR</option>
      </Select>,
    );
    const s = screen.getByRole("combobox", { name: "Lang" });
    expect(s).toHaveClass("w-20");
    await userEvent.selectOptions(s, "fr");
    expect(s).toHaveValue("fr");
  });
});

describe("DomainBars", () => {
  it("draws one bar per domain, clamped, with the pass mark", () => {
    const { container } = render(
      <DomainBars
        rows={[
          { key: "a", title: "Identity", score: 800, detail: "8/10" },
          { key: "b", title: "Storage", score: 500 },
          { key: "c", title: "Overflow", score: 2000 },
          { key: "d", title: "Negative", score: -5 },
        ]}
        max={1000}
        threshold={700}
        thresholdLabel="Pass mark"
      />,
    );
    expect(screen.getByTitle("Identity: 800 / 1000 (8/10)")).toBeInTheDocument();
    expect(screen.getByTitle("Storage: 500 / 1000")).toBeInTheDocument();
    expect(screen.getAllByLabelText("≥")).toHaveLength(2);
    expect(screen.getByText("Pass mark (700)", { exact: false })).toBeInTheDocument();
    const widths = Array.from(container.querySelectorAll<HTMLElement>(".bg-primary")).map((e) => e.style.width);
    expect(widths).toEqual(["80%", "50%", "100%", "0%"]);
    expect(container.querySelector<HTMLElement>(".border-dashed.absolute")!.style.left).toBe("70%");
  });
});

describe("ScoreLine", () => {
  it("renders an accessible SVG with one point per attempt and thinned x labels", () => {
    const points = Array.from({ length: 8 }, (_, i) => ({ x: `D${i}`, score: 100 * i, title: `Attempt ${i}` }));
    const { container } = render(<ScoreLine points={points} max={1000} threshold={700} label="Score history" />);
    const svg = screen.getByRole("img", { name: "Score history" });
    expect(svg.querySelectorAll("circle")).toHaveLength(16);
    expect(container.querySelector("path")!.getAttribute("d")).toMatch(/^M40\.0,192\.0 L/);
    expect(screen.getByText("Attempt 3")).toBeInTheDocument();
    // every = ceil(8/6) = 2 → labels for D0, D2, D4, D6
    expect(screen.getByText("D0")).toBeInTheDocument();
    expect(screen.queryByText("D1")).not.toBeInTheDocument();
    expect(screen.getByText("D6")).toBeInTheDocument();
    expect(screen.getAllByText("700").length).toBeGreaterThan(0);
  });

  it("centres a single point", () => {
    const { container } = render(<ScoreLine points={[{ x: "Only", score: 500, title: "One" }]} max={1000} threshold={700} label="L" />);
    expect(container.querySelector("circle")!.getAttribute("cx")).toBe(String(40 + (640 - 52) / 2));
    expect(screen.getByText("Only")).toBeInTheDocument();
  });
});
