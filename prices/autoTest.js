const fs = require("fs");
const path = require("path");
const { fetchBalanceWithRetry } = require("./main");

const autoTest = async () => {
  return new Promise(async (resolve, reject) => {
    const customers = JSON.parse(
      fs.readFileSync(path.join(__dirname, "marketMaster", "customers.json"))
    );
    const promises = [];
    for (const [uid, customerData] of Object.entries(customers)) {
      const campaignsNames = customerData.campaignsNames;
      for (let i = 0; i < campaignsNames.length; i++) {
        const campaignName = campaignsNames[i];
        fetchBalanceWithRetry(uid, campaignName).then(() => { console.log(uid, campaignName, 'fetched'); }).catch((e) => console.log(uid, campaignName, e))

      }
    }
    await Promise.all(promises).then(() => resolve());
  });
};

autoTest();
