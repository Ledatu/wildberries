/**
 * Express server that listens on port 3000.
 * @module server
 */

const express = require("express");
const jwt = require("jsonwebtoken");
const path = require("path");
const fs = require("fs");
const bodyParser = require("body-parser");
const main = require("./main");
const {
  getTemplate,
} = require("./google_sheets/templateXlsxDownload/templateXlsxDownload");
const {
  copyZakazToOtherSpreadsheet,
  fetchNewPricesAndWriteToJSON,
} = require("../prices/google_sheets/index");
const { qrGeneration } = require("../qrGeneration/qrGeneration");
const { getPrices, getDelivery, calcNewValues } = require("../prices/prices");
const { updatePrices } = require("../prices/main");

const app = express();
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

app.get("/api/calcNewValues", authenticateToken, (req, res) => {
  calcNewValues();
  res.send("Prices getting started!");
});

app.get("/api/updatePrices", authenticateToken, (req, res) => {
  const campaign = req.query.campaign;
  if (!campaign) {
    res.send("Error: no campaign was provided.");
  }
  // console.log(campaign);
  fetchNewPricesAndWriteToJSON(campaign).then((pr) => {
    console.log("Prices fetched.");
    updatePrices(campaign);
  });

  res.send("Updating prices.");
});

app.get("/api/getDelivery", authenticateToken, (req, res) => {
  getDelivery();
  res.send("Delivery getting started!");
});

app.get("/api/copyZakaz", authenticateToken, (req, res) => {
  copyZakazToOtherSpreadsheet();
  res.send("Zakaz copying started!");
});

app.get("/api/generateQRs", authenticateToken, (req, res) => {
  qrGeneration();
  res.send("QR Generation started!");
});

app.get("/api/downloadQRs", async (req, res) => {
  // console.log(req)
  try {
    await qrGeneration();

    const file = path.join(__dirname, "../qrGeneration/files/qrcodes.zip");
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

// Use the body-parser middleware to parse request bodies
app.use(bodyParser.json());

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

/**
 * Start the server.
 * @function
 * @name startServer
 */
function startServer() {
  app.listen(port, () => {
    console.log(`Server listening at http://localhost:${port}`);
  });
}

module.exports = startServer;
