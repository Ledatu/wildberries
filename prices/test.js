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
  readIfExists,
  autoDepositAdvertsBudgetsAndWriteToJsonMM,
  fetchArtsPricesAndWriteToJsonMM,
  autoManageAdvertsSchedule,
  fetchAdvertsAndWriteToJsonMM,
  calcPricesJsonDataMM,
  fetchPaymentsHistoryMM,
  calcPricesMM,
  getNmDetailReport,
  calcAnalyticsMM,
  autoSetFixArtPricesMM,
  changeUploadedArtsDataForKeyMM,
  getAllTags,
  dzhemCreate,
  dzhemGet,
  dzhemCheck,
  calcMassAdvertsNewNewAndWriteToJsonMM,
  parseDzhem,
  calcPlansTemplateAndWriteToXlsxMM,
  parsePlansXlsx,
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
const path = require("path");
// copyZakazToOtherSpreadsheet()
// fetchDetailedByPeriodAndWriteToJSON('mayusha')
// getDelivery().then((pr) => console.log(new Date(), pr));
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
//   console.log(new Date(), "Prices fetched.");
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
// console.log(new Date(), d);
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
// console.log(new Date(), 
//   calcDeliveryOrdersAndWriteToJsonMM(
//     "4a1f2828-9a1e-4bbf-8e07-208ba676a806",
//     "Объединённая текстильная компания",
//     { from: "2024-01-10", to: "2024-01-11" }
//   )
// );
// console.log(new Date(), 
// calcMassAdvertsNewAndWriteToJsonMM(
//   "4a1f2828-9a1e-4bbf-8e07-208ba676a806",
//   "ИП Валерий",
//   { from: "2024-01-10", to: "2024-01-11" }
// )
// );

// autoSetAdvertsCPMsAndWriteToJsonMM('4a1f2828-9a1e-4bbf-8e07-208ba676a806', 'ИП Галилова');

// console.log(new Date(), 
//   fetchAdvertWords(
//     getAuthTokenMM("4a1f2828-9a1e-4bbf-8e07-208ba676a806", "ИП Валерий"),
//     "14957084",
//     8
//   )
// );
// fetchAdvertsWordsAndWriteToJsonMM("4a1f2828-9a1e-4bbf-8e07-208ba676a806", "ИП Оксана")
// autoAdvertsManagingMM("4a1f2828-9a1e-4bbf-8e07-208ba676a806", "ИП Валерий")
// fetchAdvertsWordsAndWriteToJsonMM("4a1f2828-9a1e-4bbf-8e07-208ba676a806", "ИП Валерий")
// autoSetMinusPhrasesMM("4a1f2828-9a1e-4bbf-8e07-208ba676a806", "ИП Артем")
// autoDepositAdvertsBudgetsAndWriteT oJsonMM("4a1f2828-9a1e-4bbf-8e07-208ba676a806", "ТОРГМАКСИМУМ")
// autoSetAdvertsCPMsAndWriteToJsonMM("4a1f2828-9a1e-4bbf-8e07-208ba676a806", "ТОРГМАКСИМУМ")
// fetchOrdersAndWriteToJsonMM("4a1f2828-9a1e-4bbf-8e07-208ba676a806", "ИП Валерий")
// fetchSalesAndWriteToJsonMM("4a1f2828-9a1e-4bbf-8e07-208ba676a806", "ИП Валерий")
// fetchAutoPriceRulesAndWriteToJSON()
// calcMassAdvertsNewAndWriteToJsonMM("4a1f2828-9a1e-4bbf-8e07-208ba676a806", "ИП Иосифов М.С.")
// fetchAdvertsStatsAndWriteToJsonMM(
//   "4a1f2828-9a1e-4bbf-8e07-208ba676a806",
//   "ИП Валерий",
//   100,
//   2
// );
// calcSmartDetailedByPeriodAndWriteToJSON("mayusha");
const afs = require("fs");
const { tempFUNCTIONFORTEST } = require("../top-stakes/server");
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

