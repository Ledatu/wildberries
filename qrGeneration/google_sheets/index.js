const fs = require("fs").promises;
const afs = require("fs");
const path = require("path");
const { authenticate } = require("@google-cloud/local-auth");
const { google } = require("googleapis");
const console = require("console");
const xlsx = require("node-xlsx").default;
const https = require("https");

// If modifying these scopes, delete token.json.
const SCOPES = ["https://www.googleapis.com/auth/spreadsheets"];
// The file token.json stores the user's access and refresh tokens, and is
// created automatically when the authorization flow completes for the first
// time.
const TOKEN_PATH = path.join(__dirname, "../../secrets/google_api/token.json");
const CREDENTIALS_PATH = path.join(
  __dirname,
  "../../secrets/google_api/credentials.json"
);

/**
 * Reads previously authorized credentials from the save file.
 *
 * @return {Promise<OAuth2Client|null>}
 */
async function loadSavedCredentialsIfExist() {
  try {
    // const content = await fs.readFile(TOKEN_PATH);
    // const credentials = JSON.parse(content);
    const credentials = require(TOKEN_PATH);
    console.log("Token loaded.");
    return google.auth.fromJSON(credentials);
  } catch (err) {
    console.log("Failed to load token.");
    return null;
  }
}

/**
 * Serializes credentials to a file comptible with GoogleAUth.fromJSON.
 *
 * @param {OAuth2Client} client
 * @return {Promise<void>}
 */
async function saveCredentials(client) {
  const content = await fs.readFile(CREDENTIALS_PATH);
  const keys = JSON.parse(content);
  const key = keys.installed || keys.web;
  const payload = JSON.stringify({
    type: "authorized_user",
    client_id: key.client_id,
    client_secret: key.client_secret,
    refresh_token: client.credentials.refresh_token,
  });
  await fs.writeFile(TOKEN_PATH, payload);
}

/**
 * Load or request or authorization to call APIs.
 *
 */
async function authorize() {
  let client = await loadSavedCredentialsIfExist();
  if (client) {
    return client;
  }
  client = await authenticate({
    scopes: SCOPES,
    keyfilePath: CREDENTIALS_PATH,
  });
  if (client.credentials) {
    await saveCredentials(client);
  }
  return client;
}

async function writeCurrent(auth, campaign) {
  const update_data = async (data) => {
    await sheets.spreadsheets.values.update({
      spreadsheetId: "1U8q5ukJ7WHCM9kNRRPlKRr3Cb3cb8At-bTjZuBOpqRs",
      range: "Готовый!1:2400",
      valueInputOption: "USER_ENTERED", // The information will be passed according to what the usere passes in as date, number or text
      resource: {
        values: data,
      },
    });
  };

  const data = xlsx.parse(path.join(__dirname, `../files/current.xlsx`))[0][
    "data"
  ];
  // console.log(data);
  const sheets = google.sheets({ version: "v4", auth });

  await sheets.spreadsheets.values.clear({
    spreadsheetId: "1U8q5ukJ7WHCM9kNRRPlKRr3Cb3cb8At-bTjZuBOpqRs",
    range: "Готовый!1:2400",
  });

  await update_data(data);
  console.log(`Current autofill data written to the google sheets.`);
}

async function fetchQrCodesAndWriteToJSON(auth) {
  return new Promise(async (resolve, reject) => {
    const sheets = google.sheets({ version: "v4", auth });

    // Retrieve the values from the specified range
    const res = await sheets.spreadsheets.values.get({
      spreadsheetId: "1U8q5ukJ7WHCM9kNRRPlKRr3Cb3cb8At-bTjZuBOpqRs",
      range: "Готовый!F2:F",
    });

    // Parse the values into a JSON object
    const rows = res.data.values;
    const data = { qrcodes: [] };
    rows.forEach((row) => {
      data["qrcodes"].push(row[0]);
    });

    writeDataToFile(data, path.join(__dirname, "../files/qrcodes.json")).then(
      (pr) => resolve()
    );
  });
}

