const xlsx = require("node-xlsx");
const axios = require("axios");
const fs = require("fs").promises;
const afs = require("fs");
const path = require("path");
const { fetchHandStocks } = require("./google_sheets");

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

const getAdverts = (authToken, params) => {
  return axios
    .get("https://advert-api.wb.ru/adv/v0/adverts", {
      headers: {
        Authorization: authToken,
      },
      params: params,
    })
    .then((response) => response.data)
    .catch((error) => console.error(error));
};

const getAdvertInfo = (authToken, params) => {
  return axios
    .get("https://advert-api.wb.ru/adv/v0/advert", {
      headers: {
        Authorization: authToken,
      },
      params: params,
    })
    .then((response) => response.data)
    .catch((error) => console.error(error));
};

const updateAdvertArtActivities = (authToken, params) => {
  return axios
    .post("https://advert-api.wb.ru/adv/v0/nmactive", params, {
      headers: {
        Authorization: authToken,
      },
    })
    .then((response) => response.data)
    .catch((error) => console.error(error));
};

const getKTErrors = (authToken, params) => {
  return axios
    .get("https://suppliers-api.wildberries.ru/content/v1/cards/error/list", {
      headers: {
        Authorization: authToken,
      },
      params: params,
    })
    .then((response) => response.data)
    .catch((error) => console.error(error));
};

