const { fetchAdvertsStatsAndWriteToJsonMM } = require("./main");
const fs = require("fs");
const path = require("path");

const autoFetchAdvertsMM = async (uid, campaignName, batchSize, daysCount) => {
  while (true) {
    await new Promise((resolve) => setTimeout(resolve, 1 * 61 * 1000));
    await fetchAdvertsStatsAndWriteToJsonMM(
      uid,
      campaignName,
      batchSize,
      daysCount
    ).then(() => console.log(uid, campaignName, "Adverts updated."));
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
      console.log(uid, campaignName);
      autoFetchAdvertsMM(uid, campaignName, 100, 2);
    }
  }
  console.log("Started");
};

start();
// autoFetchAdvertsMM(100, 30);