async function fetchTagsAndWriteToJSON(auth, name) {
  return new Promise(async (resolve, reject) => {
    const sheets = google.sheets({ version: "v4", auth });

    // Retrieve the values from the specified range
    if (name) {
      const res = await sheets.spreadsheets.values.get({
        spreadsheetId: "1ShAelY_Xi50Au2Ij7PvK0QhfwKmRFdI0Yqthx-I_JbQ",
        range: `${name}!A2:F`,
      });

      // Parse the values into a JSON object
      const rows = res.data.values;
      const data = { tags: [] };
      rows.forEach((row) => {
        if (!row[5] || !row[2]) return;
        data["tags"].push({
          tag: row[5],
          count: parseInt(row[2].replace(/\s/g, "")),
        });
      });

      writeDataToFile(data, path.join(__dirname, "../files/tags.json")).then(
        (pr) => resolve()
      );
    } else {
      const res = await sheets.spreadsheets.values.get({
        spreadsheetId: "1U8q5ukJ7WHCM9kNRRPlKRr3Cb3cb8At-bTjZuBOpqRs",
        range: "Поставка!A2:B",
      });

      // Parse the values into a JSON object
      const rows = res.data.values;
      const data = { tags: [] };
      rows.forEach((row) => {
        if (!row[0] || !row[1]) return;
        data["tags"].push({ tag: row[0], count: row[1] });
      });

      writeDataToFile(data, path.join(__dirname, "../files/tags.json")).then(
        (pr) => resolve()
      );
    }
  });
}

async function fetchNewTagsAndWriteToXLSX(auth) {
  return new Promise(async (resolve, reject) => {
    const campaigns = JSON.parse(
      afs.readFileSync(
        path.join(__dirname, "../../prices/files/campaigns.json")
      )
    ).campaigns;

    const sheets = google.sheets({ version: "v4", auth });
    const xlsxSheets = [];
    for (const campaign of campaigns) {
      const res = await sheets.spreadsheets.values.get({
        spreadsheetId: "1Kc-QZBJ-D0mWXwgTRDcsYDw-MoymdVhr4AJDbHSkRqo",
        range: `${campaign}!A:D`,
      });
      // Parse the values into a JSON object
      const rows = res.data.values;
      xlsxSheets.push({ name: campaign, data: rows });
    }

    const buffer = xlsx.build(xlsxSheets);
    afs.writeFileSync(path.join(__dirname, "../files", "newTags.xlsx"), buffer);
    // console.log(xlsxSheets);
    resolve();
  });
}

async function fetchCurrentZakazAndWriteToXLSX(auth, sheet_name) {
  return new Promise(async (resolve, reject) => {
    const sheets = google.sheets({ version: "v4", auth });
    const xlsxSheets = [];
    const res = await sheets.spreadsheets.values.get({
      spreadsheetId: "1ShAelY_Xi50Au2Ij7PvK0QhfwKmRFdI0Yqthx-I_JbQ",
      range: `${sheet_name}!A2:E`,
    });
    const OTKArtMatching = JSON.parse(
      afs.readFileSync(path.join(__dirname, "../files/OTKArtMatching.json"))
    );
    // Parse the values into a JSON object
    const rows = res.data.values;
    const filled_rows = [];
    for (let i = 0; i < rows.length; i++) {
      const row = rows[i];
      const art = row[1];
      if (!art) continue;
      row[0] = OTKArtMatching[art];
      filled_rows.push(row);
    }
    xlsxSheets.push({ name: sheet_name, data: filled_rows });

    const buffer = xlsx.build(xlsxSheets);
    await afs.writeFileSync(
      path.join(__dirname, "../files/Поставка/", `${sheet_name}.xlsx`),
      buffer
    );
    await afs.writeFileSync(
      path.join(__dirname, "../files/supply.json"),
      JSON.stringify({ name: sheet_name })
    );
    // console.log(xlsxSheets);
    resolve();
  });
}

