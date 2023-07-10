const fs = require("fs").promises;
const afs = require("fs");
const path = require("path");
const { authenticate } = require("@google-cloud/local-auth");
const { google } = require("googleapis");
const console = require("console");
const { analytics } = require("googleapis/build/src/apis/analytics");
const xlsx = require("node-xlsx").default;

// If modifying these scopes, delete token.json.
const SCOPES = [
  "https://www.googleapis.com/auth/spreadsheets",
  "https://www.googleapis.com/auth/gmail.send",
];
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

async function writePrices(auth, campaign) {
  const update_data = async (data) => {
    await sheets.spreadsheets.values.update({
      spreadsheetId: "1i8E2dvzA3KKw6eDIec9zDg2idvF6oov4LH7sEdK1zf8",
      range: `${campaign}!1:1000`,
      valueInputOption: "USER_ENTERED", // The information will be passed according to what the usere passes in as date, number or text
      resource: {
        values: data,
      },
    });
  };

  const data = xlsx.parse(
    path.join(__dirname, `../files/${campaign}/data.xlsx`)
  )[0]["data"];
  // console.log(data);
  const sheets = google.sheets({ version: "v4", auth });

  await sheets.spreadsheets.values.clear({
    spreadsheetId: "1i8E2dvzA3KKw6eDIec9zDg2idvF6oov4LH7sEdK1zf8",
    range: `${campaign}!1:1000`,
  });

  await update_data(data);
  console.log(`Prices data written to the google sheets.`);
}

async function writeDetailedByPeriod(auth, campaign) {
  return new Promise(async (resolve, reject) => {
    // console.log(campaign);

    const seller_ids = (
      await JSON.parse(
        await fs.readFile(path.join(__dirname, "../files/campaigns.json"))
      )
    ).seller_ids;

    const update_data = async (data) => {
      await sheets.spreadsheets.values.update({
        spreadsheetId: "1U8q5ukJ7WHCM9kNRRPlKRr3Cb3cb8At-bTjZuBOpqRs",
        range: `Данные!G2:G`,
        valueInputOption: "USER_ENTERED", // The information will be passed according to what the usere passes in as date, number or text
        resource: {
          values: data,
        },
      });
    };

    const delivery = JSON.parse(
      await fs.readFile(
        path.join(__dirname, `../files/${campaign}/detailedByPeriod.json`)
      )
    );
    // console.log(data);
    const sheets = google.sheets({ version: "v4", auth });

    const res = await sheets.spreadsheets.values.get({
      spreadsheetId: "1U8q5ukJ7WHCM9kNRRPlKRr3Cb3cb8At-bTjZuBOpqRs",
      range: "Данные!A2:K",
    });

    // Parse the values into a JSON object
    const rows = res.data.values;
    // console.log(rows);
    const data = [];
    for (let i = 0; i < rows.length; i++) {
      const row = rows[i];
      data.push([row[6]]);

      if (row[4] != seller_ids[campaign]) continue;

      const type = row[0].split("_").slice(0, 2).join("_");
      // console.log(type);
      data[i][0] = `${
        delivery[type] ? delivery[type].average_delivery : data[i][0]
      }`.replace(".", ",");
      // console.log(campaign, type, data[i]);
    }

    await update_data(data).then((pr) => resolve());
    console.log(`Delivery data written to the google sheets.`);
  });
}

async function fetchNewPricesAndWriteToJSON(auth, campaign) {
  return new Promise(async (resolve, reject) => {
    const objectFlip = (obj) => {
      const ret = {};
      Object.keys(obj).forEach((key) => {
        ret[obj[key]] = Number(key);
      });
      return ret;
    };

    const sheets = google.sheets({ version: "v4", auth });
    const nmIds = objectFlip(
      JSON.parse(
        await fs.readFile(
          path.join(__dirname, `../files/${campaign}/vendorCodes.json`)
        )
      )
    );

    // console.log(data);
    const res = await sheets.spreadsheets.values.get({
      spreadsheetId: "1i8E2dvzA3KKw6eDIec9zDg2idvF6oov4LH7sEdK1zf8",
      range: `${campaign}!A2:Q`,
    });

    const rows = res.data.values;
    const data = [];
    rows.forEach((row) => {
      const new_price = Number(row[16]);
      if (!new_price || new_price > 20000 || new_price < 4500) return;
      const roi = Number(
        row[13].replace("%", "").replace(",", ".").replace(/\s/g, "")
      );
      if (roi < -30) return;
      data.push({ nmId: nmIds[row[0]], price: new_price });
    });

    writeDataToFile(
      data,
      path.join(__dirname, `../files/${campaign}/newPrices.json`)
    ).then((pr) => resolve());
  });
}

