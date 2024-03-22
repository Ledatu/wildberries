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
  fetchAdvertsStatsAndWriteToJsonMM,
  fetchAdvertsWordsAndWriteToJsonMM,
  getAdvertsStatByArtMM,
  fetchSalesAndWriteToJsonMM,
  getPaidStorageCostMM,
  getTariffsBoxAndWriteToJsonMM,
  fetchNmDetailReportAndWriteToJsonMM,
  calcSmartDetailedByPeriodAndWriteToJSON,
  autoAdvertsManagingMM,
  autoAdvertsStopMM,
  calcMassAdvertsNewAndWriteToJsonMM,
  fetchAdvertWords,
  fetchBalanceMM,
  getPlacements,
  autoSetAdvertsCPMsAndWriteToJsonMM,
  autoSetMinusPhrasesMM,
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
// fetchAdvertsMM()
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
// fetchAdvertsMM()
// autoAdvertsStopMM("4a1f2828-9a1e-4bbf-8e07-208ba676a806", "Текстиль");
// writeDrrToDataSpreadsheet()
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
//   "4a1f2828-9a1e-4bbf-8e07-208ba676a806",
//   "ТОРГМАКСИМУМ"
// );
// fetchAdvertStatsAndWriteToJson("delicatus")
// getAdvertsStatByDay('delicatus')
// fetchAdvertsMM()
// getAdvertsStatByDayMM('4a1f2828-9a1e-4bbf-8e07-208ba676a806', 'МАЮША')
// fetchArtsAndWriteToJsonMM('4a1f2828-9a1e-4bbf-8e07-208ba676a806', 'Объединённая текстильная компания')
// fetchOrdersAndWriteToJsonMM('4a1f2828-9a1e-4bbf-8e07-208ba676a806', 'Объединённая текстильная компания')
// fetchOrdersAndWriteToJsonMM("4a1f2828-9a1e-4bbf-8e07-208ba676a806", "Клининг Сервис");
// fetchAdvertsInfosAndWriteToJsonMM('4a1f2828-9a1e-4bbf-8e07-208ba676a806', 'ИП Валерий')
// fetchOrdersAndWriteToJsonMM('4a1f2828-9a1e-4bbf-8e07-208ba676a806', 'DELICATUS')
// fetchStocksAndWriteToJsonMM(
//   "4a1f2828-9a1e-4bbf-8e07-208ba676a806",
//   "Объединённая текстильная компания"
// );
// fetchStocksAndWriteToJsonMM("4a1f2828-9a1e-4bbf-8e07-208ba676a806", "МАЮША");
// fetchStocksAndWriteToJsonMM(
//   "4a1f2828-9a1e-4bbf-8e07-208ba676a806",
//   "DELICATUS"
// );
// fetchArtsAndWriteToJsonMM('4a1f2828-9a1e-4bbf-8e07-208ba676a806', 'Объединённая текстильная компания')
// fetchArtsAndWriteToJsonMM('4a1f2828-9a1e-4bbf-8e07-208ba676a806', 'МАЮША')
// fetchArtsAndWriteToJsonMM('4a1f2828-9a1e-4bbf-8e07-208ba676a806', 'DELICATUS')
// fetchOfficesAndWriteToJsonMM('4a1f2828-9a1e-4bbf-8e07-208ba676a806', 'МАЮША')
// console.log(
//   calcDeliveryOrdersAndWriteToJsonMM(
//     "4a1f2828-9a1e-4bbf-8e07-208ba676a806",
//     "Объединённая текстильная компания",
//     { from: "2024-01-10", to: "2024-01-11" }
//   )
// );
// console.log(
// calcMassAdvertsNewAndWriteToJsonMM(
//   "4a1f2828-9a1e-4bbf-8e07-208ba676a806",
//   "ИП Валерий",
//   { from: "2024-01-10", to: "2024-01-11" }
// )
// );

// console.log(
//   fetchAdvertWords(
//     getAuthTokenMM("4a1f2828-9a1e-4bbf-8e07-208ba676a806", "ИП Валерий"),
//     "14957084",
//     8
//   )
// );

// fetchAdvertsStatsAndWriteToJsonMM(
//   "4a1f2828-9a1e-4bbf-8e07-208ba676a806",
//   "МАЮША",
//   100,
//   2
// );
// calcSmartDetailedByPeriodAndWriteToJSON("mayusha");
// const afs = require("fs");
// const path = require("path");
// const authToken = getAuthTokenMM(
//   "4a1f2828-9a1e-4bbf-8e07-208ba676a806",
//   "МАЮША"
// );
// getAdvertsStatsMM(authToken, [
//   {
//     id: 13452224,
//     dates: ["2024-01-26"],
//   },
// ]).then((pr) => {
//   afs.writeFileSync(path.join(__dirname, "sts.json"), JSON.stringify(pr));
// // });

// fetchAdvertsWordsAndWriteToJsonMM(
//   "4a1f2828-9a1e-4bbf-8e07-208ba676a806",
//   "ИП Валерий"
// );

autoSetMinusPhrasesMM(
  "4a1f2828-9a1e-4bbf-8e07-208ba676a806",
  "ИП Валерий"
);


