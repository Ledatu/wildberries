const { scheduleJob } = require("node-schedule");
const fs = require("fs");
const path = require("path");
const { fetchBalanceMM, fetchAdvertsBudgetsAndWriteToJsonMM } = require("./main");

const autoFetchBalanceMM = async (uid, campaignName) => {
  // while (true) {
  await fetchAdvertsBudgetsAndWriteToJsonMM(uid, campaignName);
  await fetchBalanceMM(uid, campaignName)
  //   console.log(new Date(), uid, campaignName, "balance updated.")
  // );

  // await new Promise((resolve) => setTimeout(resolve, 1 * 61 * 1000));
  // }
};

const start = async () => {
  const customers = JSON.parse(
    fs.readFileSync(path.join(__dirname, "marketMaster", "customers.json"))
  );
  for (const [uid, customerData] of Object.entries(customers)) {
    const campaignsNames = customerData.campaignsNames;
    for (let i = 0; i < campaignsNames.length; i++) {
      const campaignName = campaignsNames[i];
      console.log(new Date(), uid, campaignName);
      autoFetchBalanceMM(uid, campaignName);
    }
  }
  console.log(new Date(), "Started");
};

// start();
scheduleJob("*/15 * * * *", () => start());
// scheduleJob("30 * * * *", () => start());
// scheduleJob("45 * * * *", () => start());
// scheduleJob("0 * * * *", () => start());