async function fetchDataAndWriteToJSON(auth) {
  try {
    const sheets = google.sheets({ version: "v4", auth });

    // Retrieve the values from the specified range
    const res = await sheets.spreadsheets.values.get({
      spreadsheetId: "1U8q5ukJ7WHCM9kNRRPlKRr3Cb3cb8At-bTjZuBOpqRs",
      range: "Данные!A2:N",
    });

    // Parse the values into a JSON object
    const rows = res.data.values;

    const data = {};
    rows.forEach((row) => {
      data[row[0]] = {
        barcode: row[1],
        multiplicity: Math.abs(Number(row[2] ?? 0)),
        seller_id: row[4],
        commission: Math.abs(
          Number(row[5] ? row[5].replace("%", "").replace(",", ".") : 0)
        ),
        delivery: Math.abs(Number(row[6] ? row[6].replace(",", ".") : 0)),
        tax: Math.abs(
          Number(row[7] ? row[7].replace("%", "").replace(",", ".") : 0)
        ),
        expences: Math.abs(Number(row[8] ? row[8].replace(",", ".") : 0)),
        prime_cost: Math.abs(Number(row[9] ? row[9].replace(",", ".") : 0)),
        spp: Math.abs(
          Number(row[10] ? row[10].replace("%", "").replace(",", ".") : 0)
        ),
        ad: Math.abs(
          Number(row[11] ? row[11].replace("%", "").replace(",", ".") : 0)
        ),
        zakaz_days: Math.abs(
          Number(row[12] ? row[12].replace("%", "").replace(",", ".") : 0)
        ),
        min_zakaz: Math.abs(
          Number(row[13] ? row[13].replace("%", "").replace(",", ".") : 0)
        ),
      };
    });

    writeDataToFile(data, path.join(__dirname, "../files/data.json"));
  } catch (err) {
    console.log(`The API returned an error: ${err}`);
    return null;
  }
}

async function fetchHandStocks(auth, campaign) {
  try {
    const sheets = google.sheets({ version: "v4", auth });
    console.log("Hand stocks taken into account");
    // Retrieve the values from the specified range
    const res = await sheets.spreadsheets.values.get({
      spreadsheetId: "1i8E2dvzA3KKw6eDIec9zDg2idvF6oov4LH7sEdK1zf8",
      range: "Остатки руч.!A2:B",
    });

    // Parse the values into a JSON object
    const rows = res.data.values;
    if (!rows) return {};

    const arts_data = JSON.parse(
      await fs.readFile(path.join(__dirname, "../files/data.json"))
    );
    const seller_ids = (
      await JSON.parse(
        await fs.readFile(path.join(__dirname, "../files/campaigns.json"))
      )
    ).seller_ids;

    const jsonData = {};

    for (const art in arts_data) {
      if (arts_data[art].seller_id != seller_ids[campaign]) continue;
      jsonData[arts_data[art].supplierArticle] = 0;
    }

    for (let i = 0; i < rows.length; i++) {
      const row = rows[i];
      const supplierArticle = row[0].replace(/\s/g, "");
      if (!(supplierArticle in arts_data)) continue;
      if (arts_data[supplierArticle].seller_id != seller_ids[campaign])
        continue;
      jsonData[supplierArticle] = parseInt(row[1]);
    }
    // console.log(jsonData);
    return jsonData;
  } catch (err) {
    console.log(`The API returned an error: ${err}`);
    return null;
  }
}

