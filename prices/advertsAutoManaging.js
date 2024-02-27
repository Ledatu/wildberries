const { autoAdvertsManagingMM } = require("./main");
const fs = require("fs");
const path = require("path");

const autoAdvertsManaging = async (uid, campaignName) => {
  await new Promise((resolve) => setTimeout(resolve, 1 * 61 * 1000));
  while (true) {
    await autoAdvertsManagingMM(uid, campaignName).then(() =>
      console.log(uid, campaignName, "adverts managed.")
    );
    await new Promise((resolve) => setTimeout(resolve, 30 * 61 * 1000));
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
      autoAdvertsManaging(uid, campaignName);
    }
  }
  console.log("Started");
};

start();
