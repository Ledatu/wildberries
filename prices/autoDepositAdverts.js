const { autoDepositAdvertsBudgetsAndWriteToJsonMM } = require("./main");
const { scheduleJob } = require("node-schedule");
const fs = require("fs");
const path = require("path");

const autoDepositAdverts = async () => {
  return new Promise(async (resolve, reject) => {
    console.log(new Date())
    const customers = JSON.parse(
      fs.readFileSync(path.join(__dirname, "marketMaster", "customers.json"))
    );
    const promises = [];
    for (const [uid, customerData] of Object.entries(customers)) {
      const campaignsNames = customerData.campaignsNames;
      for (let i = 0; i < campaignsNames.length; i++) {
        const campaignName = campaignsNames[i];
        console.log(uid, campaignName);
        // if (campaignName != "DELICATUS") continue;
        promises.push(
          autoDepositAdvertsBudgetsAndWriteToJsonMM(uid, campaignName).then(
            () => resolve(uid, campaignName, "Adverts budgets deposited.")
          )
        );
      }
    }
    await Promise.all(promises).then(() => resolve());
  });
};
scheduleJob("1 * * * *", () => {
  if (new Date().getHours() != 1) { console.log('Too early.'); return; }
  autoDepositAdverts();
});
// autoDepositAdverts();
// scheduleJob("22 22 * * *", () => { console.log('MEMEME'); });  
