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
  writePrices,
  fetchEnteredValuesAndWriteToJSON,
  fetchAutoPriceRulesAndWriteToJSON,
  updateRNP,
  writeDetailedByPeriod,
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
  fetchDataAndWriteToXlsx,
  calculateNewValuesAndWriteToXlsx,
  calcAutoEnteredValuesAndWriteToJSON,
  calcRNPByDayMetricsAndWriteToJSON,
  logCurrentProfit,
  fetchPricesAndWriteToJSON,
  getAdvertsStatByDay,
  fetchArtsAndWriteToJsonMM,
  getAdvertsStatByDayMM,
  fetchStocksAndWriteToJsonMM,
  fetchOrdersAndWriteToJsonMM,
  fetchOfficesAndWriteToJsonMM,
  calcDeliveryOrdersAndWriteToJsonMM,
  calcMassAdvertsAndWriteToJsonMM,
  fetchAdvertsInfosAndWriteToJsonMM,
  getAdvertsStatsMM,
  getAuthTokenMM,
  fetchAdvertsBudgetsAndWriteToJsonMM,
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
  calcAutoPrices,
  RNPupdation,
  fetchAdvertsMM,
} = require("./prices");
// copyZakazToOtherSpreadsheet()
// fetchDetailedByPeriodAndWriteToJSON('mayusha')
// getDelivery().then((pr) => console.log(pr));
// fetchDataAndWriteToJSON()
//  getPrices();
// fetchPricesAndWriteToJSON('delicatus');
// calcAndWriteMinZakazToDataSpreadsheet()
// updateAnalyticsOrders("mayusha");
// sendRKErrors('projecttriggers@gmail.com', 'Ошибки РК', 'Тест');
// updateAdvertArtActivitiesAndGenerateNotIncluded('mayusha')
// updateAdvertActivity()
// updateAnalyticsOrders("TKS");
// updateAnalyticsOrders("delicatus");
// fetchAdvertsAndWriteToJson('TKS')
// calcNewValues()
// fetchArtMaskPricesAndWriteToJSON()
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
// const a = async () => {
//   // calcAvgRatingsAndWriteToJSON("delicatus");
//   // calcAvgRatingsAndWriteToJSON("TKS");
// };
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
// updatePlanFact('TKS')
// getAdvertStatByMaskByDayAndWriteToJSONMpManager('mayusha')

// fetchOrdersAndWriteToJSON("mayusha");
// fetchOrdersAndWriteToJSON("delicatus");
// fetchOrdersAndWriteToJSON("TKS");

// fetchNewPricesAndWriteToJSON("delicatus");
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
// fetchAdvertsMM()
// getDelivery()
// getPrices()
// fetchDataAndWriteToXlsx('delicatus').then(() => writePrices('delicatus'))
// writePrices('perinka')
// fetchDataAndWriteToXlsx('delicatus')
// writePrices('delicatus')
// writeSppToDataSpreadsheet()
// const d = new Date('2023-12-22T11:57:00.000Z')
// console.log(d);
// calcAndSendTrendsToTg(d)
// calcStatsTrendsAndWtriteToJSON('mayusha', d)
// fetchAdverts()
// getAdvertStatByMaskByDayAndWriteToJSONMpManager("TKS")
// fetchCardsAndWriteToJSON("TKS");
// fetchCardsAndWriteToJSON("mayusha");
// fetchCardsAndWriteToJSON("delicatus");
// fetchOrdersAndWriteToJSON("TKS")

// fetchEnteredValuesAndWriteToJSON('TKS')
// calculateNewValuesAndWriteToXlsx("mayusha")
//   .then(() => writePrices("mayusha"))
//   .then(() => fetchNewPricesAndWriteToJSON("mayusha"));

// updatePrices("ОТК");
// updateLowRatingStocksSheet()
// calcAvgDrrByArtAndWriteToJSON('TKS')
// answerAllFeedbacks()
// updateFactStatsByRK("mayusha")
// updateFactStatsByRK("delicatus")
// updateFactStatsByRK("TKS")
// copyZakazToOtherSpreadsheet()
// updatePlanFact('mayusha')
// getAdvertStatByMaskByDayAndWriteToJSONMpManager('delicatus')
// updatePlanFact('delicatus')
// updatePlanFact('TKS')
// writeDrrToDataSpreadsheet();
// fetchAutoPriceRulesAndWriteToJSON();
// calcAutoEnteredValuesAndWriteToJSON();

// calculateNewValuesAndWriteToXlsx('mayusha');
// fetchDataAndWriteToXlsx('TKS')
// writePrices('mayusha');
// calcNewValues();
// calcAutoPrices(false);
// calcAvgOrdersAndWriteToJSON('mayusha');
// calcAutoEnteredValuesAndWriteToJSON().then(calculateNewValuesAndWriteToXlsx('perinka').then(() => writePrices('perinka')));
// writeSpp();
// calcRNPByDayMetricsAndWriteToJSON();
// updateRNP();
// RNPupdation();
// updatePlanFact('perinka')
// writeDrrToDataSpreadsheet()
// logCurrentProfit('mayusha', 'МАЮША', 63841);
// copyPricesToDataSpreadsheet()
// fetchDataAndWriteToXlsx('perinka').then(() => writePrices('perinka'))

