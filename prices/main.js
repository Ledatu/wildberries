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

const getAuthTokenMM = (uid, campaignName) => {
  try {
    const apiKey = JSON.parse(
      afs.readFileSync(
        path.join(__dirname, "marketMaster", uid, "secrets.json")
      )
    ).byCampaignName[campaignName]["apiKey"];
    // console.log(uid, campaignName, apiKey);
    return apiKey;
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
    .get("https://advert-api.wb.ru/adv/v1/promotion/count", {
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
    .post("https://advert-api.wb.ru/adv/v1/promotion/adverts", params, {
      headers: {
        Authorization: authToken,
      },
    })
    .then((response) => response.data)
    .catch((error) => console.error(error));
};

const getAdvertStat = (authToken, queryParams) => {
  return axios
    .get("https://advert-api.wb.ru/adv/v1/fullstat?" + queryParams, {
      headers: {
        Authorization: authToken,
      },
    })
    .then((response) => response.data)
    .catch((error) => console.error(error));
};

const getAdvertsStatsMM = (authToken, params) => {
  return axios
    .post("https://advert-api.wb.ru/adv/v2/fullstats", params, {
      headers: {
        Authorization: authToken,
      },
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

const fetchRKsBudget = (authToken, queryParams) => {
  return axios
    .get("https://advert-api.wb.ru/adv/v1/budget?" + queryParams, {
      headers: {
        Authorization: authToken,
      },
      params: {},
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

const fetchOfficesAndWriteToJsonMM = (uid, campaignName) => {
  const authToken = getAuthTokenMM(uid, campaignName);
  return axios
    .get("https://suppliers-api.wildberries.ru/api/v3/offices", {
      headers: {
        Authorization: authToken,
      },
    })
    .then((response) => {
      const warehouses = response.data;
      const jsonData = {};
      for (let i = 0; i < warehouses.length; i++) {
        const warehouse = warehouses[i];
        jsonData[warehouse.name] = warehouse;
      }
      return fs
        .writeFile(
          path.join(__dirname, "marketMaster", "warehouses.json"),
          JSON.stringify(jsonData)
        )
        .then(() => console.log("warehouses.json created."))
        .catch((error) => console.error(error));
    })
    .catch((error) => console.error(error));
};

const buildXlsx = (campaign, rewriteProfit = false) =>
  new Promise((resolve, reject) => {
    const artsBarcodesFull = JSON.parse(
      afs.readFileSync(
        path.join(__dirname, "files", campaign, "artsBarcodesFull.json")
      )
    );
    const prices = JSON.parse(
      afs.readFileSync(path.join(__dirname, "files", campaign, "prices.json"))
    );
    const sppByArt = JSON.parse(
      afs.readFileSync(
        path.join(__dirname, "files", campaign, "spp by mask.json")
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
    const storageCostForArt = byDayCampaignSalesSum.fullLastWeek.count
      ? storageCost / byDayCampaignSalesSum.fullLastWeek.count
      : 0;

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
    const stdProfitSumTKS = {};
    let profit_trend = {};
    if (afs.existsSync(path_profit_trend))
      profit_trend = JSON.parse(afs.readFileSync(path_profit_trend));
    for (const [brand, profit_data] of Object.entries(profit_trend)) {
      profit_trend[brand].previous = profit_trend[brand].current;
      profit_trend[brand].current = 0;
    }

    const advertStatsByArtByDay = JSON.parse(
      afs.readFileSync(
        path.join(
          __dirname,
          "files",
          campaign,
          "advert stats by art by day.json"
        )
      )
    );
    const orders = JSON.parse(
      afs.readFileSync(path.join(__dirname, "files", campaign, "orders.json"))
    );
    const orders_by_day = JSON.parse(
      afs.readFileSync(
        path.join(__dirname, "files", campaign, "orders by day.json")
      )
    );
    const stocks = JSON.parse(
      afs.readFileSync(path.join(__dirname, "files", campaign, "stocks.json"))
    );
    const arts_data = JSON.parse(
      afs.readFileSync(path.join(__dirname, "files/data.json"))
    );
    const today = new Date();
    const today_date_str = today
      .toLocaleDateString("ru-RU")
      .replace(/(\d{2})\.(\d{2})\.(\d{4})/, "$3-$2-$1")
      .slice(0, 10);
    const yesterday = new Date();
    yesterday.setDate(yesterday.getDate() - 1);
    const yesterday_date_str = yesterday
      .toLocaleDateString("ru-RU")
      .replace(/(\d{2})\.(\d{2})\.(\d{4})/, "$3-$2-$1")
      .slice(0, 10);
    const brand_names = {
      МАЮША: "МАЮША",
      DELICATUS: "DELICATUS",
      "Объединённая текстильная компания": "ОТК",
      "Объединённая текстильная компания ЕН": "ОТК ЕН",
      "Amaze wear": "Amaze wear",
      "Creative Cotton": "Creative Cotton",
      Перинка: "Перинка",
      "Trinity Fashion": "Trinity Fashion",
    };
    const brand_sheets = {};
    for (const [art, art_data] of Object.entries(artsBarcodesFull)) {
      const brand = brand_names[art_data.brand];
      // const fullBrand = brand + art.includes("_ЕН" ? " ЕН" : "");
      if (!(brand in brand_sheets)) brand_sheets[brand] = [[]];
      if (!(brand in stdProfitSumTKS)) stdProfitSumTKS[brand] = 0;
      if (!(brand in profit_trend))
        profit_trend[brand] = { current: 0, previous: 0 };

      // console.log(brand_sheets[brand]);
      let vendorCode = art;
      if (!vendorCode || !arts_data[vendorCode]) continue;
      if (!prices[art_data.nmId])
        console.log(sppByArt[art], sppByArt[art].price);
      el = prices[art_data.nmId] ?? {
        price: sppByArt[art]
          ? sppByArt[art].price
            ? sppByArt[art].price * 2
            : 4000
          : 4000,
        discount: 50,
      };
      // console.log(vendorCode, el);

      vendorCode = String(vendorCode);
      const per_day = orders[vendorCode];
      const stock = stocks["today"][vendorCode];
      const obor = stock / per_day;
      const mult = arts_data[vendorCode].multiplicity;
      const zakaz =
        Math.round((per_day * arts_data[vendorCode].pref_obor - stock) / mult) *
        mult;
      // const wb_price = el.price ?? 500;
      // const el =
      const roz_price = Math.round(el.price * (1 - el.discount / 100));
      const min_zakaz = arts_data[vendorCode].min_zakaz;

      const spp_price = Math.floor(
        roz_price * (1 - arts_data[vendorCode].spp / 100)
      );
      // const commision_percent =
      //   arts_data[vendorCode].spp > arts_data[vendorCode].commission
      //     ? arts_data[vendorCode].commission -
      //       (arts_data[vendorCode].spp - arts_data[vendorCode].commission)
      //     : arts_data[vendorCode].commission;
      const commision_percent = arts_data[vendorCode].commission;
      const commission = roz_price * (commision_percent / 100);
      const delivery = arts_data[vendorCode].delivery;
      const tax = spp_price * (arts_data[vendorCode].tax / 100);
      const expences =
        campaign == "TKS" ? spp_price * 0.07 : arts_data[vendorCode].expences;
      const prime_cost = arts_data[vendorCode].prime_cost;

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
      // console.log(
      //   vendorCode,
      //   profit,
      //   ad,
      //   commission,
      //   delivery,
      //   storageCostForArt,
      //   tax,
      //   expences,
      //   prime_cost,
      //   roz_price
      // );
      const roi = profit / (prime_cost + expences);
      const rentabelnost = profit / spp_price;

      const realZakaz = !stock
        ? zakaz > mult * min_zakaz
          ? zakaz
          : mult * min_zakaz
        : zakaz > 0
        ? zakaz
        : 0;

      const orders_yesterday = orders_by_day[yesterday_date_str]
        ? orders_by_day[yesterday_date_str][vendorCode]
        : 0 ?? 0;
      const profit_today = !stock
        ? 0
        : (campaign == "TKS" ? expences : profit) * orders_yesterday;
      if (campaign == "TKS") {
        const tks_profit_today = !stock ? 0 : profit * orders_yesterday;
        // console.log(tks_profit_today);
        stdProfitSumTKS[brand] += isNaN(tks_profit_today)
          ? 0
          : tks_profit_today;
      }
      profit_trend[brand].current += isNaN(profit_today) ? 0 : profit_today;

      brand_sheets[brand].push([
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
    }
    // console.log(brand_sheets);

    const xlsx_data = [];
    for (const [brand, brand_sheet] of Object.entries(brand_sheets)) {
      // console.log(brand, brand_sheet);
      brand_sheets[brand][0] = [
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
        "Нов. Рентабельность",
        "Нов. ROI",
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
        `${Math.round(profit_trend[brand].current)} Профит сегодня`,
        campaign == "TKS"
          ? `${Math.round(stdProfitSumTKS[brand])} Профит по продажам`
          : "",
      ];
      if (rewriteProfit)
        logCurrentProfit(campaign, brand, profit_trend[brand].current);

      brand_sheets[brand] = sortData(brand_sheets[brand]); // Sort the data

      xlsx_data.push({ name: brand, data: brand_sheet });
    }
    console.log(campaign, "Xlsx data generated.");
    // -------------------------
    const hour_key = new Date().toLocaleTimeString("ru-RU").slice(0, 2);
    if (
      ["05", "08", "11", "14", "17", "20", "23"].includes(hour_key) &&
      rewriteProfit
    )
      afs.writeFileSync(path_profit_trend, JSON.stringify(profit_trend));
    // -------------------------

    return fs
      .writeFile(
        path.join(__dirname, "files", campaign, "data.xlsx"),
        xlsx.build(xlsx_data)
      )
      .then(() => {
        console.log("data.xlsx created.");
        resolve();
      })
      .catch((error) => console.error(error));
  });

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
  const jsonDataFullByNmId = {};
  const jsonDataBarcodes = { direct: {}, reverse: {} };
  const jsonDataBarcodesFull = {};
  data.forEach((item) => {
    for (const [index, size_data] of Object.entries(item.sizes)) {
      const size = size_data.techSize;
      const art =
        item.vendorCode.replace(/\s/g, "") + (size != "0" ? `_${size}` : "");
      jsonDataBarcodes.direct[art] = size_data.skus[0];
      jsonDataBarcodes.reverse[size_data.skus[0]] = art;
      jsonDataBarcodesFull[art] = {
        object: item.object,
        brand: item.brand + (art.includes("_ЕН") ? " ЕН" : ""),
        size: size,
        color: item.colors[0],
        barcode: size_data.skus[0],
        nmId: item.nmID,
        brand_art: item.vendorCode.replace(/\s/g, ""),
      };
    }
    jsonData[item.nmID] = item.vendorCode.replace(/\s/g, "");
  });
  data.forEach((item) => {
    const art = item.vendorCode.replace(/\s/g, "");
    jsonDataFull[art] = {
      object: item.object,
      brand: item.brand + (art.includes("_ЕН") ? " ЕН" : ""),
      sizes: item.sizes,
      colors: item.colors,
    };
  });
  data.forEach((item) => {
    const art = item.vendorCode.replace(/\s/g, "");
    jsonDataFullByNmId[item.nmID] = {
      supplierArticle: art,
      object: item.object,
      brand: item.brand + (art.includes("_ЕН") ? " ЕН" : ""),
      sizes: item.sizes,
      colors: item.colors,
    };
  });

  const sheet_data = [];
  for (const [art, barcode] of Object.entries(jsonDataBarcodes.direct)) {
    sheet_data.push([art, barcode]);
  }
  sheet_data.sort((a, b) => {
    if (a[0] < b[0]) return -1;
    if (a[0] > b[0]) return 1;
    return 0;
  });

  fs.writeFile(
    path.join(__dirname, "files", campaign, "vendorCodesFull.json"),
    JSON.stringify(jsonDataFull)
  )
    .then(() => console.log("vendorCodesFull.json created."))
    .catch((error) => console.error(error));
  fs.writeFile(
    path.join(__dirname, "files", campaign, "artsNmIdsFull.json"),
    JSON.stringify(jsonDataFullByNmId)
  )
    .then(() => console.log("vendorCodesFull.json created."))
    .catch((error) => console.error(error));
  fs.writeFile(
    path.join(__dirname, "files", campaign, "artsBarcodes.json"),
    JSON.stringify(jsonDataBarcodes)
    // xlsx.build([{ name: "a", data: sheet_data }])
  )
    .then(() => console.log("artsBarcodes.json created."))
    .catch((error) => console.error(error));
  fs.writeFile(
    path.join(__dirname, "files", campaign, "artsBarcodes.xlsx"),

    xlsx.build([{ name: "a", data: sheet_data }])
  );
  fs.writeFile(
    path.join(__dirname, "files", campaign, "artsBarcodesFull.json"),
    JSON.stringify(jsonDataBarcodesFull)
    // xlsx.build([{ name: "a", data: sheet_data }])
  )
    .then(() => console.log("artsBarcodes.json created."))
    .catch((error) => console.error(error));
  // fs.writeFile(
  //   path.join(__dirname, "files", campaign, "artsBarcodes.xlsx"),
  //   // JSON.stringify(jsonDataBarcodes)
  //   xlsx.build([{ name: "a", data: sheet_data }])
  // )
  //   .then(() => console.log("artsBarcodes.xlsx created."))
  //   .catch((error) => console.error(error));
  return fs
    .writeFile(
      path.join(__dirname, "files", campaign, "vendorCodes.json"),
      JSON.stringify(jsonData)
    )
    .then(() => console.log("vendorCodes.json created."))
    .catch((error) => console.error(error));
};

const writeVendorCodesToJsonMM = (data, uid, campaignName) => {
  const artsPath = path.join(
    __dirname,
    "marketMaster",
    uid,
    campaignName,
    "arts.json"
  );
  let arts = {};
  if (afs.existsSync(artsPath)) arts = JSON.parse(afs.readFileSync(artsPath));
  if (!("byArt" in arts)) arts.byArt = {};
  if (!("bySku" in arts)) arts.bySku = {};
  if (!("byNmId" in arts)) arts.byNmId = {};

  data.forEach((item) => {
    for (const [index, size_data] of Object.entries(item.sizes)) {
      const size = size_data.techSize;
      const art =
        item.vendorCode.replace(/\s/g, "") + (size != "0" ? `_${size}` : "");

      arts.byArt[art] = {
        art: art,
        object: item.object,
        brand: item.brand + (art.includes("_ЕН") ? " ЕН" : ""),
        size: size,
        color: item.colors[0],
        barcode: size_data.skus[0],
        nmId: item.nmID,
        brand_art: item.vendorCode.replace(/\s/g, ""),
        title: item.title,
      };
      arts.bySku[size_data.skus[0]] = {
        art: art,
        object: item.object,
        brand: item.brand + (art.includes("_ЕН") ? " ЕН" : ""),
        size: size,
        color: item.colors[0],
        barcode: size_data.skus[0],
        nmId: item.nmID,
        brand_art: item.vendorCode.replace(/\s/g, ""),
        title: item.title,
      };
    }
  });

  data.forEach((item) => {
    const art = item.vendorCode.replace(/\s/g, "");
    arts.byNmId[item.nmID] = {
      art: art,
      object: item.object,
      brand: item.brand + (art.includes("_ЕН") ? " ЕН" : ""),
      sizes: item.sizes,
      colors: item.colors,
      title: item.title,
    };
  });

  return fs
    .writeFile(
      path.join(__dirname, "marketMaster", uid, campaignName, "arts.json"),
      JSON.stringify(arts)
    )
    .then(() => console.log(uid, campaignName, "arts.json created."))
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
  console.log(data);
  const jsonData = {};
  const thisMonth = new Date();
  thisMonth.setDate(thisMonth.getDate() - 90);
  if (!data) {
    console.log(
      campaignName,
      "no data was provided from getAdverts, nothing to write, skipping..."
    );
    return;
  }
  if (!data.adverts) return;
  for (const [_, item] of Object.entries(data.adverts)) {
    if (_) {
    }
    // console.log(item, item.status, new Date(item.changeTime));
    item.advert_list.forEach((adv) => {
      if (item.status == 7 && new Date(adv.changeTime) < thisMonth) return;
      jsonData[adv.advertId] = {
        type: item.type,
        status: item.status,
        advertId: adv.advertId,
        changeTime: adv.changeTime,
      };
    });
  }
  return fs
    .writeFile(
      path.join(__dirname, "files", campaign, "adverts.json"),
      JSON.stringify(jsonData)
    )
    .then(() => console.log("adverts.json created."))
    .catch((error) => console.error(error));
};

const writeAdvertsToJsonMM = (data, uid, campaignName) => {
  console.log(data);
  const jsonData = {};
  const thisMonth = new Date();
  thisMonth.setDate(thisMonth.getDate() - 90);
  if (!data) {
    console.log(
      campaignName,
      "no data was provided from getAdverts, nothing to write, skipping..."
    );
    return;
  }
  if (!data.adverts) return;
  for (const [_, item] of Object.entries(data.adverts)) {
    if (_) {
    }
    // console.log(item, item.status, new Date(item.changeTime));
    item.advert_list.forEach((adv) => {
      if (item.status == 7 && new Date(adv.changeTime) < thisMonth) return;
      jsonData[adv.advertId] = {
        type: item.type,
        status: item.status,
        advertId: adv.advertId,
        changeTime: adv.changeTime,
      };
    });
  }
  return fs
    .writeFile(
      path.join(__dirname, "marketMaster", uid, campaignName, "adverts.json"),
      JSON.stringify(jsonData)
    )
    .then(() => console.log(uid, campaignName, "adverts.json created."))
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

  const artsBarcodes = JSON.parse(
    afs.readFileSync(
      path.join(__dirname, "files", campaign, "artsBarcodes.json")
    )
  );
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
        const supplierArticle = artsBarcodes.reverse[item.barcode];
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

const writeStocksToJsonMM = async (data, uid, campaignName) => {
  const today = new Date();
  const str_date = today
    .toLocaleDateString("ru-RU")
    .replace(/(\d{2})\.(\d{2})\.(\d{4})/, "$3-$2-$1")
    .slice(0, 10);
  const arts = JSON.parse(
    afs.readFileSync(
      path.join(__dirname, "marketMaster", uid, campaignName, "arts.json")
    )
  );
  const stocksPath = path.join(
    __dirname,
    "marketMaster",
    uid,
    campaignName,
    "stocks.json"
  );
  let stocks = {};
  if (afs.existsSync(stocksPath))
    stocks = JSON.parse(afs.readFileSync(stocksPath));

  if (!(str_date in stocks)) stocks[str_date] = { all: {} };

  if (data && data.length) {
    data.forEach((item) => {
      const warehouseName = item.warehouseName;
      if (!(warehouseName in stocks[str_date]))
        stocks[str_date][warehouseName] = {};

      const art = arts.bySku[item.barcode]
        ? arts.bySku[item.barcode].art
        : "undefined";
      if (!(art in stocks[str_date][warehouseName]))
        stocks[str_date][warehouseName][art] = {
          quantity: 0,
          inWayToClient: 0,
          inWayFromClient: 0,
          quantityFull: 0,
        };

      stocks[str_date][warehouseName][art].quantity += item.quantity;
      stocks[str_date][warehouseName][art].inWayToClient += item.inWayToClient;
      stocks[str_date][warehouseName][art].inWayFromClient +=
        item.inWayFromClient;
      stocks[str_date][warehouseName][art].quantityFull += item.quantityFull;

      if (!(art in stocks[str_date].all))
        stocks[str_date].all[art] = {
          quantity: 0,
          inWayToClient: 0,
          inWayFromClient: 0,
          quantityFull: 0,
        };
      stocks[str_date]["all"][art].quantity += item.quantity;
      stocks[str_date]["all"][art].inWayToClient += item.inWayToClient;
      stocks[str_date]["all"][art].inWayFromClient += item.inWayFromClient;
      stocks[str_date]["all"][art].quantityFull += item.quantityFull;
    });
  }

  return fs
    .writeFile(stocksPath, JSON.stringify(stocks))
    .then(() => console.log(uid, campaignName, "stocks.json created."))
    .catch((error) => console.error(error));
};

const writeOrdersToJsonMM = (data, uid, campaignName, date) => {
  const now = new Date();
  const dateFrom = new Date(date);
  console.log(now, dateFrom);

  const arts = JSON.parse(
    afs.readFileSync(
      path.join(__dirname, "marketMaster", uid, campaignName, "arts.json")
    )
  );

  const ordersPath = path.join(
    __dirname,
    "marketMaster",
    uid,
    campaignName,
    "orders.json"
  );
  let orders = {};
  if (afs.existsSync(ordersPath))
    orders = JSON.parse(afs.readFileSync(ordersPath));

  data.forEach((item) => {
    if (!(item.barcode in arts.bySku)) return;
    const art = arts.bySku[item.barcode].art;
    const brand = arts.bySku[item.barcode].brand;
    // console.log(supplierArticle);
    const get_item_price = () => {
      return item.totalPrice * (1 - item.discountPercent / 100);
    };

    const order_date = new Date(item.date);
    if (order_date < dateFrom) {
      return;
    }
    const order_date_string = item.date.slice(0, 10);
    if (item.isCancel /*|| order_date_string == today*/) {
      return;
    }

    if (!(order_date_string in orders)) {
      orders[order_date_string] = { all: {} };
    }

    const warehouseName = item.warehouseName;
    if (!(warehouseName in orders[order_date_string])) {
      orders[order_date_string][warehouseName] = {};
    }

    if (!(art in orders[order_date_string][warehouseName])) {
      orders[order_date_string][warehouseName][art] = { count: 0, sum: 0 };
    }
    orders[order_date_string][warehouseName][art].count += 1;
    orders[order_date_string][warehouseName][art].sum += get_item_price();

    if (!(art in orders[order_date_string].all)) {
      orders[order_date_string].all[art] = { count: 0, sum: 0 };
    }
    orders[order_date_string].all[art].count += 1;
    orders[order_date_string].all[art].sum += get_item_price();

    if (!(brand in orders[order_date_string].all)) {
      orders[order_date_string].all[brand] = { count: 0, sum: 0 };
    }
    orders[order_date_string].all[brand].count += 1;
    orders[order_date_string].all[brand].sum += get_item_price();
  });

  return Promise.all([fs.writeFile(ordersPath, JSON.stringify(orders))])
    .then(() => console.log(uid, campaignName, "orders.json created."))
    .catch((error) => console.error(error));
};

const calcStatsTrendsAndWtriteToJSON = (campaign, now) =>
  new Promise((resolve, reject) => {
    const brands = JSON.parse(
      afs.readFileSync(path.join(__dirname, "files", "campaigns.json"))
    ).brands[campaign];
    const jsonData = {};
    for (let i = 0; i < brands.length; i++) {
      const brand = brands[i];
      jsonData[brand] = {
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
    }

    const get_normalized_price = (item) => {
      const price = item.totalPrice * (1 - item.discountPercent / 100);
      return price;
    };

    const orders = JSON.parse(
      afs.readFileSync(
        path.join(__dirname, "files", campaign, "orders_full.json")
      )
    );
    const artsNmIdsFull = JSON.parse(
      afs.readFileSync(
        path.join(__dirname, "files", campaign, "artsNmIdsFull.json")
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

    const today = new Date(now);
    const today_string = today
      .toLocaleDateString("ru-RU")
      .replace(/(\d{2})\.(\d{2})\.(\d{4})/, "$3-$2-$1")
      .slice(0, 10);

    const yesterday = new Date(now);
    yesterday.setDate(yesterday.getDate() - 1);
    const yesterday_string = yesterday
      .toLocaleDateString("ru-RU")
      .replace(/(\d{2})\.(\d{2})\.(\d{4})/, "$3-$2-$1")
      .slice(0, 10);

    // console.log(now, yesterday);
    const brand_names = {
      МАЮША: "МАЮША",
      DELICATUS: "DELICATUS",
      "Объединённая текстильная компания": "ОТК",
      "Объединённая текстильная компания ЕН": "ОТК ЕН",
      "Amaze wear": "Amaze wear",
      "Creative Cotton": "Creative Cotton",
      Перинка: "Перинка",
      "Trinity Fashion": "Trinity Fashion",
    };
    // orders ------------------------------------------------------------
    if (orders) {
      for (const [index, item] of Object.entries(orders)) {
        const order_date = new Date(item.date);
        const order_date_string = order_date
          .toLocaleDateString("ru-RU")
          .replace(/(\d{2})\.(\d{2})\.(\d{4})/, "$3-$2-$1")
          .slice(0, 10);

        const nmId = item.nmId;
        if (!(nmId in artsNmIdsFull)) continue;
        const brand_temp = artsNmIdsFull[nmId].brand;
        const brand = brand_names[brand_temp] ?? brand_temp;
        if (!(brand in jsonData)) continue;
        if (order_date_string == today_string) {
          if (order_date <= today) {
            jsonData[brand].today.sum_orders += get_normalized_price(item);
            jsonData[brand].today.orders += 1;
          }
        }
        if (order_date_string == yesterday_string) {
          if (order_date <= yesterday) {
            jsonData[brand].yesterday.sum_orders += get_normalized_price(item);
            jsonData[brand].yesterday.orders += 1;
          }
        }
        jsonData[brand].today.avg_bill = jsonData[brand].today.orders
          ? jsonData[brand].today.sum_orders / jsonData[brand].today.orders
          : 0;
        jsonData[brand].yesterday.avg_bill = jsonData[brand].yesterday.orders
          ? jsonData[brand].yesterday.sum_orders /
            jsonData[brand].yesterday.orders
          : 0;
      }
    }
    // /orders ------------------------------------------------------------

    // adverts ------------------------------------------------------------
    const hour_key = now.toLocaleTimeString("ru-RU").slice(0, 2);
    if (advertStatsMpManagerLog.today[hour_key]) {
      for (const [rk_id, item] of Object.entries(
        advertStatsMpManagerLog.today[hour_key]
      )) {
        if (!item) continue;
        const order_date = new Date(item.createdAt);
        const order_date_string = order_date
          .toLocaleDateString("ru-RU")
          .replace(/(\d{2})\.(\d{2})\.(\d{4})/, "$3-$2-$1")
          .slice(0, 10);

        const nmId = item.vendorCode;
        if (!(nmId in artsNmIdsFull)) continue;
        const brand_temp = artsNmIdsFull[nmId].brand;
        const brand = brand_names[brand_temp] ?? brand_temp;
        if (!(brand in jsonData)) continue;

        // console.log(item, today_string, order_date_string);
        if (order_date_string == today_string) {
          jsonData[brand].today.sum_advert += item.cost;
        }

        jsonData[brand].today.drr = jsonData[brand].today.sum_orders
          ? (jsonData[brand].today.sum_advert /
              jsonData[brand].today.sum_orders) *
            100
          : 0;
      }
      if (advertStatsMpManagerLog.yesterday[hour_key])
        for (const [rk_id, item] of Object.entries(
          advertStatsMpManagerLog.yesterday[hour_key]
        )) {
          if (!item) continue;
          const order_date = new Date(item.createdAt);
          const order_date_string = order_date
            .toLocaleDateString("ru-RU")
            .replace(/(\d{2})\.(\d{2})\.(\d{4})/, "$3-$2-$1")
            .slice(0, 10);

          const nmId = item.vendorCode;
          if (!(nmId in artsNmIdsFull)) continue;
          const brand_temp = artsNmIdsFull[nmId].brand;
          const brand = brand_names[brand_temp] ?? brand_temp;
          if (!(brand in jsonData)) continue;

          if (order_date_string == yesterday_string) {
            jsonData[brand].yesterday.sum_advert += item.cost;
          }

          jsonData[brand].yesterday.drr = jsonData[brand].yesterday.sum_orders
            ? (jsonData[brand].yesterday.sum_advert /
                jsonData[brand].yesterday.sum_orders) *
              100
            : 0;
        }
    }
    // /adverts ------------------------------------------------------------

    // profit ------------------------------------------------------------
    for (const [brand, brandData] of Object.entries(jsonData)) {
      if (!(brand in profit_trend)) continue;
      jsonData[brand].today.profit = profit_trend[brand].current;
      jsonData[brand].yesterday.profit = profit_trend[brand].previous;
    }
    // /profit ------------------------------------------------------------
    for (const [brand, brandData] of Object.entries(jsonData)) {
      for (const [metric, val] of Object.entries(brandData.trend)) {
        jsonData[brand].trend[metric] =
          jsonData[brand].today[metric] / jsonData[brand].yesterday[metric] - 1;
      }
      jsonData[brand].trend.drr =
        jsonData[brand].today.drr - jsonData[brand].yesterday.drr;
    }
    return fs
      .writeFile(
        path.join(__dirname, "files", campaign, "metricTrends.json"),
        JSON.stringify(jsonData)
      )
      .then(() => {
        console.log(campaign, "metricTrends.json created.");
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

  const artsBarcodes = JSON.parse(
    afs.readFileSync(
      path.join(__dirname, "files", campaign, "artsBarcodes.json")
    )
  );

  const excluded = { excluded: [] };
  data.forEach((item) => {
    const supplierArticle = artsBarcodes.reverse[item.barcode];
    const get_item_price = () => {
      return item.totalPrice * (1 - item.discountPercent / 100);
    };
    const get_normalized_price = (cur_count, cur_sum) => {
      const price = get_item_price();
      const res_if_violated = cur_count ? cur_sum / cur_count : 500;
      if (price <= 4000) return price;
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
      for (const art in artsBarcodes.direct) {
        jsonData[order_date_string][art] = 0;
      }
      // console.log(jsonData[order_date_string]);
    }

    if (!(order_date_string in orderSumJsonData)) {
      orderSumJsonData[order_date_string] = {};
      for (const art in artsBarcodes.direct) {
        orderSumJsonData[order_date_string][art] = 0;
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

const craftNecessaryFoldersAndFilesIfNeeded = (accountInfo) => {
  const uid = accountInfo.uid;
  const mainAccountDir = path.join(__dirname, "marketMaster", uid);
  if (!afs.existsSync(mainAccountDir)) afs.mkdirSync(mainAccountDir);

  const customersPath = path.join(__dirname, "marketMaster", "customers.json");
  let customers = {};
  if (afs.existsSync(customersPath))
    customers = JSON.parse(afs.readFileSync(customersPath));
  if (!(uid in customers)) customers[uid] = { campaignsNames: [] };

  const secretsPath = path.join(mainAccountDir, "secrets.json");
  const secrets = { byApiKey: {}, byCampaignName: {} };
  for (let i = 0; i < accountInfo.campaigns.length; i++) {
    const campaignInfo = accountInfo.campaigns[i];
    if (!campaignInfo) continue;

    const apiKey = campaignInfo["api-key"];
    const campaignName = campaignInfo["campaignName"];
    if (!customers[uid].campaignsNames.includes(campaignName))
      customers[uid].campaignsNames.push(campaignName);

    secrets.byApiKey[apiKey] = { apiKey: apiKey, campaignName: campaignName };
    secrets.byCampaignName[campaignName] = {
      apiKey: apiKey,
      campaignName: campaignName,
    };

    const campaignDir = path.join(mainAccountDir, campaignName);
    if (!afs.existsSync(campaignDir)) afs.mkdirSync(campaignDir);

    const advertsPath = path.join(campaignDir, "adverts.json");
    if (!afs.existsSync(advertsPath))
      afs.writeFileSync(advertsPath, JSON.stringify({}));

    const advertsInfosPath = path.join(campaignDir, "advertsInfos.json");
    if (!afs.existsSync(advertsInfosPath))
      afs.writeFileSync(advertsInfosPath, JSON.stringify({}));

    const advertsBudgetsPath = path.join(campaignDir, "advertsBudgets.json");
    if (!afs.existsSync(advertsBudgetsPath))
      afs.writeFileSync(advertsBudgetsPath, JSON.stringify({}));

    const advertsBudgetsToKeepPath = path.join(
      campaignDir,
      "advertsBudgetsToKeep.json"
    );
    if (!afs.existsSync(advertsBudgetsToKeepPath))
      afs.writeFileSync(advertsBudgetsToKeepPath, JSON.stringify({}));

    const advertsStatsPath = path.join(campaignDir, "advertsStats.json");
    if (!afs.existsSync(advertsStatsPath))
      afs.writeFileSync(advertsStatsPath, JSON.stringify({}));

    const advertsStatsByDayPath = path.join(
      campaignDir,
      "advertsStatsByDay.json"
    );
    if (!afs.existsSync(advertsStatsByDayPath))
      afs.writeFileSync(advertsStatsByDayPath, JSON.stringify({}));

    const artsPath = path.join(campaignDir, "arts.json");
    if (!afs.existsSync(artsPath))
      afs.writeFileSync(artsPath, JSON.stringify({}));

    const ordersPath = path.join(campaignDir, "orders.json");
    if (!afs.existsSync(ordersPath))
      afs.writeFileSync(ordersPath, JSON.stringify({}));

    const stocksPath = path.join(campaignDir, "stocks.json");
    if (!afs.existsSync(stocksPath))
      afs.writeFileSync(stocksPath, JSON.stringify({}));
  }

  afs.writeFileSync(secretsPath, JSON.stringify(secrets));
  afs.writeFileSync(customersPath, JSON.stringify(customers));
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
    for (let i = 1; i < 8; i++) {
      // last full week
      const cur_date = new Date(today_date);
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
  const artsNmIdsFull = JSON.parse(
    afs.readFileSync(
      path.join(__dirname, "files", campaign, "artsNmIdsFull.json")
    )
  );

  const brand_names = {
    МАЮША: "МАЮША",
    DELICATUS: "DELICATUS",
    "Объединённая текстильная компания": "ОТК",
    "Объединённая текстильная компания ЕН": "ОТК ЕН",
    "Amaze wear": "Amaze wear",
    "Creative Cotton": "Creative Cotton",
    Перинка: "Перинка",
    "Trinity Fashion": "Trinity Fashion",
  };
  const jsonDataByArt = {};
  const jsonData = {};
  let a = 0;
  jsonData[campaign] = {};
  for (const [name, rkData] of Object.entries(advertStats)) {
    for (const [index, artData] of Object.entries(rkData)) {
      const date = artData.createdAt.slice(0, 10);
      const art_id = artData.vendorCode;
      // console.log(name, art_id, date);

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

      // if (!vendorCodes[art_id] || !art_id) {
      //   console.log(artData.cost, art_id);
      //   continue;
      // }

      // console.log(art_id);
      let brand = "";
      if (!artsNmIdsFull[art_id]) {
        // console.log("SKIPPEDDDDDDDDDDD", campaign, art_id, artData.cost);
        const std_brand_names = {
          mayusha: "МАЮША",
          delicatus: "DELICATUS",
          TKS: "ОТК",
          perinka: "Перинка",
        };
        brand = std_brand_names[campaign];

        continue;
      } else {
        brand = brand_names[artsNmIdsFull[art_id].brand];
      }
      // console.log(artsNmIdsFull[art_id].brand);
      if (!(brand in jsonData)) jsonData[brand] = {};

      if (!(date in jsonData[brand]))
        jsonData[brand][date] = {
          views: 0,
          clicks: 0,
          unique_users: 0,
          sum: 0,
          ctr: 0,
          cpm: 0,
          cpc: 0,
        };
      jsonData[brand][date].views += artData.views ?? 0;
      jsonData[brand][date].clicks += artData.clicks ?? 0;
      jsonData[brand][date].sum += artData.cost ?? 0;
      if (jsonData[brand][date].views)
        jsonData[brand][date].ctr =
          jsonData[brand][date].clicks / jsonData[brand][date].views;
      if (jsonData[brand][date].views)
        jsonData[brand][date].cpm =
          jsonData[brand][date].sum / (jsonData[brand][date].views / 1000);
      if (jsonData[brand][date].clicks)
        jsonData[brand][date].cpc =
          jsonData[brand][date].sum / jsonData[brand][date].clicks;

      // full brand sums

      const art = vendorCodes[art_id];
      if (!art) continue;
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
      // console.log(mask);

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
    const artsBarcodes = JSON.parse(
      afs.readFileSync(
        path.join(__dirname, "files", campaign, "artsBarcodes.json")
      )
    );

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

        if (
          new Date(jsonData["date"]).getDate() -
            new Date(item.create_dt).getDate() <
          7
        ) {
          // const type = getMaskFromVendorCode(
          //   artsBarcodes.reverse[item.barcode]
          // );
          const art = artsBarcodes.reverse[item.barcode] ?? "";
          let type = getMaskFromVendorCode(art).slice(0, 2);
          if (art.includes("_ЕН")) type += "_ЕН";
          if (!(type in jsonData)) {
            jsonData[type] = { buyout: 0, delivery: 0 };
          }
          jsonData[type].buyout += item.quantity;
          const delivery_rub = item.delivery_rub;
          jsonData[type].delivery +=
            item.supplier_oper_name == "Логистика сторно"
              ? -delivery_rub
              : delivery_rub;

          // if (art == "ПР_90_СЕРЫЙ_ТКС")
          //   console.log(
          //     item.quantity,
          //     item.supplier_oper_name,
          //     item.delivery_rub
          //   );
          if (!(art in jsonData)) {
            jsonData[art] = { buyout: 0, delivery: 0 };
          }
          jsonData[art].buyout += item.quantity;
          jsonData[art].delivery +=
            item.supplier_oper_name == "Логистика сторно"
              ? -delivery_rub
              : delivery_rub;
        }
      });
      for (const key in jsonData) {
        jsonData[key].delivery = Math.round(jsonData[key].delivery);
        jsonData[key]["average_delivery"] = jsonData[key].buyout
          ? jsonData[key].delivery / jsonData[key].buyout
          : jsonData[key].delivery;
      }
    }
    // console.log(campaign, jsonData.date)
    return fs
      .writeFile(
        path.join(__dirname, "files", campaign, "detailedByPeriod.json"),
        JSON.stringify(jsonData ?? {})
      )
      .then(() => {
        console.log("detailedByPeriod.json created.");
        resolve(jsonData.date ? jsonData : undefined);
      })
      .catch((error) => {
        console.error(error);
        reject(error);
      });
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

const sendTgBotTrendMessage = (now, hour_key) =>
  new Promise((resolve, reject) => {
    const campaigns = JSON.parse(
      afs.readFileSync(path.join(__dirname, "files", "campaigns.json"))
    ).campaigns;
    const tg = JSON.parse(
      afs.readFileSync(
        path.join(__dirname, "../secrets/telegram", "secret.json")
      )
    );
    hour_key = String("00" + String(parseInt(hour_key) + 1)).slice(-2);
    const campaignNames = {
      mayusha: "Маюша🐝",
      delicatus: "Деликатус🇸🇪",
      TKS: "Текстиль🏭",
      perinka: "Перинка🪶",
    };
    let text = "";
    const jsonData = {};

    for (const [index, campaign] of Object.entries(campaigns)) {
      const metricTrends = JSON.parse(
        afs.readFileSync(
          path.join(__dirname, "files", campaign, "metricTrends.json")
        )
      );
      text += `Магазин: ${campaignNames[campaign]}\n`;
      for (const [brand, brandData] of Object.entries(metricTrends)) {
        for (const [metric, trend] of Object.entries(brandData.trend)) {
          jsonData[metric] = `${
            Math.round(
              metricTrends[brand].today[metric] * (metric == "drr" ? 100 : 1)
            ) / (metric == "drr" ? 100 : 1)
          } * [${trend > 0 ? "+" : ""}${
            Math.round(trend * 100) / (metric == "drr" ? 100 : 1)
          }%]`;
        }
        text += `Бренд: ${brand}\nметрики:\n• Сумма заказов: ${jsonData.sum_orders.replace(
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
        )}\n• ДРР: ${jsonData.drr.replace(
          " *",
          "%"
        )}\n• Профит: ${jsonData.profit.replace("*", "р.")}\n\n`;
      }
    }
    text += `#метрики #в${hour_key} #${now.toLocaleDateString("ru-RU", {
      weekday: "short",
    })}${hour_key}`;

    const bot = new TelegramBot(tg.token);
    bot.sendMessage(tg.chatIds.dev, text);
    bot.sendMessage(tg.chatIds.prod, text);
    bot.sendMessage(tg.chatIds.manager, text);

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

    const authToken = getAuthToken("api-token", campaign);
    const prevMonday = new Date();
    prevMonday.setDate(
      prevMonday.getDate() - 14 - ((prevMonday.getDay() + 6) % 7)
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
        if (feedback_data.productValuation < 4) continue;
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

const updatePrices = async (brand) => {
  const brands = JSON.parse(
    await fs.readFile(path.join(__dirname, `files/campaigns.json`))
  ).brands;
  let campaign = undefined;
  for (const [camp, brands_array] of Object.entries(brands)) {
    if (brands_array.includes(brand)) {
      campaign = camp;
      break;
    }
  }
  if (!campaign) return 0;
  // console.log(brands, campaign, brand);

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
    .catch((error) => {
      console.error(error.response.data);
      fs.writeFile(
        path.join(__dirname, "files", campaign, "updatePricesErrorLog.json"),
        JSON.stringify(error)
      );
    });
  fs.rm(newPricesPath);
};

const fetchPricesAndWriteToJSON = (campaign) =>
  new Promise(async (resolve, reject) => {
    const authToken = getAuthToken("api-token", campaign);

    const artsNmIdsFull = JSON.parse(
      await fs.readFile(
        path.join(__dirname, `files/${campaign}/artsNmIdsFull.json`)
      )
    );
    return getInfo(authToken)
      .then((data) => {
        const jsonData = {};
        for (const [index, art_data] of Object.entries(data)) {
          // console.log(art_data)
          // console.log(artsNmIdsFull[art_data.nmId].supplierArticle);
          jsonData[art_data.nmId] = art_data;
        }
        return fs
          .writeFile(
            path.join(__dirname, "files", campaign, "prices.json"),
            JSON.stringify(jsonData)
          )
          .then(() => {
            console.log("prices.json created.");
            resolve();
          })
          .catch((error) => console.error(error));
      })
      .catch((error) => console.error(error));
  });

const fetchDataAndWriteToXlsx = (campaign, rewriteProfit = false) => {
  return fetchPricesAndWriteToJSON(campaign)
    .then(async () => {
      await buildXlsx(campaign, rewriteProfit);
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
  const authToken = getAuthToken("api-token", "mayusha");
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
  const authToken = getAuthToken("api-token", campaign);
  const params = {};
  return getAdverts(authToken, params)
    .then((data) => {
      return writeAdvertsToJson(data, campaign);
    })
    .catch((error) => console.error(error));
};

const fetchAdvertsAndWriteToJsonMM = (uid, campaignName) => {
  const authToken = getAuthTokenMM(uid, campaignName);
  const params = {};
  return getAdverts(authToken, params)
    .then((data) => {
      return writeAdvertsToJsonMM(data, uid, campaignName);
    })
    .catch((error) => console.error(error));
};

const fetchAdvertInfosAndWriteToJson = async (campaign) => {
  const authToken = getAuthToken("api-token", campaign);
  const adverts = JSON.parse(
    afs.readFileSync(path.join(__dirname, "files", campaign, "adverts.json"))
  );
  const filepath = path.join(__dirname, "files", campaign, "advertInfos.json");
  let jsonData = {};
  if (afs.existsSync(filepath)) {
    jsonData = JSON.parse(afs.readFileSync(filepath));
  }
  const params = [[]];
  let count = 0;
  for (const [advertId, advertData] of Object.entries(adverts)) {
    params[params.length - 1].push(advertData.advertId);
    count++;
    if (count % 50 == 0) params.push([]);
  }
  // console.log(params);
  const typeJsonData = {};
  for (let i = 0; i < params.length; i++) {
    await getAdvertInfo(authToken, params[i]).then((pr) => {
      if (!pr) return;
      typeJsonData[i] = pr;
    });
    await new Promise((resolve) => setTimeout(resolve, 500));
  }

  for (const [type, stats] of Object.entries(typeJsonData)) {
    if (!stats.length) continue;
    for (let i = 0; i < stats.length; i++) {
      jsonData[stats[i].advertId] = stats[i];
    }
  }

  return fs
    .writeFile(filepath, JSON.stringify(jsonData))
    .then(() => console.log(campaign, "advertInfos.json created."))
    .catch((error) => console.error(error));
};

const fetchAdvertsInfosAndWriteToJsonMM = async (uid, campaignName) => {
  const authToken = getAuthTokenMM(uid, campaignName);
  const adverts = JSON.parse(
    afs.readFileSync(
      path.join(__dirname, "marketMaster", uid, campaignName, "adverts.json")
    )
  );
  const filepath = path.join(
    __dirname,
    "marketMaster",
    uid,
    campaignName,
    "advertsInfos.json"
  );
  let jsonData = {};
  if (afs.existsSync(filepath)) {
    jsonData = JSON.parse(afs.readFileSync(filepath));
  }
  const params = [[]];
  let count = 0;
  for (const [advertId, advertData] of Object.entries(adverts)) {
    params[params.length - 1].push(advertData.advertId);
    count++;
    if (count % 50 == 0) params.push([]);
  }
  // console.log(params);
  const typeJsonData = {};
  for (let i = 0; i < params.length; i++) {
    await getAdvertInfo(authToken, params[i]).then((pr) => {
      if (!pr) return;
      typeJsonData[i] = pr;
    });
    await new Promise((resolve) => setTimeout(resolve, 500));
  }

  for (const [type, stats] of Object.entries(typeJsonData)) {
    if (!stats.length) continue;
    for (let i = 0; i < stats.length; i++) {
      jsonData[stats[i].advertId] = stats[i];
    }
  }

  return fs
    .writeFile(filepath, JSON.stringify(jsonData))
    .then(() => console.log(uid, campaignName, "advertsInfos.json created."))
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
      afs.readFileSync(path.join(__dirname, "files/RKаsToCreate.json"))
    );

    const rk_types = { Авто: 8 };
    for (const [index, rk_data] of Object.entries(RKsToCreate)) {
      const campaign = seller_ids[artsData[rk_data.art].seller_id];
      if (!campaign) continue;

      const authToken = getAuthToken("api-token", campaign);
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
  const authToken = getAuthToken("api-token", campaign);
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
  const authToken = getAuthToken("api-token", campaign);
  const adverts = JSON.parse(
    afs.readFileSync(path.join(__dirname, "files", campaign, "adverts.json"))
  );
  const jsonData = {};
  for (const [advertId, advertData] of Object.entries(adverts)) {
    if (!advertId) continue;
    const queryParams = new URLSearchParams();
    queryParams.append("id", advertData.advertId);
    await fetchRKsBudget(authToken, queryParams).then((pr) => {
      if (pr) jsonData[advertId] = pr;
    });
    await new Promise((resolve) => setTimeout(resolve, 700));
  }
  return fs
    .writeFile(
      path.join(__dirname, "files", campaign, "advertBudgets.json"),
      JSON.stringify(jsonData)
    )
    .then(() => console.log("advertBudgets.json created."))
    .catch((error) => console.error(error));
};

const fetchAdvertsBudgetsAndWriteToJsonMM = async (uid, campaignName) => {
  const authToken = getAuthTokenMM(uid, campaignName);
  const adverts = JSON.parse(
    afs.readFileSync(
      path.join(__dirname, "marketMaster", uid, campaignName, "adverts.json")
    )
  );
  const jsonData = {};
  for (const [advertId, advertData] of Object.entries(adverts)) {
    if (!advertId) continue;
    const queryParams = new URLSearchParams();
    queryParams.append("id", advertData.advertId);
    await fetchRKsBudget(authToken, queryParams).then((pr) => {
      if (pr) jsonData[advertId] = pr;
    });
    await new Promise((resolve) => setTimeout(resolve, 700));
  }
  return fs
    .writeFile(
      path.join(
        __dirname,
        "marketMaster",
        uid,
        campaignName,
        "advertsBudgets.json"
      ),
      JSON.stringify(jsonData)
    )
    .then(() => console.log(uid, campaignName, "advertsBudgets.json created."))
    .catch((error) => console.error(error));
};

const fetchAdvertStatsAndWriteToJson = async (campaign) => {
  const authToken = getAuthToken("api-token", campaign);
  const adverts = JSON.parse(
    afs.readFileSync(path.join(__dirname, "files", campaign, "adverts.json"))
  );
  const jsonData = {};
  for (const [advertId, advertData] of Object.entries(adverts)) {
    if (!advertId || !advertData) continue;
    const queryParams = new URLSearchParams();
    if (![9, 11].includes(advertData.status)) continue;
    queryParams.append("id", advertData.advertId);
    console.log(queryParams);
    await getAdvertStat(authToken, queryParams)
      .then((pr) => {
        jsonData[pr.advertId] = pr;
        // console.log(campaign, advertId, data.advertId);
      })
      .catch((er) => console.log(er));
    await new Promise((resolve) => setTimeout(resolve, 20 * 1000));
  }
  return fs
    .writeFile(
      path.join(__dirname, "files", campaign, "advertStats.json"),
      JSON.stringify(jsonData)
    )
    .then(() => console.log("advertStats.json created."))
    .catch((error) => console.error(error));
};

const fetchAdvertsStatsAndWriteToJsonMM = async (uid, campaignName) => {
  const authToken = getAuthTokenMM(uid, campaignName);
  const adverts = JSON.parse(
    afs.readFileSync(
      path.join(__dirname, "marketMaster", uid, campaignName, "adverts.json")
    )
  );
  const jsonData = {};
  let numOfButches = 0;
  const params = [[]];
  const today_str = new Date()
    .toLocaleDateString("ru-RU")
    .replace(/(\d{2})\.(\d{2})\.(\d{4})/, "$3-$2-$1")
    .slice(0, 10);
  for (const [advertId, advertData] of Object.entries(adverts)) {
    if (!advertId || !advertData) continue;
    // if (![9, 11].includes(advertData.status)) continue;
    if (params[numOfButches].length == 100) {
      params.push([]);
      numOfButches++;
    }
    console.log(uid, campaignName, advertId);
    params[numOfButches].push({
      id: advertData.advertId,
      interval: {
        begin: "2019-01-01",
        end: today_str,
      },
    });
  }
  for (let i = 0; i < params.length; i++) {
    await getAdvertsStatsMM(authToken, params[i])
      .then((pr) => {
        for (let j = 0; j < pr.length; j++) {
          const advertId = pr[j].advertId;
          if (!advertId) continue;
          jsonData[advertId] = pr[j];
        }
      })
      .catch((er) => console.log(er));
    await new Promise((resolve) => setTimeout(resolve, 65 * 1000));
  }
  return fs
    .writeFile(
      path.join(
        __dirname,
        "marketMaster",
        uid,
        campaignName,
        "advertsStats.json"
      ),
      JSON.stringify(jsonData)
    )
    .then(() => console.log(uid, campaignName, "advertStats.json created."))
    .catch((error) => console.error(error));
};

const getAdvertsStatByDay = (campaign) => {
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
  const advertStats = JSON.parse(
    afs.readFileSync(
      path.join(__dirname, "files", campaign, "advertStats.json")
    )
  );
  const advertInfos = JSON.parse(
    afs.readFileSync(
      path.join(__dirname, "files", campaign, "advertInfos.json")
    )
  );

  const jsonData = {};
  for (const [advertId, stats] of Object.entries(advertStats)) {
    const days = stats.days;
    if (!advertId || !days) continue;

    const name = advertInfos[advertId].name;
    const type = advertInfos[advertId].type;
    const status = advertInfos[advertId].status;
    const art = name.split("/")[0];
    if (!(advertId in jsonData))
      jsonData[advertId] = { name: name, type: type, status: status, days: {} };
    for (let i = 0; i < days.length; i++) {
      const day = days[i];
      const date = day.date.slice(0, 10);
      // console.log(advertId, jsonData[advertId], date);
      if (!(date in jsonData[advertId].days))
        jsonData[advertId].days[date] = {};

      jsonData[advertId].days[date].clicks = day.clicks;
      jsonData[advertId].days[date].sum = day.sum;
      jsonData[advertId].days[date].views = day.views;

      jsonData[advertId].days[date].orders = orders[date]
        ? orders[date][art]
          ? orders[date][art]
          : 0
        : 0;
      jsonData[advertId].days[date].sum_orders = sum_orders[date]
        ? sum_orders[date][art]
          ? sum_orders[date][art]
          : 0
        : 0;

      jsonData[advertId].days[date].drr = jsonData[advertId].days[date]
        .sum_orders
        ? jsonData[advertId].days[date].sum /
          jsonData[advertId].days[date].sum_orders
        : 1;
    }
  }

  return fs
    .writeFile(
      path.join(__dirname, "files", campaign, "advertStatsByDay.json"),
      JSON.stringify(jsonData)
    )
    .then(() => console.log(campaign, "advertStatsByDay.json created."))
    .catch((error) => console.error(error));
};

const getAdvertsStatByDayMM = (uid, campaignName) => {
  const arts = JSON.parse(
    afs.readFileSync(
      path.join(__dirname, "marketMaster", uid, campaignName, "arts.json")
    )
  );
  const orders = JSON.parse(
    afs.readFileSync(
      path.join(__dirname, "marketMaster", uid, campaignName, "orders.json")
    )
  );
  const advertsStats = JSON.parse(
    afs.readFileSync(
      path.join(
        __dirname,
        "marketMaster",
        uid,
        campaignName,
        "advertsStats.json"
      )
    )
  );
  const advertsInfos = JSON.parse(
    afs.readFileSync(
      path.join(
        __dirname,
        "marketMaster",
        uid,
        campaignName,
        "advertsInfos.json"
      )
    )
  );

  const jsonData = {};
  for (const [advertId, stats] of Object.entries(advertsStats)) {
    const days = stats.days;
    if (!advertId || !days) continue;

    const name = advertsInfos[advertId].name;
    const type = advertsInfos[advertId].type;
    const status = advertsInfos[advertId].status;
    const artsToSumUp = [];
    const splitted = name.split("/")[0];
    if (!(splitted in arts.byArt)) {
      let nms = [];
      if (type == 8) {
        nms = advertsInfos[advertId].autoParams.nms;
      } else {
        const temp = advertsInfos[advertId].params[0].nms;
        for (let i = 0; i < temp.length; i++) {
          nms.push(temp[i].nm);
        }
      }

      for (let i = 0; i < nms.length; i++) {
        if (!arts.byNmId[nms[i]]) continue;
        // console.log(campaignName, nms, arts.byNmId[nms[i]]);
        const sizes = arts.byNmId[nms[i]].sizes;
        for (let j = 0; j < sizes.length; j++) {
          const sku = sizes[j].skus[0];
          const art = arts.bySku[sku].art;
          artsToSumUp.push(art);
        }
      }
    } else {
      artsToSumUp.push(splitted);
    }
    if (!(advertId in jsonData))
      jsonData[advertId] = { name: name, type: type, status: status, days: {} };
    for (let i = 0; i < days.length; i++) {
      const day = days[i];
      const date = day.date.slice(0, 10);
      // console.log(advertId, jsonData[advertId], date);
      if (!(date in jsonData[advertId].days))
        jsonData[advertId].days[date] = {};

      jsonData[advertId].days[date].clicks = day.clicks;
      jsonData[advertId].days[date].sum = day.sum;
      jsonData[advertId].days[date].views = day.views;
      jsonData[advertId].days[date].orders = 0;
      jsonData[advertId].days[date].sum_orders = 0;

      for (let j = 0; j < artsToSumUp.length; j++) {
        const art = artsToSumUp[j];
        if (!orders[date]) continue;
        if (!orders[date][art]) continue;
        // console.log(art);
        jsonData[advertId].days[date].orders = orders[date][art].count
          ? orders[date][art].count
            ? orders[date][art].count
            : 0
          : 0;
        jsonData[advertId].days[date].sum_orders = orders[date][art].sum
          ? orders[date][art].sum
            ? orders[date][art].sum
            : 0
          : 0;
      }

      jsonData[advertId].days[date].drr = jsonData[advertId].days[date]
        .sum_orders
        ? jsonData[advertId].days[date].sum /
          jsonData[advertId].days[date].sum_orders
        : 1;
    }
  }

  return fs
    .writeFile(
      path.join(
        __dirname,
        "marketMaster",
        uid,
        campaignName,
        "advertsStatsByDay.json"
      ),
      JSON.stringify(jsonData)
    )
    .then(() =>
      console.log(uid, campaignName, "advertsStatsByDay.json created.")
    )
    .catch((error) => console.error(error));
};

const fetchAdvertStatsAndWriteToJsonMpManager = async (campaign, now) => {
  const authToken = getAuthTokenMpManager("api-token", campaign);
  const adverts = JSON.parse(
    afs.readFileSync(path.join(__dirname, "files", campaign, "adverts.json"))
  );
  const mp_manager_data = JSON.parse(
    afs.readFileSync(
      path.join(__dirname, "../secrets/mp_manager", `${campaign}.json`)
    )
  );

  const filepath = path.join(
    __dirname,
    "files",
    campaign,
    "advertStatsMpManager.json"
  );
  let jsonData = {};
  if (afs.existsSync(filepath)) {
    jsonData = JSON.parse(afs.readFileSync(filepath));
  }
  const dateTo = new Date(now);
  const dateFrom = new Date(now);
  dateFrom.setDate(dateFrom.getDate() - 31);
  for (const [advertId, advertData] of Object.entries(adverts)) {
    if (!advertId) continue;
    // if ((new Date() - new Date(advertData.changeTime)) / (1000 * 3600 * 24) > 3)
    //   continue;
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
    .writeFile(filepath, JSON.stringify(jsonData))
    .then(() => console.log("advertStats.json created."))
    .catch((error) => console.error(error));
};

const fetchAdvertStatsAndWriteToJsonMpManagerLog = async (campaign, now) => {
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

  const dateTo = new Date(now);
  const dateFrom = new Date(
    dateTo
      .toLocaleDateString("ru-RU")
      .replace(/(\d{2})\.(\d{2})\.(\d{4})/, "$3-$2-$1")
      .slice(0, 10)
  );
  const hour_key = now.toLocaleTimeString("ru-RU").slice(0, 2);
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
  const authToken = getAuthToken("api-token", campaign);
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
  const authToken = getAuthToken("api-token", campaign);
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
      // await updatePlacementsInAutoRK(
      //   authToken,
      //   querystring.stringify({ id: data.advertId }),
      //   {
      //     recom: false,
      //     booster: true,
      //     carousel: false,
      //   }
      // );
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

const fetchArtsAndWriteToJsonMM = (uid, campaignName) => {
  const authToken = getAuthTokenMM(uid, campaignName);
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
    .then((cards) =>
      writeVendorCodesToJsonMM(cards.data.cards, uid, campaignName)
    )
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
  const authToken = getAuthToken("api-token", campaign);
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

const fetchStocksAndWriteToJsonMM = (uid, campaignName) => {
  const authToken = getAuthTokenMM(uid, campaignName);
  const params = {
    dateFrom: "2019-06-20",
  };
  return getStocks(authToken, params)
    .then((data) => writeStocksToJsonMM(data, uid, campaignName))
    .catch((error) => console.error(error));
};

const fetchOrdersAndWriteToJSON = (campaign) => {
  return new Promise((resolve, reject) => {
    const authToken = getAuthToken("api-token", campaign);
    const dateFrom = new Date();
    dateFrom.setDate(dateFrom.getDate() - 30);
    const date = dateFrom.toISOString().slice(0, 10);
    console.log(date);
    const params = {
      dateFrom: date,
    };
    return getOrders(authToken, params)
      .then((data) => {
        if (!data) return;
        fs.writeFile(
          path.join(__dirname, "files", campaign, "orders_full.json"),
          JSON.stringify(data)
        ).then((pr) =>
          writeOrdersToJson(data, campaign, date).then((pr) => resolve())
        );
      })
      .catch((error) => console.error(error.response.data));
  });
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

  const artsBarcodes = JSON.parse(
    afs.readFileSync(
      path.join(__dirname, "files", campaign, "artsBarcodes.json")
    )
  );
  const artsBarcodesFull = JSON.parse(
    afs.readFileSync(
      path.join(__dirname, "files", campaign, "artsBarcodesFull.json")
    )
  );

  const brand_names = {
    МАЮША: "МАЮША",
    DELICATUS: "DELICATUS",
    "Объединённая текстильная компания": "ОТК",
    "Объединённая текстильная компания ЕН": "ОТК ЕН",
    "Amaze wear": "Amaze wear",
    "Creative Cotton": "Creative Cotton",
    Перинка: "Перинка",
    "Trinity Fashion": "Trinity Fashion",
  };

  const excluded = { excluded: [] };
  data.forEach((item) => {
    const supplierArticle = artsBarcodes.reverse[item.barcode];
    // console.log(supplierArticle);
    const get_item_price = () => {
      return item.totalPrice * (1 - item.discountPercent / 100);
    };
    // const get_normalized_price = (cur_count, cur_sum) => {
    //   const price = get_item_price();
    //   const res_if_violated = cur_count ? cur_sum / cur_count : 500;
    //   if (price <= 4000) return price;
    //   return res_if_violated;
    // };

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
      for (const art in artsBarcodes.direct) {
        jsonData[order_date_string][art] = 0;
      }
      // console.log(jsonData[order_date_string]);
    }

    if (!(order_date_string in orderSumJsonData)) {
      orderSumJsonData[order_date_string] = {};
      for (const art in artsBarcodes.direct) {
        orderSumJsonData[order_date_string][art] = 0;
      }
      // console.log(orderSumJsonData[order_date_string]);
    }
    if (!(supplierArticle in jsonData[order_date_string])) {
      jsonData[order_date_string][supplierArticle] = 0;
      orderSumJsonData[order_date_string][supplierArticle] = 0;
    }

    orderSumJsonData[order_date_string][supplierArticle] += get_item_price();
    jsonData[order_date_string][supplierArticle] += 1;

    // ---------------------------
    // console.log(supplierArticle, artsBarcodesFull[supplierArticle], item.barcode);
    if (supplierArticle) {
      const brand = brand_names[artsBarcodesFull[supplierArticle].brand];
      if (!(brand in byDayCampaignSum)) byDayCampaignSum[brand] = {};
      if (!(order_date_string in byDayCampaignSum[brand]))
        byDayCampaignSum[brand][order_date_string] = { count: 0, sum: 0 };
      byDayCampaignSum[brand][order_date_string].sum += get_item_price();
      byDayCampaignSum[brand][order_date_string].count += 1;
    }
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
        orderSumJsonDataByNow.today[supplierArticle] += get_item_price();
        // jsonDataByNow.today[supplierArticle],
        // orderSumJsonDataByNow.today[supplierArticle]
        // // true,
        // // "today"
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
        orderSumJsonDataByNow.yesterday[supplierArticle] += get_item_price();
        // jsonDataByNow.yesterday[supplierArticle],
        // orderSumJsonDataByNow.yesterday[supplierArticle]
        // // true,
        // // "yesterday"
        jsonDataByNow.yesterday[supplierArticle] += 1;

        // if (supplierArticle == "ПР_160_ФИОЛЕТОВЫЙ_ОТК")
        // console.log(item, orderSumJsonDataByNow.yesterday[supplierArticle]);
      }
    }
  });
  fs.writeFile(
    path.join(__dirname, "files", campaign, "excluded.json"),
    JSON.stringify(excluded)
  ).then(() => console.log(campaign, "excluded.xlsx created."));
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
    .then(() => console.log(campaign, "orders by days.json created."))
    .catch((error) => console.error(error));
};

const fetchOrdersAndWriteToJsonMM = (uid, campaignName) => {
  return new Promise((resolve, reject) => {
    const authToken = getAuthTokenMM(uid, campaignName);
    const dateFrom = new Date();
    dateFrom.setDate(dateFrom.getDate() - 30);
    const date = dateFrom.toISOString().slice(0, 10);
    console.log(date);
    const params = {
      dateFrom: date,
    };
    return getOrders(authToken, params)
      .then((data) => {
        if (!data) return;
        writeOrdersToJsonMM(data, uid, campaignName, date).then((pr) =>
          resolve()
        );
      })
      .catch((error) => console.error(error));
  });
};

const calcDeliveryOrdersAndWriteToJsonMM = (uid, campaignName, dateRange) => {
  const warehouses = JSON.parse(
    afs.readFileSync(path.join(__dirname, "marketMaster", "warehouses.json"))
  );
  const arts = JSON.parse(
    afs.readFileSync(
      path.join(__dirname, "marketMaster", uid, campaignName, "arts.json")
    )
  );
  const data = JSON.parse(
    afs.readFileSync(
      path.join(__dirname, "marketMaster", uid, campaignName, "data.json")
    )
  );
  const orders = JSON.parse(
    afs.readFileSync(
      path.join(__dirname, "marketMaster", uid, campaignName, "orders.json")
    )
  );
  const stocks = JSON.parse(
    afs.readFileSync(
      path.join(__dirname, "marketMaster", uid, campaignName, "stocks.json")
    )
  );

  const dateFrom = new Date(dateRange.from);
  dateFrom.setDate(dateFrom.getDate() - 30);
  dateFrom.setHours(0, 0, 0, 0);
  const dateTo = new Date(dateRange.to);
  dateTo.setHours(0, 0, 0, 0);

  const avgOrdersByWarehouse = {};
  for (const [strDate, dateData] of Object.entries(orders)) {
    const curDate = new Date(strDate);
    curDate.setHours(0, 0, 0, 0);

    if (curDate < dateFrom || curDate > dateTo) continue;

    for (const [warehouse, warehouseData] of Object.entries(dateData)) {
      if (warehouse == "all") continue;

      if (!(warehouse in avgOrdersByWarehouse))
        avgOrdersByWarehouse[warehouse] = {};
      for (const [art, artData] of Object.entries(warehouseData)) {
        if (!(art in avgOrdersByWarehouse[warehouse]))
          avgOrdersByWarehouse[warehouse][art] = {
            count: 0,
            orders: 0,
            avg: 0,
          };

        avgOrdersByWarehouse[warehouse][art].count++;
        avgOrdersByWarehouse[warehouse][art].orders += artData.count;
        avgOrdersByWarehouse[warehouse][art].avg =
          avgOrdersByWarehouse[warehouse][art].orders /
          avgOrdersByWarehouse[warehouse][art].count;
      }
    }
  }

  const jsonData = { warehouseNames: [] };
  for (const [warehouseName, _] of Object.entries(avgOrdersByWarehouse)) {
    jsonData.warehouseNames.push(warehouseName);
  }

  // console.log(avgOrdersByWarehouse);
  // afs.writeFileSync(
  //   path.join(__dirname, "marketMaster", uid, campaignName, "avgOrders.json"),
  //   JSON.stringify(avgOrdersByWarehouse)
  // );

  const today = new Date();
  const todayStr = today
    .toLocaleDateString("ru-RU")
    .replace(/(\d{2})\.(\d{2})\.(\d{4})/, "$3-$2-$1")
    .slice(0, 10);

  for (const [art, artData] of Object.entries(arts.byArt)) {
    if (!(art in jsonData)) jsonData[art] = { byWarehouses: {} };
    for (const [warehouse, _warehouseInfo] of Object.entries(
      avgOrdersByWarehouse
    )) {
      // console.log(
      //   art,
      //   warehouse,
      //   avgOrdersByWarehouse[warehouse]
      //     ? avgOrdersByWarehouse[warehouse][art]
      //       ? avgOrdersByWarehouse[warehouse][art]
      //       : undefined
      //     : undefined
      // );
      const currentStocks = stocks[todayStr]
        ? stocks[todayStr][warehouse]
          ? stocks[todayStr][warehouse][art]
            ? stocks[todayStr][warehouse][art].inWayFromClient +
              stocks[todayStr][warehouse][art].quantity
            : 0
          : 0
        : 0;
      const avgOrderRate = avgOrdersByWarehouse[warehouse]
        ? avgOrdersByWarehouse[warehouse][art]
          ? avgOrdersByWarehouse[warehouse][art].avg
          : 0
        : 0;
      const ordersInDateRange = avgOrdersByWarehouse[warehouse]
        ? avgOrdersByWarehouse[warehouse][art]
          ? avgOrdersByWarehouse[warehouse][art].orders
          : 0
        : 0;
      const multiplicity = data[art] ? data[art].multiplicity : 10;
      const min_zakaz = data[art] ? data[art].min_zakaz : 1;
      const prefObor = data[art] ? data[art].pref_obor : 10;
      const toOrderTemp =
        Math.round((avgOrderRate * prefObor - currentStocks) / multiplicity) *
        multiplicity;
      const toOrder =
        avgOrderRate == 0 && currentStocks == 0
          ? min_zakaz
          : toOrderTemp >= 0
          ? toOrderTemp
          : 0;
      const currentObor = avgOrderRate ? currentStocks / avgOrderRate : 999;
      jsonData[art].byWarehouses[warehouse] = {
        toOrder: Math.round(toOrder),
        orders: Math.round(ordersInDateRange),
        orderRate: Math.round(avgOrderRate * 10) / 10,
        obor: Math.round(prefObor),
        stock: Math.round(currentStocks),
        inWayToWarehouse: 100,
        currentObor: Math.round(currentObor),
        price: 400,
      };

      jsonData[art].art = art;
      jsonData[art].object = artData.object;
      jsonData[art].nmId = artData.nmId;
      jsonData[art].title = artData.title;
      jsonData[art].barcode = artData.barcode;
      jsonData[art].size = artData.size;
    }
  }

  afs.writeFileSync(
    path.join(
      __dirname,
      "marketMaster",
      uid,
      campaignName,
      "deliveryOrders.json"
    ),
    JSON.stringify(jsonData)
  );

  return jsonData;
};

const calcMassAdvertsAndWriteToJsonMM = (uid, campaignName, dateRange) => {
  const arts = JSON.parse(
    afs.readFileSync(
      path.join(__dirname, "marketMaster", uid, campaignName, "arts.json")
    )
  );
  const data = JSON.parse(
    afs.readFileSync(
      path.join(__dirname, "marketMaster", uid, campaignName, "data.json")
    )
  );
  const advertsInfos = JSON.parse(
    afs.readFileSync(
      path.join(
        __dirname,
        "marketMaster",
        uid,
        campaignName,
        "advertsInfos.json"
      )
    )
  );
  const stocks = JSON.parse(
    afs.readFileSync(
      path.join(__dirname, "marketMaster", uid, campaignName, "stocks.json")
    )
  );

  const artsWithAdverts = {};
  for (const [advertId, advertInfos] of Object.entries(advertsInfos)) {
    if (!advertId || !advertInfos) continue;

    const type = advertInfos.type;
    const status = advertInfos.status;
    if (![4, 9, 11].includes(status)) continue;

    let nms = [];
    if (type == 8) {
      nms = advertInfos.autoParams.nms ?? [];
    } else {
      const temp = advertInfos.params[0].nms;
      for (let i = 0; i < temp.length; i++) {
        nms.push(temp[i].nm);
      }
    }

    for (let i = 0; i < nms.length; i++) {
      const nmId = nms[i];
      const artData = arts.byNmId[nmId];
      if (!artData) continue;
      const art = artData.art;
      if (!art) continue;

      if (!(art in artsWithAdverts)) artsWithAdverts[art] = {};
      artsWithAdverts[art][advertInfos.advertId] = {
        advertId: advertInfos.advertId,
        type: type,
        status: status,
      };
    }

    // will be neccessary to calc orders
    // for (let i = 0; i < nms.length; i++) {
    //   if (!arts.byNmId[nms[i]]) continue;
    //   // console.log(campaignName, nms, arts.byNmId[nms[i]]);
    //   const sizes = arts.byNmId[nms[i]].sizes;
    //   for (let j = 0; j < sizes.length; j++) {
    //     const sku = sizes[j].skus[0];
    //     const art = arts.bySku[sku].art;
    //     artsToSumUp.push(art);
    //   }
    // }
  }

  const dateFrom = new Date(dateRange.from);
  dateFrom.setDate(dateFrom.getDate() - 30);
  dateFrom.setHours(0, 0, 0, 0);
  const dateTo = new Date(dateRange.to);
  dateTo.setHours(0, 0, 0, 0);

  const today = new Date();
  const todayStr = today
    .toLocaleDateString("ru-RU")
    .replace(/(\d{2})\.(\d{2})\.(\d{4})/, "$3-$2-$1")
    .slice(0, 10);

  const jsonData = {};
  for (const [nmId, artData] of Object.entries(arts.byNmId)) {
    const art = artData.art;
    if (!(art in jsonData)) jsonData[art] = {};

    jsonData[art].art = art;
    jsonData[art].object = artData.object;
    jsonData[art].nmId = nmId;
    jsonData[art].title = artData.title;
    jsonData[art].size = artData.size;
    jsonData[art].adverts = artsWithAdverts[art];
    jsonData[art].stocks = 0;
    jsonData[art].brand = artData.brand;

    const sizes = artData.sizes;
    for (let i = 0; i < sizes.length; i++) {
      const sku = sizes[i].skus[0];
      const local_art = arts.bySku[sku].art;
      jsonData[art].stocks += stocks[todayStr]
        ? stocks[todayStr].all[local_art]
          ? stocks[todayStr].all[local_art].quantity
          : 0
        : 0;
    }
  }

  afs.writeFileSync(
    path.join(__dirname, "marketMaster", uid, campaignName, "massAdverts.json"),
    JSON.stringify(jsonData)
  );

  return jsonData;
};

const fetchSalesAndWriteToJSON = (campaign) => {
  return new Promise((resolve, reject) => {
    const authToken = getAuthToken("api-token", campaign);
    const dateFrom = new Date();
    dateFrom.setDate(dateFrom.getDate() - 30);
    const date = dateFrom.toISOString().slice(0, 10);
    console.log(date);
    const params = {
      dateFrom: date,
    };
    return getSales(authToken, params)
      .then((data) => {
        data = data ? data : {};
        fs.writeFile(
          path.join(__dirname, "files", campaign, "sales_full.json"),
          JSON.stringify(data)
        )
          .then((pr) =>
            writeSalesToJson(data, campaign, date).then((pr) => resolve())
          )
          .catch((error) => {
            console.error(error);
            resolve();
          });
      })
      .catch((error) => {
        console.error(error);
        resolve();
      });
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

const logCurrentProfit = (campaign, brand, profit) => {
  const path_to_profit = path.join(
    __dirname,
    "files",
    campaign,
    "profitLog.json"
  );
  let profitLog = {};
  profitLog[brand] = {};
  if (afs.existsSync(path_to_profit))
    profitLog = JSON.parse(afs.readFileSync(path_to_profit));

  const str_date = new Date()
    .toLocaleDateString("ru-RU")
    .replace(/(\d{2})\.(\d{2})\.(\d{4})/, "$3-$2-$1")
    .slice(0, 10);
  if (!(brand in profitLog)) profitLog[brand] = {};
  if (!(str_date in profitLog[brand])) profitLog[brand][str_date] = [];

  profitLog[brand][str_date].push(profit);

  afs.writeFileSync(path_to_profit, JSON.stringify(profitLog));
};

const calcRNPByDayMetricsAndWriteToJSON = () => {
  const brands = JSON.parse(
    afs.readFileSync(path.join(__dirname, "files", "campaigns.json"))
  ).brands;

  const jsonData = {};
  for (const [campaign, brands_data] of Object.entries(brands)) {
    const byDayCampaignSum = JSON.parse(
      afs.readFileSync(
        path.join(__dirname, "files", campaign, "byDayCampaignSum.json")
      )
    );
    const advertStatsByMaskByDay = JSON.parse(
      afs.readFileSync(
        path.join(
          __dirname,
          "files",
          campaign,
          "advert stats by mask by day.json"
        )
      )
    );
    const stocksRatio = JSON.parse(
      afs.readFileSync(
        path.join(__dirname, "files", campaign, "stocksRatio.json")
      )
    );
    const profitLog = JSON.parse(
      afs.readFileSync(
        path.join(__dirname, "files", campaign, "profitLog.json")
      )
    );
    for (const [index, brand] of Object.entries(brands_data)) {
      if (!(brand in jsonData))
        jsonData[brand] = {
          month: {
            orders: 0,
            sum_orders: 0,
            sum_advert: 0,
            views: 0,
            clicks: 0,
            profit: 0,
            conversion: 0,
            drr: 0,
            sku: 0,
          },
        };

      const now = new Date();
      const cur_date = parseInt(now.toLocaleDateString("ru-RU").slice(0, 2));
      for (let i = 0; i < cur_date; i++) {
        const date = new Date(now);
        date.setDate(date.getDate() - i);
        // console.log(campaign, brand, date);
        const str_date = date
          .toLocaleDateString("ru-RU")
          .replace(/(\d{2})\.(\d{2})\.(\d{4})/, "$3-$2-$1")
          .slice(0, 10);
        if (!(str_date in jsonData[brand]))
          jsonData[brand][str_date] = {
            orders: 0,
            sum_orders: 0,
            sum_advert: 0,
            views: 0,
            clicks: 0,
            profit: 0,
            conversion: 0,
            drr: 0,
            sku: 0,
          };

        // console.log(campaign, brand, str_date);
        const orders_brand_data = byDayCampaignSum[brand];
        const orders_date_data = orders_brand_data
          ? orders_brand_data[str_date]
          : undefined;
        jsonData[brand][str_date].orders = orders_brand_data
          ? orders_date_data
            ? orders_date_data.count
            : 0
          : 0;
        jsonData[brand][str_date].sum_orders = orders_brand_data
          ? orders_date_data
            ? orders_date_data.sum
            : 0
          : 0;
        const advert_brand_data = advertStatsByMaskByDay[brand];
        const advert_date_data = advert_brand_data
          ? advert_brand_data[str_date]
          : undefined;
        jsonData[brand][str_date].sum_advert = advert_brand_data
          ? advert_date_data
            ? advert_date_data.sum
            : 0
          : 0;
        jsonData[brand][str_date].clicks = advert_brand_data
          ? advert_date_data
            ? advert_date_data.clicks
            : 0
          : 0;
        jsonData[brand][str_date].views = advert_brand_data
          ? advert_date_data
            ? advert_date_data.views
            : 0
          : 0;
        jsonData[brand][str_date].drr = jsonData[brand][str_date].sum_orders
          ? jsonData[brand][str_date].sum_advert /
            jsonData[brand][str_date].sum_orders
          : 0;

        jsonData[brand][str_date].conversion = jsonData[brand][str_date].views
          ? jsonData[brand][str_date].orders / jsonData[brand][str_date].views
          : 0;

        jsonData[brand][str_date].sku =
          stocksRatio.byDate.byBrand[brand][str_date] ?? 0;

        ///////////// profit
        let profit_sum_date = 0;
        if (profitLog[brand] && profitLog[brand][str_date])
          for (let i = 0; i < profitLog[brand][str_date].length; i++) {
            profit_sum_date += profitLog[brand][str_date][i];
          }
        jsonData[brand][str_date].profit =
          profit_sum_date && profitLog[brand][str_date].length
            ? profit_sum_date / profitLog[brand][str_date].length
            : 0;

        for (const [metric, value] of Object.entries(
          jsonData[brand][str_date]
        )) {
          jsonData[brand].month[metric] += value;
        }
      }

      jsonData[brand].month.sku /= cur_date;

      jsonData[brand].month.drr = jsonData[brand].month.sum_orders
        ? jsonData[brand].month.sum_advert / jsonData[brand].month.sum_orders
        : 0;
      jsonData[brand].month.conversion = jsonData[brand].month.views
        ? jsonData[brand].month.orders / jsonData[brand].month.views
        : 0;
    }
  }

  return fs
    .writeFile(
      path.join(__dirname, "files", "RNPByDayMetrics.json"),
      JSON.stringify(jsonData)
    )
    .then(() => console.log("RNPByDayMetrics.json created."))
    .catch((error) => console.error(error));
};

const calcAutoEnteredValuesAndWriteToJSON = () => {
  return new Promise((resolve, reject) => {
    const autoPriceRules = JSON.parse(
      afs.readFileSync(path.join(__dirname, `files/autoPriceRules.json`))
    );
    const artsData = JSON.parse(
      afs.readFileSync(path.join(__dirname, `files/data.json`))
    );
    // console.log(autoPriceRules);
    const find_r = (
      art,
      brand,
      obor_data,
      artsBarcodesFull,
      stocks,
      orders
    ) => {
      const generalMask = getGeneralMaskFromVendorCode(art);
      let obor_temp = obor_data[art];
      if (generalMask.includes("ФТБЛ")) {
        let count = 0;
        obor_temp = 0;
        for (const [obor_art, obor_value] of Object.entries(obor_data)) {
          // if (art == obor_art) continue;
          if (
            artsBarcodesFull[art].brand_art ==
            artsBarcodesFull[obor_art].brand_art
          ) {
            obor_temp += stocks[obor_art] ?? 0;
            count += orders[obor_art] ?? 0;
          }
        }

        obor_temp = count ? obor_temp / count : 0;
        // console.log(
        //   art,
        //   brand,
        //   obor_temp,
        //   generalMask,
        //   obor_temp,
        //   // count,
        //   // obor_temp / count
        // );
      }
      const obor = obor_temp;
      for (const [index, value] of Object.entries(autoPriceRules.turn)) {
        if (obor <= parseInt(value)) {
          const temp = autoPriceRules[brand][generalMask][value];
          // if (brand == "DELICATUS" && temp !== null)
          //   console.log(obor, art, parseInt(value), temp);
          if (temp === null) throw new Error(`roi couldnt be found for ${art}`);

          // const res = artsData[art].prime_cost * (1 + temp / 100); // new Процент наценки к себестоимости
          const res = temp; // old just value
          // console.log(art, res, temp);
          return { val: res, ob: temp };
        }
      }
      throw new Error(`roi couldnt be found for ${art}`);
    };
    const brand_names = {
      МАЮША: "МАЮША",
      DELICATUS: "DELICATUS",
      "Объединённая текстильная компания": "ОТК",
      "Объединённая текстильная компания ЕН": "ОТК ЕН",
      "Amaze wear": "Amaze wear",
      "Creative Cotton": "Creative Cotton",
      Перинка: "Перинка",
      "Trinity Fashion": "Trinity Fashion",
    };
    const campaign_brands = JSON.parse(
      afs.readFileSync(path.join(__dirname, `files/campaigns.json`))
    ).brands;
    for (const [campaign, brands] of Object.entries(campaign_brands)) {
      const obor_data = {};
      const xlsx_data = xlsx.parse(
        path.join(__dirname, `files/${campaign}/data.xlsx`)
      );
      for (let i = 0; i < xlsx_data.length; i++) {
        const label_row = xlsx_data[i].data[0];
        for (let j = 1; j < xlsx_data[i].data.length; j++) {
          const row = xlsx_data[i].data[j];
          const art = row[0];
          if (art == "") continue;
          obor_data[art] =
            !isNaN(row[label_row.indexOf("Оборачиваемость")]) &&
            isFinite(row[label_row.indexOf("Оборачиваемость")])
              ? row[label_row.indexOf("Оборачиваемость")]
              : 29; /// set default obor for undefined arts
          if (art == "ПР_120_ГОЛУБОЙ_ОТК_2")
            console.log(row[0], obor_data[row[0]]);
        }
      }

      // console.log(data);
      const jsonData = {};
      const artsBarcodesFull = JSON.parse(
        afs.readFileSync(
          path.join(__dirname, "files", campaign, `artsBarcodesFull.json`)
        )
      );
      const stocks = JSON.parse(
        afs.readFileSync(path.join(__dirname, "files", campaign, `stocks.json`))
      ).today;
      const orders = JSON.parse(
        afs.readFileSync(path.join(__dirname, "files", campaign, `orders.json`))
      );
      for (const [art, art_data] of Object.entries(artsBarcodesFull)) {
        const brand = brand_names[art_data.brand];
        if (!(brand in jsonData)) jsonData[brand] = {};
        try {
          const { val, ob } = find_r(
            art,
            brand,
            obor_data,
            artsBarcodesFull,
            stocks,
            orders
          );
          jsonData[brand][art] = {
            rentabelnost: undefined,
            roi: undefined,
            roz_price: val,
            spp_price: undefined,
            obor: ob,
          };
          // console.log(jsonData[brand][art]);
        } catch (e) {}
      }
      // if (campaign == "mayusha") console.log(jsonData);
      afs.writeFileSync(
        path.join(__dirname, "files", campaign, "enteredValues.json"),
        JSON.stringify(jsonData)
      );
      afs.writeFileSync(
        path.join(__dirname, "files", campaign, "oborData.json"),
        JSON.stringify(obor_data)
      );
    }
    resolve();
  });
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

  const today = new Date();
  const avg = {};
  const jsonData = {};
  for (let i = 1; i < 8; i++) {
    const temp_date = new Date();
    temp_date.setDate(today.getDate() - i);
    const str_date = temp_date
      .toLocaleDateString("ru-RU")
      .replace(/(\d{2})\.(\d{2})\.(\d{4})/, "$3-$2-$1")
      .slice(0, 10);
    if (!orders_by_day[str_date]) continue;
    for (const [art, count] of Object.entries(orders_by_day[str_date])) {
      if (!art) continue;
      if (!(art in avg)) avg[art] = { orders: 0, avg: 0 };
      avg[art].orders += count;
      avg[art].avg = avg[art].orders / 7;
    }
  }
  // console.log(avg);
  for (let i = 1; i < 8; i++) {
    const temp_date = new Date();
    temp_date.setDate(today.getDate() - i);
    const str_date = temp_date
      .toLocaleDateString("ru-RU")
      .replace(/(\d{2})\.(\d{2})\.(\d{4})/, "$3-$2-$1")
      .slice(0, 10);

    if (!orders_by_day[str_date]) continue;
    for (const [art, count] of Object.entries(orders_by_day[str_date])) {
      if (!art) continue;
      if (
        (stocks[str_date]
          ? stocks[str_date][art]
            ? stocks[str_date][art]
            : 0
          : 0) < avg[art].avg
      ) {
        // console.log(art, stocks[str_date][art], avg[art].avg);
        continue;
      }
      if (!(art in jsonData)) jsonData[art] = { orders: 0, count: 0, avg: 0 };
      jsonData[art].orders += count;
      jsonData[art].count++;
      jsonData[art].avg = jsonData[art].orders / jsonData[art].count;
    }
  }
  // console.log(jsonData);
  const avgData = {};
  for (art in jsonData) {
    avgData[art] = jsonData[art].avg;
  }

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

  // ------------------------
  const storageCost = JSON.parse(
    afs.readFileSync(path.join(__dirname, "files", "storageCost.json"))
  )[campaign].cost;
  const byDayCampaignSalesSum = JSON.parse(
    afs.readFileSync(
      path.join(__dirname, "files", campaign, "byDayCampaignSalesSum.json")
    )
  );
  const storageCostForArt = byDayCampaignSalesSum.fullLastWeek.count
    ? storageCost / byDayCampaignSalesSum.fullLastWeek.count
    : 0;
  // ------------------------
  const brands = JSON.parse(
    afs.readFileSync(path.join(__dirname, `files/campaigns.json`))
  ).brands[campaign];
  const xlsx_data = xlsx.parse(
    path.join(__dirname, `files/${campaign}/data.xlsx`)
  );
  const json_data = {};
  for (let i = 0; i < xlsx_data.length; i++) {
    json_data[xlsx_data[i].name] = xlsx_data[i].data;
    console.log(
      campaign,
      xlsx_data[i].name,
      "calculateNewValuesAndWriteToXlsx"
    );
  }
  // console.log(data);
  for (const [index, brand] of Object.entries(brands)) {
    // console.log(brand);
    json_data[brand][0][19] = "Наценка";
    for (let i = 1; i < json_data[brand].length; i++) {
      let row = json_data[brand][i];
      // console.log(row);
      const vendorCode = row[0];
      if (
        !vendorCode ||
        !arts_data[vendorCode] ||
        !enteredValues[brand][vendorCode]
      ) {
        row[14] = "";
        row[15] = "";
        row[16] = "";
        row[17] = "";
        row[18] = "";

        json_data[brand][i] = row;
        continue;
      }

      const calc = (roz_price) => {
        const spp_price = Math.floor(
          roz_price * (1 - arts_data[vendorCode].spp / 100)
        );
        // const commision_percent =
        //   arts_data[vendorCode].spp > arts_data[vendorCode].commission
        //     ? arts_data[vendorCode].commission -
        //       (arts_data[vendorCode].spp - arts_data[vendorCode].commission)
        //     : arts_data[vendorCode].commission;
        const commision_percent = arts_data[vendorCode].commission;
        const commission = roz_price * (commision_percent / 100);
        const delivery = arts_data[vendorCode].delivery;
        const tax = spp_price * (arts_data[vendorCode].tax / 100);
        const expences =
          campaign == "TKS" ? spp_price * 0.07 : arts_data[vendorCode].expences;
        const prime_cost = arts_data[vendorCode].prime_cost;
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
        const rentabelnost = profit / spp_price;

        const roi = profit / (prime_cost + expences);
        return {
          new_rentabelnost: rentabelnost,
          new_roi: roi,
          new_roz_price: roz_price,
          new_spp_price: spp_price,
          new_wb_price: wb_price,
        };
      };
      const entered_rentabelnost =
        enteredValues[brand][vendorCode].rentabelnost / 100;
      const entered_roi = enteredValues[brand][vendorCode].roi / 100;
      const entered_roz_price = enteredValues[brand][vendorCode].roz_price;
      const entered_spp_price = enteredValues[brand][vendorCode].spp_price;
      // console.log(enteredValues[brand][vendorCode], entered_rentabelnost, entered_roi, entered_roz_price, entered_spp_price);
      let count = 0;
      if (entered_rentabelnost !== undefined && !isNaN(entered_rentabelnost))
        count++;
      if (entered_roi !== undefined && !isNaN(entered_roi)) count++;
      if (entered_roz_price !== undefined && !isNaN(entered_roz_price)) count++;
      if (entered_spp_price !== undefined && !isNaN(entered_spp_price)) count++;
      // console.log(count);
      if (count != 1) {
        row[14] = "";
        row[15] = "";
        row[16] = "";
        row[17] = "";
        row[18] = "";

        json_data[brand][i] = row;
        continue;
      }

      const diffs = [];
      const calculateds = {};
      for (let i = 450; i < 2800; i++) {
        const calculated = calc(i);
        let diff = undefined;
        if (entered_roi !== undefined && !isNaN(entered_roi)) {
          diff = Math.abs(calculated.new_roi - entered_roi);
        } else if (
          entered_roz_price !== undefined &&
          !isNaN(entered_roz_price)
        ) {
          diff = Math.abs(calculated.new_roz_price - entered_roz_price);
        } else if (
          entered_spp_price !== undefined &&
          !isNaN(entered_spp_price)
        ) {
          diff = Math.abs(calculated.new_spp_price - entered_spp_price);
        } else if (
          entered_rentabelnost !== undefined &&
          !isNaN(entered_rentabelnost)
        ) {
          diff = Math.abs(calculated.new_rentabelnost - entered_rentabelnost);
        }
        diffs.push(diff);
        calculateds[String(diff)] = calculated;
        // break;
      }

      diffs.sort();
      const min_diff = String(diffs[0]);
      // console.log(min_diff, diffs, calculateds[min_diff])
      row[14] = calculateds[min_diff].new_rentabelnost;
      row[15] = calculateds[min_diff].new_roi;
      row[16] = calculateds[min_diff].new_roz_price;
      row[17] = calculateds[min_diff].new_spp_price;
      row[18] = calculateds[min_diff].new_wb_price;
      row[19] = enteredValues[brand][vendorCode].obor;

      json_data[brand][i] = row;
    }
  }

  const xlsx_data_temp = [];
  for (const [name, sheet_data] of Object.entries(json_data)) {
    xlsx_data_temp.push({ name: name, data: sheet_data });
  }
  // console.log(json_data['Amaze wear']);

  return fs
    .writeFile(
      path.join(__dirname, "files", campaign, "data.xlsx"),
      xlsx.build(xlsx_data_temp)
    )
    .then(() => {
      console.log("data.xlsx created.");
    })
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
  calcAutoEnteredValuesAndWriteToJSON,
  sendTgBotTrendMessage,
  calcRNPByDayMetricsAndWriteToJSON,
  logCurrentProfit,
  fetchPricesAndWriteToJSON,
  getAdvertsStatByDay,
  craftNecessaryFoldersAndFilesIfNeeded,

  fetchAdvertsAndWriteToJsonMM,
  fetchAdvertsInfosAndWriteToJsonMM,
  fetchAdvertsStatsAndWriteToJsonMM,
  fetchAdvertsBudgetsAndWriteToJsonMM,
  getAdvertsStatByDayMM,
  fetchOrdersAndWriteToJsonMM,
  fetchArtsAndWriteToJsonMM,
  fetchStocksAndWriteToJsonMM,
  fetchOfficesAndWriteToJsonMM,
  calcDeliveryOrdersAndWriteToJsonMM,
  calcMassAdvertsAndWriteToJsonMM,
};

const getMaskFromVendorCode = (vendorCode, cut_namatr = true) => {
  if (!vendorCode) return "NO_SUCH_MASK_AVAILABLE";
  const code = vendorCode.split("_");
  if (code.slice(-1) == "2") code.pop();
  if (cut_namatr && code.includes("НАМАТРАСНИК")) code.splice(1, 1);
  else if (code.includes("КПБ")) {
    code.splice(3, 1);
    if (code.includes("DELICATUS")) code.pop();
  } else if (code.includes("ФТБЛ")) {
    if (code.includes("МАЮ")) code.splice(-2, 1);
    else if (code.includes("СС")) code.splice(-2, 1);
    else if (code.includes("TF")) code.splice(-2, 1);
    if (isNaN(parseInt(code.slice(-1)))) code.splice(-1, 1);
    else code.splice(-2, 2);
  } else code.splice(2, 1);

  if (code.includes("ЕН")) code.splice(-2, 1);

  return code.join("_");
};

const getGeneralMaskFromVendorCode = (vendorCode) => {
  const mask = getMaskFromVendorCode(vendorCode, false);
  const mask_array = mask.split("_");
  let campaign_flag = mask_array[mask_array.length - 1];
  if ("САВ" == campaign_flag) mask_array.pop();
  campaign_flag = mask_array[mask_array.length - 1];

  if (["ОТК", "ТКС", "DELICATUS", "ПРК"].includes(campaign_flag))
    mask_array.pop();

  return mask_array.join("_");
};
