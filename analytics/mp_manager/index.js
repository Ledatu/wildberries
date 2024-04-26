const browserObject = require("./browser");
const scraperController = require("./pageController");

module.exports = {
  getAll: async (campaign_id) => {
    const browserInstance = await browserObject.startBrowser();
    await scraperController
      .scrapeAll(browserInstance, campaign_id)
      .then(async (pr) => {
        await browserInstance.close();
        console.log(new Date(), campaign_id, "complete!");
      })
      .catch(async (er) => {
        await browserInstance.close();
        console.log(new Date(), campaign_id, "error exited.");
      });
  },
  getSpp: async (campaign_id) => {
    const browserInstance = await browserObject.startBrowser();
    await scraperController
      .scrapeSpp(browserInstance, campaign_id)
      .then(async (pr) => {
        await browserInstance.close();
        console.log(new Date(), campaign_id, "complete!");
      })
      .catch(async (er) => {
        await browserInstance.close();
        console.log(new Date(), campaign_id, "error exited.");
      });
  },
};
