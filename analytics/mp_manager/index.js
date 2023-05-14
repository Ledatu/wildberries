const browserObject = require("./browser");
const scraperController = require("./pageController");

module.exports = async (campaign_id) => {
  const browserInstance = await browserObject.startBrowser();
  await scraperController(browserInstance, campaign_id)
    .then(async (pr) => {
      await browserInstance.close();
      console.log(campaign_id, "complete!");
    })
    .catch(async (er) => {
      await browserInstance.close();
      console.log(campaign_id, "error exited.");
    });
};
