const { fetchNewRKsToCreate } = require("../prices/google_sheets");
const { fetchAdsIdsAndWriteToJSON } = require("./google_sheets");
const { fetchAnalytics, fetchSpp } = require("./main");
const { parseXlsx } = require("./mp_manager/excelParser");
const { analyticsOneTimeRun } = require("./oneTimeRun");

// analyticsOneTimeRun();
// fetchAdsIdsAndWriteToJSON('mayusha')
// fetchAdsIdsAndWriteToJSON('delicatus')
// fetchAdsIdsAndWriteToJSON('tks')
// fetchAnalytics()
fetchSpp()
// /parseXlsx()
