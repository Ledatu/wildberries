const {
  copyZakazToOtherSpreadsheet,
  fetchDataAndWriteToJSON,
  copyPricesToDataSpreadsheet,
  fetchNewPricesAndWriteToJSON,
  updateAnalyticsOrders,
  sendEmail,
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
} = require("./main");
const {
  getPrices,
  getDelivery,
  calcNewValues,
  updateAnalytics,
  updateAdvertActivity,
} = require("./prices");
// copyZakazToOtherSpreadsheet()
// fetchDetailedByPeriodAndWriteToJSON('mayusha')
// getDelivery().then((pr) => console.log(pr));
// fetchDataAndWriteToJSON()
// getPrices();
// updateAnalyticsOrders("mayusha");
// sendRKErrors('projecttriggers@gmail.com', 'Ошибки РК', 'Тест');
// updateAdvertArtActivitiesAndGenerateNotIncluded('mayusha')
updateAdvertActivity()

// updateAnalyticsOrders("TKS");
// updateAnalyticsOrders("delicatus");
// fetchAdvertsAndWriteToJson('TKS')
// calcNewValues()
// copyPricesToDataSpreadsheet()
// fetchNewPricesAndWriteToJSON("mayusha").then((pr) => {
//   console.log("Prices fetched.");
//   updatePrices("mayusha");
// });
// fetchOrdersAndWriteToJSON("mayusha");
// fetchStocksAndWriteToJSON("mayusha")
// calcAvgOrdersAndWriteToJSON("mayusha")
// updateAnalytics()
// fetchAdvertInfosAndWriteToJson("mayusha");
