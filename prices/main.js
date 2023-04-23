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

const getAuthToken = (type, campaign) => {
  try {
    const secret = require(`../secrets/wildberries/${campaign}.json`);
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

const buildXlsx = (data, campaign) => {
  const vendorCodes = require(path.join(__dirname, 'files', campaign, 'vendorCodes'))
  const orders = require(path.join(__dirname, 'files', campaign, 'orders'))
  const stocks = require(path.join(__dirname, 'files', campaign, 'stocks'))
  const multiplicity = require(path.join(__dirname, 'files/multiplicity'))
  let new_data = [['Артикул продавца', 'Текущая розн. цена (до скидки)', 'Текущая скидка на сайте, %', 'Цена со скидкой', 'Оборачиваемость', 'ЗАКАЗАТЬ']]
  data.forEach(el => {
    let vendorCode = vendorCodes[el.nmId];
    if (!vendorCode) return;
    vendorCode = String(vendorCode)
    const per_day = orders[el.nmId]/7
    const stock = stocks[el.nmId]
    const obor = stock/per_day
    const mult = multiplicity[vendorCode]
    const zakaz = Math.floor((per_day*30-stock)/mult)*mult
    new_data.push([
      vendorCode, 
      el.price, 
      el.discount, 
      Math.floor(el.price * (1 - el.discount / 100)), 
      obor,
      zakaz > 0 ? zakaz : 0
    ]);
  });
  new_data = sortData(new_data); // Sort the data
  return xlsx.build([{ name: 'Общий отчёт', data: new_data }]);
};

const writeDataToXlsx = (data, campaign) => {
  const buffer = buildXlsx(data, campaign);
  return fs.writeFile(path.join(__dirname, 'files', campaign, 'data.xlsx'), buffer)
    .then(() => console.log('data.xlsx created.'))
    .catch(error => console.error(error));
};

const writeVendorCodeToJson = (data, campaign) => {
  const jsonData = {};
  data.forEach((item) => {
    jsonData[item.nmID] = item.vendorCode;
  });
  return fs.writeFile(path.join(__dirname, 'files', campaign, 'vendorCodes.json'), JSON.stringify(jsonData))
    .then(() => console.log('vendorCodes.json created.'))
    .catch(error => console.error(error));
};

const writeStocksToJson = (data, campaign) => {
  const jsonData = {};
  data.forEach((item) => {
    if (item.nmId in jsonData) 
      jsonData[item.nmId] += item.quantity;
    else
      jsonData[item.nmId] = item.quantity;
  });
  return fs.writeFile(path.join(__dirname, 'files', campaign, 'stocks.json'), JSON.stringify(jsonData))
    .then(() => console.log('stocks.json created.'))
    .catch(error => console.error(error));
};

const writeOrdersToJson = (data, campaign) => {
  const today = new Date().getDate()
  const jsonData = {};
  data.forEach((item) => {
    if (item.isCancel || item.date.includes(`-${today}`)) return
    if (item.nmId in jsonData) 
      jsonData[item.nmId] += 1;
    else
      jsonData[item.nmId] = 1;
  });
  return fs.writeFile(path.join(__dirname, 'files', campaign, 'orders.json'), JSON.stringify(jsonData))
    .then(() => console.log('orders.json created.'))
    .catch(error => console.error(error));
};

const fetchDataAndWriteToXlsx = (campaign) => {
  const authToken = getAuthToken('api-token', campaign);
  return getInfo(authToken)
    .then(data => {
      return writeDataToXlsx(data, campaign);
    })
    .catch(error => console.error(error));
};

const fetchCardsAndWriteToJSON = (campaign) => {
  const authToken = getAuthToken('api-token', campaign);
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
    .then(cards => writeVendorCodeToJson(cards.data.cards, campaign))
    .catch(error => console.error(error));
};

const fetchStocksAndWriteToJSON = (campaign) => {
  const authToken = getAuthToken('api-statistic-token', campaign);
  const dateFrom = new Date()
  dateFrom.setDate(dateFrom.getDate() - 1)
  const params = {
    dateFrom: dateFrom
  };
  return getStocks(authToken, params)
    .then(data => writeStocksToJson(data, campaign))
    .catch(error => console.error(error));
};

const fetchOrdersAndWriteToJSON = (campaign) => {
  const authToken = getAuthToken('api-statistic-token', campaign);
  const dateFrom = new Date()
  dateFrom.setDate(dateFrom.getDate() - 8)
  const params = {
    dateFrom: dateFrom
  };
  return getOrders(authToken, params)
    .then(data => writeOrdersToJson(data, campaign))
    .catch(error => console.error(error));
};

module.exports = {
  fetchDataAndWriteToXlsx,
  fetchCardsAndWriteToJSON,
  fetchStocksAndWriteToJSON,
  fetchOrdersAndWriteToJSON,
};
