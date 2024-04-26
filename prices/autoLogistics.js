const { scheduleJob } = require("node-schedule");
const fs = require("fs");
const path = require("path");
const {
  getTariffsBoxAndWriteToJsonMM,
  fetchNmDetailReportAndWriteToJsonMM,
  calcSmartDetailedByPeriodAndWriteToJSON,
} = require("./main");
const { writeLogisticsToDataSpreadsheet } = require("./google_sheets");

const mapp = {
  "ИП Валерий": "mayusha",
  "ИП Артем": "delicatus",
  Текстиль: "TKS",
  "ИП Оксана": "perinka",
};

const autoLogistics = async () => {
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
        if (!mapp[campaignName]) continue;
        promises.push(await getTariffsBoxAndWriteToJsonMM(uid, campaignName));
        promises.push(
          await fetchNmDetailReportAndWriteToJsonMM(uid, campaignName)
        );
        promises.push(
          await calcSmartDetailedByPeriodAndWriteToJSON(mapp[campaignName])
        );
      }
    }
    await Promise.all(promises).then(async () => {
      await writeLogisticsToDataSpreadsheet();
      console.log(new Date(), "Adverts logistics deposited.");
      resolve();
    });
  });
};

scheduleJob("2 6 * * *", () => autoLogistics());
// autoLogistics();
