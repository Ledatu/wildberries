const { chromium } = require("playwright");
const fs = require("fs");

(async () => {
  const browser = await chromium.launch({ headless: false });
  const context = await browser.newContext();

  const page = await context.newPage();

  await page.goto(
    `https://cmp.wildberries.ru/statistics/6459782`
  );

  // await page.waitForURL(
  //   "https://app.mpmgr.ru/organizations/Q8OWW7YMRgq5h4wk7UHHvA"
  // );

  await page.waitForTimeout(60000)  

  const cookies = await context.cookies();
  const cookieJson = JSON.stringify(cookies);

  fs.writeFileSync("cookies.json", cookieJson);

  //   await browser.close()
})();
