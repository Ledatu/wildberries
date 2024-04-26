const pageScraper = require("./pageScraper");
async function scrapeAll(browserInstance, campaign_id) {
  let browser;
  try {
    browser = await browserInstance;
    await pageScraper.scraper(browser, campaign_id);
  } catch (err) {
    console.log(new Date(), "Could not resolve the browser instance => ", err);
  }
}

async function scrapeSpp(browserInstance, campaign_id) {
  let browser;
  try {
    browser = await browserInstance;
    await pageScraper.spp_scraper(browser, campaign_id);
  } catch (err) {
    console.log(new Date(), "Could not resolve the browser instance => ", err);
  }
}

module.exports = {
  scrapeSpp,
  scrapeAll,
};
