import { describe, expect, it } from "vitest";
import { screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { VendorGroups } from "@/components/vendor-groups";
import { renderIntl } from "./render";

const group = (key: string, name: string, codes: string[]) => ({ key, name, content: <ul>{codes.map((c) => <li key={c}>{c}</li>)}</ul> });

describe("VendorGroups", () => {
  it("shows one vendor's certifications alone, as before", () => {
    renderIntl(<VendorGroups groups={[group("microsoft", "Microsoft", ["AZ-104", "AZ-900"])]} />);
    expect(screen.getByText("AZ-104")).toBeVisible();
    expect(screen.queryByRole("heading")).toBeNull();
    expect(screen.queryByRole("group")).toBeNull();
  });

  it("names each vendor, never with a logo, and filters on one of them", async () => {
    renderIntl(<VendorGroups groups={[group("microsoft", "Microsoft", ["AZ-104"]), group("aws", "AWS", ["SAA-C03"])]} />);
    expect(screen.getByRole("heading", { name: "Microsoft" })).toBeVisible();
    expect(screen.getByRole("heading", { name: "AWS" })).toBeVisible();
    expect(screen.queryByRole("img")).toBeNull();
    expect(screen.getByRole("button", { name: "All" })).toHaveAttribute("aria-pressed", "true");
    await userEvent.click(screen.getByRole("button", { name: "AWS" }));
    expect(screen.getByText("SAA-C03")).toBeVisible();
    expect(screen.getByText("AZ-104")).not.toBeVisible();
    await userEvent.click(screen.getByRole("button", { name: "All" }));
    expect(screen.getByText("AZ-104")).toBeVisible();
  });

  it("shows nothing without a certification", () => {
    const { container } = renderIntl(<VendorGroups groups={[]} />);
    expect(container).toBeEmptyDOMElement();
  });
});