// autoSetAdvertsCPMsAndWriteToJsonMM(
//   "4a1f2828-9a1e-4bbf-8e07-208ba676a806",
//   "ИП Валерий"
// );
// console.log(new Date(), readIfExists(path.join(
//   __dirname, 'marketMaster',
//   "4a1f2828-9a1e-4bbf-8e07-208ba676a806",
//   "Текстиль",
//   'advertsWords.json'
// )
// )[15646095].words.keywords)
// calcMassAdvertsNewAndWriteToJsonMM("4a1f2828-9a1e-4bbf-8e07-208ba676a806",
//   "Текстиль")
// fetchArtsPricesAndWriteToJsonMM(
//   "4a1f2828-9a1e-4bbf-8e07-208ba676a806",
//   "ИП Валерий"
// );
// fetchBalanceMM(
//   "4a1f2828-9a1e-4bbf-8e07-208ba676a806",
//   "ИП Валерий"
// );
// fetchAdvertsMM()
// calcSmartDetailedByPeriodAndWriteToJSON('mayusha')
// fetchAdvertsBudgetsAndWriteToJsonMM("4a1f2828-9a1e-4bbf-8e07-208ba676a806", "ИП Артем")
// autoSetMinusPhrasesMM("4a1f2828-9a1e-4bbf-8e07-208ba676a806", "Текстиль")
// fetchAdvertsAndWriteToJsonMM("4a1f2828-9a1e-4bbf-8e07-208ba676a806", "ИП Артем")
// autoSetMinusPhrasesMM("4a1f2828-9a1e-4bbf-8e07-208ba676a806", "ИП Валерий")
// calcPricesMM("4a1f2828-9a1e-4bbf-8e07-208ba676a806", "ИП Галилова", { lbd: '2024-05-31', rbd: '2024-06-06' })
// autoSetFixArtPricesMM("4a1f2828-9a1e-4bbf-8e07-208ba676a806", "ОТК ПРОИЗВОДСТВО");
// autoSetAdvertsCPMsAndWriteToJsonMM("4a1f2828-9a1e-4bbf-8e07-208ba676a806", "ОТК ПРОИЗВОДСТВО");
// dzhemCreate("4a1f2828-9a1e-4bbf-8e07-208ba676a806", "ОТК ПРОИЗВОДСТВО");
// dzhemGet("4a1f2828-9a1e-4bbf-8e07-208ba676a806", "ОТК ПРОИЗВОДСТВО", '6a99dbe9-60de-465c-bf6b-9f6dd1b831ef');
// dzhemCheck("4a1f2828-9a1e-4bbf-8e07-208ba676a806", "ОТК ПРОИЗВОДСТВО");
// calcAnalyticsMM("4a1f2828-9a1e-4bbf-8e07-208ba676a806", "ИП Валерий", { lbd: '2024-06-10', rbd: '2024-06-10' })
// fetchSalesAndWriteToJsonMM("4a1f2828-9a1e-4bbf-8e07-208ba676a806", "ИП Валерий")
// autoSetMinusPhrasesMM("4a1f2828-9a1e-4bbf-8e07-208ba676a806", "ИП Оксана")
// copyZakazToOtherSpreadsheet()
// fetchArtsAndWriteToJsonMM("4a1f2828-9a1e-4bbf-8e07-208ba676a806", "ИП Валерий");
// calcMassAdvertsNewNewAndWriteToJsonMM("4a1f2828-9a1e-4bbf-8e07-208ba676a806", "ИП Иосифова Р. И.", { lbd: '2024-05-01', rbd: '2024-06-06' })
// const dd = new Date();
// tempFUNCTIONFORTEST("4a1f2828-9a1e-4bbf-8e07-208ba676a806", "ИП Иосифова Р. И.");
// tempFUNCTIONFORTEST("4a1f2828-9a1e-4bbf-8e07-208ba676a806", "ИП Валерий");
// parseDzhem("4a1f2828-9a1e-4bbf-8e07-208ba676a806", "ИП Иосифова Р. И.");
// autoSetFixArtPricesMM("4a1f2828-9a1e-4bbf-8e07-208ba676a806", "ИП Иосифов А. М.");
// console.log((new Date() - dd) / 1000);
// const reqs = readIfExists(
//   path.join(
//     __dirname,
//     "marketMaster",
//     "4a1f2828-9a1e-4bbf-8e07-208ba676a806",
//     "requests_2024-06-10.json"
//   )
// );
// console.log(new Date(), reqs);
// const nws = {};
// for (let i = 0; i < reqs.length; i++) {
//   const obj = reqs[i];
//   const key = obj['футболка женская']
//   const val = obj['4893900']
//   nws[key] = parseInt(val);
// }
// nws['футболка женская'] = 4893900
// console.log(new Date(), nws);
// afs.writeFileSync(
//   path.join(
//     __dirname,
//     "marketMaster",
//     "4a1f2828-9a1e-4bbf-8e07-208ba676a806",
//     "requests_2024-06-10.json"
//   ),
//   JSON.stringify(nws)
// );

// const requests_cur = readIfExists(
//   path.join(
//     __dirname,
//     "marketMaster",
//     "4a1f2828-9a1e-4bbf-8e07-208ba676a806",
//     "requests_2024-06-10.json"
//   )
// );
// const requests_old = readIfExists(
//   path.join(
//     __dirname,
//     "marketMaster",
//     "4a1f2828-9a1e-4bbf-8e07-208ba676a806",
//     "requests_2024-06-03.json"
//   )
// );
// const jsonData = {}
// for (const [key, val] of Object.entries(requests_cur)) {
//   const oldVal = requests_old[key] ?? 0;
//   jsonData[key] = { val: val, trend: val - oldVal }
// }


