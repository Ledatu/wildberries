const fs = require("fs");
const path = require("path");
const { fetchOrdersAndWriteToJsonMM, readIfExists } = require("./main");

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
        console.log(uid, campaignName);

        const advertsAutoBidsRulesPath = path.join(
          __dirname,
          "marketMaster",
          uid,
          campaignName,
          "advertsAutoBidsRules.json"
        );
        const advertsAutoBidsRules = readIfExists(advertsAutoBidsRulesPath);
        let needToChange = false;
        for (const [art, artData] of Object.entries(advertsAutoBidsRules)) {
          // console.log(art, artData);
          if (artData.placementsRange.from != artData.placementsRange.to) {
            needToChange = true;
            const median = Math.ceil((artData.placementsRange.to - artData.placementsRange.from) / 2)
            artData.placementsRange.from = median;
            artData.placementsRange.to = median;
            advertsAutoBidsRules[art] = artData;
          }
        }

        if (needToChange) {
          console.log(uid, campaignName, 'advertsAutoBidsRules updated');
          fs.writeFileSync(advertsAutoBidsRulesPath, JSON.stringify(advertsAutoBidsRules))
        }
      }
    }
    await Promise.all(promises).then(() => resolve());
  });
};

autoTest();
