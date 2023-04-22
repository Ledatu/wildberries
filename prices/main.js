const xlsx = require('node-xlsx');
const axios = require('axios');
const fs = require('fs').promises;
const path = require('path');

const sortData = (data) => {
  const header = data.shift(); // Remove the header row and store it in a variable
  data.sort((a, b) => {
    if (a[0] < b[0]) return -1;
    if (a[0] > b[0]) return 1;
    return 0;
  });
  data.unshift(header); // Add the header row back to the beginning of the array
  return data;
};

const getAuthToken = (type) => {
  try {
    const secret = require('../secrets/wildberries/secret.json');
    return secret[type];
  } catch (error) {
    console.error(error);
  }
};

const getInfo = (authToken) => {
  return axios.get('https://suppliers-api.wildberries.ru/public/api/v1/info', {
    headers: {
      Authorization: authToken,
    },
  }).then(response => response.data)
    .catch(error => console.error(error));
};

const getCards = (authToken, params) => {
  return axios.post('https://suppliers-api.wildberries.ru/content/v1/cards/cursor/list', params, {
    headers: {
      Authorization: authToken,
    },
  }).then(response => response.data)
    .catch(error => console.error(error));
};

const getStocks = (authToken, params) => {
  return axios.get('https://statistics-api.wildberries.ru/api/v1/supplier/stocks', {
    headers: {
      Authorization: authToken,
    },
    params: params,
  }).then(response => response.data)
    .catch(error => console.error(error));
};

const getOrders = (authToken, params) => {
  return axios.get('https://statistics-api.wildberries.ru/api/v1/supplier/orders', {
    headers: {
      Authorization: authToken,
    },
    params: params,
  }).then(response => response.data)
    .catch(error => console.error(error));
};

const buildXlsx = (data) => {
  const vendorCodes = require(path.join(__dirname, 'vendorCodes'))
  const orders = require(path.join(__dirname, 'orders'))
  const stocks = require(path.join(__dirname, 'stocks'))
  let new_data = [['Артикул продавца', 'Текущая розн. цена (до скидки)', 'Текущая скидка на сайте, %', 'Цена со скидкой', 'Оборачиваемость']]
  data.forEach(el => {
    const vendorCode = vendorCodes[el.nmId];
    if (!vendorCode) return;
    const obor = stocks[el.nmId]/(orders[el.nmId]/7)
    new_data.push([String(vendorCode), el.price, el.discount, Math.floor(el.price * (1 - el.discount / 100)), obor]);
  });
  new_data = sortData(new_data); // Sort the data
  return xlsx.build([{ name: 'Общий отчёт', data: new_data }]);
};

const writeDataToXlsx = (data) => {
  const buffer = buildXlsx(data);
  return fs.writeFile(path.join(__dirname, 'data.xlsx'), buffer)
    .then(() => console.log('data.xlsx created.'))
    .catch(error => console.error(error));
};

const writeVendorCodeToJson = (data) => {
  const jsonData = {};
  data.forEach((item) => {
    jsonData[item.nmID] = item.vendorCode;
  });
  return fs.writeFile(path.join(__dirname, 'vendorCodes.json'), JSON.stringify(jsonData))
    .then(() => console.log('vendorCodes.json created.'))
    .catch(error => console.error(error));
};

const writeStocksToJson = (data) => {
  const jsonData = {};
  data.forEach((item) => {
    if (item.nmId in jsonData) 
      jsonData[item.nmId] += item.quantity;
    else
      jsonData[item.nmId] = item.quantity;
  });
  return fs.writeFile(path.join(__dirname, 'stocks.json'), JSON.stringify(jsonData))
    .then(() => console.log('stocks.json created.'))
    .catch(error => console.error(error));
};

const writeOrdersToJson = (data) => {
  const today = new Date().getDate()
  const jsonData = {};
  data.forEach((item) => {
    if (item.isCancel || item.date.includes(`-${today}`)) return
    if (item.nmId in jsonData) 
      jsonData[item.nmId] += 1;
    else
      jsonData[item.nmId] = 1;
  });
  return fs.writeFile(path.join(__dirname, 'orders.json'), JSON.stringify(jsonData))
    .then(() => console.log('orders.json created.'))
    .catch(error => console.error(error));
};

const fetchDataAndWriteToXlsx = () => {
  const authToken = getAuthToken('api-token');
  return getInfo(authToken)
    .then(data => {
      return writeDataToXlsx(data);
    })
    .catch(error => console.error(error));
};

const fetchCardsAndWriteToJSON = () => {
  const authToken = getAuthToken('api-token');
  const params = {
    sort: {
      cursor: {
        limit: 1000,
      },
      filter: {
        withPhoto: -1,
      },
    },
  };
  return getCards(authToken, params)
    .then(cards => writeVendorCodeToJson(cards.data.cards))
    .catch(error => console.error(error));
};

const fetchStocksAndWriteToJSON = () => {
  const authToken = getAuthToken('api-statistic-token');
  const dateFrom = new Date()
  dateFrom.setDate(dateFrom.getDate() - 1)
  const params = {
    dateFrom: dateFrom
  };
  return getStocks(authToken, params)
    .then(data => writeStocksToJson(data))
    .catch(error => console.error(error));
};

const fetchOrdersAndWriteToJSON = () => {
  const authToken = getAuthToken('api-statistic-token');
  const dateFrom = new Date()
  dateFrom.setDate(dateFrom.getDate() - 8)
  const params = {
    dateFrom: dateFrom
  };
  return getOrders(authToken, params)
    .then(data => writeOrdersToJson(data))
    .catch(error => console.error(error));
};

module.exports = {
  fetchDataAndWriteToXlsx,
  fetchCardsAndWriteToJSON,
  fetchStocksAndWriteToJSON,
  fetchOrdersAndWriteToJSON,
};
