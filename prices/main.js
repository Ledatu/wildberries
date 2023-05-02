const xlsx = require("node-xlsx");
const axios = require("axios");
const fs = require("fs").promises;
const path = require("path");

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
    const secret = require(path.join(
      __dirname,
      `../secrets/wildberries/${campaign}.json`
    ));
    return secret[type];
  } catch (error) {
    console.error(error);
  }
};

const getDetailedByPeriod = (authToken, params) => {
  return axios
    .get(
      "https://statistics-api.wildberries.ru/api/v1/supplier/reportDetailByPeriod",
      {
        headers: {
          Authorization: authToken,
        },
        params: params,
      }
    )
    .then((response) => response.data)
    .catch((error) => console.error(error));
};

const getInfo = (authToken) => {
  return axios
    .get("https://suppliers-api.wildberries.ru/public/api/v1/info", {
      headers: {
        Authorization: authToken,
      },
    })
    .then((response) => response.data)
    .catch((error) => console.error(error));
};

const getCards = (authToken, params) => {
  return axios
    .post(
      "https://suppliers-api.wildberries.ru/content/v1/cards/cursor/list",
      params,
      {
        headers: {
          Authorization: authToken,
        },
      }
    )
    .then((response) => response.data)
    .catch((error) => console.error(error));
};

const getStocks = (authToken, params) => {
  return axios
    .get("https://statistics-api.wildberries.ru/api/v1/supplier/stocks", {
      headers: {
        Authorization: authToken,
      },
      params: params,
    })
    .then((response) => response.data)
    .catch((error) => console.error(error));
};

const getOrders = (authToken, params) => {
  return axios
    .get("https://statistics-api.wildberries.ru/api/v1/supplier/orders", {
      headers: {
        Authorization: authToken,
      },
      params: params,
    })
    .then((response) => response.data)
    .catch((error) => console.error(error));
};

const buildXlsx = (data, campaign) => {
  const afs = require("fs");
  const vendorCodes = JSON.parse(
    afs.readFileSync(
      path.join(__dirname, "files", campaign, "vendorCodes.json")
    )
  );
  const orders = JSON.parse(
    afs.readFileSync(path.join(__dirname, "files", campaign, "orders.json"))
  );
  const stocks = JSON.parse(
    afs.readFileSync(path.join(__dirname, "files", campaign, "stocks.json"))
  );
  const multiplicity = JSON.parse(
    afs.readFileSync(path.join(__dirname, "files/multiplicity.json"))
  );
  let new_data = [
    [
      "Артикул продавца",
      "Текущая розн. цена (до скидки)",
      "Текущая скидка на сайте, %",
      "Цена со скидкой",
      "Оборачиваемость",
      "ЗАКАЗАТЬ",
      "остаток",
      "заказов/7",
      "заказов/1",
    ],
  ];
  data.forEach((el) => {
    let vendorCode = vendorCodes[el.nmId];
    if (!vendorCode) return;
    vendorCode = String(vendorCode);
    const per_day = orders[el.nmId] / 7;
    const stock = stocks[el.nmId];
    const obor = stock / per_day;
    const mult = multiplicity[vendorCode];
    const zakaz = Math.floor((per_day * 30 - stock) / mult) * mult;
    new_data.push([
      vendorCode,
      el.price,
      el.discount,
      el.price * (1 - el.discount / 100), // розничная стоимость
      obor,
      zakaz > 0 ? zakaz : !orders[el.nmId] ? mult * 5 : 0,
      stock,
      orders[el.nmId],
      per_day,
    ]);
  });
  new_data = sortData(new_data); // Sort the data
  return xlsx.build([{ name: "Общий отчёт", data: new_data }]);
};

const writeDataToXlsx = (data, campaign) => {
  const buffer = buildXlsx(data, campaign);
  return fs
    .writeFile(path.join(__dirname, "files", campaign, "data.xlsx"), buffer)
    .then(() => console.log("data.xlsx created."))
    .catch((error) => console.error(error));
};

const writeVendorCodeToJson = (data, campaign) => {
  const jsonData = {};
  data.forEach((item) => {
    jsonData[item.nmID] = item.vendorCode;
  });
  return fs
    .writeFile(
      path.join(__dirname, "files", campaign, "vendorCodes.json"),
      JSON.stringify(jsonData)
    )
    .then(() => console.log("vendorCodes.json created."))
    .catch((error) => console.error(error));
};

const writeStocksToJson = (data, campaign) => {
  const jsonData = {};
  data.forEach((item) => {
    if (item.nmId in jsonData) jsonData[item.nmId] += item.quantity;
    else jsonData[item.nmId] = item.quantity;
  });
  return fs
    .writeFile(
      path.join(__dirname, "files", campaign, "stocks.json"),
      JSON.stringify(jsonData)
    )
    .then(() => console.log("stocks.json created."))
    .catch((error) => console.error(error));
};

