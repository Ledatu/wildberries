const { scheduleJob } = require("node-schedule");
const fs = require("fs");
const path = require("path");
const { getPaidStorageCostMM } = require("./main");

const autoFetchStorage = async () => {
  return new Promise(async (resolve, reject) => {
    const customers = JSON.parse(
      fs.readFileSync(path.join(__dirname, "marketMaster", "customers.json"))
    );
    const promises = [];
    for (const [uid, customerData] of Object.entries(customers)) {
      const campaignsNames = customerData.campaignsNames;
      for (let i = 0; i < campaignsNames.length; i++) {
        const campaignName = campaignsNames[i];
        console.log(new Date(), uid, campaignName);
        // if (campaignName != "DELICATUS") continue;
        promises.push(
          getPaidStorageCostMM(uid, campaignName).then(
            () => resolve(uid, campaignName, "paid storage cost updated.")
          )
        );
      }
    }
    await Promise.all(promises).then(() => resolve());
  });
};

scheduleJob("40 2 * * *", () => autoFetchStorage());
autoFetchStorage();
