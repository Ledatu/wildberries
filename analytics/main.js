const { getAll, getSpp } = require("./mp_manager/index.js");
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
)).campaigns;

const fetchAnalytics = async () => {
  for (const campaign of campaigns) {
    if (campaign != "mayusha") continue;
    await Promise.all([]) // await fetchAdsIdsAndWriteToJSON(campaign)
      .then(async () => {
        console.log("All tasks completed successfully");
        await getAll("mayusha");
      })
      .catch((error) => {
        console.error("An error occurred:", error);
      });
  }
};

const fetchSpp = async () =>
  new Promise((resolve, reject) => {
    for (const campaign of campaigns) {
      // if (campaign != "mayusha") continue;
      getSpp(campaign)
        .then(() => {
          console.log("All tasks completed successfully");
          resolve();
          // await getSpp(campaign);
        })
        .catch((error) => {
          console.error("An error occurred:", error);
        });
    }
  });

module.exports = {
  fetchAnalytics,
  fetchSpp,
};
