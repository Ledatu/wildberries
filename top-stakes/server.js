/**
 * Express server that listens on port 3000.
 * @module server
 */

const jwt = require("jsonwebtoken");
const path = require("path");
const bodyParser = require("body-parser");
const main = require("./main");
const {
  getTemplate,
} = require("./google_sheets/templateXlsxDownload/templateXlsxDownload");
const {
  copyZakazToOtherSpreadsheet,
  fetchNewPricesAndWriteToJSON,
  writeDrrToDataSpreadsheet,
  calcAndWriteMinZakazToDataSpreadsheet,
} = require("../prices/google_sheets/index");
const {
  qrGeneration,
  tagsGeneration,
  autofillCurrent,
  exportAll,
  newTagsGeneration,
} = require("../qrGeneration/qrGeneration");
const {
  getPrices,
  getDelivery,
  calcNewValues,
  updateAnalytics,
  updateAdvertActivity,
  fetchStocksForLowRatingArts,
  fetchAdverts,
  fetchByNowStats,
  updateAutoAdverts,
  createNewAdverts,
  answerAllFeedbacks,
  writeSpp,
  calcAutoPrices,
  fetchAdvertsMM,
} = require("../prices/prices");
const {
  updatePrices,
  updateStorageCost,
  craftNecessaryFoldersAndFilesIfNeeded,
  calcDeliveryOrdersAndWriteToJsonMM,
  calcMassAdvertsAndWriteToJsonMM,
  createMassAdvertsMM,
  depositAdvertsBudgetsAndWriteToJsonMM,
  setAdvertsCPMsAndWriteToJsonMM,
  setAdvertsPlusPhrasesTemplatesMM,
  calcNomenclaturesAndWriteToJsonMM,
  setByWarehousesInfoMM,
  calcPricesTemplateAndWriteToXlsxMM,
  manageAdvertsActivityMM,
  calcMassAdvertsNewAndWriteToJsonMM,
  updateAdvertsManagerRulesMM,
  readIfExists,
  getPlacements,
  updateAdvertsSelectedPhrasesMM,
} = require("../prices/main");
const { zipDirectory } = require("../qrGeneration/main");
const { fetchAnalytics } = require("../analytics/main");

const fs = require("fs");
const http = require("http");
const https = require("https");
const certificate = fs.readFileSync(
  path.join(__dirname, "../secrets/cert/cert.pem")
);
const privateKey = fs.readFileSync(
  path.join(__dirname, "../secrets/cert/key.pem")
);

const credentials = { key: privateKey, cert: certificate };
const express = require("express");
const app = express();

const fileUpload = require("express-fileupload");
app.use(fileUpload());

var cors = require("cors");
app.use(cors());
// your express configuration here

const port = 24456;
const secretKey = require(path.join(
  __dirname,
  "../secrets/top-stakes/secret"
)).secretKey;

/**
 * Middleware function to check for the token in the request header.
 * @function authenticateToken
 * @param {Object} req - The request object.
 * @param {Object} res - The response object.
 * @param {Function} next - The next middleware function.
 */
function authenticateToken(req, res, next) {
  const authHeader = req.headers["authorization"];
  const token = authHeader && authHeader.split(" ")[1];
  // console.log(req.headers)
  if (token == null) return res.sendStatus(401);

  jwt.verify(token, secretKey, (err, user) => {
    if (err) return res.sendStatus(403);
    req.user = user;
    next();
  });
}

/**
 * Function to start the XLSX parsing process.
 * @async
 * @function startXlsxParsing
 */
async function startXlsxParsing() {
  main();
}

// parse application/x-www-form-urlencoded
app.use(bodyParser.urlencoded({ extended: false }));

// parse application/json
app.use(bodyParser.json());

/**
 * Route to return a "Hello World!" message.
 * @function
 * @name getRoot
 * @param {Object} req - The request object.
 * @param {Object} res - The response object.
 */
app.get("/", (req, res) => {
  res.send("Hello World!");
});

/**
 * Endpoint to start the XLSX parsing process.
 * @function
 * @name startXlsxParsingEndpoint
 * @param {Object} req - The request object.
 * @param {Object} res - The response object.
 */