function fetchEnteredValuesAndWriteToJSON(auth, campaign) {
  return new Promise((resolve, reject) => {
    const sheets = google.sheets({ version: "v4", auth });

    sheets.spreadsheets.values
      .get({
        spreadsheetId: "1i8E2dvzA3KKw6eDIec9zDg2idvF6oov4LH7sEdK1zf8",
        range: `${campaign}!A2:P`,
      })
      .then((res) => {
        const rows = res.data.values;
        // console.log(rows);
        const data = {};
        rows.forEach((row) => {
          if (!row.slice(13).length) return;
          data[row[0]] = {
            roi: Number(
              row[13]
                ? row[13].replace("%", "").replace(",", ".").replace(/\s/g, "")
                : 0
            ),
            roz_price: Number(
              row[14]
                ? row[14].replace("%", "").replace(",", ".").replace(/\s/g, "")
                : 0
            ),
            spp_price: Number(
              row[15]
                ? row[15].replace("%", "").replace(",", ".").replace(/\s/g, "")
                : 0
            ),
          };
        });

        writeDataToFile(
          data,
          path.join(__dirname, `../files/${campaign}/enteredValues.json`)
        ).then((pr) => resolve());
      })
      .catch((err) => {
        console.log(`The API returned an error: ${err}`);
        reject(err);
      });
  });
}

function fetchAnalyticsLastWeekValuesAndWriteToJSON(auth, campaign) {
  return new Promise((resolve, reject) => {
    if (campaign == "TKS") {
      writeDataToFile(
        {},
        path.join(__dirname, `../files/${campaign}/analytics.json`)
      ).then((pr) => resolve());
      return;
    }

    const sheets = google.sheets({ version: "v4", auth });
    data = {};
    sheets.spreadsheets.values
      .get({
        spreadsheetId: "1c1TXMXLWiyxDEFd-kaP6UxE2zlVC3FVXIsBpfp31S4g",
        range: `${campaign}!A3:AW`,
      })
      .then((res) => {
        const rows = res.data.values;
        // console.log(rows);
        for (row of rows) {
          const mask = row[0].split(" ")[1];
          // if (mask == "НАМАТРАСНИК_120") {
          //   console.log(row, mask);
          // }
          if (!mask) return;
          const days = 8;
          const stats = [0, 0, 0, 0, 0, 0];
          for (let day = 1; day < days; day++) {
            for (let i = 0; i < 6; i++) {
              let val = row[1 + day * 6 + i];
              val = Number(val ? val.replace(",", ".").replace(/\s/g, "") : 0);
              if (i == 1 || i == 3 || i == 5) val /= days - 1;
              stats[i] += val;
            }
          }
          data[mask] = {
            rashod: stats[0],
            crm: stats[1],
            clicks: stats[2],
            srs: stats[3],
          };
        }
        writeDataToFile(
          data,
          path.join(__dirname, `../files/${campaign}/analytics.json`)
        ).then((pr) => resolve());
      });
  }).catch((err) => {
    console.log(`The API returned an error: ${err}`);
    reject(err);
  });
}

