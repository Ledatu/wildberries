const xlsx = require("node-xlsx");
const axios = require("axios");
const querystring = require("querystring");
const fs = require("fs").promises;
const afs = require("fs");
const path = require("path");
const { fetchHandStocks, sendEmail } = require("./google_sheets");
const TelegramBot = require("node-telegram-bot-api");

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

const getAuthTokenMpManager = (type, campaign) => {
  try {
    const secret = JSON.parse(
      afs.readFileSync(
        path.join(__dirname, "../secrets/mp_manager", `${campaign}.json`)
      )
    );
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

const getFeedbacks = (authToken, params) => {
  return axios
    .get("https://feedbacks-api.wildberries.ru/api/v1/feedbacks", {
      headers: {
        Authorization: authToken,
      },
      params: params,
    })
    .then((response) => response.data)
    .catch((error) => console.error(error));
};
const updateFeedback = (authToken, params) => {
  // console.log(authToken);
  return axios
    .patch("https://feedbacks-api.wildberries.ru/api/v1/feedbacks", params, {
      headers: {
        Authorization: authToken,
      },
    })
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
    .get("http://advert-api.wb.ru/adv/v0/advert", {
      headers: {
        Authorization: authToken,
      },
      params: params,
    })
    .then((response) => response.data)
    .catch((error) => console.error(error));
};

const getAdvertStat = (authToken, params) => {
  return axios
    .get("https://advert-api.wb.ru/adv/v1/fullstat", {
      headers: {
        Authorization: authToken,
      },
      params: params,
    })
    .then((response) => response.data)
    .catch((error) => console.error(error));
};

const getAdvertStatMpManager = (
  authToken,
  params,
  organizationId,
  externalId
) => {
  return axios
    .get(
      `https://api.mpmgr.ru/v3/organizations/${organizationId}/campaigns/${externalId}/full-stats`,
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

const getHourAdvertStatMpManager = (
  authToken,
  params,
  organizationId,
  externalId
) => {
  return axios
    .get(
      `https://api.mpmgr.ru/v3/organizations/${organizationId}/campaigns/${externalId}/full-stats`,
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

const fetchRKsBudget = (authToken, params) => {
  return axios
    .get("https://advert-api.wb.ru/adv/v1/budget", {
      headers: {
        Authorization: authToken,
      },
      params: params,
    })
    .then((response) => response.data)
    .catch((error) => console.error(error));
};
const updateRKsBudget = (authToken, queryParams, params) => {
  return axios
    .post(
      "https://advert-api.wb.ru/adv/v1/budget/deposit" + "?" + queryParams,
      params,
      {
        headers: {
          Authorization: authToken,
        },
      }
    )
    .then((response) => console.log(response.data))
    .catch((error) => console.error(error));
};
const createRK = (authToken, params) => {
  return axios
    .post("https://advert-api.wb.ru/adv/v1/save-ad", params, {
      headers: {
        Authorization: authToken,
      },
    })
    .then((response) => console.log(response.data))
    .catch((error) => console.error(error));
};
const startRK = (authToken, params) => {
  return axios
    .get("https://advert-api.wb.ru/adv/v0/start", {
      headers: {
        Authorization: authToken,
      },
      params: params,
    })
    .then((response) => response.data)
    .catch((error) => console.error(error));
};

const getSubjectsDictionary = (authToken) => {
  return axios
    .get("https://advert-api.wb.ru/adv/v0/params/subject", {
      headers: {
        Authorization: authToken,
      },
    })
    .then((response) => response.data)
    .catch((error) => console.error(error));
};

const updatePlusPhrasesActivity = (authToken, params) => {
  return axios
    .get("https://advert-api.wb.ru/adv/v1/search/set-plus", {
      headers: {
        Authorization: authToken,
      },
      params: params,
    })
    .then((response) => response.data)
    .catch((error) => console.error(error));
};
const updatePlusPhrasesInRK = (authToken, queryParams, params) => {
  return axios
    .post(
      "https://advert-api.wb.ru/adv/v1/search/set-plus" + "?" + queryParams,
      params,
      {
        headers: {
          Authorization: authToken,
        },
      }
    )
    .then((response) => console.log(response.data))
    .catch((error) => console.error(error));
};
const updateArtsInAutoRK = (authToken, queryParams, params) => {
  return axios
    .post(
      "https://advert-api.wb.ru/adv/v1/auto/updatenm" + "?" + queryParams,
      params,
      {
        headers: {
          Authorization: authToken,
        },
      }
    )
    .then((response) => console.log(response.data))
    .catch((error) => console.error(error));
};
const updatePlacementsInAutoRK = (authToken, queryParams, params) => {
  return axios
    .post(
      "https://advert-api.wb.ru/adv/v1/auto/active" + "?" + queryParams,
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

const getSales = (authToken, params) => {
  return axios
    .get("https://statistics-api.wildberries.ru/api/v1/supplier/sales", {
      headers: {
        Authorization: authToken,
      },
      params: params,
    })
    .then((response) => response.data)
    .catch((error) => console.error(error));
};

const buildXlsx = (data, campaign, rewriteProfit = false) => {
  const vendorCodes = JSON.parse(
    afs.readFileSync(
      path.join(__dirname, "files", campaign, "vendorCodes.json")
    )
  );
  const fullWeekArtStats = JSON.parse(
    afs.readFileSync(
      path.join(__dirname, "files", campaign, "fullWeekArtStats.json")
    )
  );

  // ------------------------
  const storageCost = JSON.parse(
    afs.readFileSync(path.join(__dirname, "files", "storageCost.json"))
  )[campaign].cost;
  const byDayCampaignSalesSum = JSON.parse(
    afs.readFileSync(
      path.join(__dirname, "files", campaign, "byDayCampaignSalesSum.json")
    )
  );
  const storageCostForArt =
    storageCost / byDayCampaignSalesSum.fullLastWeek.count;

  // const path_cost_by_art = path.join(
  //   __dirname,
  //   "files",
  //   "storageCost by art.json"
  // );
  // let storageCostByArt = {};
  // if (afs.existsSync(path_cost_by_art))
  //   storageCostByArt = JSON.parse(afs.readFileSync(path_cost_by_art));
  // storageCostByArt[campaign] = storageCostForArt;
  // afs.writeFileSync(path_cost_by_art, JSON.stringify(storageCostByArt));
  // ------------------------

  const path_profit_trend = path.join(
    __dirname,
    "files",
    campaign,
    "profitTrend.json"
  );
  let profit_trend = { current: 0, previous: 0 };
  if (afs.existsSync(path_profit_trend))
    profit_trend = JSON.parse(afs.readFileSync(path_profit_trend));
  profit_trend.previous = profit_trend.current;
  profit_trend.current = 0;

  const advertStatsByArtByDay = JSON.parse(
    afs.readFileSync(
      path.join(__dirname, "files", campaign, "advert stats by art by day.json")
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
  const today_date_str = new Date(
    new Date()
      .toLocaleDateString("ru-RU")
      .replace(/(\d{2})\.(\d{2})\.(\d{4})/, "$3-$2-$1")
  )
    .toISOString()
    .slice(0, 10);
  let new_data = [[]];
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

    const ad = spp_price * (arts_data[vendorCode].ad / 100);
    const drr = ad / spp_price;
    const drr_art_week = fullWeekArtStats[vendorCode]
      ? fullWeekArtStats[vendorCode].drr
      : 0;
    const advert_sum_art_today = advertStatsByArtByDay[vendorCode]
      ? advertStatsByArtByDay[vendorCode][today_date_str]
        ? advertStatsByArtByDay[vendorCode][today_date_str].sum
        : 0
      : 0;
    // console.log(today_date_str, vendorCode, drr_art_today);

    const profit =
      -ad -
      commission -
      delivery -
      storageCostForArt -
      tax -
      expences -
      prime_cost +
      roz_price;
    // console.log(vendorCode, profit, ad, commission, delivery, storageCostForArt, tax, expences, prime_cost, roz_price);
    const roi = profit / (prime_cost + expences);
    const rentabelnost = profit / spp_price;

    const realZakaz = !stock
      ? zakaz > mult * min_zakaz
        ? zakaz
        : mult * min_zakaz
      : zakaz > 0
      ? zakaz
      : 0;

    const profit_today = !stock
      ? 0
      : (campaign == "TKS" ? expences : profit) * per_day;
    profit_trend.current += isNaN(profit_today) ? 0 : profit_today;

    new_data.push([
      vendorCode,
      realZakaz,
      el.price,
      el.discount,
      roz_price, // розничная стоимость
      arts_data[vendorCode].spp / 100,
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
      storageCostForArt,
      tax,
      expences,
      ad,
      drr,
      drr_art_week,
      advert_sum_art_today,
      profit_today,
    ]);
  });
  // console.log(new_data);

  new_data[0] = [
    "Артикул продавца",
    "ЗАКАЗАТЬ",
    "Текущая розн. цена (до скидки)",
    "Текущая скидка на сайте, %",
    "Цена со скидкой",
    "%CПП",
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
    "Хранение",
    "Налоги",
    "Расходы",
    "Реклама",
    "%ДРР",
    "%ДРР/АРТ неделя",
    "Рек. сегодня",
    `${Math.round(profit_trend.current)} Профит сегодня`,
  ];

  // -------------------------
  const hour_key = new Date().toLocaleTimeString("ru-RU").slice(0, 2);
  if (["05", "08", "11", "14", "17", "20", "23"].includes(hour_key) && rewriteProfit) 
    afs.writeFileSync(path_profit_trend, JSON.stringify(profit_trend));
  // -------------------------

  new_data = sortData(new_data); // Sort the data
  return xlsx.build([{ name: "Общий отчёт", data: new_data }]);
};

const writeDataToXlsx = (data, campaign, rewriteProfit = false) => {
  const buffer = buildXlsx(data, campaign, rewriteProfit);
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
      sizes: item.sizes,
      colors: item.colors,
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
  // const this_month = new Date(
  //   new Date()
  //     .toLocaleDateString("ru-RU")
  //     .replace(/(\d{2})\.(\d{2})\.(\d{4})/, "$3-$2-$1")
  //     .slice(0, 7)
  // );
  const this_month = new Date();
  this_month.setDate(this_month.getDate() - 31);
  data.forEach((item) => {
    if (item.status == 7 && new Date(item.endTime) < this_month) return;
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
    .then(() => console.log("KTerrors.json created."))
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
  const now = new Date();
  // new Date()
  // .toLocaleDateString("ru-RU")
  // .replace(/(\d{2})\.(\d{2})\.(\d{4})/, "$3-$2-$1")
  const dateFrom = new Date(date);
  console.log(now, dateFrom);
  const jsonData = {};
  const orderSumJsonData = {};
  const jsonDataByNow = { today: {}, yesterday: {} };
  const orderSumJsonDataByNow = { today: {}, yesterday: {} };
  const byDayCampaignSum = {};

  const vendorCodes = JSON.parse(
    afs.readFileSync(
      path.join(__dirname, "files", campaign, "vendorCodes.json")
    )
  );

  const excluded = { excluded: [] };
  data.forEach((item) => {
    const supplierArticle = item.supplierArticle.replace(/\s/g, "");
    const get_item_price = () => {
      return item.totalPrice * (1 - item.discountPercent / 100);
    };
    const get_normalized_price = (
      cur_count,
      cur_sum,
      log = false,
      dop = ""
    ) => {
      const price = get_item_price();
      const res_if_violated = cur_count ? cur_sum / cur_count : 500;
      if (log && supplierArticle.includes("ПР_90")) {
        console.log(
          dop,
          supplierArticle,
          price <= 3000 ? price : res_if_violated
        );
      }
      if (price <= 3000) return price;
      // console.log(item, price);
      return res_if_violated;
    };

    const order_date = new Date(item.date);
    if (order_date < dateFrom) {
      excluded.excluded.push({
        order_date: order_date,
        supplierArticle: supplierArticle,
        reason: "Date less than dateFrom",
      });
      return;
    }
    const order_date_string = item.date.slice(0, 10);
    if (item.isCancel /*|| order_date_string == today*/) {
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

    if (!(order_date_string in orderSumJsonData)) {
      orderSumJsonData[order_date_string] = {};
      for (key in vendorCodes) {
        orderSumJsonData[order_date_string][vendorCodes[key]] = 0;
      }
      // console.log(orderSumJsonData[order_date_string]);
    }
    if (!(supplierArticle in jsonData[order_date_string])) {
      jsonData[order_date_string][supplierArticle] = 0;
      orderSumJsonData[order_date_string][supplierArticle] = 0;
    }

    orderSumJsonData[order_date_string][supplierArticle] +=
      get_normalized_price(
        jsonData[order_date_string][supplierArticle],
        orderSumJsonData[order_date_string][supplierArticle]
      );
    jsonData[order_date_string][supplierArticle] += 1;

    // ---------------------------
    if (!(order_date_string in byDayCampaignSum))
      byDayCampaignSum[order_date_string] = { count: 0, sum: 0 };
    byDayCampaignSum[order_date_string].sum += get_normalized_price(
      jsonData[order_date_string][supplierArticle],
      orderSumJsonData[order_date_string][supplierArticle]
    );
    byDayCampaignSum[order_date_string].count += 1;
    // ---------------------------

    // by now
    const today_string = now
      .toLocaleDateString("ru-RU")
      .replace(/(\d{2})\.(\d{2})\.(\d{4})/, "$3-$2-$1")
      .slice(0, 10);

    const yesterday = new Date();
    yesterday.setDate(now.getDate() - 1);
    const yesterday_string = yesterday
      .toLocaleDateString("ru-RU")
      .replace(/(\d{2})\.(\d{2})\.(\d{4})/, "$3-$2-$1")
      .slice(0, 10);

    // console.log(now, yesterday);
    if (order_date_string == today_string) {
      if (!(supplierArticle in jsonDataByNow.today)) {
        jsonDataByNow.today[supplierArticle] = 0;
        orderSumJsonDataByNow.today[supplierArticle] = 0;
      }
      if (new Date(item.date) <= now) {
        orderSumJsonDataByNow.today[supplierArticle] += get_normalized_price(
          jsonDataByNow.today[supplierArticle],
          orderSumJsonDataByNow.today[supplierArticle]
          // true,
          // "today"
        );
        jsonDataByNow.today[supplierArticle] += 1;
      }
      // if (supplierArticle == "ПР_160_ФИОЛЕТОВЫЙ_ОТК")
      // console.log(item, orderSumJsonDataByNow.today[supplierArticle]);
    }
    if (order_date_string == yesterday_string) {
      if (!(supplierArticle in jsonDataByNow.yesterday)) {
        jsonDataByNow.yesterday[supplierArticle] = 0;
        orderSumJsonDataByNow.yesterday[supplierArticle] = 0;
      }
      if (new Date(item.date) <= yesterday) {
        orderSumJsonDataByNow.yesterday[supplierArticle] +=
          get_normalized_price(
            jsonDataByNow.yesterday[supplierArticle],
            orderSumJsonDataByNow.yesterday[supplierArticle]
            // true,
            // "yesterday"
          );
        jsonDataByNow.yesterday[supplierArticle] += 1;

        // if (supplierArticle == "ПР_160_ФИОЛЕТОВЫЙ_ОТК")
        // console.log(item, orderSumJsonDataByNow.yesterday[supplierArticle]);
      }
    }
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
    fs.writeFile(
      path.join(__dirname, "files", campaign, "orders by now.json"),
      JSON.stringify(jsonDataByNow)
    ),
    fs.writeFile(
      path.join(__dirname, "files", campaign, "sum of orders by now.json"),
      JSON.stringify(orderSumJsonDataByNow)
    ),
    fs.writeFile(
      path.join(__dirname, "files", campaign, "byDayCampaignSum.json"),
      JSON.stringify(byDayCampaignSum)
    ),
  ])
    .then(() => console.log("orders by days.json created."))
    .catch((error) => console.error(error));
};

const calcStatsTrendsAndWtriteToJSON = (campaign) =>
  new Promise((resolve, reject) => {
    const jsonData = {
      today: {
        orders: 0,
        sum_orders: 0,
        avg_bill: 0,
        sum_advert: 0,
        drr: 0,
        profit: 0,
      },
      yesterday: {
        orders: 0,
        sum_orders: 0,
        avg_bill: 0,
        sum_advert: 0,
        drr: 0,
        profit: 0,
      },
      trend: {
        orders: 0,
        sum_orders: 0,
        avg_bill: 0,
        sum_advert: 0,
        drr: 0,
        profit: 0,
      },
    };

    const get_normalized_price = (item) => {
      const price = item.totalPrice * (1 - item.discountPercent / 100);
      if (price <= 3000) return price;
      return 500;
    };

    const orders = JSON.parse(
      afs.readFileSync(
        path.join(__dirname, "files", campaign, "orders_full.json")
      )
    );
    const advertStatsMpManagerLog = JSON.parse(
      afs.readFileSync(
        path.join(__dirname, "files", campaign, "advertStatsMpManagerLog.json")
      )
    );
    const profit_trend = JSON.parse(
      afs.readFileSync(
        path.join(__dirname, "files", campaign, "profitTrend.json")
      )
    );

    const today = new Date();
    const today_string = today
      .toLocaleDateString("ru-RU")
      .replace(/(\d{2})\.(\d{2})\.(\d{4})/, "$3-$2-$1")
      .slice(0, 10);

    const yesterday = new Date();
    yesterday.setDate(yesterday.getDate() - 1);
    const yesterday_string = yesterday
      .toLocaleDateString("ru-RU")
      .replace(/(\d{2})\.(\d{2})\.(\d{4})/, "$3-$2-$1")
      .slice(0, 10);

    // console.log(now, yesterday);

    // orders ------------------------------------------------------------
    for (const [index, item] of Object.entries(orders)) {
      const order_date = new Date(item.date);
      const order_date_string = order_date
        .toLocaleDateString("ru-RU")
        .replace(/(\d{2})\.(\d{2})\.(\d{4})/, "$3-$2-$1")
        .slice(0, 10);

      if (order_date_string == today_string) {
        if (order_date <= today) {
          jsonData.today.sum_orders += get_normalized_price(item);
          jsonData.today.orders += 1;
        }
      }
      if (order_date_string == yesterday_string) {
        if (order_date <= yesterday) {
          jsonData.yesterday.sum_orders += get_normalized_price(item);
          jsonData.yesterday.orders += 1;
        }
      }
    }
    jsonData.today.avg_bill = jsonData.today.sum_orders / jsonData.today.orders;
    jsonData.yesterday.avg_bill =
      jsonData.yesterday.sum_orders / jsonData.yesterday.orders;

    // /orders ------------------------------------------------------------

    // adverts ------------------------------------------------------------
    const hour_key = today.toLocaleTimeString("ru-RU").slice(0, 2);
    for (const [rk_id, item] of Object.entries(
      advertStatsMpManagerLog.today[hour_key]
    )) {
      const order_date = new Date(item.createdAt);
      const order_date_string = order_date
        .toLocaleDateString("ru-RU")
        .replace(/(\d{2})\.(\d{2})\.(\d{4})/, "$3-$2-$1")
        .slice(0, 10);

      // console.log(item, today_string, order_date_string);
      if (order_date_string == today_string) {
        jsonData.today.sum_advert += item.cost;
      }
    }
    if (advertStatsMpManagerLog.yesterday[hour_key])
      for (const [rk_id, item] of Object.entries(
        advertStatsMpManagerLog.yesterday[hour_key]
      )) {
        const order_date = new Date(item.createdAt);
        const order_date_string = order_date
          .toLocaleDateString("ru-RU")
          .replace(/(\d{2})\.(\d{2})\.(\d{4})/, "$3-$2-$1")
          .slice(0, 10);

        if (order_date_string == yesterday_string) {
          jsonData.yesterday.sum_advert += item.cost;
        }
      }
    jsonData.today.drr =
      (jsonData.today.sum_advert / jsonData.today.sum_orders) * 100;
    jsonData.yesterday.drr =
      (jsonData.yesterday.sum_advert / jsonData.yesterday.sum_orders) * 100;

    // /adverts ------------------------------------------------------------

    // profit ------------------------------------------------------------
    jsonData.today.profit = profit_trend.current;
    jsonData.yesterday.profit = profit_trend.previous;
    // /profit ------------------------------------------------------------

    for (const [metric, val] of Object.entries(jsonData.trend)) {
      jsonData.trend[metric] =
        -1 * (jsonData.yesterday[metric] / jsonData.today[metric] - 1);
    }
    jsonData.trend.drr = jsonData.today.drr - jsonData.yesterday.drr;
    return fs
      .writeFile(
        path.join(__dirname, "files", campaign, "metricTrends.json"),
        JSON.stringify(jsonData)
      )
      .then(() => {
        console.log("orders by days.json created.");
        resolve();
      })
      .catch((error) => console.error(error));
  });

const writeSalesToJson = (data, campaign, date) => {
  const now = new Date();
  // new Date()
  // .toLocaleDateString("ru-RU")
  // .replace(/(\d{2})\.(\d{2})\.(\d{4})/, "$3-$2-$1")
  const dateFrom = new Date(date);
  console.log(now, dateFrom);
  const jsonData = {};
  const orderSumJsonData = {};
  const jsonDataByNow = { today: {}, yesterday: {} };
  const orderSumJsonDataByNow = { today: {}, yesterday: {} };
  const byDayCampaignSum = {};

  const vendorCodes = JSON.parse(
    afs.readFileSync(
      path.join(__dirname, "files", campaign, "vendorCodes.json")
    )
  );

  const excluded = { excluded: [] };
  data.forEach((item) => {
    const supplierArticle = item.supplierArticle.replace(/\s/g, "");
    const get_item_price = () => {
      return item.totalPrice * (1 - item.discountPercent / 100);
    };
    const get_normalized_price = (
      cur_count,
      cur_sum,
      log = false,
      dop = ""
    ) => {
      const price = get_item_price();
      const res_if_violated = cur_count ? cur_sum / cur_count : 500;
      if (log && supplierArticle.includes("ПР_90")) {
        console.log(
          dop,
          supplierArticle,
          price <= 3000 ? price : res_if_violated
        );
      }
      if (price <= 3000) return price;
      // console.log(item, price);
      return res_if_violated;
    };

    const order_date = new Date(item.date);
    if (order_date < dateFrom) {
      excluded.excluded.push({
        order_date: order_date,
        supplierArticle: supplierArticle,
        reason: "Date less than dateFrom",
      });
      return;
    }
    const order_date_string = item.date.slice(0, 10);
    if (item.isCancel /*|| order_date_string == today*/) {
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

    if (!(order_date_string in orderSumJsonData)) {
      orderSumJsonData[order_date_string] = {};
      for (key in vendorCodes) {
        orderSumJsonData[order_date_string][vendorCodes[key]] = 0;
      }
      // console.log(orderSumJsonData[order_date_string]);
    }
    if (!(supplierArticle in jsonData[order_date_string])) {
      jsonData[order_date_string][supplierArticle] = 0;
      orderSumJsonData[order_date_string][supplierArticle] = 0;
    }

    orderSumJsonData[order_date_string][supplierArticle] +=
      get_normalized_price(
        jsonData[order_date_string][supplierArticle],
        orderSumJsonData[order_date_string][supplierArticle]
      );
    jsonData[order_date_string][supplierArticle] += 1;

    // ---------------------------
    if (!(order_date_string in byDayCampaignSum))
      byDayCampaignSum[order_date_string] = { count: 0, sum: 0 };
    byDayCampaignSum[order_date_string].sum += get_normalized_price(
      jsonData[order_date_string][supplierArticle],
      orderSumJsonData[order_date_string][supplierArticle]
    );
    byDayCampaignSum[order_date_string].count += 1;
    // ---------------------------
  });

  // calc full week campaign sum
  const fullWeekCampaignSalesSum = { count: 0, sum: 0 };
  {
    const prevMonday = new Date();
    prevMonday.setDate(
      prevMonday.getDate() - 7 - ((prevMonday.getDay() + 6) % 7)
    );
    // console.log('Last monday:', prevMonday);
    for (let i = 0; i < 7; i++) {
      // last full week
      const cur_date = new Date(prevMonday);
      cur_date.setDate(prevMonday.getDate() + i);
      const str_date = cur_date
        .toLocaleDateString("ru-RU")
        .replace(/(\d{2})\.(\d{2})\.(\d{4})/, "$3-$2-$1")
        .slice(0, 10);

      // console.log(str_date);
      if (!byDayCampaignSum[str_date]) continue;
      fullWeekCampaignSalesSum.count += byDayCampaignSum[str_date].count;
      fullWeekCampaignSalesSum.sum += byDayCampaignSum[str_date].sum;
    }
  }
  byDayCampaignSum["fullLastWeek"] = fullWeekCampaignSalesSum;
  fs.writeFile(
    path.join(__dirname, "files", campaign, "excluded_sales.json"),
    JSON.stringify(excluded)
  ).then(() => console.log("excluded_sales.xlsx created."));
  return Promise.all([
    fs.writeFile(
      path.join(__dirname, "files", campaign, "sales by day.json"),
      JSON.stringify(jsonData)
    ),
    fs.writeFile(
      path.join(__dirname, "files", campaign, "sum of sales by day.json"),
      JSON.stringify(orderSumJsonData)
    ),
    fs.writeFile(
      path.join(__dirname, "files", campaign, "byDayCampaignSalesSum.json"),
      JSON.stringify(byDayCampaignSum)
    ),
  ])
    .then(() => console.log("sales by days.json created."))
    .catch((error) => console.error(error));
};

const calcOrdersFromDetailedByPeriodAndWriteToJSON = (campaign) => {
  const detailedByPeriodFull = JSON.parse(
    afs.readFileSync(
      path.join(__dirname, "files", campaign, "detailedByPeriod_full.json")
    )
  );
  const vendorCodes = JSON.parse(
    afs.readFileSync(
      path.join(__dirname, "files", campaign, "vendorCodes.json")
    )
  );
  const createBlank = () => {
    const result = {};
    for (const [art, key] of Object.entries(vendorCodes)) {
      result[key] = 0;
    }
    return result;
  };
  const temp = {};
  const jsonData = {};
  for (const [index, realization] of Object.entries(detailedByPeriodFull)) {
    if (!(realization.rid in temp)) temp[realization.rid] = true;
    else continue;
    // console.log(index, realization);
    // if (realization.doc_type_name != "Продажа") continue;
    if (!realization.order_dt) continue;
    const date = realization.order_dt.slice(0, 10);
    if (!(date in jsonData)) jsonData[date] = createBlank();
    jsonData[date][realization.sa_name] += 1;
  }
  console.log(jsonData, temp);
  return fs
    .writeFile(
      path.join(__dirname, "files", campaign, "orders by day.json"),
      JSON.stringify(jsonData)
    )
    .then(() => console.log("orders by day.json created."))
    .catch((error) => console.error(error));
};

const calcAvgDrrByArtAndWriteToJSON = (campaign) => {
  const advertStatsByArtByDay = JSON.parse(
    afs.readFileSync(
      path.join(__dirname, "files", campaign, "advert stats by art by day.json")
    )
  );
  const vendorCodes = JSON.parse(
    afs.readFileSync(
      path.join(__dirname, "files", campaign, "vendorCodes.json")
    )
  );
  const orders = JSON.parse(
    afs.readFileSync(
      path.join(__dirname, "files", campaign, "orders by day.json")
    )
  );
  const sum_orders = JSON.parse(
    afs.readFileSync(
      path.join(__dirname, "files", campaign, "sum of orders by day.json")
    )
  );

  const calc_adv_stats = (art) => {
    const result = {
      views: 0,
      clicks: 0,
      sum: 0,
      ctr: 0,
      cpm: 0,
      cpc: 0,
      orders: 0,
      sum_orders: 0,
      drr: 0,
    };
    const artData = advertStatsByArtByDay[art];
    if (!artData) return result;
    const today_date = new Date();
    for (let i = 2; i <= 8; i++) {
      // last full week
      const cur_date = new Date();
      cur_date.setDate(today_date.getDate() - i);
      const str_date = cur_date
        .toLocaleDateString("ru-RU")
        .replace(/(\d{2})\.(\d{2})\.(\d{4})/, "$3-$2-$1")
        .slice(0, 10);

      // console.log(nms_to_sum_orders);
      if (!orders[str_date]) continue;
      for (const [_art, value] of Object.entries(orders[str_date])) {
        if (art != _art) continue;
        result.orders += value;
      }
      for (const [_art, value] of Object.entries(sum_orders[str_date])) {
        if (art != _art) continue;
        result.sum_orders += value;
      }

      if (!artData[str_date]) continue;
      // console.log(str_date);

      result.views += artData[str_date].views ?? 0;
      result.clicks += artData[str_date].clicks ?? 0;
      result.sum += artData[str_date].sum ?? 0;
      if (result.views) result.ctr = result.clicks / result.views;
      if (result.views) result.cpm = result.sum / (result.views / 1000);
      if (result.clicks) result.cpc = result.sum / result.clicks;
      // console.log(result);
    }
    result.drr = result.sum / result.sum_orders;
    // result.drr = result.sum_orders ? result.sum / result.sum_orders : 0;
    // console.log(result);
    return result;
  };

  const jsonData = {};
  for (const [id, art] of Object.entries(vendorCodes)) {
    jsonData[art] = calc_adv_stats(art);
  }
  return fs
    .writeFile(
      path.join(__dirname, "files", campaign, "fullWeekArtStats.json"),
      JSON.stringify(jsonData)
    )
    .then(() => console.log("fullWeekArtStats.json created."))
    .catch((error) => console.error(error));
};

const getAdvertStatByMaskByDayAndWriteToJSON = async (campaign) => {
  const advertInfos = JSON.parse(
    afs.readFileSync(
      path.join(__dirname, "files", campaign, "advertInfos.json")
    )
  );
  const advertStats = JSON.parse(
    afs.readFileSync(
      path.join(__dirname, "files", campaign, "advertStats.json")
    )
  );
  const vendorCodes = JSON.parse(
    afs.readFileSync(
      path.join(__dirname, "files", campaign, "vendorCodes.json")
    )
  );
  let asdad = 0;
  const get_proper_mask = (temp_mask) => {
    const mask_splitted = temp_mask.split("_");
    if (campaign != "delicatus" || !temp_mask.includes("КПБ"))
      mask_splitted.pop();
    if (temp_mask.includes("НАМАТРАСНИК")) {
      if (campaign == "delicatus") mask_splitted.pop();
    }
    return mask_splitted.join("_");
  };
  const jsonData = {};
  const jsonDataByArt = {};
  jsonData[campaign] = {};
  for (const [name, rkData] of Object.entries(advertStats)) {
    for (const [index, day] of Object.entries(rkData.days)) {
      const date = day.date.slice(0, 10);
      // console.log(date);
      for (const [index, app] of Object.entries(day.apps)) {
        for (const [index, nm] of Object.entries(app.nm)) {
          if (!vendorCodes[nm.nmId] || !nm.nmId) {
            // console.log(nm.nmId, vendorCodes[nm.nmId]);
            continue;
          }

          // const mask = get_proper_mask(
          //   getMaskFromVendorCode(vendorCodes[nm.nmId])
          // );
          const art = vendorCodes[nm.nmId];
          if (!(art in jsonDataByArt)) jsonDataByArt[art] = {};
          if (!(date in jsonDataByArt[art]))
            jsonDataByArt[art][date] = {
              views: 0,
              clicks: 0,
              unique_users: 0,
              sum: 0,
              ctr: 0,
              cpm: 0,
              cpc: 0,
            };
          jsonDataByArt[art][date].views += nm.views ?? 0;
          jsonDataByArt[art][date].clicks += nm.clicks ?? 0;
          jsonDataByArt[art][date].unique_users += nm.unique_users ?? 0;
          jsonDataByArt[art][date].sum += nm.sum ?? 0;
          if (jsonDataByArt[art][date].views)
            jsonDataByArt[art][date].ctr =
              jsonDataByArt[art][date].clicks / jsonDataByArt[art][date].views;
          if (jsonDataByArt[art][date].views)
            jsonDataByArt[art][date].cpm =
              jsonDataByArt[art][date].sum /
              (jsonDataByArt[art][date].views / 1000);
          if (jsonDataByArt[art][date].clicks)
            jsonDataByArt[art][date].cpc =
              jsonDataByArt[art][date].sum / jsonDataByArt[art][date].clicks;

          const mask = getMaskFromVendorCode(art);
          if (!(mask in jsonData)) jsonData[mask] = {};
          if (!(date in jsonData[mask]))
            jsonData[mask][date] = {
              views: 0,
              clicks: 0,
              unique_users: 0,
              sum: 0,
              ctr: 0,
              cpm: 0,
              cpc: 0,
            };
          jsonData[mask][date].views += nm.views ?? 0;
          jsonData[mask][date].clicks += nm.clicks ?? 0;
          jsonData[mask][date].unique_users += nm.unique_users ?? 0;
          jsonData[mask][date].sum += nm.sum ?? 0;
          if (jsonData[mask][date].views)
            jsonData[mask][date].ctr =
              jsonData[mask][date].clicks / jsonData[mask][date].views;
          if (jsonData[mask][date].views)
            jsonData[mask][date].cpm =
              jsonData[mask][date].sum / (jsonData[mask][date].views / 1000);
          if (jsonData[mask][date].clicks)
            jsonData[mask][date].cpc =
              jsonData[mask][date].sum / jsonData[mask][date].clicks;

          /////// full campaign sums
          if (!(date in jsonData[campaign]))
            jsonData[campaign][date] = {
              views: 0,
              clicks: 0,
              unique_users: 0,
              sum: 0,
              ctr: 0,
              cpm: 0,
              cpc: 0,
            };
          jsonData[campaign][date].views += nm.views ?? 0;
          jsonData[campaign][date].clicks += nm.clicks ?? 0;
          jsonData[campaign][date].unique_users += nm.unique_users ?? 0;
          jsonData[campaign][date].sum += nm.sum ?? 0;
          if (jsonData[campaign][date].views)
            jsonData[campaign][date].ctr =
              jsonData[campaign][date].clicks / jsonData[campaign][date].views;
          if (jsonData[campaign][date].views)
            jsonData[campaign][date].cpm =
              jsonData[campaign][date].sum /
              (jsonData[campaign][date].views / 1000);
          if (jsonData[campaign][date].clicks)
            jsonData[campaign][date].cpc =
              jsonData[campaign][date].sum / jsonData[campaign][date].clicks;
        }
      }
    }
  }
  // console.log(jsonData, asdad);

  return fs
    .writeFile(
      path.join(
        __dirname,
        "files",
        campaign,
        "advert stats by art by day.json"
      ),
      JSON.stringify(jsonDataByArt)
    )
    .then(() =>
      fs
        .writeFile(
          path.join(
            __dirname,
            "files",
            campaign,
            "advert stats by mask by day.json"
          ),
          JSON.stringify(jsonData)
        )
        .then(() => console.log("advert stats by mask by day.json created."))
        .catch((error) => console.error(error))
    )
    .catch((error) => console.error(error));
};

const getAdvertStatByMaskByDayAndWriteToJSONMpManager = async (campaign) => {
  const advertStats = JSON.parse(
    afs.readFileSync(
      path.join(__dirname, "files", campaign, "advertStatsMpManager.json")
    )
  );
  const vendorCodes = JSON.parse(
    afs.readFileSync(
      path.join(__dirname, "files", campaign, "vendorCodes.json")
    )
  );
  const jsonDataByArt = {};
  const jsonData = {};
  let a = 0;
  jsonData[campaign] = {};
  for (const [name, rkData] of Object.entries(advertStats)) {
    for (const [index, artData] of Object.entries(rkData)) {
      const date = artData.createdAt.slice(0, 10);
      const art_id = artData.vendorCode;

      // const mask = get_proper_mask(
      //   getMaskFromVendorCode(vendorCodes[nm.nmId])
      // );

      if (!(date in jsonData[campaign]))
        jsonData[campaign][date] = {
          views: 0,
          clicks: 0,
          unique_users: 0,
          sum: 0,
          ctr: 0,
          cpm: 0,
          cpc: 0,
        };
      jsonData[campaign][date].views += artData.views ?? 0;
      jsonData[campaign][date].clicks += artData.clicks ?? 0;
      jsonData[campaign][date].sum += artData.cost ?? 0;
      if (jsonData[campaign][date].views)
        jsonData[campaign][date].ctr =
          jsonData[campaign][date].clicks / jsonData[campaign][date].views;
      if (jsonData[campaign][date].views)
        jsonData[campaign][date].cpm =
          jsonData[campaign][date].sum /
          (jsonData[campaign][date].views / 1000);
      if (jsonData[campaign][date].clicks)
        jsonData[campaign][date].cpc =
          jsonData[campaign][date].sum / jsonData[campaign][date].clicks;

      /////// full campaign sums

      if (!vendorCodes[art_id] || !art_id) {
        console.log(art_id, date);
        continue;
      }
      const art = vendorCodes[art_id];
      if (!(art in jsonDataByArt)) jsonDataByArt[art] = {};
      if (!(date in jsonDataByArt[art]))
        jsonDataByArt[art][date] = {
          views: 0,
          clicks: 0,
          sum: 0,
          ctr: 0,
          cpm: 0,
          cpc: 0,
        };
      jsonDataByArt[art][date].views += artData.views ?? 0;
      jsonDataByArt[art][date].clicks += artData.clicks ?? 0;
      jsonDataByArt[art][date].unique_users += artData.unique_users ?? 0;
      jsonDataByArt[art][date].sum += artData.cost ?? 0;
      if (jsonDataByArt[art][date].views)
        jsonDataByArt[art][date].ctr =
          jsonDataByArt[art][date].clicks / jsonDataByArt[art][date].views;
      if (jsonDataByArt[art][date].views)
        jsonDataByArt[art][date].cpm =
          jsonDataByArt[art][date].sum /
          (jsonDataByArt[art][date].views / 1000);
      if (jsonDataByArt[art][date].clicks)
        jsonDataByArt[art][date].cpc =
          jsonDataByArt[art][date].sum / jsonDataByArt[art][date].clicks;

      const mask = getMaskFromVendorCode(art);

      if (!(mask in jsonData)) jsonData[mask] = {};

      if (!(date in jsonData[mask]))
        jsonData[mask][date] = {
          views: 0,
          clicks: 0,
          sum: 0,
          ctr: 0,
          cpm: 0,
          cpc: 0,
        };
      jsonData[mask][date].views += artData.views ?? 0;
      jsonData[mask][date].clicks += artData.clicks ?? 0;
      jsonData[mask][date].sum += artData.cost ?? 0;
      if (jsonData[mask][date].views)
        jsonData[mask][date].ctr =
          jsonData[mask][date].clicks / jsonData[mask][date].views;
      if (jsonData[mask][date].views)
        jsonData[mask][date].cpm =
          jsonData[mask][date].sum / (jsonData[mask][date].views / 1000);
      if (jsonData[mask][date].clicks)
        jsonData[mask][date].cpc =
          jsonData[mask][date].sum / jsonData[mask][date].clicks;
    }
  }

  return fs
    .writeFile(
      path.join(
        __dirname,
        "files",
        campaign,
        "advert stats by art by day.json"
      ),
      JSON.stringify(jsonDataByArt)
    )
    .then(() =>
      fs
        .writeFile(
          path.join(
            __dirname,
            "files",
            campaign,
            "advert stats by mask by day.json"
          ),
          JSON.stringify(jsonData)
        )
        .then(() => console.log("advert stats by mask by day.json created."))
        .catch((error) => console.error(error))
    )
    .catch((error) => console.error(error));
};

const getAdvertStatByDayAndWriteToJSONMpManager = async (campaign) => {
  const advertStats = JSON.parse(
    afs.readFileSync(
      path.join(__dirname, "files", campaign, "advertStatsMpManager.json")
    )
  );
  const vendorCodes = JSON.parse(
    afs.readFileSync(
      path.join(__dirname, "files", campaign, "vendorCodes.json")
    )
  );
  const jsonData = {};
  jsonData[campaign] = {};
  for (const [rk_name, rkData] of Object.entries(advertStats)) {
    for (const [index, artData] of Object.entries(rkData)) {
      const date = artData.createdAt.slice(0, 10);
      if (!(rk_name in jsonData)) jsonData[rk_name] = {};

      if (!(date in jsonData[rk_name]))
        jsonData[rk_name][date] = {
          views: 0,
          clicks: 0,
          sum: 0,
          ctr: 0,
          cpm: 0,
          cpc: 0,
        };
      jsonData[rk_name][date].views += artData.views ?? 0;
      jsonData[rk_name][date].clicks += artData.clicks ?? 0;
      jsonData[rk_name][date].sum += artData.cost ?? 0;
      if (jsonData[rk_name][date].views)
        jsonData[rk_name][date].ctr =
          jsonData[rk_name][date].clicks / jsonData[rk_name][date].views;
      if (jsonData[rk_name][date].views)
        jsonData[rk_name][date].cpm =
          jsonData[rk_name][date].sum / (jsonData[rk_name][date].views / 1000);
      if (jsonData[rk_name][date].clicks)
        jsonData[rk_name][date].cpc =
          jsonData[rk_name][date].sum / jsonData[rk_name][date].clicks;
    }
  }

  return fs
    .writeFile(
      path.join(__dirname, "files", campaign, "advert stats by day.json"),
      JSON.stringify(jsonData)
    )
    .then(() => console.log("advert stats by day.json created."))
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

        const type = getMaskFromVendorCode(item.sa_name);
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

const generateGeneralMaskFormsAndWriteToJSON = () =>
  new Promise((resolve, reject) => {
    const arts_data = JSON.parse(
      afs.readFileSync(path.join(__dirname, "files", "data.json"))
    );
    const jsonData = [];
    for (const [art, art_data] of Object.entries(arts_data)) {
      const generalMask = getGeneralMaskFromVendorCode(art);
      if (!jsonData.includes(generalMask)) {
        jsonData.push(generalMask);
        // if (art.includes("САВ")) console.log(art, generalMask);
      }
      // jsonData.push(mask_array.join("_"));
    }
    jsonData.sort();
    return fs
      .writeFile(
        path.join(__dirname, "files", "generalMasks.json"),
        JSON.stringify(jsonData)
      )
      .then(() => {
        console.log("generalMasks.json created.");
        resolve(jsonData);
      })
      .catch((error) => {
        console.error(error);
        reject(error);
      });
  });

const sendTgBotTrendMessage = (hour_key) =>
  new Promise((resolve, reject) => {
    const campaigns = JSON.parse(
      afs.readFileSync(path.join(__dirname, "files", "campaigns.json"))
    ).campaigns;
    const tg = JSON.parse(
      afs.readFileSync(
        path.join(__dirname, "../secrets/telegram", "secret.json")
      )
    );
    hour_key = String('00' + String(parseInt(hour_key)+1)).slice(-2);
    const campaignNames = {
      mayusha: `Маюша🐝${Array(22).fill(' ').join('')}#${new Date().toLocaleDateString('ru-RU', {weekday: 'short'}).toUpperCase()}_${hour_key}`,
      delicatus: "Деликатус🇸🇪",
      TKS: "Текстиль🏭",
    };
    let text = "";
    const jsonData = {};

    for (const [index, campaign] of Object.entries(campaigns)) {
      const metricTrends = JSON.parse(
        afs.readFileSync(
          path.join(__dirname, "files", campaign, "metricTrends.json")
        )
      );
      for (const [metric, trend] of Object.entries(metricTrends.trend)) {
        jsonData[metric] = `${
          Math.round(metricTrends.today[metric] * (metric == "drr" ? 100 : 1)) /
          (metric == "drr" ? 100 : 1)
        } * [${trend > 0 ? "+" : ""}${
          Math.round(trend * 100) / (metric == "drr" ? 100 : 1)
        }%]`;
      }
      text += `Бренд: ${
        campaignNames[campaign]
      }\nметрики:\n• Сумма заказов: ${jsonData.sum_orders.replace(
        "*",
        "р."
      )}\n• Количество заказов: ${jsonData.orders.replace(
        "*",
        "шт."
      )}\n• Средний чек: ${jsonData.avg_bill.replace(
        "*",
        "р."
      )}\n• Расход на рекламу: ${jsonData.sum_advert.replace(
        "*",
        "р."
      )}\n• ДРР: ${jsonData.drr.replace(" *", "%")}\n• Профит: ${jsonData.profit.replace("*", "р.")}\n\n`;
    }
    const bot = new TelegramBot(tg.token);
    bot.sendMessage(tg.chatIds.dev, text);
    bot.sendMessage(tg.chatIds.prod, text);
    delete bot;
    // jsonData.push(mask_array.join("_"));
    
  });

const updateStorageCost = (storageCostData) =>
  new Promise((resolve, reject) => {
    let storageCost = {};
    if (afs.existsSync(path.join(__dirname, "files", "storageCost.json"))) {
      storageCost = JSON.parse(
        afs.readFileSync(path.join(__dirname, "files", "storageCost.json"))
      );
    }

    const tempPrevMonday = new Date();
    tempPrevMonday.setDate(
      tempPrevMonday.getDate() - ((tempPrevMonday.getDay() + 6) % 7)
    );
    const prevMonday = new Date(tempPrevMonday.toISOString().slice(0, 10));
    let isUpdated = {};
    for (const [campaign, cost] of Object.entries(storageCostData)) {
      if (cost < 1) {
        isUpdated[campaign] = storageCost[campaign]
          ? storageCost[campaign].date == prevMonday.toISOString().slice(0, 10)
            ? true
            : false
          : false;
      } else {
        if (!(campaign in storageCost))
          storageCost[campaign] = { date: "", cost: 0 };

        storageCost[campaign] = {
          date: prevMonday.toISOString().slice(0, 10),
          cost: cost,
        };
        isUpdated[campaign] = true;
      }
    }

    console.log(isUpdated);
    console.log(storageCost);

    return fs
      .writeFile(
        path.join(__dirname, "files", "storageCost.json"),
        JSON.stringify(storageCost)
      )
      .then(() => {
        console.log("storageCost.json created.");
        resolve(isUpdated);
      })
      .catch((error) => {
        console.error(error);
        reject(error);
      });
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

const fetchUnasweredFeedbacksAndWriteToJSON = (campaign) =>
  new Promise(async (resolve, reject) => {
    const authToken = getAuthToken("api-token", campaign);
    const jsonData = {};
    const params = {
      isAnswered: false,
      take: 5000,
      skip: 0,
    };
    await getFeedbacks(authToken, params).then((pr) => {
      const data = pr.data;
      for (const [index, feedback] of Object.entries(data.feedbacks)) {
        console.log(feedback);
        const art = feedback.productDetails.supplierArticle.replace(/\s/g, "");
        if (!art) continue;
        if (!(art in jsonData)) jsonData[art] = [];
        jsonData[art].push(feedback);
      }
      // console.log(jsonData);
      return fs
        .writeFile(
          path.join(__dirname, "files", campaign, "feedbacks.json"),
          JSON.stringify(jsonData)
        )
        .then(() => {
          console.log("feedbacks.json created.");
          resolve();
        })
        .catch((error) => console.error(error));
    });
  });

const answerFeedbacks = (campaign) =>
  new Promise(async (resolve, reject) => {
    const authToken = getAuthToken("api-token", campaign);
    const feedbacks = JSON.parse(
      afs.readFileSync(
        path.join(__dirname, "files", campaign, "feedbacks.json")
      )
    );
    const answerTemplates = JSON.parse(
      afs.readFileSync(
        path.join(__dirname, "files", campaign, "answerTemplates.json")
      )
    );

    for (const [art, art_feedbacks] of Object.entries(feedbacks)) {
      console.log(art, art_feedbacks.length);
      const mask = getMaskFromVendorCode(art);
      const answers = answerTemplates[mask];
      for (const [index, feedback_data] of Object.entries(art_feedbacks)) {
        if (!answers || !answers.length) continue;
        console.log(feedback_data.id, art, mask, answers[0]);
        console.log("");
        await updateFeedback(authToken, {
          id: feedback_data.id,
          text: answers[0],
        });
        await new Promise((resolve) => setTimeout(resolve, 1500));
        // return;
        answers.push(answers.shift());
      }
      answerTemplates[mask] = answers;
    }

    return fs
      .writeFile(
        path.join(__dirname, "files", campaign, "answerTemplates.json"),
        JSON.stringify(answerTemplates)
      )
      .then(() => {
        console.log("answerTemplates.json shifted.");
        resolve();
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

const fetchDataAndWriteToXlsx = (campaign, rewriteProfit = false) => {
  const authToken = getAuthToken("api-token", campaign);
  return getInfo(authToken)
    .then((data) => {
      return writeDataToXlsx(data, campaign, rewriteProfit);
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

const fetchSubjectDictionaryAndWriteToJSON = () => {
  const authToken = getAuthToken("api-advert-token", "mayusha");
  return getSubjectsDictionary(authToken)
    .then((data) => {
      const jsonData = {};
      for (const [index, subject] of Object.entries(data))
        jsonData[subject.name] = subject.id;
      return fs
        .writeFile(
          path.join(__dirname, "files", "subjects.json"),
          JSON.stringify(jsonData)
        )
        .then(() => console.log("subjects.json created."))
        .catch((error) => console.error(error));
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
  const adverts = JSON.parse(
    afs.readFileSync(path.join(__dirname, "files", campaign, "adverts.json"))
  );
  const vendorCodes = JSON.parse(
    afs.readFileSync(
      path.join(__dirname, "files", campaign, "vendorCodes.json")
    )
  );
  const jsonData = {};
  for (const [id, create_dt] of Object.entries(adverts)) {
    // console.log(key, id);
    if (!id) continue;
    const params = { id: id };
    await getAdvertInfo(authToken, params).then(
      (pr) => (jsonData[pr.name] = pr)
    );
    await new Promise((resolve) => setTimeout(resolve, 500));
  }

  // check that RK contains only one type of mask and send(toggleable) inform email if violated
  // const violated_rks = {};
  // for (const [name, rkData] of Object.entries(jsonData)) {
  //   if (rkData.status == 4) continue;
  //   // console.log(campaign, rkData);
  //   const type =
  //     "params" in rkData
  //       ? "standard"
  //       : "autoParams" in rkData
  //       ? "auto"
  //       : "united";
  //   console.log(campaign, rkData);
  //   const nms =
  //     type == "standard"
  //       ? rkData.params[0].nms
  //       : type == "auto"
  //       ? rkData.autoParams.nms
  //       : rkData.unitedParams[0].nms;
  //   const mask = getMaskFromVendorCode(
  //     vendorCodes[type == "standard" ? nms[0].nm : nms[0]]
  //   );
  //   if (mask == "NO_SUCH_MASK_AVAILABLE") {
  //     console.log("NO_SUCH_MASK_AVAILABLE", name, rkData);
  //     continue;
  //   }
  //   console.log(
  //     campaign,
  //     type,
  //     vendorCodes[type == "standard" ? nms[0].nm : nms[0]],
  //     mask
  //   );
  //   for (const [index, nmData] of Object.entries(nms)) {
  //     const nm = type == "standard" ? nmData.nm : nmData;
  //     if (!nm || !vendorCodes[nm]) continue;
  //     if (mask != getMaskFromVendorCode(vendorCodes[nm])) {
  //       if (!(name in violated_rks)) violated_rks[name] = [];
  //       violated_rks[name].push(nm);
  //     }
  //   }
  // }
  // // console.log(violated_rks)
  // fs.writeFile(
  //   path.join(__dirname, "files", campaign, "violatedRKs.json"),
  //   JSON.stringify(violated_rks)
  // )
  //   .then(() => console.log("violatedRKs.json created."))
  //   .catch((error) => console.error(error));
  // if (0) {
  //   sendEmail(
  //     "zavoronok.danila@gmail.com",
  //     "violated",
  //     JSON.stringify(violated_rks, null, 2)
  //   );
  // }

  return fs
    .writeFile(
      path.join(__dirname, "files", campaign, "advertInfos.json"),
      JSON.stringify(jsonData)
    )
    .then(() => console.log("advertInfos.json created."))
    .catch((error) => console.error(error));
};

const createNewRKs = async () => {
  return new Promise(async (resolve, reject) => {
    const artsData = JSON.parse(
      afs.readFileSync(path.join(__dirname, "files", "data.json"))
    );
    const subjects = JSON.parse(
      afs.readFileSync(path.join(__dirname, "files", "subjects.json"))
    );
    const temp_seller_ids = JSON.parse(
      afs.readFileSync(path.join(__dirname, "files", "campaigns.json"))
    ).seller_ids;
    const seller_ids = {};
    for (const [campaign, seller_id] of Object.entries(temp_seller_ids))
      seller_ids[seller_id] = campaign;

    const RKsToCreate = JSON.parse(
      afs.readFileSync(path.join(__dirname, "files/RKsToCreate.json"))
    );

    const rk_types = { Авто: 8 };
    for (const [index, rk_data] of Object.entries(RKsToCreate)) {
      const campaign = seller_ids[artsData[rk_data.art].seller_id];
      if (!campaign) continue;

      const authToken = getAuthToken("api-advert-token", campaign);
      if (rk_data.rk_type == "Авто") {
        console.log(campaign, "Creating", rk_data);
        // continue;

        await createRK(authToken, {
          type: rk_types[rk_data.rk_type],
          name: rk_data.art,
          subjectId: subjects[rk_data.subjects],
          sum: rk_data.budget,
          btype: 1,
        });
        await new Promise((resolve) => setTimeout(resolve, 5000));
      }
    }
    resolve();
  });
};

const setFixedPhrasesForCreatedRKs = async (campaign) => {
  const authToken = getAuthToken("api-advert-token", campaign);
  const advertInfos = JSON.parse(
    afs.readFileSync(
      path.join(__dirname, "files", campaign, "advertInfos.json")
    )
  );
  const RKsToCreate = JSON.parse(
    afs.readFileSync(path.join(__dirname, "files/RKsToCreate.json"))
  );

  for (const [name, rk_data] of Object.entries(advertInfos)) {
    if (rk_data.status != 4) continue;
    let to_create_params = {};
    for (let i = 0; i < RKsToCreate.length; i++)
      if (RKsToCreate[i].art == name) to_create_params = RKsToCreate[i];
    if (!Object.entries(to_create_params)) continue;
    console.log(name, to_create_params);
    // continue;

    console.log(
      campaign,
      "Setting fixed phrases:",
      to_create_params.phrase,
      "for",
      name,
      rk_data.advertId
    );
    // continue;
    const rk_id = rk_data.advertId;
    console.log(
      querystring.stringify({
        id: rk_id,
      }),
      to_create_params.budget
    );
    // continue

    // await updateRKsBudget(
    //   authToken,
    //   querystring.stringify({
    //     id: rk_id,
    //   }),
    //   {
    //     sum: parseInt(String(to_create_params.budget).replace(/\s/g, "")),
    //     type: 1,
    //   }
    // );
    await startRK(authToken, {
      id: rk_id,
    });
    // await updatePlusPhrasesActivity(authToken, {
    //   id: rk_id,
    //   fixed: true,
    // });
    // await updatePlusPhrasesInRK(
    //   authToken,
    //   querystring.stringify({
    //     id: rk_id,
    //   }),
    //   { pluse: [to_create_params.phrase] }
    // );
    await new Promise((resolve) => setTimeout(resolve, 1000));
    continue;
  }
};

const fetchRksBudgetsAndWriteToJSON = async (campaign) => {
  const authToken = getAuthToken("api-advert-token", campaign);
  const adverts = JSON.parse(
    afs.readFileSync(path.join(__dirname, "files", campaign, "adverts.json"))
  );
  const jsonData = {};
  for (const [advertId, unused] of Object.entries(adverts)) {
    if (!advertId) continue;
    const params = { id: advertId };
    await fetchRKsBudget(authToken, params).then((pr) => {
      jsonData[advertId] = pr;
    });
    await new Promise((resolve) => setTimeout(resolve, 500));
  }
  return fs
    .writeFile(
      path.join(__dirname, "files", campaign, "advertBudgets.json"),
      JSON.stringify(jsonData)
    )
    .then(() => console.log("advertBudgets.json created."))
    .catch((error) => console.error(error));
};

const fetchAdvertStatsAndWriteToJson = async (campaign) => {
  const authToken = getAuthToken("api-advert-token", campaign);
  const adverts = JSON.parse(
    afs.readFileSync(
      path.join(__dirname, "files", campaign, "advertInfos.json")
    )
  );
  const retry_query = [];
  const jsonData = {};
  for (const [key, data] of Object.entries(adverts)) {
    if (!data.advertId) continue;
    const params = { id: data.advertId };
    await getAdvertStat(authToken, params)
      .then((pr) => {
        jsonData[key] = pr;
        console.log(campaign, key, data.advertId);
      })
      .catch((er) => retry_query.push(params));
    await new Promise((resolve) => setTimeout(resolve, 20 * 1000));
  }
  if (retry_query.length) {
    console.log(campaign, "TO RETRY:", retry_query);
    await new Promise((resolve) => setTimeout(resolve, 5 * 60 * 1000));

    for (const [index, params] of Object.entries(retry_query)) {
      // console.log(campaign, 'trying:', params);
      await getAdvertStat(authToken, params)
        .then((pr) => {
          jsonData[key] = pr;
          console.log(key, data.advertId);
          retry_query[index] = 0;
        })
        .catch((er) =>
          console.log(campaign, params, er.response ? er.response.data : er)
        );
      await new Promise((resolve) => setTimeout(resolve, 500));
    }
  }
  return fs
    .writeFile(
      path.join(__dirname, "files", campaign, "advertStats.json"),
      JSON.stringify(jsonData)
    )
    .then(() => console.log("advertStats.json created."))
    .catch((error) => console.error(error));
};

const fetchAdvertStatsAndWriteToJsonMpManager = async (campaign) => {
  const authToken = getAuthTokenMpManager("api-token", campaign);
  const adverts = JSON.parse(
    afs.readFileSync(path.join(__dirname, "files", campaign, "adverts.json"))
  );
  const mp_manager_data = JSON.parse(
    afs.readFileSync(
      path.join(__dirname, "../secrets/mp_manager", `${campaign}.json`)
    )
  );

  const jsonData = {};
  const dateTo = new Date();
  const dateFrom = new Date();
  dateFrom.setDate(dateFrom.getDate() - 31);
  for (const [advertId, unused] of Object.entries(adverts)) {
    if (!advertId) continue;
    const params = {
      from: dateFrom
        .toLocaleDateString("ru-RU")
        .replace(/(\d{2})\.(\d{2})\.(\d{4})/, "$3-$2-$1")
        .slice(0, 10),
      to: dateTo
        .toLocaleDateString("ru-RU")
        .replace(/(\d{2})\.(\d{2})\.(\d{4})/, "$3-$2-$1")
        .slice(0, 10),
    };
    await getAdvertStatMpManager(
      authToken,
      params,
      mp_manager_data.organizationId,
      advertId
    ).then((pr) => {
      jsonData[advertId] = pr;
      console.log(campaign, advertId);
    });
    await new Promise((resolve) => setTimeout(resolve, 1 * 300));
  }
  return fs
    .writeFile(
      path.join(__dirname, "files", campaign, "advertStatsMpManager.json"),
      JSON.stringify(jsonData)
    )
    .then(() => console.log("advertStats.json created."))
    .catch((error) => console.error(error));
};

const fetchAdvertStatsAndWriteToJsonMpManagerLog = async (campaign) => {
  const authToken = getAuthTokenMpManager("api-token", campaign);
  const advertInfos = JSON.parse(
    afs.readFileSync(
      path.join(__dirname, "files", campaign, "advertInfos.json")
    )
  );
  const mp_manager_data = JSON.parse(
    afs.readFileSync(
      path.join(__dirname, "../secrets/mp_manager", `${campaign}.json`)
    )
  );

  let jsonData = { today: {}, yesterday: {} };
  if (
    afs.existsSync(
      path.join(__dirname, "files", campaign, "advertStatsMpManagerLog.json")
    )
  )
    jsonData = JSON.parse(
      afs.readFileSync(
        path.join(__dirname, "files", campaign, "advertStatsMpManagerLog.json")
      )
    );

  const dateTo = new Date();
  const dateFrom = new Date(
    dateTo
      .toLocaleDateString("ru-RU")
      .replace(/(\d{2})\.(\d{2})\.(\d{4})/, "$3-$2-$1")
      .slice(0, 10)
  );
  const hour_key = dateTo.toLocaleTimeString("ru-RU").slice(0, 2);
  jsonData.yesterday[hour_key] = jsonData.today[hour_key];
  jsonData.today[hour_key] = [];

  for (const [key, data] of Object.entries(advertInfos)) {
    if (data.status == 7) continue;
    const advertId = data.advertId;
    if (!advertId) continue;
    const params = {
      from: dateFrom
        .toLocaleDateString("ru-RU")
        .replace(/(\d{2})\.(\d{2})\.(\d{4})/, "$3-$2-$1")
        .slice(0, 10),
      to: dateTo
        .toLocaleDateString("ru-RU")
        .replace(/(\d{2})\.(\d{2})\.(\d{4})/, "$3-$2-$1")
        .slice(0, 10),
    };
    await getAdvertStatMpManager(
      authToken,
      params,
      mp_manager_data.organizationId,
      advertId
    ).then((pr) => {
      jsonData.today[hour_key] = jsonData.today[hour_key].concat(pr);
      console.log(campaign, advertId);
    });
    await new Promise((resolve) => setTimeout(resolve, 1 * 300));
  }
  return fs
    .writeFile(
      path.join(__dirname, "files", campaign, "advertStatsMpManagerLog.json"),
      JSON.stringify(jsonData)
    )
    .then(() => console.log("advertStatsLog.json created."))
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
    if (data.status == 7) continue;
    const type =
      "params" in data ? "standard" : "autoParams" in data ? "auto" : "united";
    // console.log(key, id);
    const nms_temp =
      type == "standard"
        ? data.params[0].nms
        : type == "auto"
        ? data.autoParams.nms
        : data.unitedParams[0].nms;
    // console.log(key, data, nms_temp);
    if (type == "standard") {
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

const updateAutoAdvertsInCampaign = async (campaign) => {
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
  const backVendorCodes = {};
  for (const [id, art] of Object.entries(vendorCodes))
    backVendorCodes[art] = parseInt(id);
  const artsData = JSON.parse(
    afs.readFileSync(path.join(__dirname, "files", "data.json"))
  );

  for (const [first_name, data] of Object.entries(advertInfos)) {
    if (data.status == 7) continue;
    const key = data.name;
    console.log(key);
    const type =
      "params" in data ? "standard" : "autoParams" in data ? "auto" : "united";

    if (type != "auto") continue;

    // console.log(key, id);
    const nms_temp =
      type == "standard"
        ? data.params[0].nms
        : type == "auto"
        ? data.autoParams.nms
        : data.unitedParams[0].nms;
    if (type == "auto") {
      if (!artsData[key]) continue;
      console.log(key, data, nms_temp);
      const nms_to_delete = [];
      for (let i = 0; i < nms_temp.length; i++) {
        const id = nms_temp[i];
        if (vendorCodes[id] != key) nms_to_delete.push(id);
      }
      if (nms_temp.length == nms_to_delete.length) {
        console.log(key, "nothing to leave in this RK.");

        await updateArtsInAutoRK(
          authToken,
          querystring.stringify({ id: data.advertId }),
          { delete: [nms_to_delete[0]] }
        );
        await new Promise((resolve) => setTimeout(resolve, 10000));

        await updateArtsInAutoRK(
          authToken,
          querystring.stringify({ id: data.advertId }),
          { add: [backVendorCodes[key]] }
        );
        await new Promise((resolve) => setTimeout(resolve, 10000));
      }
      const params = {
        delete: nms_to_delete,
      };
      console.log(campaign, key, params);
      if (nms_to_delete.length) {
        await updateArtsInAutoRK(
          authToken,
          querystring.stringify({ id: data.advertId }),
          params
        );
      }
      await new Promise((resolve) => setTimeout(resolve, 1000));
      await updatePlacementsInAutoRK(
        authToken,
        querystring.stringify({ id: data.advertId }),
        {
          recom: false,
          booster: true,
          carousel: false,
        }
      );
    }
  }
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
  return new Promise((resolve, reject) => {
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
        fs.writeFile(
          path.join(__dirname, "files", campaign, "orders_full.json"),
          JSON.stringify(data)
        ).then((pr) =>
          writeOrdersToJson(data, campaign, date).then((pr) => resolve())
        );
      })
      .catch((error) => console.error(error));
  });
};

const fetchSalesAndWriteToJSON = (campaign) => {
  return new Promise((resolve, reject) => {
    const authToken = getAuthToken("api-statistic-token", campaign);
    const dateFrom = new Date();
    dateFrom.setDate(dateFrom.getDate() - 30);
    const date = dateFrom.toISOString().slice(0, 10);
    console.log(date);
    const params = {
      dateFrom: date,
    };
    return getSales(authToken, params)
      .then((data) => {
        fs.writeFile(
          path.join(__dirname, "files", campaign, "sales_full.json"),
          JSON.stringify(data)
        ).then((pr) =>
          writeSalesToJson(data, campaign, date).then((pr) => resolve())
        );
      })
      .catch((error) => console.error(error));
  });
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
  const today = new Date(
    new Date()
      .toLocaleDateString("ru-RU")
      .replace(/(\d{2})\.(\d{2})\.(\d{4})/, "$3-$2-$1")
  )
    .toISOString()
    .slice(0, 10);
  const calcAvgOrders = (jsonData, date, avgs = undefined) => {
    if (today == date) {
      // console.log(today, "==", date);
      return jsonData;
    }

    for (const supplierArticle in orders_by_day[date]) {
      if (
        supplierArticle &&
        // stocks[date] &&
        // stocks[date][supplierArticle] && // Stocks based
        // stocks[date][supplierArticle] >= orders_by_day[date][supplierArticle] &&
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
  dateFrom.setDate(dateFrom.getDate() - 8);
  for (const order_data_date in orders_by_day) {
    const order_date = new Date(order_data_date);
    if (dateFrom > new Date(order_data_date)) continue;
    // console.log(order_date, dateFrom);
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
    const mask = getMaskFromVendorCode(vendorCode);
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

  // ------------------------
  const storageCost = JSON.parse(
    afs.readFileSync(path.join(__dirname, "files", "storageCost.json"))
  )[campaign].cost;
  const byDayCampaignSalesSum = JSON.parse(
    afs.readFileSync(
      path.join(__dirname, "files", campaign, "byDayCampaignSalesSum.json")
    )
  );
  const storageCostForArt =
    storageCost / byDayCampaignSalesSum.fullLastWeek.count;
  // ------------------------

  for (let i = 1; i < data.length; i++) {
    let row = data[i];
    // console.log(row);
    const vendorCode = row[0];
    if (!vendorCode || !arts_data[vendorCode] || !enteredValues[vendorCode]) {
      row[14] = "";
      row[15] = "";
      row[16] = "";
      row[17] = "";

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

      const ad = spp_price * (arts_data[vendorCode].ad / 100);
      const drr = ad / spp_price;

      const profit =
        -ad -
        commission -
        delivery -
        storageCostForArt -
        tax -
        expences -
        prime_cost +
        roz_price;
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
      row[14] = "";
      row[15] = "";
      row[16] = "";
      row[17] = "";

      data[i] = row;
      continue;
    }

    const diffs = [];
    const calculateds = {};
    for (let i = 450; i < 2800; i++) {
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
    row[14] = calculateds[min_diff].new_roi;
    row[15] = calculateds[min_diff].new_roz_price;
    row[16] = calculateds[min_diff].new_spp_price;
    row[17] = calculateds[min_diff].new_wb_price;

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
  fetchAdvertStatsAndWriteToJsonMpManager,
  getAdvertStatByMaskByDayAndWriteToJSONMpManager,
  calculateNewValuesAndWriteToXlsx,
  updatePrices,
  generateGeneralMaskFormsAndWriteToJSON,
  getKTErrorsAndWriteToJson,
  fetchArtsRatings,
  fetchAdvertInfosAndWriteToJson,
  fetchAdvertStatsAndWriteToJson,
  updateAdvertArtActivitiesAndGenerateNotIncluded,
  calcOrdersFromDetailedByPeriodAndWriteToJSON,
  getAdvertStatByMaskByDayAndWriteToJSON,
  updateAutoAdvertsInCampaign,
  setFixedPhrasesForCreatedRKs,
  fetchSubjectDictionaryAndWriteToJSON,
  createNewRKs,
  getAdvertStatByDayAndWriteToJSONMpManager,
  fetchRksBudgetsAndWriteToJSON,
  calcAvgDrrByArtAndWriteToJSON,
  fetchUnasweredFeedbacksAndWriteToJSON,
  answerFeedbacks,
  updateStorageCost,
  fetchSalesAndWriteToJSON,
  fetchAdvertStatsAndWriteToJsonMpManagerLog,
  calcStatsTrendsAndWtriteToJSON,
  sendTgBotTrendMessage,
};

const getMaskFromVendorCode = (vendorCode, cut_namatr = true) => {
  if (!vendorCode) return "NO_SUCH_MASK_AVAILABLE";
  const code = vendorCode.split("_");
  if (code.slice(-1) == "2") code.pop();
  if (cut_namatr && code.includes("НАМАТРАСНИК")) code.splice(1, 1);
  else if (code.includes("КПБ")) {
    code.splice(3, 1);
    if (code.includes("DELICATUS")) code.pop();
  } else code.splice(2, 1);

  return code.join("_");
};

const getGeneralMaskFromVendorCode = (vendorCode) => {
  const mask = getMaskFromVendorCode(vendorCode, false);
  const mask_array = mask.split("_");
  let campaign_flag = mask_array[mask_array.length - 1];
  if ("САВ" == campaign_flag) mask_array.pop();
  campaign_flag = mask_array[mask_array.length - 1];

  if (["ОТК", "ТКС", "DELICATUS"].includes(campaign_flag)) mask_array.pop();

  return mask_array.join("_");
};
