const xlsx = require("node-xlsx");
const axios = require("axios");
const fs = require("fs").promises;
const afs = require("fs");
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
  const arts_data = JSON.parse(
    afs.readFileSync(path.join(__dirname, "files/data.json"))
  );
  const ads = JSON.parse(
    afs.readFileSync(path.join(__dirname, "files", campaign, "ads.json"))
  );
  let new_data = [
    [
      "Артикул продавца",
      "ЗАКАЗАТЬ",
      "Текущая розн. цена (до скидки)",
      "Текущая скидка на сайте, %",
      "Цена со скидкой",
      "Цена СПП",
      "Профит",
      "остаток",
      "заказов/7",
      "заказов/1",
      "Оборачиваемость",
      "ROI",
      "Новый ROI",
      "Новая РЦ",
      "Новая РЦ с СПП",
      "Новая WB цена",
      "",
      "Себестоимость",
      "Коммисия",
      "Логистика",
      "Налоги",
      "Расходы",
      "Реклама",
      "%ДРР",
    ],
  ];
  data.forEach((el) => {
    let vendorCode = vendorCodes[el.nmId];
    if (!vendorCode || !arts_data[vendorCode]) return;
    vendorCode = String(vendorCode);
    const per_day = orders[el.nmId] / 7;
    const stock = stocks[el.nmId];
    const obor = stock / per_day;
    const mult = arts_data[vendorCode].multiplicity;
    const zakaz = Math.round((per_day * 30 - stock) / mult) * mult;
    const roz_price = Math.round(el.price * (1 - el.discount / 100));

    const spp_price = Math.floor(
      roz_price * (1 - arts_data[vendorCode].spp / 100)
    );
    const commission = roz_price * (arts_data[vendorCode].commission / 100);
    const delivery = arts_data[vendorCode].delivery;
    const tax = spp_price * (arts_data[vendorCode].tax / 100);
    const expences =
      campaign == "TKS" ? spp_price * 0.11 : arts_data[vendorCode].expences;
    const prime_cost = arts_data[vendorCode].prime_cost;

    // ads
    const find_ad = () => {
      for (const code in ads) {
        if (vendorCode.match(code.replace("+", "\\+"))) return ads[code].ads;
      }
      return 0;
    };
    const ad = find_ad();
    const drr = ad / spp_price;

    const profit =
      -ad - commission - delivery - tax - expences - prime_cost + roz_price;
    const roi = profit / (prime_cost + expences);

    new_data.push([
      vendorCode,
      zakaz > 0 ? zakaz : !orders[el.nmId] ? mult * 5 : 0,
      el.price,
      el.discount,
      roz_price, // розничная стоимость
      spp_price,
      profit,
      stock,
      orders[el.nmId],
      per_day,
      obor,
      roi,
      "",
      "",
      "",
      "",
      "",
      prime_cost,
      commission,
      delivery,
      tax,
      expences,
      ad,
      drr,
    ]);
  });
  // console.log(new_data);
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

const writeDetailedByPeriodToJson = (data, campaign) =>
  new Promise((resolve, reject) => {
    const jsonData = {};
    if (data) {
      jsonData["date"] = data[0].create_dt.slice(0, 10);
      data.forEach((item) => {
        const type = item.sa_name.split("_")[0];
        if (type in jsonData) {
          jsonData[type].buyout += item.quantity;
          jsonData[type].delivery += item.delivery_rub;
        } else jsonData[type] = { buyout: 0, delivery: item.delivery_rub };
      });
      for (const key in jsonData) {
        jsonData[key].delivery = Math.round(jsonData[key].delivery);
        jsonData[key]["average_delivery"] =
          jsonData[key].delivery / jsonData[key].buyout;
      }
    }
    // console.log(campaign, jsonData.date)
    return jsonData.date
      ? fs
          .writeFile(
            path.join(__dirname, "files", campaign, "detailedByPeriod.json"),
            JSON.stringify(jsonData ?? {})
          )
          .then(() => {
            console.log("detailedByPeriod.json created.");
            resolve(jsonData);
          })
          .catch((error) => {
            console.error(error);
            reject(error);
          })
      : resolve(undefined);
  });

