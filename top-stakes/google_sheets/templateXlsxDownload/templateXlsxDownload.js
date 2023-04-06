const fs = require('fs').promises;
const path = require('path');
const process = require('process');
const { authenticate } = require('@google-cloud/local-auth');
const { google } = require('googleapis');
const console = require('console');
const xlsx = require('node-xlsx').default;

// If modifying these scopes, delete token.json.
const SCOPES = ['https://www.googleapis.com/auth/spreadsheets'];
// The file token.json stores the user's access and refresh tokens, and is
// created automatically when the authorization flow completes for the first
// time.
const TOKEN_PATH = path.join(__dirname, '../../../secrets/google_api/token.json')
const CREDENTIALS_PATH = path.join(__dirname, '../../../secrets/google_api/credentials.json')

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
        //console.log('Token loaded')
        return google.auth.fromJSON(credentials);
    } catch (err) {
        console.log('Failed to load token')
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

async function getTemplate(auth) {
    const sheets = google.sheets({ version: 'v4', auth });
    const bars = (await sheets.spreadsheets.values.get({
        spreadsheetId: '1ekEPPSkpRsBX1NlyEFTFKQZaK9HC5Xu_ooVLFW9XfVQ',
        range: `Sheet1!A:B`,
    })).data.values;
    const filteredBars = bars.filter(stake => stake.length === 2);
    await fs.writeFile(path.join(__dirname, 'Template.xlsx'), xlsx.build([{ name: 'Sheet1', data: filteredBars }]));
}

module.exports = {
    getTemplate: async () => {
        const auth = await authorize()
        await getTemplate(auth).catch(console.error)
    },
};