const getArtRating = (authToken, params) => {
  return axios
    .get(
      "https://feedbacks-api.wildberries.ru/api/v1/feedbacks/products/rating/nmid",
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

const getWarehouses = (authToken) => {
  return axios
    .get("https://suppliers-api.wildberries.ru/api/v3/offices", {
      headers: {
        Authorization: authToken,
      },
    })
    .then((response) => response.data)
    .catch((error) => console.error(error));
};

const getWarehouseStocks = (authToken, warehouseId, params) => {
  return axios
    .post(
      `https://suppliers-api.wildberries.ru/api/v3/stocks/${warehouseId}`,
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

const getCardsTemp = (authToken, params) => {
  return axios
    .post(
      "https://suppliers-api.wildberries.ru/content/v1/cards/filter",
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
      "Остаток",
      "Заказов/7",
      "Заказов/1",
      "Оборачиваемость",
      "Рентабельность",
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
    const per_day = orders[vendorCode];
    const stock = stocks["today"][vendorCode];
    const obor = stock / per_day;
    const mult = arts_data[vendorCode].multiplicity;
    const zakaz =
      Math.round((per_day * arts_data[vendorCode].pref_obor - stock) / mult) *
      mult;
    const roz_price = Math.round(el.price * (1 - el.discount / 100));
    const min_zakaz = arts_data[vendorCode].min_zakaz;

    const spp_price = Math.floor(
      roz_price * (1 - arts_data[vendorCode].spp / 100)
    );
    const commission = roz_price * (arts_data[vendorCode].commission / 100);
    const delivery = arts_data[vendorCode].delivery;
    const tax = spp_price * (arts_data[vendorCode].tax / 100);
    const expences =
      campaign == "TKS" ? spp_price * 0.07 : arts_data[vendorCode].expences;
    const prime_cost = arts_data[vendorCode].prime_cost;

    // ads
    const find_ad = () => {
      for (const code in ads) {
        if (vendorCode.match(code.replace("+", "\\+"))) return ads[code].ads;
      }
      return 0;
    };
    // const ad = find_ad(); //analytics ad
    // const drr = ad / spp_price;

    const ad = roz_price * (arts_data[vendorCode].ad / 100);
    const drr = ad / roz_price;

    const profit =
      -ad - commission - delivery - tax - expences - prime_cost + roz_price;
    const roi = profit / (prime_cost + expences);
    const rentabelnost = profit / spp_price;

    const realZakaz = !stock
      ? zakaz > mult * min_zakaz
        ? zakaz
        : mult * min_zakaz
      : zakaz > 0
      ? zakaz
      : 0;
    new_data.push([
      vendorCode,
      realZakaz,
      el.price,
      el.discount,
      roz_price, // розничная стоимость
      spp_price,
      profit,
      stock,
      orders[vendorCode] * 7,
      per_day,
      obor,
      rentabelnost,
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

const writeWarehousesToJson = (data, campaign) => {
  return fs
    .writeFile(
      path.join(__dirname, "files", campaign, "warehouses.json"),
      JSON.stringify(data)
    )
    .then(() => console.log("warehouses.json created."))
    .catch((error) => console.error(error));
};

const writeVendorCodeToJson = (data, campaign) => {
  const jsonData = {};
  const jsonDataFull = {};
  data.forEach((item) => {
    jsonData[item.nmID] = item.vendorCode.replace(/\s/g, "");
  });
  data.forEach((item) => {
    jsonDataFull[item.vendorCode.replace(/\s/g, "")] = {
      object: item.object,
      brand: item.brand,
      skus: item.sizes[0].skus[0],
    };
  });
  fs.writeFile(
    path.join(__dirname, "files", campaign, "vendorCodesFull.json"),
    JSON.stringify(jsonDataFull)
  )
    .then(() => console.log("vendorCodesFull.json created."))
    .catch((error) => console.error(error));
  return fs
    .writeFile(
      path.join(__dirname, "files", campaign, "vendorCodes.json"),
      JSON.stringify(jsonData)
    )
    .then(() => console.log("vendorCodes.json created."))
    .catch((error) => console.error(error));
};

const writeCardsTempToJson = (data, campaign) => {
  const jsonData = {};
  data.forEach((item) => {
    jsonData[item.vendorCode] = item.characteristics;
  });
  console.log(data);
  return fs
    .writeFile(
      path.join(__dirname, "files", campaign, "cardsTemp.json"),
      JSON.stringify(data)
    )
    .then(() => console.log("cardsTemp.json created."))
    .catch((error) => console.error(error));
};

const writeAdvertsToJson = (data, campaign) => {
  const jsonData = {};
  data.forEach((item) => {
    jsonData[item.advertId] = new Date(item.createTime)
      .toISOString()
      .slice(0, 10);
  });
  return fs
    .writeFile(
      path.join(__dirname, "files", campaign, "adverts.json"),
      JSON.stringify(jsonData)
    )
    .then(() => console.log("adverts.json created."))
    .catch((error) => console.error(error));
};

const writeKTErrorsToJson = (data, campaign) => {
  return fs
    .writeFile(
      path.join(__dirname, "files", campaign, "KTerrors.json"),
      JSON.stringify(data)
    )
    .then(() => console.log("adverts.json created."))
    .catch((error) => console.error(error));
};

const writeStocksToJson = async (data, campaign, date) => {
  fs.writeFile(
    path.join(__dirname, "files", campaign, "stocksFull.json"),
    JSON.stringify(data)
  )
    .then(() => console.log("stocks.json created."))
    .catch((error) => console.error(error));

  const stocks = JSON.parse(
    afs.readFileSync(path.join(__dirname, "files", campaign, "stocks.json"))
  );
  let jsonData = {};
  await fetchHandStocks(campaign).then((pr) => {
    jsonData = pr;
    // console.log(jsonData);
  });

  if (Object.keys(jsonData).length == 0) {
    if (data && data.length) {
      data.forEach((item) => {
        const supplierArticle = item.supplierArticle.replace(/\s/g, "");
        if (supplierArticle in jsonData)
          jsonData[supplierArticle] += item.quantity;
        else jsonData[supplierArticle] = item.quantity;
      });
    } else {
      jsonData = date in stocks ? stocks[date] : {};
    }
  }

  stocks[date] = jsonData;
  stocks["today"] = jsonData;
  return fs
    .writeFile(
      path.join(__dirname, "files", campaign, "stocks.json"),
      JSON.stringify(stocks)
    )
    .then(() => console.log("stocks.json created."))
    .catch((error) => console.error(error));
};

const writeOrdersToJson = (data, campaign, date) => {
  const today = new Date().toISOString().slice(0, 10);
  const dateFrom = new Date(date);
  console.log(dateFrom);
  const jsonData = {};
  const orderSumJsonData = {};

  const vendorCodes = JSON.parse(
    afs.readFileSync(
      path.join(__dirname, "files", campaign, "vendorCodes.json")
    )
  );

  const excluded = { excluded: [] };
  data.forEach((item) => {
    const order_date = new Date(item.date);
    const supplierArticle = item.supplierArticle.replace(/\s/g, "");
    if (order_date < dateFrom) {
      excluded.excluded.push({
        order_date: order_date,
        supplierArticle: supplierArticle,
        reason: "Date less than dateFrom",
      });
      return;
    }
    const order_date_string = item.date.slice(0, 10);
    if (item.isCancel || order_date_string == today) {
      excluded.excluded.push({
        order_date: order_date,
        supplierArticle: supplierArticle,
        reason: "isCancel or today == order_date_string",
      });
      return;
    }
    if (!(order_date_string in jsonData)) {
      jsonData[order_date_string] = {};
      for (key in vendorCodes) {
        jsonData[order_date_string][vendorCodes[key]] = 0;
      }
      // console.log(jsonData[order_date_string]);
    }
    if (supplierArticle in jsonData[order_date_string])
      jsonData[order_date_string][supplierArticle] += 1;
    else jsonData[order_date_string][supplierArticle] = 1;

    if (!(order_date_string in orderSumJsonData)) {
      orderSumJsonData[order_date_string] = {};
      for (key in vendorCodes) {
        orderSumJsonData[order_date_string][vendorCodes[key]] = 0;
      }
      // console.log(orderSumJsonData[order_date_string]);
    }
    if (!(supplierArticle in orderSumJsonData[order_date_string]))
      orderSumJsonData[order_date_string][supplierArticle] = 0;

    orderSumJsonData[order_date_string][supplierArticle] +=
      item.totalPrice * (1 - item.discountPercent / 100);
  });
  fs.writeFile(
    path.join(__dirname, "files", campaign, "excluded.json"),
    JSON.stringify(excluded)
  ).then(() => console.log("excluded.xlsx created."));
  return Promise.all([
    fs.writeFile(
      path.join(__dirname, "files", campaign, "orders by day.json"),
      JSON.stringify(jsonData)
    ),
    fs.writeFile(
      path.join(__dirname, "files", campaign, "sum of orders by day.json"),
      JSON.stringify(orderSumJsonData)
    ),
  ])
    .then(() => console.log("orders by days.json created."))
    .catch((error) => console.error(error));
};

const writeDetailedByPeriodToJson = (data, campaign) =>
  new Promise((resolve, reject) => {
    const jsonData = {};
    if (data) {
      jsonData["date"] = data
        .reduce((prev, current) =>
          prev.create_dt.slice(0, 10) > current.create_dt.slice(0, 10)
            ? prev
            : current
        )
        .create_dt.slice(0, 10);
      data.forEach((item) => {
        if (
          item.supplier_oper_name != "Логистика" &&
          item.supplier_oper_name != "Продажа" &&
          item.supplier_oper_name != "Логистика сторно"
        )
          return;

        const type = item.sa_name.split("_").slice(0, 2).join("_");
        if (!(type in jsonData)) {
          jsonData[type] = { buyout: 0, delivery: 0 };
        }
        jsonData[type].buyout += item.quantity;
        const delivery_rub = item.delivery_rub;
        jsonData[type].delivery +=
          item.supplier_oper_name == "Логистика сторно"
            ? -delivery_rub
            : delivery_rub;
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
      prevMonday.getDate() - 28 - ((prevMonday.getDay() + 6) % 7)
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

const fetchWarehouses = (campaign) => {
  const authToken = getAuthToken("api-token", campaign);
  return getWarehouses(authToken)
    .then((data) => {
      return writeWarehousesToJson(data, campaign);
    })
    .catch((error) => console.error(error));
};

const fetchStocksFromWarehouses = async (campaign) => {
  const authToken = getAuthToken("api-token", campaign);
  // await fetchWarehouses(campaign);
  const vendorCodesFull = JSON.parse(
    afs.readFileSync(
      path.join(__dirname, "files", campaign, "vendorCodesFull.json")
    )
  );
  const skus = [];
  for (const [key, data] of Object.entries(vendorCodesFull)) {
    skus.push(data.skus);
  }
  console.log(skus);
  const warehouses = JSON.parse(
    afs.readFileSync(path.join(__dirname, "files", campaign, "warehouses.json"))
  );
  const data = {};
  for (const [index, warehouse] of Object.entries(warehouses)) {
    // console.log(key, id);
    // if (!warehouse.selected) continue;
    console.log(warehouse);

    await getWarehouseStocks(authToken, warehouse.id, {
      skus: skus,
    }).then((pr) => {
      console.log(warehouse, pr);
      for (const art of pr.stocks) {
        for (const [key, data] of Object.entries(vendorCodesFull)) {
          if (data.skus != art.sku) continue;
          if (!(key in data)) data[key] = 0;
          data[key] += art.amount;
        }
      }
    });
    await new Promise((resolve) => setTimeout(resolve, 500));
  }
  return fs
    .writeFile(
      path.join(__dirname, "files", campaign, "warehouseStocks.json"),
      JSON.stringify(data)
    )
    .then(() => console.log("warehouseStocks.json created."))
    .catch((error) => console.error(error));
};

const fetchAdvertsAndWriteToJson = (campaign) => {
  const authToken = getAuthToken("api-advert-token", campaign);
  const params = {};
  return getAdverts(authToken, params)
    .then((data) => {
      return writeAdvertsToJson(data, campaign);
    })
    .catch((error) => console.error(error));
};

const fetchAdvertInfosAndWriteToJson = async (campaign) => {
  const authToken = getAuthToken("api-advert-token", campaign);
  const adsIds = JSON.parse(
    afs.readFileSync(path.join(__dirname, "files", campaign, "adsIds.json"))
  );
  const data = {};
  for (const [key, id] of Object.entries(adsIds)) {
    // console.log(key, id);
    if (!id) continue;
    const params = { id: id };
    await getAdvertInfo(authToken, params).then((pr) => (data[key] = pr));
    await new Promise((resolve) => setTimeout(resolve, 500));
  }
  return fs
    .writeFile(
      path.join(__dirname, "files", campaign, "advertInfos.json"),
      JSON.stringify(data)
    )
    .then(() => console.log("advertInfos.json created."))
    .catch((error) => console.error(error));
};

const updateAdvertArtActivitiesAndGenerateNotIncluded = async (campaign) => {
  const authToken = getAuthToken("api-advert-token", campaign);
  const advertInfos = JSON.parse(
    afs.readFileSync(
      path.join(__dirname, "files", campaign, "advertInfos.json")
    )
  );

  const vendorCodes = JSON.parse(
    afs.readFileSync(
      path.join(__dirname, "files", campaign, "vendorCodes.json")
    )
  );

  const stocks = JSON.parse(
    afs.readFileSync(path.join(__dirname, "files", campaign, "stocks.json"))
  ).today;

  const notIncluded = {};
  for (const [key, data] of Object.entries(advertInfos)) {
    // console.log(key, id);
    const nms_temp = data.params[0].nms;
    // console.log(key, data, nms_temp);
    const nms = [];
    for (let i = 0; i < nms_temp.length; i++) {
      nms.push(String(nms_temp[i].nm));
    }
    for (const [id, art] of Object.entries(vendorCodes)) {
      if (art.match(key)) {
        if (!nms.includes(id) && stocks[art]) {
          // console.log(stocks[art], art);
          if (!(key in notIncluded)) notIncluded[key] = [];
          // notIncluded[key].push({ nm: id, vendorCode: art });
          notIncluded[key].push(id);
        }
      }
    }
    const nms_to_update = [];
    for (const obj of nms_temp) {
      obj.active = stocks[vendorCodes[obj.nm]] > 0;
      nms_to_update.push(obj);
    }
    const params = {
      advertId: data.advertId,
      active: nms_to_update,
      param: data.params[0].subjectId ?? data.params[0].setId,
    };
    // if (key != "ПР_120") continue;
    console.log(campaign, key, params);
    await updateAdvertArtActivities(authToken, params);
  }
  // console.log(notIncluded);
  // return;
  return fs
    .writeFile(
      path.join(__dirname, "files", campaign, "notIncludedNMs.json"),
      JSON.stringify(notIncluded)
    )
    .then(() => console.log("notIncludedNMs.json created."))
    .catch((error) => console.error(error));
};

const getKTErrorsAndWriteToJson = (campaign) => {
  const authToken = getAuthToken("api-token", campaign);
  const params = {};
  return getKTErrors(authToken, params)
    .then((data) => {
      return writeKTErrorsToJson(data, campaign);
    })
    .catch((error) => console.error(error));
};

const fetchArtsRatings = async (campaign) => {
  return new Promise(async (resolve, reject) => {
    const authToken = getAuthToken("api-token", campaign);
    const vendorCodes = JSON.parse(
      afs.readFileSync(
        path.join(__dirname, "files", campaign, "vendorCodes.json")
      )
    );
    const data = {};
    for (const [nmId, vendorCode] of Object.entries(vendorCodes)) {
      if (!nmId) continue;
      const params = { nmId: nmId };
      await getArtRating(authToken, params).then(
        (pr) => (data[vendorCode] = pr.data)
      );
      console.log(vendorCode, data[vendorCode]);
      await new Promise((resolve) => setTimeout(resolve, 200));
    }
    return fs
      .writeFile(
        path.join(__dirname, "files", campaign, "artRatings.json"),
        JSON.stringify(data)
      )
      .then(() => {
        console.log("artRatings.json created.");
        resolve();
      })
      .catch((error) => console.error(error));
  });
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

const fetchCardsTempAndWriteToJSON = (campaign) => {
  const authToken = getAuthToken("api-token", campaign);
  const params = {
    vendorCodes: [
      "ПР_180_РОЗОВЫЙ_ОТК",
      // "ПР_180_ЛАГУНА_ОТК",
      // "ПР_180_МОЛОЧНЫЙ_ОТК",
    ],
    allowedCategoriesOnly: false,
  };
  return getCardsTemp(authToken, params)
    .then((cards) => writeCardsTempToJson(cards.data, campaign))
    .catch((error) => console.error(error));
};

const fetchStocksAndWriteToJSON = (campaign) => {
  const authToken = getAuthToken("api-statistic-token", campaign);
  const dateFrom = new Date();
  const date_today = dateFrom.toISOString().slice(0, 10);
  dateFrom.setDate(dateFrom.getDate() - 1);
  const date = dateFrom.toISOString().slice(0, 10);
  // console.log(date);
  const params = {
    dateFrom: "2019-06-20",
  };
  return getStocks(authToken, params)
    .then((data) => writeStocksToJson(data, campaign, date_today))
    .catch((error) => console.error(error));
};

const fetchOrdersAndWriteToJSON = (campaign) => {
  const authToken = getAuthToken("api-statistic-token", campaign);
  const dateFrom = new Date();
  dateFrom.setDate(dateFrom.getDate() - 30);
  const date = dateFrom.toISOString().slice(0, 10);
  console.log(date);
  const params = {
    dateFrom: date,
  };
  return getOrders(authToken, params)
    .then((data) => {
      writeOrdersToJson(data, campaign, date);
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
    for (const supplierArticle in orders) {
      const code = vendorCodes[supplierArticle];
      if (!code) continue;
      if (code.match(mask.replace("+", "\\+"))) {
        allOrders += orders[supplierArticle];
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

const calcAvgOrdersAndWriteToJSON = (campaign) => {
  const orders_by_day = JSON.parse(
    afs.readFileSync(
      path.join(__dirname, "files", campaign, "orders by day.json")
    )
  );
  const stocks = JSON.parse(
    afs.readFileSync(path.join(__dirname, "files", campaign, "stocks.json"))
  );
  // const orders_by_day = {};
  // for (let i = 0; i < 29; i++) {
  //   const temp_date_for_calc = new Date();
  //   temp_date_for_calc.setDate(temp_date_for_calc.getDate() - i);
  //   const str_date_today = temp_date_for_calc.toISOString().slice(0, 10);
  //   temp_date_for_calc.setDate(temp_date_for_calc.getDate() - 1);
  //   const str_date_yesterday = temp_date_for_calc.toISOString().slice(0, 10);

  //   console.log(str_date_today, str_date_yesterday);
  //   for (const art in stocks[str_date_today]) {
  //     if (!(str_date_today in orders_by_day))
  //       orders_by_day[str_date_today] = {};
  //     if (!(art in orders_by_day[str_date_today]))
  //       orders_by_day[str_date_today][art] = 0;

  //     if (!(str_date_today in stocks)) continue;
  //     if (!(str_date_yesterday in stocks)) continue;

  //     orders_by_day[str_date_today][art] =
  //       stocks[str_date_yesterday][art] - stocks[str_date_today][art];
  //   }
  // }

  // console.log(orders_by_day);
  const calcAvgOrders = (jsonData, date, avgs = undefined) => {
    for (const supplierArticle in orders_by_day[date]) {
      if (
        supplierArticle &&
        stocks[date] &&
        stocks[date][supplierArticle] && // Stocks based
        stocks[date][supplierArticle] >= orders_by_day[date][supplierArticle] &&
        orders_by_day[date][supplierArticle] > 0 && // orders_by_day[date][supplierArticle] > 0 // Orders based
        (avgs
          ? orders_by_day[date][supplierArticle] >= avgs[supplierArticle]
          : 1)
      ) {
        // console.log(supplierArticle, date, orders_by_day[date][supplierArticle])
        if (supplierArticle in jsonData) {
          jsonData[supplierArticle].count += 1;
          jsonData[supplierArticle].orders +=
            orders_by_day[date][supplierArticle];
        } else
          jsonData[supplierArticle] = {
            count: 1,
            orders: orders_by_day[date][supplierArticle],
            avg: 0,
          };
        jsonData[supplierArticle].avg =
          jsonData[supplierArticle].orders / jsonData[supplierArticle].count;
      }
    }

    return jsonData;
  };

  let jsonData = {};
  const dateFrom = new Date(new Date().toISOString().slice(0, 10));
  dateFrom.setDate(dateFrom.getDate() - 30);
  for (const order_data_date in orders_by_day) {
    const order_date = new Date(order_data_date);
    // console.log(order_date, dateFrom);
    if (
      order_date < dateFrom ||
      order_data_date == new Date().toISOString().slice(0, 10)
    ) {
      continue;
    }
    jsonData = calcAvgOrders(jsonData, order_data_date);
  }
  const avgData = {};
  for (supplierArticle in jsonData) {
    avgData[supplierArticle] = jsonData[supplierArticle].avg;
  }
  afs.writeFileSync(
    path.join(__dirname, "files", campaign, "orders_by_day_stocks1.json"),
    JSON.stringify(avgData)
  );

  // jsonData = {}
  // for (const order_data_date in orders_by_day) {
  //   const order_date = new Date(order_data_date);
  //   // console.log(order_date, dateFrom);
  //   if (
  //     order_date < dateFrom ||
  //     order_data_date == new Date().toISOString().slice(0, 10)
  //   ) {
  //     continue;
  //   }
  //   jsonData = calcAvgOrders(jsonData, order_data_date, avgData);
  // }
  // for (supplierArticle in jsonData) {
  //   avgData[supplierArticle] = jsonData[supplierArticle].avg;
  // }

  return fs
    .writeFile(
      path.join(__dirname, "files", campaign, "orders.json"),
      JSON.stringify(avgData)
    )
    .then(() => console.log("orders.json created."))
    .catch((error) => console.error(error));
};

const calcAvgRatingsAndWriteToJSON = (campaign) => {
  const artRatings = JSON.parse(
    afs.readFileSync(path.join(__dirname, "files", campaign, "artRatings.json"))
  );

  const temp = {};
  for (const [vendorCode, data] of Object.entries(artRatings)) {
    const code = vendorCode.split("_");
    if (code.slice(-1) == "2") code.pop();
    if (code.includes("НАМАТРАСНИК")) code.splice(1, 1);
    else if (code.includes("КПБ")) code.splice(3, 1);
    else code.splice(2, 1);

    const mask = code.join("_");

    if (!(mask in temp))
      temp[mask] = { sum: 0, feedbacksCount: 0, count: 0, avg: 0 };

    if (!data.valuation || !data.feedbacksCount) continue;

    temp[mask].sum += parseFloat(data.valuation) * data.feedbacksCount;
    temp[mask].feedbacksCount += data.feedbacksCount;
    // temp[mask].count += 1;
    temp[mask].avg = parseFloat(
      (temp[mask].sum / temp[mask].feedbacksCount).toFixed(1)
    );

    if (mask == "ПР_140_ОТК")
      console.log(vendorCode, data.valuation, temp[mask]);
  }
  console.log(temp);

  const avgData = {};
  for (const [mask, data] of Object.entries(temp)) {
    avgData[mask] = data.avg;
  }

  return fs
    .writeFile(
      path.join(__dirname, "files", campaign, "avgRatings.json"),
      JSON.stringify(avgData)
    )
    .then(() => console.log("avgRatings.json created."))
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
      row[13] = "";
      row[14] = "";
      row[15] = "";
      row[16] = "";

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
        campaign == "TKS" ? spp_price * 0.07 : arts_data[vendorCode].expences;
      const prime_cost = arts_data[vendorCode].prime_cost;
      // ads
      const find_ad = () => {
        for (const code in ads) {
          if (vendorCode.match(code.replace("+", "\\+"))) return ads[code].ads;
        }
        return 0;
      };

      // const ad = find_ad(); //analytics ad
      // const drr = ad / spp_price;

      const ad = roz_price * (arts_data[vendorCode].ad / 100);
      const drr = ad / roz_price;

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
      row[13] = "";
      row[14] = "";
      row[15] = "";
      row[16] = "";

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
    row[13] = calculateds[min_diff].new_roi;
    row[14] = calculateds[min_diff].new_roz_price;
    row[15] = calculateds[min_diff].new_spp_price;
    row[16] = calculateds[min_diff].new_wb_price;

    data[i] = row;
  }

  const buffer = xlsx.build([{ name: "Общий отчёт", data: data }]);
  return fs
    .writeFile(path.join(__dirname, "files", campaign, "data.xlsx"), buffer)
    .then(() => console.log("data.xlsx created."))
    .catch((error) => console.error(error));
};

module.exports = {
  fetchStocksFromWarehouses,
  fetchDataAndWriteToXlsx,
  fetchCardsAndWriteToJSON,
  fetchCardsTempAndWriteToJSON,
  fetchStocksAndWriteToJSON,
  fetchOrdersAndWriteToJSON,
  calcAvgOrdersAndWriteToJSON,
  calcAvgRatingsAndWriteToJSON,
  calcAdvertismentAndWriteToJSON,
  fetchDetailedByPeriodAndWriteToJSON,
  fetchAdvertsAndWriteToJson,
  calculateNewValuesAndWriteToXlsx,
  updatePrices,
  getKTErrorsAndWriteToJson,
  fetchArtsRatings,
  fetchAdvertInfosAndWriteToJson,
  updateAdvertArtActivitiesAndGenerateNotIncluded,
};

const indexToColumn = (index) => {
  // Validate index size
  const maxIndex = 18278;
  if (index > maxIndex) {
    return "";
  }

  // Get column from index
  const l = "ABCDEFGHIJKLMNOPQRSTUVWXYZ";
  if (index > 26) {
    const letterA = indexToColumn(Math.floor((index - 1) / 26));
    const letterB = indexToColumn(index % 26);
    return letterA + letterB;
  } else {
    if (index == 0) {
      index = 26;
    }
    return l[index - 1];
  }
};
