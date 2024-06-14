const { scheduleJob } = require("node-schedule");
const fs = require("fs");
const path = require("path");
const {
  getTariffsBoxAndWriteToJsonMM,
  fetchNmDetailReportAndWriteToJsonMM,
  calcSmartDetailedByPeriodAndWriteToJSON,
  fetchNmDetailReportMonthAndWriteToJsonMM,
} = require("./main");
const { writeLogisticsToDataSpreadsheet } = require("./google_sheets");

const autofetchNmDetailReportAndWriteToJsonMM = async (days) => {
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
        promises.push(
          fetchNmDetailReportAndWriteToJsonMM(uid, campaignName, days)
        );
      }
    }
    await Promise.all(promises).then(async () => {
      await writeLogisticsToDataSpreadsheet();
      console.log(new Date(), "nmDetailReport fetched.");
      resolve();
    });
  });
};

scheduleJob("2 0 * * *", () => autofetchNmDetailReportAndWriteToJsonMM(90));
scheduleJob("*/15 * * * *", () => autofetchNmDetailReportAndWriteToJsonMM(1));
// autofetchNmDetailReportAndWriteToJsonMM(30);

const autofetchNmDetailReportMonthAndWriteToJsonMM = async () => {
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
        promises.push(
          fetchNmDetailReportMonthAndWriteToJsonMM(uid, campaignName)
        );
      }
    }
    await Promise.all(promises).then(async () => {
      await writeLogisticsToDataSpreadsheet();
      console.log(new Date(), "nmDetailReport fetched.");
      resolve();
    });
  });
};

scheduleJob("10 */4 * * *", () => autofetchNmDetailReportMonthAndWriteToJsonMM());
// autofetchNmDetailReportMonthAndWriteToJsonMM();