app.get("/api/startXlsxParsing", authenticateToken, (req, res) => {
  startXlsxParsing();
  res.send("XLSX parsing started!");
});

app.get("/api/getPrices", authenticateToken, (req, res) => {
  getPrices();
  res.send("Prices getting started!");
});

app.get("/api/calcAutoPrices", authenticateToken, (req, res) => {
  calcAutoPrices(false);
  res.send("Prices calculation and updation started!");
});

app.get("/api/updateAdvertsMM", authenticateToken, (req, res) => {
  fetchAdvertsMM();
  res.send("Updating adverts MM!");
});

app.get("/api/calcNewValues", authenticateToken, (req, res) => {
  calcNewValues();
  res.send("Prices getting started!");
});

app.post("/api/updatePrices", authenticateToken, (req, res) => {
  const campaign = req.body.campaign;
  // console.log(req)
  if (!campaign) {
    res.send("Error: no campaign was provided.");
    return;
  }

  fetchNewPricesAndWriteToJSON(campaign).then((pr) => {
    console.log("Prices fetched.");
    updatePrices(campaign);
    new Promise((resolve) => setTimeout(resolve, 5000)).then((pr) =>
      getPrices()
    );
  });

  res.send("Updating prices.");
});

app.post("/api/getDelivery", authenticateToken, (req, res) => {
  const campaign = req.body.campaign;
  // console.log(req)

  getDelivery(campaign)
    .then((pr) => res.send(JSON.stringify(pr)))
    .catch((err) => res.send(err));
});

app.post("/api/updateStorageCost", authenticateToken, (req, res) => {
  const storageCostData = req.body;
  updateStorageCost(storageCostData)
    .then((pr) => res.send(JSON.stringify(pr)))
    .catch((err) => res.send(err));
});

app.post("/api/getStatsByDay", authenticateToken, (req, res) => {
  const accountUid = req.body.uid;
  if (!accountUid || accountUid == "") return;

  const secrets = JSON.parse(
    fs.readFileSync(
      path.join(__dirname, "../prices/marketMaster", accountUid, "secrets.json")
    )
  ).byCampaignName;
  const advertsStatsAccount = {};
  for (const [campaignName, _] of Object.entries(secrets)) {
    const advertsStatsCampaign = JSON.parse(
      fs.readFileSync(
        path.join(
          __dirname,
          "../prices/marketMaster",
          accountUid,
          campaignName,
          "advertsStatsByDay.json"
        )
      )
    );
    advertsStatsAccount[campaignName] = advertsStatsCampaign;
  }
  res.send(JSON.stringify(advertsStatsAccount));
});

app.post("/api/getDeliveryOrders", authenticateToken, (req, res) => {
  const accountUid = req.body.uid;
  const dateRange = req.body.dateRange;
  if (!accountUid || accountUid == "") return;

  const secrets = JSON.parse(
    fs.readFileSync(
      path.join(__dirname, "../prices/marketMaster", accountUid, "secrets.json")
    )
  ).byCampaignName;
  const deliveryOrdersAccount = {};
  for (const [campaignName, _] of Object.entries(secrets)) {
    const deliveryOrdersCampaign = calcDeliveryOrdersAndWriteToJsonMM(
      accountUid,
      campaignName,
      dateRange
    );
    deliveryOrdersAccount[campaignName] = deliveryOrdersCampaign;
  }
  res.send(JSON.stringify(deliveryOrdersAccount));
});

app.post("/api/setPlusPhraseTemplate", authenticateToken, (req, res) => {
  const accountUid = req.body.uid;
  const campaignName = req.body.campaignName;
  const data = req.body.data;
  if (!accountUid || accountUid == "") return;

  const plusPhrasesTemplates = readIfExists(
    path.join(
      __dirname,
      "../prices/marketMaster",
      accountUid,
      campaignName,
      "plusPhrasesTemplates.json"
    )
  )

  data.updateTime = new Date().toISOString();

  if (data.mode == "Установить") plusPhrasesTemplates[data.name] = data;
  else if (data.mode == "Удалить") plusPhrasesTemplates[data.name] = undefined;
  else if (data.mode == "Переименовать") {
    plusPhrasesTemplates[data.oldName] = undefined;
    plusPhrasesTemplates[data.name] = data;
  };

  fs.writeFileSync(
    path.join(
      __dirname,
      "../prices/marketMaster",
      accountUid,
      campaignName,
      "plusPhrasesTemplates.json"
    ),
    JSON.stringify(plusPhrasesTemplates)
  );

  res.send(JSON.stringify("Set plusPhrasesTemplates"));
});

