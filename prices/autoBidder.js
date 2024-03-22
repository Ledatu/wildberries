const { autoSetAdvertsCPMsAndWriteToJsonMM } = require("./main");
const { scheduleJob } = require("node-schedule");
const fs = require("fs");
const path = require("path");

const autoBidder = async (uid, campaignName) => {
  while (true) {

    await autoSetAdvertsCPMsAndWriteToJsonMM(uid, campaignName).then(() =>
      console.log(uid, campaignName, "Adverts bids set.")
    )

    await new Promise((resolve) => setTimeout(resolve, 1 * 61 * 1000));
  }
};

const start = async () => {
  const customers = JSON.parse(
    fs.readFileSync(path.join(__dirname, "marketMaster", "customers.json"))
  );
  for (const [uid, customerData] of Object.entries(customers)) {
    const campaignsNames = customerData.campaignsNames;
    for (let i = 0; i < campaignsNames.length; i++) {
      const campaignName = campaignsNames[i];
      console.log(uid, campaignName);
      autoBidder(uid, campaignName);
    }
  }
  console.log("Started");
};

// scheduleJob("*/2 * * * *", () => start());
start();
