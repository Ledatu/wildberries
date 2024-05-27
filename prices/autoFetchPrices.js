const { scheduleJob } = require("node-schedule");
const fs = require("fs");
const path = require("path");
const { fetchArtsPricesAndWriteToJsonMM } = require("./main");

const autoFetchArtsPrices = async () => {
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
        try {
          promises.push(
            fetchArtsPricesAndWriteToJsonMM(uid, campaignName)
          );
        }
        catch (e) {
          console.log(e.response.data);
        }
      }
    }
    await Promise.all(promises).then(() => resolve());
  });
};

scheduleJob("*/6 * * * *", () => autoFetchArtsPrices());
// autoFetchArtsPrices();
