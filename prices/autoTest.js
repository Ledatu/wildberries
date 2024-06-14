const fs = require("fs");
const path = require("path");
const { fetchBalanceWithRetry, readIfExists, fetchNmDetailReportMonthAndWriteToJsonMM } = require("./main");

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

        fetchNmDetailReportMonthAndWriteToJsonMM(uid, campaignName)

        // const advertsAutoBidsRulesPath = path.join(__dirname, "marketMaster", uid, campaignName, 'advertsAutoBidsRules.json')

        // const advertsAutoBidsRules = readIfExists(advertsAutoBidsRulesPath);

        // for (const [advertId, rules] of Object.entries(advertsAutoBidsRules)) {
        // advertsAutoBidsRules[advertId].updateTime = new Date().toISOString()
        // }

        // console.log(advertsAutoBidsRules);

        // fs.writeFileSync(advertsAutoBidsRulesPath, JSON.stringify(advertsAutoBidsRules))
      }
    }
    await Promise.all(promises).then(() => resolve());
  });
};

autoTest();
