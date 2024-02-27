const fs = require("fs");
const path = require("path");

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
        // if (campaignName != "ИП Валерий" && campaignName != "ТОРГМАКСИМУМ") {
          // fs.writeFileSync(
          //   path.join(
          //     __dirname,
          //     "marketMaster",
          //     uid,
          //     campaignName,
          //     "advertsPlusPhrasesTemplates.json"
          //   ),
          //   JSON.stringify({})
          // );
        // }
      }
    }
    await Promise.all(promises).then(() => resolve());
  });
};

autoTest();
