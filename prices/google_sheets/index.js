const fs = require('fs').promises;
const path = require('path');
const { authenticate } = require('@google-cloud/local-auth');
const { google } = require('googleapis');
const console = require('console');
const xlsx = require('node-xlsx').default;

// If modifying these scopes, delete token.json.
const SCOPES = ['https://www.googleapis.com/auth/spreadsheets'];
// The file token.json stores the user's access and refresh tokens, and is
// created automatically when the authorization flow completes for the first
// time.
const TOKEN_PATH = path.join(__dirname, '../../secrets/google_api/token.json')
const CREDENTIALS_PATH = path.join(__dirname, '../../secrets/google_api/credentials.json')

/**
 * Reads previously authorized credentials from the save file.
 *
 * @return {Promise<OAuth2Client|null>}
 */
async function loadSavedCredentialsIfExist() {
    try {
        // const content = await fs.readFile(TOKEN_PATH);
        // const credentials = JSON.parse(content);
        const credentials = require(TOKEN_PATH)
        console.log('Token loaded.')
        return google.auth.fromJSON(credentials);
    } catch (err) {
        console.log('Failed to load token.')
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
        type: 'authorized_user',
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

async function writePrices(auth) {
    const update_data = async (data) => {
        await sheets.spreadsheets.values.update({
            spreadsheetId: '1i8E2dvzA3KKw6eDIec9zDg2idvF6oov4LH7sEdK1zf8',
            range: `Main report!1:1000`,
            valueInputOption: "USER_ENTERED", // The information will be passed according to what the usere passes in as date, number or text
            resource: {
                values: data,
            },
        });
    }

    const data = xlsx.parse(path.join(__dirname, '../data.xlsx'))[0]['data'];
    //console.log(data)
    const sheets = google.sheets({ version: 'v4', auth });
    
    await sheets.spreadsheets.values.clear({
        spreadsheetId: '1i8E2dvzA3KKw6eDIec9zDg2idvF6oov4LH7sEdK1zf8',
        range: `Main report!1:1000`,
    });
    
    await update_data(data)
    console.log(`Prices data written to the google sheets.`)
}

module.exports = async () => {
    const auth = await authorize()
    await writePrices(auth).catch(console.error)
}
