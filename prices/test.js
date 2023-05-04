const {
  copyZakazToOtherSpreadsheet,
  fetchDataAndWriteToJSON,
  copyPricesToDataSpreadsheet,
} = require("./google_sheets");
const { fetchDetailedByPeriodAndWriteToJSON } = require("./main");
const { getPrices, getDelivery, calcNewValues } = require("./prices");
// copyZakazToOtherSpreadsheet()
// fetchDetailedByPeriodAndWriteToJSON('mayusha')
// getDelivery()
// fetchDataAndWriteToJSON()
// getPrices();
calcNewValues()
// copyPricesToDataSpreadsheet()