const writeOrdersToJson = (data, campaign) => {
  const today = new Date().getDate();
  const dateFrom = new Date();
  dateFrom.setDate(dateFrom.getDate() - 8);
  dateFrom.setHours(0);
  dateFrom.setMinutes(0);
  const jsonData = {};
  const excluded = { excluded: [] };
  data.forEach((item) => {
    const order_date = new Date(item.date);
    if (order_date < dateFrom) {
      excluded.excluded.push({ order_date: order_date, nmId: item.nmId });
      return;
    }
    if (item.isCancel || order_date.getDate() == today) return;
    if (item.nmId in jsonData) jsonData[item.nmId] += 1;
    else jsonData[item.nmId] = 1;
  });
  fs.writeFile(
    path.join(__dirname, "files", campaign, "excluded.json"),
    JSON.stringify(excluded)
  ).then(() => console.log("excluded.xlsx created."));
  return fs
    .writeFile(
      path.join(__dirname, "files", campaign, "orders.json"),
      JSON.stringify(jsonData)
    )
    .then(() => console.log("orders.json created."))
    .catch((error) => console.error(error));
};

const writeDetailedByPeriodToJson = (data, campaign) => {
  const jsonData = {};
  data.forEach((item) => {
    const type = item.sa_name.split("_")[0];
    if (type in jsonData) {
      jsonData[type].buyout += item.quantity;
      jsonData[type].delivery += item.delivery_rub;
    } else jsonData[type] = { buyout: 0, delivery: item.delivery_rub };
  });
  for (const key in jsonData) {
    jsonData[key]["average_delivery"] =
      jsonData[key].delivery / jsonData[key].buyout;
  }
  return fs
    .writeFile(
      path.join(__dirname, "files", campaign, "detailedByPeriod.json"),
      JSON.stringify(jsonData)
    )
    .then(() => console.log("detailedByPeriod.json created."))
    .catch((error) => console.error(error));
};

const fetchDetailedByPeriodAndWriteToJSON = (campaign) => {
  const authToken = getAuthToken("api-statistic-token", campaign);
  const prevMonday = new Date();
  prevMonday.setDate(
    prevMonday.getDate() - 7 - ((prevMonday.getDay() + 6) % 7)
  );
  const prevSunday = new Date();
  prevSunday.setDate(
    prevSunday.getDate() - 7 - ((prevSunday.getDay() - 7) % 7)
  );
  const params = {
    dateFrom: prevMonday.toISOString().split("T")[0],
    dateTo: prevSunday.toISOString().split("T")[0],
  };
  console.log(params);
  // return 0;
  return getDetailedByPeriod(authToken, params)
    .then((data) => {
      fs.writeFile(
        path.join(__dirname, "files", campaign, "detailedByPeriod_full.json"),
        JSON.stringify(data)
      );
      return writeDetailedByPeriodToJson(data, campaign);
    })
    .catch((error) => console.error(error));
};

const fetchDataAndWriteToXlsx = (campaign) => {
  const authToken = getAuthToken("api-token", campaign);
  return getInfo(authToken)
    .then((data) => {
      return writeDataToXlsx(data, campaign);
    })
    .catch((error) => console.error(error));
};

const fetchCardsAndWriteToJSON = (campaign) => {
  const authToken = getAuthToken("api-token", campaign);
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
    .then((cards) => writeVendorCodeToJson(cards.data.cards, campaign))
    .catch((error) => console.error(error));
};

const fetchStocksAndWriteToJSON = (campaign) => {
  const authToken = getAuthToken("api-statistic-token", campaign);
  const dateFrom = new Date();
  dateFrom.setDate(dateFrom.getDate() - 1);
  const date = dateFrom.toISOString().slice(0, 10);
  // console.log(date);
  const params = {
    dateFrom: date,
  };
  return getStocks(authToken, params)
    .then((data) => writeStocksToJson(data, campaign))
    .catch((error) => console.error(error));
};

const fetchOrdersAndWriteToJSON = (campaign) => {
  const authToken = getAuthToken("api-statistic-token", campaign);
  const dateFrom = new Date();
  dateFrom.setDate(dateFrom.getDate() - 8);
  const date = dateFrom.toISOString().slice(0, 10);
  console.log(date);
  const params = {
    dateFrom: date,
  };
  return getOrders(authToken, params)
    .then((data) => {
      writeOrdersToJson(data, campaign);
      fs.writeFile(
        path.join(__dirname, "files", campaign, "orders_full.json"),
        JSON.stringify(data)
      );
    })
    .catch((error) => console.error(error));
};

module.exports = {
  fetchDataAndWriteToXlsx,
  fetchCardsAndWriteToJSON,
  fetchStocksAndWriteToJSON,
  fetchOrdersAndWriteToJSON,
  fetchDetailedByPeriodAndWriteToJSON,
};
