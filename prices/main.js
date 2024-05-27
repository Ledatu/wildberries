const xlsx = require("node-xlsx");
const axios = require("axios");
const querystring = require("querystring");
const fs = require("fs").promises;
const afs = require("fs");
const path = require("path");
const { fetchHandStocks, sendEmail } = require("./google_sheets");
const TelegramBot = require("node-telegram-bot-api");
const csv = require("csvtojson");

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
    // console.log(new Date(), uid, campaignName, apiKey);
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
  // console.log(new Date(), authToken);
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
    .catch((error) => console.error(error.response.data));
};

const createDelayedGenTask = (authToken, params) => {
  return axios
    .get(
      "https://seller-analytics-api.wildberries.ru/api/v1/paid_storage",
      {
        headers: {
          Authorization: authToken,
        },
        params: params,
      }
    )
    .then((response) => response.data)
    .catch((error) => console.error(error.response.data));
};

const getBalance = (authToken, throwException = false) => {
  return axios
    .get("https://advert-api.wb.ru/adv/v1/balance", {
      headers: {
        Authorization: authToken,
      },
    })
    .then((response) => response.data)
    .catch((error) => {
      console.log(new Date(), error.response.data);
      if (throwException)
        throw error
    });
};

const fetchBalanceMM = (uid, campaignName) => {
  return new Promise(async (resolve, reject) => {
    const authToken = getAuthTokenMM(uid, campaignName);
    if (!authToken) {
      resolve({});
      return;
    }

    getBalance(authToken, true)
      .then((pr) => {
        if (!pr) {
          reject("bad balance", pr);
          return;
        }
        const balanceLogPath = path.join(__dirname,
          "marketMaster",
          uid,
          campaignName,
          "balanceLog.json"
        );
        const balanceLog = readIfExists(balanceLogPath);
        if (!balanceLog['data']) balanceLog['data'] = [];
        balanceLog.data.push({ balance: pr, time: new Date().toISOString() });
        afs.writeFileSync(
          balanceLogPath,
          JSON.stringify(balanceLog)
        );
        afs.writeFileSync(
          path.join(
            __dirname,
            "marketMaster",
            uid,
            campaignName,
            "balance.json"
          ),
          JSON.stringify(pr)
        );
        resolve(pr);
      })
      .catch((e) => {
        console.log(new Date(), uid, campaignName, "balance", e['response'] ? e.response.data : e);
      });
  });
};

async function fetchBalanceWithRetry(uid, campaignName) {
  let retryCount = 0;
  let balance = null;

  while (retryCount < 2) {
    try {
      balance = await fetchBalanceMM(uid, campaignName);
      break; // If successful, exit the loop
    } catch (error) {
      console.log(new Date(),
        uid,
        campaignName,
        `Error fetching balance: ${error.message}`
      );
      retryCount++;
      console.log(new Date(), uid, campaignName, `Retrying... Attempt ${retryCount}`);
      await new Promise((resolve) => setTimeout(resolve, 4500));
    }
  }

  if (balance === null) {
    console.log(new Date(), uid, campaignName, `Max retries reached. Using preset value.`);
    balance = readIfExists(
      path.join(__dirname, "marketMaster", uid, campaignName, "balance.json")
    );
  }

  return balance;
}

const getDelayedGenTasksStatus = (authToken, params) => {
  return axios
    .get(`https://seller-analytics-api.wildberries.ru/api/v1/paid_storage/tasks/${params.ids[0]}/status`, {
      headers: {
        Authorization: authToken,
      },
    })
    .then((response) => response.data)
    .catch((error) => console.log(new Date(), error.response.data));
};

const downloadDelayedGenTaskData = (authToken, params) => {
  return axios
    .get(
      `https://seller-analytics-api.wildberries.ru/api/v1/paid_storage/tasks/${params.id}/download`,
      {
        headers: {
          Authorization: authToken,
        },
      }
    )
    .then((response) => response.data)
    .catch((error) => console.error(error));
};

const getLocaleDateString = (date) => {
  return date
    .toLocaleDateString("ru-RU")
    .replace(/(\d{2})\.(\d{2})\.(\d{4})/, "$3-$2-$1");
};

