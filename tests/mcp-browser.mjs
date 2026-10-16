import assert from "node:assert/strict";
import { mkdirSync, writeFileSync, readFileSync } from "node:fs";
import { chromium } from "playwright";
import AxeBuilder from "@axe-core/playwright";
const BASE = process.argv[2] || "http://127.0.0.1:5199";
const OUT = "work/mcp-browser";
mkdirSync(OUT, { recursive: true });
const browser = await chromium.launch();
let checks = 0;
try {
  for (const lang of ["ar", "en"])
    for (const width of [320, 768, 1440]) {
      const ctx = await browser.newContext({
          viewport: { width, height: 1000 },
        }),
        page = await ctx.newPage(),
        errors = [];
      page.on("pageerror", (e) => errors.push(e.message));
      let signedIn = false,
        denied = false,
        consent = false,
        revoked = false,
        approved = false,
        consented = false,
        policy = false;
      const connection = {
        id: "synthetic-connection",
        version: 1,
        clientId: "synthetic-client",
        clientName: "Claude",
        scopes: ["workspace:read", "workspace:write"],
        areas: [
          "conversations",
          "customers",
          "business",
          "marketing",
          "operations",
          "team",
          "files",
        ],
        direct: [],
        createdAt: Date.now(),
        expiresAt: Date.now() + 86400000,
        lastUsedAt: null,
        verifiedAt: null,
      };
      await page.route("**/*", async (route) => {
        const url = new URL(route.request().url());
        if (url.origin !== new URL(BASE).origin) return route.abort();
        const json = (body, status = 200) =>
          route.fulfill({
            status,
            contentType: "application/json",
            body: JSON.stringify(body),
          });
        if (url.pathname === "/api/auth-session")
          return json({
            ok: true,
            account: signedIn
              ? { email: "synthetic@example.com", name: "Synthetic" }
              : null,
            needsProfile: false,
            csrfToken: "c".repeat(64),
          });
        if (url.pathname === "/api/mcp/manage") {
          if (denied)
            return json({ ok: false, reason: "manager_required" }, 403);
          if (route.request().method() === "POST") {
            const body = route.request().postDataJSON();
            assert.equal(
              route.request().headers()["x-csrf-token"],
              "c".repeat(64),
            );
            if (body.action === "revoke") revoked = true;
            if (body.action === "approve") approved = true;
            if (body.action === "consent") {
              assert.equal(body.interactionUid, "synthetic");
              assert.equal(body.allow, true);
              consented = true;
              consent = false;
            }
            if (body.action === "policy") {
              policy = true;
              return json({ ok: false, reason: "fresh_sign_in_required" }, 409);
            }
            return json({ ok: true });
          }
          if (url.searchParams.has("interaction"))
            return json({
              ok: true,
              interaction: {
                uid: "synthetic",
                clientName: "Claude",
                clientId: "synthetic-client",
                scopes: connection.scopes,
              },
            });
          return json({
            ok: true,
            enabled: true,
            csrfToken: "c".repeat(64),
            resume: consent,
            account: { email: "synthetic@example.com", plan: "ascend" },
            connections: [
              { ...connection, revokedAt: revoked ? Date.now() : null },
            ],
            approvals: approved
              ? []
              : [
                  {
                    id: "run-1",
                    connectionId: connection.id,
                    tool: "bznsflow_messaging_pause",
                    args: { requestId: "synthetic-request", confirm: true },
                    expiresAt: Date.now() + 900000,
                  },
                ],
            activity: [
              {
                _id: "activity-1",
                connectionId: connection.id,
                tool: "bznsflow_dashboard_overview",
                status: "completed",
                at: Date.now(),
              },
              {
                _id: "activity-2",
                connectionId: connection.id,
                tool: "connection",
                status: "policy_changed",
                at: Date.now(),
              },
            ],
          });
        }
        return route.continue();
      });
      const path = lang === "ar" ? "/mcp" : "/en/mcp";
      await page.goto(BASE + path);
      await page
        .getByRole("link", {
          name: lang === "ar" ? "سجّل الدخول للاتصال" : "Sign in to connect",
          exact: true,
        })
        .waitFor();
      checks++;
      assert.match(
        await page.locator('meta[name="robots"]').getAttribute("content"),
        /noindex/,
      );
      assert.equal(await page.evaluate(() => typeof window.fbq), "undefined");
      checks++;
      // Beginner setup works without exposing credentials or claiming connection success.
      assert.equal(
        await page
          .locator('[role="tab"][aria-selected="true"]')
          .getAttribute("id"),
        "mcp-tab-claude",
      );
      await page.locator("#mcp-tab-claude").focus();
      await page.keyboard.press("End");
      assert.equal(
        await page
          .locator('[role="tab"][aria-selected="true"]')
          .getAttribute("id"),
        "mcp-tab-codex",
      );
      assert.ok(
        (await page.getByRole("tabpanel").innerText()).includes(
          "codex mcp login bznsflow",
        ),
      );
      checks += 3;
      for (const tab of ["claude", "chatgpt", "claude-code", "codex"]) {
        await page.locator("#mcp-tab-" + tab).click();
        assert.equal(
          await page
            .getByRole("tabpanel")
            .locator(".mcp-instructions > li")
            .count(),
          4,
        );
        assert.ok(
          await page.evaluate(
            () => document.documentElement.scrollWidth <= innerWidth,
          ),
          tab + " overflow",
        );
        checks += 2;
      }
      // ChatGPT: the address to paste, and the BznsFlow icon for the connector.
      await page.locator("#mcp-tab-chatgpt").click();
      assert.equal(
        await page.locator(".mcp-command pre").textContent(),
        BASE + "/api/mcp",
      );
      const iconLink = page.locator(".mcp-icon-download a");
      assert.equal(
        await iconLink.getAttribute("href"),
        "/mcp/bznsflow-icon.png",
      );
      assert.equal(
        (await page.request.get(BASE + "/mcp/bznsflow-icon.png")).headers()[
          "content-type"
        ],
        "image/png",
      );
      await page.locator("#mcp-tab-chatgpt").focus();
      await page.keyboard.press("Home");
      assert.equal(
        await page
          .locator('[role="tab"][aria-selected="true"]')
          .getAttribute("id"),
        "mcp-tab-claude",
      );
      await page.evaluate(() =>
        Object.defineProperty(navigator, "clipboard", {
          configurable: true,
          value: {
            writeText: async (value) => {
              window.__copiedMcp = value;
            },
          },
        }),
      );
      await page.locator(".mcp-command button").click();
      assert.equal(
        await page.evaluate(() => window.__copiedMcp),
        BASE + "/api/mcp",
      );
      // Confirmation sits on the pressed button, then clears itself.
      const copyButton = page.locator(".mcp-command button");
      assert.match(
        await copyButton.textContent(),
        lang === "ar" ? /تم النسخ/ : /Copied/,
      );
      await page.waitForFunction(
        (done) =>
          !document
            .querySelector(".mcp-command button")
            .textContent.includes(done),
        lang === "ar" ? "تم النسخ" : "Copied",
        { timeout: 5000 },
      );
      await page.locator(".mcp-art img").evaluate((img) => img.decode());
      assert.ok(
        await page
          .locator(".mcp-art img")
          .evaluate(
            (img) =>
              img.naturalWidth > 0 &&
              new URL(img.currentSrc).origin === location.origin,
          ),
      );
      for (const img of await page
        .locator(".mcp-client-tabs img, .mcp-brand img")
        .all()) {
        await img.evaluate((el) => el.decode());
        assert.ok(await img.evaluate((el) => el.naturalWidth > 0));
      }
      assert.ok(
        await page.evaluate(
          () =>
            document.fonts.check('16px "IBM Plex Sans Arabic"') &&
            document.fonts.check("16px Poppins"),
        ),
      );
      checks += 7;
      await page.screenshot({
        path: OUT + "/" + lang + "-" + width + "-guide.png",
        fullPage: true,
      });
      signedIn = true;
      consent = true;
      await page.reload();
      await page
        .getByRole("button", {
          name:
            lang === "ar"
              ? "المتابعة بهذا الحساب"
              : "Continue with this account",
          exact: true,
        })
        .waitFor();
      checks++;
      // The request shows which app is asking, next to the BznsFlow mark.
      assert.equal(
        await page.locator(".mcp-consent-pair img").count(),
        2,
        "consent shows the client logo and BznsFlow",
      );
      assert.equal(
        await page.locator(".mcp-consent-pair img").first().getAttribute("src"),
        "/mcp/claude.svg",
      );
      assert.equal(
        await page.locator(".mcp-panel .mcp-client img").getAttribute("src"),
        "/mcp/claude.svg",
      );
      checks += 3;
      assert.ok(
        await page
          .getByText(
            lang === "ar"
              ? "بانتظار أول اتصال"
              : "Waiting for first connection",
            { exact: true },
          )
          .isVisible(),
      );
      assert.ok(
        !(await page
          .getByText(lang === "ar" ? "اتصال مؤكّد" : "Connection verified", {
            exact: true,
          })
          .count()),
      );
      checks++;
      assert.ok(
        await page.evaluate(
          () => document.documentElement.scrollWidth <= innerWidth,
        ),
        `${lang} ${width} overflows`,
      );
      checks++;
      const axe = await new AxeBuilder({ page })
        .include(".mcp-page")
        .withTags(["wcag2a", "wcag2aa", "wcag21aa"])
        .analyze();
      writeFileSync(
        `${OUT}/${lang}-${width}-axe.json`,
        JSON.stringify(axe.violations, null, 2),
      );
      assert.deepEqual(axe.violations, [], `${lang} ${width} accessibility`);
      checks++;
      await Promise.all([
        page.waitForResponse(
          (response) =>
            response.url().includes("/api/mcp/manage") &&
            response.request().method() === "GET",
        ),
        page
          .getByRole("button", {
            name:
              lang === "ar"
                ? "المتابعة بهذا الحساب"
                : "Continue with this account",
            exact: true,
          })
          .click(),
      ]);
      assert.ok(consented);
      checks++;
      await page
        .getByRole("button", {
          name: lang === "ar" ? "الموافقة على الإجراء" : "Approve this action",
          exact: true,
        })
        .click();
      await page
        .getByText(
          lang === "ar"
            ? "لا توجد طلبات بانتظار الموافقة."
            : "No pending approvals.",
          { exact: true },
        )
        .waitFor();
      assert.ok(approved);
      checks++;
      // Activity reads as names and outcomes, one row per event, without overflow.
      const activityRows = page.locator(".mcp-activity li");
      assert.equal(await activityRows.count(), 2);
      assert.match(
        await activityRows.first().innerText(),
        lang === "ar"
          ? /مساحة العمل[\s\S]*overview[\s\S]*مكتمل/
          : /Workspace[\s\S]*overview[\s\S]*Completed/,
      );
      assert.match(
        await activityRows.nth(1).innerText(),
        lang === "ar" ? /تم تحديث الصلاحيات/ : /Permissions updated/,
      );
      checks += 2;
      // Save stays off until something changes.
      const save = page.getByRole("button", {
        name: lang === "ar" ? "حفظ الصلاحيات" : "Save permissions",
        exact: true,
      });
      assert.equal(await save.isDisabled(), true);
      await page
        .locator(".mcp-grid fieldset")
        .first()
        .locator('input[type="checkbox"]')
        .first()
        .click();
      assert.equal(await save.isDisabled(), false);
      checks++;
      await save.click();
      await page
        .getByRole("link", {
          name: lang === "ar" ? "التحقق من الحساب" : "Verify account",
          exact: true,
        })
        .waitFor();
      assert.ok(policy);
      checks++;
      const href = await page
        .getByRole("link", {
          name: lang === "ar" ? "التحقق من الحساب" : "Verify account",
          exact: true,
        })
        .getAttribute("href");
      assert.ok(href.includes("fresh=1"));
      checks++;
      await page
        .getByRole("button", {
          name: lang === "ar" ? "قطع الاتصال" : "Disconnect",
          exact: true,
        })
        .click();
      await page
        .getByText(lang === "ar" ? "غير متصل" : "Disconnected", { exact: true })
        .waitFor();
      assert.ok(revoked);
      checks++;
      await page.keyboard.press("Tab");
      assert.ok(
        await page.evaluate(() => document.activeElement !== document.body),
      );
      checks++;
      await page.screenshot({
        path: `${OUT}/${lang}-${width}.png`,
        fullPage: true,
      });
      denied = true;
      await page.reload();
      await page
        .getByText(
          lang === "ar"
            ? "يمكن لمالك النشاط فقط إدارة اتصالات الذكاء الاصطناعي."
            : "Only the business owner can manage AI connections.",
          { exact: false },
        )
        .waitFor();
      assert.equal(
        await page
          .getByRole("button", {
            name: lang === "ar" ? "حفظ الصلاحيات" : "Save permissions",
          })
          .count(),
        0,
      );
      checks++;
      assert.deepEqual(errors, []);
      checks++;
      await ctx.close();
    }
  for (const lang of ["ar", "en"]) {
    const ctx = await browser.newContext({
      javaScriptEnabled: false,
      viewport: { width: 320, height: 900 },
    });
    const page = await ctx.newPage();
    await page.goto(BASE + (lang === "ar" ? "/mcp" : "/en/mcp"));
    assert.equal(await page.locator(".mcp-instructions > li").count(), 4);
    assert.ok(await page.locator(".mcp-hero h1").isVisible());
    assert.ok(
      await page.evaluate(
        () => document.documentElement.scrollWidth <= innerWidth,
      ),
    );
    checks += 3;
    await ctx.close();
  }
  // Static private shells contain neither customer details nor consent transactions.
  for (const path of ["mcp", "en/mcp"]) {
    const html = readFileSync(`dist/${path}/index.html`, "utf8");
    assert.ok(!html.includes("synthetic@example.com"));
    assert.ok(!html.includes("synthetic-connection"));
    checks++;
  }
  console.log(
    `MCP browser: ${checks} checks passed (Arabic/English × 320/768/1440, synthetic APIs).`,
  );
} finally {
  await browser.close();
}