function updateAnalyticsOrders(auth, campaign) {
  return new Promise(async (resolve, reject) => {
    const orders = await JSON.parse(
      await fs.readFile(
        path.join(__dirname, "../files", campaign, "orders by day.json")
      )
    );

    const sum_orders = await JSON.parse(
      await fs.readFile(
        path.join(__dirname, "../files", campaign, "sum of orders by day.json")
      )
    );

    const adverts = await JSON.parse(
      await fs.readFile(
        path.join(__dirname, "../files", campaign, "adsIds.json")
      )
    );

    const advertsCreateDate = await JSON.parse(
      await fs.readFile(
        path.join(__dirname, "../files", campaign, "adverts.json")
      )
    );

    const sheets = google.sheets({ version: "v4", auth });
    sheets.spreadsheets.values
      .get({
        spreadsheetId: "1RaTfs-706kXQ21UjuFqVofIcZ7q8-iQLMfmAlYaDYSQ",
        range: `${campaign}!1:1000`,
      })
      .then(async (res) => {
        const data = {};

        const rows = res.data.values;
        const masks = rows[0].filter(String);
        const columns = {};
        for (let i = 1; i < rows[1].length; i++) {
          if (!(rows[1][i] in columns)) columns[rows[1][i]] = [];
          columns[rows[1][i]].push(i);
        }
        // console.log(masks, columns);

        for (const mask in masks) {
          // console.log(mask);
          data[masks[mask]] = {};
          for (const day in orders) {
            data[masks[mask]][day] = {
              shows: 0,
              clicks: 0,
              ctr: 0,
              crc: 0,
              crm: 0,
              rashod: 0,
              orders: 0,
              sum_orders: 0,
              drr: 0,
            };
            for (const art in orders[day]) {
              if (art.includes(masks[mask])) {
                // console.log(masks[mask], day, art, orders[day][art]);
                data[masks[mask]][day].orders += orders[day][art];
                data[masks[mask]][day].sum_orders += sum_orders[day][art];
              }
            }
          }
        }
        // console.log(data);
        const days = Object.keys(orders).reverse();
        // console.log(days);
        const temp = {};
        const pivot = {};
        const sheet_data = rows.slice(2);
        // console.log(sheet_data);
        for (let i = 0; i < sheet_data.length; i++) {
          let maskValuesStrartIndex = 0;
          for (const mask in data) {
            // console.log(mask);
            const mainDlDir = path.join(
              __dirname,
              "../../analytics/files",
              campaign,
              mask
            );

            // console.log(i, sheet_data.length, mainDlDir);

            let st = sheet_data[i][0];
            if (!st) {
              // console.log(st, "con");
              continue;
            }
            // console.log(st);
            const date = st;
            st = st.replace(/(\d{2})\.(\d{2})\.(\d{4})/, "$3-$2-$1");

            if (new Date(st) < new Date(advertsCreateDate[adverts[mask]])) {
              // console.log(
              //   campaign,
              //   new Date(st),
              //   new Date(advertsCreateDate[adverts[mask]])
              // );
              continue;
            }

            const analytics_data = afs.existsSync(
              path.join(mainDlDir, `${date}.xlsx`)
            )
              ? xlsx
                  .parse(path.join(mainDlDir, `${date}.xlsx`))[0]
                  .data.slice(-1)[0]
              : [0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0];

            // console.log(mainDlDir, analytics_data);
            const maskStat = {
              shows: parseInt(String(analytics_data[2]).replace(/\s/g, "")),
              clicks: parseInt(String(analytics_data[3]).replace(/\s/g, "")),
              ctr: 0,
              crc: 0,
              crm: 0,
              rashod: parseInt(String(analytics_data[9]).replace(/\s/g, "")),
              orders: 0,
              sum_orders: 0,
              drr: 0,
            };
            if (!(mask in temp)) temp[mask] = {};
            temp[mask][st] = maskStat;
            maskValuesStrartIndex += 1;
            if (!(st in data[mask])) {
              continue;
            }
            temp[mask][st].orders = data[mask.split(/\s/)[0]][st].orders;
            temp[mask][st].sum_orders =
              data[mask.split(/\s/)[0]][st].sum_orders;
            temp[mask][st].ctr = temp[mask][st].clicks / temp[mask][st].shows;
            temp[mask][st].crc = temp[mask][st].rashod / temp[mask][st].clicks;
            temp[mask][st].crm =
              temp[mask][st].rashod / (temp[mask][st].shows / 1000);
            temp[mask][st].drr =
              temp[mask][st].rashod / temp[mask][st].sum_orders;
            // console.log(mask, st, temp[mask][st]);
            // console.log(temp[mask][st]);
            if (!(st in pivot))
              pivot[st] = {
                day: new Date(st).toLocaleString("ru-RU", { weekday: "short" }),
                rashod: 0,
                orders: orders[st][""] ?? 0,
                sum_orders: sum_orders[st][""] ?? 0,
                drr: 0,
              };
            pivot[st].rashod += temp[mask][st].rashod;
            pivot[st].orders += temp[mask][st].orders;
            pivot[st].sum_orders += temp[mask][st].sum_orders;
            pivot[st].drr = pivot[st].rashod / pivot[st].sum_orders;
          }
        }
        // console.log(pivot);
        // return;
        for (let i = 0; i < days.length; i++) {
          for (const j in masks) {
            if (!sheet_data[i]) {
              // sheet_data.push(145);
              sheet_data.push(sheet_data[0].length);
            }
            let st = days[i];
            if (!st) {
              sheet_data[i] = [];
              continue;
            }
            // st = st.replace(/(\d{2})\.(\d{2})\.(\d{4})/, "$3-$2-$1");
            sheet_data[i][0] = st;
            maskValuesStrartIndex = 0;
            // console.log(st, temp[masks[j]][st]);
            if (temp[masks[j]] && temp[masks[j]][st]) {
              for (const [key, value] of Object.entries(temp[masks[j]][st])) {
                // console.log(Object.entries(temp[masks[j]][st]));
                // console.log(masks[j], j, [
                //   1 +
                //     j * Object.keys(temp[masks[j]][st]).length +
                //     maskValuesStrartIndex
                // ], temp[masks[j]][st], `${key}: ${value}`);
                sheet_data[i][
                  1 +
                    j * Object.keys(temp[masks[j]][st]).length +
                    maskValuesStrartIndex
                ] = value;
                maskValuesStrartIndex += 1;
              }
            } else {
              sheet_data[i] = Array(sheet_data[0].length);
              sheet_data[i][0] = st;
              for (const column in columns["Заказы"]) {
                // console.log(i, [columns["Заказы"][column]]);
                sheet_data[i][columns["Заказы"][column]] =
                  data[masks[j]][st].orders;
              }
              for (const column in columns["Сумма"]) {
                // console.log(i, [columns["Заказы"][column]]);
                sheet_data[i][columns["Сумма"][column]] =
                  data[masks[j]][st].sum_orders;
              }
              // console.log(st, sheet_data[i])
            }
            // console.log(sheet_data[i]);
          }
        }
        if (!sheet_data.slice(-1)[0][0]) sheet_data.pop();
        // console.log(sheet_data.slice(-1)[0][0]);
        // return;
        sheets.spreadsheets.values
          .clear({
            spreadsheetId: "1RaTfs-706kXQ21UjuFqVofIcZ7q8-iQLMfmAlYaDYSQ",
            range: `${campaign}!3:1000`,
          })
          .then((pr) =>
            sheets.spreadsheets.values
              .update({
                spreadsheetId: "1RaTfs-706kXQ21UjuFqVofIcZ7q8-iQLMfmAlYaDYSQ",
                range: `${campaign}!3:1000`,
                valueInputOption: "USER_ENTERED", // The information will be passed according to what the usere passes in as date, number or text
                resource: {
                  values: sheet_data,
                },
              })
              .then((pr) => {
                const pivot_sheet = [];
                const blankCells = {
                  mayusha: 0,
                  delicatus: 4,
                  TKS: 8,
                };
                for (const st in pivot) {
                  const row = [st, pivot[st].day];
                  for (let b = 0; b < blankCells[campaign]; b++) {
                    row.push(undefined);
                  }
                  row.push(pivot[st].rashod);
                  row.push(pivot[st].orders);
                  row.push(pivot[st].sum_orders);
                  row.push(pivot[st].drr);

                  // console.log(row);
                  pivot_sheet.push(row);
                }
                // console.log(pivot_sheet);
                sheets.spreadsheets.values
                  .clear({
                    spreadsheetId:
                      "1RaTfs-706kXQ21UjuFqVofIcZ7q8-iQLMfmAlYaDYSQ",
                    range: `Сводный РК!3:1000`,
                  })
                  .then((pr) =>
                    sheets.spreadsheets.values
                      .update({
                        spreadsheetId:
                          "1RaTfs-706kXQ21UjuFqVofIcZ7q8-iQLMfmAlYaDYSQ",
                        range: `Сводный РК!3:1000`,
                        valueInputOption: "USER_ENTERED", // The information will be passed according to what the usere passes in as date, number or text
                        resource: {
                          values: pivot_sheet,
                        },
                      })
                      .then((pr) => resolve())
                      .catch((err) => reject(err))
                  );
              })
              .catch((err) => reject(err))
          );
      })
      .catch((err) => {
        console.log(`The API returned an error: ${err}`);
        reject(err);
      });
  });
}

