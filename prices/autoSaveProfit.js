const { scheduleJob } = require("node-schedule");
const fs = require("fs");
const path = require("path");
const { calcPricesMM, getLocaleDateString, getRoundValue, readIfExists } = require("./main");

const processCampaign = async (uid, campaignName, numDates) => {
  console.log(new Date(), uid, campaignName);
  const jsonData = readIfExists(path.join(__dirname, "marketMaster", uid, campaignName, 'profitsLog.json')) || {};

  for (let i = numDates; i >= 0; i--) {
    const date = new Date();
    date.setHours(3, 0, 0, 0);
    date.setDate(date.getDate() - i);
    const datePlusOne = new Date();
    datePlusOne.setDate(datePlusOne.getDate() + 1);
    const strDate = getLocaleDateString(date).slice(0, 10);
    const strDatePlusOne = getLocaleDateString(datePlusOne).slice(0, 10);

    const yesterday = new Date(date);
    yesterday.setDate(yesterday.getDate() - 1);
    const weekAgo = new Date(date);
    weekAgo.setDate(weekAgo.getDate() - 7);

    try {
      const pr = await calcPricesMM(uid, campaignName, { lbd: weekAgo, rbd: yesterday }, { useAvgCost: true });
      if (!pr) continue;

      for (const [art, artData] of Object.entries(pr)) {
        if (!jsonData[art]) jsonData[art] = {};
        const { profit, rozPrice } = artData;
        jsonData[art][strDate] = { profit: profit, rentabelnost: getRoundValue(profit, rozPrice, true) };
        jsonData[art][strDatePlusOne] = { profit: profit, rentabelnost: getRoundValue(profit, rozPrice, true) };
      }

      // Free up memory
      delete pr;
    } catch (e) {
      console.log(e);
    }
  }

  fs.writeFileSync(path.join(__dirname, "marketMaster", uid, campaignName, 'profitsLog.json'), JSON.stringify(jsonData));
};

const start = async () => {
  const customers = readIfExists(path.join(__dirname, "marketMaster", "customers.json")) || {};
  console.log(new Date(), "Started");
  for (const [uid, customerData] of Object.entries(customers)) {
    const campaignsNames = customerData.campaignsNames;
    for (let i = 0; i < campaignsNames.length; i++) {
      await processCampaign(uid, campaignsNames[i], 0);
    }
  }
};

scheduleJob("59 23 * * *", () => start());
// start();
