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
  fetchArtsRatings,
  fetchAdvertStatsAndWriteToJson,
  getAdvertStatByMaskByDayAndWriteToJSON,
  updateAutoAdvertsInCampaign,
  fetchAdvertStatsAndWriteToJsonMpManager,
  getAdvertStatByMaskByDayAndWriteToJSONMpManager,
  fetchSubjectDictionaryAndWriteToJSON,
  createNewRKs,
  getAdvertStatByDayAndWriteToJSONMpManager,
  fetchRksBudgetsAndWriteToJSON,
  calcAvgDrrByArtAndWriteToJSON,
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
  updatePlanFact,
  fetchNewRKsToCreate,
  updateFactStatsByRK,
  fetchArtMaskPricesAndWriteToJSON,
} = require("./google_sheets/index");
const campaigns = require(path.join(__dirname, "files/campaigns")).campaigns;
const fs = require("fs");
const { fetchAdsIdsAndWriteToJSON } = require("../analytics/google_sheets");

const updateAtriculesData = async () => {
  await fetchArtMaskPricesAndWriteToJSON().then(() =>
    generateGeneralMaskFormsAndWriteToJSON().then(() =>
      copyPricesToDataSpreadsheet().then(
        async (pr) => await fetchDataAndWriteToJSON()
      )
    )
  );
};

const createNewAdverts = async () =>
  new Promise((resolve, reject) => {
    fetchSubjectDictionaryAndWriteToJSON().then(async () =>
      fetchNewRKsToCreate().then(() => createNewRKs().then(() => resolve()))
    );
  });

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
  // await new Promise((resolve) => setTimeout(resolve, 60000));
  // await updateAnalytics();
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

const fetchAdverts = async () => {
  return new Promise((resolve, reject) => {
    campaigns.forEach(async (campaign) => {
      Promise.all([
        await fetchOrdersAndWriteToJSON(campaign),
        await fetchAdvertsAndWriteToJson(campaign),
        await fetchAdvertInfosAndWriteToJson(campaign),
        await fetchAdvertStatsAndWriteToJsonMpManager(campaign),
        await fetchRksBudgetsAndWriteToJSON(campaign),
        await getAdvertStatByMaskByDayAndWriteToJSONMpManager(campaign),
        await getAdvertStatByDayAndWriteToJSONMpManager(campaign),
        await calcAvgDrrByArtAndWriteToJSON(campaign),
        await updatePlanFact(campaign),
        await updateFactStatsByRK(campaign),
      ])
        .then(async () => {
          console.log("All tasks completed successfully");
          resolve("Updated.");
        })
        .catch((error) => {
          console.error("An error occurred:", error);
        });
    });
  });
};

const fetchByNowStats = async () => {
  campaigns.forEach(async (campaign) => {
    Promise.all([
      await fetchOrdersAndWriteToJSON(campaign),
      await updatePlanFact(campaign),
      await updateFactStatsByRK(campaign),
    ])
      .then(async () => {
        console.log("All tasks completed successfully");
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
      await fetchStocksAndWriteToJSON(campaign),
      await fetchAdvertsAndWriteToJson(campaign),
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

const updateAutoAdverts = async () => {
  campaigns.forEach(async (campaign) => {
    Promise.all([
      await fetchAdvertsAndWriteToJson(campaign),
      await fetchAdvertInfosAndWriteToJson(campaign),
      await updateAutoAdvertsInCampaign(campaign),
    ]).catch((error) => {
      console.error("An error occurred:", error);
    });
  });
};

const fetchStocksForLowRatingArts = () => {
  return new Promise((resolve, reject) => {
    const promises = [];
    for (const campaign of campaigns) {
      promises.push(fetchArtsRatings(campaign));
    }
    Promise.all(promises).then(() =>
      updateLowRatingStocksSheet().then(() => resolve())
    );
  });
};

module.exports = {
  getPrices,
  getDelivery,
  calcNewValues,
  updateAnalytics,
  updateAtriculesData,
  updateAdvertActivity,
  updateAutoAdverts,
  fetchStocksForLowRatingArts,
  fetchAdverts,
  createNewAdverts,
  fetchByNowStats,
};
