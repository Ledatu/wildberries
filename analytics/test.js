const { fetchAdsIdsAndWriteToJSON } = require("./google_sheets");
const { fetchAnalytics } = require("./main");
const { parseXlsx } = require("./mp_manager/excelParser");
const { analyticsOneTimeRun } = require("./oneTimeRun");

// analyticsOneTimeRun();
// fetchAdsIdsAndWriteToJSON('mayusha')
fetchAnalytics()