const fetchDetailedByPeriodAndWriteToJSON = (campaign) =>
  new Promise(async (resolve, reject) => {
    const filePath = path.join(
      __dirname,
      `files/${campaign}/detailedByPeriod.json`
    );

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
        console.log(campaign, data ? true : false);
        fs.writeFile(
          path.join(__dirname, "files", campaign, "detailedByPeriod_full.json"),
          JSON.stringify(data ?? {})
        );
        return writeDetailedByPeriodToJson(data, campaign).then((pr) => {
          // const shallowEqual = (object1, object2) => {
          //   // console.log(object1, object2)
          //   const keys1 = Object.keys(object1);
          //   const keys2 = Object.keys(object2);
          //   if (keys1.length !== keys2.length) return false;
          //   for (let key of keys1) {
          //     const innerKeys1 = Object.keys(object1[key]);
          //     const innerKeys2 = Object.keys(object2[key]);
          //     if (innerKeys1.length !== innerKeys2.length) return false;
          //     for (let innerKey of innerKeys1) {
          //       if (object1[key][innerKey] !== object2[key][innerKey])
          //         return false;
          //     }
          //   }
          //   return true;
          // };

          const new_delivery = pr;
          if (!new_delivery) {
            resolve(false);
            return;
          }
          const prevMonday = new Date();
          prevMonday.setDate(
            prevMonday.getDate() - ((prevMonday.getDay() + 6) % 7)
          );
          const isUpdated =
            new_delivery.date == prevMonday.toISOString().slice(0, 10);
          // console.log(isEqual);
          resolve(isUpdated);
        });
      })
      .catch((error) => console.error(error));
  });

