const { scheduleJob } = require("node-schedule");
const fs = require("fs");
const path = require("path");
const { getPlacements } = require("./main");

const autoGetPlacemnts = async (uid, campaignName) => {
  // while (true) {
  try {
    getPlacements(uid, campaignName);
    //    await new Promise((resolve) => setTimeout(resolve, 1 * 61 * 1000));
  } catch (e) { console.log(e); }
  //}
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
      autoGetPlacemnts(uid, campaignName);
    }
  }
  console.log(new Date(), "Started");
};

start();
//  scheduleJob("* * * * *", () => start());
