const xlsx = require('node-xlsx');
const axios = require('axios');
const fs = require('fs').promises;

const getAuthToken = () => {
  try {
    const secret = require('../secrets/wildberries/secret.json');
    return secret.token;
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

const buildXlsx = (data, jsonData) => {
  let new_data = [['Артикул продавца', 'Текущая розн. цена (до скидки)', 'Текущая скидка на сайте, %', 'Цена со скидкой']]
  data.forEach(el => {
    const vendorCode = jsonData[el.nmId];
    if (!vendorCode) return;
    new_data.push([String(vendorCode), el.price, el.discount, el.price * (1 - el.discount / 100)]);
  });
  return xlsx.build([{ name: 'Общий отчёт', data: new_data }]);
};

const writeDataToXlsx = (data, jsonData) => {
  const buffer = buildXlsx(data, jsonData);
  return fs.writeFile('data.xlsx', buffer)
    .then(() => console.log('data.xlsx created.'))
    .catch(error => console.error(error));
};

const writeDataToJson = (data) => {
  const jsonData = {};
  data.forEach((item) => {
    jsonData[item.nmID] = item.vendorCode;
  });
  return fs.writeFile('vendorCodes.json', JSON.stringify(jsonData))
    .then(() => console.log('vendorCodes.json created.'))
    .catch(error => console.error(error));
};

const fetchDataAndWriteToXlsx = () => {
  const authToken = getAuthToken();
  return getInfo(authToken)
    .then(data => {
      const vendorCodes = require('./vendorCodes');
      return writeDataToXlsx(data, vendorCodes);
    })
    .catch(error => console.error(error));
};

const fetchCardsAndWriteToJSON = () => {
  const authToken = getAuthToken();
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
    .then(cards => writeDataToJson(cards.data.cards))
    .catch(error => console.error(error));
};

module.exports = {
  fetchDataAndWriteToXlsx,
  fetchCardsAndWriteToJSON,
};
