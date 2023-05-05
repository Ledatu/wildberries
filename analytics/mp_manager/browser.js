const playwright = require("playwright");

async function startBrowser() {
  let browser;
  try {
    console.log("Opening the browser......");
    browser = await playwright.chromium.launch({
      // headless: true,
      headless: false,
      // args: ["--disable-setuid-sandbox"],
      // 'ignoreHTTPSErrors': true
    });
  } catch (err) {
    console.log("Could not create a browser instance => : ", err);
  }
  return browser;
}

module.exports = {
  startBrowser,
};
