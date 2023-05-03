const path = require('path')
const { fetchDataAndWriteToXlsx, fetchCardsAndWriteToJSON, fetchOrdersAndWriteToJSON, fetchStocksAndWriteToJSON, fetchDetailedByPeriodAndWriteToJSON } = require('./main');
const { writePrices, writeDetailedByPeriod, fetchDataAndWriteToJSON } = require('./google_sheets/index')

const getPrices = async () => {
  const campaigns = require(path.join(__dirname, 'files/campaigns')).campaigns
  await fetchDataAndWriteToJSON()
  campaigns.forEach(async campaign => {
    Promise.all([
      await fetchCardsAndWriteToJSON(campaign),
      await fetchOrdersAndWriteToJSON(campaign),
      await fetchStocksAndWriteToJSON(campaign),
      await fetchDataAndWriteToXlsx(campaign)	,
    ]).then(async () => {
      console.log('All tasks completed successfully');
      await writePrices(campaign);
    }).catch((error) => {
      console.error('An error occurred:', error);
    });
  });
}

const getDelivery = async () => {
  const campaigns = require(path.join(__dirname, 'files/campaigns')).campaigns
  campaigns.forEach(async campaign => {
    Promise.all([
      await fetchDetailedByPeriodAndWriteToJSON(campaign),
    ]).then(async () => {
      console.log('All tasks completed successfully');
      await writeDetailedByPeriod(campaign);
    }).catch((error) => {
      console.error('An error occurred:', error);
    });
  });
}

module.exports = {
  getPrices,
  getDelivery,
};
