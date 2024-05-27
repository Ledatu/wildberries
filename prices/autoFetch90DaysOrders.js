const fs = require("fs");
const path = require("path");
const { fetchOrdersAndWriteToJsonMM, fetchSalesAndWriteToJsonMM } = require("./main");
const { scheduleJob } = require("node-schedule");


const autoFetchDay = async (uid, campaignName) => {
  await new Promise(resolve => setTimeout(resolve, 61 * 1000))
  await fetchOrdersAndWriteToJsonMM(uid, campaignName)
  await fetchSalesAndWriteToJsonMM(uid, campaignName)
  await new Promise(resolve => setTimeout(resolve, 61 * 1000))
  for (let i = 0; i < 8; i++) {
    if (![13, 14, 0, 1].includes(new Date().getMinutes() % 15)) {
      await fetchOrdersAndWriteToJsonMM(uid, campaignName, i)
      await fetchSalesAndWriteToJsonMM(uid, campaignName, i)
      await new Promise(resolve => setTimeout(resolve, 65 * 1000))
    } else {
      await new Promise(resolve => setTimeout(resolve, 61 * 1000))
      i--;
    }
  }
}

const autoFetch = async () => {
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
        promises.push(autoFetchDay(uid, campaignName));
      }
    }
    await Promise.all(promises).then(() => resolve())
  });
};

scheduleJob("26 6 * * *", () => {
  autoFetch()
  // console.log(new Date(), 'hel2');
});
// autoFetch();
