const { scheduleJob } = require("node-schedule");
const fs = require("fs");
const path = require("path");
const { readIfExists, autoSetFixArtPricesMM } = require("./main");

const processCampaign = async (uid, campaignName, numDates) => {
  console.log(new Date(), uid, campaignName);
  try {
    await autoSetFixArtPricesMM(uid, campaignName);
  } catch (error) {
    console.log(new Date(), uid, campaignName, error);
  }
};

const start = async () => {
  const customers = readIfExists(path.join(__dirname, "marketMaster", "customers.json")) || {};
  console.log(new Date(), "Started");
  for (const [uid, customerData] of Object.entries(customers)) {
    const campaignsNames = customerData.campaignsNames;
    for (let i = 0; i < campaignsNames.length; i++) {
      processCampaign(uid, campaignsNames[i], 0);
    }
  }
};

scheduleJob("59 * * * *", () => start());
// start();
