const { fetchAdvertsStatsAndWriteToJsonMM } = require("./main");
const fs = require("fs");
const path = require("path");

const autoFetchAdvertsMM = async (uid, campaignName, batchSize, daysCount) => {
  await new Promise((resolve) => setTimeout(resolve, 1 * 61 * 1000));
  while (true) {
    await fetchAdvertsStatsAndWriteToJsonMM(
      uid,
      campaignName,
      batchSize,
      daysCount
    ).then(() => console.log(new Date(), uid, campaignName, "Adverts updated."));
    await new Promise((resolve) => setTimeout(resolve, 2 * 61 * 1000));
  }
};

const start = async () => {
  const customers = JSON.parse(
    fs.readFileSync(path.join(__dirname, "marketMaster", "customers.json"))
  );
  for (const [uid, customerData] of Object.entries(customers)) {
    const campaignsNames = customerData.campaignsNames;
    for (let i = 0; i < campaignsNames.length; i++) {
      const campaignName = campaignsNames[i];

      console.log(new Date(), uid, campaignName);
      autoFetchAdvertsMM(uid, campaignName, 100, 2);
    }
  }
  console.log(new Date(), "Started");
};

start();
// autoFetchAdvertsMM("4a1f2828-9a1e-4bbf-8e07-208ba676a806", "ОТК ПРОИЗВОДСТВО", 100, 25);