const updatePrices = async (campaign) => {
  const authToken = getAuthToken("api-token", campaign);
  const newPricesPath = path.join(
    __dirname,
    `files/${campaign}/newPrices.json`
  );
  const newPrices = JSON.parse(await fs.readFile(newPricesPath));
  console.log(campaign, newPrices);
  if (!newPrices.length) {
    fs.rm(newPricesPath);
    return 0;
  }
  axios
    .post(
      "https://suppliers-api.wildberries.ru/public/api/v1/prices",
      newPrices,
      {
        headers: {
          Authorization: authToken,
        },
      }
    )
    .then((response) => response.data)
    .catch((error) => console.error(error));
  fs.rm(newPricesPath);
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

const calcAdvertismentAndWriteToJSON = (campaign) => {
  const analytics = JSON.parse(
    afs.readFileSync(path.join(__dirname, "files", campaign, "analytics.json"))
  );
  const orders = JSON.parse(
    afs.readFileSync(path.join(__dirname, "files", campaign, "orders.json"))
  );
  const vendorCodes = JSON.parse(
    afs.readFileSync(
      path.join(__dirname, "files", campaign, "vendorCodes.json")
    )
  );
  const calcAds = (mask) => {
    let allOrders = 0;
    // console.log(mask);
    for (const nmId in orders) {
      const code = vendorCodes[nmId];
      if (!code) continue;
      if (code.match(mask.replace("+", "\\+"))) {
        allOrders += orders[nmId];
      }
    }

    // console.log(allOrders, analytics[mask].rashod)
    return { ads: analytics[mask].rashod / allOrders };
  };

  const jsonData = {};
  for (const mask in analytics) {
    // console.log(mask);
    jsonData[mask] = calcAds(mask);
  }

  return fs
    .writeFile(
      path.join(__dirname, "files", campaign, "ads.json"),
      JSON.stringify(jsonData)
    )
    .then(() => console.log("ads.json created."))
    .catch((error) => console.error(error));
};

const calculateNewValuesAndWriteToXlsx = (campaign) => {
  const afs = require("fs");
  const enteredValues = JSON.parse(
    afs.readFileSync(
      path.join(__dirname, "files", campaign, "enteredValues.json")
    )
  );
  const arts_data = JSON.parse(
    afs.readFileSync(path.join(__dirname, "files/data.json"))
  );
  const data = xlsx.parse(
    path.join(__dirname, `files/${campaign}/data.xlsx`)
  )[0]["data"];
  const ads = JSON.parse(
    afs.readFileSync(path.join(__dirname, "files", campaign, "ads.json"))
  );

  for (let i = 1; i < data.length; i++) {
    let row = data[i];
    // console.log(row);
    const vendorCode = row[0];
    if (!vendorCode || !arts_data[vendorCode] || !enteredValues[vendorCode]) {
      row[12] = "";
      row[13] = "";
      row[14] = "";
      row[15] = "";

      data[i] = row;
      continue;
    }

    const calc = (roz_price) => {
      const spp_price = Math.floor(
        roz_price * (1 - arts_data[vendorCode].spp / 100)
      );
      const commission = roz_price * (arts_data[vendorCode].commission / 100);
      const delivery = arts_data[vendorCode].delivery;
      const tax = spp_price * (arts_data[vendorCode].tax / 100);
      const expences =
        campaign == "TKS" ? spp_price * 0.11 : arts_data[vendorCode].expences;
      const prime_cost = arts_data[vendorCode].prime_cost;
      // ads
      const find_ad = () => {
        for (const code in ads) {
          if (vendorCode.match(code.replace("+", "\\+"))) return ads[code].ads;
        }
        return 0;
      };
      const ad = find_ad();
      const drr = ad / spp_price;

      const profit =
        -ad - commission - delivery - tax - expences - prime_cost + roz_price;
      const wb_price = roz_price / (1 - row[3] / 100);

      const roi = profit / (prime_cost + expences);
      return {
        new_roi: roi,
        new_roz_price: roz_price,
        new_spp_price: spp_price,
        new_wb_price: wb_price,
      };
    };
    const entered_roi = enteredValues[vendorCode].roi / 100;
    const entered_roz_price = enteredValues[vendorCode].roz_price;
    const entered_spp_price = enteredValues[vendorCode].spp_price;
    let count = 0;
    if (entered_roi) count++;
    if (entered_roz_price) count++;
    if (entered_spp_price) count++;
    if (count != 1) {
      row[12] = "";
      row[13] = "";
      row[14] = "";
      row[15] = "";

      data[i] = row;
      continue;
    }

    const diffs = [];
    const calculateds = {};
    for (let i = 450; i < 2000; i++) {
      const calculated = calc(i);
      let diff = undefined;
      if (entered_roi) {
        diff = Math.abs(calculated.new_roi - entered_roi);
      } else if (entered_roz_price) {
        diff = Math.abs(calculated.new_roz_price - entered_roz_price);
      } else if (entered_spp_price) {
        diff = Math.abs(calculated.new_spp_price - entered_spp_price);
      }
      diffs.push(diff);
      calculateds[String(diff)] = calculated;
      // break;
    }

    diffs.sort();
    const min_diff = String(diffs[0]);
    // console.log(min_diff, diffs, calculateds[min_diff])
    row[12] = calculateds[min_diff].new_roi;
    row[13] = calculateds[min_diff].new_roz_price;
    row[14] = calculateds[min_diff].new_spp_price;
    row[15] = calculateds[min_diff].new_wb_price;

    data[i] = row;
  }

  const buffer = xlsx.build([{ name: "Общий отчёт", data: data }]);
  return fs
    .writeFile(path.join(__dirname, "files", campaign, "data.xlsx"), buffer)
    .then(() => console.log("data.xlsx created."))
    .catch((error) => console.error(error));
};

module.exports = {
  fetchDataAndWriteToXlsx,
  fetchCardsAndWriteToJSON,
  fetchStocksAndWriteToJSON,
  fetchOrdersAndWriteToJSON,
  calcAdvertismentAndWriteToJSON,
  fetchDetailedByPeriodAndWriteToJSON,
  calculateNewValuesAndWriteToXlsx,
  updatePrices,
};