// fetchSalesAndWriteToJsonMM(
//   "4a1f2828-9a1e-4bbf-8e07-208ba676a806",
//   "ИП Артем"
// );
// fetchSalesAndWriteToJsonMM(
//   "4a1f2828-9a1e-4bbf-8e07-208ba676a806",
//   "ИП Валерий"
// );
// getDelivery()
// fetchSalesAndWriteToJsonMM(
//   "4a1f2828-9a1e-4bbf-8e07-208ba676a806",
//   "ИП Оксана"
// );
// fetchOrdersAndWriteToJsonMM(
//   "4a1f2828-9a1e-4bbf-8e07-208ba676a806",
//   "Текстиль"
// );

// fetchOrdersAndWriteToJsonMM(
//   "4a1f2828-9a1e-4bbf-8e07-208ba676a806",
//   "ИП Артем"
// );
// fetchOrdersAndWriteToJsonMM(
//   "4a1f2828-9a1e-4bbf-8e07-208ba676a806",
//   "ИП Валерий"
// );
// fetchOrdersAndWriteToJsonMM(
//   "4a1f2828-9a1e-4bbf-8e07-208ba676a806",
//   "Клининг Сервис",
//   15
// );
// getPaidStorageCostMM(
//   "4a1f2828-9a1e-4bbf-8e07-208ba676a806",
//   "Текстиль"
// );
// getPaidStorageCostMM(
//   "4a1f2828-9a1e-4bbf-8e07-208ba676a806",
//   "ИП Артем"
// );
// getPaidStorageCostMM(
//   "4a1f2828-9a1e-4bbf-8e07-208ba676a806",
//   "ИП Валерий"
// );
// getPaidStorageCostMM(
//   "4a1f2828-9a1e-4bbf-8e07-208ba676a806",
//   "ИП Оксана"
// );
// writeSppToDataSpreadsheet()

// getPrices()
// fetchAutoPriceRulesAndWriteToJSON()
// calcAutoPrices(false)

// fetchAdvertsWordsAndWriteToJsonMM(
//   "4a1f2828-9a1e-4bbf-8e07-208ba676a806",
//   "ИП Иосифов А. М."
// );

// fetchAdvertsMM();
// getTariffsBoxAndWriteToJsonMM(
//   "4a1f2828-9a1e-4bbf-8e07-208ba676a806",
//   "ИП Валерий"
// );
// fetchCardsAndWriteToJSON("delicatus");
// fetchArtsAndWriteToJsonMM(
//   "4a1f2828-9a1e-4bbf-8e07-208ba676a806",
//   "ИП Иосифова Р. И."
// );
// fetchNmDetailReportAndWriteToJsonMM(
//   "4a1f2828-9a1e-4bbf-8e07-208ba676a806",
//   "ИП Валерий"
// );
// getAdvertsStatByArtMM("4a1f2828-9a1e-4bbf-8e07-208ba676a806", "ИП Валерий");
// getAdvertsStatByArtMM("4a1f2828-9a1e-4bbf-8e07-208ba676a806", "ИП Артем");
// getAdvertsStatByArtMM("4a1f2828-9a1e-4bbf-8e07-208ba676a806", "ИП Оксана");
// getAdvertsStatByArtMM("332fa5da-8450 -451a-b859-a84ca9951a34", "Текстиль");
// getPlacements("4a1f2828-9a1e-4bbf-8e07-208ba676a806", "ИП Валерий");
// autoAdvertsManagingMM("4a1f2828-9a1e-4bbf-8e07-208ba676a806", "ИП Артем");
// fetchAdvertsBudgetsAndWriteToJsonMM(
//   "4a1f2828-9a1e-4bbf-8e07-208ba676a806",
//   "DELICATUS"
// );

// fetchAdvertsBudgetsAndWriteToJsonMM(
//   "4a1f2828-9a1e-4bbf-8e07-208ba676a806",
//   "Объединённая текстильная компания"

// );

// fetchAdvertsMM()
// fetchAdverts()
// getPrices()
// fetchAdvertsWordsAndWriteToJsonMM("4a1f2828-9a1e-4bbf-8e07-208ba676a806", "ИП Артем")
// autoSetAdvertsCPMsAndWriteToJsonMM("4a1f2828-9a1e-4bbf-8e07-208ba676a806", "ИП Иосифов А. М.")
// fetchAdvertsStatsAndWriteToJsonMM("4a1f2828-9a1e-4bbf-8e07-208ba676a806", "Клининг Сервис", 100, 2)
// writeSpp

// fetchAdvertsMM()
// const d = new Date('2024-01-30T05:58:00.000Z')
// calcAndSendTrendsToTg(d);
// fetchAdvertsWordsAndWriteToJsonMM(
//   "4a1f2828-9a1e-4bbf-8e07-208ba676a806",
//   "МАЮША"
// );

// fetchAdvertsWordsAndWriteToJsonMM(
//   "4a1f2828-9a1e-4bbf-8e07-208ba676a806",
//   "DELICATUS"
// );
// fetchAdvertsWordsAndWriteToJsonMM(
//   "4a1f2828-9a1e-4bbf-8e07-208ba676a806",
//   "Объединённая текстильная компания"
// );

// fetchDetailedByPeriodAndWriteToJSON("TKS");