const getPaidStorageCostMM = (uid, campaignName) => {
  return new Promise(async (resolve, reject) => {
    const authToken = getAuthTokenMM(uid, campaignName);
    if (!authToken) {
      resolve();
      return;
    }

    const ordersPath = path.join(
      __dirname,
      "marketMaster",
      uid,
      campaignName,
      "orders.json"
    );
    const orders = readIfExists(ordersPath);

    const artsPath = path.join(
      __dirname,
      "marketMaster",
      uid,
      campaignName,
      "arts.json"
    );
    const arts = readIfExists(artsPath);

    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const taskIds = [];
    for (let i = 0; i < 5; i++) {
      const lbd = new Date(today);
      lbd.setDate(today.getDate() - (i + 1) * 7 + 1);
      const rbd = new Date(today);
      rbd.setDate(today.getDate() - i * 7);

      const params = {
        dateFrom: getLocaleDateString(lbd).slice(0, 10),
        dateTo: getLocaleDateString(rbd).slice(0, 10),
      };
      console.log(new Date(), params);
      try {
        const response = await createDelayedGenTask(authToken, params);
        const taskId = response ? response.data ? response.data.taskId : undefined : undefined;
        console.log(new Date(),
          uid,
          campaignName,
          "paid storage delayed",
          "task:",
          taskId,
          params,
          "created"
        );
        if (taskId)
          taskIds.push(taskId);
      } catch (e) { console.log(new Date(), (e)); }
      await new Promise((resolve) => setTimeout(resolve, 65 * 1000));
    }

    if (!taskIds.length) return;

    let readyForDownload = false;
    for (let i = 0; i < taskIds.length + 10; i++) {


      const statusesResponse = await getDelayedGenTasksStatus(authToken, {
        ids: taskIds,
      });
      const statusData = statusesResponse ? statusesResponse.data : undefined;
      if (statusData) {
        let ready = true;

        const { id, status } = statusData;
        console.log(new Date(),
          uid,
          campaignName,
          "paid storage delayed",
          "try:",
          i,
          "task:",
          id,
          status
        );
        if (status != "done") {
          ready = false;
        }

        readyForDownload = ready;
      }

      if (readyForDownload) break;

      await new Promise((resolve) => setTimeout(resolve, 2 * 65 * 1000));
    }

    const jsonData = {};
    if (readyForDownload) {
      for (let i = 0; i < taskIds.length; i++) {
        await new Promise((resolve) => setTimeout(resolve, 1 * 65 * 1000));

        const data = await downloadDelayedGenTaskData(authToken, {
          id: taskIds[i],
        });
        console.log(new Date(),
          uid,
          campaignName,
          "paid storage delayed",
          "task:",
          taskIds[i],
          'fetched'
        );

        for (let j = 0; j < data.length; j++) {
          const { barcode, warehousePrice, date } = data[j];
          const artData = arts.bySku[barcode];
          if (!artData) {
            // console.log(new Date(), uid, campaignName, barcode, 'undefined');
            continue;
          }
          const { art } = artData;
          if (!jsonData[art]) jsonData[art] = { byDate: {} };
          if (!jsonData[art].byDate[date])
            jsonData[art].byDate[date] = { warehousePrice: 0 };
          jsonData[art].byDate[date].warehousePrice += warehousePrice;

          if (!jsonData[campaignName]) jsonData[campaignName] = { byDate: {} };
          if (!jsonData[campaignName].byDate[date])
            jsonData[campaignName].byDate[date] = { warehousePrice: 0 };
          jsonData[campaignName].byDate[date].warehousePrice += warehousePrice;
        }
      }
    }

    afs.writeFileSync(
      path.join(
        __dirname,
        "marketMaster",
        uid,
        campaignName,
        "storageTemp.json"
      ),
      JSON.stringify(jsonData)
    );

    for (const [art, artData] of Object.entries(jsonData)) {
      const total = { warehousePrice: 0, orders: 0, avgCost: 0 };
      if (!art || !artData) continue;
      for (const [date, dateData] of Object.entries(artData.byDate)) {
        if (!date || !dateData) continue;
        const { warehousePrice } = dateData;

        total.warehousePrice += warehousePrice;
        total.orders += orders[date]
          ? orders[date].all[art]
            ? orders[date].all[art].count
            : 0
          : 0;
      }
      total.avgCost = getRoundValue(
        total.warehousePrice,
        total.orders,
        false,
        total.warehousePrice
      );

      jsonData[art].total = total;
    }

    return fs
      .writeFile(
        path.join(__dirname, "marketMaster", uid, campaignName, "storage.json"),
        JSON.stringify(jsonData)
      )
      .then(() => resolve());
  });
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
    .catch(async (error) => {
      console.error(error.response.data); if (error.response.data && error.response.data.code == 429) {
        await new Promise(resolve => setTimeout(resolve, 2 * 60 * 1000))
      }
    });
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
    .then((response) => response.data);
};
const fetchAdvertWords = (
  authToken,
  queryParams,
  type,
  fullstatForAuto = false
) => {
  const url =
    type == 8
      ? fullstatForAuto
        ? "https://advert-api.wb.ru/adv/v2/auto/daily-words"
        : "https://advert-api.wb.ru/adv/v2/auto/stat-words"
      : "https://advert-api.wb.ru/adv/v1/stat/words";
  return axios
    .get(url + "?" + queryParams, {
      headers: {
        Authorization: authToken,
      },
      params: {},
    })
    .then((response) => response.data);
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
    .then((response) => console.log(new Date(), response.data))
    .catch((error) => console.error(error));
};
const createRK = (authToken, params) => {
  return axios
    .post("https://advert-api.wb.ru/adv/v1/save-ad", params, {
      headers: {
        Authorization: authToken,
      },
    })
    .then((response) => console.log(new Date(), response.data))
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
    .then((response) => console.log(new Date(), response.data))
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
    .then((response) => console.log(new Date(), response.data))
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

const getCardsMM = (authToken, params) => {
  return axios
    .post(
      "https://suppliers-api.wildberries.ru/content/v2/get/cards/list?locale=ru",
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

const getGoodsMM = (authToken, params) => {
  return axios
    .get(
      "https://discounts-prices-api.wb.ru/api/v2/list/goods/filter",
      {
        headers: {
          Authorization: authToken,
        },
        params: params,
      }
    )
    .then((response) => response.data)
    .catch((error) => console.error(error.response.data));
};

const getNmDetailReportHistory = (authToken, params) => {
  return axios
    .post(
      "https://seller-analytics-api.wildberries.ru/api/v2/nm-report/detail/history",
      params,
      {
        headers: {
          Authorization: authToken,
        },
      }
    )
    .then((response) => response.data)
    .catch((error) => console.error(error.response.data));
};

const getNmDetailReport = (authToken, params, throwError = false) => {
  return axios
    .post(
      "https://seller-analytics-api.wildberries.ru/api/v2/nm-report/detail",
      params,
      {
        headers: {
          Authorization: authToken,
        },
      }
    )
    .then((response) => response.data)
    .catch((error) => { console.error(error.response.data); if (throwError) throw error.response.data; });
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
    .catch(async (error) => {
      console.error(error.response.data); if (error.response.data && error.response.data.code == 429) {
        await new Promise(resolve => setTimeout(resolve, 2 * 60 * 1000))
      }
    });
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
    .catch(async (error) => {
      console.error(error.response.data); if (error.response.data && error.response.data.code == 429) {
        await new Promise(resolve => setTimeout(resolve, 2 * 60 * 1000))
      }
    });
};

const getPaymentsHistory = (authToken, params) => {
  return axios
    .get("https://advert-api.wb.ru/adv/v1/upd", {
      headers: {
        Authorization: authToken,
      },
      params: params,
    })
    .then((response) => response.data)
    .catch(async (error) => {
      console.error(error.response.data); if (error.response.data && error.response.data.code == 429) {
        await new Promise(resolve => setTimeout(resolve, 2 * 60 * 1000))
      }
    });
};

const fetchPaymentsHistoryMM = async (uid, campaignName) => {
  const authToken = getAuthTokenMM(uid, campaignName);
  const res = await getPaymentsHistory(authToken, { from: '2024-04-23', to: '2024-04-23' })
  afs.writeFileSync(path.join(
    __dirname,
    "marketMaster",
    uid,
    campaignName,
    "paymentHistory.json"
  ), JSON.stringify(res))
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
        .then(() => console.log(new Date(), "warehouses.json created."))
        .catch((error) => console.error(error));
    })
    .catch((error) => console.error(error));
};

const buildXlsx = (campaign, rewriteProfit = false) =>
  new Promise((resolve, reject) => {

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
    // const storageCost = JSON.parse(
    //   afs.readFileSync(path.join(__dirname, "files", "storageCost.json"))
    // )[campaign].cost;
    // const byDayCampaignSalesSum = JSON.parse(
    //   afs.readFileSync(
    //     path.join(__dirname, "files", campaign, "byDayCampaignSalesSum.json")
    //   )
    // );
    // const  = byDayCampaignSalesSum.fullLastWeek.count
    //   ? storageCost / byDayCampaignSalesSum.fullLastWeek.count
    //   : 0;

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
    const orders = JSON.parse(
      afs.readFileSync(path.join(__dirname, "files", campaign, "orders.json"))
    );
    const orders_by_day = JSON.parse(
      afs.readFileSync(
        path.join(__dirname, "files", campaign, "orders by day.json")
      )
    );
    const mapp = {
      mayusha: "ИП Валерий",
      delicatus: "ИП Артем",
      TKS: "Текстиль",
      perinka: "ИП Оксана",
    };
    const advertsAvgStatsByArt = readIfExists(
      path.join(
        __dirname,
        `./marketMaster/4a1f2828-9a1e-4bbf-8e07-208ba676a806/${mapp[campaign]}/advertsAvgStatsByArt.json`
      )
    );
    const advertsStatsByArt = readIfExists(
      path.join(
        __dirname,
        `./marketMaster/4a1f2828-9a1e-4bbf-8e07-208ba676a806/${mapp[campaign]}/advertsStatsByArt.json`
      )
    );
    const prices = readIfExists(
      path.join(
        __dirname,
        `./marketMaster/4a1f2828-9a1e-4bbf-8e07-208ba676a806/${mapp[campaign]}/prices.json`
      )
    );
    const storage = readIfExists(
      path.join(
        __dirname,
        `./marketMaster/4a1f2828-9a1e-4bbf-8e07-208ba676a806/${mapp[campaign]}/storage.json`
      )
    );
    const storageCostForArt = storage[mapp[campaign]]
      ? storage[mapp[campaign]].total.avgCost
      : 0;

    const stocks = readIfExists(
      path.join(
        __dirname,
        `./marketMaster/4a1f2828-9a1e-4bbf-8e07-208ba676a806/${mapp[campaign]}/stocks.json`
      )
    );
    const arts_data = JSON.parse(
      afs.readFileSync(path.join(__dirname, "files/data.json"))
    );

    const arts = readIfExists(
      path.join(
        __dirname,
        `./marketMaster/4a1f2828-9a1e-4bbf-8e07-208ba676a806/${mapp[campaign]}/arts.json`
      )
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
    for (const [art, art_data] of Object.entries(arts.byArt)) {
      const brand = brand_names[art_data.brand] ?? art_data.brand;
      if (art_data.brand == "Объединённая текстильная компания ЕН") continue;
      // const fullBrand = brand + art.includes("_ЕН" ? " ЕН" : "");
      if (!(brand in brand_sheets)) brand_sheets[brand] = [[]];
      if (!(brand in stdProfitSumTKS)) stdProfitSumTKS[brand] = 0;
      if (!(brand in profit_trend))
        profit_trend[brand] = { current: 0, previous: 0 };

      // console.log(new Date(), brand_sheets[brand]);
      let vendorCode = art;
      if (!vendorCode || !arts_data[vendorCode]) continue;
      // if (!prices[art_data.nmId])
      //   console.log(new Date(), sppByArt[art], sppByArt[art].price);
      el = prices[art_data.nmId] ? prices[art_data.nmId].sizes[art_data.size] : {
        price: sppByArt[art]
          ? sppByArt[art].price
            ? sppByArt[art].price * 2
            : 4000
          : 4000,
        discount: 50,
      };
      el.discount = prices[art_data.nmId] ? prices[art_data.nmId].discount : 50;
      // console.log(new Date(), vendorCode, el);

      vendorCode = String(vendorCode);

      const per_day = orders[vendorCode];
      const stock = stocks[today_date_str] ? stocks[today_date_str].all[vendorCode] ? stocks[today_date_str].all[vendorCode].quantity ?? 0 : 0 : 0;
      let obor = stock / per_day;
      if (stock && per_day === 0) {
        obor = 999;
      }
      const mult = arts_data[vendorCode].multiplicity;
      const zakaz =
        Math.round((per_day * arts_data[vendorCode].pref_obor - stock) / mult) *
        mult;

      // if (vendorCode == "ФТБЛ_МУЖ_БАЗА_Ф-7_Серый_52") {
      //   console.log(new Date(), 
      //     zakaz,
      //     per_day,
      //     arts_data[vendorCode].pref_obor,
      //     stock,
      //     mult
      //   );
      // }

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
      const tax = roz_price * (arts_data[vendorCode].tax / 100);
      // const expences = roz_price * (arts_data[vendorCode].expences / 100);
      const expences = campaign == "TKS" ? roz_price * 0.05 : arts_data[vendorCode].expences;
      const prime_cost = arts_data[vendorCode].prime_cost;

      const brand_art = arts.byArt[vendorCode].object;
      // const brand_art = arts.byArt[vendorCode].brand_art;
      // const brand_art = arts.byArt[vendorCode].art;
      // const ad = advertsAvgStatsByArt[brand_art]
      //   ? getRoundValue(
      //     advertsAvgStatsByArt[brand_art].sum,
      //     advertsAvgStatsByArt[brand_art].orders,
      //     false,
      //     advertsAvgStatsByArt[brand_art].sum
      //   )
      //   : 0;
      // const type = brand_art;
      // const type = mapp[campaign];
      // const ad = advertsAvgStatsByArt[type]
      //   ? getRoundValue(
      //     advertsAvgStatsByArt[type].sum,
      //     advertsAvgStatsByArt[type].orders
      //   )
      //   : 0;
      // const drr = ad / roz_price;
      const drr = advertsAvgStatsByArt[brand_art]
        ? advertsAvgStatsByArt[brand_art].drr / 100
        : 0;
      const ad = roz_price * drr;

      const advert_sum_art_today = advertsStatsByArt[vendorCode]
        ? advertsStatsByArt[vendorCode][today_date_str]
          ? advertsStatsByArt[vendorCode][today_date_str].sum
          : 0
        : 0;
      // console.log(new Date(), today_date_str, vendorCode, drr_art_today);

      const profit =
        -ad -
        commission -
        delivery -
        storageCostForArt -
        tax -
        expences -
        prime_cost +
        roz_price;
      // console.log(new Date(), 
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
      const rentabelnost = profit / roz_price;

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
        // console.log(new Date(), tks_profit_today);
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
        "",
        advert_sum_art_today,
        profit_today,
      ]);
    }
    // console.log(new Date(), brand_sheets);

    const xlsx_data = [];
    for (const [brand, brand_sheet] of Object.entries(brand_sheets)) {
      // console.log(new Date(), brand, brand_sheet);
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
        "",
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
    console.log(new Date(), campaign, "Xlsx data generated.");
    // -------------------------
    const hour_key = new Date().toLocaleTimeString("ru-RU").slice(0, 2);
    if (
      ["05", "08", "11", "14", "17", "20", "23"].includes(hour_key) &&
      rewriteProfit
    )
      afs.writeFileSync(path_profit_trend, JSON.stringify(profit_trend));
    // -------------------------

    fs.writeFile(
      path.join(__dirname, "files", campaign, "data.xlsx"),
      xlsx.build(xlsx_data)
    )
      .then(() => {
        console.log(new Date(), "data.xlsx created.");
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
    .then(() => console.log(new Date(), "warehouses.json created."))
    .catch((error) => console.error(error));
};

const calcAnalyticsMM = (uid, campaignName, dateRange, enteredValues) =>
  new Promise((resolve, reject) => {
    dateRange.lbd = new Date(dateRange.lbd)
    dateRange.rbd = new Date(dateRange.rbd)

    const advertsStatsByArt = readIfExists(
      path.join(
        __dirname,
        "marketMaster",
        uid,
        campaignName,
        "advertsStatsByArt.json"
      )
    );

    const tags = readIfExists(path.join(
      __dirname,
      "marketMaster",
      uid,
      campaignName,
      "tags.json"
    ));

    const notes = readIfExists(path.join(
      __dirname,
      "marketMaster",
      uid,
      campaignName,
      "notes.json"
    ));


    const arts = readIfExists(
      path.join(
        __dirname,
        'marketMaster',
        uid,
        campaignName,
        'arts.json'
      )
    );
    arts.byBrandArt = {};
    for (const [nmId, artData] of Object.entries(arts.byNmId)) {
      artData.nmId = parseInt(nmId);
      arts.byBrandArt[artData.art] = artData;
    }

    const nmFullDetailReport = readIfExists(
      path.join(
        __dirname,
        "marketMaster",
        uid,
        campaignName,
        "nmFullDetailReport.json"
      )
    );

    const profitsLog = readIfExists(
      path.join(
        __dirname,
        'marketMaster',
        uid,
        campaignName,
        'profitsLog.json'
      )
    );

    const stocks = readIfExists(
      path.join(
        __dirname,
        'marketMaster',
        uid,
        campaignName,
        'stocks.json'
      )
    );

    const getProfit = (brandArt, date) => {
      const artsToSumUp = [];

      const sizes = arts.byBrandArt[brandArt].sizes;
      for (let i = 0; i < sizes.length; i++) {
        const sku = sizes[i].skus[0];
        const art = arts.bySku[sku].art;
        artsToSumUp.push(art);
      }

      const res = { profit: 0, rentabelnost: 0, count: 0 };
      for (let i = 0; i < artsToSumUp.length; i++) {
        const art = artsToSumUp[i];
        const { profit, rentabelnost } = profitsLog && profitsLog[art] && profitsLog[art][date] ? profitsLog[art][date] : {};

        res.profit += profit ?? 0;
        res.rentabelnost += rentabelnost ?? 0;
        res.count++
      }

      res.profit = getRoundValue(res.profit, res.count)
      res.rentabelnost = getRoundValue(res.rentabelnost, res.count)

      return res;
    }

    const getEntities = (artData) => {
      const entityKeys = enteredValues ? enteredValues['entityKeys'] : ['brand'];
      let res_str = '';
      for (const key of entityKeys) {
        if (key == 'tags') continue;
        else if (key == 'campaignName') res_str += campaignName + '+'
        else res_str += String(artData[key]) + '+'
      }
      res_str = res_str.substring(0, res_str.length - 1);

      if (entityKeys.includes('tags')) {
        const res = [];
        const { nmId } = artData;
        const all = tags[nmId] ?? []

        if (all === undefined) return [];

        for (const tag of all) {
          res.push((res_str !== '' ? res_str + '+' : '') + tag);
        }

        return res;

      }

      return [res_str];
    }

    const isInDateBoundaries = (strDate) => {
      const dateObj = new Date(strDate + 'T00:00:00.000Z');

      return (dateRange.lbd.getTime() - 1) <= dateObj.getTime() && dateObj.getTime() <= (dateRange.rbd.getTime() + 1);
    }

    const byDateEntityStats = {};
    if (nmFullDetailReport) {
      for (const [nmId, nmIdData] of Object.entries(nmFullDetailReport)) {
        if (nmIdData === undefined) continue;
        const artData = arts.byNmId[nmId];
        if (!artData) continue;
        const { art } = artData;
        const entities = getEntities(artData);
        if (entities === undefined) continue;

        for (const entity of entities) {
          if (entity === undefined) continue;

          const stats = nmIdData ? nmIdData.statistics : undefined;
          if (stats === undefined) continue;
          for (const [date, artOrdersData] of Object.entries(stats)) {
            if (!isInDateBoundaries(date)) continue;

            if (!byDateEntityStats[entity]) byDateEntityStats[entity] = {};
            const { profit, rentabelnost } = getProfit(art, date);

            if (!byDateEntityStats[entity][date]) {
              byDateEntityStats[entity][date] = {
                orders: 0,
                sum_orders: 0,
                sales: 0,
                sum_sales: 0,
                sum: 0,
                profit: 0,
                rentabelnost: 0,
                notes: notes[date],
                stocks: 0,
              };
            }

            // console.log(date, artOrdersData);
            byDateEntityStats[entity][date].orders += artOrdersData.ordersCount ?? 0;
            byDateEntityStats[entity][date].sum_orders += artOrdersData.ordersSumRub ?? 0;
            byDateEntityStats[entity][date].sales += artOrdersData.buyoutsCount ?? 0;
            byDateEntityStats[entity][date].sum_sales += artOrdersData.buyoutsSumRub ?? 0;

            const realProfit = (profit ?? 0) * (artOrdersData.ordersCount ?? 0)
            byDateEntityStats[entity][date].profit += realProfit ?? 0;

            byDateEntityStats[entity][date].rentabelnost = getRoundValue(byDateEntityStats[entity][date].profit, byDateEntityStats[entity][date].sum_orders, true)
          }
        }
      }
    }

    if (stocks) {
      for (const [date, dateData] of Object.entries(stocks)) {
        if (!date || !dateData) continue;
        if (!isInDateBoundaries(date)) continue;

        for (const [art, stocksData] of Object.entries(dateData.all)) {
          if (art === undefined || stocksData === undefined) continue;
          const artData = arts.byArt[art];
          if (!artData) continue;
          const entities = getEntities(artData);
          if (entities === undefined) continue;


          for (const entity of entities) {
            if (entity === undefined) continue;

            if (!byDateEntityStats[entity]) byDateEntityStats[entity] = {};

            if (!byDateEntityStats[entity][date]) {
              byDateEntityStats[entity][date] = {
                orders: 0,
                sum_orders: 0,
                sales: 0,
                sum_sales: 0,
                sum: 0,
                profit: 0,
                rentabelnost: 0,
                notes: [],
                stocks: 0,
              };
            }

            const { quantity } = stocksData ?? {};

            byDateEntityStats[entity][date].stocks += quantity ?? 0;

          }
        }
      }
    }

    if (advertsStatsByArt) {
      for (const [brandArt, artStatsByDay] of Object.entries(advertsStatsByArt)) {
        if (artStatsByDay === undefined) continue;
        const artData = arts.byBrandArt[brandArt];
        if (!artData) continue;
        const entities = getEntities(artData);
        if (entities === undefined) continue;

        for (const entity of entities) {
          if (entity === undefined) continue;

          for (const [date, dateStats] of Object.entries(artStatsByDay)) {
            if (!isInDateBoundaries(date)) continue;
            if (!byDateEntityStats[entity]) byDateEntityStats[entity] = {};

            if (!byDateEntityStats[entity][date]) {
              byDateEntityStats[entity][date] = {
                orders: 0,
                sum_orders: 0,
                sales: 0,
                sum_sales: 0,
                sum: 0,
                profit: 0,
                rentabelnost: 0,
                notes: [],
                stocks: 0,
              };
            }

            const { sum } = dateStats;

            byDateEntityStats[entity][date].sum += sum ?? 0;
          }
        }
      }
    }

    // console.log(byDateEntityStats);

    fs.writeFile(
      path.join(__dirname, "marketMaster", uid, campaignName, "analyticsMM.json"),
      JSON.stringify(byDateEntityStats)
    )
      .then(() => {
        resolve(byDateEntityStats);
      })
      .catch((error) => console.error(error));
  });

const calcPricesMM = (uid, campaignName, dateRange, enteredValue = undefined, fixPrices = false) =>
  new Promise((resolve, reject) => {
    dateRange.lbd = new Date(dateRange.lbd)
    dateRange.rbd = new Date(dateRange.rbd)
    console.log(dateRange);

    const advertsStats = readIfExists(
      path.join(
        __dirname,
        'marketMaster',
        uid,
        campaignName,
        'advertsStats.json'
      )
    );
    const adverts = readIfExists(
      path.join(
        __dirname,
        'marketMaster',
        uid,
        campaignName,
        'adverts.json'
      )
    );
    const sppPricesParsed = readIfExists(
      path.join(
        __dirname,
        'marketMaster',
        uid,
        campaignName,
        'sppPricesParsed.json'
      )
    );
    const prices = readIfExists(
      path.join(
        __dirname,
        'marketMaster',
        uid,
        campaignName,
        'prices.json'
      )
    );
    const storage = readIfExists(
      path.join(
        __dirname,
        'marketMaster',
        uid,
        campaignName,
        'storage.json'
      )
    );

    const arts = readIfExists(
      path.join(
        __dirname,
        'marketMaster',
        uid,
        campaignName,
        'arts.json'
      )
    );
    arts.byBrandArt = {};
    for (const [nmId, artData] of Object.entries(arts.byNmId)) {
      artData.nmId = parseInt(nmId);
      arts.byBrandArt[artData.art] = artData;
    }

    const artsDataUploaded = readIfExists(
      path.join(
        __dirname,
        'marketMaster',
        uid,
        campaignName,
        'artsDataUploaded.json'
      )
    );
    const stocks = readIfExists(
      path.join(
        __dirname,
        'marketMaster',
        uid,
        campaignName,
        'stocks.json'
      )
    );

    const nmDetailReport = readIfExists(
      path.join(
        __dirname,
        'marketMaster',
        uid,
        campaignName,
        'nmDetailReport.json'
      )
    );

    const tariffs = readIfExists(
      path.join(
        __dirname,
        'marketMaster',
        uid,
        campaignName,
        'tariffs.json'
      )
    );

    const tags = readIfExists(
      path.join(
        __dirname,
        'marketMaster',
        uid,
        campaignName,
        'tags.json'
      )
    );

    const nmFullDetailReport = readIfExists(
      path.join(
        __dirname,
        'marketMaster',
        uid,
        campaignName,
        'nmFullDetailReport.json'
      )
    );
    const orders = readIfExists(
      path.join(
        __dirname,
        'marketMaster',
        uid,
        campaignName,
        'orders.json'
      )
    );
    const sales = readIfExists(
      path.join(
        __dirname,
        'marketMaster',
        uid,
        campaignName,
        'sales.json'
      )
    );

    const doRecalc = (artData, skipKeys = []) => {
      if (enteredValue && enteredValue['filters']) {
        const { brands, objects, arts } = enteredValue['filters'] ?? { brands: [], objects: [], arts: [] };

        const { brand, object, art } = artData;

        if (!skipKeys.includes('brand') && !brands.includes(brand)) return false;
        if (!skipKeys.includes('object') && !objects.includes(object)) return false;
        if (!skipKeys.includes('art') && !arts.includes(art)) return false;
      }
      return true;
    }

    const today = new Date();
    const strTodayDate = getLocaleDateString(today).slice(0, 10);
    const yesterday = new Date();
    yesterday.setDate(yesterday.getDate() - 1);
    const strYesterdayDate = getLocaleDateString(yesterday).slice(0, 10);

    const calcOrdersForDay = (brandArt, date, isBrandArt = true) => {
      const artsToSumUp = [];
      if (isBrandArt) {
        const sizes = arts.byBrandArt[brandArt].sizes;
        for (let i = 0; i < sizes.length; i++) {
          const sku = sizes[i].skus[0];
          const art = arts.bySku[sku].art;
          artsToSumUp.push(art);
        }
      }
      else {
        artsToSumUp.push(brandArt)
      }

      const res = { orders: 0, sum_orders: 0 };
      for (let i = 0; i < artsToSumUp.length; i++) {
        const art = artsToSumUp[i];
        if (!orders[date]) continue;
        if (!orders[date].all[art]) continue;

        res.orders += orders[date].all[art].count
          ? orders[date].all[art].count
            ? orders[date].all[art].count
            : 0
          : 0;
        res.sum_orders += orders[date].all[art].sum
          ? orders[date].all[art].sum
            ? orders[date].all[art].sum
            : 0
          : 0;
      }

      // console.log(brandArt, artsToSumUp, date);

      return res;
    };

    const isInDateBoundaries = (strDate) => {
      const dateObj = new Date(strDate + 'T00:00:00.000Z');

      return dateRange.lbd <= dateObj && dateObj <= dateRange.rbd;
    }

    const getAvgOrdersPerDay = () => {
      const avg = {};
      if (nmFullDetailReport) {
        for (const [nmId, nmIdData] of Object.entries(nmFullDetailReport)) {
          if (nmIdData === undefined) continue;
          const artData = arts.byNmId[nmId];
          if (!artData) continue;
          const { art } = artData;
          if (art === undefined) continue;
          const stats = nmIdData ? nmIdData.statistics : undefined;
          if (stats === undefined) continue;

          if (!avg[art]) avg[art] = {
            orders: 0,
            sum_orders: 0,
            count: 0,
            avgCost: 0,
            avg: 0,
          };

          for (const [date, artOrdersData] of Object.entries(stats)) {
            if (!isInDateBoundaries(date)) continue;

            avg[art].sum_orders += artOrdersData.ordersSumRub ?? 0;
            avg[art].orders += artOrdersData.ordersCount ?? 0;
            avg[art].count += artOrdersData.ordersCount ? 1 : 0;

          }

          avg[art].avg = avg[art].count ? avg[art].orders / avg[art].count : 0;
          avg[art].avgCost = getRoundValue(avg[art].sum_orders, avg[art].orders);
        }
      }

      return avg;
    }

    const getComissionPercent = (art) => {
      const { lbd, rbd } = dateRange;
      const daysBetween = Math.abs(lbd.getTime() - rbd.getTime()) / 1000 / 86400;

      const artData = sales[art] ? sales[art].all : {};

      const avg = { forPay: 0, sum: 0, percent: 20 };
      for (let i = 0; i <= daysBetween; i++) {
        const tempDate = new Date(lbd);
        tempDate.setDate(tempDate.getDate() + i);
        const strTempDate = getLocaleDateString(tempDate).slice(0, 10);

        const { forPay, sum } = artData[strTempDate] ?? {};
        if (forPay === undefined || sum === undefined) continue;

        avg.forPay += forPay;
        avg.sum += sum;

      }
      avg.percent = 100 - getRoundValue(avg.forPay, avg.sum, true, 0.8);


      if (avg.forPay == 0) {
        const { commision } = artsDataUploaded[art] ?? { commision: 0 };
        return commision;
      }

      return avg.percent;
    }

    const getAvgLogistics = (artData, ktr, volume) => {
      const { lbd, rbd } = dateRange;
      const daysBetween = Math.abs(lbd.getTime() - rbd.getTime()) / 1000 / 86400;

      const logistics = {
        delivery: 0,
        orders: 0,
        sum_orders: 0,
        delivery: 0,
        avg: 0
      }
      const { art, brand, object, nmId } = artData;


      const detailReport = nmDetailReport[nmId]
        ? nmDetailReport[nmId].statistics
        : {};
      const buyoutsPercent = detailReport ? detailReport.buyoutsPercent ? detailReport.buyoutsPercent : 100 : 100;

      for (let daysAgo = 0; daysAgo <= daysBetween; daysAgo++) {
        const tempDate = new Date(lbd);
        tempDate.setDate(tempDate.getDate() + daysAgo);
        const strTempDate = getLocaleDateString(tempDate).slice(0, 10);

        if (!orders[strTempDate]) continue;
        if (!tariffs || !Object.keys(tariffs).length) continue;
        if (!orders[strTempDate].all[art]) {
          const koef = tariffs["Краснодар"].boxDeliveryAndStorageExpr / 100;
          logistics.delivery +=
            (tariffs["Краснодар"].boxDeliveryBase / koef) *
            (volume < 1 ? volume : 1);
          if (volume > 1) {
            logistics.delivery +=
              (volume - 1) * (tariffs["Краснодар"].boxDeliveryLiter / koef);
          }

          logistics.delivery += (1 - buyoutsPercent / 100) * 50;
          logistics.delivery *= ktr ?? 1;

          logistics.orders += 1;
          continue;
        }

        for (const [warehouseName, warehouseData] of Object.entries(
          orders[strTempDate]
        )) {
          if (warehouseName == "all") continue;

          const warehouseOrders = { orders: 0, sum_orders: 0, delivery: 0 };

          const ordersData = warehouseData[art] ?? {};
          const { count, sum } = ordersData;
          if (count === undefined || sum === undefined) continue;

          warehouseOrders.orders += count;
          warehouseOrders.sum_orders += sum;

          const boxDeliveryBase = tariffs[warehouseName]
            ? tariffs[warehouseName].boxDeliveryBase
            : tariffs["Краснодар"].boxDeliveryBase /
            (tariffs["Краснодар"].boxDeliveryAndStorageExpr / 100);
          const boxDeliveryLiter = tariffs[warehouseName]
            ? tariffs[warehouseName].boxDeliveryLiter
            : tariffs["Краснодар"].boxDeliveryLiter /
            (tariffs["Краснодар"].boxDeliveryAndStorageExpr / 100);

          warehouseOrders.delivery +=
            count * boxDeliveryBase * (volume < 1 ? volume : 1);
          if (volume > 1) {
            warehouseOrders.delivery += count * ((volume - 1) * boxDeliveryLiter);
          }

          warehouseOrders.delivery += count * (1 - buyoutsPercent / 100) * 50;
          warehouseOrders.delivery *= ktr ?? 1;

          logistics.delivery += warehouseOrders.delivery;
          logistics.orders += warehouseOrders.orders;
          logistics.sum_orders += warehouseOrders.sum_orders;
        }
      }
      logistics.avg =
        getRoundValue(logistics.delivery, logistics.orders, true) / 100;

      return logistics;
    }

    const getAvgDrr = () => {
      const { lbd, rbd } = dateRange;
      const daysBetween = Math.abs(lbd.getTime() - rbd.getTime()) / 1000 / 86400;

      const drrDataAvg = {};
      for (const [advertId, stats] of Object.entries(advertsStats)) {
        const days = stats.days;
        if (!advertId || !days) continue;
        if (!adverts[advertId]) continue;

        for (let i = 0; i < days.length; i++) {
          const day = days[i];
          const date = day.date.slice(0, 10);

          const dateObj = new Date(date);
          if (dateObj < lbd || dateObj > rbd) continue;

          const ordersByDays = {};

          const apps = day.apps ?? [];
          for (let j = 0; j < apps.length; j++) {
            const nmsStats = apps[j].nm ?? [];
            for (let k = 0; k < nmsStats.length; k++) {
              const nmStat = nmsStats[k];
              const nmId = nmStat.nmId;

              const artData = arts.byNmId[nmId] ?? {};
              const { art, brand, object } = artData;
              if (!art) continue;

              if (!drrDataAvg[art])
                drrDataAvg[art] = {
                  clicks: 0,
                  views: 0,
                  sum: 0,
                  orders: 0,
                  cpo: 0,
                  sum_orders: 0,
                };


              drrDataAvg[art].clicks += nmStat.clicks;
              drrDataAvg[art].views += nmStat.views;
              drrDataAvg[art].sum += nmStat.sum;

              // brandObj
              if (!drrDataAvg[brand]) drrDataAvg[brand] = {}
              if (!drrDataAvg[brand][object])
                drrDataAvg[brand][object] = {
                  clicks: 0,
                  views: 0,
                  sum: 0,
                  orders: 0,
                  cpo: 0,
                  sum_orders: 0,
                };


              drrDataAvg[brand][object].clicks += nmStat.clicks;
              drrDataAvg[brand][object].views += nmStat.views;
              drrDataAvg[brand][object].sum += nmStat.sum;

            }
          }
        }
      }

      if (nmFullDetailReport) {
        for (const [nmId, nmIdData] of Object.entries(nmFullDetailReport)) {
          if (nmIdData === undefined) continue;
          const artData = arts.byNmId[nmId];
          if (!artData) continue;
          const { art, brand, object } = artData;
          if (art === undefined) continue;
          const stats = nmIdData ? nmIdData.statistics : undefined;
          if (stats === undefined) continue;

          if (!drrDataAvg[brand]) drrDataAvg[brand] = {}
          if (!drrDataAvg[brand][object])
            drrDataAvg[brand][object] = {
              clicks: 0,
              views: 0,
              sum: 0,
              orders: 0,
              cpo: 0,
              sum_orders: 0,
            };

          for (const [date, artOrdersData] of Object.entries(stats)) {
            if (!isInDateBoundaries(date)) continue;

            drrDataAvg[brand][object].orders += artOrdersData.ordersCount ?? 0;
            drrDataAvg[brand][object].sum_orders += artOrdersData.ordersSumRub ?? 0;

          }
          drrDataAvg[brand][object].drr = getRoundValue(
            drrDataAvg[brand][object].sum,
            drrDataAvg[brand][object].sum_orders,
            true,
            1
          );
          drrDataAvg[brand][object].cpo = getRoundValue(
            drrDataAvg[brand][object].sum,
            drrDataAvg[brand][object].orders,
          );
        }
      }

      return drrDataAvg;
    }

    const getStorageCost = () => {
      const { lbd, rbd } = dateRange;
      const daysBetween = Math.abs(lbd.getTime() - rbd.getTime()) / 1000 / 86400;

      const res = {}

      for (let daysAgo = 0; daysAgo <= daysBetween; daysAgo++) {
        const tempDate = new Date(lbd);
        tempDate.setDate(tempDate.getDate() + daysAgo);
        const strTempDate = getLocaleDateString(tempDate).slice(0, 10);
        for (const [art, artData] of Object.entries(arts.byArt)) {
          const { brand, object, brand_art } = artData;

          if (!doRecalc(artData, ['art'])) continue;

          const ordersData = calcOrdersForDay(art, strTempDate, false);
          const { orders, sum_orders } = ordersData ?? {};
          if (orders === undefined || sum_orders === undefined) continue;

          if (!res[brand]) res[brand] = {}
          if (!res[brand][object]) res[brand][object] = { warehousePrice: 0, orders: 0, avgCost: 0 };

          const { warehousePrice } = storage[art] ? storage[art].byDate[strTempDate] ?? {} : {};
          if (warehousePrice) {
            res[brand][object].warehousePrice += warehousePrice;
          }

          res[brand][object].orders += orders;

          res[brand][object].avgCost = getRoundValue(
            res[brand][object].warehousePrice,
            res[brand][object].orders,
            false,
            res[brand][object].warehousePrice
          );
        }

      }

      return res;
    }

    const advertsAvgStatsByArt = getAvgDrr();
    const groupedStorage = getStorageCost();
    // console.log(advertsAvgStatsByArt['МАЮША']);

    const iterList = [];
    for (const [art, artData] of Object.entries(arts.byArt)) {
      if (!doRecalc(artData)) continue;
      iterList.push({ art, artData });
    }
    iterList.sort((a, b) => {
      const artA = a.art;
      const stockA = stocks[strTodayDate] ? stocks[strTodayDate].all[artA] ? stocks[strTodayDate].all[artA].quantity ?? 0 : 0 : 0;

      const artB = b.art;
      const stockB = stocks[strTodayDate] ? stocks[strTodayDate].all[artB] ? stocks[strTodayDate].all[artB].quantity ?? 0 : 0 : 0;

      return stockB - stockA;
    })

    const ordersData = getAvgOrdersPerDay();
    // console.log(ordersData);

    const sppJsonToHelp = {}
    const jsonData = {}
    for (let iter = 0; iter < iterList.length; iter++) {
      const { art, artData } = iterList[iter]
      if (art === undefined || artData === undefined) continue;


      const { brand, brand_art, imtId, nmId, size, barcode, title, object } = artData;
      const { ktr, length, width, height, tax, expences } = artsDataUploaded[art] ??
        { ktr: 0, length: 0, width: 0, height: 0, tax: 0, expences: 0 };
      const volume = (length * width * height) / 1000;

      if (!prices[nmId]) continue;

      const detailReport = nmDetailReport[nmId]
        ? nmDetailReport[nmId].statistics
        : {};
      const buyoutsPercent = detailReport ? detailReport.buyoutsPercent ? detailReport.buyoutsPercent : 100 : 100;



      const storageCostForArt = (groupedStorage[brand] ? groupedStorage[brand][object] ? groupedStorage[brand][object] ? groupedStorage[brand][object].avgCost : 0 : 0 : 0);

      const priceInfo = prices[nmId].sizes[size];

      if (enteredValue && enteredValue['discount']) {
        priceInfo.discount = enteredValue['discount'];
      }
      else {
        priceInfo.discount = prices[nmId].discount;
      }

      priceInfo.spp = sppPricesParsed.arts[nmId] ?
        sppPricesParsed.arts[nmId].sizes[size] ?
          sppPricesParsed.arts[nmId].sizes[size].spp
          : undefined : undefined;
      if (priceInfo.spp) {
        if (!sppJsonToHelp[object]) sppJsonToHelp[object] = {}
        if (!sppJsonToHelp[object][priceInfo.spp]) sppJsonToHelp[object][priceInfo.spp] = 0
        sppJsonToHelp[object][priceInfo.spp]++;
      }
      else {
        const findSpp = () => {
          let res = { spp: 0, count: 0 };
          if (!sppJsonToHelp[object]) return 0;
          for (let [spp, count] of Object.entries(sppJsonToHelp[object])) {
            spp = Math.round(Number(spp))
            if (count > res.count) res = { spp, count }
          }
          return res.spp;
        }
        priceInfo.spp = findSpp();
      }
      priceInfo.wb = priceInfo.spp + 3;
      // console.log(priceInfo, sppPricesParsed.arts[nmId]);

      const stock = stocks[strTodayDate] ? stocks[strTodayDate].all[art] ? stocks[strTodayDate].all[art].quantity ?? 0 : 0 : 0;
      const { avg, avgCost } = ordersData[brand_art] ?? { avg: 0, avgCost: 0 };
      const num_sizes = arts.byBrandArt[brand_art].sizes.length;
      const art_avg = num_sizes ? avg / num_sizes : 0;
      // if (art.includes('ФТБЛ')) {
      //   console.log(art, avg, art_avg);
      // }
      const obor = getRoundValue(stock, art_avg ?? 0, false, stock ? 999 : 0);

      const primeCost = artsDataUploaded[art] ? artsDataUploaded[art].prices ? artsDataUploaded[art].prices['Себестоимость 1'] ?? 0 : 0 : 0;
      const commision = getComissionPercent(art)

      const logistics = getAvgLogistics(artData, ktr, volume)
      const deliverySum = logistics.avg;

      const cpo = advertsAvgStatsByArt[brand][object]
        ? advertsAvgStatsByArt[brand][object].cpo
        : 0;

      const getNumVal = (val, divPers = false) => {
        let res = val ? val : 0;
        if (divPers) res = res / buyoutsPercent * 100;
        res = Math.round(res);
        return res;
      }
      const ad = getNumVal(cpo, true);

      let rozPrice;
      let sppPrice;
      let wbWalletPrice;

      if (enteredValue && enteredValue['useAvgCost']) {
        rozPrice = avgCost ? avgCost : Math.round(priceInfo.price * (1 - priceInfo.discount / 100));
        sppPrice = Math.floor(rozPrice * (1 - priceInfo.spp / 100));
        wbWalletPrice = Math.floor(rozPrice * (1 - priceInfo.wb / 100));
      }
      else if (enteredValue && enteredValue['primeCostMarkup']) {
        rozPrice = primeCost * (1 + enteredValue['primeCostMarkup'] / 100);
        sppPrice = Math.floor(rozPrice * (1 - priceInfo.spp / 100));
        wbWalletPrice = Math.floor(rozPrice * (1 - priceInfo.wb / 100));
      }
      else if (enteredValue && enteredValue['rozPrice']) {
        rozPrice = enteredValue['rozPrice'];
        sppPrice = Math.floor(rozPrice * (1 - priceInfo.spp / 100));
        wbWalletPrice = Math.floor(rozPrice * (1 - priceInfo.wb / 100));
      }
      else if (enteredValue && enteredValue['sppPrice']) {
        sppPrice = enteredValue['sppPrice'];
        rozPrice = Math.floor(sppPrice / (1 - priceInfo.spp / 100));
        wbWalletPrice = Math.floor(rozPrice * (1 - priceInfo.wb / 100));
      }
      else if (enteredValue && enteredValue['rentabelnost']) {
        const rent = enteredValue['rentabelnost'];
        const sppPercent = (1 - priceInfo.spp / 100);
        rozPrice = getRoundValue(
          ad + primeCost + deliverySum + storageCostForArt, 1 - (rent / 100) - (commision / 100) - sppPercent * (tax / 100) - sppPercent * (expences / 100)
        );
        sppPrice = Math.floor(rozPrice * sppPercent);
        wbWalletPrice = Math.floor(rozPrice * (1 - priceInfo.wb / 100));
      }
      else if (enteredValue && enteredValue['profit']) {
        const profit = enteredValue['profit'];
        const sppPercent = (1 - priceInfo.spp / 100);
        rozPrice = getRoundValue(
          ad + primeCost + deliverySum + storageCostForArt + profit, 1 - (commision / 100) - sppPercent * (tax / 100) - sppPercent * (expences / 100)
        );
        sppPrice = Math.floor(rozPrice * sppPercent);
        wbWalletPrice = Math.floor(rozPrice * (1 - priceInfo.wb / 100));
      }
      else if (enteredValue && enteredValue['wbWalletPrice']) {
        wbWalletPrice = enteredValue['wbWalletPrice'];
        rozPrice = Math.floor(wbWalletPrice / (1 - priceInfo.wb / 100));
        sppPrice = Math.floor(rozPrice * (1 - priceInfo.spp / 100));
      }
      else {
        rozPrice = Math.round(priceInfo.price * (1 - priceInfo.discount / 100));
        sppPrice = Math.floor(rozPrice * (1 - priceInfo.spp / 100));
        wbWalletPrice = Math.floor(rozPrice * (1 - priceInfo.wb / 100));
      }
      rozPrice = Math.round(rozPrice);
      const wbPrice = Math.round(rozPrice / (1 - priceInfo.discount / 100));


      const comissionSum = rozPrice * (commision / 100);
      const expencesSum = (sppPrice * (expences / 100));
      // if (art == 'КПБ_СЕМ_СТРАЙП_14-4102_ОТК')
      // console.log(logistics);

      const taxSum = sppPrice * (tax / 100);

      const allExpences = ad
        + getNumVal(comissionSum)
        + getNumVal(deliverySum)
        + getNumVal(storageCostForArt)
        + getNumVal(taxSum)
        + getNumVal(expencesSum)
        + getNumVal(primeCost);

      const profit = rozPrice - allExpences

      const rentabelnost = profit / rozPrice;

      const valuesFixedBy = { ...enteredValue };
      delete valuesFixedBy.filters;

      const tags_art = tags[nmId] ?? [];

      jsonData[art] = {
        art,
        brand,
        nmId,
        imtId,
        tags: tags_art,
        size,
        object,
        barcode,
        title,
        priceInfo,
        rozPrice,
        sppPrice,
        wbWalletPrice,
        wbPrice,
        profit,
        stock,
        obor,
        rentabelnost,
        primeCost,
        ad,
        comissionSum,
        deliverySum: getNumVal(deliverySum),
        logistics,
        storageCostForArt: getNumVal(storageCostForArt),
        taxSum,
        expencesSum: getNumVal(expencesSum),
        cpo,
        fixPrices: fixPrices ? valuesFixedBy : undefined,
        buyoutsPercent,
        advertsAvgStats: advertsAvgStatsByArt[brand][object],
        allExpences,
      }
    }

    afs.writeFileSync(
      path.join(__dirname, "marketMaster", uid, campaignName, "sppJsonToHelp.json"),
      JSON.stringify(sppJsonToHelp)
    )

    fs.writeFile(
      path.join(__dirname, "marketMaster", uid, campaignName, "pricesMM.json"),
      JSON.stringify(jsonData)
    )
      .then(() => {
        resolve(jsonData);
      })
      .catch((error) => console.error(error));
  });

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
    .then(() => console.log(new Date(), "vendorCodesFull.json created."))
    .catch((error) => console.error(error));
  fs.writeFile(
    path.join(__dirname, "files", campaign, "artsNmIdsFull.json"),
    JSON.stringify(jsonDataFullByNmId)
  )
    .then(() => console.log(new Date(), "vendorCodesFull.json created."))
    .catch((error) => console.error(error));
  fs.writeFile(
    path.join(__dirname, "files", campaign, "artsBarcodes.json"),
    JSON.stringify(jsonDataBarcodes)
    // xlsx.build([{ name: "a", data: sheet_data }])
  )
    .then(() => console.log(new Date(), "artsBarcodes.json created."))
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
    .then(() => console.log(new Date(), "artsBarcodes.json created."))
    .catch((error) => console.error(error));
  // fs.writeFile(
  //   path.join(__dirname, "files", campaign, "artsBarcodes.xlsx"),
  //   // JSON.stringify(jsonDataBarcodes)
  //   xlsx.build([{ name: "a", data: sheet_data }])
  // )
  //   .then(() => console.log(new Date(), "artsBarcodes.xlsx created."))
  //   .catch((error) => console.error(error));
  return fs
    .writeFile(
      path.join(__dirname, "files", campaign, "vendorCodes.json"),
      JSON.stringify(jsonData)
    )
    .then(() => console.log(new Date(), "vendorCodes.json created."))
    .catch((error) => console.error(error));
};

const writePricesToJsonMM = (data, uid, campaignName) => {
  const jsonData = {}
  for (let i = 0; i < data.length; i++) {
    const good = data[i];
    const { nmID, sizes } = good;
    if (nmID === undefined || sizes === undefined) continue;
    good.nmID = undefined;
    good.nmId = nmID;

    const my_sizes = {}
    for (let j = 0; j < sizes.length; j++) {
      const size = sizes[j];
      const { techSizeName } = size;
      my_sizes[techSizeName] = size;
    }
    good.sizes = my_sizes;

    jsonData[nmID] = good;
  }
  fs.writeFile(
    path.join(
      __dirname,
      "marketMaster",
      uid,
      campaignName,
      "prices.json"
    ),
    JSON.stringify(jsonData)
    // xlsx.build([{ name: "a", data: sheet_data }])
  )
}

const writeVendorCodesToJsonMM = (data, uid, campaignName) => {
  const artsPath = path.join(
    __dirname,
    "marketMaster",
    uid,
    campaignName,
    "arts.json"
  );
  let arts = {};
  // if (afs.existsSync(artsPath)) arts = JSON.parse(afs.readFileSync(artsPath));
  if (!("byArt" in arts)) arts.byArt = {};
  if (!("bySku" in arts)) arts.bySku = {};
  if (!("byNmId" in arts)) arts.byNmId = {};

  data.forEach((item) => {
    // const { length, width, height } =
    // console.log(new Date(), item);

    // const volume = length * width * height;
    // const volume = undefined;

    for (const [index, size_data] of Object.entries(item.sizes)) {
      const size = size_data.techSize;
      const art =
        item.vendorCode.replace(/\s/g, "") + (size != "0" ? `_${size}` : "");

      arts.byArt[art] = {
        art: art,
        object: item.subjectName,
        objectId: item.subjectID,
        brand: item.brand + (art.includes("_ЕН") ? " ЕН" : ""),
        size: size,
        photos: item.photos,
        imtId: item.imtID,
        // color: item.colors[0],
        barcode: size_data.skus[0],
        nmId: item.nmID,
        brand_art: item.vendorCode.replace(/\s/g, ""),
        title: item.title,
        // volume: volume,
      };
      arts.bySku[size_data.skus[0]] = {
        art: art,
        object: item.subjectName,
        objectId: item.subjectID,
        brand: item.brand + (art.includes("_ЕН") ? " ЕН" : ""),
        size: size,
        photos: item.photos,
        imtId: item.imtID,
        // color: item.colors[0],
        barcode: size_data.skus[0],
        nmId: item.nmID,
        brand_art: item.vendorCode.replace(/\s/g, ""),
        title: item.title,
        // volume: volume,
      };
    }
  });

  data.forEach((item) => {
    const art = item.vendorCode.replace(/\s/g, "");
    arts.byNmId[item.nmID] = {
      art: art,
      object: item.subjectName,
      objectId: item.subjectID,
      brand: item.brand + (art.includes("_ЕН") ? " ЕН" : ""),
      sizes: item.sizes,
      colors: item.colors,
      photos: item.photos,
      imtId: item.imtID,
      nmId: item.nmID,
      editableSizePrice: item.editableSizePrice,
      title: item.title,
      // volume: volume,
    };
  });

  return fs
    .writeFile(artsPath, JSON.stringify(arts))
    .then(() => console.log(new Date(), uid, campaignName, "arts.json created."))
    .catch((error) => console.error(error));
};

const writeNmDetailReportToJsonMM = (data, uid, campaignName) => {
  return new Promise((resolve) => {
    const nmDetailReportPath = path.join(
      __dirname,
      "marketMaster",
      uid,
      campaignName,
      "nmFullDetailReport.json"
    );
    const nmDetailReport = readIfExists(nmDetailReportPath);

    data.forEach((item) => {
      if (!item) {
        console.log(new Date(), item);
        return;
      }
      const art = item.vendorCode.replace(/\s/g, "");
      const date = item.statistics.selectedPeriod.begin.slice(0, 10);
      // console.log(item);
      if (!nmDetailReport[item.nmID]) nmDetailReport[item.nmID] = {
        nmId: item.nmID,
        art: art,
        object: item.object,
        brand: item.brandName,
        statistics: {}
      }
      nmDetailReport[item.nmID].statistics[date] = {
        openCardCount: item.statistics.selectedPeriod.openCardCount,
        addToCartCount: item.statistics.selectedPeriod.addToCartCount,
        ordersCount: item.statistics.selectedPeriod.ordersCount,
        ordersSumRub: item.statistics.selectedPeriod.ordersSumRub,
        buyoutsCount: item.statistics.selectedPeriod.buyoutsCount,
        buyoutsSumRub: item.statistics.selectedPeriod.buyoutsSumRub,
        cancelCount: item.statistics.selectedPeriod.cancelCount,
        cancelSumRub: item.statistics.selectedPeriod.cancelSumRub,
        avgPriceRub: item.statistics.selectedPeriod.avgPriceRub,
        avgPriceRub: item.statistics.selectedPeriod.avgPriceRub,
        avgOrdersCountPerDay: item.statistics.selectedPeriod.avgOrdersCountPerDay,
        addToCartPercent: item.statistics.selectedPeriod.conversions.addToCartPercent,
        cartToOrderPercent: item.statistics.selectedPeriod.conversions.cartToOrderPercent,
        buyoutsPercent:
          item.statistics.selectedPeriod.conversions.buyoutsPercent,
      };

      if (!nmDetailReport[item.brandName]) nmDetailReport[item.brandName] = {}
      if (!nmDetailReport[item.brandName][item.object.name]) nmDetailReport[item.brandName][item.object.name] = {}
      if (!nmDetailReport[item.brandName][item.object.name][date]) nmDetailReport[item.brandName][item.object.name][date] =
      {
        statistics: {
          buyoutsPercent: 0,
          sumBuyoutsPercent: 0,
          countBuyoutsPercent: 0,
        },
      }

      nmDetailReport[item.brandName][item.object.name][date].statistics.sumBuyoutsPercent += item.statistics.selectedPeriod.conversions.buyoutsPercent ? item.statistics.selectedPeriod.conversions.buyoutsPercent : 100;
      nmDetailReport[item.brandName][item.object.name][date].statistics.countBuyoutsPercent++;
      nmDetailReport[item.brandName][item.object.name][date].statistics.buyoutsPercent = getRoundValue(
        nmDetailReport[item.brandName][item.object.name][date].statistics.sumBuyoutsPercent,
        nmDetailReport[item.brandName][item.object.name][date].statistics.countBuyoutsPercent
      );

    });

    return fs
      .writeFile(nmDetailReportPath, JSON.stringify(nmDetailReport))
      .then(() => {
        console.log(new Date(), uid, campaignName, "nmFullDetailReport.json created.");
        resolve();
      })
      .catch((error) => console.error(error));
  });
};

const writeCardsTempToJson = (data, campaign) => {
  const jsonData = {};
  data.forEach((item) => {
    jsonData[item.vendorCode] = item.characteristics;
  });
  console.log(new Date(), data);
  return fs
    .writeFile(
      path.join(__dirname, "files", campaign, "cardsTemp.json"),
      JSON.stringify(data)
    )
    .then(() => console.log(new Date(), "cardsTemp.json created."))
    .catch((error) => console.error(error));
};

const writeAdvertsToJson = (data, campaign) => {
  console.log(new Date(), data);
  const jsonData = {};
  const thisMonth = new Date();
  thisMonth.setDate(thisMonth.getDate() - 90);
  if (!data) {
    console.log(new Date(),
      campaignName,
      "no data was provided from getAdverts, nothing to write, skipping..."
    );
    return;
  }
  if (!data.adverts) return;
  for (const [_, item] of Object.entries(data.adverts)) {
    if (_) {
    }
    // console.log(new Date(), item, item.status, new Date(item.changeTime));
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
    .then(() => console.log(new Date(), "adverts.json created."))
    .catch((error) => console.error(error));
};

const writeAdvertsToJsonMM = (data, uid, campaignName) => {
  console.log(new Date(), data);
  // const jsonData = readIfExists(path.join(__dirname, "marketMaster", uid, campaignName, "adverts.json"));
  const jsonData = {};
  const thisMonth = new Date();
  thisMonth.setDate(thisMonth.getDate() - 90);
  if (!data) {
    console.log(new Date(),
      campaignName,
      "no data was provided from getAdverts, nothing to write, skipping..."
    );
    return;
  }
  if (!data.adverts) return;
  for (const [_, item] of Object.entries(data.adverts)) {
    if (_) {
    }
    // console.log(new Date(), item, item.status, new Date(item.changeTime));
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
    .then(() => console.log(new Date(), uid, campaignName, "adverts.json created."))
    .catch((error) => console.error(error));
};

const writeKTErrorsToJson = (data, campaign) => {
  return fs
    .writeFile(
      path.join(__dirname, "files", campaign, "KTerrors.json"),
      JSON.stringify(data)
    )
    .then(() => console.log(new Date(), "KTerrors.json created."))
    .catch((error) => console.error(error));
};

const writeStocksToJson = async (data, campaign, date) => {
  fs.writeFile(
    path.join(__dirname, "files", campaign, "stocksFull.json"),
    JSON.stringify(data)
  )
    .then(() => console.log(new Date(), "stocks.json created."))
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
  // await fetchHandStocks(campaign).then((pr) => {
  //   jsonData = pr;
  //   // console.log(new Date(), jsonData);
  // });

  if (jsonData && Object.keys(jsonData).length == 0) {
    if (data && data.length) {
      data.forEach((item) => {
        const { warehouseName } = item;
        if (warehouseName == "Санкт-Петербург Шушары") return;

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
    .then(() => console.log(new Date(), "stocks.json created."))
    .catch((error) => console.error(error));
};

const writeStocksToJsonMM = async (data, uid, campaignName) => {
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const yesterday = new Date(today);
  const str_date = getLocaleDateString(today).slice(0, 10);
  const yesterdayStr = getLocaleDateString(yesterday).slice(0, 10);
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
  let stocksCurrent = readIfExists(stocksPath);

  const stocks = {};

  if (data && data.length) {
    if (!(str_date in stocks)) stocks[str_date] = { all: {} };
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

      if (warehouseName == "Санкт-Петербург Шушары") return;

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
  } else if (!stocks[str_date]) {
    stocks[str_date] = stocks[yesterdayStr];
  }

  for (const [strDate, dateData] of Object.entries(stocks)) {
    stocksCurrent[strDate] = dateData;
  }

  return fs
    .writeFile(stocksPath, JSON.stringify(stocksCurrent))
    .then(() => console.log(new Date(), uid, campaignName, "stocks.json created."))
    .catch((error) => console.error(error));
};

const writeOrdersToJsonMM = (data, uid, campaignName, date) => {
  const now = new Date();
  const dateFrom = new Date(date);
  console.log(new Date(), now, dateFrom);

  const sppDataPath = path.join(
    __dirname,
    "marketMaster",
    uid,
    campaignName,
    "sppData.json"
  );
  const sppData = readIfExists(sppDataPath);

  const nmFullDetailReport = readIfExists(
    path.join(
      __dirname,
      "marketMaster",
      uid,
      campaignName,
      "nmFullDetailReport.json"
    )
  )

  console.log(new Date(), uid, campaignName);
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
  let ordersCurrent = {};
  try {
    if (afs.existsSync(ordersPath))
      ordersCurrent = JSON.parse(afs.readFileSync(ordersPath));
  }
  catch (e) {
    console.log(new Date(), uid, campaignName, e);
    // return;
  }

  const orders = {};
  data.forEach((item) => {
    if (!(item.barcode in arts.bySku)) return;
    if (item.orderType != 'Клиентский') return;

    const art = arts.bySku[item.barcode].art;
    const brand_art = arts.bySku[item.barcode].brand_art;
    const brand = arts.bySku[item.barcode].brand;
    // console.log(new Date(), supplierArticle);
    const get_item_price = () => {
      // if (item.priceWithDisc == 0) console.log(new Date(), item);
      return item.priceWithDisc;
    };
    const get_item_price_spp = () => {
      // return item.priceWithDisc * (( 100 - item.spp) / 100);
      return item.finishedPrice;
    };

    const order_date = new Date(item.date);
    if (order_date < dateFrom) {
      return;
    }


    const order_date_string = getLocaleDateString(order_date).slice(0, 10);
    if (order_date_string == '2024-04-28' && art == 'КПБ_ЕВРО_СТРАЙП_18-4005_ОТК')
      console.log(item);
    // if (item.isCancel) return;
    // if (order_date_string == '2024-03-30')
    // console.log(new Date(), item);



    if (!(order_date_string in orders)) {
      orders[order_date_string] = { all: {} };
    }


    const warehouseName = item.warehouseName;
    if (!(warehouseName in orders[order_date_string])) {
      orders[order_date_string][warehouseName] = {};
    }

    if (!(art in orders[order_date_string][warehouseName])) {
      orders[order_date_string][warehouseName][art] = {
        count: 0,
        sum: 0,
        sumWithSpp: 0,
      };
    }
    orders[order_date_string][warehouseName][art].count += 1;
    orders[order_date_string][warehouseName][art].sum += get_item_price();
    orders[order_date_string][warehouseName][art].sumWithSpp +=
      get_item_price_spp();


    if (!(art in orders[order_date_string].all)) {
      orders[order_date_string].all[art] = { count: 0, sum: 0, sumWithSpp: 0 };
    }
    orders[order_date_string].all[art].count += 1;
    orders[order_date_string].all[art].sum += get_item_price();
    orders[order_date_string].all[art].sumWithSpp += get_item_price_spp();
    // if (
    //   art == "КПБ_ЕВРО_СТРАЙП_18-4726_ОТК" &&
    //   order_date_string == "2024-02-23"
    // )
    //   console.log(new Date(), 
    //     orders[order_date_string].all[art],
    //     get_item_price(),
    //     get_item_price_spp(),
    //     item.spp
    //   );

    if (!sppData[brand_art]) sppData[brand_art] = {};
    if (item.spp) sppData[brand_art].spp = item.spp;

    if (!(brand in orders[order_date_string].all)) {
      orders[order_date_string].all[brand] = {
        count: 0,
        sum: 0,
        sumWithSpp: 0,
      };
    }
    orders[order_date_string].all[brand].count += 1;
    orders[order_date_string].all[brand].sum += get_item_price();
    orders[order_date_string].all[brand].sumWithSpp += get_item_price_spp();

    if (!(campaignName in orders[order_date_string].all)) {
      orders[order_date_string].all[campaignName] = {
        count: 0,
        sum: 0,
        sumWithSpp: 0,
      };
    }
    orders[order_date_string].all[campaignName].count += 1;
    orders[order_date_string].all[campaignName].sum += get_item_price();
    orders[order_date_string].all[campaignName].sumWithSpp +=
      get_item_price_spp();
  });

  for (const [strDate, dateData] of Object.entries(orders)) {
    ordersCurrent[strDate] = dateData;
  }

  afs.writeFileSync(sppDataPath, JSON.stringify(sppData));

  return Promise.all([fs.writeFile(ordersPath, JSON.stringify(ordersCurrent))])
    .then(() => console.log(new Date(), uid, campaignName, "orders.json created."))
    .catch((error) => console.error(error));
};

const writeSalesToJsonMM = (data, uid, campaignName, date) => {
  const now = new Date();
  const dateFrom = new Date(date);
  console.log(new Date(), now, dateFrom);

  const arts = readIfExists(
    path.join(__dirname, "marketMaster", uid, campaignName, "arts.json")
  );

  // console.log(new Date(), data);

  const salesPath = path.join(
    __dirname,
    "marketMaster",
    uid,
    campaignName,
    "sales.json"
  );
  const salesCurrent = readIfExists(salesPath);

  const sales = { byObject: {} };
  data.forEach((item) => {
    if (!(item.barcode in arts.bySku)) return;
    // console.log(new Date(), item);
    const art = arts.bySku[item.barcode].art;
    const brand = arts.bySku[item.barcode].brand;
    const object = arts.bySku[item.barcode].object;

    if (item.orderType != "Клиентский") {
      // console.log(new Date(), item); 
      return
    };

    const sale_date = new Date(item.date);
    if (sale_date < dateFrom) {
      return;
    }
    const sale_date_string = item.date.slice(0, 10);
    if (item.isCancel /*|| sale_date_string == today*/) {
      return;
    }

    if (!(art in sales)) {
      sales[art] = {
        all: {},
      };
    }

    const warehouseName = item.warehouseName;
    if (!(warehouseName in sales[art])) {
      sales[art][warehouseName] = {};
    }

    if (!(sale_date_string in sales[art][warehouseName])) {
      sales[art][warehouseName][sale_date_string] = {
        count: 0,
        sum: 0,
        finishedPrice: 0,
        forPay: 0,
        spp: 0,
      };
    }
    sales[art][warehouseName][sale_date_string].count += 1;
    sales[art][warehouseName][sale_date_string].sum += item.priceWithDisc;
    sales[art][warehouseName][sale_date_string].forPay += item.forPay;
    sales[art][warehouseName][sale_date_string].finishedPrice +=
      item.finishedPrice;
    sales[art][warehouseName][sale_date_string].spp = Math.round(
      100 -
      getRoundValue(
        sales[art][warehouseName][sale_date_string].finishedPrice,
        sales[art][warehouseName][sale_date_string].sum,
        true
      )
    );

    if (!(sale_date_string in sales[art].all)) {
      sales[art].all[sale_date_string] = {
        count: 0,
        sum: 0,
        finishedPrice: 0,
        forPay: 0,
        spp: 0,
      };
    }
    sales[art].all[sale_date_string].count += 1;
    sales[art].all[sale_date_string].forPay += item.forPay;
    sales[art].all[sale_date_string].sum += item.priceWithDisc;
    sales[art].all[sale_date_string].finishedPrice += item.finishedPrice;
    sales[art].all[sale_date_string].spp = Math.round(
      100 -
      getRoundValue(
        sales[art].all[sale_date_string].finishedPrice,
        sales[art].all[sale_date_string].sum,
        true
      )
    );

    if (!(brand in sales)) {
      sales[brand] = { all: {} };
    }

    if (!(sale_date_string in sales[brand].all)) {
      sales[brand].all[sale_date_string] = {
        count: 0,
        sum: 0,
        finishedPrice: 0,
        spp: 0,
      };
    }
    sales[brand].all[sale_date_string].count += 1;
    sales[brand].all[sale_date_string].sum += item.priceWithDisc;
    sales[brand].all[sale_date_string].finishedPrice += item.finishedPrice;
    sales[brand].all[sale_date_string].spp = Math.round(
      100 -
      getRoundValue(
        sales[brand].all[sale_date_string].finishedPrice,
        sales[brand].all[sale_date_string].sum,
        true
      )
    );
  });

  for (const [key, warehouseData] of Object.entries(sales)) {
    for (const [warehouse, byDateData] of Object.entries(warehouseData)) {
      for (const [date, dateData] of Object.entries(byDateData)) {
        if (!salesCurrent[key]) salesCurrent[key] = {}
        if (!salesCurrent[key][warehouse]) salesCurrent[key][warehouse] = {}

        salesCurrent[key][warehouse][date] = dateData;
      }
    }
  }

  return Promise.all([fs.writeFile(salesPath, JSON.stringify(salesCurrent))])
    .then(() => console.log(new Date(), uid, campaignName, "sales.json created."))
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

    // console.log(new Date(), now, yesterday);
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

        // console.log(new Date(), item, today_string, order_date_string);
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
        console.log(new Date(), campaign, "metricTrends.json created.");
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
  console.log(new Date(), now, dateFrom);
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
      // console.log(new Date(), jsonData[order_date_string]);
    }

    if (!(order_date_string in orderSumJsonData)) {
      orderSumJsonData[order_date_string] = {};
      for (const art in artsBarcodes.direct) {
        orderSumJsonData[order_date_string][art] = 0;
      }
      // console.log(new Date(), orderSumJsonData[order_date_string]);
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
    // console.log(new Date(), 'Last monday:', prevMonday);
    for (let i = 0; i < 7; i++) {
      // last full week
      const cur_date = new Date(prevMonday);
      cur_date.setDate(prevMonday.getDate() + i);
      const str_date = cur_date
        .toLocaleDateString("ru-RU")
        .replace(/(\d{2})\.(\d{2})\.(\d{4})/, "$3-$2-$1")
        .slice(0, 10);

      // console.log(new Date(), str_date);
      if (!byDayCampaignSum[str_date]) continue;
      fullWeekCampaignSalesSum.count += byDayCampaignSum[str_date].count;
      fullWeekCampaignSalesSum.sum += byDayCampaignSum[str_date].sum;
    }
  }
  byDayCampaignSum["fullLastWeek"] = fullWeekCampaignSalesSum;
  fs.writeFile(
    path.join(__dirname, "files", campaign, "excluded_sales.json"),
    JSON.stringify(excluded)
  ).then(() => console.log(new Date(), "excluded_sales.xlsx created."));
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
    .then(() => console.log(new Date(), "sales by days.json created."))
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
    // console.log(new Date(), index, realization);
    // if (realization.doc_type_name != "Продажа") continue;
    if (!realization.order_dt) continue;
    const date = realization.order_dt.slice(0, 10);
    if (!(date in jsonData)) jsonData[date] = createBlank();
    jsonData[date][realization.sa_name] += 1;
  }
  console.log(new Date(), jsonData, temp);
  return fs
    .writeFile(
      path.join(__dirname, "files", campaign, "orders by day.json"),
      JSON.stringify(jsonData)
    )
    .then(() => console.log(new Date(), "orders by day.json created."))
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

      // console.log(new Date(), nms_to_sum_orders);
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
      // console.log(new Date(), str_date);

      result.views += artData[str_date].views ?? 0;
      result.clicks += artData[str_date].clicks ?? 0;
      result.sum += artData[str_date].sum ?? 0;
      if (result.views) result.ctr = result.clicks / result.views;
      if (result.views) result.cpm = result.sum / (result.views / 1000);
      if (result.clicks) result.cpc = result.sum / result.clicks;
      // console.log(new Date(), result);
    }
    result.drr = result.sum / result.sum_orders;
    // result.drr = result.sum_orders ? result.sum / result.sum_orders : 0;
    // console.log(new Date(), result);
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
    .then(() => console.log(new Date(), "fullWeekArtStats.json created."))
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
      // console.log(new Date(), date);
      for (const [index, app] of Object.entries(day.apps)) {
        for (const [index, nm] of Object.entries(app.nm)) {
          if (!vendorCodes[nm.nmId] || !nm.nmId) {
            // console.log(new Date(), nm.nmId, vendorCodes[nm.nmId]);
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
  // console.log(new Date(), jsonData, asdad);

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
        .then(() => console.log(new Date(), "advert stats by mask by day.json created."))
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
      // console.log(new Date(), name, art_id, date);

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
      //   console.log(new Date(), artData.cost, art_id);
      //   continue;
      // }

      // console.log(new Date(), art_id);
      let brand = "";
      if (!artsNmIdsFull[art_id]) {
        // console.log(new Date(), "SKIPPEDDDDDDDDDDD", campaign, art_id, artData.cost);
        const std_brand_names = {
          mayusha: "МАЮША",
          delicatus: "DELICATUS",
          TKS: "ОТК",
          perinka: "Перинка",
        };
        brand = std_brand_names[campaign];

        continue;
      } else {
        brand =
          brand_names[artsNmIdsFull[art_id].brand] ??
          artsNmIdsFull[art_id].brand;
      }
      // console.log(new Date(), artsNmIdsFull[art_id].brand);
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
      // console.log(new Date(), mask);

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
        .then(() => console.log(new Date(), "advert stats by mask by day.json created."))
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
    .then(() => console.log(new Date(), "advert stats by day.json created."))
    .catch((error) => console.error(error));
};

const writeDetailedByPeriodToJson = (data, campaign) =>
  new Promise((resolve, reject) => {
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

        if (1) {
          // const type = getMaskFromVendorCode(
          //   artsBarcodes.reverse[item.barcode]
          // );
          const art = artsBarcodes.reverse[item.barcode] ?? "";
          if (!art || art == "") return;
          const delivery_rub =
            item.delivery_rub *
            (item.supplier_oper_name == "Логистика сторно" ? -1 : 1);

          let type = getMaskFromVendorCode(art).split("_")[0];
          if (art.includes("_ЕН")) type += "_ЕН";
          if (!(type in jsonData)) {
            jsonData[type] = { buyout: 0, delivery: 0 };
          }
          jsonData[type].buyout += item.quantity;
          jsonData[type].delivery += delivery_rub;

          let type_sliced = type.slice(0, 2);
          if (art.includes("_ЕН")) type_sliced += "_ЕН";
          if (!(type_sliced in jsonData)) {
            jsonData[type_sliced] = { buyout: 0, delivery: 0 };
          }
          jsonData[type_sliced].buyout += item.quantity;
          jsonData[type_sliced].delivery += delivery_rub;

          // if (art == "ПР_90_СЕРЫЙ_ТКС")
          //   console.log(new Date(), 
          //     item.quantity,
          //     item.supplier_oper_name,
          //     item.delivery_rub
          //   );
          if (!(art in jsonData)) {
            jsonData[art] = { buyout: 0, delivery: 0 };
          }
          jsonData[art].buyout += item.quantity;
          jsonData[art].delivery += delivery_rub;

          const brand_art = artsBarcodesFull[art].brand_art;
          if (!(brand_art in jsonData)) {
            jsonData[brand_art] = { buyout: 0, delivery: 0 };
          }
          jsonData[brand_art].buyout += item.quantity;
          jsonData[brand_art].delivery += delivery_rub;
        }
      });
      for (const key in jsonData) {
        jsonData[key].delivery = Math.round(jsonData[key].delivery);
        jsonData[key]["average_delivery"] = jsonData[key].buyout
          ? jsonData[key].delivery / jsonData[key].buyout
          : jsonData[key].delivery;
      }
    }
    // console.log(new Date(), campaign, jsonData.date)
    return fs
      .writeFile(
        path.join(__dirname, "files", campaign, "detailedByPeriod.json"),
        JSON.stringify(jsonData ?? {})
      )
      .then(() => {
        console.log(new Date(), "detailedByPeriod.json created.");
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
        // if (art.includes("САВ")) console.log(new Date(), art, generalMask);
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
        console.log(new Date(), "generalMasks.json created.");
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
          jsonData[metric] = `${Math.round(
            metricTrends[brand].today[metric] * (metric == "drr" ? 100 : 1)
          ) / (metric == "drr" ? 100 : 1)
            } * [${trend > 0 ? "+" : ""}${Math.round(trend * 100) / (metric == "drr" ? 100 : 1)
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

    console.log(new Date(), isUpdated);
    console.log(new Date(), storageCost);

    return fs
      .writeFile(
        path.join(__dirname, "files", "storageCost.json"),
        JSON.stringify(storageCost)
      )
      .then(() => {
        console.log(new Date(), "storageCost.json created.");
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
      prevMonday.getDate() - 28 - ((prevMonday.getDay() + 6) % 7)
    );
    const prevSunday = new Date();
    prevSunday.setDate(
      prevSunday.getDate() - 7 - ((prevSunday.getDay() - 7) % 7)
    );
    const params = {
      // dateFrom: prevMonday.toISOString().split("T")[0],
      // dateTo: prevSunday.toISOString().split("T")[0],
      dateFrom: "2024-02-24",
      dateTo: "2024-02-24",
    };
    console.log(new Date(), params);
    // return 0;
    return getDetailedByPeriod(authToken, params)
      .then((data) => {
        console.log(new Date(), campaign, data ? true : false);
        fs.writeFile(
          path.join(__dirname, "files", campaign, "detailedByPeriod_full.json"),
          JSON.stringify(data ?? {})
        );
        return writeDetailedByPeriodToJson(data, campaign).then((pr) => {
          // const shallowEqual = (object1, object2) => {
          //   // console.log(new Date(), object1, object2)
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
          // console.log(new Date(), isEqual);
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
        // console.log(new Date(), feedback);
        const art = feedback.productDetails.supplierArticle.replace(/\s/g, "");
        if (!art) continue;
        if (!(art in jsonData)) jsonData[art] = [];
        jsonData[art].push(feedback);
      }
      // console.log(new Date(), jsonData);
      return fs
        .writeFile(
          path.join(__dirname, "files", campaign, "feedbacks.json"),
          JSON.stringify(jsonData)
        )
        .then(() => {
          console.log(new Date(), "feedbacks.json created.");
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
      console.log(new Date(), art, art_feedbacks.length);
      const mask = getMaskFromVendorCode(art);
      const answers = answerTemplates[mask];
      for (const [index, feedback_data] of Object.entries(art_feedbacks)) {
        if (!answers || !answers.length) continue;
        if (feedback_data.productValuation < 4) continue;
        // console.log(new Date(), feedback_data.id, art, mask, answers[0]);
        // console.log(new Date(), "");
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
        console.log(new Date(), "answerTemplates.json shifted.");
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
  // console.log(new Date(), brands, campaign, brand);

  const authToken = getAuthToken("api-token", campaign);
  const newPricesPath = path.join(
    __dirname,
    `files/${campaign}/newPrices.json`
  );
  const newPrices = readIfExists(newPricesPath)
  console.log(new Date(), campaign, newPrices);

  if (!newPrices || !newPrices.data || !newPrices.data.length) {
    fs.rm(newPricesPath);
    return 0;
  }

  axios
    .post(
      "https://discounts-prices-api.wb.ru/api/v2/upload/task",
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

const updatePricesMM = async (uid, campaignName, params) => {
  const authToken = getAuthTokenMM(uid, campaignName);
  console.log(new Date(), uid, campaignName, params);

  axios
    .post(
      "https://discounts-prices-api.wb.ru/api/v2/upload/task",
      params,
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
        path.join(__dirname, "marketMaster", uid, campaignName, "updatePricesErrorLog.json"),
        JSON.stringify(error)
      );
    });
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
        if (!data) return
        for (const [index, art_data] of Object.entries(data)) {
          // console.log(new Date(), art_data)
          // console.log(new Date(), artsNmIdsFull[art_data.nmId].supplierArticle);
          jsonData[art_data.nmId] = art_data;
        }
        return fs
          .writeFile(
            path.join(__dirname, "files", campaign, "prices.json"),
            JSON.stringify(jsonData)
          )
          .then(() => {
            console.log(new Date(), "prices.json created.");
            resolve();
          })
          .catch((error) => console.error(error));
      })
      .catch((error) => console.error(error));
  });

const fetchDataAndWriteToXlsx = (campaign, rewriteProfit = false) => {
  return new Promise((resolve) => {
    const mapp = {
      mayusha: "ИП Валерий",
      delicatus: "ИП Артем",
      TKS: "Текстиль",
      perinka: "ИП Оксана",
    };
    return fetchArtsPricesAndWriteToJsonMM('4a1f2828-9a1e-4bbf-8e07-208ba676a806', mapp[campaign])
      .then(async () => {
        await buildXlsx(campaign, rewriteProfit).then(() => resolve());
      })
      .catch((error) => console.error(error));
  });
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
        .then(() => console.log(new Date(), "subjects.json created."))
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
  console.log(new Date(), skus);
  const warehouses = JSON.parse(
    afs.readFileSync(path.join(__dirname, "files", campaign, "warehouses.json"))
  );
  const data = {};
  for (const [index, warehouse] of Object.entries(warehouses)) {
    // console.log(new Date(), key, id);
    // if (!warehouse.selected) continue;
    console.log(new Date(), warehouse);

    await getWarehouseStocks(authToken, warehouse.id, {
      skus: skus,
    }).then((pr) => {
      console.log(new Date(), warehouse, pr);
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
    .then(() => console.log(new Date(), "warehouseStocks.json created."))
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
  // console.log(new Date(), params);
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
    .then(() => console.log(new Date(), campaign, "advertInfos.json created."))
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
  let jsonData = readIfExists(filepath)
  const params = [[]];
  let count = 0;
  for (const [advertId, advertData] of Object.entries(adverts)) {
    if (jsonData[advertId] && jsonData[advertId].status == advertData.status) {

      const today = new Date();
      today.setHours(0, 0, 0, 0);
      const endDate = new Date(advertData.changeTime);
      endDate.setHours(0, 0, 0, 0);
      const daysPassed = (today.getTime() - endDate.getTime()) / 86400 / 1000;
      // console.log(new Date(), new Date(advertData.endTime.slice(0, 10)), new Date(), dayyss);
      if (daysPassed >= 30) {
        continue;
      }
    }

    params[params.length - 1].push(advertData.advertId);
    count++;
    if (count % 50 == 0) params.push([]);
  }

  const typeJsonData = {};
  for (let i = 0; i < params.length; i++) {
    await getAdvertInfo(authToken, params[i]).then((pr) => {
      // console.log(new Date(), pr);
      if (!pr) return;
      typeJsonData[i] = pr;
    });
    console.log(new Date(),
      uid,
      campaignName,
      `${i + 1}/${params.length}`,
      "infos updated."
    );

    await new Promise((resolve) => setTimeout(resolve, 3500));
  }

  for (const [type, stats] of Object.entries(typeJsonData)) {
    if (!stats.length) continue;
    for (let i = 0; i < stats.length; i++) {
      const advertId = stats[i].advertId;

      if (jsonData[advertId]) jsonData[advertId].status = stats[i].status;

      if (stats[i].type == 8) {
        if (stats[i].status != 7 && (!stats[i].autoParams || !stats[i].autoParams.nms)) {
          console.log(new Date(), stats[i]);
          continue;
        }
      }
      else if (stats[i].type == 9) {
        if (stats[i].status != 7 && (!stats[i].unitedParams || !stats[i].unitedParams[0].nms)) {
          console.log(new Date(), stats[i]);
          continue;
        }
      }
      jsonData[advertId] = stats[i];
      jsonData[advertId].updateTime = new Date().toLocaleString("ru-RU");
      // console.log(new Date(), uid, campaignName, advertId, "infos updated.");
    }
  }

  return fs
    .writeFile(filepath, JSON.stringify(jsonData))
    .then(() => console.log(new Date(), uid, campaignName, "advertsInfos.json created."))
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
        console.log(new Date(), campaign, "Creating", rk_data);
        // continue;

        await createRK(authToken, {
          type: rk_types[rk_data.rk_type],
          name: rk_data.art,
          subjectId: subjects[rk_data.subjects],
          sum: rk_data.budget,
          btype: 1,
        });
        await new Promise((resolve) => setTimeout(resolve, 10000));
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
    console.log(new Date(), name, to_create_params);
    // continue;

    console.log(new Date(),
      campaign,
      "Setting fixed phrases:",
      to_create_params.phrase,
      "for",
      name,
      rk_data.advertId
    );
    // continue;
    const rk_id = rk_data.advertId;
    console.log(new Date(),
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
    await new Promise((resolve) => setTimeout(resolve, 2000));
  }
  return fs
    .writeFile(
      path.join(__dirname, "files", campaign, "advertBudgets.json"),
      JSON.stringify(jsonData)
    )
    .then(() => console.log(new Date(), "advertBudgets.json created."))
    .catch((error) => console.error(error));
};

const fetchAdvertsBudgetsAndWriteToJsonMM = async (uid, campaignName) => {
  const authToken = getAuthTokenMM(uid, campaignName);
  const advertsInfos = readIfExists(
    path.join(__dirname, "marketMaster", uid, campaignName, "advertsInfos.json")
  );
  const adverts = readIfExists(
    path.join(__dirname, "marketMaster", uid, campaignName, "adverts.json")
  );
  const advertsIds = [];
  for (const [advertId, advertData] of Object.entries(advertsInfos)) {
    if (!advertId || !advertData) continue;

    if (!adverts[advertId]) continue;

    if (![9, 11].includes(advertData.status)) {
      continue;
    }
    advertsIds.push(advertData.advertId);
  }
  console.log(new Date(), uid, campaignName, advertsIds.length, "budgets to fetch.");
  const jsonData = {};
  const jsonDataLog = readIfExists(path.join(
    __dirname,
    "marketMaster",
    uid,
    campaignName,
    "advertsBudgetsLog.json"
  ))
  let retry = false;
  for (let i = 0; i < advertsIds.length; i++) {
    const advertId = advertsIds[i];
    const queryParams = new URLSearchParams();
    queryParams.append("id", advertId);
    await fetchRKsBudget(authToken, queryParams)
      .then((pr) => {
        if (!pr) return;

        if (retry) {
          retry = false;
        }
        const budget = pr.total;
        jsonData[advertId] = budget;
        if (!jsonDataLog[advertId]) jsonDataLog[advertId] = []
        jsonDataLog[advertId].push({ budget: budget, time: new Date().toISOString() });
        console.log(new Date(), uid, campaignName, "fetched", advertId, "budget:", budget);
      })
      .catch(async (e) => {
        console.log(new Date(),
          uid,
          campaignName,
          "couldn't fetch",
          advertId,
          "budget, retrying..."
        );
        if (retry) {
          retry = false;
          return;
        } else {
          i--;
          retry = true;
          await new Promise((resolve) => setTimeout(resolve, 10 * 1000));
        }
      });
    await new Promise((resolve) => setTimeout(resolve, 1000));
  }

  afs.writeFileSync(path.join(
    __dirname,
    "marketMaster",
    uid,
    campaignName,
    "advertsBudgetsLog.json"
  ),
    JSON.stringify(jsonDataLog)
  )

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
    .then(() => console.log(new Date(), uid, campaignName, "advertsBudgets.json created."))
    .catch((error) => console.error(error));
};

const fetchAdvertsWordsAndWriteToJsonMM = async (uid, campaignName) => {
  try {


    const authToken = getAuthTokenMM(uid, campaignName);
    const advertsInfosPath = path.join(
      __dirname,
      "marketMaster",
      uid,
      campaignName,
      "advertsInfos.json"
    );
    const advertsInfos = readIfExists(advertsInfosPath);
    const advertsPath = path.join(
      __dirname,
      "marketMaster",
      uid,
      campaignName,
      "adverts.json"
    );
    const adverts = readIfExists(advertsPath);
    const advertsWordsPath = path.join(
      __dirname,
      "marketMaster",
      uid,
      campaignName,
      "advertsWords.json"
    );
    const advertsWords = readIfExists(advertsWordsPath);

    const advertsIds = [];
    for (const [advertId, advertData] of Object.entries(advertsInfos)) {
      if (!advertId || !advertData) continue;

      if (!adverts[advertId]) continue;

      if (![9, 11].includes(advertData.status)) continue;
      if (advertData.type != 8 && advertData.type != 6 && advertData.type != 9) continue;
      advertsIds.push({ id: advertData.advertId, type: advertData.type });
    }
    console.log(new Date(), uid, campaignName, advertsIds.length, "words to fetch.");
    const jsonData = {};
    let retryCount = 0;
    for (let i = 0; i < advertsIds.length; i++) {
      retryCount = 0;
      const { id, type } = advertsIds[i];
      if (!id || !type) continue;
      // if (advertId != 13546637) continue;
      const queryParams = new URLSearchParams();
      queryParams.append("id", id);
      await fetchAdvertWords(authToken, queryParams, type)
        .then(async (pr) => {
          if (!pr) return;

          // if (id == "15910048") {
          //   console.log(new Date(), pr);
          // }

          const currentStat = advertsWords[id] ? advertsWords[id].stat ?? {} : {};
          const statOnMinus = advertsWords[id] ? advertsWords[id].statOnMinus ?? {} : {};
          const stat = {};
          if (type == 8) {
            await fetchAdvertWords(authToken, queryParams, type, true).then(
              (fullstat) => {
                if (!fullstat) return;

                for (let i = 0; i < fullstat.length; i++) {
                  const dateStat = fullstat[i].stat;
                  // console.log(new Date(), dateStat);
                  for (let j = 0; j < dateStat.length; j++) {
                    const { keyword, views, clicks, sum } = dateStat[j];
                    if (
                      keyword === undefined ||
                      views === undefined ||
                      clicks === undefined
                    ) {
                      continue;
                    }

                    if (!stat[keyword])
                      stat[keyword] = {
                        keyword: keyword,
                        views: 0,
                        clicks: 0,
                        sum: 0,
                        ctr: 0,
                      };

                    stat[keyword].views += views;
                    stat[keyword].clicks += clicks;
                    stat[keyword].sum += sum;
                    stat[keyword].ctr = getRoundValue(
                      stat[keyword].clicks,
                      stat[keyword].views,
                      true
                    );
                  }
                }

                console.log(new Date(),
                  uid,
                  campaignName,
                  "fetched",
                  id,
                  "phrases fullstats"
                );
              }
            );
            await new Promise((resolve) => setTimeout(resolve, 500));
          } else if (type == 6 || type == 9) {
            if (pr.stat) {

              for (let i = 0; i < pr.stat.length; i++) {
                const keywordStat = pr.stat[i];
                const { keyword, views, clicks, sum } = keywordStat;

                if (keyword == "Всего по кампании") continue;

                if (
                  keyword === undefined ||
                  views === undefined ||
                  clicks === undefined
                ) {
                  continue;
                }

                if (!stat[keyword])
                  stat[keyword] = {
                    keyword: keyword,
                    views: 0,
                    clicks: 0,
                    sum: 0,
                    ctr: 0,
                  };

                stat[keyword].views += views;
                stat[keyword].clicks += clicks;
                stat[keyword].sum += sum;
                stat[keyword].ctr = getRoundValue(
                  stat[keyword].clicks,
                  stat[keyword].views,
                  true
                );
              }
            }

          }

          for (const [keyword, keywordStat] of Object.entries(stat)) {
            currentStat[keyword] = keywordStat;
          }

          pr.stat = currentStat;
          pr.statOnMinus = statOnMinus;

          // console.log(new Date(), pr, currentStat, stat);

          jsonData[id] = pr;
          console.log(new Date(), uid, campaignName, "fetched", id, "words");
        })
        .catch((e) => {
          console.log(new Date(),
            e,
            uid,
            campaignName,
            "couldn't fetch",
            id,
            "words, retrying..."
          );
          i--;
          retryCount++;
          if (retryCount > 10) {
            console.log(new Date(), uid, campaignName, 'couldnt fetch', id, 'skipping');
            i++;
          };
        });
      await new Promise((resolve) => setTimeout(resolve, 1500));
    }

    for (const [advertId, advertData] of Object.entries(jsonData)) {
      advertsWords[advertId] = advertData;
    }

    return fs
      .writeFile(advertsWordsPath, JSON.stringify(advertsWords))
      .then(() => console.log(new Date(), uid, campaignName, "advertsWords.json created."))
      .catch((error) => console.error(error));
  } catch (e) {
    console.log(new Date(), new Date(), uid, campaignName, e);
    return;
  }
};

const setAdvertCPM = (authToken, params) => {
  return axios
    .post("https://advert-api.wb.ru/adv/v0/cpm", params, {
      headers: {
        Authorization: authToken,
      },
    })
    .then((response) => response.data)
    .catch(async (error) => { console.error(error ? error.response ? error.response.data : undefined : undefined); await new Promise(resolve => setTimeout(resolve, 3000)) });
};

const setExcludedPhrasesAdvert = (authToken, advertId, params, type) => {
  const url =
    type == 8
      ? "https://advert-api.wb.ru/adv/v1/auto/set-excluded"
      : "https://advert-api.wb.ru/adv/v1/search/set-excluded";
  return axios
    .post(url + "?id=" + advertId, params, {
      headers: {
        Authorization: authToken,
      },
    })
    .then((response) => response.data)
    .catch((error) => console.error(error));
};
const setPlusPhrasesAdvert = (authToken, advertId, params) => {
  const url = "https://advert-api.wb.ru/adv/v1/search/set-plus";
  return axios
    .post(url + "?id=" + advertId, params, {
      headers: {
        Authorization: authToken,
      },
    })
    .then((response) => response.data)
    .catch((error) => console.error(error.response.data));
};

const setPlusPhrasesActivityAdvert = (authToken, params) => {
  return axios
    .get("https://advert-api.wb.ru/adv/v1/search/set-plus", {
      headers: {
        Authorization: authToken,
      },
      params: params,
    })
    .then((response) => response.data)
    .catch((error) => console.log(new Date(), error.response.data));
};

const getTariffsBox = (authToken, params) => {
  return axios
    .get("https://common-api.wildberries.ru/api/v1/tariffs/box", {
      headers: {
        Authorization: authToken,
      },
      params: params,
    })
    .then((response) => response.data)
    .catch((error) => console.log(new Date(), error.response.data));
};

getTariffsBoxAndWriteToJsonMM = (uid, campaignName) => {
  return new Promise(async (resolve, reject) => {
    const authToken = getAuthTokenMM(uid, campaignName);

    const date = new Date();
    date.setDate(date.getDate() - 1);
    const tariffs = (
      await getTariffsBox(authToken, {
        date: getLocaleDateString(date).slice(0, 10),
      })
    ).response.data.warehouseList;

    const jsonData = {};
    for (let i = 0; i < tariffs.length; i++) {
      const {
        warehouseName,
        boxDeliveryAndStorageExpr,
        boxDeliveryBase,
        boxDeliveryLiter,
        boxStorageBase,
        boxStorageLiter,
      } = tariffs[i];
      jsonData[warehouseName] = {
        warehouseName: warehouseName,
        boxDeliveryAndStorageExpr: Number(
          boxDeliveryAndStorageExpr.replace("%", "").replace(",", ".")
        ),
        boxDeliveryBase: Number(
          boxDeliveryBase.replace("%", "").replace(",", ".")
        ),
        boxDeliveryLiter: Number(
          boxDeliveryLiter.replace("%", "").replace(",", ".")
        ),
        boxStorageBase: Number(
          boxStorageBase.replace("%", "").replace(",", ".")
        ),
        boxStorageLiter: Number(
          boxStorageLiter.replace("%", "").replace(",", ".")
        ),
      };
    }

    afs.writeFileSync(
      path.join(__dirname, "marketMaster", uid, campaignName, "tariffs.json"),
      JSON.stringify(jsonData)
    );

    resolve();
  });
};

const depositAdvertBudget = (authToken, advertId, params) => {
  return axios
    .post(
      "https://advert-api.wb.ru/adv/v1/budget/deposit?id=" + advertId,
      params,
      {
        headers: {
          Authorization: authToken,
        },
      }
    )
    .then((response) => response.data)
    .catch((error) => console.error(error.response.data));
};

const startAdvert = (authToken, params) => {
  return axios
    .get("https://advert-api.wb.ru/adv/v0/start", {
      headers: {
        Authorization: authToken,
      },
      params: params,
    })
    .then((response) => response.data)
    .catch((error) => console.log(new Date(), error.response.data, params));
};

const pauseAdvert = (authToken, params) => {
  return axios
    .get("https://advert-api.wb.ru/adv/v0/pause", {
      headers: {
        Authorization: authToken,
      },
      params: params,
    })
    .then((response) => response.data)
    .catch((error) => console.log(new Date(), error.response.data));
};

const stopAdvert = (authToken, params) => {
  return axios
    .get("https://advert-api.wb.ru/adv/v0/stop", {
      headers: {
        Authorization: authToken,
      },
      params: params,
    })
    .then((response) => response.data)
    .catch((error) => console.log(new Date(), error.response.data));
};

const changeAdvertActivity = (authToken, mode, params, throwError = false) => {
  return axios
    .get("https://advert-api.wb.ru/adv/v0/" + mode, {
      headers: {
        Authorization: authToken,
      },
      params: params,
    })
    .then((response) => response.data)
    .catch((error) => {
      console.log(new Date(), error.response.data, mode, params);
      if (throwError)
        throw error;
    });
};

const changeAdvertNMs = (authToken, advertId, params, throwError = false) => {
  return axios
    .post(
      "https://advert-api.wb.ru/adv/v1/auto/updatenm?id=" + advertId,
      params,
      {
        headers: {
          Authorization: authToken,
        },
      }
    )
    .then((response) => response.data)
    .catch((error) => {
      console.log(new Date(), error.response.data);
      if (throwError)
        throw error;
    });
};

const changeAdvertName = (authToken, params) => {
  return axios
    .post(
      "https://advert-api.wb.ru/adv/v0/rename",
      params,
      {
        headers: {
          Authorization: authToken,
        },
      }
    )
    .then((response) => response.data)
    .catch((error) => console.error(error.response.data));
};

const autoSetMinusPhrasesMM = async (uid, campaignName) => {
  return new Promise((resolve, reject) => {
    try {


      const authToken = getAuthTokenMM(uid, campaignName);
      const startTime = new Date();

      const advertsWordsPath = path.join(
        __dirname,
        "marketMaster",
        uid,
        campaignName,
        "advertsWords.json"
      );
      const advertsWords = readIfExists(advertsWordsPath);
      const advertsPlusPhrasesTemplatesPath = path.join(
        __dirname,
        "marketMaster",
        uid,
        campaignName,
        "advertsPlusPhrasesTemplates.json"
      );
      const advertsPlusPhrasesTemplates = readIfExists(
        advertsPlusPhrasesTemplatesPath
      );
      const presetsPath = path.join(
        __dirname,
        "marketMaster",
        "presets.json"
      );
      const presets = readIfExists(
        presetsPath
      );
      const plusPhrasesTemplatesPath = path.join(
        __dirname,
        "marketMaster",
        uid,
        campaignName,
        "plusPhrasesTemplates.json"
      );
      const plusPhrasesTemplates = readIfExists(plusPhrasesTemplatesPath);
      const advertsInfosPath = path.join(
        __dirname,
        "marketMaster",
        uid,
        campaignName,
        "advertsInfos.json"
      );
      const advertsInfos = readIfExists(advertsInfosPath);
      const advertsPath = path.join(
        __dirname,
        "marketMaster",
        uid,
        campaignName,
        "adverts.json"
      );
      const adverts = readIfExists(advertsPath);

      const excludeMinusPhrases = async () => {
        for (const [advertId, templateData] of Object.entries(
          advertsPlusPhrasesTemplates
        )) {
          if (!advertId || !templateData) continue;
          const { templateName } = templateData;
          if (!templateName) continue;

          if (!adverts[advertId]) continue;
          if (!advertsInfos[advertId]) continue;
          const { name, type, status, createTime } = advertsInfos[advertId]
          if (![8, 6, 9].includes(type)) continue;
          if (![9, 11].includes(status)) continue;

          // console.log(new Date(), advertId);

          if (!advertsWords[advertId]) continue;

          const words =
            type == 8
              ? advertsWords[advertId]
              : advertsWords[advertId].words;

          if (!words) continue;
          const stat = advertsWords[advertId].stat ?? {};
          const statOnMinus = advertsWords[advertId].statOnMinus ?? {};

          const plusPhrasesTemplate = plusPhrasesTemplates[templateName];
          if (!plusPhrasesTemplate) continue;
          const autoPhrasesTemplate = plusPhrasesTemplate.autoPhrasesTemplate

          const addOrNot = (phrase) => {
            const { includes, notIncludes } = autoPhrasesTemplate;

            let addFlagInc = includes.length ? 0 : 1;
            for (let j = 0; j < includes.length; j++) {
              const rule = includes[j];

              if (!rule || rule == '') continue

              const rulesForAnd = rule.split('+');

              let tempFlagInc = 0;
              for (let k = 0; k < rulesForAnd.length; k++) {
                const ruleForAdd = rulesForAnd[k];
                if (phrase.includes(ruleForAdd)) {
                  tempFlagInc++;
                }
              }
              addFlagInc += (tempFlagInc == rulesForAnd.length ? 1 : 0);
            }

            let addFlagNotInc = 0;
            for (let j = 0; j < notIncludes.length; j++) {
              const rule = notIncludes[j];

              if (!rule || rule == '') continue

              const rulesForAnd = rule.split('+');

              let tempFlagNotInc = 0;

              for (let k = 0; k < rulesForAnd.length; k++) {
                const ruleForAdd = rulesForAnd[k];
                if (phrase.includes(ruleForAdd)) {
                  tempFlagNotInc++;
                }
              }

              addFlagNotInc += tempFlagNotInc == rulesForAnd.length;
            }

            // if (phrase == 'двуспальное постельное белье')
            // console.log(new Date(), (addFlagInc && !addFlagNotInc), addFlagInc, addFlagNotInc, phrase, plusPhrasesTemplate.autoPhrasesTemplate);
            return addFlagInc && !addFlagNotInc
          }

          if (autoPhrasesTemplate && ((autoPhrasesTemplate.includes && autoPhrasesTemplate.includes.length)
            || (autoPhrasesTemplate.notIncludes && autoPhrasesTemplate.notIncludes.length))) {
            const newClusters = []
            for (const phrase of plusPhrasesTemplate.clusters) {
              if (addOrNot(phrase)) {
                if (!newClusters.includes(phrase)) {
                  newClusters.push(phrase)
                }
              }
            }
            plusPhrasesTemplate.clusters = newClusters
          }


          const canBeDeleted = (phrase, activePhrases, type) => {
            if (!presets.phrases[phrase]) return true;
            const phrasePreset = presets.phrases[phrase].catalog_value;
            const temp = []
            for (let i = 0; i < activePhrases.length; i++) {
              let cur = '';
              // if (type == 8) {
              //   cur = activePhrases[i].cluster;
              // }
              // else if (type == 9) {
              //   cur = activePhrases[i].keyword;
              // }
              cur = activePhrases[i];
              if (cur == phrase) continue;
              if (presets.phrases[cur])
                temp.push(presets.phrases[cur].catalog_value)
            }
            // if (temp.includes(phrasePreset))
            //   console.log(new Date(), phrase, temp.includes(phrasePreset), advertId);
            return !temp.includes(phrasePreset);
          }

          const isFixed = plusPhrasesTemplate.isFixed ?? false;

          const { excluded, clusters, keywords } = words;
          if (clusters) {
            let toExclude = [];
            for (let i = 0; i < excluded.length; i++) {
              const phrase = excluded[i];
              // console.log(new Date(), plusPhrasesTemplate.clusters.includes(phrase), phrase)
              const ctrExcluded = statOnMinus[phrase] ? statOnMinus[phrase].ctr : 0;
              const viewsExcluded = statOnMinus[phrase] ? statOnMinus[phrase].views : 0;
              if (
                plusPhrasesTemplate.threshold &&
                viewsExcluded < plusPhrasesTemplate.threshold
              )
                continue;
              if ((!plusPhrasesTemplate.clusters || (plusPhrasesTemplate.clusters && !plusPhrasesTemplate.clusters.length)) &&
                plusPhrasesTemplate.ctrThreshold &&
                ctrExcluded > plusPhrasesTemplate.ctrThreshold
              )
                continue;

              if (autoPhrasesTemplate && ((autoPhrasesTemplate.includes && autoPhrasesTemplate.includes.length)
                || (autoPhrasesTemplate.notIncludes && autoPhrasesTemplate.notIncludes.length))) {
                if (addOrNot(phrase)) {
                  if (!plusPhrasesTemplate.clusters.includes(phrase)) {
                    plusPhrasesTemplate.clusters.push(phrase);
                  }
                }
              }

              if (plusPhrasesTemplate.clusters.includes(phrase)) continue;
              toExclude.push(phrase);
            }

            let needsUpdate = toExclude.length != excluded.length;

            for (const [phrase, phraseStats] of Object.entries(words.stat)) {
              if (phrase === undefined || phraseStats === undefined) continue;
              const { views, clicks, sum, } = phraseStats ?? {};
              const { normquery, catalog_value } = presets.phrases[phrase] ?? {};

              if (toExclude.includes(phrase)) continue;

              const ctr = getRoundValue(clicks, views, true);

              if (autoPhrasesTemplate && ((autoPhrasesTemplate.includes && autoPhrasesTemplate.includes.length)
                || (autoPhrasesTemplate.notIncludes && autoPhrasesTemplate.notIncludes.length))) {
                if (addOrNot(phrase)) {
                  if (!plusPhrasesTemplate.clusters.includes(phrase)) {
                    plusPhrasesTemplate.clusters.push(phrase);
                  }
                }
              }


              if (plusPhrasesTemplate.threshold > views) continue;
              if (plusPhrasesTemplate.clusters.length && !plusPhrasesTemplate.clusters.includes(phrase)) {
                needsUpdate = true;
                toExclude.push(phrase);
                statOnMinus[phrase] = phraseStats;
                continue;
              }
              // console.log(new Date(), advertId, cluster, count, plusPhrasesTemplate.clusters);

              if (plusPhrasesTemplate.ctrThreshold || plusPhrasesTemplate.secondThreshold) {

                if (plusPhrasesTemplate.ctrThreshold) {

                  if (plusPhrasesTemplate.clusters && plusPhrasesTemplate.clusters.length && !plusPhrasesTemplate.clusters.includes(phrase) && !toExclude.includes(phrase)) {
                    needsUpdate = true;
                    toExclude.push(phrase);
                    statOnMinus[phrase] = phraseStats;
                    continue;
                  };

                  if (
                    ctr >= plusPhrasesTemplate.ctrThreshold
                  )
                    continue;

                  if (!toExclude.includes(phrase)) {
                    needsUpdate = true;
                    statOnMinus[phrase] = phraseStats;
                    toExclude.push(phrase);
                  }

                }

                if (plusPhrasesTemplate.secondThreshold && plusPhrasesTemplate.secondThreshold < views) {
                  if (plusPhrasesTemplate.secondCtrThreshold && plusPhrasesTemplate.secondCtrThreshold >
                    ctr) {
                    if (!toExclude.includes(phrase)) {
                      needsUpdate = true;
                      statOnMinus[phrase] = phraseStats;
                      toExclude.push(phrase);
                    }
                  }
                }
              }
              else {
                if (plusPhrasesTemplate.clusters.includes(phrase))
                  continue;


                if (!toExclude.includes(phrase)) {
                  needsUpdate = true;
                  statOnMinus[phrase] = phraseStats;
                  toExclude.push(phrase);
                }
              }
            }

            // for (let i = 0; i < clusters.length; i++) {
            //   const { cluster, count, keywords } = clusters[i];

            //   const clusterKeywordsTemp = new Array(keywords ?? []);
            //   const clusterKeywords = clusterKeywordsTemp.filter(
            //     (value, index) => {
            //       return clusterKeywordsTemp.indexOf(value) === index;
            //     }
            //   );
            //   if (!clusterKeywords.includes(cluster))
            //     clusterKeywords.push(cluster);
            //   const clusterStat = {
            //     views: 0,
            //     clicks: 0,
            //     ctr: 0,
            //     sum: 0,
            //   };
            //   for (let j = 0; j < clusterKeywords.length; j++) {
            //     if (!stat[clusterKeywords[j]]) continue;
            //     clusterStat.views += stat[clusterKeywords[j]].views ?? 0;
            //     clusterStat.clicks += stat[clusterKeywords[j]].clicks ?? 0;
            //     clusterStat.sum += stat[clusterKeywords[j]].sum ?? 0;
            //   }
            //   clusterStat.ctr = getRoundValue(
            //     clusterStat.clicks,
            //     clusterStat.views,
            //     true
            //   );

            //   const phrase = cluster;
            //   if (autoPhrasesTemplate && ((autoPhrasesTemplate.includes && autoPhrasesTemplate.includes.length)
            //     || (autoPhrasesTemplate.notIncludes && autoPhrasesTemplate.notIncludes.length))) {
            //     if (addOrNot(phrase)) {
            //       if (!plusPhrasesTemplate.clusters.includes(phrase)) {
            //         plusPhrasesTemplate.clusters.push(phrase);
            //       }
            //     }
            //   }


            //   if (plusPhrasesTemplate.threshold > count) continue;
            //   if (plusPhrasesTemplate.clusters.length && !plusPhrasesTemplate.clusters.includes(phrase)) {
            //     needsUpdate = true;
            //     toExclude.push(phrase);
            //     statOnMinus[phrase] = clusterStat;
            //     continue;
            //   }
            //   // console.log(new Date(), advertId, cluster, count, plusPhrasesTemplate.clusters);

            //   if (plusPhrasesTemplate.ctrThreshold || plusPhrasesTemplate.secondThreshold) {

            //     if (plusPhrasesTemplate.ctrThreshold) {

            //       if (plusPhrasesTemplate.clusters && plusPhrasesTemplate.clusters.length && !plusPhrasesTemplate.clusters.includes(cluster) && !toExclude.includes(cluster)) {
            //         needsUpdate = true;
            //         toExclude.push(cluster);
            //         statOnMinus[cluster] = clusterStat;
            //         continue;
            //       };

            //       if (
            //         clusterStat.ctr >= plusPhrasesTemplate.ctrThreshold
            //       )
            //         continue;

            //       if (!toExclude.includes(cluster)) {
            //         needsUpdate = true;
            //         statOnMinus[cluster] = clusterStat;
            //         toExclude.push(cluster);
            //       }

            //     }

            //     if (plusPhrasesTemplate.secondThreshold && plusPhrasesTemplate.secondThreshold < count) {
            //       if (plusPhrasesTemplate.secondCtrThreshold && plusPhrasesTemplate.secondCtrThreshold >
            //         clusterStat.ctr) {
            //         if (!toExclude.includes(cluster)) {
            //           needsUpdate = true;
            //           statOnMinus[cluster] = clusterStat;
            //           toExclude.push(cluster);
            //         }
            //       }
            //     }
            //   }
            //   else {
            //     if (plusPhrasesTemplate.clusters.includes(cluster))
            //       continue;


            //     if (!toExclude.includes(cluster)) {
            //       needsUpdate = true;
            //       statOnMinus[cluster] = clusterStat;
            //       toExclude.push(cluster);
            //     }
            //   }



            // }

            toExclude = toExclude.filter((phrase) => {
              // if (!canBeDeleted(phrase, clusters, 8))
              // console.log(new Date(), advertId, phrase, canBeDeleted(phrase, clusters, 8))
              return canBeDeleted(phrase, plusPhrasesTemplate.clusters, 8)
            })
            if (!needsUpdate) needsUpdate = toExclude.length != excluded.length;

            // console.log(new Date(), toExclude);
            if (toExclude.length > 1000) {
              console.log(new Date(), "more than a 1000");
              continue;
            }

            if (needsUpdate) {
              const params = {
                excluded: toExclude,
              };

              await setExcludedPhrasesAdvert(
                authToken,
                advertId,
                params,
                type
              );

              console.log(new Date(),
                uid,
                campaignName,
                name,
                advertId,
                "установлены минус фразы",
                templateName,
                toExclude.length,
              );

              await new Promise((resolve) => setTimeout(resolve, 7 * 1000));
            } else {
              console.log(new Date(),
                uid,
                campaignName,
                name,
                advertId,
                `не требует изменения минус фраз (${toExclude.length})`
              );
            }
          } else if (keywords) {

            let toExclude = [];
            for (let i = 0; i < excluded.length; i++) {
              const phrase = excluded[i];

              if (autoPhrasesTemplate && ((autoPhrasesTemplate.includes && autoPhrasesTemplate.includes.length)
                || (autoPhrasesTemplate.notIncludes && autoPhrasesTemplate.notIncludes.length))) {
                if (addOrNot(phrase)) {
                  if (!plusPhrasesTemplate.clusters.includes(phrase)) {
                    plusPhrasesTemplate.clusters.push(phrase);
                  }
                }
              }

              const ctrExcluded = statOnMinus[phrase] ? statOnMinus[phrase].ctr : 0;
              const viewsExcluded = statOnMinus[phrase] ? statOnMinus[phrase].views : 0;
              if (
                plusPhrasesTemplate.threshold &&
                viewsExcluded < plusPhrasesTemplate.threshold
              ) {
                if (plusPhrasesTemplate.secondThreshold) {
                  if (viewsExcluded < plusPhrasesTemplate.secondThreshold) continue;
                } else
                  continue;
              }
              if ((!plusPhrasesTemplate.clusters || (plusPhrasesTemplate.clusters && !plusPhrasesTemplate.clusters.length)) &&
                plusPhrasesTemplate.ctrThreshold &&
                ctrExcluded >= plusPhrasesTemplate.ctrThreshold
              ) {
                if (plusPhrasesTemplate.secondCtrThreshold) {
                  if (ctrExcluded >= plusPhrasesTemplate.secondCtrThreshold) continue;
                } else
                  continue;
              }
              if (plusPhrasesTemplate.clusters.includes(phrase)) continue;
              toExclude.push(phrase);
            }

            let needsUpdate = toExclude.length != excluded.length;
            for (let i = 0; i < keywords.length; i++) {
              const { keyword, count } = keywords[i];
              const phrase = keyword;

              if (autoPhrasesTemplate && ((autoPhrasesTemplate.includes && autoPhrasesTemplate.includes.length)
                || (autoPhrasesTemplate.notIncludes && autoPhrasesTemplate.notIncludes.length))) {
                if (addOrNot(phrase)) {
                  if (!plusPhrasesTemplate.clusters.includes(phrase)) {
                    plusPhrasesTemplate.clusters.push(phrase);
                  }
                }
              }

              if (plusPhrasesTemplate.threshold > count) continue;
              if (plusPhrasesTemplate.clusters.length && !plusPhrasesTemplate.clusters.includes(phrase)) {
                needsUpdate = true;
                toExclude.push(phrase);
                statOnMinus[phrase] = stat[phrase] ?? { views: count };
                continue;
              }

              if (plusPhrasesTemplate.ctrThreshold || plusPhrasesTemplate.secondThreshold) {
                if (plusPhrasesTemplate.ctrThreshold) {

                  if (plusPhrasesTemplate.clusters && plusPhrasesTemplate.clusters.length && !plusPhrasesTemplate.clusters.includes(keyword) && !toExclude.includes(keyword)) {
                    needsUpdate = true;
                    toExclude.push(keyword);
                    statOnMinus[keyword] = stat[keyword] ?? { views: count };
                    continue;
                  };

                  if (
                    stat[keyword] &&
                    stat[keyword].ctr >= plusPhrasesTemplate.ctrThreshold
                  )
                    continue;

                  if (!toExclude.includes(keyword)) {
                    needsUpdate = true;
                    statOnMinus[keyword] = stat[keyword] ?? { views: count };
                    toExclude.push(keyword);
                  }
                }


                if (plusPhrasesTemplate.secondThreshold && plusPhrasesTemplate.secondThreshold < count) {
                  if (plusPhrasesTemplate.secondCtrThreshold && stat[keyword] && plusPhrasesTemplate.secondCtrThreshold >
                    stat[keyword].ctr) {
                    if (!toExclude.includes(keyword)) {
                      needsUpdate = true;
                      statOnMinus[keyword] = stat[keyword] ?? { views: count };
                      toExclude.push(keyword);
                    }
                  }
                }
              } else {
                if (plusPhrasesTemplate.clusters.includes(keyword))
                  continue;


                if (!toExclude.includes(keyword)) {
                  needsUpdate = true;
                  statOnMinus[keyword] = stat[keyword] ?? { views: count };
                  toExclude.push(keyword);
                }
              }




              // console.log(new Date(), advertId, cluster, count, keywords);
            }
            // console.log(new Date(), toExclude);
            toExclude = toExclude.filter((phrase) => {
              return canBeDeleted(phrase, plusPhrasesTemplate.clusters, 9)
            })
            if (!needsUpdate) needsUpdate = toExclude.length != excluded.length;

            if (toExclude.length > 1000) {
              console.log(new Date(), "more than a 1000");
              continue;
            } else if (needsUpdate) {
              const params = {
                excluded: toExclude,
              };

              await setExcludedPhrasesAdvert(
                authToken,
                advertId,
                params,
                type
              );
              await setPlusPhrasesAdvert(authToken, advertId, {
                pluse: [],
              });

              console.log(new Date(),
                uid,
                campaignName,
                name,
                advertId,
                "установлены минус фразы",
                templateName,
                toExclude.length
              );

              await new Promise((resolve) => setTimeout(resolve, 2 * 1000));
            } else {
              console.log(new Date(),
                uid,
                campaignName,
                name,
                advertId,
                `не требует изменения минус фраз (${toExclude.length})`
              );
            }
            if (isFixed) {
              const toPlus = plusPhrasesTemplate.clusters;

              if (toPlus.length > 100) {
                console.log(new Date(), "more than a 100");
                continue;
              }
              const params = {
                pluse: toPlus,
              };

              await setPlusPhrasesAdvert(authToken, advertId, params);
              await setPlusPhrasesActivityAdvert(authToken, {
                id: advertId,
                fixed: true,
              });

              console.log(new Date(),
                uid,
                campaignName,
                name,
                advertId,
                "установлены плюс фразы",
                templateName,
                toPlus
              );

              await new Promise((resolve) => setTimeout(resolve, 2 * 1000));
            }
          }

          plusPhrasesTemplates[templateName] = plusPhrasesTemplate;

          advertsWords[advertId].statOnMinus = statOnMinus;

        }

      };

      excludeMinusPhrases().then(() => {
        const currentPlusPhrasesTemplates = readIfExists(path.join(
          __dirname,
          "marketMaster",
          uid,
          campaignName,
          "plusPhrasesTemplates.json"
        ))
        for (const [name, data] of Object.entries(plusPhrasesTemplates)) {
          if (new Date(currentPlusPhrasesTemplates[name].updateTime) > startTime) {
            console.log(new Date(), uid, campaignName, name, 'plus phrases template was updated after the start of this exec.');
            continue;
          };

          currentPlusPhrasesTemplates[name] = data;
        }
        afs.writeFileSync(
          path.join(
            __dirname,
            "marketMaster",
            uid,
            campaignName,
            "plusPhrasesTemplates.json"
          ),
          JSON.stringify(currentPlusPhrasesTemplates));

        afs.writeFileSync(
          path.join(
            __dirname,
            "marketMaster",
            uid,
            campaignName,
            "advertsWords.json"
          ),
          JSON.stringify(advertsWords));


        resolve();
      });
    } catch (error) {
      console.log(error);
      resolve();
    }
  });
};

const setByWarehousesInfoMM = async (uid, campaignName, data) => {
  return new Promise((resolve, reject) => {
    const nomenclaturesPath = path.join(
      __dirname,
      "marketMaster",
      uid,
      campaignName,
      "nomenclatures.json"
    );
    const nomenclatures = readIfExists(nomenclaturesPath);
    const artsPath = path.join(
      __dirname,
      "marketMaster",
      uid,
      campaignName,
      "arts.json"
    );
    const arts = readIfExists(artsPath);

    const { values, key, barcodes } = data;
    if (!values || !key || !barcodes) return;

    const setByWarehousesInfo = async () => {
      for (let i = 0; i < barcodes.length; i++) {
        const barcode = barcodes[i];
        if (!barcode) continue;
        const art = arts.bySku[barcode].art;
        if (!art) continue;

        for (const [warehouseName, warehouseData] of Object.entries(values)) {
          if (warehouseName == "Все склады") continue;
          nomenclatures[art].byWarehouses[warehouseName][key] =
            warehouseData.val;
        }
      }
    };

    setByWarehousesInfo().then(() => {
      afs.writeFileSync(nomenclaturesPath, JSON.stringify(nomenclatures));
      resolve();
    });
  });
};
const manageAdvertsActivityMM = async (uid, campaignName, data) => {
  return new Promise((resolve, reject) => {

    const advertsInfosPath = path.join(
      __dirname,
      "marketMaster",
      uid,
      campaignName,
      "advertsInfos.json"
    );
    const advertsInfos = readIfExists(
      advertsInfosPath
    );


    const authToken = getAuthTokenMM(uid, campaignName);

    const { mode, advertsIds } = data;

    const manageAdvertsActivity = async () => {
      for (const [id, advertData] of Object.entries(advertsIds)) {
        if (!id || !advertData) continue;
        const advertId = advertData.advertId;

        console.log(new Date(), uid, campaignName, advertId, 'trying to', mode);
        await changeAdvertActivity(authToken, mode, { id: advertId }, true);
        await new Promise((resolve) => setTimeout(resolve, 1 * 1000));
        console.log(new Date(), uid, campaignName, advertId, mode);

        if (!advertsInfos[advertId]) continue;
        if (mode == 'start')
          advertsInfos[advertId].status = 9
        else if (mode == 'pause')
          advertsInfos[advertId].status = 11
        else if (mode == 'stop')
          advertsInfos[advertId].status = 7
      }
    };

    manageAdvertsActivity().then(() => {
      afs.writeFileSync(advertsInfosPath, JSON.stringify(advertsInfos));
      resolve({ status: 'ok' });
    }).catch((e) => { resolve({ status: 'bad' }) });
  });
};

const manageAdvertsNMsMM = async (uid, campaignName, data) => {
  return new Promise((resolve, reject) => {

    const advertsInfosPath = path.join(
      __dirname,
      "marketMaster",
      uid,
      campaignName,
      "advertsInfos.json"
    );
    const advertsInfos = readIfExists(
      advertsInfosPath
    );

    const arts = readIfExists(path.join(
      __dirname,
      "marketMaster",
      uid,
      campaignName,
      "arts.json"
    ))
    arts.byBrandArt = {};
    for (const [nmId, artData] of Object.entries(arts.byNmId)) {
      artData.nmId = parseInt(nmId);
      arts.byBrandArt[artData.art] = artData;
    }


    const authToken = getAuthTokenMM(uid, campaignName);

    const { mode, advertsIds } = data;

    console.log(new Date(), data);

    const manageAdvertsNMs = async () => {
      for (const [id, advertData] of Object.entries(advertsIds)) {
        if (!id || !advertData) continue;
        const { advertId, art } = advertData;
        // console.log(new Date(), id, art, arts.byBrandArt[art]);
        if (art === undefined || arts.byBrandArt[art] === undefined) continue;

        const { nmId } = arts.byBrandArt[art];

        const params = {}
        params[mode] = []
        params[mode].push(nmId);

        console.log(new Date(), params);

        const advertInfos = advertsInfos[advertId];
        if (!advertInfos) continue;
        const { type } = advertInfos;
        let nms = [];
        if (type == 8) {
          nms = advertInfos.autoParams.nms ?? [];
        } else if (type == 9) {
          nms = advertInfos.unitedParams ? advertInfos.unitedParams[0].nms ?? [] : [];
        }

        if (mode == 'delete' && nms.length <= 1) throw new Error('only one art in the advert');

        await changeAdvertNMs(authToken, id, params, true);
        await new Promise((resolve) => setTimeout(resolve, 1 * 1000));
        console.log(new Date(), uid, campaignName, id, mode);

        if (nms.length < 1) continue;

        if (mode == 'add')
          nms.push(nmId);
        else if (mode == 'delete')
          nms = nms.filter(nm => nm != nmId);

        if (type == 8) {
          advertInfos.autoParams.nms = nms;
        } else if (type == 9) {
          advertInfos.unitedParams[0].nms = nms
        }

      }
    };

    manageAdvertsNMs().then(() => {
      afs.writeFileSync(advertsInfosPath, JSON.stringify(advertsInfos));
      resolve({ status: 'ok' });
    }).catch((e) => { console.log(new Date(), e); resolve({ status: 'bad' }) });
  });
};


const setAdvertsPlusPhrasesTemplatesMM = async (uid, campaignName, data) => {
  return new Promise((resolve, reject) => {
    const advertsPlusPhrasesTemplatesPath = path.join(
      __dirname,
      "marketMaster",
      uid,
      campaignName,
      "advertsPlusPhrasesTemplates.json"
    );
    const advertsPlusPhrasesTemplates = readIfExists(
      advertsPlusPhrasesTemplatesPath
    );

    console.log(data);

    const setAdvertsPlusPhrasesTemplates = async () => {
      for (const [advertId, advertData] of Object.entries(data.advertsIds)) {
        if (!advertId || !advertData) continue;

        const { mode, templateName } = advertData;
        if (!mode) continue;

        console.log(new Date(), uid, campaignName, advertId, mode, templateName);

        if (mode == "Установить") {
          if (!templateName) continue;
          if (!advertsPlusPhrasesTemplates[advertId])
            advertsPlusPhrasesTemplates[advertId] = {};

          advertsPlusPhrasesTemplates[advertId].templateName = templateName;
        } else if (mode == "Удалить") {
          advertsPlusPhrasesTemplates[advertId] = undefined;
        }
      }

    };

    setAdvertsPlusPhrasesTemplates().then(() => {
      afs.writeFileSync(
        advertsPlusPhrasesTemplatesPath,
        JSON.stringify(advertsPlusPhrasesTemplates)
      );

      resolve();
    });
  });
};

const depositAdvertsBudgetsAndWriteToJsonMM = async (
  uid,
  campaignName,
  data
) => {
  return new Promise(async (resolve, reject) => {
    const authToken = getAuthTokenMM(uid, campaignName);

    const advertsBudgetsPath = path.join(
      __dirname,
      "marketMaster",
      uid,
      campaignName,
      "advertsBudgets.json"
    );
    const advertsBudgets = readIfExists(advertsBudgetsPath);
    const advertsBudgetsToKeepPath = path.join(
      __dirname,
      "marketMaster",
      uid,
      campaignName,
      "advertsBudgetsToKeep.json"
    );
    const advertsBudgetsToKeep = readIfExists(advertsBudgetsToKeepPath);
    const advertsInfosPath = path.join(
      __dirname,
      "marketMaster",
      uid,
      campaignName,
      "advertsInfos.json"
    );
    const advertsInfos = readIfExists(advertsInfosPath);
    const advertsPath = path.join(
      __dirname,
      "marketMaster",
      uid,
      campaignName,
      "adverts.json"
    );
    const adverts = readIfExists(advertsPath);
    // const balancePath = path.join(
    //   __dirname,
    //   "marketMaster",
    //   uid,
    //   campaignName,
    //   "balance.json"
    // );
    // const balance = readIfExists(balancePath);

    const balance = await fetchBalanceWithRetry(uid, campaignName);

    const { mode } = data;
    let modeWhole = mode;
    const toRestart = [];
    const depositAdvertsBudgets = async () => {
      for (const [id, advertDataRule] of Object.entries(data.advertsIds)) {
        if (!id || !advertDataRule) continue;
        let { advertId, budget } = advertDataRule;
        if (mode == "Пополнить") {
          budget = Math.round(budget / 50) * 50;
          const advertData = advertsInfos[advertId];
          if (!advertData) continue;

          if (!adverts[advertId]) continue;

          if (
            advertData.status != 9 &&
            advertData.status != 11 &&
            advertData.status != 4
          )
            continue;

          if (advertData.type != 8 && advertData.type != 9 && advertData.type != 6) continue;

          console.log(new Date(), uid, campaignName, advertData.name, advertId, mode, budget);

          let payType = 0;
          if (balance.net && balance.net >= budget) payType = 1;
          if (balance.bonus && balance.bonus >= budget) payType = 3;

          const depositParams = {
            sum: budget,
            type: payType,
            return: true,
          };

          if (payType == 3) {
            balance.bonus -= budget;
          } else if (payType == 0) {
            balance.balance -= budget;
          } else {
            balance.net -= budget;
          }

          const newBudget = await depositAdvertBudget(
            authToken,
            advertId,
            depositParams
          );
          advertsBudgets[advertId] = newBudget
            ? newBudget.total
            : advertsBudgets[advertId];
          toRestart.push(advertId);
          await new Promise((resolve) => setTimeout(resolve, 1.5 * 1000));

        } else if (mode == "Установить лимит") {
          advertsBudgetsToKeep[advertId] = budget == 0 ? undefined : budget;
          console.log(new Date(), uid, campaignName, advertId, mode, budget);
        }
      }
      if (modeWhole == "Пополнить") {
        await new Promise((resolve) => setTimeout(resolve, 5 * 60 * 1000));
        for (let i = 0; i < toRestart.length; i++) {
          const advertId = toRestart[i];
          if (!advertId) continue;
          await startAdvert(authToken, { id: advertId });
          await new Promise((resolve) => setTimeout(resolve, 1 * 1000));
        }
      }
    };

    depositAdvertsBudgets().then(() => {
      afs.writeFileSync(advertsBudgetsPath, JSON.stringify(advertsBudgets));
      afs.writeFileSync(
        advertsBudgetsToKeepPath,
        JSON.stringify(advertsBudgetsToKeep)
      );

      resolve();
    });
  });
};

const autoDepositAdvertsBudgetsAndWriteToJsonMM = async (uid, campaignName) => {
  return new Promise(async (resolve, reject) => {
    const authToken = getAuthTokenMM(uid, campaignName);

    const advertsBudgetsPath = path.join(
      __dirname,
      "marketMaster",
      uid,
      campaignName,
      "advertsBudgets.json"
    );
    const advertsBudgets = readIfExists(advertsBudgetsPath);
    const advertsBudgetsToKeepPath = path.join(
      __dirname,
      "marketMaster",
      uid,
      campaignName,
      "advertsBudgetsToKeep.json"
    );
    const advertsBudgetsToKeep = readIfExists(advertsBudgetsToKeepPath);
    const advertsInfosPath = path.join(
      __dirname,
      "marketMaster",
      uid,
      campaignName,
      "advertsInfos.json"
    );
    const advertsInfos = readIfExists(advertsInfosPath);
    const advertsSchedulesPath = path.join(
      __dirname,
      "marketMaster",
      uid,
      campaignName,
      "advertsSchedules.json"
    );
    const advertsSchedules = readIfExists(advertsSchedulesPath);
    const advertsPath = path.join(
      __dirname,
      "marketMaster",
      uid,
      campaignName,
      "adverts.json"
    );
    const adverts = readIfExists(advertsPath);
    const balance = await fetchBalanceWithRetry(uid, campaignName);

    const toRestart = [];
    const depositAdvertsBudgets = async () => {
      for (const [id, budgetToKeep] of Object.entries(advertsBudgetsToKeep)) {
        if (!id || !budgetToKeep) continue;

        if (!adverts[id]) continue;
        if (!advertsInfos[id]) continue;

        const advertData = advertsInfos[id];
        const advertId = advertData.advertId;

        if (toRestart.includes(advertId)) continue;

        if (advertData.status != 11 && advertData.status != 9) continue;
        if (advertData.type != 8 && advertData.type != 6 && advertData.type != 9) continue;

        toRestart.push(advertId);

        const currentBudget = advertsBudgets[advertId];
        // if (currentBudget) continue;
        if (currentBudget >= budgetToKeep) continue;

        let budget = budgetToKeep - currentBudget;
        // if (budget < 125) continue;
        budget = Math.ceil(budget / 50) * 50;
        if (budget < 1000 || isNaN(budget)) budget = 1000;
        // if (buf)

        let payType = 0;
        if (balance.net && balance.net >= budget) payType = 1;
        if (balance.bonus && balance.bonus >= budget) payType = 3;

        const depositParams = {
          sum: budget,
          type: payType,
          return: true,
        };

        if (payType == 3) {
          balance.bonus -= budget;
        } else if (payType == 0) {
          balance.balance -= budget;
        } else {
          balance.net -= budget;
        }
        console.log(new Date(),
          uid,
          campaignName,
          advertId,
          "баланс:",
          currentBudget,
          "будет пополнен на:",
          budget
        );
        const newBudget = await depositAdvertBudget(
          authToken,
          advertId,
          depositParams
        );
        if (newBudget) {
          advertsBudgets[advertId] = newBudget.total;

          console.log(new Date(),
            uid,
            campaignName,
            advertId,
            "пополнен на:",
            budget,
            "текущий баланс:",
            advertsBudgets[advertId],
          );
        }

        await new Promise((resolve) => setTimeout(resolve, 1.5 * 1000));


      }
      await new Promise((resolve) => setTimeout(resolve, 3 * 60 * 1000));
      for (let i = 0; i < toRestart.length; i++) {
        const advertId = toRestart[i];
        if (!advertId) continue;

        const dateTime = new Date();
        const defaultDayIndex = dateTime.getDay()
        const day = defaultDayIndex === 0 ? 6 : defaultDayIndex - 1;

        const hour = dateTime.getHours();

        const { schedule } = advertsSchedules[advertId] ?? {}
        if (schedule === undefined) {
          console.log(new Date(), uid, campaignName, advertId, 'start');
          await changeAdvertActivity(authToken, 'start', { id: advertId });
          continue;
        }
        const shouldBeActive = schedule[day][hour].selected;
        const mode = shouldBeActive ? 'start' : 'pause';
        console.log(new Date(), uid, campaignName, advertId, mode);
        await changeAdvertActivity(authToken, mode, { id: advertId });
        await new Promise((resolve) => setTimeout(resolve, 1 * 1000));
      }
    }

    depositAdvertsBudgets().then(async () => {
      afs.writeFileSync(advertsBudgetsPath, JSON.stringify(advertsBudgets));

      resolve();
    });
  });
};

const setAdvertsCPMsAndWriteToJsonMM = async (uid, campaignName, data) => {
  return new Promise((resolve, reject) => {
    console.log(new Date(), uid, campaignName, data);
    const authToken = getAuthTokenMM(uid, campaignName);

    const advertsAutoBidsRulesPath = path.join(
      __dirname,
      "marketMaster",
      uid,
      campaignName,
      "advertsAutoBidsRules.json"
    );
    const advertsInfosPath = path.join(
      __dirname,
      "marketMaster",
      uid,
      campaignName,
      "advertsInfos.json"
    );
    const advertsPath = path.join(
      __dirname,
      "marketMaster",
      uid,
      campaignName,
      "adverts.json"
    );
    const advertsStocksThresholdPath = path.join(
      __dirname,
      "marketMaster",
      uid,
      campaignName,
      "advertsStocksThreshold.json"
    );
    const advertsManagerRulesPath = path.join(
      __dirname,
      "marketMaster",
      uid,
      campaignName,
      "advertsManagerRules.json"
    );
    const bidsLog = {}
    const advertsManagerRules = readIfExists(advertsManagerRulesPath);
    const advertsAutoBidsRules = readIfExists(advertsAutoBidsRulesPath);
    const advertsInfos = readIfExists(advertsInfosPath);
    const adverts = readIfExists(advertsPath);
    const advertsStocksThreshold = readIfExists(advertsStocksThresholdPath);

    const { mode, stocksThreshold, maxBid, placementsRange, advertsTypes, autoBidsMode } =
      data;

    const setAdvertsCPMs = async () => {
      for (const [id, advertDataRules] of Object.entries(data.advertsIds)) {
        if (!id || !advertDataRules) continue;
        if (mode === undefined) continue;


        const { advertId } = advertDataRules;
        if (!advertId) continue;
        if (mode == "Установить") {

          if (!adverts[advertId]) continue;
          if (!advertsInfos[advertId]) continue;

          let { bid } = advertDataRules;
          if (bid === undefined) continue;

          const { name, type, status } = advertsInfos[advertId]
          if (![8, 6, 9].includes(type)) continue;

          console.log(new Date(), uid, campaignName, name, advertId, mode, bid);

          let subjectId = undefined;
          if (type == 6) {
            const tempParams = advertsInfos[advertId].params[0];
            subjectId = tempParams ? tempParams.subjectId : undefined;
          }
          else if (type == 9) {
            const tempParams = advertsInfos[advertId].unitedParams[0];
            subjectId = tempParams ? tempParams.subject ? tempParams.subject.id : undefined : undefined;
          }

          const minBid = type == 8 ? 125 : 150;
          if (bid < minBid) bid = minBid;

          const params = {
            advertId: advertsInfos[advertId].advertId,
            type: advertsInfos[advertId].type,
            cpm: bid,
          };

          if (subjectId) {
            params["param"] = subjectId;
          }
          if (type == 9) {
            params["instrument"] = 4
            await setAdvertCPM(authToken, params);
            await new Promise((resolve) => setTimeout(resolve, 1 * 1000));

            params["instrument"] = 6
          }

          await setAdvertCPM(authToken, params);
          await new Promise((resolve) => setTimeout(resolve, 1 * 1000));

          if (!(advertId in bidsLog))
            bidsLog[advertId] = { bids: [] };

          bidsLog[advertId].bids.push({
            time: new Date().toISOString(),
            val: bid,
            index: -1,
            prevIndex: -1,
          });

        } else if (mode == "Автоставки") {
          const { desiredDRR } = advertDataRules;
          if (desiredDRR == undefined) continue;
          console.log(new Date(), uid, campaignName, advertId, mode, desiredDRR, maxBid, placementsRange);

          if (!advertsAutoBidsRules[advertId]) advertsAutoBidsRules[advertId] = {};

          advertsAutoBidsRules[advertId] = {
            desiredDRR: desiredDRR,
            maxBid: maxBid,
            autoBidsMode: autoBidsMode,
            placementsRange: placementsRange,
          };

          // if (!advertsStocksThreshold[art]) advertsStocksThreshold[art] = {};
          // advertsStocksThreshold[art].stocksThreshold = stocksThreshold;
        } else if (mode == "Удалить правила") {
          console.log(new Date(), uid, campaignName, advertId, mode);

          if (!advertsAutoBidsRules[advertId]) advertsAutoBidsRules[advertId] = {};
          advertsAutoBidsRules[advertId] = undefined;

          // if (!advertsStocksThreshold[advertId]) advertsStocksThreshold[advertId] = {};
          // advertsStocksThreshold[advertId].stocksThreshold = undefined;
        }
      }
    };

    setAdvertsCPMs().then(() => {
      afs.writeFileSync(
        advertsAutoBidsRulesPath,
        JSON.stringify(advertsAutoBidsRules)
      );
      // afs.writeFileSync(
      //   advertsStocksThresholdPath,
      //   JSON.stringify(advertsStocksThreshold)
      // );
      if (mode == 'Установить') {
        const advertsBidsLogPath = path.join(
          __dirname,
          "marketMaster",
          uid,
          campaignName,
          "advertsBidsLog.json"
        );
        const advertsBidsLog = readIfExists(advertsBidsLogPath);
        for (const [advertId, data] of Object.entries(bidsLog)) {
          if (!advertsBidsLog[advertId]) advertsBidsLog[advertId] = { bids: [] }
          advertsBidsLog[advertId].bids = advertsBidsLog[advertId].bids.concat(data.bids)
        }
        afs.writeFileSync(
          advertsBidsLogPath,
          JSON.stringify(advertsBidsLog)
        );
      }
      resolve();
    });
  });
};

const getRoundValue = (a, b, isPercentage = false, def = 0) => {
  let result = b ? a / b : def;
  if (isPercentage) {
    result = Math.round(result * 100 * 100) / 100;
  } else {
    result = Math.round(result);
  }
  return result;
};

const getDateNDaysAgo = (n) => {
  const date = new Date();
  date.setHours(0, 0, 0, 0);
  date.setDate(date.getDate() - n);
  return date;
}

const getDaysInWork = (createTime) => {
  const today = getDateNDaysAgo(0);
  const startDate = new Date(createTime);
  startDate.setHours(0, 0, 0, 0);
  const daysInWork =
    (today.getTime() - startDate.getTime()) / 86400 / 1000;
  return daysInWork
}

const autoSetAdvertsCPMsAndWriteToJsonMM = async (uid, campaignName) => {
  return new Promise((resolve, reject) => {
    try {


      const authToken = getAuthTokenMM(uid, campaignName);

      const advertsAutoBidsRulesPath = path.join(
        __dirname,
        "marketMaster",
        uid,
        campaignName,
        "advertsAutoBidsRules.json"
      );
      const advertsAutoBidsRules = readIfExists(advertsAutoBidsRulesPath);
      const advertsInfosPath = path.join(
        __dirname,
        "marketMaster",
        uid,
        campaignName,
        "advertsInfos.json"
      );
      const advertsPath = path.join(
        __dirname,
        "marketMaster",
        uid,
        campaignName,
        "adverts.json"
      );
      const advertsBidsLogPath = path.join(
        __dirname,
        "marketMaster",
        uid,
        campaignName,
        "advertsBidsLog.json"
      );
      const advertsBidsLog = readIfExists(advertsBidsLogPath);
      const artsPath = path.join(
        __dirname,
        "marketMaster",
        uid,
        campaignName,
        "arts.json"
      );
      const arts = readIfExists(artsPath);
      arts.byBrandArt = {};
      for (const [nmId, artData] of Object.entries(arts.byNmId)) {
        arts.byBrandArt[artData.art] = artData;
      }
      const advertsInfos = readIfExists(advertsInfosPath);
      const adverts = readIfExists(advertsPath);

      let campaignMassAdvertsData = {}
      try {
        getPlacements(uid, campaignName);
        campaignMassAdvertsData = calcMassAdvertsNewAndWriteToJsonMM(
          uid,
          campaignName
        );
      }
      catch (e) {
        console.log(new Date(), e);
        resolve();
        return;
      }

      const setAdvertsCPMs = async () => {
        const artsByImntId = {}
        for (const [nmId, artData] of Object.entries(arts.byNmId)) {
          if (nmId === undefined || artData === undefined) continue;
          const { imtId, art } = artData;
          if (imtId === undefined) continue;

          if (!artsByImntId[imtId]) artsByImntId[imtId] = []
          if (!artsByImntId[imtId].includes(art)) artsByImntId[imtId].push(art)

        }

        const advertsArts = {}
        for (const [advertId, advertInfos] of Object.entries(advertsInfos)) {
          if (!advertId || !advertInfos) continue;
          const type = advertInfos.type;
          const status = advertInfos.status;

          if (!adverts[advertId]) continue;

          if (![4, 9, 11].includes(status)) continue;

          let nms = [];
          if (type == 8) {
            nms = advertInfos.autoParams.nms ?? [];
          } else if (type == 9) {
            nms = advertInfos.unitedParams ? advertInfos.unitedParams[0].nms ?? [] : [];
          } else if (type == 6) {
            const temp = advertInfos.params ? advertInfos.params[0].nms : [];
            for (let i = 0; i < temp.length; i++) {
              nms.push(temp[i].nm);
            }
          }

          if (!advertsArts[advertId]) advertsArts[advertId] = { topArt: { art: '', index: -1 }, nms: [], imtIdNms: { included: [], nms: [] } };
          advertsArts[advertId].nms = nms;
          for (const nmId of nms) {
            if (!arts.byNmId[nmId]) continue;

            const { imtId, art } = arts.byNmId[nmId]
            if (!campaignMassAdvertsData[art]) continue;
            const { index } = campaignMassAdvertsData[art].placements;
            if (advertsArts[advertId].topArt.art == '' || advertsArts[advertId].topArt.index == -1 || advertsArts[advertId].topArt.index > (index == -1 ? 10 * 1000 : index)) {
              advertsArts[advertId].topArt.index = index;
              advertsArts[advertId].topArt.art = art;
            }
            try {
              const included = advertsArts[advertId].imtIdNms.included;
              if (!included.includes(imtId)) advertsArts[advertId].imtIdNms.included.push(imtId)
              else continue;
              advertsArts[advertId].imtIdNms.nms = advertsArts[advertId].imtIdNms.nms.concat(artsByImntId[imtId] ?? []);
            } catch (e) {
              console.log(new Date(), e, campaignName, "ASDASDASDASd");
              console.log(new Date(), advertsArts[advertId], advertsArts[advertId].imtIdNms, advertsArts[advertId].imtIdNms.included);
            }
          }

        }

        for (const [id, advertInfos] of Object.entries(advertsInfos)) {
          if (!id || !advertInfos) continue;
          if (!adverts[id]) continue;

          const { name, type, status, createTime, advertId } = advertInfos;
          if (![8, 6, 9].includes(type)) continue;
          if (status != 9) continue;


          const daysInWork = getDaysInWork(createTime);

          let currentBid = undefined;
          let subjectId = undefined;
          if (type == 8) {
            if (!advertInfos.autoParams) continue;
            currentBid = advertInfos.autoParams.cpm;
          } else if (type == 6) {
            if (!advertInfos.params) continue;
            const tempParams = advertInfos.params[0];
            currentBid = tempParams ? tempParams.price : undefined;
            subjectId = tempParams ? tempParams.subjectId : undefined;
          }
          else if (type == 9) {
            if (!advertInfos.unitedParams) continue;
            const tempParams = advertInfos.unitedParams[0];
            currentBid = tempParams ? tempParams.searchCPM : undefined;
            subjectId = tempParams ? tempParams.subject ? tempParams.subject.id : undefined : undefined;
          }

          const minBid = type == 8 ? 125 : 150;
          let bid = currentBid;
          let rollback = false;

          const art = advertsArts[advertId].topArt.art;

          if (!campaignMassAdvertsData[art]) continue;
          if (!campaignMassAdvertsData[art].placements) continue;
          const { index, prevIndex, prevPrevIndex, cpmIndex, updateTime, cpmPrevIndex, cpmPrevPrevIndex, phrase, log } =
            campaignMassAdvertsData[art].placements;

          let position = undefined;
          if (log) {
            position = log.position + 1;
          }

          const prevBids = advertsBidsLog[advertId]
            ? advertsBidsLog[advertId].bids : undefined

          const bidsRules = advertsAutoBidsRules[id]

          console.log(new Date(), uid, campaignName, id, 'bidsRules:', bidsRules, `index: ${index} cpmIndex: ${cpmIndex}`);

          if (!bidsRules) {
            if (!(advertId in advertsBidsLog))
              advertsBidsLog[advertId] = { bids: [] };

            const prevBidsValues = { index: -1, cpmIndex: -1 };
            if (prevBids && prevBids.length > 0) {
              prevBidsValues.index = prevBids.slice(-1)[0].index ?? -1;
              prevBidsValues.cpmIndex = prevBids.slice(-1)[0].cpmIndex ?? -1;
            }

            advertsBidsLog[advertId].bids.push({
              time: new Date().toISOString(),
              val: bid,
              cpmIndex: cpmIndex,
              cpmPrevIndex: prevBidsValues.cpmIindex,
              index: index,
              autoBidsMode: 'none',
              prevIndex: prevBidsValues.index,
              phrase: phrase,
              position: position,
              rollback: rollback,
            });

            continue;
          }


          const { desiredDRR, maxBid, placementsRange, autoBidsMode } =
            bidsRules ?? {};

          if (desiredDRR === undefined || maxBid === undefined || placementsRange === undefined) continue;

          const min_recalc = (daysInWork) => {
            const res = {
              cpo: 0,
              sum: 0,
              orders: 0,
              sum_orders: 0,
              views: 0,
              cpm: 0,
              cr: 0,
              drr: 0,
              clicks: 0,
            };
            if (advertsArts[advertId]) {
              const { nms, imtIdNms } = advertsArts[advertId];
              for (const art of imtIdNms.nms) {
                for (let i = 0; i <= daysInWork; i++) {
                  const strDate = getLocaleDateString(getDateNDaysAgo(i)).slice(0, 10);

                  const { sum, orders, clicks, views, sum_orders } =
                    campaignMassAdvertsData[art] ?
                      campaignMassAdvertsData[art].advertsStats
                        ? campaignMassAdvertsData[art].advertsStats[strDate]
                          ? campaignMassAdvertsData[art].advertsStats[strDate]
                          : {
                            sum: 0,
                            orders: 0,
                            clicks: 0,
                            views: 0,
                            sum_orders: 0,
                          }
                        : { sum: 0, orders: 0, clicks: 0, views: 0, sum_orders: 0 }
                      : { sum: 0, orders: 0, clicks: 0, views: 0, sum_orders: 0 }


                  // if (
                  //   campaignMassAdvertsData[art].advertsStats &&
                  //   !campaignMassAdvertsData[art].advertsStats[strDate]
                  // )
                  // console.log(new Date(), uid, campaignName, art, strDate, sum, orders, sum_orders);

                  if (nms.includes(arts.byBrandArt[art].nmId)) {
                    res.orders += orders;
                    res.sum_orders += sum_orders;
                    res.sum += sum;
                    res.views += views;
                    res.clicks += clicks;
                  }
                }
              }
            }

            res.orders = Math.round(res.orders * 100) / 100;
            res.sum_orders = Math.round(res.sum_orders);
            res.sum = Math.round(res.sum);
            res.clicks = Math.round(res.clicks);
            res.views = Math.round(res.views);
            res.cpo = getRoundValue(res.sum, res.orders, false, res.sum);
            res.cpm = getRoundValue(res.sum * 1000, res.views);
            res.cr = getRoundValue(res.orders, res.views, true);
            res.drr = getRoundValue(res.sum, res.sum_orders, true, 1);

            // console.log(new Date(), uid, campaignName, advertsType, res);

            return res;
          };

          if (prevBids && prevBids.length > 0) {
            if (new Date(updateTime).getTime() <=
              new Date(
                prevBids.slice(-1)[0].time
              ).getTime()) continue;

            bid = prevBids.slice(-1)[0].val ?? currentBid;
          }

          if (autoBidsMode == 'auction') {
            if (!updateTime) continue;
            if (
              (new Date().getTime() - new Date(updateTime).getTime()) /
              1000 /
              60 >
              60
            )
              continue;

            // console.log(new Date(), 'asasdasdasd', advertId, updateTime, cpmIndex, cpmPrevIndex, cpmPrevPrevIndex);
            // //////////////////////////////////// +1 rub
            // let phrasePlacements = {};
            // try {
            //   const phrasePlacementsPath = path.join(
            //     __dirname,
            //     "placementsByPhrases",
            //     `${phrase.replace(/\s/g, "_")}.json`
            //   );
            //   phrasePlacements = readIfExists(phrasePlacementsPath);
            // }
            // catch (e) {
            //   continue;
            // }
            // const { cpms } = phrasePlacements;

            // const logs = cpms[type == 8 ? 'auto' : 'search'];
            // if (logs.length) {
            //   console.log(new Date(), logs);
            //    let position = placementsRange.from
            //   if (position >= logs.length) position = logs.length - 1;
            //   console.log(new Date(), position);
            //   for (let i = position - 1; i < logs.length; i++) {
            //     if (logs[i].advertId == advertId) break;
            //     bid = logs[i].cpm + 1;
            //     console.log(new Date(), bid, logs[i]);
            //     if (bid <= maxBid) break;
            //   }

            // }
            ////////////////////////////////////
            if (cpmIndex > placementsRange.to || cpmIndex == -1 || !cpmIndex) {
              bid = Math.round(bid + 10);
            } else if (cpmIndex < placementsRange.from) {
              bid = Math.round(bid - 10);
            }
            else if (campaignMassAdvertsData[art].placements) {
              if (!cpmPrevIndex || !cpmPrevPrevIndex || cpmPrevIndex == -1 || cpmPrevPrevIndex == -1) continue;
              if (cpmPrevIndex <= placementsRange.to && cpmPrevIndex >= placementsRange.from && cpmPrevPrevIndex <= placementsRange.to && cpmPrevPrevIndex >= placementsRange.from) {
                bid = Math.round(bid - 5);
              } else {
                if (placementsRange.from <= cpmIndex && placementsRange.to >= cpmIndex)
                  continue;
              }

            }
          }
          else if (autoBidsMode == 'placements') {
            if (!updateTime) continue;
            if (
              (new Date().getTime() - new Date(updateTime).getTime()) /
              1000 /
              60 >
              60
            )
              continue;

            // console.log(new Date(), 
            //   art,
            //   index,
            //   new Date(updateTime).toLocaleString("ru-RU"),
            //   maxBid,
            //   placementsRange
            // );


            // if (prevBids && prevBids.length >= 3) {
            //   const prevData = prevBids.slice(-3);
            //   // console.log(new Date(), prevData);
            //   if (!prevData[2].rollback) {
            //     if (prevData[0].index != -1 && prevData[1].index != -1 && prevData[2].index != -1) {
            //       if (prevData[2].val > prevData[1].val && prevData[1].val > prevData[0].val && prevData[1].index <= prevData[2].index) {
            //         bid = Math.round(bid - 10);
            //         rollback = true;
            //       }
            //     }
            //   } else {
            //     if (prevData[2].index == index) {
            //       bid = Math.round(bid - 10);
            //       rollback = true;
            //     }
            //   }
            // }

            if (rollback) { }
            else if (index > placementsRange.to || index == -1) {
              bid = Math.round(bid + 10);
            } else if (index < placementsRange.from) {
              bid = Math.round(bid - 10);
            }
            else if (campaignMassAdvertsData[art].placements) {
              const { prevIndex, prevPrevIndex } = campaignMassAdvertsData[art].placements;

              if (!prevIndex || !prevPrevIndex || prevIndex == -1 || prevPrevIndex == -1) continue;
              if (prevIndex <= placementsRange.to && prevIndex >= placementsRange.from && prevPrevIndex <= placementsRange.to && prevPrevIndex >= placementsRange.from) {
                bid = Math.round(bid - 5);
              } else {
                if (placementsRange.from <= index && placementsRange.to >= index)
                  continue;
              }

            }
          }
          else if (autoBidsMode == 'drr') {

            if (prevBids && prevBids.length > 0) {
              if (new Date().getTime() <=
                (new Date(
                  prevBids.slice(-1)[0].time
                ).getTime() + 20 * 60 * 1000)) continue;
            }

            const { cr, sum, sum_orders, orders } = min_recalc(daysInWork);

            // console.log(advertInfos, daysInWork, sum, currentBid, subjectId, bidsRules, prevBids.slice(-3));
            const avgBill = getRoundValue(
              sum_orders,
              orders
            );

            const calculatedCPO = Math.round(
              avgBill * (desiredDRR / 100)
            );
            // if (orders == 0) bid = minBid;
            if (orders == 0) {
              bid += 30;
            }
            else bid = Math.round(calculatedCPO * cr * 10);

            console.log(new Date(), uid, campaignName, advertId, `cr: ${cr}`, sum_orders, orders, avgBill, `cpo: ${calculatedCPO}`, bid);
          }
          else if (autoBidsMode == 'cpo') {
            if (prevBids && prevBids.length > 0) {
              if (new Date().getTime() <=
                (new Date(
                  prevBids.slice(-1)[0].time
                ).getTime() + 20 * 60 * 1000)) continue;
            }

            const { cr, orders } = min_recalc(daysInWork);

            const calculatedCPO = desiredDRR;
            // if (orders == 0) bid = minBid;
            if (orders == 0) {
              bid += 30;
            } else
              bid = Math.round(calculatedCPO * cr * 10);

            console.log(new Date(), uid, campaignName, advertId, `cr: ${cr}`, orders, `cpo: ${calculatedCPO}`, bid);
          }

          // if (drr == desiredDRR) continue;
          // else if (drr < desiredDRR) bid += bidStep;
          // else if (drr > desiredDRR) bid -= bidStep;
          // let bid = Math.round(cr * 10 * desiredCPO);

          if (bid > maxBid) bid = maxBid;
          if (bid < minBid) bid = minBid;

          // else if (views < 1000 && bid > currentBid) break;

          const params = {
            advertId: advertsInfos[advertId].advertId,
            type: advertsInfos[advertId].type,
            cpm: bid,
          };
          if (subjectId) {
            params["param"] = subjectId;
          }
          if (type == 9) {
            params["instrument"] = 4
            await setAdvertCPM(authToken, {
              advertId: params.advertId,
              type: params.type,
              cpm: 150,
            });
            await new Promise((resolve) => setTimeout(resolve, 1 * 1000));

            params["instrument"] = 6
          }

          await setAdvertCPM(authToken, params);
          await new Promise((resolve) => setTimeout(resolve, 1 * 1000));
          console.log(new Date(),
            uid,
            campaignName,
            advertId,
            "установлена ставка",
            bid,

          );

          if (!(advertId in advertsBidsLog))
            advertsBidsLog[advertId] = { bids: [] };

          const prevBidsValues = { index: -1, cpmIndex: -1 };
          if (prevBids && prevBids.length > 0) {
            prevBidsValues.index = prevBids.slice(-1)[0].index ?? -1;
            prevBidsValues.cpmIndex = prevBids.slice(-1)[0].cpmIndex ?? -1;
          }

          advertsBidsLog[advertId].bids.push({
            time: new Date().toISOString(),
            val: bid,
            autoBidsMode: autoBidsMode,
            cpmIndex: cpmIndex,
            cpmPrevIndex: prevBidsValues.cpmIindex,
            index: index,
            prevIndex: prevBidsValues.index,
            phrase: phrase,
            position: position,
            rollback: rollback,
          });

        }
      };

      setAdvertsCPMs().then(() => {
        // const currentadvertsBidsLog = readIfExists(path.join(
        //   __dirname,
        //   "marketMaster",
        //   uid,
        //   campaignName,
        //   "advertsBidsLog.json"
        // ))
        // for (const [name, data] of Object.entries(plusPhrasesTemplates)) {
        //   if (new Date(currentadvertsBidsLog[name].updateTime) > startTime) {
        //     console.log(new Date(), uid, campaignName, name, 'plus phrases template was updated after the start of this exec.');
        //     continue;
        //   };

        //   currentPlusPhrasesTemplates[name] = data;
        // }
        // afs.writeFileSync(
        //   path.join(
        //     __dirname,
        //     "marketMaster",
        //     uid,
        //     campaignName,
        //     "advertsBidsLog2.json"
        //   ),
        //   JSON.stringify(currentadvertsBidsLog));
        afs.writeFileSync(advertsBidsLogPath, JSON.stringify(advertsBidsLog));
        resolve();
      });
    } catch (e) { console.log(new Date(), e); resolve() }
  });
};

const fetchAdvertStatsAndWriteToJson = async (campaign) => {
  try {

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
      console.log(new Date(), queryParams);
      await getAdvertStat(authToken, queryParams)
        .then((pr) => {
          jsonData[pr.advertId] = pr;
          // console.log(new Date(), campaign, advertId, data.advertId);
        })
        .catch((er) => console.log(new Date(), er));
      await new Promise((resolve) => setTimeout(resolve, 20 * 1000));
    }
    return fs
      .writeFile(
        path.join(__dirname, "files", campaign, "advertStats.json"),
        JSON.stringify(jsonData)
      )
      .then(() => console.log(new Date(), "advertStats.json created."))
      .catch((error) => console.error(error));
  } catch (e) { }

};

const fetchAdvertsStatsAndWriteToJsonMM = async (
  uid,
  campaignName,
  batchSize = 1,
  daysCount = 2
) => {
  try {


    const authToken = getAuthTokenMM(uid, campaignName);
    const advertsInfos = readIfExists(
      path.join(__dirname, "marketMaster", uid, campaignName, "advertsInfos.json")
    );

    const advertsStatsByDay = readIfExists(
      path.join(
        __dirname,
        "marketMaster",
        uid,
        campaignName,
        "advertsStatsByDay.json"
      )
    );
    const advertsStats = readIfExists(
      path.join(
        __dirname,
        "marketMaster",
        uid,
        campaignName,
        "advertsStats.json"
      )
    );

    const adverts = readIfExists(
      path.join(__dirname, "marketMaster", uid, campaignName, "adverts.json")
    );

    let numOfButches = 0;
    const params = [[]];
    const today_str = new Date()
      .toLocaleDateString("ru-RU")
      .replace(/(\d{2})\.(\d{2})\.(\d{4})/, "$3-$2-$1")
      .slice(0, 10);
    for (const [advertId, advertData] of Object.entries(adverts)) {
      if (!advertId || !advertData) continue;


      // if (advertId != '15957333') continue;
      // if (!adverts[advertId]) {
      //   console.log(new Date(), "ola soy dora");
      //   continue;
      // }
      if (!advertsInfos[advertId]) continue;

      const now = new Date();
      const today = new Date(now);
      today.setHours(0, 0, 0, 0);
      const endDate = new Date(advertsInfos[advertId].endTime.slice(0, 10));
      endDate.setHours(0, 0, 0, 0);
      const daysPassed = (today.getTime() - endDate.getTime()) / 86400 / 1000;
      // console.log(new Date(), new Date(advertData.endTime.slice(0, 10)), new Date(), dayyss);
      if (daysPassed >= daysCount) {
        continue;
      }

      const getDateFromLocaleString = (str) => {
        const [date, time] = str.split(", ");
        const isoDate = date
          .replace(/(\d{2})\.(\d{2})\.(\d{4})/, "$3-$2-$1")
          .slice(0, 10);
        const res = new Date(`${isoDate}T${time}.000Z`);
        return res;
      };

      const updateTime = advertsStatsByDay[advertId]
        ? advertsStatsByDay[advertId].updateTime
        : "";
      const updateDate = getDateFromLocaleString(updateTime);
      const minutesPassed =
        (now.getTime() - (updateDate.getTime() - 1000 * 60 * 60 * 3)) / 60 / 1000;
      // if (minutesPassed < 20) continue;
      console.log(new Date(), uid, campaignName, advertId, minutesPassed, updateTime);

      if (params[numOfButches].length == batchSize) {
        // if (![9, 11].includes(advertData.status)) continue;
        params.push([]);
        numOfButches++;
      }
      // console.log(new Date(), uid, campaignName, advertId);

      const dates = [];
      const startDate = new Date(advertsInfos[advertId].createTime);
      startDate.setHours(0, 0, 0, 0);
      const daysBetween = (today.getTime() - startDate.getTime()) / 86400 / 1000;

      for (let i = 0; i <= daysBetween; i++) {
        dates.push(getLocaleDateString(getDateNDaysAgo(i)).slice(0, 10));
      }
      // console.log(new Date(), 
      //   advertId,
      //   daysBetween,
      //   daysPassed,
      //   dates,
      //   advertData.createTime,
      //   advertData.endTime
      // );
      // continue;
      params[numOfButches].push({
        id: advertData.advertId,
        // interval: {
        //   begin: "2022-01-01",
        //   end: today_str,
        // },
        // dates: dates,
      });
    }
    // return;
    let retry = false;
    for (let i = 0; i < params.length; i++) {
      const paramsToSend = params[i];
      console.log(new Date(), uid, campaignName, `${i + 1}/${params.length}`, paramsToSend);
      if (!paramsToSend.length) continue;
      const advertsStatsPath = path.join(
        __dirname,
        "marketMaster",
        uid,
        campaignName,
        "advertsStats.json"
      );
      let jsonData = readIfExists(advertsStatsPath);
      await getAdvertsStatsMM(authToken, paramsToSend)
        .then(async (pr) => {
          if (!pr) return;
          // if (!retry) {
          //   if (pr.length != params[i].length) {
          //     retry = true;
          //     console.log(new Date(), uid, campaignName, "Retrying:", params[i]);
          //     i--;
          //     await new Promise((resolve) => setTimeout(resolve, 1 * 30 * 1000));
          //   }
          // } else retry = false;

          for (let j = 0; j < pr.length; j++) {
            const advertData = pr[j];
            const advertId = advertData.advertId;
            if (!advertId) {
              console.log(new Date(), "Skipped:", params[i], pr[j]);
              continue;
            }
            // console.log(new Date(), advertData, advertData.days);
            advertData.updateTime = new Date().toLocaleString("ru-RU");
            if (advertId in jsonData) {
              for (
                let dateIndex = 0;
                dateIndex < jsonData[advertId].days.length;
                dateIndex++
              ) {
                const dateData = jsonData[advertId].days[dateIndex];
                const date = dateData.date;

                // if (advertId == "15907474")
                //   console.log(new Date(), advertId, jsonData[advertId], date, dateData);
                const datePrIndex = advertData.days.findIndex(
                  (el) => el.date == date
                );
                if (datePrIndex == -1) {
                  // console.log(new Date(), advertId, date, "no data for date in db");
                  advertData.days.push(dateData);
                } else if (dateData.sum > advertData.days[datePrIndex].sum) {
                  console.log(new Date(), advertId, date, "date in db and bigger");
                  advertData.days[datePrIndex] = dateData;
                }
              }
            }
            jsonData[advertId] = advertData;
            console.log(new Date(), uid, campaignName, advertId, "stats updated.");
          }
        })
        .catch((er) => console.log(new Date(), er));
      afs.writeFileSync(advertsStatsPath, JSON.stringify(jsonData));
      await getAdvertsStatByDayMM(uid, campaignName);
      await getAdvertsStatByArtMM(uid, campaignName);
      await new Promise((resolve) => setTimeout(resolve, 1.5 * 60 * 1000));
    }
  } catch (e) {
    console.log(new Date(), new Date(), uid, campaignName, e);
  }
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
      // console.log(new Date(), advertId, jsonData[advertId], date);
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
    .then(() => console.log(new Date(), campaign, "advertStatsByDay.json created."))
    .catch((error) => console.error(error));
};

const getAdvertsStatByArtMM = (uid, campaignName) => {
  const artsPath = path.join(
    __dirname,
    "marketMaster",
    uid,
    campaignName,
    "arts.json"
  );
  const arts = readIfExists(artsPath);
  arts.byBrandArt = {};
  for (const [nmId, artData] of Object.entries(arts.byNmId)) {
    arts.byBrandArt[artData.art] = artData;
  }


  const ordersPath = path.join(
    __dirname,
    "marketMaster",
    uid,
    campaignName,
    "orders.json"
  );
  const orders = readIfExists(ordersPath);

  const advertsStatsPath = path.join(
    __dirname,
    "marketMaster",
    uid,
    campaignName,
    "advertsStats.json"
  );
  const advertsStats = readIfExists(advertsStatsPath);

  const advertsPath = path.join(
    __dirname,
    "marketMaster",
    uid,
    campaignName,
    "adverts.json"
  );
  const adverts = readIfExists(advertsPath);

  const calcOrdersForDay = (brandArt, date) => {
    const artsToSumUp = [];
    const sizes = arts.byBrandArt[brandArt].sizes;
    for (let i = 0; i < sizes.length; i++) {
      const sku = sizes[i].skus[0];
      const art = arts.bySku[sku].art;
      artsToSumUp.push(art);
    }

    const res = { orders: 0, sum_orders: 0 };
    for (let i = 0; i < artsToSumUp.length; i++) {
      const art = artsToSumUp[i];
      if (!orders[date]) continue;
      if (!orders[date].all[art]) continue;

      res.orders += orders[date].all[art].count
        ? orders[date].all[art].count
          ? orders[date].all[art].count
          : 0
        : 0;
      res.sum_orders += orders[date].all[art].sum
        ? orders[date].all[art].sum
          ? orders[date].all[art].sum
          : 0
        : 0;
    }
    return res;
  };

  const jsonData = {};
  const jsonDataAvg = {};
  for (const [advertId, stats] of Object.entries(advertsStats)) {
    const days = stats.days;
    if (!advertId || !days) continue;
    if (!adverts[advertId]) continue;

    for (let i = 0; i < days.length; i++) {
      const day = days[i];
      const date = day.date.slice(0, 10);
      const apps = day.apps ?? [];
      for (let j = 0; j < apps.length; j++) {
        const nmsStats = apps[j].nm ?? [];
        for (let k = 0; k < nmsStats.length; k++) {
          const nmStat = nmsStats[k];
          const nmId = nmStat.nmId;
          const { art } = arts.byNmId[nmId] ?? {};
          if (!art) continue;

          if (!jsonData[art]) jsonData[art] = {};
          if (!jsonData[art][date]) {
            const { orders, sum_orders } = calcOrdersForDay(art, date);
            jsonData[art][date] = {
              clicks: 0,
              views: 0,
              sum: 0,
              orders: orders,
              sum_orders: sum_orders,
            };
          }

          jsonData[art][date].clicks += nmStat.clicks;
          jsonData[art][date].views += nmStat.views;
          jsonData[art][date].sum += nmStat.sum;
        }
      }
    }
  }

  const today = new Date();
  today.setHours(0, 0, 0, 0);
  for (const [art, artData] of Object.entries(jsonData)) {
    if (!jsonDataAvg[art]) {
      jsonDataAvg[art] = {
        clicks: 0,
        views: 0,
        sum: 0,
        orders: 0,
        sum_orders: 0,
      };
    }
    if (!jsonDataAvg[campaignName]) {
      jsonDataAvg[campaignName] = {
        clicks: 0,
        views: 0,
        sum: 0,
        orders: 0,
        sum_orders: 0,
      };
    }
    const type = arts.byBrandArt[art].object;
    if (!jsonDataAvg[type]) {
      jsonDataAvg[type] = {
        clicks: 0,
        views: 0,
        sum: 0,
        orders: 0,
        sum_orders: 0,
      };
    }

    for (const [date, dateData] of Object.entries(artData)) {
      for (const [key, value] of Object.entries(dateData)) {
        jsonData[art][date][key] = Math.round(value);
      }
      jsonData[art][date].drr = getRoundValue(
        jsonData[art][date].sum,
        jsonData[art][date].sum_orders,
        true,
        1
      );
    }

    for (let i = 1; i <= 7; i++) {
      const dateObj = new Date(today);
      dateObj.setDate(today.getDate() - i);
      const strDateObj = dateObj
        .toLocaleDateString("ru-RU")
        .replace(/(\d{2})\.(\d{2})\.(\d{4})/, "$3-$2-$1")
        .slice(0, 10);
      const { views, clicks, sum } = jsonData[art][strDateObj] ?? {};
      const { orders, sum_orders } = calcOrdersForDay(art, strDateObj);

      jsonDataAvg[art].views += views ?? 0;
      jsonDataAvg[art].clicks += clicks ?? 0;
      jsonDataAvg[art].sum += sum ?? 0;
      jsonDataAvg[art].orders += orders ?? 0;
      jsonDataAvg[art].sum_orders += sum_orders ?? 0;

      jsonDataAvg[campaignName].views += views ?? 0;
      jsonDataAvg[campaignName].clicks += clicks ?? 0;
      jsonDataAvg[campaignName].sum += sum ?? 0;
      jsonDataAvg[campaignName].orders += orders ?? 0;
      jsonDataAvg[campaignName].sum_orders += sum_orders ?? 0;

      jsonDataAvg[type].views += views ?? 0;
      jsonDataAvg[type].clicks += clicks ?? 0;
      jsonDataAvg[type].sum += sum ?? 0;
      jsonDataAvg[type].orders += orders ?? 0;
      jsonDataAvg[type].sum_orders += sum_orders ?? 0;
    }
    for (const [key, value] of Object.entries(jsonDataAvg[art])) {
      jsonDataAvg[art][key] = Math.round(value);
    }
    jsonDataAvg[art].drr = getRoundValue(
      jsonDataAvg[art].sum,
      jsonDataAvg[art].sum_orders,
      true,
      1
    );

    for (const [key, value] of Object.entries(jsonDataAvg[type])) {
      jsonDataAvg[type][key] = Math.round(value);
    }
    jsonDataAvg[type].drr = getRoundValue(
      jsonDataAvg[type].sum,
      jsonDataAvg[type].sum_orders,
      true,
      1
    );
  }
  jsonDataAvg[campaignName].drr = getRoundValue(
    jsonDataAvg[campaignName].sum,
    jsonDataAvg[campaignName].sum_orders,
    true,
    1
  );

  const advertsStatsByArtPath = path.join(
    __dirname,
    "marketMaster",
    uid,
    campaignName,
    "advertsStatsByArt.json"
  );
  const advertsAvgStatsByArtPath = path.join(
    __dirname,
    "marketMaster",
    uid,
    campaignName,
    "advertsAvgStatsByArt.json"
  );

  afs.writeFileSync(advertsAvgStatsByArtPath, JSON.stringify(jsonDataAvg));

  return fs
    .writeFile(advertsStatsByArtPath, JSON.stringify(jsonData))
    .then(() =>
      console.log(new Date(), uid, campaignName, "advertsStatsByArt.json created.")
    )
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
    const updateTime = stats.updateTime;
    const artsToSumUp = [];
    const splitted = name;
    if (!(splitted in arts.byArt)) {
      let nms = [];
      if (type == 8) {
        nms = advertsInfos[advertId].autoParams.nms ?? [];
      } else if (type == 9) {
        nms = advertsInfos[advertId].unitedParams ? advertsInfos[advertId].unitedParams[0].nms ?? [] : [];
      } else if (type == 6) {
        const temp = advertsInfos[advertId].params ? advertsInfos[advertId].params[0].nms : [];
        for (let i = 0; i < temp.length; i++) {
          nms.push(temp[i].nm);
        }
      }


      for (let i = 0; i < nms.length; i++) {
        if (!arts.byNmId[nms[i]]) continue;
        // console.log(new Date(), campaignName, nms, arts.byNmId[nms[i]]);
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
      jsonData[advertId] = {
        name: name,
        type: type,
        status: status,
        updateTime: updateTime,
        days: {},
      };
    for (let i = 0; i < days.length; i++) {
      const day = days[i];
      const date = day.date.slice(0, 10);
      // console.log(new Date(), advertId, jsonData[advertId], date);
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
        if (!orders[date].all[art]) continue;
        // console.log(new Date(), art);
        jsonData[advertId].days[date].orders += orders[date].all[art].count
          ? orders[date].all[art].count
            ? orders[date].all[art].count
            : 0
          : 0;
        jsonData[advertId].days[date].sum_orders += orders[date].all[art].sum
          ? orders[date].all[art].sum
            ? orders[date].all[art].sum
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
      console.log(new Date(), uid, campaignName, "advertsStatsByDay.json created.")
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
      console.log(new Date(), campaign, advertId);
    });
    await new Promise((resolve) => setTimeout(resolve, 1 * 300));
  }
  return fs
    .writeFile(filepath, JSON.stringify(jsonData))
    .then(() => console.log(new Date(), "advertStats.json created."))
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
      console.log(new Date(), campaign, advertId);
    });
    await new Promise((resolve) => setTimeout(resolve, 1 * 300));
  }
  return fs
    .writeFile(
      path.join(__dirname, "files", campaign, "advertStatsMpManagerLog.json"),
      JSON.stringify(jsonData)
    )
    .then(() => console.log(new Date(), "advertStatsLog.json created."))
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
    // console.log(new Date(), key, id);
    const nms_temp =
      type == "standard"
        ? data.params[0].nms
        : type == "auto"
          ? data.autoParams.nms
          : data.unitedParams[0].nms;
    // console.log(new Date(), key, data, nms_temp);
    if (type == "standard") {
      const nms = [];
      for (let i = 0; i < nms_temp.length; i++) {
        nms.push(String(nms_temp[i].nm));
      }
      for (const [id, art] of Object.entries(vendorCodes)) {
        if (art.match(key)) {
          if (!nms.includes(id) && stocks[art]) {
            // console.log(new Date(), stocks[art], art);
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
      console.log(new Date(), campaign, key, params);
      await updateAdvertArtActivities(authToken, params);
    }
  }
  // console.log(new Date(), notIncluded);
  // return;
  return fs
    .writeFile(
      path.join(__dirname, "files", campaign, "notIncludedNMs.json"),
      JSON.stringify(notIncluded)
    )
    .then(() => console.log(new Date(), "notIncludedNMs.json created."))
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
    console.log(new Date(), key);
    const type =
      "params" in data ? "standard" : "autoParams" in data ? "auto" : "united";

    if (type != "auto") continue;

    // console.log(new Date(), key, id);
    const nms_temp =
      type == "standard"
        ? data.params[0].nms
        : type == "auto"
          ? data.autoParams.nms
          : data.unitedParams[0].nms;
    if (type == "auto") {
      if (!artsData[key]) continue;
      console.log(new Date(), key, data, nms_temp);
      const nms_to_delete = [];
      for (let i = 0; i < nms_temp.length; i++) {
        const id = nms_temp[i];
        if (vendorCodes[id] != key) nms_to_delete.push(id);
      }
      if (nms_temp.length == nms_to_delete.length) {
        console.log(new Date(), key, "nothing to leave in this RK.");

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
      console.log(new Date(), campaign, key, params);
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
      console.log(new Date(), vendorCode, data[vendorCode]);
      await new Promise((resolve) => setTimeout(resolve, 200));
    }
    return fs
      .writeFile(
        path.join(__dirname, "files", campaign, "artRatings.json"),
        JSON.stringify(data)
      )
      .then(() => {
        console.log(new Date(), "artRatings.json created.");
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

const fetchArtsAndWriteToJsonMM = async (uid, campaignName) => {
  const authToken = getAuthTokenMM(uid, campaignName);

  const promises = [];
  let cards = [];
  const params = {
    settings: {
      cursor: {
        limit: 100,
      },
      filter: {
        withPhoto: -1,
      },
    },
  };
  for (let i = 1; i < 100; i++) {
    let isNextPage = false;
    let dropOutOfFunc = false;

    promises.push(
      await getCardsMM(authToken, params)
        .then(async (res) => {
          const tempCards = res.cards;
          cards = cards.concat(tempCards);

          console.log(new Date(), campaignName, i, res.cursor.total);

          if (res.cursor.total >= 100) {
            isNextPage = true;
            await new Promise((resolve) => setTimeout(resolve, 10 * 1000));
            const { updatedAt, nmID } = tempCards.slice(-1)[0];
            params.settings.cursor.updatedAt = updatedAt;
            params.settings.cursor.nmID = nmID;
          }
        })
        .catch((e) => {
          console.log(new Date(), e);
          dropOutOfFunc = true;
        })
    );

    if (dropOutOfFunc) {
      return;
    }

    if (!isNextPage) {
      break;
    }
  }
  Promise.all(promises).then(() => {
    if (!cards || cards.length == 0) return;
    writeVendorCodesToJsonMM(cards, uid, campaignName);
  });
};

const fetchArtsPricesAndWriteToJsonMM = async (uid, campaignName) => {
  const authToken = getAuthTokenMM(uid, campaignName);

  const promises = [];
  let goods = [];
  const params = {
    limit: 1000,
    offset: 0,
  };
  for (let i = 1; i < 10; i++) {
    let isNextPage = false;

    promises.push(
      await getGoodsMM(authToken, params)
        .then(async (res) => {
          if (!res) return;
          if (!res.data) return;
          if (!res.data.listGoods) return;
          const tempGoods = res.data.listGoods;
          goods = goods.concat(tempGoods);

          console.log(new Date(), uid, campaignName, i, tempGoods.length);

          if (tempGoods.length == 1000) {
            isNextPage = true;
            await new Promise((resolve) => setTimeout(resolve, 1 * 1000));
            params.offset = params.offset + 1000
          }
        })
        .catch((e) => {
          console.log(new Date(), e);
        })
    );

    if (!isNextPage) {
      break;
    }
  }
  Promise.all(promises).then(() => {
    if (!goods || goods.length == 0) return;
    writePricesToJsonMM(goods, uid, campaignName);
  });
};

const fetchNmDetailReportHistoryAndWriteToJsonMM = (uid, campaignName) => {
  return new Promise(async (resolve) => {
    const authToken = getAuthTokenMM(uid, campaignName);
    const arts = readIfExists(path.join(__dirname, "files", campaign, "arts.json"),)



    const batches = []
    for (const [art, artData] of Object.entries()) { }


    const datePrev = new Date(date);
    datePrev.setDate(datePrev.getDate() - 7);

    const params = {
      period: {
        begin: getLocaleDateString(date).slice(0, 10),
        end: getLocaleDateString(date).slice(0, 10),
      },
    };

    await getNmDetailReportHistory(authToken, params)
      .then(async (res) => {
        if (!res) return;
        cards = cards.concat(res.data);
      })
      .catch((e) => {
        console.log(new Date(), e);
      });


    writeNmDetailReportToJsonMM(cards, uid, campaignName).then(async () => {
      await new Promise((resolve) => setTimeout(resolve, 30 * 1000));
      resolve();
    })


    let cards = [];
    for (let j = 0; j < 1; j++) {
      const date = new Date();
      date.setDate(date.getDate() - j);

      console.log(new Date(), uid, campaignName, date);
      await fetchDay(date, j);

    }
    resolve()
  });
};

const fetchNmDetailReportAndWriteToJsonMM = (uid, campaignName, days) => {
  return new Promise(async (resolve) => {
    const authToken = getAuthTokenMM(uid, campaignName);

    const fetchDay = (date, j) => new Promise(async (resolve) => {
      for (let i = 1; i < 10; i++) {
        const params = {
          period: {
            begin: getLocaleDateString(date).slice(0, 10) + " 00:00:00",
            end: getLocaleDateString(date).slice(0, 10) + (j == 0 ? " " + new Date().toLocaleTimeString('ru-RU') : " 23:59:59"),
          },
          page: i,
        };
        let isNextPage = false;
        await getNmDetailReport(authToken, params, true)
          .then(async (res) => {
            // console.log(new Date(), res.data.page, res.data.isNextPage);
            if (!res) return;

            cards = cards.concat(res.data.cards);
            // console.log(new Date(), cards, res.data.cards);

            if (!res.data.isNextPage) {
              isNextPage = true;
            } else {
              console.log(new Date(), uid, campaignName, "waiting");
              await new Promise((resolve) => setTimeout(resolve, 30 * 1000));
              console.log(new Date(), uid, campaignName, "done waiting");
            }
          })
          .catch((e) => {
            console.log(new Date(), uid, campaignName, e);
          });

        if (isNextPage) {
          break;
        }
      }

      writeNmDetailReportToJsonMM(cards, uid, campaignName).then(async () => {
        await new Promise((resolve) => setTimeout(resolve, 30 * 1000));
        resolve();
      });
    })

    let cards = [];
    for (let j = 0; j < days; j++) {
      const date = new Date();
      date.setDate(date.getDate() - j);

      console.log(new Date(), uid, campaignName, date);
      await fetchDay(date, j);

    }
    resolve()
  });
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
  // console.log(new Date(), date);
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
    console.log(new Date(), date);
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
  console.log(new Date(), now, dateFrom);
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
    // console.log(new Date(), supplierArticle);
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
      // console.log(new Date(), jsonData[order_date_string]);
    }

    if (!(order_date_string in orderSumJsonData)) {
      orderSumJsonData[order_date_string] = {};
      for (const art in artsBarcodes.direct) {
        orderSumJsonData[order_date_string][art] = 0;
      }
      // console.log(new Date(), orderSumJsonData[order_date_string]);
    }
    if (!(supplierArticle in jsonData[order_date_string])) {
      jsonData[order_date_string][supplierArticle] = 0;
      orderSumJsonData[order_date_string][supplierArticle] = 0;
    }

    orderSumJsonData[order_date_string][supplierArticle] += get_item_price();
    jsonData[order_date_string][supplierArticle] += 1;

    // ---------------------------
    // console.log(new Date(), supplierArticle, artsBarcodesFull[supplierArticle], item.barcode);
    if (supplierArticle) {
      const brand =
        brand_names[artsBarcodesFull[supplierArticle].brand] ??
        artsBarcodesFull[supplierArticle].brand;
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

    // console.log(new Date(), now, yesterday);
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
      // console.log(new Date(), item, orderSumJsonDataByNow.today[supplierArticle]);
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
        // console.log(new Date(), item, orderSumJsonDataByNow.yesterday[supplierArticle]);
      }
    }
  });
  fs.writeFile(
    path.join(__dirname, "files", campaign, "excluded.json"),
    JSON.stringify(excluded)
  ).then(() => console.log(new Date(), campaign, "excluded.xlsx created."));
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
    .then(() => console.log(new Date(), campaign, "orders by days.json created."))
    .catch((error) => console.error(error));
};

const fetchOrdersAndWriteToJsonMM = (uid, campaignName, daysAgo = undefined) => {
  return new Promise((resolve, reject) => {
    const authToken = getAuthTokenMM(uid, campaignName);
    const dateFrom = new Date();
    dateFrom.setDate(dateFrom.getDate() - (daysAgo ?? 0));
    const date = getLocaleDateString(dateFrom).slice(0, 10);
    console.log(new Date(), date);
    const params = {
      dateFrom: date,
      flag: daysAgo === undefined ? 0 : 1,
      // flag: 1,
    };
    return getOrders(authToken, params)
      .then((data) => {
        if (!data) return;
        // afs.writeFileSync(
        //   path.join(
        writeOrdersToJsonMM(data, uid, campaignName, date).then(() =>
          resolve()
        );
        //     __dirname, 
        //     "marketMaster",
        //     uid,
        //     campaignName,
        //     "orders_full.json"
        //   ),
        //   JSON.stringify(data)
        // );
      })
      .catch((error) => console.error(error));
  });
};

const fetchSalesAndWriteToJsonMM = (uid, campaignName, daysAgo = undefined) => {
  return new Promise((resolve, reject) => {
    const authToken = getAuthTokenMM(uid, campaignName);
    const dateFrom = new Date();
    dateFrom.setDate(dateFrom.getDate() - (daysAgo ?? 0));
    const date = getLocaleDateString(dateFrom).slice(0, 10);
    console.log(new Date(), date);
    const params = {
      dateFrom: date,
      flag: daysAgo === undefined ? 0 : 1,
    };
    return getSales(authToken, params)
      .then((data) => {
        if (!data) return;
        writeSalesToJsonMM(data, uid, campaignName, date).then((pr) =>
          resolve()
        );
      })
      .catch((error) => console.error(error));
  });
};

const calcSmartDetailedByPeriodAndWriteToJSON = (campaign) => {
  const mapp = {
    mayusha: {
      uid: "4a1f2828-9a1e-4bbf-8e07-208ba676a806",
      campaignName: "ИП Валерий",
    },
    delicatus: {
      uid: "4a1f2828-9a1e-4bbf-8e07-208ba676a806",
      campaignName: "ИП Артем",
    },
    TKS: {
      uid: "4a1f2828-9a1e-4bbf-8e07-208ba676a806",
      campaignName: "Текстиль",
    },
    perinka: {
      uid: "4a1f2828-9a1e-4bbf-8e07-208ba676a806",
      campaignName: "ИП Оксана",
    },
  };

  const { uid, campaignName } = mapp[campaign];

  const data = readIfExists(path.join(__dirname, "files/data.json"));

  const arts = readIfExists(
    path.join(__dirname, "marketMaster", uid, campaignName, "arts.json")
  );
  const tariffs = readIfExists(
    path.join(__dirname, "marketMaster", uid, campaignName, "tariffs.json")
  );
  const orders = readIfExists(
    path.join(__dirname, "marketMaster", uid, campaignName, "orders.json")
  );
  const nmDetailReport = readIfExists(
    path.join(
      __dirname,
      "marketMaster",
      uid,
      campaignName,
      "nmDetailReport.json"
    )
  );

  const yesterday = new Date();
  yesterday.setDate(yesterday.getDate() - 1);

  const jsonData = {};

  for (const [art, artData] of Object.entries(arts.byArt)) {
    const { nmId } = artData;

    if (!jsonData[art])
      jsonData[art] = {
        delivery: 0,
        orders: 0,
        sum_orders: 0,
        delivery: 0,
        avg: 0,
      };

    const detailReport = nmDetailReport[nmId]
      ? nmDetailReport[nmId].statistics
      : {};
    const buyoutsPercent = detailReport.buyoutsPercent ?? 100;

    if (!data[art]) continue;
    const { volume, ktr } = data[art];

    for (let daysAgo = 1; daysAgo <= 7; daysAgo++) {

      const yesterdayStr = getLocaleDateString(getDateNDaysAgo(daysAgo)).slice(0, 10);
      // const yesterdayStr = getLocaleDateString(yesterday).slice(0, 10);
      if (!orders[yesterdayStr].all[art]) {
        const koef = tariffs["Краснодар"].boxDeliveryAndStorageExpr / 100;
        jsonData[art].delivery +=
          (tariffs["Краснодар"].boxDeliveryBase / koef) *
          (volume < 1 ? volume : 1);
        if (volume > 1) {
          jsonData[art].delivery +=
            (volume - 1) * (tariffs["Краснодар"].boxDeliveryLiter / koef);
        }

        jsonData[art].delivery += (1 - buyoutsPercent / 100) * 50;
        jsonData[art].delivery *= ktr ?? 1;

        jsonData[art].orders += 1;
        continue;
      }

      for (const [warehouseName, warehouseData] of Object.entries(
        orders[yesterdayStr]
      )) {
        if (warehouseName == "all") continue;

        const warehouseOrders = { orders: 0, sum_orders: 0, delivery: 0 };

        const ordersData = warehouseData[art] ?? {};
        const { count, sum } = ordersData;
        if (count === undefined || sum === undefined) continue;

        if (art == 'КПБ_1.5_СТРАЙП_14-4102_ОТК')
          console.log(yesterdayStr, ordersData);

        warehouseOrders.orders += count;
        warehouseOrders.sum_orders += sum;

        const boxDeliveryBase = tariffs[warehouseName]
          ? tariffs[warehouseName].boxDeliveryBase
          : tariffs["Краснодар"].boxDeliveryBase /
          (tariffs["Краснодар"].boxDeliveryAndStorageExpr / 100);
        const boxDeliveryLiter = tariffs[warehouseName]
          ? tariffs[warehouseName].boxDeliveryLiter
          : tariffs["Краснодар"].boxDeliveryLiter /
          (tariffs["Краснодар"].boxDeliveryAndStorageExpr / 100);

        warehouseOrders.delivery +=
          count * boxDeliveryBase * (volume < 1 ? volume : 1);
        if (volume > 1) {
          warehouseOrders.delivery += count * ((volume - 1) * boxDeliveryLiter);
        }

        warehouseOrders.delivery += count * (1 - buyoutsPercent / 100) * 50;
        warehouseOrders.delivery *= ktr ?? 1;
        // if (art == "ПР_160_ФИОЛЕТОВЫЙ_ОТК")
        //   console.log(new Date(), 
        //     count,
        //     volume,
        //     count * tariffs[warehouseName].boxDeliveryBase,
        //     count * ((volume - 1) * tariffs[warehouseName].boxDeliveryLiter),
        //     count * (1 - buyoutsPercent / 100) * 50
        //   );

        // if (art == "ПР_160_ФИОЛЕТОВЫЙ_ОТК")
        //   console.log(new Date(), 
        //     art,
        //     jsonData[art],
        //     sum,
        //     count,
        //     warehouseOrders,
        //     warehouseName,
        //     buyoutsPercent,
        //     tariffs[warehouseName]
        //   );

        jsonData[art].delivery += warehouseOrders.delivery;
        jsonData[art].orders += warehouseOrders.orders;
        jsonData[art].sum_orders += warehouseOrders.sum_orders;
        jsonData[art].avg =
          getRoundValue(jsonData[art].delivery, jsonData[art].orders, true) / 100;

        // jsonData[art].orders += warehouseOrders.orders;
        // jsonData[art].delivery +=
        // if (art == 'КПБ_1.5_СТРАЙП_14-4102_ОТК')
        // console.log(new Date(), warehouseName, tariffs[warehouseName], art, warehouseOrders, jsonData[art], yesterdayStr);
      }
    }
  }

  afs.writeFileSync(
    path.join(__dirname, "files", campaign, "logistics.json"),
    JSON.stringify(jsonData)
  );
};

const calcNomenclaturesAndWriteToJsonMM = (uid, campaignName) => {
  const arts = readIfExists(
    path.join(__dirname, "marketMaster", uid, campaignName, "arts.json")
  );
  const warehousesDataPath = path.join(
    __dirname,
    "marketMaster",
    uid,
    campaignName,
    "warehouseNames.json"
  );
  const warehousesData = readIfExists(warehousesDataPath);

  const tags = readIfExists(path.join(
    __dirname,
    "marketMaster",
    uid,
    campaignName,
    "tags.json"
  ));

  const nomenclaturesPath = path.join(
    __dirname,
    "marketMaster",
    uid,
    campaignName,
    "nomenclatures.json"
  );
  // const nomenclatures = readIfExists(nomenclaturesPath);
  const nomenclatures = {};

  const artsDataUploaded = readIfExists(path.join(
    __dirname,
    "marketMaster",
    uid,
    campaignName,
    "artsDataUploaded.json"
  ))

  const artsPrices = artsDataUploaded;

  for (const [art, artData] of Object.entries(arts.byArt)) {
    if (!(art in nomenclatures)) nomenclatures[art] = { byWarehouses: {} };
    for (const [warehouseName, _] of Object.entries(warehousesData)) {
      if (!(warehouseName in nomenclatures[art].byWarehouses))
        nomenclatures[art].byWarehouses[warehouseName] = { prefObor: 0 };
    }
    nomenclatures[art].factoryArt = artsPrices[art]
      ? artsPrices[art].factoryArt
      : undefined;
    nomenclatures[art].multiplicity = artsPrices[art]
      ? artsPrices[art].multiplicity
      : undefined;
    nomenclatures[art].prices = artsPrices[art]
      ? artsPrices[art].prices
      : undefined;

    // if (nomenclatures[art].art) continue;


    nomenclatures[art].art = artData.brand_art;
    nomenclatures[art].photos = artData.photos;
    nomenclatures[art].size = artData.size;
    nomenclatures[art].brand = artData.brand;
    nomenclatures[art].title = artData.title;
    nomenclatures[art].object = artData.object;
    nomenclatures[art].imtId = artData.imtId;
    nomenclatures[art].nmId = artData.nmId;
    nomenclatures[art].barcode = artData.barcode;
    nomenclatures[art].tags = tags[artData.nmId] ?? [];
  }

  afs.writeFileSync(nomenclaturesPath, JSON.stringify(nomenclatures));

  return nomenclatures;
};

const calcPricesJsonDataMM = (uid, campaignName) => {
  const arts = readIfExists(
    path.join(__dirname, "marketMaster", uid, campaignName, "arts.json")

  );
  const uploadedpricesTemplatePath = path.join(
    __dirname,
    "marketMaster",
    uid,
    campaignName,
    `Информация о товарах ${campaignName}.xlsx`
  );
  let sheetData = [];
  if (afs.existsSync(uploadedpricesTemplatePath))
    sheetData = xlsx.parse(uploadedpricesTemplatePath)[0].data;

  const jsonData = {};
  // console.log(sheetData);
  for (let i = 1; i < sheetData.length; i++) {
    const row = sheetData[i];
    if (!row) continue;
    if (!row[0] || row[0] == "") continue;
    const barcode = row[sheetData[0].findIndex(val => val == "Баркод")];
    const { art } = arts.bySku[barcode] ?? {};
    if (!art) continue;
    const factoryArt = row[sheetData[0].findIndex(val => val == "Артикул фабрики")];
    const multiplicity = row[sheetData[0].findIndex(val => val == "Кратность короба, шт.")];
    const length = row[sheetData[0].findIndex(val => val == "Длина, см.")];
    const width = row[sheetData[0].findIndex(val => val == "Ширина, см.")];
    const height = row[sheetData[0].findIndex(val => val == "Высота, см.")];
    const weight = row[sheetData[0].findIndex(val => val == "Вес, кг.")];
    const ktr = row[sheetData[0].findIndex(val => val == "КТР WB, %")];
    const commision = row[sheetData[0].findIndex(val => val == "Комисcия WB, %")];
    const tax = row[sheetData[0].findIndex(val => val == "Ставка налога, %")];
    const expences = row[sheetData[0].findIndex(val => val == "Дополнительные расходы, %")];
    const prices = {};
    for (let j = sheetData[0].findIndex(val => val == "Себестоимость 1"); j < row.length; j++) {
      const priceName = sheetData[0][j];
      if (!priceName || priceName == "") continue;
      const price = Number(row[j]);
      prices[priceName] = price;
    }
    jsonData[art] = {
      art,
      factoryArt,
      multiplicity,
      length,
      width,
      ktr,
      height,
      weight,
      commision,
      tax,
      expences,
      prices,
    };
  }

  afs.writeFileSync(
    path.join(__dirname, "marketMaster", uid, campaignName, "artsDataUploaded.json"),
    JSON.stringify(jsonData)
  );

  return jsonData;
};

const changeUploadedArtsDataForKeyMM = async (uid, campaignName, data) => {
  const arts = readIfExists(
    path.join(__dirname, "marketMaster", uid, campaignName, "arts.json")
  )
  const artsDataUploaded = readIfExists(
    path.join(__dirname, "marketMaster", uid, campaignName, "artsDataUploaded.json")
  )

  console.log(new Date(), uid, campaignName, data);

  const { barcodes, enteredValue } = data ?? {};
  if (barcodes === undefined || enteredValue === undefined) return;

  const { key, val, type } = enteredValue;
  if (key === undefined || val === undefined || type === undefined) return;

  for (const barcode of barcodes) {
    const artData = arts.bySku[barcode];
    const { art } = artData ?? {}
    if (!art) continue;

    console.log(art, key, val, type);

    if (!artsDataUploaded[art]) artsDataUploaded[art] = {}

    if (key.includes('primeCost')) {
      if (!artsDataUploaded[art]['prices']) artsDataUploaded[art]['prices'] = {}
      artsDataUploaded[art]['prices'][`Себестоимость ${key.slice(-1)}`] = Number(
        val.replace("%", "").replace(",", ".")
      )
    } else {
      if (type == 'number') {
        artsDataUploaded[art][key] = Number(
          val.replace("%", "").replace(",", ".")
        )
      }
      else {
        artsDataUploaded[art][key] = val;
      }
    }
    // console.log(artsDataUploaded[art][key]);
  }


  afs.writeFileSync(
    path.join(__dirname, "marketMaster", uid, campaignName, "artsDataUploaded.json"),
    JSON.stringify(artsDataUploaded)
  );

  // await calcPricesTemplateAndWriteToXlsxMM(uid, campaignName, artsDataUploaded);

}

const calcPricesTemplateAndWriteToXlsxMM = (uid, campaignName, dataUploaded = undefined) => {
  return new Promise((resolve, reject) => {
    console.log(new Date(), uid, campaignName, "generating prices template.xlsx");
    const arts = readIfExists(
      path.join(__dirname, "marketMaster", uid, campaignName, "arts.json")
    )
    const artsDataUploaded = dataUploaded ?? readIfExists(
      path.join(__dirname, "marketMaster", uid, campaignName, "artsDataUploaded.json")
    )


    let sheetData = [];
    for (const [barcode, artData] of Object.entries(arts.bySku)) {
      if (!barcode || !artData) continue;
      const { art } = artData;
      const { factoryArt,
        multiplicity,
        length,
        width,
        height,
        weight,
        commision,
        ktr,
        tax,
        expences,
        prices } = artsDataUploaded[art] ?? {};

      const primeCost1 = prices ? prices['Себестоимость 1'] : undefined;
      const primeCost2 = prices ? prices['Себестоимость 2'] : undefined;
      const primeCost3 = prices ? prices['Себестоимость 3'] : undefined;

      const row = [
        art,
        barcode,
        factoryArt,
        multiplicity,
        length,
        width,
        height,
        weight,
        ktr,
        commision,
        tax,
        expences,
        primeCost1,
        primeCost2,
        primeCost3
      ];
      sheetData.push(row);
    }

    sheetData.sort((a, b) => {
      return String(a[0]).localeCompare(b[0]);
    })

    sheetData = [[
      "Артикул WB",
      "Баркод",
      "Артикул фабрики",
      "Кратность короба, шт.",
      "Длина, см.",
      "Ширина, см.",
      "Высота, см.",
      "Вес, кг.",
      "КТР WB, %",
      "Комисcия WB, %",
      "Ставка налога, %",
      "Дополнительные расходы, %",
      "Себестоимость 1",
      "Себестоимость 2",
      "Себестоимость 3",
    ]].concat(sheetData)

    afs.writeFileSync(
      path.join(
        __dirname,
        "marketMaster",
        uid,
        campaignName,
        `Информация о товарах ${campaignName} download template.xlsx`
      ),
      xlsx.build([{ name: "Лист 1", data: sheetData }])
    );

    resolve();
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
  const nomenclatures = JSON.parse(
    afs.readFileSync(
      path.join(
        __dirname,
        "marketMaster",
        uid,
        campaignName,
        "nomenclatures.json"
      )
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
  const warehousesDataPath = path.join(
    __dirname,
    "marketMaster",
    uid,
    campaignName,
    "warehouseNames.json"
  );
  const warehousesData = readIfExists(warehousesDataPath);
  for (const [warehouseName, _] of Object.entries(avgOrdersByWarehouse)) {
    jsonData.warehouseNames.push(warehouseName);
    if (warehousesData[warehouseName]) continue;
    else warehousesData[warehouseName] = {};
  }
  afs.writeFileSync(warehousesDataPath, JSON.stringify(warehousesData));

  // console.log(new Date(), avgOrdersByWarehouse);

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
      // console.log(new Date(), 
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
      const prefObor = nomenclatures[art]
        ? nomenclatures[art].byWarehouses[warehouse]
          ? nomenclatures[art].byWarehouses[warehouse].prefObor
          : 0
        : 0;
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
        prefObor: Math.round(prefObor),
        obor: Math.round(currentObor),
        stock: Math.round(currentStocks),
        inWayToWarehouse: 100,
        currentObor: Math.round(currentObor),
        price: 400,
      };

      jsonData[art].art = artData.brand_art;
      jsonData[art].brand = artData.brand;
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

const getAdvertsType = (advertId, advertsInfos) => {
  let advertType = "none";
  if (advertsInfos[advertId].type == 8) {
    //   const { carousel, recom, booster } =
    //     advertsInfos[advertId].autoParams.active ?? {};
    //   if (carousel + recom + booster > 1) return advertType;
    //   if (booster) advertType = "booster";
    //   else if (carousel) advertType = "carousel";
    advertType = "booster";
  } else if (advertsInfos[advertId].type == 6 || advertsInfos[advertId].type == 9) {
    advertType = "search";
  }
  return advertType;
};

const getPlacements = (uid, campaignName) => {
  try {
    const advertsInfos = readIfExists(
      path.join(
        __dirname,
        "marketMaster",
        uid,
        campaignName,
        "advertsInfos.json"
      )
    );

    const adverts = readIfExists(
      path.join(
        __dirname,
        "marketMaster",
        uid,
        campaignName,
        "adverts.json"
      )
    );

    const advertsSelectedPhrases = readIfExists(
      path.join(
        __dirname,
        "marketMaster",
        uid,
        campaignName,
        "advertsSelectedPhrases.json"
      ))


    const advertsWords = readIfExists(
      path.join(__dirname, "marketMaster", uid, campaignName, "advertsWords.json")
    );

    const arts = readIfExists(
      path.join(__dirname, "marketMaster", uid, campaignName, "arts.json")
    );
    arts.byBrandArt = {};
    for (const [nmId, artData] of Object.entries(arts.byNmId)) {
      artData.nmId = nmId;
      arts.byBrandArt[artData.art] = artData;
    }

    const placementsAuctions = {};
    const jsonData = {};
    const artsWithAdverts = {};
    for (const [advertId, advertInfos] of Object.entries(advertsInfos)) {
      if (!advertId || !advertInfos) continue;
      const type = advertInfos.type;
      const status = advertInfos.status;

      if (!adverts[advertId]) continue;

      if (![4, 9, 11].includes(status)) continue;

      let nms = [];
      let advertType = getAdvertsType(advertId, advertsInfos);
      if (type == 8) {
        nms = advertInfos.autoParams.nms ?? [];
      } else if (type == 9) {
        nms = advertInfos.unitedParams ? advertInfos.unitedParams[0].nms ?? [] : [];
      } else if (type == 6) {
        const temp = advertInfos.params ? advertInfos.params[0].nms : [];
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

        artsWithAdverts[art][advertId] = {
          advertId: advertId,
          advertsType: advertType
        };
      }
    }

    for (const [art, advertsDatas] of Object.entries(artsWithAdverts)) {
      const topPhrase = { phrase: "", count: 0 };

      if (!art || !advertsDatas) continue;
      for (const [id, advertsDatasCur] of Object.entries(advertsDatas)) {
        if (!id || !advertsDatasCur) continue;
        const { advertId, advertsType } = advertsDatasCur;
        if (!advertId) continue;

        if (advertsSelectedPhrases[advertId] && advertsSelectedPhrases[advertId].phrase) {
          topPhrase.count = 10;
          topPhrase.phrase = advertsSelectedPhrases[advertId].phrase;
          continue;
        }
        //   console.log(new Date(), art, advertsType, rules);

        const words = advertsWords[advertId];
        if (!words) continue;
        if (advertsType == "search") {
          const { keywords, pluse } = words.words ?? {};
          if (!keywords || !keywords.length) continue;

          if (pluse) {
            for (let j = 0; j < pluse.length; j++) {
              const keyword = pluse[j];
              const { stat } = advertsWords[advertId];
              if (!stat[keyword]) continue;
              const { views } = stat[keyword] ?? {};
              // console.log(new Date(), stat[keyword], keyword);
              keywords.push({
                keyword: keyword,
                count: views,
              });
            }
          }

          keywords.sort((a, b) => b.count - a.count);

          const top = keywords[0];
          // console.log(new Date(), art, advertsType, top);

          if (!topPhrase.count || topPhrase.count < top.count) {
            topPhrase.phrase = top.keyword;
            topPhrase.count = top.count;
            //   console.log(new Date(), art, advertsType, topPhrase);
          }
        } else {
          const { clusters } = words ?? {};
          if (!clusters || !clusters.length) continue;

          const top = clusters[0];

          if (!topPhrase.count || topPhrase.count < top.count) {
            topPhrase.phrase = top.cluster;
            topPhrase.count = top.count;
            //   console.log(new Date(), art, advertsType, topPhrase);

          }
        }
      }

      const phrasePlacementsPath = path.join(
        __dirname,
        "placementsByPhrases",
        `${topPhrase.phrase.replace(/\s/g, "_")}.json`
      );
      const phrasePlacements = readIfExists(phrasePlacementsPath);
      const { updateTime, data, firstAdvertIndex, cpms } = phrasePlacements;

      placementsAuctions[topPhrase.phrase] = cpms;

      const { nmId } = arts.byBrandArt[art] ?? {};
      if (!nmId) continue;

      const phrasePlacementsData = data ? data[nmId] : undefined;
      if (!phrasePlacementsData)
        jsonData[art] = { cpmIndex: -1, index: -1, updateTime, phrase: topPhrase.phrase, firstAdvertIndex };
      else {
        phrasePlacementsData.updateTime = updateTime;
        phrasePlacementsData.firstAdvertIndex = firstAdvertIndex;
        phrasePlacementsData.phrase = topPhrase.phrase;
        jsonData[art] = phrasePlacementsData;
      }
    }

    afs.writeFileSync(
      path.join(__dirname, "marketMaster", uid, campaignName, "placementsAuctions.json"),
      JSON.stringify(placementsAuctions)
    );
    afs.writeFileSync(
      path.join(__dirname, "marketMaster", uid, campaignName, "placements.json"),
      JSON.stringify(jsonData)
    );
  } catch (e) {
    console.log(new Date(), e);
    return;
  }


};

const calcMassAdvertsNewAndWriteToJsonMM = (
  uid,
  campaignName,
  dateRange = { to: "", from: "" }
) => {
  const arts = readIfExists(
    path.join(__dirname, "marketMaster", uid, campaignName, "arts.json")
  );

  const adverts = readIfExists(
    path.join(__dirname, "marketMaster", uid, campaignName, "adverts.json")
  );
  const advertsStocksThreshold = readIfExists(
    path.join(
      __dirname,
      "marketMaster",
      uid,
      campaignName,
      "advertsStocksThreshold.json"
    )
  );

  const advertsSelectedPhrasesPath = path.join(
    __dirname,
    "marketMaster",
    uid,
    campaignName,
    "advertsSelectedPhrases.json"
  );
  const advertsSelectedPhrases = readIfExists(advertsSelectedPhrasesPath);

  const advertsAutoBidsRules = readIfExists(
    path.join(
      __dirname,
      "marketMaster",
      uid,
      campaignName,
      "advertsAutoBidsRules.json"
    )
  );


  const tags = readIfExists(
    path.join(
      __dirname,
      "marketMaster",
      uid,
      campaignName,
      "tags.json"
    )
  );

  const nmFullDetailReport = readIfExists(
    path.join(
      __dirname,
      "marketMaster",
      uid,
      campaignName,
      "nmFullDetailReport.json"
    )
  );

  const advertsInfos = readIfExists(
    path.join(__dirname, "marketMaster", uid, campaignName, "advertsInfos.json")
  );

  const advertsStatsByArt = readIfExists(
    path.join(
      __dirname,
      "marketMaster",
      uid,
      campaignName,
      "advertsStatsByArt.json"
    )
  );
  const stocks = readIfExists(
    path.join(__dirname, "marketMaster", uid, campaignName, "stocks.json")
  );

  const placements = readIfExists(
    path.join(__dirname, "marketMaster", uid, campaignName, "placements.json")
  );

  arts.byBrandArt = {};
  for (const [nmId, artData] of Object.entries(arts.byNmId)) {
    arts.byBrandArt[artData.art] = artData;
  }

  // const advertsStatsByArt = {};
  for (const [art, datesData] of Object.entries(advertsStatsByArt)) {
    for (const [date, stats] of Object.entries(datesData)) {
      advertsStatsByArt[art][date].orders = 0;
      advertsStatsByArt[art][date].sum_orders = 0;
      advertsStatsByArt[art][date].sales = 0;
      advertsStatsByArt[art][date].sum_sales = 0;
    }
  }

  ////// orders
  if (nmFullDetailReport) {
    for (const [nmId, nmIdData] of Object.entries(nmFullDetailReport)) {
      if (nmIdData === undefined) continue;
      const stats = nmIdData ? nmIdData.statistics : undefined;
      if (stats === undefined) continue;
      for (const [date, artOrdersData] of Object.entries(stats)) {
        if (!arts.byNmId[nmId]) continue;
        const art = arts.byNmId[nmId].art;
        if (!advertsStatsByArt[art]) advertsStatsByArt[art] = {};

        if (!advertsStatsByArt[art][date]) {
          advertsStatsByArt[art][date] = {
            orders: 0,
            sum_orders: 0,
            sum: 0,
            views: 0,
            clicks: 0,
            sales: 0,
            sum_sales: 0,
          };
        }

        advertsStatsByArt[art][date].orders += artOrdersData.ordersCount;
        advertsStatsByArt[art][date].sum_orders += artOrdersData.ordersSumRub;
        advertsStatsByArt[art][date].sales += artOrdersData.buyoutsCount;
        advertsStatsByArt[art][date].sum_sales += artOrdersData.buyoutsSumRub;

      }
    }
  }


  // console.log(new Date(), advertsStatsByArt);

  const artsWithAdverts = {};
  for (const [advertId, advertInfos] of Object.entries(advertsInfos)) {
    if (!advertId || !advertInfos) continue;
    const type = advertInfos.type;
    const status = advertInfos.status;

    if (!adverts[advertId]) continue;

    if (![4, 9, 11].includes(status)) continue;

    let nms = [];
    let advertType = getAdvertsType(advertId, advertsInfos);
    if (type == 8) {
      nms = advertInfos.autoParams.nms ?? [];
    } else if (type == 9) {
      nms = advertInfos.unitedParams ? advertInfos.unitedParams[0].nms ?? [] : [];
    } else if (type == 6) {
      const temp = advertInfos.params ? advertInfos.params[0].nms : [];
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

      artsWithAdverts[art][advertId] = {
        advertId: advertId,
      };
    }
  }

  const dateFrom = new Date(dateRange.from);
  dateFrom.setDate(dateFrom.getDate() - 30);
  dateFrom.setHours(0, 0, 0, 0);
  const dateTo = new Date(dateRange.to);
  dateTo.setHours(0, 0, 0, 0);

  const today = new Date();
  const yesterday = new Date(today);
  yesterday.setDate(today.getDate() - 1);
  const todayStr = getLocaleDateString(today).slice(0, 10);
  const yesterdayStr = getLocaleDateString(yesterday).slice(0, 10);

  const jsonData = {};
  for (const [nmId, artData] of Object.entries(arts.byNmId)) {
    const art = artData.art;
    if (!(art in jsonData)) jsonData[art] = {};

    const tags_art = tags[nmId] ?? [];

    jsonData[art].art = art;
    jsonData[art].object = artData.object;
    jsonData[art].photos = artData.photos;
    jsonData[art].imtId = artData.imtId;
    jsonData[art].nmId = parseInt(nmId);
    jsonData[art].title = artData.title;
    jsonData[art].tags = tags_art;
    jsonData[art].size = artData.size;
    jsonData[art].adverts = artsWithAdverts[art];
    jsonData[art].advertsStats = advertsStatsByArt[art];
    jsonData[art].stocks = 0;
    jsonData[art].brand = artData.brand;
    jsonData[art].drrAI = advertsAutoBidsRules[art];
    jsonData[art].advertsStocksThreshold = advertsStocksThreshold[art];
    jsonData[art].placements = placements[art];
    jsonData[art].advertsSelectedPhrases = advertsSelectedPhrases[art];
    jsonData[art].nmFullDetailReport = nmFullDetailReport[nmId];


    const sizes = artData.sizes;
    for (let i = 0; i < sizes.length; i++) {
      const sku = sizes[i].skus[0];
      const local_art = arts.bySku[sku].art;
      if (stocks[todayStr]) {
        jsonData[art].stocks += stocks[todayStr].all[local_art]
          ? stocks[todayStr].all[local_art].quantity
          : 0;
      } else if (stocks[yesterdayStr]) {
        jsonData[art].stocks += stocks[yesterdayStr].all[local_art]
          ? stocks[yesterdayStr].all[local_art].quantity
          : 0;
      }
    }
  }

  afs.writeFileSync(
    path.join(__dirname, "marketMaster", uid, campaignName, "massAdverts.json"),
    JSON.stringify(jsonData)
  );

  return jsonData;
};

const updateAdvertsManagerRulesMM = (uid, campaignName, data) => {
  return new Promise((resolve, reject) => {
    const advertsManagerRulesPath = path.join(
      __dirname,
      "marketMaster",
      uid,
      campaignName,
      "advertsManagerRules.json"
    );
    const advertsManagerRules = readIfExists(advertsManagerRulesPath);

    // console.log(new Date(), uid, campaignName, data);

    if (data.arts)
      for (const [art, artData] of Object.entries(data.arts)) {
        if (!art || !artData) continue;
        if (!advertsManagerRules[art]) advertsManagerRules[art] = {};
        for (const [advertsType, value] of Object.entries(artData)) {
          if (!advertsManagerRules[art][advertsType])
            advertsManagerRules[art][advertsType] = {};

          advertsManagerRules[art][advertsType].mode = value;
          advertsManagerRules[art][advertsType].updateTime =
            new Date().toISOString();
          advertsManagerRules[art][advertsType].advertId = undefined;
          advertsManagerRules[art][advertsType].turnedOffByStocks = undefined;
        }
      }

    afs.writeFileSync(
      advertsManagerRulesPath,
      JSON.stringify(advertsManagerRules)
    );

    resolve();
  });
};

const updateAdvertsSelectedPhrasesMM = (uid, campaignName, data) => {
  return new Promise((resolve, reject) => {
    const advertsSelectedPhrasesPath = path.join(
      __dirname,
      "marketMaster",
      uid,
      campaignName,
      "advertsSelectedPhrases.json"
    );
    const advertsSelectedPhrases = readIfExists(advertsSelectedPhrasesPath);

    console.log(new Date(), uid, campaignName, data);

    const { mode } = data;

    if (data.advertsIds)
      for (const [advertId, advertData] of Object.entries(data.advertsIds)) {
        if (!advertId || !advertData) continue;
        if (mode == 'Установить') {
          if (!advertsSelectedPhrases[advertId]) advertsSelectedPhrases[advertId] = {};
          advertsSelectedPhrases[advertId] = advertData;
          advertsSelectedPhrases[advertId].updateTime =
            new Date().toISOString();
        }
        else if (mode == 'Удалить') {
          advertsSelectedPhrases[advertId] = undefined;
        }
      }

    afs.writeFileSync(
      advertsSelectedPhrasesPath,
      JSON.stringify(advertsSelectedPhrases)
    );

    resolve();
  });
};

const saveNoteMM = (uid, campaignName, data) => {
  return new Promise((resolve, reject) => {
    const notesPath = path.join(
      __dirname,
      "marketMaster",
      uid,
      campaignName,
      "notes.json"
    );
    const notes = readIfExists(notesPath);

    console.log(new Date(), uid, campaignName, data);

    const { note, tags } = data;
    if (note === undefined) {
      resolve();
      return;
    }

    const date = new Date();
    const strFullDate = getLocaleDateString(date);
    const strDate = strFullDate.slice(0, 10);
    if (!notes[strDate]) notes[strDate] = { all: [] };
    notes[strDate].all.push({ note: note, tags: tags, time: date.toISOString() });

    afs.writeFileSync(
      notesPath,
      JSON.stringify(notes)
    );

    resolve();
  });
};

const setTagsMM = (uid, campaignName, data) => {
  return new Promise((resolve, reject) => {
    const tagsPath = path.join(
      __dirname,
      "marketMaster",
      uid,
      campaignName,
      "tags.json"
    );
    const tags = readIfExists(tagsPath);

    console.log(new Date(), uid, campaignName, data);

    const { mode, tag, nmIds } = data;
    if (mode === undefined || tag === undefined || nmIds === undefined) {
      resolve();
      return;
    }

    for (const nmId of nmIds) {
      if (!tags[nmId]) tags[nmId] = []

      if (mode == 'Установить') {
        if (!tags[nmId].includes(tag))
          tags[nmId].push(tag)
      }
      else if (mode == 'Удалить') {
        tags[nmId] = tags[nmId].filter((val) => val != tag);
      }
    }

    afs.writeFileSync(
      tagsPath,
      JSON.stringify(tags)
    );

    resolve();
  });
};

const getAllTags = (uid, campaignName) => {
  return new Promise((resolve, reject) => {

    const tags = readIfExists(path.join(
      __dirname,
      "marketMaster",
      uid,
      campaignName,
      "tags.json"
    ));

    const jsonData = { tags: [] }
    for (const [nmId, nmIdTags] of Object.entries(tags)) {
      if (!nmId || !nmIdTags) continue;
      for (const tag of nmIdTags) {
        if (jsonData.tags.includes(tag)) continue;

        jsonData.tags.push(tag);

      }
    }
    // console.log(jsonData);

    resolve(jsonData);
  })
}

const setAdvertsSchedulesAndWriteToJsonMM = (uid, campaignName, data) => {
  return new Promise((resolve, reject) => {
    const advertsSchedulesPath = path.join(
      __dirname,
      "marketMaster",
      uid,
      campaignName,
      "advertsSchedules.json"
    );
    const advertsSchedules = readIfExists(advertsSchedulesPath);

    console.log(new Date(), uid, campaignName, data);

    const { schedule, mode } = data;

    if (data.advertsIds)
      for (const [advertId, advertData] of Object.entries(data.advertsIds)) {
        if (!advertId || !advertData) continue;
        if (mode == 'Установить') {
          if (!advertsSchedules[advertId]) advertsSchedules[advertId] = {};
          advertsSchedules[advertId].schedule = schedule;
          advertsSchedules[advertId].updateTime =
            new Date().toISOString();

          console.log(new Date(), uid, campaignName, advertId, 'set schedule.');
        }
        else if (mode == 'Удалить') {
          advertsSchedules[advertId] = undefined;
          console.log(new Date(), uid, campaignName, advertId, 'delete schedule.');
        }
      }


    afs.writeFileSync(
      advertsSchedulesPath,
      JSON.stringify(advertsSchedules)
    )

    resolve();
  })
};

const fixArtPricesAndWriteToJsonMM = (uid, campaignName, data) => {
  return new Promise((resolve, reject) => {
    const fixArtPricesPath = path.join(
      __dirname,
      "marketMaster",
      uid,
      campaignName,
      "fixArtPrices.json"
    );
    const fixArtPrices = readIfExists(fixArtPricesPath);

    console.log(new Date(), uid, campaignName, data);

    const { nmIds } = data;

    if (nmIds)
      for (const [_, nmIdData] of Object.entries(nmIds)) {
        const { nmId, enteredValue } = nmIdData ?? {};
        if (nmId === undefined) continue;
        if (enteredValue !== undefined) {
          if (!fixArtPrices[nmId]) fixArtPrices[nmId] = {};
          fixArtPrices[nmId].enteredValue = enteredValue;
          fixArtPrices[nmId].updateTime =
            new Date().toISOString();

          console.log(new Date(), uid, campaignName, nmId, 'fixed prices', enteredValue);
        }
        else {
          if (!fixArtPrices[nmId]) continue;
          delete fixArtPrices[nmId];
          console.log(new Date(), uid, campaignName, nmId, 'delete fixed prices');
        }
      }


    afs.writeFileSync(
      fixArtPricesPath,
      JSON.stringify(fixArtPrices)
    )

    resolve();
  })
};

const autoSetFixArtPricesMM = (uid, campaignName) => {
  return new Promise(async (resolve, reject) => {

    const fixArtPricesPath = path.join(
      __dirname,
      "marketMaster",
      uid,
      campaignName,
      "fixArtPrices.json"
    );
    const fixArtPrices = readIfExists(fixArtPricesPath);

    const arts = readIfExists(
      path.join(
        __dirname,
        "marketMaster",
        uid,
        campaignName,
        "arts.json"
      )
    );
    const stocks = readIfExists(
      path.join(
        __dirname,
        "marketMaster",
        uid,
        campaignName,
        "stocks.json"
      )
    )

    const sppPricesParsed = readIfExists(
      path.join(
        __dirname,
        'marketMaster',
        uid,
        campaignName,
        'sppPricesParsed.json'
      )
    );


    const strTodayDate = getLocaleDateString(new Date()).slice(0, 10)

    const iterList = [];
    for (const [art, artData] of Object.entries(arts.byArt)) {
      iterList.push({ art, artData });
    }
    iterList.sort((a, b) => {
      const artA = a.art;
      const stockA = stocks[strTodayDate] ? stocks[strTodayDate].all[artA] ? stocks[strTodayDate].all[artA].quantity ?? 0 : 0 : 0;

      const artB = b.art;
      const stockB = stocks[strTodayDate] ? stocks[strTodayDate].all[artB] ? stocks[strTodayDate].all[artB].quantity ?? 0 : 0 : 0;

      return stockB - stockA;
    })

    const sppJsonToHelp = {}
    const sppData = {}
    for (let iter = 0; iter < iterList.length; iter++) {
      const { art, artData } = iterList[iter]
      if (art === undefined || artData === undefined) continue;


      const { nmId, size, object } = artData;

      let spp = sppPricesParsed.arts[nmId] ?
        sppPricesParsed.arts[nmId].sizes[size] ?
          sppPricesParsed.arts[nmId].sizes[size].spp
          : undefined : undefined;

      if (spp) {
        if (!sppJsonToHelp[object]) sppJsonToHelp[object] = {}
        if (!sppJsonToHelp[object][spp]) sppJsonToHelp[object][spp] = 0
        sppJsonToHelp[object][spp]++;
      }
      else {
        const findSpp = () => {
          let res = { spp: 0, count: 0 };
          if (!sppJsonToHelp[object]) return 0;
          for (let [spp, count] of Object.entries(sppJsonToHelp[object])) {
            spp = Math.round(Number(spp))
            if (count > res.count) res = { spp, count }
          }
          return res.spp;
        }
        spp = findSpp();
      }

      sppData[nmId] = spp;
    }

    const artsDataUploaded = readIfExists(
      path.join(
        __dirname,
        'marketMaster',
        uid,
        campaignName,
        'artsDataUploaded.json'
      )
    );

    const getSomeArt = (nmId) => {
      const sizes = arts.byNmId[nmId].sizes;
      for (let i = 0; i < sizes.length; i++) {
        const sku = sizes[i].skus[0];
        return arts.bySku[sku];
      }
    }

    const byNmId = {}
    const paramsToUpdate = {
      data: [],
    }

    for (const [id, nmIdData] of Object.entries(fixArtPrices)) {
      if (id === undefined || nmIdData === undefined) continue;
      const { enteredValue } = nmIdData;
      const { nmId } = arts.byNmId[id] ?? {};
      if (nmId === undefined || enteredValue === undefined) continue;

      const { discount } = enteredValue;

      const { art, object, brand } = getSomeArt(nmId);
      // console.log(art, artsDataUploaded[art]);

      const { prices } = artsDataUploaded[art] ?? {};
      const primeCost = prices['Себестоимость 1'] ?? {};
      if (primeCost === undefined) continue;

      const spp = sppData[nmId];

      let rozPrice = undefined;
      let sppPrice = undefined;

      if (enteredValue['primeCostMarkup'] && primeCost) {
        rozPrice = primeCost * (1 + enteredValue['primeCostMarkup'] / 100);
      }
      else if (enteredValue['rozPrice']) {
        rozPrice = enteredValue['rozPrice'];
      }
      else if (enteredValue['sppPrice'] && spp) {
        sppPrice = enteredValue['sppPrice'];
        rozPrice = sppPrice / (1 - spp / 100);
      }
      else if (enteredValue['profit'] !== undefined || enteredValue['rentabelnost'] !== undefined) {
        try {
          const date = new Date();
          const yesterday = new Date(date);
          yesterday.setDate(yesterday.getDate() - 1);
          const weekAgo = new Date(date);
          weekAgo.setDate(yesterday.getDate() - 6);
          const params = {
            ...enteredValue, filters: {
              arts: [art],
              brands: [brand],
              objects: [object],
            }
          };
          console.log(params);
          const pr = await calcPricesMM(uid, campaignName, { lbd: weekAgo, rbd: yesterday },
            params
          );
          if (!pr) continue;
          rozPrice = pr[art] ? pr[art].rozPrice : undefined;

          delete pr;
        }
        catch (e) {
          console.log(e);
        }
      }

      const wbPrice = Math.round(rozPrice / (1 - discount / 100));
      // console.log(art, nmId, rozPrice, wbPrice, primeCost, spp);

      if (rozPrice && wbPrice && rozPrice > primeCost) {
        byNmId[nmId] = {
          nmID: nmId,
          price: wbPrice,
          discount: discount,
        }
      };
    }

    for (const [_, nmIdData] of Object.entries(byNmId)) {
      paramsToUpdate.data.push(nmIdData);
    }

    console.log(paramsToUpdate.data);

    updatePricesMM(uid, campaignName, paramsToUpdate).then(() => resolve()).catch((e) => { console.log(e); resolve() })
  })
};

const setPlanForKeyAndWriteToJsonMM = (uid, campaignName, data) => {
  return new Promise((resolve, reject) => {
    const plansForKeysPath = path.join(
      __dirname,
      "marketMaster",
      uid,
      campaignName,
      "plansForKeys.json"
    );
    const plansForKeys = readIfExists(plansForKeysPath);

    console.log(new Date(), uid, campaignName, data);

    const { plan, mode, entity, planKey } = data;
    if (plan === undefined || mode === undefined || entity === undefined || planKey === undefined) {
      resolve();
      return;
    }

    const { monthName, dayPlan } = plan;

    if (mode == 'Установить') {
      if (!plansForKeys[entity]) plansForKeys[entity] = {};
      if (!plansForKeys[entity][planKey]) plansForKeys[entity][planKey] = {};
      plansForKeys[entity][planKey][monthName] = { dayPlan };
      plansForKeys[entity][planKey].updateTime =
        new Date().toISOString();

      console.log(new Date(), uid, campaignName, entity, planKey, plan, 'set plan.');
    }
    else if (mode == 'Удалить') {
      if (plansForKeys[entity] && plansForKeys[entity][planKey])
        delete plansForKeys[entity][planKey];

      console.log(new Date(), uid, campaignName, entity, planKey, 'delete plan.');
    }


    afs.writeFileSync(
      plansForKeysPath,
      JSON.stringify(plansForKeys)
    )

    resolve();
  })
};

const autoManageAdvertsSchedule = (uid, campaignName) => {
  return new Promise(async (resolve, reject) => {
    const advertsSchedulesPath = path.join(
      __dirname,
      "marketMaster",
      uid,
      campaignName,
      "advertsSchedules.json"
    );
    const advertsSchedules = readIfExists(advertsSchedulesPath);
    const adverts = readIfExists(path.join(
      __dirname,
      "marketMaster",
      uid,
      campaignName,
      "adverts.json"
    ));

    const authToken = getAuthTokenMM(uid, campaignName);

    const dateTime = new Date();
    const defaultDayIndex = dateTime.getDay()
    const day = defaultDayIndex === 0 ? 6 : defaultDayIndex - 1;

    const hour = dateTime.getHours();

    for (const [advertId, advertData] of Object.entries(advertsSchedules)) {
      if (!adverts[advertId] || adverts[advertId].status == 7) continue;
      const { schedule } = advertData ?? {}
      if (schedule === undefined) continue;
      const shouldBeActive = schedule[day][hour].selected;
      const mode = shouldBeActive ? 'start' : 'pause';
      await changeAdvertActivity(authToken, mode, { id: adverts[advertId].advertId });
      console.log(new Date(), uid, campaignName, advertId, day, hour, mode);
      await new Promise((resolve) => setTimeout(resolve, 500));

    }
  })
}

const autoAdvertsStopMM = (uid, campaignName) => {
  return new Promise(async (resolve, reject) => {
    const advertsManagerRulesPath = path.join(
      __dirname,
      "marketMaster",
      uid,
      campaignName,
      "advertsManagerRules.json"
    );
    const advertsManagerRules = readIfExists(advertsManagerRulesPath);

    const campaignMassAdvertsData = calcMassAdvertsNewAndWriteToJsonMM(
      uid,
      campaignName
    );

    const jsonData = {};

    for (const [art, advertsTypes] of Object.entries(advertsManagerRules)) {
      if (!campaignMassAdvertsData[art]) continue;

      const { drrAI, advertsStocksThreshold } = campaignMassAdvertsData[art];
      if (!drrAI) continue;

      const { stocksThreshold } = advertsStocksThreshold ?? {};

      // if (art == "КПБ_1.5_СЛВДР_3392_ТКС")
      //   console.log(new Date(), campaignMassAdvertsData[art], advertsTypes);

      for (const [advertsType, rules] of Object.entries(advertsTypes)) {
        const { desiredDRR } = drrAI[advertsType] ?? {};
        if (!desiredDRR) continue;

        const { mode, updateTime, advertId, turnedOffByStocks } = rules;
        if (advertId && mode) {
          const advertData = campaignMassAdvertsData[art].adverts
            ? campaignMassAdvertsData[art].adverts[advertsType]
              ? campaignMassAdvertsData[art].adverts[advertsType][advertId] ??
              undefined
              : undefined
            : undefined;

          if (!advertData) continue;

          const { daysInWork } = advertData;
          if (daysInWork < 2) continue;

          const min_recalc = (daysInWork) => {
            const res = {
              cpo: 0,
              sum: 0,
              orders: 0,
              sum_orders: 0,
              views: 0,
              cpm: 0,
              cr: 0,
              drr: 0,
              clicks: 0,
            };

            for (let i = 0; i <= daysInWork; i++) {
              const date = new Date();
              date.setDate(date.getDate() - i);
              date.setHours(0, 0, 0, 0);
              const strDate = date
                .toLocaleDateString("ru-RU")
                .replace(/(\d{2})\.(\d{2})\.(\d{4})/, "$3-$2-$1")
                .slice(0, 10);

              const { sum, orders, clicks, views, sum_orders } =
                campaignMassAdvertsData[art].advertsStats
                  ? campaignMassAdvertsData[art].advertsStats[strDate]
                    ? campaignMassAdvertsData[art].advertsStats[strDate][
                      advertsType
                    ]
                      ? campaignMassAdvertsData[art].advertsStats[strDate][
                      advertsType
                      ]
                      : {
                        sum: 0,
                        orders: 0,
                        clicks: 0,
                        views: 0,
                        sum_orders: 0,
                      }
                    : { sum: 0, orders: 0, clicks: 0, views: 0, sum_orders: 0 }
                  : { sum: 0, orders: 0, clicks: 0, views: 0, sum_orders: 0 };

              if (
                campaignMassAdvertsData[art].advertsStats &&
                !campaignMassAdvertsData[art].advertsStats[strDate]
              )
                console.log(new Date(), uid, campaignName, art, strDate);

              res.orders += orders;
              res.sum_orders += sum_orders;
              res.sum += sum;
              res.views += views;
              res.clicks += clicks;
            }

            res.orders = Math.round(res.orders * 100) / 100;
            res.sum_orders = Math.round(res.sum_orders);
            res.sum = Math.round(res.sum);
            res.clicks = Math.round(res.clicks);
            res.views = Math.round(res.views);
            res.cpo = getRoundValue(res.sum, res.orders, false, res.sum);
            res.cpm = getRoundValue(res.sum * 1000, res.views);
            res.cr = getRoundValue(res.orders, res.views, true);
            res.drr = getRoundValue(res.sum, res.sum_orders, true, 1);

            // console.log(new Date(), uid, campaignName, advertsType, res);

            return res;
          };

          const { drr } = min_recalc(daysInWork);

          if (drr / desiredDRR - 1 > 0.5) {
            if (!jsonData[art]) jsonData[art] = {};
            if (!jsonData[art][advertsType]) jsonData[art][advertsType] = {};
            jsonData[art][advertsType].mode = false;
            jsonData[art][advertsType].updateTime = new Date().toISOString();
            jsonData[art][advertsType].advertId = undefined;
            jsonData[art][advertsType].turnedOffByStocks = undefined;
            jsonData[art][advertsType].turnedOffByDrr = true;
            continue;
          }
        } else if (turnedOffByStocks) {
          if (campaignMassAdvertsData[art].stocks > stocksThreshold) {
            if (!jsonData[art]) jsonData[art] = {};
            if (!jsonData[art][advertsType]) jsonData[art][advertsType] = {};
            jsonData[art][advertsType].mode = true;
            jsonData[art][advertsType].updateTime = new Date().toISOString();
            jsonData[art][advertsType].advertId = undefined;
            jsonData[art][advertsType].turnedOffByStocks = undefined;
            continue;
          }
        }
        if (campaignMassAdvertsData[art].stocks <= stocksThreshold) {
          if (!jsonData[art]) jsonData[art] = {};
          if (!jsonData[art][advertsType]) jsonData[art][advertsType] = {};
          jsonData[art][advertsType].mode = false;
          jsonData[art][advertsType].updateTime = new Date().toISOString();
          jsonData[art][advertsType].advertId = undefined;
          jsonData[art][advertsType].turnedOffByStocks = true;
          jsonData[art][advertsType].turnedOffByDrr = undefined;
          continue;
        }
      }
    }

    const advertsManagerRulesCurrent = readIfExists(advertsManagerRulesPath);
    for (const [art, advertsTypes] of Object.entries(jsonData)) {
      for (const [advertsType, rules] of Object.entries(advertsTypes)) {
        advertsManagerRulesCurrent[art][advertsType] = rules;
      }
    }

    afs.writeFileSync(
      advertsManagerRulesPath,
      JSON.stringify(advertsManagerRulesCurrent)
    );
    resolve();
    // console.log(new Date(), advertsManagerRules);
  });
};

const depositAndStart = async (uid, campaignName, advertsIdsArray) => {
  const balance = await fetchBalanceWithRetry(uid, campaignName);
  const advertsBudgetsPath = path.join(
    __dirname,
    "marketMaster",
    uid,
    campaignName,
    "advertsBudgets.json"
  );
  const advertsBudgets = readIfExists(advertsBudgetsPath);
  const authToken = getAuthTokenMM(uid, campaignName);

  return new Promise(async (resolve) => {
    if (!advertsIdsArray || advertsIdsArray.length == 0) {
      resolve();
      return;
    }

    await new Promise((resolve) => setTimeout(resolve, 5 * 60 * 1000));
    for (let i = 0; i < advertsIdsArray.length; i++) {
      const advertId = parseInt(advertsIdsArray[i]);

      const budget = 1000;

      let payType = 0;
      if (balance.net && balance.net >= budget) payType = 1;
      if (balance.bonus && balance.bonus >= budget) payType = 3;

      const depositParams = {
        sum: budget,
        type: payType,
        return: true,
      };

      console.log(new Date(), uid, campaignName, advertId, depositParams);

      if (payType == 3) {
        balance.bonus -= budget;
      } else if (payType == 0) {
        balance.balance -= budget;
      } else {
        balance.net -= budget;
      }

      const newBudget = await depositAdvertBudget(
        authToken,
        advertId,
        depositParams
      );
      if (newBudget) {
        advertsBudgets[advertId] = newBudget.total ?? 0;
        console.log(new Date(), uid, campaignName, "deposit", budget, "to", advertId);
      }
      await new Promise((resolve) => setTimeout(resolve, 1.5 * 1000));
    }
    await new Promise((resolve) => setTimeout(resolve, 7 * 60 * 1000));
    for (let i = 0; i < advertsIdsArray.length; i++) {
      const advertId = parseInt(advertsIdsArray[i]);
      await changeAdvertActivity(authToken, "start", { id: advertId });
      console.log(new Date(), uid, campaignName, "started", advertId);
      await new Promise((resolve) => setTimeout(resolve, 500));
    }

    afs.writeFileSync(advertsBudgetsPath, JSON.stringify(advertsBudgets));

    resolve();
  });
};

const autoAdvertsManagingMM = (uid, campaignName) => {
  return new Promise(async (resolve, reject) => {
    const authToken = getAuthTokenMM(uid, campaignName);

    const advertsManagerRulesPath = path.join(
      __dirname,
      "marketMaster",
      uid,
      campaignName,
      "advertsManagerRules.json"
    );
    const advertsManagerRules = readIfExists(advertsManagerRulesPath);

    const advertsInfosPath = path.join(
      __dirname,
      "marketMaster",
      uid,
      campaignName,
      "advertsInfos.json"
    );
    const advertsInfos = readIfExists(advertsInfosPath);

    if (Object.keys(advertsInfos).length < 1) {
      resolve();
      return;
    }

    const advertsPath = path.join(
      __dirname,
      "marketMaster",
      uid,
      campaignName,
      "adverts.json"
    );
    const adverts = readIfExists(advertsPath);

    const advertsBudgetsPath = path.join(
      __dirname,
      "marketMaster",
      uid,
      campaignName,
      "advertsBudgets.json"
    );
    const advertsBudgets = readIfExists(advertsBudgetsPath);

    const artsPath = path.join(
      __dirname,
      "marketMaster",
      uid,
      campaignName,
      "arts.json"
    );
    const arts = readIfExists(artsPath);
    // const balancePath = path.join(
    //   __dirname,
    //   "marketMaster",
    //   uid,
    //   campaignName,
    //   "balance.json"
    // );

    arts.byBrandArt = {};
    for (const [nmId, artData] of Object.entries(arts.byNmId)) {
      artData.nmId = parseInt(nmId);
      arts.byBrandArt[artData.art] = artData;
    }

    const artsWithAdverts = {};
    for (const [advertId, advertInfos] of Object.entries(advertsInfos)) {
      if (!advertId || !advertInfos) continue;
      if (!adverts[advertId]) continue;

      const { type, status, createTime, name } = advertInfos;
      const advertsType = getAdvertsType(advertId, advertsInfos);

      if (![4, 9, 11].includes(status)) continue;

      const budget = advertsBudgets[advertId];

      let nms = [];
      if (type == 8) {
        nms = advertInfos.autoParams.nms ?? [];
      } else if (type == 9) {
        nms = advertInfos.unitedParams ? advertInfos.unitedParams[0].nms ?? [] : [];
      } else if (type == 6) {
        const temp = advertInfos.params ? advertInfos.params[0].nms : [];
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

        if (nms.length == 1 && name != art) {
          if (advertsManagerRules[art] && advertsManagerRules[art][advertsType] && advertsManagerRules[art][advertsType].mode) {
            await changeAdvertName(authToken, { advertId: advertInfos.advertId, name: art })
            console.log(new Date(), uid, campaignName, 'Changed name of', advertId, 'from', name, 'to', art);
            await new Promise(resolve => setTimeout(resolve, 1000))
          }
        }

        if (!(art in artsWithAdverts)) artsWithAdverts[art] = {};
        if (!(advertsType in artsWithAdverts[art]))
          artsWithAdverts[art][advertsType] = {};

        artsWithAdverts[art][advertsType][advertId] = {
          createTime: createTime,
          advertId: advertId,
          type: type,
          status: status,
          budget: budget,
          name: name,
        };
      }
    }
    const jsonData = {};
    const toCreateData = {};
    const toStartSearchData = [];
    for (const [art, advertsTypes] of Object.entries(advertsManagerRules)) {
      if (!art || !advertsTypes) continue;

      if (artsWithAdverts[art]) {
        if (artsWithAdverts[art]["none"]) {
          for (const [advertId, advertData] of Object.entries(
            artsWithAdverts[art]["none"]
          )) {
            if (advertsInfos[advertId].name == art) {
              console.log(new Date(), advertId, "stop");
              await changeAdvertActivity(authToken, "stop", {
                id: advertData.advertId,
              });
            }
            await new Promise((resolve) => setTimeout(resolve, 500));
          }
        }
      }
      // console.log(new Date(), artsWithAdverts);
      for (const [advertsType, value] of Object.entries(advertsTypes)) {
        if (!advertsType) continue;

        const { mode, updateTime } = value;

        let needToCreate = true;

        if (artsWithAdverts[art]) {
          if (artsWithAdverts[art][advertsType]) {
            for (const [advertId, advertData] of Object.entries(
              artsWithAdverts[art][advertsType]
            )) {
              if (!mode) {
                if (advertsInfos[advertId].name == art) {

                  if (advertData.status == 4) {
                    console.log(new Date(), uid, campaignName, advertId, "delete");
                    await changeAdvertActivity(authToken, "delete", {
                      id: advertData.advertId,
                    });
                  } else {
                    console.log(new Date(), uid, campaignName, advertId, "stop");
                    await changeAdvertActivity(authToken, "stop", {
                      id: advertData.advertId,
                    });
                  }
                }
                await new Promise((resolve) => setTimeout(resolve, 500));
              } else if (
                new Date(advertData.createTime) < new Date(updateTime)
              ) {
                needToCreate = true;
                if (advertData.status == 4) {
                  console.log(new Date(), uid, campaignName, advertId, "delete");
                  await changeAdvertActivity(authToken, "delete", {
                    id: advertData.advertId,
                  });
                } else {
                  console.log(new Date(), uid, campaignName, advertId, "stop");
                  await changeAdvertActivity(authToken, "stop", {
                    id: advertData.advertId,
                  });
                }
                // if (!jsonData[art]) jsonData[art] = {};
                // if (!jsonData[art][advertsType])
                //   jsonData[art][advertsType] =
                //     advertsManagerRules[art][advertsType];
                // jsonData[art][advertsType].advertId = undefined;
                await new Promise((resolve) => setTimeout(resolve, 500));
              } else if (
                new Date(advertData.createTime) >= new Date(updateTime)
              ) {
                const firstSuch =
                  artsWithAdverts[art][advertsType][
                  Object.keys(artsWithAdverts[art][advertsType])[0]
                  ];

                if (advertId != firstSuch.advertId && advertsManagerRules[art][advertsType].advertId != firstSuch.advertId) {

                  if (!jsonData[art]) jsonData[art] = {};
                  if (!jsonData[art][advertsType])
                    jsonData[art][advertsType] =
                      advertsManagerRules[art][advertsType];
                  jsonData[art][advertsType].advertId = firstSuch.advertId;

                }
                if (advertId != firstSuch.advertId) {
                  if (
                    new Date(
                      advertData.createTime > new Date(firstSuch.createTime)
                    )
                  ) {
                    if (advertData.status == 4) {
                      console.log(new Date(), uid, campaignName, advertId, "delete");
                      await changeAdvertActivity(authToken, "delete", {
                        id: advertData.advertId,
                      });
                    } else {
                      console.log(new Date(), uid, campaignName, advertId, "stop");
                      await changeAdvertActivity(authToken, "stop", {
                        id: advertData.advertId,
                      });
                    }
                    await new Promise((resolve) => setTimeout(resolve, 500));
                  }
                }

                needToCreate = false;
                if (advertData.status == 4) {
                  toStartSearchData.push(advertId);
                }
              }
            }
          }
        }
        if (mode && needToCreate) {
          if (!toCreateData[advertsType]) toCreateData[advertsType] = {};
          if (!arts.byBrandArt[art]) {
            console.log(new Date(), uid, campaignName, "no info", art);
            continue;
          }

          toCreateData[advertsType][art] = {
            nmId: arts.byBrandArt[art].nmId,
            type: advertsType == "search" ? "Поиск" : "Авто",
            budget: 1000,
            bid: 125,
            placements:
              advertsType != "search"
                ? {
                  booster: advertsType == "booster",
                  recom: false,
                  carousel: advertsType == "carousel",
                }
                : undefined,
          };
        }
      }
    }

    for (const [advertsType, advertsTypeData] of Object.entries(toCreateData)) {
      const checked = {};
      for (const [art, artData] of Object.entries(advertsTypeData)) {
        // console.log(new Date(), art, artData, artsWithAdverts[art], advertsType);
        const { advertId } = advertsManagerRules[art][advertsType];
        if (!advertsInfos[advertId]) {
          if (advertId) continue;
        }
        else {
          if (advertsInfos[advertId].status == 9 || advertsInfos[advertId].status == 11) continue;
        }
        // if (advertId) {
        //   if ([9, 11, 4].includes(adverts[advertId].status)) continue;
        // }
        // if (artsWithAdverts[art]) {
        //   if (artsWithAdverts[art][advertsType]) {
        //   }
        // }

        checked[art] = artData;
      }
      console.log(new Date(), advertsType, advertsTypeData, checked);
      // continue;

      const createdAdvertsIds = await createMassAdvertsMM(
        uid,
        campaignName,
        checked
      );
      console.log(new Date(), createdAdvertsIds);

      const createdAdvertsIdsArray = [];
      for (const [art, advertId] of Object.entries(createdAdvertsIds)) {
        if (!jsonData[art]) jsonData[art] = {};
        if (!jsonData[art][advertsType])
          jsonData[art][advertsType] = advertsManagerRules[art][advertsType];
        jsonData[art][advertsType].advertId = advertId;
        createdAdvertsIdsArray.push(advertId);
      }

      if (advertsType == "search") {
        await depositAndStart(uid, campaignName, createdAdvertsIdsArray);
        for (const [art, advertId] of Object.entries(createdAdvertsIds)) {
          await changeAdvertName(authToken, { advertId: advertId, name: art })
          console.log(new Date(), uid, campaignName, 'Changed name of', advertId, 'to', art);
          await new Promise(resolve => setTimeout(resolve, 1000))
        }
      }
    }
    await depositAndStart(uid, campaignName, toStartSearchData);
    afs.writeFileSync(advertsBudgetsPath, JSON.stringify(advertsBudgets));

    const advertsManagerRulesCurrent = readIfExists(advertsManagerRulesPath);
    for (const [art, advertsTypes] of Object.entries(jsonData)) {
      for (const [advertsType, rules] of Object.entries(advertsTypes)) {
        advertsManagerRulesCurrent[art][advertsType] = rules;
      }
    }
    afs.writeFileSync(
      advertsManagerRulesPath,
      JSON.stringify(advertsManagerRulesCurrent)
    );

    resolve();
  });
};

const createMassAdvertsMM = (uid, campaignName, data) => {
  return new Promise((resolve, reject) => {
    // console.log(new Date(), uid, campaignName, data);
    const authToken = getAuthTokenMM(uid, campaignName);
    const arts = readIfExists(
      path.join(__dirname, "marketMaster", uid, campaignName, "arts.json")
    );
    // const balance = readIfExists(
    //   path.join(__dirname, "marketMaster", uid, campaignName, "balance.json")
    // );

    const createAutoRK = (params) => {
      return axios
        .post("https://advert-api.wb.ru/adv/v1/save-ad", params, {
          headers: {
            Authorization: authToken,
          },
        })
        .then((response) => {

          return response.data;
        })
        .catch((error) => console.error(uid, campaignName, getLocaleDateString(new Date()), error.response.data));
    };

    const createSearchRK = (params) => {
      return axios
        .post("https://advert-api.wildberries.ru/adv/v2/seacat/save-ad", params, {
          headers: {
            Authorization: authToken,
          },
        })
        .then((response) => {

          return response.data;
        })
        .catch((error) => console.error(uid, campaignName, getLocaleDateString(new Date()), error.response.data));
    };

    const updatePlacementsInAutoRK = (advertId, params) => {
      return axios
        .post(
          "https://advert-api.wb.ru/adv/v1/auto/active" + "?id=" + advertId,
          params,
          {
            headers: {
              Authorization: authToken,
            },
          }
        )
        .then((response) => {
          console.log(new Date(),
            uid,
            campaignName,
            "switched placements for",
            advertId,
            "auto campaign."
          );
          return response.data;
        })
        .catch((error) => console.error(error));
    };

    // const searchCampaignsArtsDepositData = {};
    // const searchCampaignsArtsBiddedData = {};
    const { type, bid, mode } = data;
    let { budget } = data;
    const createdAdvertsIds = {};
    const createCampaigns = async () => {
      const balance = await fetchBalanceWithRetry(uid, campaignName);
      const batches = {};
      for (const [art, artData] of Object.entries(data.arts)) {
        const { nmId } = artData;
        if (art === undefined || nmId === undefined) continue;
        const object = arts.byNmId[nmId].object;
        if (!object) continue;
        const objectId = arts.byNmId[nmId].objectId;
        if (!objectId) continue;

        if (!batches[object]) batches[object] = { nms: [], object: object, objectId: objectId }
        batches[object].nms.push(nmId)
        // console.log(new Date(), type, nmId, object, objectId, budget, bid, art);
      }

      for (const [object, batchData] of Object.entries(batches)) {
        const { nms, objectId } = batchData;
        const toCreateCount = Math.ceil(nms.length / (mode ? 1 : type == 'Авто' ? 100 : 50))
        const rkNmsCount = Math.ceil(nms.length / toCreateCount)

        const batchesArray = []
        for (let i = 0; i < nms.length; i++) {
          if (i % rkNmsCount == 0)
            batchesArray.push([])

          const nmId = nms[i]
          batchesArray[batchesArray.length - 1].push(nmId)
        }

        console.log(batchesArray.length);

        for (let i = 0; i < batchesArray.length; i++) {
          const batch = batchesArray[i];
          const rkName = `Aurum ${object}`

          budget = Math.round(budget / 50) * 50;
          if (budget < 1000) budget = 1000;

          let payType = 0;
          if (balance.net && balance.net >= budget) payType = 1;
          if (balance.bonus && balance.bonus >= budget) payType = 3;


          if (type == "Авто") {
            const createParams = {
              type: 8,
              name: rkName,
              subjectId: objectId,
              sum: budget,
              btype: payType,
              on_pause: false,
              nms: batch,
              cpm: bid,
            };

            // console.log(new Date(), uid, campaignName, rkName, createParams, balance);

            if (payType == 3) {
              balance.bonus -= budget;
            } else if (payType == 0) {
              balance.balance -= budget;
            } else {
              balance.net -= budget;
            }

            // console.log(new Date(), uid, campaignName, createParams);

            const newCampaignId = parseInt(await createAutoRK(createParams));
            if (!Number.isNaN(newCampaignId)) {
              console.log(new Date(),
                uid,
                campaignName,
                "created",
                newCampaignId,
                `${i + 1}/${batchesArray.length}`,
                "auto campaign."
              );
              createdAdvertsIds[newCampaignId] = { nms: batch, type };
              // await updatePlacementsInAutoRK(newCampaignId, artData.placements);
            }
            await new Promise((resolve) => setTimeout(resolve, 22 * 1000));
          } else if (type == "Поиск") {
            const createParams = {
              campaignName: rkName,
              nms: batch,
            };

            const newCampaignId = parseInt(await createSearchRK(createParams));
            if (!Number.isNaN(newCampaignId)) {
              console.log(new Date(),
                uid,
                campaignName,
                "created",
                newCampaignId,
                `${i + 1}/${batchesArray.length}`,
                "seacat campaign."
              );
              createdAdvertsIds[newCampaignId] = { nms: batch, type, advertId: newCampaignId, rkName: rkName };
            }

            await new Promise((resolve) => setTimeout(resolve, 14 * 1000));
          }

        }

      }
      // return jsonData;
    };

    createCampaigns().then(async () => {

      const advertsToStart = []
      for (const [id, advertData] of Object.entries(createdAdvertsIds)) {
        const { type, advertId } = advertData;
        if (type == 'Поиск') {
          advertsToStart.push(advertId)
        }
      }
      if (advertsToStart.length > 0) {
        await depositAndStart(uid, campaignName, advertsToStart);
        for (const advertId of Object.entries(advertsToStart)) {
          const { rkName } = createdAdvertsIds[advertId];
          await changeAdvertName(authToken, { advertId: advertId, name: rkName })
          console.log(new Date(), uid, campaignName, 'Changed name of', advertId, 'to', rkName);
          await new Promise(resolve => setTimeout(resolve, 1000))
        }
      }

      afs.writeFileSync(path.join(__dirname, "marketMaster", uid, campaignName, "createdAdvertsIds.json"), JSON.stringify(createdAdvertsIds))
      resolve(createdAdvertsIds);
    });
  });
};

const fetchSalesAndWriteToJSON = (campaign) => {
  return new Promise((resolve, reject) => {
    const authToken = getAuthToken("api-token", campaign);
    const dateFrom = new Date();
    dateFrom.setDate(dateFrom.getDate() - 30);
    const date = dateFrom.toISOString().slice(0, 10);
    console.log(new Date(), date);
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
    // console.log(new Date(), mask);
    for (const supplierArticle in orders) {
      const code = vendorCodes[supplierArticle];
      if (!code) continue;
      if (code.match(mask.replace("+", "\\+"))) {
        allOrders += orders[supplierArticle];
      }
    }

    // console.log(new Date(), allOrders, analytics[mask].rashod)
    return { ads: analytics[mask].rashod / allOrders };
  };

  const jsonData = {};
  for (const mask in analytics) {
    // console.log(new Date(), mask);
    jsonData[mask] = calcAds(mask);
  }

  return fs
    .writeFile(
      path.join(__dirname, "files", campaign, "ads.json"),
      JSON.stringify(jsonData)
    )
    .then(() => console.log(new Date(), "ads.json created."))
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
        // console.log(new Date(), campaign, brand, date);
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

        // console.log(new Date(), campaign, brand, str_date);
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
    .then(() => console.log(new Date(), "RNPByDayMetrics.json created."))
    .catch((error) => console.error(error));
};

const calcAutoEnteredValuesAndWriteToJSON = () => {
  return new Promise(async (resolve, reject) => {
    const autoPriceRules = JSON.parse(
      afs.readFileSync(path.join(__dirname, `files/autoPriceRules.json`))
    );
    const artsData = JSON.parse(
      afs.readFileSync(path.join(__dirname, `files/data.json`))
    );
    // console.log(new Date(), autoPriceRules);
    const find_r = (
      art,
      brand,
      obor_data,
      artsBarcodesFull,
      stocks,
      orders
    ) => {
      const generalMask = art;
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
        // console.log(new Date(), 
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
        // console.log(new Date(), obor, value);
        if (obor <= parseInt(value)) {
          const temp = autoPriceRules[brand][generalMask][value];
          // if (brand == "DELICATUS" && temp !== null)
          //   console.log(new Date(), obor, art, parseInt(value), temp);
          if (temp === null) throw new Error(`roi couldnt be found for ${art}`);

          // const res = artsData[art].prime_cost * (1 + temp / 100); // new Процент наценки к себестоимости
          const res = temp; // old just value
          // console.log(new Date(), art, res, temp);
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
      await fetchDataAndWriteToXlsx(campaign).then(() => {
        const obor_data = {};
        const xlsx_data = xlsx.parse(
          path.join(__dirname, `files/${campaign}/data.xlsx`)
        );
        console.log(new Date(), "THERE", xlsx_data);
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
            // if (art == "ПР_120_ГОЛУБОЙ_ОТК_2")
            // console.log(new Date(), row[0], obor_data[row[0]]);
          }
        }

        // console.log(new Date(), data);
        const jsonData = {};
        const artsBarcodesFull = JSON.parse(
          afs.readFileSync(
            path.join(__dirname, "files", campaign, `artsBarcodesFull.json`)
          )
        );
        const stocks = JSON.parse(
          afs.readFileSync(
            path.join(__dirname, "files", campaign, `stocks.json`)
          )
        ).today;
        const orders = JSON.parse(
          afs.readFileSync(
            path.join(__dirname, "files", campaign, `orders.json`)
          )
        );
        for (const [art, art_data] of Object.entries(artsBarcodesFull)) {
          const brand = art_data.brand;
          if (!((brand_names[brand] ?? brand) in jsonData))
            jsonData[brand_names[brand] ?? brand] = {};
          try {
            const { val, ob } = find_r(
              art,
              brand,
              obor_data,
              artsBarcodesFull,
              stocks,
              orders
            );
            // console.log(new Date(), art, brand, val, ob);
            jsonData[brand_names[brand] ?? brand][art] = {
              rentabelnost: val,
              roi: undefined,
              roz_price: undefined,
              spp_price: undefined,
              obor: ob,
            };
            // console.log(new Date(), jsonData[brand][art]);
          } catch (e) {
            // console.log(new Date(), e);
          }
        }
        // if (campaign == "mayusha") console.log(new Date(), jsonData);
        afs.writeFileSync(
          path.join(__dirname, "files", campaign, "enteredValues.json"),
          JSON.stringify(jsonData)
        );
        afs.writeFileSync(
          path.join(__dirname, "files", campaign, "oborData.json"),
          JSON.stringify(obor_data)
        );
      });
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
  const mapp = {
    mayusha: "ИП Валерий",
    delicatus: "ИП Артем",
    TKS: "Текстиль",
    perinka: "ИП Оксана",
  };
  const stocks = readIfExists(
    path.join(
      __dirname,
      `./marketMaster/4a1f2828-9a1e-4bbf-8e07-208ba676a806/${mapp[campaign]}/stocks.json`
    )
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
  console.log(new Date(), stocks);
  // console.log(new Date(), avg);
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
      const stock = stocks[str_date] ? stocks[str_date].all[art] ? stocks[str_date].all[art].quantity ?? 0 : 0 : 0;
      // console.log(new Date(), art, str_date, stock, stocks[str_date], stocks[str_date] ? stocks[str_date].all[art] : undefined);
      // if (
      //   stock < avg[art].avg
      // ) {
      //   // console.log(new Date(), art, stocks[str_date][art], avg[art].avg);
      //   continue;
      // }
      if (!(art in jsonData)) jsonData[art] = { orders: 0, count: 0, avg: 0 };
      jsonData[art].orders += count;
      jsonData[art].count++;
      jsonData[art].avg = jsonData[art].orders / jsonData[art].count;
    }
  }
  console.log(new Date(), jsonData);
  const avgData = {};
  for (art in jsonData) {
    avgData[art] = jsonData[art].avg;
  }

  return fs
    .writeFile(
      path.join(__dirname, "files", campaign, "orders.json"),
      JSON.stringify(avgData)
    )
    .then(() => console.log(new Date(), "orders.json created."))
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
      console.log(new Date(), vendorCode, data.valuation, temp[mask]);
  }
  console.log(new Date(), temp);

  const avgData = {};
  for (const [mask, data] of Object.entries(temp)) {
    avgData[mask] = data.avg;
  }

  return fs
    .writeFile(
      path.join(__dirname, "files", campaign, "avgRatings.json"),
      JSON.stringify(avgData)
    )
    .then(() => console.log(new Date(), "avgRatings.json created."))
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
  const mapp = {
    mayusha: "ИП Валерий",
    delicatus: "ИП Артем",
    TKS: "Текстиль",
    perinka: "ИП Оксана",
  };
  const advertsAvgStatsByArt = JSON.parse(
    afs.readFileSync(
      path.join(
        __dirname,
        `./marketMaster/4a1f2828-9a1e-4bbf-8e07-208ba676a806/${mapp[campaign]}/advertsAvgStatsByArt.json`
      )
    )
  );
  // ----------------------
  const storage = readIfExists(
    path.join(
      __dirname,
      `./marketMaster/4a1f2828-9a1e-4bbf-8e07-208ba676a806/${mapp[campaign]}/storage.json`
    )
  );
  const arts = readIfExists(
    path.join(
      __dirname,
      `./marketMaster/4a1f2828-9a1e-4bbf-8e07-208ba676a806/${mapp[campaign]}/arts.json`
    )
  );

  const storageCostForArt = storage[mapp[campaign]]
    ? storage[mapp[campaign]].total.avgCost
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
    console.log(new Date(),
      campaign,
      xlsx_data[i].name,
      "calculateNewValuesAndWriteToXlsx"
    );
  }
  // console.log(new Date(), data);
  for (const [index, brand] of Object.entries(brands)) {
    // console.log(new Date(), brand, json_data);
    if (!json_data[brand]) continue;
    json_data[brand][0][19] = "Наценка";
    for (let i = 1; i < json_data[brand].length; i++) {
      let row = json_data[brand][i];
      // console.log(new Date(), row);
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
        const tax = roz_price * (arts_data[vendorCode].tax / 100);
        // const expences = roz_price * (arts_data[vendorCode].expences / 100);
        const expences = campaign == "TKS" ? roz_price * 0.05 : arts_data[vendorCode].expences;
        const prime_cost = arts_data[vendorCode].prime_cost;


        // const brand_art = arts.byArt[vendorCode].brand_art;
        const brand_art = arts.byArt[vendorCode].object;
        // const brand_art = arts.byArt[vendorCode].art;
        // const ad = advertsAvgStatsByArt[brand_art]
        //   ? getRoundValue(
        //     advertsAvgStatsByArt[brand_art].sum,
        //     advertsAvgStatsByArt[brand_art].orders,
        //     false,
        //     advertsAvgStatsByArt[brand_art].sum
        //   )
        //   : 0;
        // const type = brand_art;
        // const type = mapp[campaign];
        // const ad = advertsAvgStatsByArt[type]
        //   ? getRoundValue(
        //     advertsAvgStatsByArt[type].sum,
        //     advertsAvgStatsByArt[type].orders
        //   )
        //   : 0;
        // const drr = ad / roz_price;
        const drr = advertsAvgStatsByArt[brand_art]
          ? advertsAvgStatsByArt[brand_art].drr / 100
          : 0;
        const ad = roz_price * drr;

        const profit =
          roz_price -
          // ad -
          commission -
          delivery -
          // storageCostForArt -
          tax -
          expences -
          prime_cost;
        const wb_price = roz_price / (1 - row[3] / 100);
        const rentabelnost = profit / roz_price;

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
      // console.log(new Date(), enteredValues[brand][vendorCode], entered_rentabelnost, entered_roi, entered_roz_price, entered_spp_price);
      let count = 0;
      if (entered_rentabelnost !== undefined && !isNaN(entered_rentabelnost))
        count++;
      if (entered_roi !== undefined && !isNaN(entered_roi)) count++;
      if (entered_roz_price !== undefined && !isNaN(entered_roz_price)) count++;
      if (entered_spp_price !== undefined && !isNaN(entered_spp_price)) count++;
      // console.log(new Date(), count);
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
      for (let i = 300; i < 4500; i++) {
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
      // console.log(new Date(), min_diff, diffs, calculateds[min_diff])
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
  // console.log(new Date(), json_data['Amaze wear']);

  return fs
    .writeFile(
      path.join(__dirname, "files", campaign, "data.xlsx"),
      xlsx.build(xlsx_data_temp)
    )
    .then(() => {
      console.log(new Date(), "data.xlsx created.");
    })
    .catch((error) => console.error(error));
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

const readIfExists = (filepath, _default = {}) => {
  let result = _default;
  try {
    if (afs.existsSync(filepath)) result = JSON.parse(afs.readFileSync(filepath));
  } catch (e) {
    console.log(new Date(), filepath);
    throw e
  }
  return result;
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
  fetchSalesAndWriteToJsonMM,
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
  createMassAdvertsMM,
  getAdvertsStatsMM,
  getAuthTokenMM,
  fetchBalanceMM,
  depositAdvertsBudgetsAndWriteToJsonMM,
  autoDepositAdvertsBudgetsAndWriteToJsonMM,
  setAdvertsCPMsAndWriteToJsonMM,
  autoSetAdvertsCPMsAndWriteToJsonMM,
  fetchAdvertsWordsAndWriteToJsonMM,
  setAdvertsPlusPhrasesTemplatesMM,
  autoSetMinusPhrasesMM,
  calcNomenclaturesAndWriteToJsonMM,
  setByWarehousesInfoMM,
  updatePricesMM,
  calcPricesTemplateAndWriteToXlsxMM,
  depositAndStart,
  calcPricesJsonDataMM,
  manageAdvertsActivityMM,
  manageAdvertsNMsMM,
  getPaidStorageCostMM,
  getAdvertsStatByArtMM,
  getTariffsBoxAndWriteToJsonMM,
  fetchNmDetailReportAndWriteToJsonMM,
  calcSmartDetailedByPeriodAndWriteToJSON,
  saveNoteMM,
  autoManageAdvertsSchedule,
  calcMassAdvertsNewAndWriteToJsonMM,
  getRoundValue,
  autoAdvertsManagingMM,
  changeAdvertActivity,
  updateAdvertsManagerRulesMM,
  calcPricesMM,
  changeUploadedArtsDataForKeyMM,
  updateAdvertsSelectedPhrasesMM,
  autoAdvertsStopMM,
  setAdvertsSchedulesAndWriteToJsonMM,
  getLocaleDateString,
  getPlacements,
  fetchPaymentsHistoryMM,
  autoSetFixArtPricesMM,
  fetchBalanceWithRetry,
  fixArtPricesAndWriteToJsonMM,
  getDaysInWork,
  setPlanForKeyAndWriteToJsonMM,
  setTagsMM,
  fetchAdvertWords,
  fetchArtsPricesAndWriteToJsonMM,
  getNmDetailReport,
  getRoundValue,
  getAllTags,
  calcAnalyticsMM,
  readIfExists,
};
