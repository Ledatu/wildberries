const {
  copyZakazToOtherSpreadsheet,
  fetchDataAndWriteToJSON,
  copyPricesToDataSpreadsheet,
  fetchNewPricesAndWriteToJSON,
  updateAnalyticsOrders,
  sendEmail,
  updateLowRatingStocksSheet,
  fetchAvgRatingsAndWriteToJSON,
  updatePlanFact,
  fetchNewRKsToCreate,
  pivotOrders,
  writeDrrToDataSpreadsheet,
  updateFactStatsByRK,
  fetchFeedbackAnswerTemplatesAndWriteToJSON,
  generatePricesTemplateSheet,
  fetchArtMaskPricesAndWriteToJSON,
  genAllEqualTemplatesSheet,
  writeSppToDataSpreadsheet,
  calcAndWriteMinZakazToDataSpreadsheet,
} = require("./google_sheets");
const {
  fetchDetailedByPeriodAndWriteToJSON,
  updatePrices,
  fetchStocksAndWriteToJSON,
  fetchOrdersAndWriteToJSON,
  calcAvgOrdersAndWriteToJSON,
  fetchAdvertsAndWriteToJson,
  fetchCardsTempAndWriteToJSON,
  getKTErrorsAndWriteToJson,
  fetchAdvertInfosAndWriteToJson,
  updateAdvertArtActivitiesAndGenerateNotIncluded,
  fetchArtsRatings,
  calcAvgRatingsAndWriteToJSON,
  fetchCardsAndWriteToJSON,
  calcOrdersFromDetailedByPeriodAndWriteToJSON,
  fetchAdvertStatsAndWriteToJson,
  getAdvertStatByMaskByDayAndWriteToJSON,
  updateAutoAdvertsInCampaign,
  setFixedPhrasesForCreatedRKs,
  fetchAdvertStatsAndWriteToJsonMpManager,
  getAdvertStatByMaskByDayAndWriteToJSONMpManager,
  fetchSubjectDictionaryAndWriteToJSON,
  createNewRKs,
  getAdvertStatByDayAndWriteToJSONMpManager,
  fetchRksBudgetsAndWriteToJSON,
  calcAvgDrrByArtAndWriteToJSON,
  fetchUnasweredFeedbacksAndWriteToJSON,
  generateGeneralMaskFormsAndWriteToJSON,
  answerFeedbacks,
  updateStorageCostAndWriteToJSON,
  fetchSalesAndWriteToJSON,
  fetchAdvertStatsAndWriteToJsonMpManagerLog,
  calcStatsTrendsAndWtriteToJSON,
  sendTgBotTrendMessage,
} = require("./main");
const {
  getPrices,
  getDelivery,
  calcNewValues,
  updateAnalytics,
  updateAdvertActivity,
  fetchStocksForLowRatingArts,
  fetchAdverts,
  fetchByNowStats,
  updateAutoAdverts,
  createNewAdverts,
  answerAllFeedbacks,
  writeSpp,
  updateAtriculesData,
  calcAndSendTrendsToTg,
} = require("./prices");
// copyZakazToOtherSpreadsheet()
// fetchDetailedByPeriodAndWriteToJSON('mayusha')
// getDelivery().then((pr) => console.log(pr));
// fetchDataAndWriteToJSON()
// getPrices();
// updateAnalyticsOrders("mayusha");
// sendRKErrors('projecttriggers@gmail.com', 'Ошибки РК', 'Тест');
// updateAdvertArtActivitiesAndGenerateNotIncluded('mayusha')
// updateAdvertActivity()
// updateAnalyticsOrders("TKS");
// updateAnalyticsOrders("delicatus");
// fetchAdvertsAndWriteToJson('TKS')
// calcNewValues()
// copyPricesToDataSpreadsheet()
// fetchNewPricesAndWriteToJSON("mayusha").then((pr) => {
//   console.log("Prices fetched.");
//   updatePrices("mayusha");
// });
// fetchStocksAndWriteToJSON("mayusha")
// fetchStocksAndWriteToJSON("delicatus")
// generateGeneralMaskFormsAndWriteToJSON()
// generatePricesTemplateSheet()
// fetchArtMaskPricesAndWriteToJSON()
// copyPricesToDataSpreadsheet()
// fetchStocksAndWriteToJSON("TKS")
// updateAnalytics()
// fetchArtsRatings("mayusha");
// fetchArtsRatings("delicatus");
// fetchArtsRatings("TKS");
// calcAvgRatingsAndWriteToJSON("mayusha");
const a = async () => {
  // calcAvgRatingsAndWriteToJSON("delicatus");
  // calcAvgRatingsAndWriteToJSON("TKS");
};
// a();

