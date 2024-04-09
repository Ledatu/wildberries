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
        console.log(uid, campaignName);
        // await fetchAdvertsAndWriteToJsonMM(uid, campaignName)

        // const adverts = readIfExists(path.join(
        //   __dirname,
        //   "marketMaster",
        //   uid,
        //   campaignName,
        //   "adverts.json"
        // ));

        // tores = []
        // for (const [advertId, advertData] of Object.entries(adverts)) {
        //   const { status } = advertData;
        //   const id = parseInt(advertId)
        //   if (status == 4 && !tores.includes(id)) tores.push(id)
        // }
        // console.log(uid, campaignName, tores);
        // await depositAndStart(uid, campaignName, tores)
        await fetchAdvertsBudgetsAndWriteToJsonMM(uid, campaignName)
      }
    }
    await Promise.all(promises).then(() => resolve());
  });
};

autoTest();