// fetchDetailedByPeriodAndWriteToJSON('TKS')
// writeDrrToDataSpreadsheet()
// copyPricesToDataSpreadsheet()

// getDelivery()
// fetchNewPricesAndWriteToJSON('МАЮША')
// updatePlanFact('perinka')
// writeDrrToDataSpreadsheet()
// getDelivery()
// calcAutoPrices(false);

// getPrices()
// copyZakazToOtherSpreadsheet()
// fetchCardsAndWriteToJSON('TKS');
// fetchAdvertsMM()
// fetchAdverts()
// writeDetailedByPeriod('TKS')
// getDelivery("TKS");
// calcAndSendTrendsToTg(new Date());
// updateFactStatsByRK("TKS")
// writeDrrToDataSpreadsheet()
// fetchAdvertInfosAndWriteToJson('TKS')
// fetchAdvertStatsAndWriteToJson('TKS')
// fetchAdvertStatsAndWriteToJsonMpManager('TKS', new Date())
// getPrices()
// writeDetailedByPeriod("TKS")
// calcAndWriteMinZakazToDataSpreadsheet()
// fetchAdvertsAndWriteToJson('delicatus')
// fetchAdvertsInfosAndWriteToJsonMM(
//   "332fa5da-8450-451a-b859-a84ca9951a34",
//   "МАЮША"
// );
// fetchAdvertStatsAndWriteToJson("delicatus")
// getAdvertsStatByDay('delicatus')
// fetchAdvertsMM()
// getAdvertsStatByDayMM('332fa5da-8450-451a-b859-a84ca9951a34', 'МАЮША')
// fetchArtsAndWriteToJsonMM('332fa5da-8450-451a-b859-a84ca9951a34', 'Объединённая текстильная компания')
// fetchOrdersAndWriteToJsonMM('332fa5da-8450-451a-b859-a84ca9951a34', 'Объединённая текстильная компания')
// fetchOrdersAndWriteToJsonMM('332fa5da-8450-451a-b859-a84ca9951a34', 'МАЮША')
// fetchOrdersAndWriteToJsonMM('332fa5da-8450-451a-b859-a84ca9951a34', 'DELICATUS')
// fetchStocksAndWriteToJsonMM(
//   "332fa5da-8450-451a-b859-a84ca9951a34",
//   "Объединённая текстильная компания"
// );
// fetchStocksAndWriteToJsonMM("332fa5da-8450-451a-b859-a84ca9951a34", "МАЮША");
// fetchStocksAndWriteToJsonMM(
//   "332fa5da-8450-451a-b859-a84ca9951a34",
//   "DELICATUS"
// );
// fetchArtsAndWriteToJsonMM('332fa5da-8450-451a-b859-a84ca9951a34', 'Объединённая текстильная компания')
// fetchArtsAndWriteToJsonMM('332fa5da-8450-451a-b859-a84ca9951a34', 'МАЮША')
// fetchArtsAndWriteToJsonMM('332fa5da-8450-451a-b859-a84ca9951a34', 'DELICATUS')
// fetchOfficesAndWriteToJsonMM('332fa5da-8450-451a-b859-a84ca9951a34', 'МАЮША')
// console.log(
//   calcDeliveryOrdersAndWriteToJsonMM(
//     "332fa5da-8450-451a-b859-a84ca9951a34",
//     "Объединённая текстильная компания",
//     { from: "2024-01-10", to: "2024-01-11" }
//   )
// );
// console.log(
// calcMassAdvertsAndWriteToJsonMM(
//   "332fa5da-8450-451a-b859-a84ca9951a34",
//   "МАЮША",
//   { from: "2024-01-10", to: "2024-01-11" }
// );
//);
// const afs = require("fs");
// const path = require("path");

// const authToken = getAuthTokenMM(
//   "332fa5da-8450-451a-b859-a84ca9951a34",
//   "МАЮША"
// );
// getAdvertsStatsMM(authToken, [
//   {
//     id: 13381678,
//     interval: {
//       begin: "2019-01-01",
//       end: "2024-01-23",
//     },
//   },
// ]).then((pr) => {
//   afs.writeFileSync(path.join(__dirname, "sts.json"), JSON.stringify(pr));
// });

fetchAdvertsBudgetsAndWriteToJsonMM(
  "332fa5da-8450-451a-b859-a84ca9951a34",
  "МАЮША"
);

fetchAdvertsBudgetsAndWriteToJsonMM(
  "332fa5da-8450-451a-b859-a84ca9951a34",
  "DELICATUS"
);

fetchAdvertsBudgetsAndWriteToJsonMM(
  "332fa5da-8450-451a-b859-a84ca9951a34",
  "Объединённая текстильная компания"
);
