const { scheduleJob } = require("node-schedule");
const fs = require("fs");
const path = require("path");
const { calcPricesMM, getLocaleDateString, getRoundValue, readIfExists, calcAnalyticsMM, sendTgBotTrendMessage } = require("./main");

const processCampaign = async (uid, campaignName, numDates, dateIn, hours) => {
  console.log(new Date(), uid, campaignName);
  const filepath = path.join(__dirname, "marketMaster", uid, campaignName, 'profitsMetricsLog.json');
  const jsonData = readIfExists(filepath);

  for (let i = numDates; i >= 0; i--) {
    const date = new Date(dateIn);
    date.setHours(3, 0, 0, 0);
    date.setDate(date.getDate() - i);
    const strDate = getLocaleDateString(date).slice(0, 10);


    try {
      const pr = await calcAnalyticsMM(uid, campaignName, { lbd: strDate, rbd: strDate });
      if (!pr) continue;

      for (const [entity, entityData] of Object.entries(pr)) {
        if (!jsonData[entity]) jsonData[entity] = {};
        if (!jsonData[entity][strDate]) jsonData[entity][strDate] = {}

        const entit = entityData[strDate];
        // console.log(entit);
        const { sum, sum_orders, profit } = entit;
        const drr = getRoundValue(sum, sum_orders, true, sum ? 1 : 0);
        jsonData[entity][strDate][hours] = { sum, sum_orders, profit, drr };
      }

      console.log(jsonData);

      // Free up memory
      delete pr;
    } catch (e) {
      console.log(e);
    }
  }

  fs.writeFileSync(filepath, JSON.stringify(jsonData));
};

const start = async () => {
  // const date = new Date('2024-06-09T09:59:00.000Z')
  const date = new Date()
  const intHours = date.getHours() + 1;
  let hours = String(intHours);
  if (hours.length < 2) hours = '0' + hours;

  const customers = readIfExists(path.join(__dirname, "marketMaster", "customers.json")) || {};
  console.log(new Date(), "Started");
  for (const [uid, customerData] of Object.entries(customers)) {
    const campaignsNames = customerData.campaignsNames;
    for (let i = 0; i < campaignsNames.length; i++) {
      const campaignName = campaignsNames[i];
      if (!['Текстиль', 'ОТК ПРОИЗВОДСТВО', 'Сальвадор37', 'ОТК-С', 'ИП Валерий', 'ИП Артем', 'ИП Оксана', 'ИП Иосифова Р. И.', 'ИП Иосифов А. М.', 'ИП Иосифов М.С.', 'ИП Галилова'].includes(campaignName)) continue
      await processCampaign(uid, campaignName, 0, date, hours);
    }
  }

  if (intHours > 8)
    sendTgBotTrendMessage(date, hours);
};

scheduleJob("59 * * * *", () => start());
// start();
