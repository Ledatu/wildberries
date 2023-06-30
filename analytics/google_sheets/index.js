const fs = require("fs").promises;
const path = require("path");
const process = require("process");
const { authenticate } = require("@google-cloud/local-auth");
const { google } = require("googleapis");
const console = require("console");
const xlsx = require("node-xlsx").default;

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
    console.log("Token loaded");
    return google.auth.fromJSON(credentials);
  } catch (err) {
    console.log("Failed to load token");
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

async function writeAnalitics(auth, campaign_id, sheet_name) {
  const update_data = async (data, range) => {
    await sheets.spreadsheets.values.update({
      spreadsheetId: "1c1TXMXLWiyxDEFd-kaP6UxE2zlVC3FVXIsBpfp31S4g",
      range: range,
      valueInputOption: "USER_ENTERED", // The information will be passed according to what the usere passes in as date, number or text
      resource: {
        values: data,
      },
    });
  };

  console.log(`Started writing ${campaign_id} data to the google sheets`);
  const analytics = xlsx.parse(`${__dirname}/../files/${campaign_id}.xlsx`)[0][
    "data"
  ];
  //console.log(analytics)
  const sheets = google.sheets({ version: "v4", auth });

  analytics.sort((a, b) => {
    const a1 = a[0].split(" ").slice(1).join(" ");
    const b1 = b[0].split(" ").slice(1).join(" ");
    return (
      ("" + b1).localeCompare(a1) ||
      b.slice(0, 6).filter(String).length - a.slice(0, 6).filter(String).length
    );
  });
  await sheets.spreadsheets.values.clear({
    spreadsheetId: "1c1TXMXLWiyxDEFd-kaP6UxE2zlVC3FVXIsBpfp31S4g",
    range: `${sheet_name}!A3:FY`,
  });
  await update_data(analytics, `${sheet_name}!A3:FY`);

  const pivot = xlsx.parse(`${__dirname}/../files/${campaign_id}.xlsx`)[1][
    "data"
  ];
  pivot.sort((a, b) => {
    const a1 = a[0].split(" ").slice(1).join(" ");
    const b1 = b[0].split(" ").slice(1).join(" ");
    return ("" + b1).localeCompare(a1);
  });
  await sheets.spreadsheets.values.clear({
    spreadsheetId: "1c1TXMXLWiyxDEFd-kaP6UxE2zlVC3FVXIsBpfp31S4g",
    range: `${sheet_name} (свод.)!A3:G`,
  });
  await update_data(pivot, `${sheet_name} (свод.)!A3:G`);
}

function fetchAdsIdsAndWriteToJSON(auth, campaign) {
  return new Promise((resolve, reject) => {
    const sheets = google.sheets({ version: "v4", auth });

    sheets.spreadsheets
      .get({
        spreadsheetId: "1RaTfs-706kXQ21UjuFqVofIcZ7q8-iQLMfmAlYaDYSQ",
        ranges: `${campaign}!1:1`,
        fields: "sheets(data(rowData(values(hyperlink,userEnteredValue))))",
      })
      .then((res) => {
        const rows = res.data.sheets[0].data[0].rowData[0].values;
        // console.log(rows);
        const data = [];
        rows.forEach((row) => {
          if (!Object.keys(row).length) return;
          data.push({
            title: row.userEnteredValue.stringValue,
            id: Object.keys(row).includes("hyperlink")
              ? row.hyperlink.split("/").slice(-1)[0]
              : "",
          });
        });
        // console.log(data);
        writeDataToFile(
          { campaign: campaign, data: data },
          path.join(__dirname, `../files/${campaign}/adsIds.json`)
        ).then((pr) => resolve());
      })
      .catch((err) => {
        console.log(`The API returned an error: ${err}`);
        reject(err);
      });
  });
}

const writeDataToFile = (data, filename) => {
  return fs.writeFile(filename, JSON.stringify(data), (err) => {
    if (err) return console.log(`Error writing file: ${err}`);
    console.log(`Data written to ${filename}`);
  });
};

module.exports = {
  fetchAdsIdsAndWriteToJSON: async (campaign) => {
    const auth = await authorize();
    await fetchAdsIdsAndWriteToJSON(auth, campaign);
  },
  writeAnalitics: async (campaign_id, sheet_name) => {
    console.log("Trying to authenticate...");
    const auth = await authorize();
    console.log("Authentication successful!");
    await writeAnalitics(auth, campaign_id, sheet_name).catch(console.error);
  },
};
