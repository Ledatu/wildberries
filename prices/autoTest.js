const fs = require("fs");
const path = require("path");
const { readIfExists, changeAdvertActivity, getAuthTokenMM, depositAndStart, fetchAdvertsAndWriteToJsonMM, fetchAdvertsBudgetsAndWriteToJsonMM } = require("./main");

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
        console.log(new Date(), uid, campaignName);

        const advertsAutoBidsRules = readIfExists(path.join(
          __dirname,
          "marketMaster",
          uid,
          campaignName,
          "advertsAutoBidsRules.json"
        ));

        for (const [advertId, advertData] of Object.entries(advertsAutoBidsRules)) {
          const { placementsRange } = advertData;
          const isByDrr = (placementsRange) => {
            return (placementsRange && placementsRange.from == 0 && placementsRange.to == 0)
          }
          advertData.autoBidsMode = isByDrr(placementsRange) ? 'drr' : 'placements';
        }

        console.log(new Date(), advertsAutoBidsRules);

        // fs.writeFileSync(path.join(
        //   __dirname,
        //   "marketMaster",
        //   uid,
        //   campaignName,
        //   "advertsAutoBidsRules.json"
        // ), JSON.stringify(advertsAutoBidsRules))
      }
    }
    await Promise.all(promises).then(() => resolve());
  });
};

autoTest();