// Define the function to write data to a JSON file
const writeDataToFile = (data, filename) => {
  return fs.writeFile(filename, JSON.stringify(data), (err) => {
    if (err) return console.log(`Error writing file: ${err}`);
    console.log(`Data written to ${filename}`);
  });
};

async function copyPricesToDataSpreadsheet(auth) {
  return new Promise(async (resolve, reject) => {
    const sourceSpreadsheetId = "1ShAelY_Xi50Au2Ij7PvK0QhfwKmRFdI0Yqthx-I_JbQ";
    const destinationSpreadsheetId =
      "1U8q5ukJ7WHCM9kNRRPlKRr3Cb3cb8At-bTjZuBOpqRs";

    const sheets = google.sheets({ version: "v4", auth });
    const update_data = async (data) => {
      await sheets.spreadsheets.values.update({
        spreadsheetId: destinationSpreadsheetId,
        range: `Данные!J2:J`,
        valueInputOption: "USER_ENTERED", // The information will be passed according to what the usere passes in as date, number or text
        resource: {
          values: data,
        },
      });
    };
    const prices_rows = (
      await sheets.spreadsheets.values.get({
        spreadsheetId: sourceSpreadsheetId,
        range: `ЦЕНЫ+ШК!D2:F`,
      })
    ).data.values;

    const prices = {};
    prices_rows.forEach((row) => {
      if (!row[0]) return;
      prices[row[0]] = Number(row[2]);
    });

    // console.log(prices);

    const data_rows = (
      await sheets.spreadsheets.values.get({
        spreadsheetId: destinationSpreadsheetId,
        range: `Данные!A2:A`,
      })
    ).data.values;

    const data = [];
    data_rows.forEach((row) => {
      let regex = row[0].split("_").slice(0, 2).join("_");
      if (row[0].includes("КПБ")) {
        if (row[0].includes("СТРАЙП")) regex += "_СТРАЙП";
        if (row[0].includes("МОНТЕ")) regex += "_МОНТЕ";
      }
      if (row[0].includes("НАМАТРАСНИК")) {
        regex += "_ОТК";
      }
      if (row[0].includes("ТКС")) {
        regex += "_ТКС";
      }
      // console.log(regex, prices[regex]);
      data.push([prices[regex]]);
    });

    await update_data(data).then((pr) => resolve());
  });
}

