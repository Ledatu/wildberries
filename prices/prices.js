const { fetchDataAndWriteToXlsx, fetchCardsAndWriteToJSON, fetchOrdersAndWriteToJSON, fetchStocksAndWriteToJSON } = require('./main');
const writePrices = require('./google_sheets/index')

const getPrices = async () => {
  Promise.all([
    await fetchCardsAndWriteToJSON(),
    await fetchOrdersAndWriteToJSON(),
    await fetchStocksAndWriteToJSON(),
    await fetchDataAndWriteToXlsx(),
  ]).then(async () => {
    console.log('All tasks completed successfully');
    await writePrices();
  }).catch((error) => {
    console.error('An error occurred:', error);
  });
}

module.exports = {
  getPrices,
};