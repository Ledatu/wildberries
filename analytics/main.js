const createXlsx = require("./mp_manager/index.js");
const { fetchAdsIdsAndWriteToJSON } = require("./google_sheets/index.js");
const {
  createFlagFile,
  deleteFlagFile,
  checkFlagFilesExist,
} = require("../flags/flagWork");
const path = require("path");
const fs = require("fs");

const campaigns = require(path.join(
  __dirname,
  "../prices/files/campaigns"
)).campaigns.slice(1,2);

const fetchAnalytics = async () => {
  for (const campaign of campaigns) {
    await Promise.all([await fetchAdsIdsAndWriteToJSON(campaign)])
      .then(async () => {
        console.log("All tasks completed successfully");
        const adsIds = JSON.parse(
          fs.readFileSync(
            path.join(__dirname, "files", campaign, "adsIds.json")
          )
        );
        console.log(adsIds);
        await createXlsx(adsIds);
      })
      .catch((error) => {
        console.error("An error occurred:", error);
      });
  }
};

module.exports = {
  fetchAnalytics,
};
