const browserObject = require("./browser");
const scraperController = require("./pageController");

module.exports = async (campaign_id) => {
  const browserInstance = await browserObject.startBrowser();
  await scraperController(browserInstance, campaign_id);
  await browserInstance.close();
  console.log(campaign_id, "complete!");
};
