const { autoAdvertsManagingMM, autoAdvertsStopMM, fetchBalanceMM } = require("./main");
const fs = require("fs");
const path = require("path");

const autoAdvertsManaging = async (uid, campaignName) => {
  await new Promise((resolve) => setTimeout(resolve, 1 * 61 * 1000));
  while (true) {
    try {
      await autoAdvertsManagingMM(uid, campaignName).then(() =>
        console.log(new Date(), uid, campaignName, "adverts managed.")
      );
      await new Promise((resolve) => setTimeout(resolve, 14 * 61 * 1000));
    } catch (e) {
      console.error(e);
      resolve();
    }
    // await autoAdvertsStopMM(uid, campaignName).then(() =>
    //   console.log(new Date(), uid, campaignName, "stop advertsManagingRules updated.")
    // );

    await new Promise((resolve) => setTimeout(resolve, 1 * 61 * 1000));
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
      autoAdvertsManaging(uid, campaignName);
    }
  }
  console.log(new Date(), "Started");
};

start();
