import { expect, test } from "@playwright/test";
import { loginAsAdmin, responseJson } from "./helpers";

/**
 * Lot 2 acceptance: each question type displays, can be answered with the
 * keyboard only, and serializes to a response accepted by its Zod schema.
 */
test.beforeEach(async ({ page }) => {
  await loginAsAdmin(page);
});

async function open(page: import("@playwright/test").Page, id: string) {
  await page.goto(`/admin/questions/${id}?lang=en`);
  await expect(page.getByRole("heading", { name: id })).toBeVisible();
}

async function expectValidAndComplete(page: import("@playwright/test").Page) {
  await expect(page.getByText(/Valid response · complete/)).toBeVisible();
}

test("single — arrow keys select an option", async ({ page }) => {
  await open(page, "stor-lifecycle-cool-delete");
  await page.getByRole("radio").first().focus();
  await page.keyboard.press("Space");
  await page.keyboard.press("ArrowDown");
  expect(await responseJson(page)).toEqual({ optionId: "b" });
  await expectValidAndComplete(page);
});

test("multi — space toggles checkboxes", async ({ page }) => {
  await open(page, "stor-redundancy-regional-outage");
  await page.getByRole("checkbox").nth(2).focus();
  await page.keyboard.press("Space");
  await page.keyboard.press("Tab");
  await page.keyboard.press("Space");
  expect(await responseJson(page)).toEqual({ optionIds: ["c", "d"] });
  await expect(page.getByText("2 of 2 selected")).toBeVisible();
  await expectValidAndComplete(page);
});

test("yesno_statements — one Yes/No per row", async ({ page }) => {
  await open(page, "stor-sas-types");
  const radios = page.getByRole("radio");
  for (const i of [0, 2, 5]) {
    await radios.nth(i).focus();
    await page.keyboard.press("Space");
  }
  expect(await responseJson(page)).toEqual({ values: { s1: true, s2: true, s3: false } });
  await expectValidAndComplete(page);
});

test("dropdown — selects inside a command", async ({ page }) => {
  await open(page, "stor-cli-create-zrs");
  await expect(page.locator("#q-stor-cli-create-zrs")).toContainText("az storage account create");
  const lists = page.getByRole("combobox");
  await expect(lists).toHaveCount(2);
  await lists.nth(0).focus();
  await page.keyboard.press("ArrowDown");
  await lists.nth(1).focus();
  await page.keyboard.press("ArrowDown");
  const r = (await responseJson(page)) as { values: Record<string, string> };
  expect(Object.keys(r.values).sort()).toEqual(["kind", "sku"]);
  await expectValidAndComplete(page);
});

test("dragdrop — keyboard via the per-target lists, and mouse drag", async ({ page }) => {
  await open(page, "id-roles-least-privilege");
  const lists = page.getByRole("combobox");
  await expect(lists).toHaveCount(3);
  for (let i = 0; i < 3; i++) {
    await lists.nth(i).focus();
    await page.keyboard.press("ArrowDown");
  }
  let r = (await responseJson(page)) as { mapping: Record<string, string> };
  expect(Object.keys(r.mapping).sort()).toEqual(["audit", "ops", "sec"]);
  await expectValidAndComplete(page);

  // Mouse drag: drop "Reader" onto the Audit target.
  const item = page.locator("li", { hasText: /^Reader$/ }).first();
  const target = page.locator("li", { hasText: "Audit:" }).first();
  await item.hover();
  await page.mouse.down();
  const box = (await target.boundingBox())!;
  await page.mouse.move(box.x + box.width / 2, box.y + 10, { steps: 10 });
  await page.mouse.up();
  r = (await responseJson(page)) as { mapping: Record<string, string> };
  expect(r.mapping.audit).toBe("reader");
});

test("ordering — add and reorder with buttons", async ({ page }) => {
  await open(page, "net-udr-nva");
  for (let i = 0; i < 3; i++) {
    await page.getByRole("button", { name: "Add →" }).first().focus();
    await page.keyboard.press("Enter");
  }
  await expect(page.getByRole("button", { name: "Add →" }).first()).toBeDisabled();
  const before = ((await responseJson(page)) as { sequence: string[] }).sequence;
  expect(before).toHaveLength(3);
  await page.getByRole("button", { name: "Move down" }).first().focus();
  await page.keyboard.press("Enter");
  const after = ((await responseJson(page)) as { sequence: string[] }).sequence;
  expect(after).toEqual([before[1], before[0], before[2]]);
  await expectValidAndComplete(page);
});

