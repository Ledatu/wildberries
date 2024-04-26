const { autoAdvertsStopMM } = require("./main");
const { scheduleJob } = require("node-schedule");
const fs = require("fs");
const path = require("path");

const autoFetchAdvertsInfosMM = async (uid, campaignName) => {
 
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
      autoFetchAdvertsInfosMM(uid, campaignName);
    }
  }
  console.log(new Date(), "Started");
};

start();
// scheduleJob("20 */2 * * *", () => start());