async function copyZakazToOtherSpreadsheet(auth) {
  const sourceSpreadsheetId = "1i8E2dvzA3KKw6eDIec9zDg2idvF6oov4LH7sEdK1zf8";
  const destinationSpreadsheetId =
    "1ShAelY_Xi50Au2Ij7PvK0QhfwKmRFdI0Yqthx-I_JbQ";

  const sheets = google.sheets({ version: "v4", auth });
  const update_data = async (sheet, data) => {
    await sheets.spreadsheets.values.update({
      spreadsheetId: destinationSpreadsheetId,
      range: `${sheet}!A2:B`,
      valueInputOption: "USER_ENTERED", // The information will be passed according to what the usere passes in as date, number or text
      resource: {
        values: data,
      },
    });
  };
  const get_data = async (sheet) => {
    const rows = (
      await sheets.spreadsheets.values.get({
        spreadsheetId: sourceSpreadsheetId,
        range: `${sheet}!A2:B`,
      })
    ).data.values;

    const data = [];
    rows.forEach((row) => {
      // TODO: Delete after all old arts are gone
      if (row[1] > 0) {
        const array = row[0].split("_");
        if (array[0] == "ПР" || array[0] == "ПРПЭ") {
          if (array[1] == "120" || array[1] == "140" || array[1] == "180") {
            if (array.slice(-1)[0] != "2") return;
          }
        }
        data.push([row[0], row[1]]);
      }
    });
    return data;
  };

  const sourceSheets = await sheets.spreadsheets.get({
    auth,
    spreadsheetId: sourceSpreadsheetId,
    fields: "sheets(properties(title,sheetId))",
  });
  const destinationSheets = await sheets.spreadsheets.get({
    auth,
    spreadsheetId: destinationSpreadsheetId,
    fields: "sheets(properties(title,sheetId))",
  });

  const templateSheetId = destinationSheets.data.sheets.find(
    (sheet) => sheet.properties.title === "template"
  ).properties.sheetId;

  for (const sourceSheet of sourceSheets.data.sheets) {
    try {
      const title = sourceSheet.properties.title;
      if (title == "Остатки руч.") continue;
      const oldSheet = destinationSheets.data.sheets.find(
        (sheet) => sheet.properties.title === title
      );
      if (oldSheet) {
        const oldSheetId = oldSheet.properties.sheetId;
        await sheets.spreadsheets.batchUpdate({
          spreadsheetId: destinationSpreadsheetId,
          resource: {
            requests: [
              {
                deleteSheet: {
                  sheetId: oldSheetId,
                },
              },
            ],
          },
        });
      }

      await sheets.spreadsheets.batchUpdate({
        spreadsheetId: destinationSpreadsheetId,
        resource: {
          requests: [
            {
              duplicateSheet: {
                sourceSheetId: templateSheetId,
                insertSheetIndex: 1,
                newSheetName: title,
              },
            },
          ],
        },
      });
      await update_data(title, await get_data(title));
    } catch (err) {
      console.error(err);
    }
  }
}

