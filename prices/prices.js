const path = require('path')
const { fetchDataAndWriteToXlsx, fetchCardsAndWriteToJSON, fetchOrdersAndWriteToJSON, fetchStocksAndWriteToJSON } = require('./main');
const { writePrices, fetchMultiplicityAndWriteToJSON } = require('./google_sheets/index')

const getPrices = async () => {
  const campaigns = require(path.join(__dirname, 'files/campaigns')).campaigns
  await fetchMultiplicityAndWriteToJSON()
  campaigns.forEach(async campaign => {
    Promise.all([
      await fetchCardsAndWriteToJSON(campaign),
      await fetchOrdersAndWriteToJSON(campaign),
      await fetchStocksAndWriteToJSON(campaign),
      await fetchDataAndWriteToXlsx(campaign),
    ]).then(async () => {
      console.log('All tasks completed successfully');
      await writePrices(campaign);
    }).catch((error) => {
      console.error('An error occurred:', error);
    });
  });
}

module.exports = {
  getPrices,
};