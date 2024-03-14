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
  generateGeneralMaskFormsAndWriteToJSON,
  fetchUnasweredFeedbacksAndWriteToJSON,
  answerFeedbacks,
  fetchSalesAndWriteToJSON,
  fetchAdvertStatsAndWriteToJsonMpManagerLog,
  sendTgBotTrendMessage,
  calcStatsTrendsAndWtriteToJSON,
  calcAutoEnteredValuesAndWriteToJSON,
  updatePrices,
  calcRNPByDayMetricsAndWriteToJSON,
  fetchAdvertsAndWriteToJsonMM,
  fetchAdvertsInfosAndWriteToJsonMM,
  fetchAdvertsStatsAndWriteToJsonMM,
  fetchAdvertsBudgetsAndWriteToJsonMM,
  getAdvertsStatByDayMM,
  fetchOrdersAndWriteToJsonMM,
  fetchArtsAndWriteToJsonMM,
  fetchStocksAndWriteToJsonMM,
  fetchAdvertsWordsAndWriteToJsonMM,
  fetchSalesAndWriteToJsonMM,
} = require("./main");
const {
  writePrices,
  writeDetailedByPeriod,
  fetchDataAndWriteToJSON,
  fetchEnteredValuesAndWriteToJSON,
  copyPricesToDataSpreadsheet,
  updateAnalyticsOrders,
  sendEmail,
  fetchAvgRatingsAndWriteToJSON,
  updateLowRatingStocksSheet,
  updatePlanFact,
  fetchNewRKsToCreate,
  updateFactStatsByRK,
  fetchArtMaskPricesAndWriteToJSON,
  fetchFeedbackAnswerTemplatesAndWriteToJSON,
  writeSppToDataSpreadsheet,
  fetchAutoPriceRulesAndWriteToJSON,
  fetchNewPricesAndWriteToJSON,
  updateRNP,
} = require("./google_sheets/index");
const campaigns = require(path.join(__dirname, "files/campaigns")).campaigns;
const fs = require("fs");
const { fetchAdsIdsAndWriteToJSON } = require("../analytics/google_sheets");
const { fetchSpp } = require("../analytics/main");
const {
  fetchOTKArtMathcingAndWriteToJSON,
} = require("../qrGeneration/google_sheets");

