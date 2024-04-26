const {
  autoSetMinusPhrasesMM,
  fetchAdvertsWordsAndWriteToJsonMM,
} = require("./main");
const { scheduleJob } = require("node-schedule");
const fs = require("fs");
const path = require("path");

const autoSetMinusPhrases = async (uid, campaignName) => {
  let lastUpdate = undefined;
  // await new Promise((resolve) => setTimeout(resolve, 1 * 61 * 1000));
  while (true) {
    await fetchAdvertsWordsAndWriteToJsonMM(uid, campaignName);
    if (
      lastUpdate &&
      (new Date().getTime() - lastUpdate.getTime()) / 1000 < 60 * 60
    ) {
      await new Promise((resolve) => setTimeout(resolve, 1 * 61 * 1000));
      continue;
    }
    await autoSetMinusPhrasesMM(uid, campaignName).then(() =>
      console.log(new Date(), uid, campaignName, "Adverts minus phrases set.")
    );
    lastUpdate = new Date();
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
      // if (campaignName != "Объединённая текстильная компания") continue; 
      console.log(new Date(), uid, campaignName);
      autoSetMinusPhrases(uid, campaignName);
    }
  }
  console.log(new Date(), "Started");
};

start();

// const autoSetMinusPhrases = async () => {
//   return new Promise(async (resolve, reject) => {
//     const customers = JSON.parse(
//       fs.readFileSync(path.join(__dirname, "marketMaster", "customers.json"))
//     );
//     const promises = [];
//     for (const [uid, customerData] of Object.entries(customers)) {
//       const campaignsNames = customerData.campaignsNames;
//       for (let i = 0; i < campaignsNames.length; i++) {
//         const campaignName = campaignsNames[i];
//         console.log(new Date(), uid, campaignName);
//         promises.push(
//           autoSetMinusPhrasesMM(uid, campaignName).then(() =>
//             resolve(uid, campaignName, "Adverts minus phrases set.")
//           )
//         );
//       }
//     }
//     await Promise.all(promises).then(() => resolve());
//   });
// };

// scheduleJob("3 * * * *", () => autoSetMinusPhrases());
// autoSetMinusPhrases();