// afs.writeFileSync(
//   path.join(
//     __dirname,
//     "marketMaster",
//     "4a1f2828-9a1e-4bbf-8e07-208ba676a806",
//     "requests.json"
//   ),
//   JSON.stringify(jsonData)
// );

// autoSetAdvertsCPMsAndWriteToJsonMM(
//   "4a1f2828-9a1e-4bbf-8e07-208ba676a806",
//   "ТОРГМАКСИМУМ"
// );

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
//   "ИП Иосифова Р. И."
// );
// fetchSalesAndWriteToJsonMM(
//   "4a1f2828-9a1e-4bbf-8e07-208ba676a806",
//   "ИП Иосифов А. М."
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
// fetchAdvertsInfosAndWriteToJsonMM("4a1f2828-9a1e-4bbf-8e07-208ba676a806",
//   "ИП Валерий")
// calcAvgOrdersAndWriteToJSON('mayusha');
// fetchAdvertsWordsAndWriteToJsonMM(
//   "4a1f2828-9a1e-4bbf-8e07-208ba676a806",
//   "ИП Иосифов А. М."
// );

// fetchAdvertsMM();

// autoSetAdvertsCPMsAndWriteToJsonMM(
// "4a1f2828-9a1e-4bbf-8e07-208ba676a806",
// "ИП Валерий"
// );
// autoManageAdvertsSchedule("4a1f2828-9a1e-4bbf-8e07-208ba676a806",
//   "ИП Валерий")

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
//   "ТОРГМАКСИМУМ"
// );
// const aut = getAuthTokenMM(
//   "4a1f2828-9a1e-4bbf-8e07-208ba676a806",
//   "ИП Иосифова Р. И."
// );
// const arts = readIfExists(path.join(
//   __dirname,
//   "marketMaster",
//   "4a1f2828-9a1e-4bbf-8e07-208ba676a806",
//   "ИП Иосифова Р. И.",
//   "arts.json"
// ))
// for (const [art, artData] of Object.entries(arts.byArt)) {
//   if (artData.brand != 'MIO STUDIO') continue;
//   else {
//     console.log(artData);
//   }
// }
// getNmDetailReport(aut, {
//   objectIDs: [180],
//   brandNames: ['MIO STUDIO'], period: { begin: '2024-05-01 00:00:00', end: '2024-05-08 11:00:00' },
//   page: 1
// }).then(pr => afs.writeFileSync(path.join(
//   __dirname,
//   "marketMaster",
//   "4a1f2828-9a1e-4bbf-8e07-208ba676a806",
//   "ИП Иосифова Р. И.",
//   "jeans.json"
// ), JSON.stringify(pr.data.cards)))

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
// calcPricesJsonDataMM("4a1f2828-9a1e-4bbf-8e07-208ba676a806", "ИП Валерий")
// autoSetAdvertsCPMsAndWriteToJsonMM("4a1f2828-9a1e-4bbf-8e07-208ba676a806", "ИП Валерий")
// autoSetMinusPhrasesMM("4a1f2828-9a1e-4bbf-8e07-208ba676a806", "ОТК ПРОИЗВОДСТВО")
// writeSpp

// calcPlansTemplateAndWriteToXlsxMM("4a1f2828-9a1e-4bbf-8e07-208ba676a806", "ИП Валерий", { entities: ['#ПРПЭ_140', '#ПРПЭ_160', '#ПРПЭ_180'] })

// parseDzhem("4a1f2828-9a1e-4bbf-8e07-208ba676a806", "ИП Иосифов М.С.")
// parseDzhem("4a1f2828-9a1e-4bbf-8e07-208ba676a806", "ИП Иосифов А. М.")
// parseDzhem("4a1f2828-9a1e-4bbf-8e07-208ba676a806", "ИП Иосифова Р. И.")
// parseDzhem("4a1f2828-9a1e-4bbf-8e07-208ba676a806", "ОТК ПРОИЗВОДСТВО")

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

// changeUploadedArtsDataForKeyMM("4a1f2828-9a1e-4bbf-8e07-208ba676a806", "ИП Валерий", {
//   "enteredValue": {
//     "key": "expences",
//     "val": "2.1",
//     "type": "number"
//   },
//   "barcodes": [
//     "2038524617259"
//   ]
// })

// getAllTags("4a1f2828-9a1e-4bbf-8e07-208ba676a806", "ИП Валерий")
parsePlansXlsx("4a1f2828-9a1e-4bbf-8e07-208ba676a806", "ИП Валерий")