async function sendEmail(auth, to, subject, body) {
  const gmail = google.gmail({ version: "v1", auth });

  // Encode the subject as UTF-8
  const encodedSubject = Buffer.from(subject, "utf-8").toString("base64");

  // Create the message object
  const message = {
    raw: `To: ${to}\nSubject: =?utf-8?B?${encodedSubject}?=\nContent-Type: text/plain; charset="utf-8"\n\n${body}`,
  };

  // Send the email
  try {
    const response = await gmail.users.messages.send({
      userId: "me",
      requestBody: {
        raw: Buffer.from(message.raw).toString("base64"),
      },
    });
    console.log(`Email sent successfully: ${response.data}`);
  } catch (error) {
    console.error(`Error sending email: ${error}`);
  }
}

module.exports = {
  writePrices: async (campaign) => {
    const auth = await authorize();
    await writePrices(auth, campaign).catch(console.error);
  },
  writeDetailedByPeriod: async (campaign) => {
    const auth = await authorize();
    await writeDetailedByPeriod(auth, campaign).catch(console.error);
  },
  fetchDataAndWriteToJSON: async () => {
    const auth = await authorize();
    await fetchDataAndWriteToJSON(auth).catch(console.error);
  },
  fetchHandStocks: async (campaign) => {
    const auth = await authorize();
    return await fetchHandStocks(auth, campaign).catch(console.error);
  },
  fetchNewPricesAndWriteToJSON: async (campaign) => {
    const auth = await authorize();
    await fetchNewPricesAndWriteToJSON(auth, campaign).catch(console.error);
  },
  fetchEnteredValuesAndWriteToJSON: async (campaign) => {
    const auth = await authorize();
    await fetchEnteredValuesAndWriteToJSON(auth, campaign).catch(console.error);
  },
  fetchAnalyticsLastWeekValuesAndWriteToJSON: async (campaign) => {
    const auth = await authorize();
    await fetchAnalyticsLastWeekValuesAndWriteToJSON(auth, campaign).catch(
      console.error
    );
  },
  updateAnalyticsOrders: async (campaign) => {
    const auth = await authorize();
    await updateAnalyticsOrders(auth, campaign).catch(console.error);
  },
  copyPricesToDataSpreadsheet: async () => {
    const auth = await authorize();
    await copyPricesToDataSpreadsheet(auth).catch(console.error);
  },
  copyZakazToOtherSpreadsheet: async () => {
    const auth = await authorize();
    await copyZakazToOtherSpreadsheet(auth).catch(console.error);
  },
  sendEmail: async (to, subject, body) => {
    const auth = await authorize();
    await sendEmail(auth, to, subject, body).catch(console.error);
  },
};
