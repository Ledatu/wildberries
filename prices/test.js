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
// fetchOrdersAndWriteToJSON("delicatus");
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
// fetchAdverts().then((pr) => console.log(JSON.stringify(pr)));
// fetchNewRKsToCreate();
// setFixedPhrasesForCreatedRKs("mayusha");
// fetchOrdersAndWriteToJSON("mayusha").then(() =>
// fetchAdvertStatsAndWriteToJsonMpManager("mayusha").then(() =>
//   getAdvertStatByMaskByDayAndWriteToJSONMpManager("mayusha").then(() =>
    // updatePlanFact()
//   )
// );
// );
//
// fetchAdvertsAndWriteToJson("mayusha");
writeDrrToDataSpreadsheet();