async function fetchOTKArtMathcingAndWriteToJSON(auth) {
  return new Promise(async (resolve, reject) => {
    const sheets = google.sheets({ version: "v4", auth });
    const res = await sheets.spreadsheets.values.get({
      spreadsheetId: "1U8q5ukJ7WHCM9kNRRPlKRr3Cb3cb8At-bTjZuBOpqRs",
      range: `Сопоставление артикулов с ОТК!A1:E`,
    });
    // Parse the values into a JSON object
    const rows = res.data.values;
    // console.log(rows);
    const jsonData = {};
    for (let i = 1; i < rows.length; i++) {
      const row = rows[i];
      // console.log(row);
      if (!row || !row[0] || row[0] == "") continue;
      for (let j = 1; j < row.length; j++) {
        const art = row[j];
        if (!art || art == "") continue;
        jsonData[art] = row[0];
      }
    }

    await afs.writeFileSync(
      path.join(__dirname, "../files/", `OTKArtMatching.json`),
      JSON.stringify(jsonData)
    );
    resolve();
  });
}

// Define the function to write data to a JSON file
const writeDataToFile = (data, filename) => {
  return fs.writeFile(filename, JSON.stringify(data), (err) => {
    if (err) return console.log(`Error writing file: ${err}`);
    console.log(`Data written to ${filename}`);
  });
};

async function exportTZToXlsx(auth) {
  // const sheets = google.sheets({ version: "v4", auth });
  // const options = {
  // spreadsheetId: "1iEsqj8Wvyvq31JMd-wtgNxEyBGxcG1UrD93_Y6Z8DeI",
  // mimeType:
  // "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
  // };
  // const response = await sheets.spreadsheets.export(options);
  const filename = `ТЗ 2.0.xlsx`;
  const filepath = path.join(__dirname, "../files/Поставка", filename);
  const file = afs.createWriteStream(filepath);
  const request = https.get(
    `https://docs.google.com/spreadsheets/d/1iEsqj8Wvyvq31JMd-wtgNxEyBGxcG1UrD93_Y6Z8DeI/export`,
    function (response) {
      response.pipe(file);
    }
  );
  console.log(`Exported ${filename} to files.`);
}

module.exports = {
  writeCurrent: async (campaign) => {
    return new Promise(async (resolve, reject) => {
      const auth = await authorize();
      await writeCurrent(auth, campaign).catch(console.error);
      resolve();
    });
  },
  fetchQrCodesAndWriteToJSON: () => {
    return new Promise(async (resolve, reject) => {
      const auth = await authorize();
      await fetchQrCodesAndWriteToJSON(auth).catch(console.error);
      resolve();
    });
  },
  fetchTagsAndWriteToJSON: (name) => {
    return new Promise(async (resolve, reject) => {
      const auth = await authorize();
      await fetchTagsAndWriteToJSON(auth, name).catch(console.error);
      resolve();
    });
  },
  fetchNewTagsAndWriteToXLSX: () => {
    return new Promise(async (resolve, reject) => {
      const auth = await authorize();
      await fetchNewTagsAndWriteToXLSX(auth).catch(console.error);
      resolve();
    });
  },
  fetchCurrentZakazAndWriteToXLSX: (sheet_name) => {
    return new Promise(async (resolve, reject) => {
      const auth = await authorize();
      await fetchCurrentZakazAndWriteToXLSX(auth, sheet_name).catch(
        console.error
      );
      resolve();
    });
  },
  exportTZToXlsx: () => {
    return new Promise(async (resolve, reject) => {
      const auth = await authorize();
      await exportTZToXlsx(auth).catch(console.error);
      resolve();
    });
  },
  fetchOTKArtMathcingAndWriteToJSON: () => {
    return new Promise(async (resolve, reject) => {
      const auth = await authorize();
      await fetchOTKArtMathcingAndWriteToJSON(auth).catch(console.error);
      resolve();
    });
  },
};