// fetchStocksForLowRatingArts()
// fetchCardsAndWriteToJSON("mayusha");
// fetchCardsAndWriteToJSON("delicatus");
// fetchCardsAndWriteToJSON("TKS");
// updateLowRatingStocksSheet()
// updateAdvertActivity()
// calcOrdersFromDetailedByPeriodAndWriteToJSON("mayusha");
// fetchAdvertStatsAndWriteToJson("delicatus");
// fetchAdvertStatsAndWriteToJson("TKS");
// fetchCardsAndWriteToJSON('mayusha')
// fetchCardsAndWriteToJSON('delicatus')
// fetchCardsAndWriteToJSON('TKS')
// calcAvgOrdersAndWriteToJSON("delicatus");
// fetchAdverts()
// updateAutoAdverts()
// copyZakazToOtherSpreadsheet()
// fetchAdvertsAndWriteToJson("mayusha");
// fetchAdvertInfosAndWriteToJson("mayusha");
// fetchAdvertStatsAndWriteToJson("mayusha");
// getAdvertStatByMaskByDayAndWriteToJSON('TKS')
// updatePlanFact('mayusha')
// fetchOrdersAndWriteToJSON("TKS");
// fetchNewPricesAndWriteToJSON("delicatus");
// fetchOrdersAndWriteToJSON("mayusha");
// updatePlanFact('delicatus')
// fetchByNowStats()
// updateAutoAdvertsInCampaign('delicatus')
// updatePlanFact('TKS')
// updatePlanFact('mayusha')
// fetchOrdersAndWriteToJSON("mayusha");
// pivotOrders('mayusha')
// updatePlanFact('delicatus')
// updateAutoAdverts()
// fetchAdverts().then((pr) => {});
// updateFactStatsByRK('mayusha')
// fetchNewRKsToCreate();
// setFixedPhrasesForCreatedRKs("mayusha");
// fetchOrdersAndWriteToJSON("mayusha").then(() =>
// fetchAdvertStatsAndWriteToJsonMpManager("mayusha").then(() =>
//   getAdvertStatByMaskByDayAndWriteToJSONMpManager("mayusha").then(() =>
// updatePlanFact('delicatus')
//   )
// );
// );
//
// fetchAdvertsAndWriteToJson("mayusha");
// writeDrrToDataSpreadsheet();
// getAdvertStatByMaskByDayAndWriteToJSONMpManager("TKS").then(() =>
//   calcAvgDrrByArtAndWriteToJSON("TKS")
// );
// fetchSubjectDictionaryAndWriteToJSON()
// createNewAdverts();
// getAdvertStatByDayAndWriteToJSONMpManager("TKS").then(() =>
//   fetchRksBudgetsAndWriteToJSON("TKS").then(() =>
// updateFactStatsByRK("delicatus")
//   )
// );
// answerAllFeedbacks()
// updateStorageCost({ mayusha: 0, delicatus: 0, TKS: 0 })
// genAllEqualTemplatesSheet()
// copyZakazToOtherSpreadsheet()
// fetchSalesAndWriteToJSON("mayusha")
// fetchUnasweredFeedbacksAndWriteToJSON('delicatus')
// writeSppToDataSpreadsheet()
// writeDrrToDataSpreadsheet()
// writeSpp()
// calcAndWriteMinZakazToDataSpreadsheet()
// updateAtriculesData()

// fetchAdvertStatsAndWriteToJsonMpManagerLog('mayusha')

// calcStatsTrendsAndWtriteToJSON("mayusha")
// calcStatsTrendsAndWtriteToJSON("delicatus")
// calcStatsTrendsAndWtriteToJSON("TKS")
// sendTgBotTrendMessage()
// calcAndSendTrendsToTg('11')
// fetchAdverts()
getPrices()