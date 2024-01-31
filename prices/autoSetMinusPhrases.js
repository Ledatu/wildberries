const { autoSetMinusPhrasesMM } = require("./main");
const { scheduleJob } = require("node-schedule");
const fs = require("fs");
const path = require("path");

const autoSetMinusPhrases = async () => {
  return new Promise(async (resolve, reject) => {
    const customers = JSON.parse(
      fs.readFileSync(path.join(__dirname, "marketMaster", "customers.json"))
    );
    const promises = [];
    for (const [uid, customerData] of Object.entries(customers)) {
      const campaignsNames = customerData.campaignsNames;
      for (let i = 0; i < campaignsNames.length; i++) {
        const campaignName = campaignsNames[i];
        console.log(uid, campaignName);
        promises.push(
          autoSetMinusPhrasesMM(uid, campaignName).then(() =>
            resolve(uid, campaignName, "Adverts minus phrases set.")
          )
        );
      }
    }
    await Promise.all(promises).then(() => resolve());
  });
};

scheduleJob("3 * * * *", () => autoSetMinusPhrases());
// autoSetMinusPhrases();
