const { copyZakazToOtherSpreadsheet } = require('./google_sheets')
const { fetchDetailedByPeriodAndWriteToJSON } = require('./main')
const { getPrices, getDelivery } = require('./prices')
// getPrices()
// copyZakazToOtherSpreadsheet()
// fetchDetailedByPeriodAndWriteToJSON('mayusha')
getDelivery()