app.post("/api/getMassAdverts", authenticateToken, (req, res) => {
  const accountUid = req.body.uid;
  const dateRange = req.body.dateRange;
  if (!accountUid || accountUid == "") return;

  const secrets = JSON.parse(
    fs.readFileSync(
      path.join(__dirname, "../prices/marketMaster", accountUid, "secrets.json")
    )
  ).byCampaignName;

  const massAdvertsAccount = {
    plusPhrasesTemplates: {},
    campaigns: {},
  };
  for (const [campaignName, _] of Object.entries(secrets)) {
    const massAdvertsCampaign = calcMassAdvertsAndWriteToJsonMM(
      accountUid,
      campaignName,
      dateRange
    );
    const plusPhrasesTemplates = readIfExists(
      path.join(
        __dirname,
        "../prices/marketMaster",
        accountUid,
        campaignName,
        "plusPhrasesTemplates.json"
      )
    );
    massAdvertsAccount.plusPhrasesTemplates[campaignName] = plusPhrasesTemplates;
    massAdvertsAccount.campaigns[campaignName] = massAdvertsCampaign;
  }
  res.send(JSON.stringify(massAdvertsAccount));
});

app.post("/api/getMassAdvertsNew", authenticateToken, (req, res) => {
  const accountUid = req.body.uid;
  const dateRange = req.body.dateRange;
  const genForCampaignName = req.body.campaignName;
  if (!accountUid || accountUid == "") return;

  const secrets = JSON.parse(
    fs.readFileSync(
      path.join(__dirname, "../prices/marketMaster", accountUid, "secrets.json")
    )
  ).byCampaignName;

  const massAdvertsAccount = {
    fetchedPlacements: {},
    plusPhrasesTemplates: {},
    balances: {},
    campaigns: {},
  };
  for (const [campaignName, _] of Object.entries(secrets)) {
    if (!massAdvertsAccount.campaigns[campaignName])
      massAdvertsAccount.campaigns[campaignName] = {};
    if (!massAdvertsAccount.balances[campaignName])
      massAdvertsAccount.balances[campaignName] = {};
    if (!massAdvertsAccount.plusPhrasesTemplates[campaignName])
      massAdvertsAccount.plusPhrasesTemplates[campaignName] = {};

    if (campaignName != (genForCampaignName ?? "ИП Валерий")) continue;

    const balance = readIfExists(
      path.join(
        __dirname,
        "../prices/marketMaster",
        accountUid,
        campaignName,
        "balance.json"
      )
    );

    getPlacements(accountUid, campaignName);
    const massAdvertsCampaign = calcMassAdvertsNewAndWriteToJsonMM(
      accountUid,
      campaignName,
      dateRange
    );
    massAdvertsAccount.campaigns[campaignName] = massAdvertsCampaign;
    massAdvertsAccount.balances[campaignName] = balance;
    const plusPhrasesTemplates = readIfExists(
      path.join(
        __dirname,
        "../prices/marketMaster",
        accountUid,
        campaignName,
        "plusPhrasesTemplates.json"
      )
    );
    massAdvertsAccount.plusPhrasesTemplates[campaignName] = plusPhrasesTemplates;
  }
  res.send(JSON.stringify(massAdvertsAccount));
});

app.post("/api/updateAdvertsManagerRules", authenticateToken, (req, res) => {
  const accountUid = req.body.uid;
  const campaignName = req.body.campaignName;
  const data = req.body.data;
  if (!accountUid || accountUid == "") return;
  if (!campaignName || campaignName == "") return;
  if (!data || data == "") return;

  updateAdvertsManagerRulesMM(accountUid, campaignName, data).then((pr) =>
    res.send(pr)
  );
});