test("hotarea — choose a prompt then an area", async ({ page }) => {
  await open(page, "net-nsg-effective-rules");
  await page.getByRole("button", { name: "Deny-RDP-Internet" }).focus();
  await page.keyboard.press("Enter");
  await page.getByRole("radio").nth(1).focus();
  await page.keyboard.press("Space");
  await page.getByRole("button", { name: "Allow-RDP-Any" }).focus();
  await page.keyboard.press("Enter");
  expect(await responseJson(page)).toEqual({ values: { p1: "r200", p2: "r300" } });
  await expectValidAndComplete(page);
});

test("series_yesno — shared stem and Yes/No", async ({ page }) => {
  await open(page, "series-auditors-1");
  await expect(page.getByText("This question is part of a series").first()).toBeVisible();
  await page.getByRole("radio", { name: "Yes" }).focus();
  await page.keyboard.press("Space");
  expect(await responseJson(page)).toEqual({ value: true });
  await expectValidAndComplete(page);
});

test("French rendering and option shuffling", async ({ page }) => {
  await page.goto("/admin/questions/stor-lifecycle-cool-delete?lang=fr&shuffle=1");
  await expect(page.getByText("Que devez-vous configurer ?")).toBeVisible();
  await expect(page.getByRole("radio")).toHaveCount(4);
});

// AWS matching (dragdrop) and ordering questions, as AIF-C01 and SCS-C03 use them (drafts, previewed by an admin).
for (const { id, targets } of [
  { id: "aifc01-1c-src-match-types", targets: ["t1", "t2", "t3", "t4"] },
  { id: "scsc03-4c-match-analysis-tools", targets: ["t1", "t2", "t3", "t4"] },
]) {
  test(`AWS dragdrop ${id} — one list per target, each item used once at most`, async ({ page }) => {
    await open(page, id);
    const lists = page.getByRole("combobox");
    await expect(lists).toHaveCount(targets.length);
    // Items cannot be reused: the same item chosen for a second target moves there.
    await lists.nth(0).selectOption({ index: 1 });
    await lists.nth(1).selectOption({ index: 1 });
    let moved = (await responseJson(page)) as { mapping: Record<string, string> };
    expect(Object.keys(moved.mapping)).toEqual([targets[1]]);
    for (let i = 0; i < targets.length; i++) await lists.nth(i).selectOption({ index: i + 1 });
    moved = (await responseJson(page)) as { mapping: Record<string, string> };
    expect(Object.keys(moved.mapping).sort()).toEqual(targets);
    expect(new Set(Object.values(moved.mapping)).size).toBe(targets.length);
    await expectValidAndComplete(page);
  });
}

for (const { id, count } of [
  { id: "aifc01-1b-pipe-order-phases", count: 4 },
  { id: "scsc03-4c-order-external-finding-fix", count: 4 },
]) {
  test(`AWS ordering ${id} — pick ${count} actions and reorder them`, async ({ page }) => {
    await open(page, id);
    for (let i = 0; i < count; i++) {
      await page.getByRole("button", { name: "Add →" }).first().focus();
      await page.keyboard.press("Enter");
    }
    await expect(page.getByRole("button", { name: "Add →" }).first()).toBeDisabled();
    const before = ((await responseJson(page)) as { sequence: string[] }).sequence;
    expect(before).toHaveLength(count);
    await page.getByRole("button", { name: "Move down" }).first().focus();
    await page.keyboard.press("Enter");
    const after = ((await responseJson(page)) as { sequence: string[] }).sequence;
    expect(after).toEqual([before[1], before[0], ...before.slice(2)]);
    await expectValidAndComplete(page);
  });
}

test("AWS ordering in French — SCS-C03 actions are rendered in French", async ({ page }) => {
  await page.goto("/admin/questions/scsc03-4c-order-external-finding-fix?lang=fr");
  await expect(page.getByText("Examiner le résultat pour identifier le principal externe et la politique qui accorde l'accès.")).toBeVisible();
  await expect(page.getByRole("button", { name: "Add →" })).toHaveCount(6); // the interface follows the session language
});
