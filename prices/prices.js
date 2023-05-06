const path = require("path");
const {
  fetchDataAndWriteToXlsx,
  fetchCardsAndWriteToJSON,
  fetchOrdersAndWriteToJSON,
  fetchStocksAndWriteToJSON,
  fetchDetailedByPeriodAndWriteToJSON,
  calculateNewValuesAndWriteToXlsx,
} = require("./main");
const {
  writePrices,
  writeDetailedByPeriod,
  fetchDataAndWriteToJSON,
  fetchEnteredValuesAndWriteToJSON,
  copyPricesToDataSpreadsheet,
} = require("./google_sheets/index");
const campaigns = require(path.join(__dirname, "files/campaigns")).campaigns;

const getPrices = async () => {
  await copyPricesToDataSpreadsheet().then(
    async (pr) => await fetchDataAndWriteToJSON()
  );

  campaigns.forEach(async (campaign) => {
    Promise.all([
      await fetchCardsAndWriteToJSON(campaign),
      await fetchOrdersAndWriteToJSON(campaign),
      await fetchStocksAndWriteToJSON(campaign),
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
};

const getDelivery = () =>
  new Promise((resolve, reject) => {
    const updateStatus = {};
    const promises = campaigns.map((campaign) => {
      return fetchDetailedByPeriodAndWriteToJSON(campaign)
        .then((pr) => {
          updateStatus[campaign] = !pr;
          if (!pr) {
            return writeDetailedByPeriod(campaign);
          }
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
};