app.post("/api/updateAdvertsSelectedPhrases", authenticateToken, (req, res) => {
  const accountUid = req.body.uid;
  const campaignName = req.body.campaignName;
  const data = req.body.data;
  if (!accountUid || accountUid == "") return;
  if (!campaignName || campaignName == "") return;
  if (!data || data == "") return;

  updateAdvertsSelectedPhrasesMM(accountUid, campaignName, data).then((pr) =>
    res.send(pr)
  );
});

app.post("/api/getNomenclatures", authenticateToken, (req, res) => {
  const accountUid = req.body.uid;
  if (!accountUid || accountUid == "") return;

  const secrets = JSON.parse(
    fs.readFileSync(
      path.join(__dirname, "../prices/marketMaster", accountUid, "secrets.json")
    )
  ).byCampaignName;
  const nomenclaturesAccount = {};
  for (const [campaignName, _] of Object.entries(secrets)) {
    const nomenclaturesCampaign = calcNomenclaturesAndWriteToJsonMM(
      accountUid,
      campaignName
    );
    nomenclaturesAccount[campaignName] = nomenclaturesCampaign;
  }
  res.send(JSON.stringify(nomenclaturesAccount));
});

app.post("/api/createMassAdverts", authenticateToken, async (req, res) => {
  const accountUid = req.body.uid;
  const campaignName = req.body.campaignName;
  const data = req.body.arts;
  if (!accountUid || accountUid == "") return;
  if (!campaignName || campaignName == "") return;
  if (!data || data == "") return;

  const massAdvertsCampaign = await createMassAdvertsMM(
    accountUid,
    campaignName,
    data
  );
  res.send(JSON.stringify(massAdvertsCampaign));
});

app.post(
  "/api/setAdvertsPlusPhrasesTemplates",
  authenticateToken,
  async (req, res) => {
    const accountUid = req.body.uid;
    const campaignName = req.body.campaignName;
    const data = req.body.data;
    if (!accountUid || accountUid == "") return;
    if (!campaignName || campaignName == "") return;
    if (!data || data == "") return;

    const massAdvertsCampaign = await setAdvertsPlusPhrasesTemplatesMM(
      accountUid,
      campaignName,
      data
    );
    res.send(JSON.stringify(massAdvertsCampaign));
  }
);

app.post("/api/uploadFile", authenticateToken, async (req, res) => {
  const accountUid = req.body.uid;
  const campaignName = req.body.campaignName;
  const files = req.files;
  if (!accountUid || accountUid == "") return;
  if (!campaignName || campaignName == "") return;

  if (!files || Object.keys(files).length === 0) {
    return res.status(400).send("No files were uploaded.");
  }
  const file = files.file;
  if (!file) return;

  const filepath = path.join(
    __dirname,
    "../prices/marketMaster",
    accountUid,
    campaignName,
    `uploaded${file.name}`
  );

  if (fs.existsSync(filepath)) fs.rmSync(filepath);

  file.mv(filepath, function (err) {
    if (err) return res.status(500).send(err);
    res.send("File uploaded!");
  });
});

app.post("/api/setByWarehousesInfo", authenticateToken, async (req, res) => {
  const accountUid = req.body.uid;
  const campaignName = req.body.campaignName;
  const data = req.body.data;
  if (!accountUid || accountUid == "") return;
  if (!campaignName || campaignName == "") return;
  if (!data || data == "") return;

  const result = await setByWarehousesInfoMM(accountUid, campaignName, data);
  res.send(JSON.stringify(result));
});

app.post("/api/depositAdvertsBudgets", authenticateToken, async (req, res) => {
  const accountUid = req.body.uid;
  const campaignName = req.body.campaignName;
  const data = req.body.data;
  if (!accountUid || accountUid == "") return;
  if (!campaignName || campaignName == "") return;
  if (!data || data == "") return;

  const massAdvertsCampaign = await depositAdvertsBudgetsAndWriteToJsonMM(
    accountUid,
    campaignName,
    data
  );
  res.send(JSON.stringify(massAdvertsCampaign));
});

app.post("/api/setAdvertsCPMs", authenticateToken, async (req, res) => {
  const accountUid = req.body.uid;
  const campaignName = req.body.campaignName;
  const data = req.body.data;
  if (!accountUid || accountUid == "") return;
  if (!campaignName || campaignName == "") return;
  if (!data || data == "") return;

  const result = await setAdvertsCPMsAndWriteToJsonMM(
    accountUid,
    campaignName,
    data
  );
  res.send(JSON.stringify(result));
});

