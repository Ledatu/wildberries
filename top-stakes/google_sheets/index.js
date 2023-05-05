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
    //console.log('Token loaded')
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

async function writeStakes(auth) {
  const update_data = async (data) => {
    await sheets.spreadsheets.values.update({
      spreadsheetId: "1Yw4ubonsE7E1YX2rLxEfjccCqnK0BwD_6P6mH2SCysU",
      range: `Terms!A:F`,
      valueInputOption: "USER_ENTERED", // The information will be passed according to what the usere passes in as date, number or text
      resource: {
        values: data,
      },
    });
  };

  const data = xlsx.parse(
    path.join(__dirname, "..", "mp_manager", "files", "gathered_stakes.xlsx")
  )[0]["data"];
  //console.log(data)
  const sheets = google.sheets({ version: "v4", auth });

  await sheets.spreadsheets.values.clear({
    spreadsheetId: "1Yw4ubonsE7E1YX2rLxEfjccCqnK0BwD_6P6mH2SCysU",
    range: `Terms!A:F`,
  });

  await update_data(data);
}

async function updateRow(auth, data) {
  const sheets = google.sheets({ version: "v4", auth });
  const spreadsheetId = "1Yw4ubonsE7E1YX2rLxEfjccCqnK0BwD_6P6mH2SCysU";
  const range = "Terms!A:F";

  // Get the existing data in the sheet
  const response = await sheets.spreadsheets.values.get({
    spreadsheetId,
    range,
  });
  const rows = response.data.values;

  // Find the row with the matching key and update the data
  for (let i = 0; i < rows.length; i++) {
    if (rows[i][0] === data[0]) {
      rows[i] = data;
      break;
    }
  }

  for (let i = rows.length - 1; i > 0; i--) {
    const cur = rows[i].slice(1, 5);
    const prev = rows[i - 1].slice(1, 5);
    if (cur.join() == prev.join()) {
      rows[i] = [rows[i][0]].concat(["", "", "", "", ""]);
    }
  }

  // rows.sort((a, b) => { return b.slice(1, 5).join('') - a.slice(1, 5).join('') })

  await sheets.spreadsheets.values.update({
    spreadsheetId,
    range: range,
    valueInputOption: "USER_ENTERED",
    resource: {
      values: rows,
    },
  });
}

async function getStakes(auth) {
  const sheets = google.sheets({ version: "v4", auth });
  const stakes = (
    await sheets.spreadsheets.values.get({
      spreadsheetId: "1Yw4ubonsE7E1YX2rLxEfjccCqnK0BwD_6P6mH2SCysU",
      range: `Terms!A:F`,
    })
  ).data.values;
  const filteredStakes = stakes.filter((stake) => stake.length === 1);
  fs.writeFile(
    path.join(
      __dirname,
      "..",
      "mp_manager",
      "files",
      "current_google_sheets_data.xlsx"
    ),
    xlsx.build([{ name: "Terms", data: filteredStakes }])
  );
  console.log("Synced.");
}

module.exports = {
  updateRow: async (data) => {
    const auth = await authorize();
    await updateRow(auth, data).catch(console.error);
  },
  writeStakes: async () => {
    const auth = await authorize();
    await writeStakes(auth).catch(console.error);
  },
  getStakes: async () => {
    const auth = await authorize();
    await getStakes(auth).catch(console.error);
  },
};
