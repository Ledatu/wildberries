const path = require("path");
const {
  fetchDataAndWriteToXlsx,
  fetchCardsAndWriteToJSON,
  fetchOrdersAndWriteToJSON,
  fetchStocksAndWriteToJSON,
  fetchDetailedByPeriodAndWriteToJSON,
  fetchAdvertsAndWriteToJson,
  calculateNewValuesAndWriteToXlsx,
  calcAdvertismentAndWriteToJSON,
  calcAvgOrdersAndWriteToJSON,
} = require("./main");
const {
  writePrices,
  writeDetailedByPeriod,
  fetchDataAndWriteToJSON,
  fetchEnteredValuesAndWriteToJSON,
  fetchAnalyticsLastWeekValuesAndWriteToJSON,
  copyPricesToDataSpreadsheet,
  updateAnalyticsOrders,
} = require("./google_sheets/index");
const campaigns = require(path.join(__dirname, "files/campaigns")).campaigns;

const updateAtriculesData = async () => {
  await copyPricesToDataSpreadsheet().then(
    async (pr) => await fetchDataAndWriteToJSON()
  );
};

const getPrices = async () => {
  await updateAtriculesData();

  campaigns.forEach(async (campaign) => {
    Promise.all([
      await fetchAnalyticsLastWeekValuesAndWriteToJSON(campaign),
      await calcAdvertismentAndWriteToJSON(campaign),
      await fetchCardsAndWriteToJSON(campaign),
      await fetchOrdersAndWriteToJSON(campaign),
      await fetchStocksAndWriteToJSON(campaign),
      await calcAvgOrdersAndWriteToJSON(campaign),
      // await updateAnalyticsOrders(campaign),
      await fetchDataAndWriteToXlsx(campaign),
    ])
      .then(async () => {
        console.log("All tasks completed successfully");
        await writePrices(campaign);
      })
      .catch((error) => {
        console.error("An error occurred:", error);
      });
  });
  await new Promise((resolve) => setTimeout(resolve, 60000));
  await updateAnalytics();
};

const updateAnalytics = async () => {
  campaigns.forEach(async (campaign) => {
    Promise.all([
      await fetchAdvertsAndWriteToJson(campaign),
      await updateAnalyticsOrders(campaign),
    ])
      .then(async () => {
        console.log("All tasks completed successfully");
      })
      .catch((error) => {
        console.error("An error occurred:", error);
      });
  });
};

const getDelivery = (camp = undefined) =>
  new Promise((resolve, reject) => {
    const updateStatus = {};
    const promises = campaigns.map((campaign) => {
      if (camp && campaign != camp) {
        return 0;
      }

      return fetchDetailedByPeriodAndWriteToJSON(campaign)
        .then((isUpdated) => {
          updateStatus[campaign] = isUpdated;
          return writeDetailedByPeriod(campaign);
        })
        .catch((error) => {
          console.error("An error occurred:", error);
        });
    });

    Promise.all(promises).then((result) => resolve(updateStatus));
  });

const calcNewValues = async () => {
  // await fetchDataAndWriteToJSON()
  campaigns.forEach(async (campaign) => {
    Promise.all([
      await fetchEnteredValuesAndWriteToJSON(campaign),
      await calculateNewValuesAndWriteToXlsx(campaign),
    ])
      .then(async () => {
        console.log("All tasks completed successfully");
        await writePrices(campaign);
      })
      .catch((error) => {
        console.error("An error occurred:", error);
      });
  });
};

module.exports = {
  getPrices,
  getDelivery,
  calcNewValues,
  updateAnalytics,
  updateAtriculesData,
};