app.post("/api/manageAdvertsActivity", authenticateToken, async (req, res) => {
  const accountUid = req.body.uid;
  const campaignName = req.body.campaignName;
  const data = req.body.data;
  if (!accountUid || accountUid == "") return;
  if (!campaignName || campaignName == "") return;
  if (!data || data == "") return;

  const result = await manageAdvertsActivityMM(accountUid, campaignName, data);
  res.send(JSON.stringify(result));
});

app.post(
  "/api/craftNecessaryFoldersAndFilesIfNeeded",
  authenticateToken,
  (req, res) => {
    const accountInfo = req.body;
    craftNecessaryFoldersAndFilesIfNeeded(accountInfo);
    res.send("Crafting...");
  }
);

// app.post("/api/getCurrentStorageCost", authenticateToken, (req, res) => {
//   const storageCost = JSON.parse(
//     fs.readFileSync(path.join(__dirname, "../prices/files/storageCost.json"))
//   );
//   res.send(JSON.stringify(storageCost)).catch((err) => res.send(err));
// });

app.get("/api/copyZakaz", authenticateToken, (req, res) => {
  copyZakazToOtherSpreadsheet();
  res.send("Zakaz copying started!");
});

app.get("/api/createNewAdverts", authenticateToken, (req, res) => {
  createNewAdverts();
  res.send("RKs creating started!");
});

app.get("/api/writeDrr", authenticateToken, (req, res) => {
  writeDrrToDataSpreadsheet();
  res.send("Drr writing started!");
});

// app.get("/api/writeSpp", authenticateToken, (req, res) => {
//   writeSpp();
//   res.send("Spp writing started!");
// });

app.get("/api/calcAndWriteMinZakaz", authenticateToken, (req, res) => {
  calcAndWriteMinZakazToDataSpreadsheet();
  res.send("Min zakaz writing started!");
});

app.get("/api/generateQRs", authenticateToken, (req, res) => {
  qrGeneration();
  res.send("QR generation started!");
});

app.get("/api/generateNewTags", authenticateToken, (req, res) => {
  newTagsGeneration();
  res.send("New tags generation started!");
});

app.get("/api/updateAdvertActivity", authenticateToken, (req, res) => {
  updateAdvertActivity();
  res.send("Advert activity is updating...");
});

app.get("/api/analyticsRun", authenticateToken, (req, res) => {
  fetchAnalytics();
  res.send("Analytics is updating...");
});

app.get("/api/fetchStocksForLowRatingArts", authenticateToken, (req, res) => {
  fetchStocksForLowRatingArts();
  res.send("fetchStocksForLowRatingArts is updating...");
});

app.get("/api/updateAnalytics", authenticateToken, (req, res) => {
  updateAnalytics();
  res.send("Analytics is updating...");
});

app.get("/api/updateAutoAdverts", authenticateToken, (req, res) => {
  updateAutoAdverts();
  res.send("updateAutoAdverts is updating...");
});

app.get("/api/answerFeedbacks", authenticateToken, (req, res) => {
  answerAllFeedbacks();
  res.send("answerFeedbacks is updating...");
});

app.get("/api/fetchAdverts", authenticateToken, (req, res) => {
  fetchAdverts()
    .then((pr) => res.send(JSON.stringify(pr)))
    .catch((err) => res.send(err));
});

app.get("/api/fetchByNowStats", authenticateToken, (req, res) => {
  fetchByNowStats();
  res.send("fetchByNowStats is updating...");
});

app.post("/api/autofillCurrent", authenticateToken, (req, res) => {
  const name = req.body.sheetname;
  autofillCurrent(name)
    .then((count) => res.send({ count: count }))
    .catch((error) => {
      console.log(error);
      res.status(500).send(error);
    });
});

// app.get("/api/downloadQRs", async (req, res) => {
//   // console.log(req)
//   try {
//     await qrGeneration();

