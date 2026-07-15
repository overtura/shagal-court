import { expect, test, type Page } from "@playwright/test";

function collectConsoleErrors(page: Page): string[] {
  const errors: string[] = [];
  page.on("console", (message) => {
    if (message.type() === "error") errors.push(message.text());
  });
  page.on("pageerror", (error) => errors.push(error.message));
  return errors;
}

test("local verdict, explicit publish, shared vote change, and report", async ({ page }) => {
  const errors = collectConsoleErrors(page);
  await page.goto("/?model=off");
  await page.getByRole("textbox", { name: /사건 진술/ }).fill("예약 시간에 맞춰 갔는데 가게가 아무 말 없이 문을 닫았다.");
  await page.getByRole("button", { name: "판결 도장 찍기" }).click();
  await expect(page.getByText("이 판결은 밈입니다. 실제 법률 판단이나 법률 조언이 아닙니다.")).toBeVisible();
  await expect(page.getByText(/결정론적 오프라인 fallback/)).toBeVisible();

  await page.getByRole("button", { name: "공개 내용 확인하기" }).click();
  await expect(page.getByRole("heading", { name: "공개할 한 문장을 다시 확인하세요" })).toBeVisible();
  await expect(page.getByRole("button", { name: "동의하고 공유 URL 만들기" })).toBeDisabled();
  await page.getByRole("checkbox").check();
  await page.getByRole("button", { name: "동의하고 공유 URL 만들기" }).click();

  const shareLink = page.locator(".share-success a");
  await expect(shareLink).toBeVisible();
  const href = await shareLink.getAttribute("href");
  expect(href).toContain("/case/");
  await page.goto(href!);
  await expect(page.getByRole("heading", { name: "당신의 한 표는?" })).toBeVisible();

  await page.getByRole("button", { name: "샤갈 맞다" }).click();
  await expect(page.locator(".vote-totals")).toContainText("1");
  await page.getByRole("button", { name: "잠깐, 아니다" }).click();
  await expect(page.locator(".vote-totals")).toContainText("0");
  await expect(page.locator(".vote-totals")).toContainText("1");

  await page.getByRole("button", { name: "이 사건 신고" }).click();
  await page.getByRole("button", { name: "스팸" }).click();
  await expect(page.getByText("신고를 접수했습니다.")).toBeVisible();
  expect(errors).toEqual([]);
});

test("server failure never removes the local verdict", async ({ page }) => {
  const errors = collectConsoleErrors(page);
  await page.goto("/?model=off");
  await page.getByRole("textbox", { name: /사건 진술/ }).fill("버스 줄을 오래 섰는데 누군가 새치기했다.");
  await page.getByRole("button", { name: "판결 도장 찍기" }).click();
  const verdictTitle = page.locator("#verdict-title");
  await expect(verdictTitle).toBeVisible();
  const title = await verdictTitle.textContent();
  await page.getByRole("button", { name: "공개 내용 확인하기" }).click();
  await page.route("**/api/cases", (route) => route.abort("failed"));
  await page.getByRole("checkbox").check();
  await page.getByRole("button", { name: "동의하고 공유 URL 만들기" }).click();
  await expect(page.getByRole("alert")).toContainText("서버에 연결할 수 없습니다");
  await expect(verdictTitle).toHaveText(title!);
  expect(errors.filter((message) => !message.includes("Failed to load resource"))).toEqual([]);
});

test("layout remains usable and keyboard reachable", async ({ page }) => {
  const errors = collectConsoleErrors(page);
  await page.goto("/?model=off");
  const overflow = await page.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth);
  expect(overflow).toBeLessThanOrEqual(1);
  await page.keyboard.press("Tab");
  await expect(page.locator(".skip-link")).toBeFocused();
  await page.keyboard.press("Enter");
  await expect(page.locator("#main-content")).toBeInViewport();
  expect(errors).toEqual([]);
});