const updateAtriculesData = async () => {
  await fetchArtMaskPricesAndWriteToJSON().then(() =>
    generateGeneralMaskFormsAndWriteToJSON().then(() =>
      copyPricesToDataSpreadsheet().then(
        async () =>
          await fetchDataAndWriteToJSON().then(
            async () => await fetchOTKArtMathcingAndWriteToJSON()
          )
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

const getPrices = async (rewriteProfit = false) => {
  await updateAtriculesData();

  campaigns.forEach(async (campaign) => {
    Promise.all([
      // await calcAdvertismentAndWriteToJSON(campaign),

      await fetchCardsAndWriteToJSON(campaign),
      await fetchOrdersAndWriteToJSON(campaign),
      await fetchSalesAndWriteToJSON(campaign),
      await fetchStocksAndWriteToJSON(campaign),
      await calcAvgOrdersAndWriteToJSON(campaign),
      // await updateAnalyticsOrders(campaign),
      await fetchDataAndWriteToXlsx(campaign, rewriteProfit),
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

const answerAllFeedbacks = async () => {
  await fetchFeedbackAnswerTemplatesAndWriteToJSON();
  campaigns.forEach(async (campaign) => {
    Promise.all([
      await fetchUnasweredFeedbacksAndWriteToJSON(campaign),
      await answerFeedbacks(campaign),
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

const calcAndSendTrendsToTg = async (now) => {
  const hour_key = now.toLocaleTimeString("ru-RU").slice(0, 2);
  console.log(hour_key, now.toLocaleTimeString("ru-RU"));
  if (!["05", "08", "11", "14", "17", "20", "23"].includes(hour_key)) return;
  const promises = [];
  campaigns.forEach(async (campaign) => {
    promises.push(calcStatsTrendsAndWtriteToJSON(campaign, now));
  });
  Promise.all(promises).then(
    async () => await sendTgBotTrendMessage(now, hour_key)
  );
};

const calcAutoPrices = (autoSend = true) => {
  return new Promise(async (resolve, reject) => {
    const now = new Date();
    await fetchAutoPriceRulesAndWriteToJSON();
    const hours = JSON.parse(
      fs.readFileSync(path.join(__dirname, `files/autoPriceRules.json`))
    ).hours;
    const brands = JSON.parse(
      fs.readFileSync(path.join(__dirname, `files/campaigns.json`))
    ).brands;
    const hour_key = now.toLocaleTimeString("ru-RU").slice(0, 2);
    console.log(hour_key, now.toLocaleTimeString("ru-RU"));
    // if (!hours.includes(hour_key) && autoSend) return;
    await calcAutoEnteredValuesAndWriteToJSON();
    const promises = [];
    campaigns.forEach(async (campaign) => {
      // promises.push(await fetchDataAndWriteToXlsx(campaign));
      promises.push(await calculateNewValuesAndWriteToXlsx(campaign));
      console.log('herere');
      // promises.push(await calculateNewValuesAndWriteToXlsx(campaign));
      promises.push(await writePrices(campaign));
      if (autoSend) {
        for (const [index, brand] of Object.entries(brands[campaign])) {
          promises.push(await fetchNewPricesAndWriteToJSON(brand));
          promises.push(await updatePrices(brand));
        }
        promises.push(await fetchDataAndWriteToXlsx(campaign));
        promises.push(await writePrices(campaign));
      }
    });
    Promise.all(promises).then(async () => resolve());
  });
};

const writeSpp = async () => {
  await writeSppToDataSpreadsheet();
  // campaigns.forEach(async (campaign) => {
  //   Promise.all([await writeSppToDataSpreadsheet(campaign)])
  //     .then(async () => {
  //       console.log("All tasks completed successfully");
  //     })
  //     .catch((error) => {
  //       console.error("An error occurred:", error);
  //     });
  // });
};

const RNPupdation = async () => {
  // await fetchDataAndWriteToJSON()
  await calcRNPByDayMetricsAndWriteToJSON().then(
    updateRNP()
      .then(async () => {
        console.log("All tasks completed successfully");
      })
      .catch((error) => {
        console.error("An error occurred:", error);
      })
  );
};

const fetchAdverts = async () => {
  // const now = new Date('2023-12-19T17:57:00.000Z')
  const now = new Date();
  return new Promise(async (resolve, reject) => {
    const promises = [];
    campaigns.forEach(async (campaign) =>
      promises.push(
        new Promise(async (resolve, reject) => {
          Promise.all([
            // await fetchOrdersAndWriteToJSON(campaign),
            // await fetchAdvertsAndWriteToJson(campaign),
            // await fetchAdvertInfosAndWriteToJson(campaign),
            // await fetchAdvertStatsAndWriteToJsonMpManager(campaign, now),
            // await fetchAdvertStatsAndWriteToJsonMpManagerLog(campaign, now),
            await getAdvertStatByMaskByDayAndWriteToJSONMpManager(campaign),
            await getAdvertStatByDayAndWriteToJSONMpManager(campaign),
            await calcAvgDrrByArtAndWriteToJSON(campaign),
            await updatePlanFact(campaign),
            await updateFactStatsByRK(campaign),
          ]).then(() => resolve("Updated."));
        })
      )
    );
    Promise.all(promises)
      .then(() => resolve())
      .catch((error) => {
        console.error("An error occurred:", error);
      });
  });
};
// .then(async () => {
//   await calcAndSendTrendsToTg(now).then(() => resolve("Updated."));
//   console.log("All tasks completed successfully");
// })

const fetchAdvertsMM = async () => {
  // const now = new Date('2023-12-19T17:57:00.000Z')
  // const now = new Date();
  return new Promise(async (resolve, reject) => {
    const customers = JSON.parse(
      fs.readFileSync(path.join(__dirname, "marketMaster", "customers.json"))
    );
    const promises = [];
    for (const [uid, customerData] of Object.entries(customers)) {
      const campaignsNames = customerData.campaignsNames;
      for (let i = 0; i < campaignsNames.length; i++) {
        const campaignName = campaignsNames[i];
        // if (campaignName != "ИП Валерий") continue;
        console.log(uid, campaignName);
        promises.push(
          new Promise(async (resolve, reject) => {
            Promise.all([
              await fetchArtsAndWriteToJsonMM(uid, campaignName),
              await fetchOrdersAndWriteToJsonMM(uid, campaignName),
              await fetchSalesAndWriteToJsonMM(uid, campaignName),
              await fetchStocksAndWriteToJsonMM(uid, campaignName),
              await fetchAdvertsBudgetsAndWriteToJsonMM(uid, campaignName),
              // await fetchAdvertsWordsAndWriteToJsonMM(uid, campaignName),
            ]).then(() => resolve(uid, campaignName, "Adverts updated."));
          })
        );
      }
    }
    Promise.all(promises).then(() => resolve());
    //   .then(async () => {
    //     await calcAndSendTrendsToTg(now).then(() => resolve("Updated."));
    //     console.log("All tasks completed successfully");
    //   })
    //   .catch((error) => {
    //     console.error("An error occurred:", error);
    //   });
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
  answerAllFeedbacks,
  writeSpp,
  calcAndSendTrendsToTg,
  calcAutoPrices,
  RNPupdation,
  fetchAdvertsMM,
};
