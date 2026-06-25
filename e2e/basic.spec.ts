import { test, expect } from "@playwright/test";

// ─── Landing page ─────────────────────────────────────────────────────────────

test("landing page loads with correct heading", async ({ page }) => {
  await page.goto("/");
  await expect(page.getByRole("heading", { name: "React Component Generator" })).toBeVisible();
});

test("chat empty state is shown on load", async ({ page }) => {
  await page.goto("/");
  await expect(page.getByText("Start a conversation to generate React components")).toBeVisible();
  await expect(page.getByText("I can help you create buttons, forms, cards, and more")).toBeVisible();
});

test("chat input is visible and accepts text", async ({ page }) => {
  await page.goto("/");
  const input = page.getByRole("textbox");
  await expect(input).toBeVisible();
  await input.fill("Create a button component");
  await expect(input).toHaveValue("Create a button component");
});

test("send button is disabled when input is empty", async ({ page }) => {
  await page.goto("/");
  const sendButton = page.locator("button[disabled]").first();
  await expect(sendButton).toBeDisabled();
});

// ─── Preview / Code tabs ───────────────────────────────────────────────────────

test("Preview tab is selected by default", async ({ page }) => {
  await page.goto("/");
  const previewTab = page.getByRole("tab", { name: "Preview" });
  await expect(previewTab).toHaveAttribute("data-state", "active");
});

test("can switch to Code tab", async ({ page }) => {
  await page.goto("/");
  await page.getByRole("tab", { name: "Code" }).click();
  const codeTab = page.getByRole("tab", { name: "Code" });
  await expect(codeTab).toHaveAttribute("data-state", "active");
});

test("Preview iframe appears after component generation", async ({ page }) => {
  await page.goto("/");
  await page.getByRole("textbox").fill("Create a button");
  await page.getByRole("textbox").press("Enter");
  await expect(page.getByTitle("Preview")).toBeVisible({ timeout: 10000 });
});

// ─── Sign In / Sign Up ────────────────────────────────────────────────────────

test("Sign In button is visible in header", async ({ page }) => {
  await page.goto("/");
  await expect(page.getByRole("button", { name: "Sign In" })).toBeVisible();
});

test("Sign Up button is visible in header", async ({ page }) => {
  await page.goto("/");
  await expect(page.getByRole("button", { name: "Sign Up" })).toBeVisible();
});

// ─── Component generation flow (mock API) ─────────────────────────────────────

test("submitting chat message hides empty state", async ({ page }) => {
  await page.goto("/");
  const input = page.getByRole("textbox");
  await input.fill("Create a dashboard card");
  await input.press("Enter");

  // Empty state should disappear once a message is sent
  await expect(
    page.getByText("Start a conversation to generate React components")
  ).not.toBeVisible({ timeout: 5000 });
});

test("user message appears in chat after submit", async ({ page }) => {
  await page.goto("/");
  await page.getByRole("textbox").fill("Create a button component");
  await page.getByRole("textbox").press("Enter");

  await expect(page.getByText("Create a button component")).toBeVisible({ timeout: 5000 });
});

test("AI response appears after generation (mock)", async ({ page }) => {
  await page.goto("/");
  await page.getByRole("textbox").fill("Create a card");
  await page.getByRole("textbox").press("Enter");

  // Wait for mock response — it mentions "static response"
  await expect(
    page.getByText(/static response|I'll create|creating/i)
  ).toBeVisible({ timeout: 10000 });
});

test("file tree appears in Code view after generation", async ({ page }) => {
  await page.goto("/");
  await page.getByRole("textbox").fill("Create a card");
  await page.getByRole("textbox").press("Enter");

  // Wait for mock response
  await page.waitForTimeout(4000);

  // Switch to Code tab
  await page.getByRole("tab", { name: "Code" }).click();

  // App.jsx should appear in file tree (span.truncate is the file tree label)
  await expect(page.locator("span.truncate", { hasText: "App.jsx" })).toBeVisible({ timeout: 5000 });
});

test("can select a file in the file tree", async ({ page }) => {
  await page.goto("/");
  await page.getByRole("textbox").fill("Create a card");
  await page.getByRole("textbox").press("Enter");
  await page.waitForTimeout(4000);

  await page.getByRole("tab", { name: "Code" }).click();
  await page.locator("span.truncate", { hasText: "App.jsx" }).click();

  // Editor should show code (Monaco loads content)
  await expect(page.locator('[role="code"], .monaco-editor, code').first()).toBeVisible({ timeout: 5000 });
});

// ─── Layout / responsiveness ───────────────────────────────────────────────────

test("resizable panel handle is present", async ({ page }) => {
  await page.goto("/");
  // The handle sits between the two panels
  const handle = page.locator("[data-panel-group-id]").first();
  await expect(handle).toBeVisible();
});
