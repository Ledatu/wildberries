const { chromium } = require("playwright");
const fs = require("fs");

(async () => {
  const browser = await chromium.launch({ headless: false });
  const context = await browser.newContext();

  const page = await context.newPage();

  await page.goto(
    "https://app.mpmgr.ru/organizations/Q8OWW7YMRgq5h4wk7UHHvA/campaigns/auto-campaigns"
  );

  await page.waitForURL(
    "https://app.mpmgr.ru/organizations/Q8OWW7YMRgq5h4wk7UHHvA"
  );

  const cookies = await context.cookies();
  const cookieJson = JSON.stringify(cookies);

  fs.writeFileSync("cookies.json", cookieJson);

  //   await browser.close()
})();