//     const file = path.join(__dirname, "../qrGeneration/files/Поставка/qrcodes.zip");
//     // Wait for the file to be created before attempting to download it
//     fs.access(file, fs.constants.F_OK, (err) => {
//       if (err) {
//         res.status(500).end(err);
//       } else {
//         res.download(file); // Set disposition and send it.
//       }
//     });
//   } catch (error) {
//     res.status(500).end(error);
//   }
// });

// app.get("/api/downloadTags", async (req, res) => {
//   // console.log(req)
//   try {
//     const arch = path.join(__dirname, "../qrGeneration/files/Поставка/tags.zip");
//     tagsGeneration().then(() => {
//       res.download(arch);
//     });
//   } catch (error) {
//     res.status(500).end(error);
//   }
// });

app.get("/api/downloadAll", async (req, res) => {
  // console.log(req)
  try {
    const name = JSON.parse(
      fs.readFileSync(path.join(__dirname, "../qrGeneration/files/supply.json"))
    ).name;
    const arch = path.join(
      __dirname,
      `../qrGeneration/files/Поставки/${name}.zip`
    );
    exportAll().then(() => {
      res.download(arch);
    });
  } catch (error) {
    res.status(500).end(error);
  }
});

app.post("/api/downloadPricesTemplate", authenticateToken, async (req, res) => {
  try {
    const accountUid = req.body.uid;
    const campaignName = req.body.campaignName;
    if (!accountUid || accountUid == "") return;
    if (!campaignName || campaignName == "") return;

    const arch = path.join(
      __dirname,
      "../prices/marketMaster",
      accountUid,
      campaignName,
      "pricesTemplate.xlsx"
    );
    calcPricesTemplateAndWriteToXlsxMM(accountUid, campaignName).then(() => {
      res.download(arch);
    });
  } catch (error) {
    res.status(500).end(error);
  }
});

app.get("/api/getArtsData", async (req, res) => {
  // console.log(req)
  try {
    const artsData = JSON.parse(
      fs.readFileSync(path.join(__dirname, "../prices/files/data.json"))
    );
    const OTKArtMatching = JSON.parse(
      fs.readFileSync(
        path.join(__dirname, "../qrGeneration/files/OTKArtMatching.json")
      )
    );
    res.send({ arts: artsData, otkMatching: OTKArtMatching });
  } catch (error) {
    res.status(500).end(error);
  }
});

app.get("/api/downloadTemplate", async (req, res) => {
  // console.log(req)
  try {
    await getTemplate();
    // await new Promise((resolve) => {
    //   setTimeout(resolve, 1000);
    // });
    console.log("File created.");
    const file = path.join(
      __dirname,
      "google_sheets/templateXlsxDownload/Template.xlsx"
    );
    // Wait for the file to be created before attempting to download it
    fs.access(file, fs.constants.F_OK, (err) => {
      if (err) {
        res.status(500).end(err);
      } else {
        res.download(file); // Set disposition and send it.
      }
    });
  } catch (error) {
    res.status(500).end(error);
  }
});

// Use the body-parser middleware to parse request
/**
 * Endpoint to authenticate a user and return a JWT.
 * @function
 * @name loginEndpoint
 * @param {Object} req - The request object.
 * @param {Object} res - The response object.
 */
app.post("/api/login", (req, res) => {
  const username = req.body.username;
  const password = req.body.password;

  const filePath = path.join(__dirname, "../secrets/top-stakes/users.json");
  console.log(filePath);
  fs.readFile(filePath, "utf8", (err, data) => {
    if (err) {
      console.error(err);
      return res.sendStatus(500);
    }

    const users = JSON.parse(data).users;
    const user = users.find(
      (u) => u.username === username && u.password === password
    );
    if (!user) {
      return res.sendStatus(401);
    }

    const token = jwt.sign({ username: username }, secretKey);
    res.json({ token: token });
  });
});

const httpServer = http.createServer(app);
const httpsServer = https.createServer(credentials, app);
/**
 * Start the server.
 * @function
 * @name startServer
 */
function startServer() {
  httpServer.listen(24456, () => {
    console.log(`Http server listening at http://185.164.172.100:24456`);
  });
  httpsServer.listen(24458, () => {
    console.log(`Https server listening at https://185.164.172.100:24458`);
  });
}
module.exports = startServer;
