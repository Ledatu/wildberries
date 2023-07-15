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
  fetchAdvertInfosAndWriteToJson,
  updateAdvertArtActivitiesAndGenerateNotIncluded,
} = require("./main");
const {
  writePrices,
  writeDetailedByPeriod,
  fetchDataAndWriteToJSON,
  fetchEnteredValuesAndWriteToJSON,
  fetchAnalyticsLastWeekValuesAndWriteToJSON,
  copyPricesToDataSpreadsheet,
  updateAnalyticsOrders,
  sendEmail,
  fetchAvgRatingsAndWriteToJSON,
  updateLowRatingStocksSheet,
} = require("./google_sheets/index");
const campaigns = require(path.join(__dirname, "files/campaigns")).campaigns;
const fs = require("fs");
const { fetchAdsIdsAndWriteToJSON } = require("../analytics/google_sheets");

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
      await fetchStocksAndWriteToJSON(campaign),
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

const updateAdvertActivity = async () => {
  const campaign_names = {
    mayusha: "Маюша",
    delicatus: "Деликатус",
    TKS: "ТКС",
  };
  campaigns.forEach(async (campaign) => {
    Promise.all([
      await fetchAdsIdsAndWriteToJSON(campaign),
      await fetchAdvertInfosAndWriteToJson(campaign),
      await updateAdvertArtActivitiesAndGenerateNotIncluded(campaign),
    ])
      .then(async () => {
        const notIncludedNMs = JSON.parse(
          fs.readFileSync(
            path.join(__dirname, "files", campaign, "notIncludedNMs.json")
          )
        );
        // notIncludedNMs.replace(',', ',\n')
        if (!Object.entries(notIncludedNMs).length) return;
        await sendEmail(
          "as7753333@gmail.com",
          `Неучтённые номенклатуры РК для ${campaign_names[campaign]}`,
          JSON.stringify(notIncludedNMs, null, 2)
        );
        console.log("All tasks completed successfully");
      })
      .catch((error) => {
        console.error("An error occurred:", error);
      });
  });
};

const fetchStocksForLowRatingArts = () => {
  return new Promise((resolve, reject) => {
    fetchAvgRatingsAndWriteToJSON().then(() => updateLowRatingStocksSheet());
  });
};

module.exports = {
  getPrices,
  getDelivery,
  calcNewValues,
  updateAnalytics,
  updateAtriculesData,
  updateAdvertActivity,
  fetchStocksForLowRatingArts,
};
