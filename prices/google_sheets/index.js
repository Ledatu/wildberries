const fs = require("fs").promises;
const afs = require("fs");
const path = require("path");
const { authenticate } = require("@google-cloud/local-auth");
const { google } = require("googleapis");
const console = require("console");
const { analytics } = require("googleapis/build/src/apis/analytics");
const { kMaxLength } = require("buffer");
const { json } = require("express");
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
  const sheets = google.sheets({ version: "v4", auth });
  const brands = await JSON.parse(
    await fs.readFile(path.join(__dirname, "../files", "campaigns.json"))
  ).brands[campaign];
  const update_data = async (data, brand) => {
    await sheets.spreadsheets.values.update({
      spreadsheetId: "1i8E2dvzA3KKw6eDIec9zDg2idvF6oov4LH7sEdK1zf8",
      range: `${brand}!1:1000`,
      valueInputOption: "USER_ENTERED", // The information will be passed according to what the usere passes in as date, number or text
      resource: {
        values: data,
      },
    });
  };

  const xlsx_data = xlsx.parse(
    path.join(__dirname, `../files/${campaign}/data.xlsx`)
  );
  const json_data = {};
  for (let i = 0; i < xlsx_data.length; i++) {
    json_data[xlsx_data[i].name] = xlsx_data[i].data;
  }
  for (const [brand, sheet_data] of Object.entries(json_data)) {
    // console.log(campaign, brand, sheet_data[0]);
    await sheets.spreadsheets.values.clear({
      spreadsheetId: "1i8E2dvzA3KKw6eDIec9zDg2idvF6oov4LH7sEdK1zf8",
      range: `${brand}!1:1000`,
    });
    // console.log(brand, sheet_data);
    await update_data(sheet_data, brand);
  }
  // console.log(data);

  console.log(`Prices data written to the google sheets.`);
}

async function writeDetailedByPeriod(auth, campaign) {
  const sheets = google.sheets({ version: "v4", auth });
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
        path.join(__dirname, `../files/${campaign}/logistics.json`)
      )
    );
    const arts = readIfExists(
      path.join(__dirname, "../files", campaign, "artsBarcodesFull.json")
    );
    const useEnteredDeliveryPrice = Object.keys(delivery).length == 0;
    if (useEnteredDeliveryPrice) {
      console.log("Fetching entered delivery for", campaign);

      const enteredDeliveryPriceRes = await sheets.spreadsheets.values.get({
        spreadsheetId: "1U8q5ukJ7WHCM9kNRRPlKRr3Cb3cb8At-bTjZuBOpqRs",
        range: "Логистика по умолчанию!A2:B",
      });

      // Parse the values into a JSON object
      const enteredDeliveryPriceRows = enteredDeliveryPriceRes.data.values;

      enteredDeliveryPriceRows.forEach((row) => {
        const mask = row[0];
        if (!mask || mask == "") return;
        delivery[mask] = { average_delivery: row[1] };
      });
    }

    const drr = JSON.parse(
      await fs.readFile(
        path.join(__dirname, `../files/${campaign}/avgDrrByMask.json`)
      )
    );
    // console.log(data);

    const res = await sheets.spreadsheets.values.get({
      spreadsheetId: "1U8q5ukJ7WHCM9kNRRPlKRr3Cb3cb8At-bTjZuBOpqRs",
      range: "Данные!A2:L",
    });

    // Parse the values into a JSON object
    const rows = res.data.values;
    // console.log(rows);
    const data = [];
    for (let i = 0; i < rows.length; i++) {
      const row = rows[i];
      data.push([row[6]]);

      if (row[4] != seller_ids[campaign]) continue;

      const art = row[0];
      if (!arts[art]) continue;
      let type = "";
      if (!useEnteredDeliveryPrice) {
        // type = getMaskFromVendorCode(art).slice(0, 2);
        // type = art.split("_")[0];
        type = arts[art].brand_art;
      } else {
        // type = getMaskFromVendorCode(art).slice(0, 2);
        type = art.split("_")[0];
        // console.log(type, delivery[type]);

        // const type = getMaskFromVendorCode(art);
        if (art.includes("_ЕН")) {
          type += "_ЕН";
        }
      }
      // console.log(
      //   art,
      //   type,
      //   `${
      //     delivery[type]
      //       ? delivery[type].average_delivery
      //       : art.includes("_ЕН")
      //       ? "150"
      //       : "50"
      //   }`.replace(".", ",")
      // );

      // data[i][0] = `${
      //   delivery[art]
      //     ? delivery[art].average_delivery
      //     : delivery[type]
      //     ? delivery[type].average_delivery
      //     : "50"
      // }`.replace(".", ",");
      data[i][0] = `${
        delivery[type] ? delivery[type].avg : art.includes("_ЕН") ? "150" : "50"
      }`.replace(".", ",");
      // console.log(campaign, type, data[i]);
    }

    await update_data(data).then((pr) => resolve());
    console.log(`Delivery data written to the google sheets.`);
  });
}

async function writeDrrToDataSpreadsheet(auth) {
  return new Promise(async (resolve, reject) => {
    const seller_ids = (
      await JSON.parse(
        await fs.readFile(path.join(__dirname, "../files/campaigns.json"))
      )
    ).seller_ids;

    const update_data = async (data) => {
      await sheets.spreadsheets.values.update({
        spreadsheetId: "1U8q5ukJ7WHCM9kNRRPlKRr3Cb3cb8At-bTjZuBOpqRs",
        range: `Данные!L2:L`,
        valueInputOption: "USER_ENTERED", // The information will be passed according to what the usere passes in as date, number or text
        resource: {
          values: data,
        },
      });
    };

    // console.log(data);
    const sheets = google.sheets({ version: "v4", auth });
    await sheets.spreadsheets.values.clear({
      spreadsheetId: "1U8q5ukJ7WHCM9kNRRPlKRr3Cb3cb8At-bTjZuBOpqRs",
      range: "Данные!L2:L",
    });

    const res = await sheets.spreadsheets.values.get({
      spreadsheetId: "1U8q5ukJ7WHCM9kNRRPlKRr3Cb3cb8At-bTjZuBOpqRs",
      range: "Данные!A2:L",
    });

    // Parse the values into a JSON object
    const rows = res.data.values;
    // console.log(rows);
    const data = [];
    for (let i = 0; i < rows.length; i++) {
      for (const [campaign, seller_id] of Object.entries(seller_ids)) {
        const drr = JSON.parse(
          await fs.readFile(
            path.join(__dirname, `../files/${campaign}/avgDrrByMask.json`)
          )
        );
        const artsBarcodesFull = await JSON.parse(
          await fs.readFile(
            path.join(__dirname, "../files", campaign, "artsBarcodesFull.json")
          )
        );

        const row = rows[i];
        if (row[0] == "") continue;
        data.push([row[11]]);

        if (row[4] != seller_ids[campaign]) continue;
        if (!artsBarcodesFull[row[0]]) continue;

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
        // console.log(row[0]);
        const type = brand_names[artsBarcodesFull[row[0]].brand];
        // const type = getMaskFromVendorCode(row[0]);
        // const type = getMaskFromVendorCode(row[0]).slice(0, 2);
        // console.log(type);
        data[i][0] = drr[type] ? drr[type].drr ?? 0 : 0;
        // console.log(campaign, type, data[i]);
      }
    }

    await update_data(data).then((pr) => resolve());
    console.log(`Drr data written to the google sheets.`);
  });
}

async function writeLogisticsToDataSpreadsheet(auth) {
  return new Promise(async (resolve, reject) => {
    const mapp = {
      mayusha: "ИП Валерий",
      delicatus: "ИП Артем",
      TKS: "Текстиль",
      perinka: "ИП Оксана",
    };

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

    // console.log(data);
    const sheets = google.sheets({ version: "v4", auth });
    await sheets.spreadsheets.values.clear({
      spreadsheetId: "1U8q5ukJ7WHCM9kNRRPlKRr3Cb3cb8At-bTjZuBOpqRs",
      range: "Данные!G2:G",
    });

    const res = await sheets.spreadsheets.values.get({
      spreadsheetId: "1U8q5ukJ7WHCM9kNRRPlKRr3Cb3cb8At-bTjZuBOpqRs",
      range: "Данные!A2:G",
    });

    // Parse the values into a JSON object
    const rows = res.data.values;
    // console.log(rows);
    const data = [];
    for (const [campaign, seller_id] of Object.entries(seller_ids)) {
      const logistics = readIfExists(
        path.join(__dirname, `../files/${campaign}/logistics.json`)
      );
      const arts = readIfExists(
        path.join(
          __dirname,
          `../marketMaster/332fa5da-8450-451a-b859-a84ca9951a34/${mapp[campaign]}/arts.json`
        )
      );

      for (let i = 0; i < rows.length; i++) {
        const row = rows[i];
        if (row[0] == "") continue;
        data.push([row[10]]);

        if (row[4] != seller_ids[campaign]) continue;
        if (!arts.byArt[row[0]]) continue;
        // const brand_art = arts.byArt[row[0]].brand_art;
        // const brand_art = arts.byArt[row[0]].art;

        const res = { delivery: 0, orders: 0 };

        const sizes = arts.byNmId[arts.byArt[row[0]].nmId].sizes;
        // console.log(sizes);
        for (let i = 0; i < sizes.length; i++) {
          const sku = sizes[i].skus[0];
          const local_art = arts.bySku[sku].art;
          res.delivery += logistics[local_art]
            ? logistics[local_art].delivery ?? 50
            : 50;
          res.orders += logistics[local_art]
            ? logistics[local_art].orders ?? 1
            : 1;
          // console.log(logistics[local_art]);
        }
        // console.log(res);

        // if (row[0] == "ПР_120_БЕЛЫЙ_ОТК") console.log(findLastSaleSpp(row[0]));
        // console.log(type, spp[type]);
        data[i][0] = getRoundValue(res.delivery, res.orders);
        // console.log(
        //   campaign,
        //   type,
        //   data[i],
        //   spp[type],
        //   spp.prev,
        //   spp[type] ?? spp.prev
        // );
      }
    }

    await update_data(data).then((pr) => resolve());
    console.log(`Logistics data written to the google sheets.`);
  });
}

async function writeSppToDataSpreadsheet(auth) {
  return new Promise(async (resolve, reject) => {
    const mapp = {
      mayusha: "ИП Валерий",
      delicatus: "ИП Артем",
      TKS: "Текстиль",
      perinka: "ИП Оксана",
    };

    const seller_ids = (
      await JSON.parse(
        await fs.readFile(path.join(__dirname, "../files/campaigns.json"))
      )
    ).seller_ids;

    const update_data = async (data) => {
      await sheets.spreadsheets.values.update({
        spreadsheetId: "1U8q5ukJ7WHCM9kNRRPlKRr3Cb3cb8At-bTjZuBOpqRs",
        range: `Данные!K2:K`,
        valueInputOption: "USER_ENTERED", // The information will be passed according to what the usere passes in as date, number or text
        resource: {
          values: data,
        },
      });
    };

    // console.log(data);
    const sheets = google.sheets({ version: "v4", auth });
    await sheets.spreadsheets.values.clear({
      spreadsheetId: "1U8q5ukJ7WHCM9kNRRPlKRr3Cb3cb8At-bTjZuBOpqRs",
      range: "Данные!K2:K",
    });

    const res = await sheets.spreadsheets.values.get({
      spreadsheetId: "1U8q5ukJ7WHCM9kNRRPlKRr3Cb3cb8At-bTjZuBOpqRs",
      range: "Данные!A2:K",
    });

    // Parse the values into a JSON object
    const rows = res.data.values;
    // console.log(rows);
    const data = [];
    for (const [campaign, seller_id] of Object.entries(seller_ids)) {
      // const sales = JSON.parse(
      //   await fs.readFile(
      //     path.join(
      //       __dirname,
      //       `../marketMaster/332fa5da-8450-451a-b859-a84ca9951a34/${mapp[campaign]}/sales.json`
      //     )
      //   )
      // );
      const sppData = readIfExists(
        path.join(
          __dirname,
          `../marketMaster/332fa5da-8450-451a-b859-a84ca9951a34/${mapp[campaign]}/sppData.json`
        )
      );
      const arts = JSON.parse(
        await fs.readFile(
          path.join(
            __dirname,
            `../marketMaster/332fa5da-8450-451a-b859-a84ca9951a34/${mapp[campaign]}/arts.json`
          )
        )
      );

      const findLastSaleSpp = (art) => {
        if (!arts.byArt[art]) return undefined;
        let res = sales[art]
          ? sales[art].avg
            ? sales[art].avg.spp ?? undefined
            : undefined
          : undefined;
        if (!res) {
          const byObj = sales.byObject[arts.byArt[art].object];
          // console.log(arts.byArt[art].object, byObj);
          res = byObj ? byObj.avg.spp : undefined;
        }
        return res;
      };

      for (let i = 0; i < rows.length; i++) {
        const row = rows[i];
        if (row[0] == "") continue;
        data.push([row[10]]);

        if (row[4] != seller_ids[campaign]) continue;
        if (!arts.byArt[row[0]]) continue;

        // if (row[0] == "ПР_120_БЕЛЫЙ_ОТК") console.log(findLastSaleSpp(row[0]));
        // console.log(type, spp[type]);
        // data[i][0] = findLastSaleSpp(row[0]);
        data[i][0] = sppData[arts.byArt[row[0]].brand_art]
          ? sppData[arts.byArt[row[0]].brand_art].spp ?? 0
          : 0;
        // console.log(
        //   campaign,
        //   type,
        //   data[i],
        //   spp[type],
        //   spp.prev,
        //   spp[type] ?? spp.prev
        // );
      }
    }

    await update_data(data).then((pr) => resolve());
    console.log(`Spp data written to the google sheets.`);
  });
}

async function calcAndWriteMinZakazToDataSpreadsheet(auth) {
  return new Promise(async (resolve, reject) => {
    const seller_ids = (
      await JSON.parse(
        await fs.readFile(path.join(__dirname, "../files/campaigns.json"))
      )
    ).seller_ids;
    const arts_data = await JSON.parse(
      await fs.readFile(path.join(__dirname, "../files/data.json"))
    );

    const orders = {};
    for (const [campaign, seller_id] of Object.entries(seller_ids)) {
      orders[seller_id] = await JSON.parse(
        await fs.readFile(
          path.join(__dirname, "../files", campaign, "orders by day.json")
        )
      );
    }

    const update_data = async (data) => {
      await sheets.spreadsheets.values.update({
        spreadsheetId: "1U8q5ukJ7WHCM9kNRRPlKRr3Cb3cb8At-bTjZuBOpqRs",
        range: `Данные!N2:N`,
        valueInputOption: "USER_ENTERED", // The information will be passed according to what the usere passes in as date, number or text
        resource: {
          values: data,
        },
      });
    };

    // console.log(data);
    const sheets = google.sheets({ version: "v4", auth });
    await sheets.spreadsheets.values.clear({
      spreadsheetId: "1U8q5ukJ7WHCM9kNRRPlKRr3Cb3cb8At-bTjZuBOpqRs",
      range: "Данные!N2:N",
    });

    const res = await sheets.spreadsheets.values.get({
      spreadsheetId: "1U8q5ukJ7WHCM9kNRRPlKRr3Cb3cb8At-bTjZuBOpqRs",
      range: "Данные!A2:N",
    });

    const calc_min_zakaz = (art, seller_id) => {
      let max_zakaz = 0;
      if (orders[seller_id])
        for (const [date, date_data] of Object.entries(orders[seller_id])) {
          max_zakaz = Math.max(max_zakaz, date_data[art]);
        }
      console.log(art, max_zakaz);
      if (!max_zakaz) return art.includes("ФТБЛ") ? 1 : 1;
      return Math.ceil(
        (Math.ceil(max_zakaz / 2) * arts_data[art].pref_obor) /
          arts_data[art].multiplicity
      );
    };

    // Parse the values into a JSON object
    const rows = res.data.values;
    // console.log(rows);
    const data = [];
    for (let i = 0; i < rows.length; i++) {
      const row = rows[i];
      const art = row[0];
      if (art == "") continue;
      const seller_id = row[4];
      data.push([calc_min_zakaz(art, seller_id)]);
    }

    await update_data(data).then((pr) => resolve());
    console.log(`Min zakaz data written to the google sheets.`);
  });
}

async function pivotOrders(auth, campaign) {
  return new Promise(async (resolve, reject) => {
    // console.log(campaign);

    const update_data = async (data) => {
      await sheets.spreadsheets.values.update({
        spreadsheetId: "1I-hG_-dVdKusrSVXQYZrYjLWDEGLOg6ustch-AvlWHg",
        range: `Заказы Маюша!3:1000`,
        valueInputOption: "USER_ENTERED", // The information will be passed according to what the usere passes in as date, number or text
        resource: {
          values: data,
        },
      });
    };

    const vendorCodes = JSON.parse(
      await fs.readFile(
        path.join(__dirname, `../files/${campaign}/vendorCodes.json`)
      )
    );
    const orders = JSON.parse(
      await fs.readFile(
        path.join(__dirname, `../files/${campaign}/orders by day.json`)
      )
    );
    const sum_orders = JSON.parse(
      await fs.readFile(
        path.join(__dirname, `../files/${campaign}/sum of orders by day.json`)
      )
    );
    const sheets = google.sheets({ version: "v4", auth });

    const codes = [];
    for (const [id, art] of Object.entries(vendorCodes)) {
      codes.push(art);
    }
    codes.sort();
    const sheet_data = [];
    for (const [id, art] of Object.entries(codes)) {
      const to_push = [art];
      const cur_date = new Date();
      cur_date.setDate(cur_date.getDate() + 1);
      for (let i = 0; i < 31; i++) {
        cur_date.setDate(cur_date.getDate() - 1);
        const str_date = cur_date
          .toLocaleDateString("ru-RU")
          .replace(/(\d{2})\.(\d{2})\.(\d{4})/, "$3-$2-$1")
          .slice(0, 10);
        // to_push.push(sum_orders[str_date][art]);
        to_push.push(orders[str_date][art]);
      }
      sheet_data.push(to_push);
    }

    await update_data(sheet_data).then((pr) => resolve());
  });
}

async function fetchNewPricesAndWriteToJSON(auth, brand) {
  return new Promise(async (resolve, reject) => {
    const sheets = google.sheets({ version: "v4", auth });
    const brands = JSON.parse(
      await fs.readFile(path.join(__dirname, `../files/campaigns.json`))
    ).brands;
    const artsData = JSON.parse(
      await fs.readFile(path.join(__dirname, `../files/data.json`))
    );
    let campaign = undefined;
    for (const [camp, brands_array] of Object.entries(brands)) {
      if (brands_array.includes(brand)) {
        campaign = camp;
        break;
      }
    }
    if (!campaign) {
      return 0;
      resolve();
    }
    const artsBarcodesFull = JSON.parse(
      await fs.readFile(
        path.join(__dirname, `../files/${campaign}/artsBarcodesFull.json`)
      )
    );

    const jsonData = {};
    const res = await sheets.spreadsheets.values.get({
      spreadsheetId: "1i8E2dvzA3KKw6eDIec9zDg2idvF6oov4LH7sEdK1zf8",
      range: `${brand}!A2:S`,
      // valueRenderOption: "UNFORMATTED_VALUE",
    });

    const rows = res.data.values;
    rows.forEach((row) => {
      if (row[18] == "" || !row[18]) return;
      const new_price = Math.round(
        Number(row[18].replace("%", "").replace(",", ".").replace(/\s/g, ""))
      );
      const discount = Number(
        row[3].replace("%", "").replace(",", ".").replace(/\s/g, "")
      );
      const discounted_price = new_price * (1 - discount / 100);
      if (!new_price || discounted_price > 30000) return;
      const roi = Number(
        row[15].replace("%", "").replace(",", ".").replace(/\s/g, "")
      );
      // if (roi < -30) return;
      if (discounted_price < artsData[row[0]].prime_cost) return;
      // console.log(row[0], artsBarcodesFull[row[0]]);
      jsonData[artsBarcodesFull[row[0]].nmId] = new_price;
    });
    const data = [];
    for (const [nmId, new_price] of Object.entries(jsonData)) {
      data.push({ nmId: parseInt(nmId), price: new_price });
    }
    console.log(data);

    writeDataToFile(
      data,
      path.join(__dirname, `../files/${campaign}/newPrices.json`)
    ).then((pr) => resolve());
  });
}

async function fetchAutoPriceRulesAndWriteToJSON(auth) {
  return new Promise(async (resolve, reject) => {
    const sheets = google.sheets({ version: "v4", auth });

    const jsonData = { turn: [], hours: [] };
    const res = await sheets.spreadsheets.values.get({
      spreadsheetId: "1i8E2dvzA3KKw6eDIec9zDg2idvF6oov4LH7sEdK1zf8",
      range: `РОБОТ ЦЕН 2.0!1:3000`,
      // valueRenderOption: "UNFORMATTED_VALUE",
    });
    const rows = res.data.values;

    const label_row = rows[0];

    const brand_index = label_row.indexOf("Бренд");
    const art_index = label_row.indexOf("Артикул продавца");

    jsonData.hours = ["00", "05", "11", "17"];
    jsonData.turn = label_row.slice(brand_index + 1, brand_index + 9);

    for (let i = 1; i < rows.length; i++) {
      const row = rows[i];
      if (!row[art_index] || row[art_index] == "") continue;

      const brand = row[brand_index];
      if (!(brand in jsonData)) jsonData[brand] = {};

      const art = row[art_index];
      if (!(art in jsonData[brand])) jsonData[brand][art] = {};

      // console.log(row, art, brand);
      for (let j = brand_index + 1; j < brand_index + 9; j++) {
        const turn = jsonData.turn[j - 2];
        // console.log(turn, jsonData[brand][art], jsonData[brand][art][turn]);
        jsonData[brand][art][turn] = row[j]
          ? parseFloat(
              row[j].replace("%", "").replace(",", ".").replace(/\s/g, "")
            )
          : null;
      }
    }

    const campaigns = readIfExists(
      path.join(__dirname, "../files/campaigns.json")
    ).campaigns;
    for (let i = 0; i < campaigns.length; i++) {
      const campaign = campaigns[i];
      const arts = readIfExists(
        path.join(__dirname, "../files", campaign, "artsBarcodesFull.json")
      );
      for (const [art, artData] of Object.entries(arts)) {
        const { brand } = artData;
        if (!jsonData[brand]) jsonData[brand] = {};
        if (!jsonData[brand][art]) jsonData[brand][art] = {};
      }
    }
    // console.log(jsonData);
    const sheetData = [];
    for (const [brand, brandData] of Object.entries(jsonData)) {
      if (brand == "turn" || brand == "hours") continue;
      for (const [art, artData] of Object.entries(brandData)) {
        const toPush = [art, brand];
        for (let i = 0; i < jsonData.turn.length; i++) {
          toPush.push(artData[jsonData.turn[i]]);
        }
        sheetData.push(toPush);
      }
    }
    sheetData.sort((a, b) => a[0].localeCompare(b[0], "ru-RU"));
    sheetData.sort((a, b) => a[1].localeCompare(b[1], "ru-RU"));

    await sheets.spreadsheets.values.clear({
      spreadsheetId: "1i8E2dvzA3KKw6eDIec9zDg2idvF6oov4LH7sEdK1zf8",
      range: `РОБОТ ЦЕН 2.0!2:3000`,
    });

    await sheets.spreadsheets.values.update({
      spreadsheetId: "1i8E2dvzA3KKw6eDIec9zDg2idvF6oov4LH7sEdK1zf8",
      range: `РОБОТ ЦЕН 2.0!2:3000`,
      valueInputOption: "USER_ENTERED",
      resource: {
        values: sheetData,
      },
    });

    writeDataToFile(
      jsonData,
      path.join(__dirname, `../files/autoPriceRules.json`)
    ).then(() => resolve());
  });
}

async function fetchArtMaskPricesAndWriteToJSON(auth) {
  return new Promise(async (resolve, reject) => {
    const sheets = google.sheets({ version: "v4", auth });
    const res = await sheets.spreadsheets.values.get({
      spreadsheetId: "1ShAelY_Xi50Au2Ij7PvK0QhfwKmRFdI0Yqthx-I_JbQ",
      range: `ЦЕНЫ+ШК!A2:C`,
    });
    const rows = res.data.values;
    const jsonData = {};
    rows.forEach((row) => {
      if (row[0] == "") return;
      jsonData[row[0]] = {
        card: Math.abs(
          Number(
            row[1]
              ? row[1].replace("%", "").replace(",", ".").replace(/\s/, "")
              : 0
          )
        ),
        rc: Math.abs(
          Number(
            row[2]
              ? row[2].replace("%", "").replace(",", ".").replace(/\s/, "")
              : 0
          )
        ),
      };
    });

    writeDataToFile(
      jsonData,
      path.join(__dirname, "../files", "artPrices.json")
    ).then((pr) => resolve());
  });
}

async function generatePricesTemplateSheet(auth) {
  return new Promise(async (resolve, reject) => {
    const sheets = google.sheets({ version: "v4", auth });
    const generalMasks = JSON.parse(
      await fs.readFile(path.join(__dirname, "../files", "generalMasks.json"))
    );

    const art_types = [];
    for (const [index, mask] of Object.entries(generalMasks)) {
      const type = mask.split("_")[0];
      if (!art_types.includes(type)) art_types.push(type);
    }

    const sheet_data = [];
    for (const [index, type] of Object.entries(art_types)) {
      for (const [jndex, mask] of Object.entries(generalMasks)) {
        const art_type = mask.split("_")[0];
        if (art_type != type) continue;
        sheet_data.push([mask]);
      }
      sheet_data.push([""]);
    }

    await sheets.spreadsheets.values.clear({
      spreadsheetId: "1ShAelY_Xi50Au2Ij7PvK0QhfwKmRFdI0Yqthx-I_JbQ",
      range: `ЦЕНЫ+ШК!A2:C`,
    });
    sheets.spreadsheets.values
      .update({
        spreadsheetId: "1ShAelY_Xi50Au2Ij7PvK0QhfwKmRFdI0Yqthx-I_JbQ",
        range: `ЦЕНЫ+ШК!A2:A`,
        valueInputOption: "USER_ENTERED", // The information will be passed according to what the usere passes in as date, number or text
        resource: {
          values: sheet_data,
        },
      })
      .then((pr) => resolve());
  });
}

async function fetchDataAndWriteToJSON(auth) {
  try {
    const sheets = google.sheets({ version: "v4", auth });

    // Retrieve the values from the specified range
    const res = await sheets.spreadsheets.values.get({
      spreadsheetId: "1U8q5ukJ7WHCM9kNRRPlKRr3Cb3cb8At-bTjZuBOpqRs",
      range: "Данные!A2:P",
    });

    // Parse the values into a JSON object
    const rows = res.data.values;

    const data = {};
    rows.forEach((row) => {
      if (row[0] == "") return;
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
        expences: Math.abs(
          Number(row[8] ? row[8].replace("%", "").replace(",", ".") : 0)
        ),
        prime_cost: Math.abs(Number(row[9] ? row[9].replace(",", ".") : 0)),
        spp: Math.abs(
          Number(row[10] ? row[10].replace("%", "").replace(",", ".") : 0)
        ),
        ad: Math.abs(
          Number(row[11] ? row[11].replace("%", "").replace(",", ".") : 0)
        ),
        pref_obor: Math.abs(
          Number(row[12] ? row[12].replace("%", "").replace(",", ".") : 0)
        ),
        min_zakaz: Math.abs(
          Number(row[13] ? row[13].replace("%", "").replace(",", ".") : 0)
        ),
        volume: Math.abs(
          Number(row[14] ? row[14].replace("%", "").replace(",", ".") : 0)
        ),
        ktr: Math.abs(
          Number(row[15] ? row[15].replace("%", "").replace(",", ".") : 0)
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
  return new Promise(async (resolve, reject) => {
    const sheets = google.sheets({ version: "v4", auth });
    const brands = JSON.parse(
      await fs.readFile(path.join(__dirname, `../files/campaigns.json`))
    ).brands[campaign];

    // console.log(data);
    const data = {};
    for (const [index, brand] of Object.entries(brands)) {
      const res = await sheets.spreadsheets.values.get({
        spreadsheetId: "1i8E2dvzA3KKw6eDIec9zDg2idvF6oov4LH7sEdK1zf8",
        range: `${brand}!A2:R`,
      });

      const rows = res.data.values;

      if (!(brand in data)) data[brand] = {};

      rows.forEach((row) => {
        // console.log(row);
        if (!row.slice(14).length) return;
        data[brand][row[0]] = {
          rentabelnost: row[14]
            ? Number(
                row[14].replace("%", "").replace(",", ".").replace(/\s/g, "")
              )
            : undefined,
          roi: row[15]
            ? Number(
                row[15].replace("%", "").replace(",", ".").replace(/\s/g, "")
              )
            : undefined,
          roz_price: row[16]
            ? Number(
                row[16].replace("%", "").replace(",", ".").replace(/\s/g, "")
              )
            : undefined,
          spp_price: row[17]
            ? Number(
                row[17].replace("%", "").replace(",", ".").replace(/\s/g, "")
              )
            : undefined,
        };
      });
    }
    writeDataToFile(
      data,
      path.join(__dirname, `../files/${campaign}/enteredValues.json`)
    ).then(() => resolve());
  });
}

function fetchAvgRatingsAndWriteToJSON(auth) {
  return new Promise(async (resolve, reject) => {
    const sheets = google.sheets({ version: "v4", auth });

    const campaigns = (
      await JSON.parse(
        await fs.readFile(path.join(__dirname, "../files/campaigns.json"))
      )
    ).campaigns;
    sheets.spreadsheets.values
      .get({
        spreadsheetId: "1iEaUSYe4BejADWpS9LgKGADknFwnvrF3Gc3PRS9ibME",
        range: `рейт!A2:D`,
      })
      .then(async (res) => {
        const rows = res.data.values;
        for (const campaign of campaigns) {
          data = {};
          // console.log(rows);
          for (const row of rows) {
            const mask = row[0];
            if (!mask) continue;

            if (campaign == "mayusha" && !mask.match("ОТК")) continue;
            if (campaign == "mayusha" && mask.match("ОТК_САВ")) continue;

            if (
              campaign == "delicatus" &&
              !mask.match("DELICATUS") &&
              !mask.match("ОТК_САВ") &&
              (!mask.match("КПБ") || mask.match("ТКС"))
            )
              continue;

            if (campaign == "TKS" && !mask.match("ТКС")) continue;

            data[mask] = parseFloat(row[2] ? row[2].replace(",", ".") : "0");
          }
          // console.log(data);
          await writeDataToFile(
            data,
            path.join(__dirname, `../files/${campaign}/avgRatings.json`)
          );
          console.log(`${campaign} avgRatings.json created`);
        }
        resolve();
      });
  }).catch((err) => {
    console.log(`The API returned an error: ${err}`);
    reject(err);
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

function updateRNP(auth) {
  return new Promise(async (resolve, reject) => {
    const now = new Date();
    const cur_date = parseInt(now.toLocaleDateString("ru-RU").slice(0, 2));

    const sheets = google.sheets({ version: "v4", auth });
    const brands = JSON.parse(
      await fs.readFile(path.join(__dirname, "../files", "campaigns.json"))
    ).brands;

    const unique_params_res = await sheets.spreadsheets.values.get({
      spreadsheetId: "1I-hG_-dVdKusrSVXQYZrYjLWDEGLOg6ustch-AvlWHg",
      range: "РНП 2.0!2:2",
    });
    const unique_params_temp = unique_params_res.data.values[0];
    const unique_params = [];
    for (let i = 1; i < unique_params_temp.length; i++)
      if (
        !unique_params.includes(unique_params_temp[i]) &&
        unique_params_temp[i]
      )
        unique_params.push(unique_params_temp[i]);
    const param_map = {
      "Прибыль ₽": { name: "profit", formula: "sum" },
      "Заказы ₽": { name: "sum_orders", formula: "sum" },
      "Заказы шт.": { name: "orders", formula: "sum" },
      "Реклама ₽": { name: "sum_advert", formula: "sum" },
      "%ДРР": { name: "drr", formula: "avg" },
      "%Конверсии": { name: "conversion", formula: "avg" },
      Показы: { name: "views", formula: "sum" },
      SKU: { name: "sku", formula: "avg" },
    };
    console.log(unique_params);

    const brand_plan_res = await sheets.spreadsheets.values.get({
      spreadsheetId: "1I-hG_-dVdKusrSVXQYZrYjLWDEGLOg6ustch-AvlWHg",
      range: "РНП 2.0!3:10",
    });
    const brand_plan_temp = brand_plan_res.data.values;
    const brand_plan = {};
    for (let i = 0; i < brand_plan_temp.length; i++) {
      const row = brand_plan_temp[i];
      const brand = row[0];
      if (!brand || brand == "") continue;
      if (!(brand in brand_plan)) brand_plan[brand] = {};

      for (let j = 0; j < unique_params.length; j++) {
        const metric = param_map[unique_params[j]].name;
        if (!(metric in brand_plan[brand])) brand_plan[brand][metric] = 0;
        const value = Number(
          row[j + 1]
            ? row[j + 1].replace("%", "").replace(",", ".").replace(/\s/g, "")
            : "0"
        );
        brand_plan[brand][metric] = unique_params[j].includes("%")
          ? value / 100
          : value;
      }
    }
    console.log(brand_plan);

    const jsonData = {}; //brand->metric->date,plan
    for (const [campaign, brands_data] of Object.entries(brands)) {
      const RNPByDayMetrics = await JSON.parse(
        await fs.readFile(
          path.join(__dirname, "../files", "RNPByDayMetrics.json")
        )
      );

      const get_proper_mask = (temp_mask) => {
        const mask_splitted = temp_mask.split("_");
        if (campaign != "delicatus" || !temp_mask.includes("КПБ"))
          mask_splitted.pop();
        if (temp_mask.includes("НАМАТРАСНИК")) {
          if (campaign == "delicatus") mask_splitted.pop();
        }
        return mask_splitted.join("_");
      };

      for (const [index, brand] of Object.entries(brands_data)) {
        // if (!(brand in brand_plan)) continue;
        if (!(brand in jsonData)) jsonData[brand] = {};

        for (const [index, param] of Object.entries(unique_params)) {
          const metric = param_map[param].name;
          const metric_formula = param_map[param].formula;
          // console.log(brand_plan[brand], brand);
          if (!(metric in jsonData[brand]))
            jsonData[brand][metric] = {
              month: {
                plan: brand_plan[brand] ? brand_plan[brand][metric] : 0,
                fact: RNPByDayMetrics[brand].month[metric],
                done: 0,
                prediction: 0,
                done_prediction: 0,
              },
            };

          jsonData[brand][metric].month.done = jsonData[brand][metric].month
            .plan
            ? jsonData[brand][metric].month.fact /
              jsonData[brand][metric].month.plan
            : 0;

          if (metric_formula == "sum") {
            jsonData[brand][metric].month.prediction =
              (jsonData[brand][metric].month.fact / cur_date) *
              new Date(now.getFullYear(), now.getMonth(), 0).getDate();

            jsonData[brand][metric].month.done_prediction = jsonData[brand][
              metric
            ].month.plan
              ? jsonData[brand][metric].month.prediction /
                jsonData[brand][metric].month.plan
              : 0;
          }
          // else {
          //   jsonData[brand][metric].month.prediction =
          //     jsonData[brand][metric].month.fact;
          //   jsonData[brand][metric].month.done_prediction =
          //     jsonData[brand][metric].month.done;
          // }

          for (let i = 0; i < cur_date; i++) {
            const date = new Date(now);
            date.setDate(date.getDate() - i);
            // console.log(campaign, brand, date);
            const str_date = date
              .toLocaleDateString("ru-RU")
              .replace(/(\d{2})\.(\d{2})\.(\d{4})/, "$3-$2-$1")
              .slice(0, 10);
            if (!(str_date in jsonData[brand][metric]))
              jsonData[brand][metric][str_date] = {
                plan:
                  jsonData[brand][metric].month.plan /
                  (metric_formula == "sum" ? 31 : 1),
                fact: RNPByDayMetrics[brand][str_date][metric],
                done: 0,
                prediction: 0,
                done_prediction: 0,
              };

            jsonData[brand][metric][str_date].done = jsonData[brand][metric][
              str_date
            ].plan
              ? jsonData[brand][metric][str_date].fact /
                jsonData[brand][metric][str_date].plan
              : 0;
          }
        }
      }
    }
    await writeDataToFile(
      jsonData,
      path.join(__dirname, "../files", "rnp.json")
    );

    //////////////////////////////////////////////////////////////////////////////////////
    const sheet_data = [];
    for (const [brand, metrics] of Object.entries(jsonData)) {
      const brand_sheet_data = [Array(6)];
      brand_sheet_data[0][0] = `${brand} ${now
        .toLocaleString("ru-RU", { month: "long" })
        .toUpperCase()} ${now.getFullYear()}`;
      brand_sheet_data.push([
        "Метрика",
        "План",
        "Факт",
        "%Выполнения",
        "Прогноз",
        "%Прогноз",
      ]);
      // brand_sheet_data[1][0] = "Метрика";
      // for (let i = 0; i < unique_params.length; i++) {
      //   brand_sheet_data[1][i + 1] = unique_params[i];
      // }
      for (let i = 0; i < unique_params.length; i++) {
        // brand_sheet_data[2 + i * 32][0] = unique_params[i];
        const metric = param_map[unique_params[i]].name;
        // console.log(metric, metrics[metric], metrics[metric].month);
        brand_sheet_data.push(
          [unique_params[i]].concat(Object.values(metrics[metric].month))
        );

        for (let j = 0; j < 31; j++) {
          const str_date = new Date(
            now.getFullYear(),
            now.getMonth(),
            cur_date - j
          )
            .toLocaleDateString("ru-RU")
            .replace(/(\d{2})\.(\d{2})\.(\d{4})/, "$3-$2-$1")
            .slice(0, 10);
          brand_sheet_data.push(
            [cur_date - j > 0 ? `${str_date}` : ""].concat(
              cur_date - j > 0
                ? Object.values(metrics[metric][str_date])
                : Array(5)
            )
          );
        }
      }
      for (let r_index = 0; r_index < brand_sheet_data.length; r_index++) {
        if (sheet_data.length <= r_index) sheet_data.push([]);
        sheet_data[r_index] = sheet_data[r_index].concat(
          brand_sheet_data[r_index].concat([""])
        );
      }
    }

    // console.log(sheet_data);
    await sheets.spreadsheets.values.clear({
      spreadsheetId: "1I-hG_-dVdKusrSVXQYZrYjLWDEGLOg6ustch-AvlWHg",
      range: `РНП 2.0!11:1000`,
    });
    await sheets.spreadsheets.values.update({
      spreadsheetId: "1I-hG_-dVdKusrSVXQYZrYjLWDEGLOg6ustch-AvlWHg",
      range: `РНП 2.0!11:1000`,
      valueInputOption: "USER_ENTERED", // The information will be passed according to what the usere passes in as date, number or text
      resource: {
        values: sheet_data,
      },
    });
    // await Promise.all(promises).then((pr) => resolve());
  });
}

function updatePlanFact(auth, campaign) {
  return new Promise(async (resolve, reject) => {
    const sheets = google.sheets({ version: "v4", auth });
    const brands = JSON.parse(
      await fs.readFile(path.join(__dirname, "../files", "campaigns.json"))
    ).brands[campaign];
    const artsBarcodesFull = await JSON.parse(
      await fs.readFile(
        path.join(__dirname, "../files", campaign, "artsBarcodesFull.json")
      )
    );
    const sum_orders = await JSON.parse(
      await fs.readFile(
        path.join(__dirname, "../files", campaign, "sum of orders by day.json")
      )
    );

    const orders = await JSON.parse(
      await fs.readFile(
        path.join(__dirname, "../files", campaign, "orders by day.json")
      )
    );
    const stocks = await JSON.parse(
      await fs.readFile(
        path.join(__dirname, "../files", campaign, "stocks.json")
      )
    );
    const avg_orders = await JSON.parse(
      await fs.readFile(
        path.join(__dirname, "../files", campaign, "orders.json")
      )
    );
    const byDayCampaignSum = await JSON.parse(
      await fs.readFile(
        path.join(__dirname, "../files", campaign, "byDayCampaignSum.json")
      )
    );

    const advertStatsByMaskByDay = await JSON.parse(
      await fs.readFile(
        path.join(
          __dirname,
          "../files",
          campaign,
          "advert stats by mask by day.json"
        )
      )
    );

    // const spIds = {
    //   mayusha: "Факт Маюша",
    //   delicatus: "Факт Delicatus",
    //   TKS: "Факт ОТК",
    //   Amaze: "Факт Amaze Wear",
    //   TKS: "Факт Amaze Wear",
    // };
    // if (!(campaign in spIds)) {
    //   resolve();
    //   return;
    // }

    const get_proper_mask = (temp_mask) => {
      const mask_splitted = temp_mask.split("_");
      if (campaign != "delicatus" || !temp_mask.includes("КПБ"))
        mask_splitted.pop();
      if (temp_mask.includes("НАМАТРАСНИК")) {
        if (campaign == "delicatus") mask_splitted.pop();
      }
      return mask_splitted.join("_");
    };

    // console.log(byNow);
    // const fact_res = await sheets.spreadsheets.values.get({
    // spreadsheetId: spIds[campaign],
    // range: "Факт!A3:A",
    // });
    // const fact = fact_res.data.values;
    const unique_params_res = await sheets.spreadsheets.values.get({
      spreadsheetId: "1I-hG_-dVdKusrSVXQYZrYjLWDEGLOg6ustch-AvlWHg",
      range: "Факт Маюша!2:2",
    });
    const unique_params_temp = unique_params_res.data.values[0];
    const unique_params = [];
    for (let i = 1; i < unique_params_temp.length; i++)
      if (
        !unique_params.includes(unique_params_temp[i]) &&
        unique_params_temp[i]
      )
        unique_params.push(unique_params_temp[i]);
    const param_map = {
      Показы: { name: "views", formula: "СУММ" },
      Клики: { name: "clicks", formula: "СУММ" },
      CTR: { name: "ctr", formula: "СРЗНАЧ" },
      СРС: { name: "cpc", formula: "СРЗНАЧ" },
      СРМ: { name: "cpm", formula: "СРЗНАЧ" },
      Расход: { name: "sum", formula: "СУММ" },
      "Остаток/шт": { name: "stocks", formula: "СЧЁТ" },
      "Заказы/шт": { name: "orders", formula: "СУММ" },
      "Ср. чек": { name: "avg_bill", formula: "СРЗНАЧ" },
      "Заказы/Р": { name: "sum_orders", formula: "СУММ" },
      "ДРР%": { name: "drr", formula: "СРЗНАЧ" },
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

    const stocksRatio = { all: { byBrand: {} }, byDate: { byBrand: {} } };
    for (const [art, art_data] of Object.entries(artsBarcodesFull)) {
      const mask = getMaskFromVendorCode(art);
      if (!(mask in stocksRatio.all)) stocksRatio.all[mask] = 0;
      stocksRatio.all[mask] += 1;

      const brand = brand_names[art_data.brand];
      if (!(brand in stocksRatio.all.byBrand))
        stocksRatio.all.byBrand[brand] = 0;
      stocksRatio.all.byBrand[brand] += 1;
    }

    const avg_drr_by_mask = {};
    const jsonDataDrr = {};
    const json_sheet_data = {};
    const promises = [];
    for (const [index, brand] of Object.entries(brands)) {
      const sheet_data = [
        ["ДАТА"].concat(Array(unique_params.length)),
        [""],
        ["саммари"],
      ];
      const dates_datas = {};
      const all_masks = [];
      for (const [art, art_data] of Object.entries(artsBarcodesFull)) {
        // const mask = get_proper_mask(getMaskFromVendorCode(art));
        if (brand_names[art_data.brand] != brand) continue;
        const mask = getMaskFromVendorCode(art);
        if (all_masks.includes(mask)) continue;
        all_masks.push(mask);
      }
      all_masks.sort();
      all_masks.unshift(brand);
      // if (all_masks[0] == "НАМАТРАСНИК") all_masks.push(all_masks.shift());
      console.log(all_masks);
      for (let i = 0; i < all_masks.length; i++) {
        sheet_data[1] = sheet_data[1].concat(unique_params);
        //// formulas
        const formulas_to_concat = [];
        for (let j = 0; j < unique_params.length; j++) {
          const index_of_column = i * unique_params.length + j + 2;
          const column_name = indexToColumn(index_of_column);
          formulas_to_concat.push(
            `=${
              param_map[unique_params[j]].formula
            }(${column_name}4:${column_name})`
          );
        }
        sheet_data[2] = sheet_data[2].concat(formulas_to_concat);
        if (all_masks[i] == brand) continue;

        const mask = all_masks[i];
        const dates = advertStatsByMaskByDay[mask];
        if (mask != all_masks[i]) continue;
        sheet_data[0] = sheet_data[0].concat(
          [mask].concat(Array(unique_params.length - 1))
        );
        // sheet_data[0].concat(new Array(8));
        // continue;

        if (!dates) {
          const cur_date = new Date();
          cur_date.setDate(cur_date.getDate() + 1);
          for (let i = 0; i <= 31; i++) {
            cur_date.setDate(cur_date.getDate() - 1);
            const str_date = cur_date
              .toLocaleDateString("ru-RU")
              .replace(/(\d{2})\.(\d{2})\.(\d{4})/, "$3-$2-$1")
              .slice(0, 10);
            // console.log(str_date);
            if (!(str_date in dates_datas)) dates_datas[str_date] = {};
            dates_datas[str_date][mask] = Array(unique_params.length);

            for (const [art, art_data] of Object.entries(artsBarcodesFull)) {
              if (!art.includes(get_proper_mask(mask))) continue;

              const was_present = Number(
                stocks[str_date]
                  ? avg_orders[art] <= (stocks[str_date][art] ?? 0)
                  : 0
              );
              const _mask = getMaskFromVendorCode(art);
              if (!(str_date in stocksRatio.byDate))
                stocksRatio.byDate[str_date] = {};
              if (!(_mask in stocksRatio.byDate[str_date]))
                stocksRatio.byDate[str_date][_mask] = 0;
              stocksRatio.byDate[str_date][_mask] += was_present;

              const brand = brand_names[art_data.brand];
              if (!(brand in stocksRatio.byDate.byBrand))
                stocksRatio.byDate.byBrand[brand] = {};
              if (!(str_date in stocksRatio.byDate.byBrand[brand]))
                stocksRatio.byDate.byBrand[brand][str_date] = 0;
              stocksRatio.byDate.byBrand[brand][str_date] += was_present;
            }
          }

          continue;
        }

        for (const [date, dateData] of Object.entries(dates)) {
          if (new Date().getDate() - 31 > new Date(date).getDate()) continue;
          dateData.sum_orders = 0;
          dateData.orders = 0;
          dateData.stocks = 0;
          // console.log(date, mask, dateData);

          for (const [art, art_data] of Object.entries(artsBarcodesFull)) {
            if (!art.includes(get_proper_mask(mask))) continue;

            const was_present = Number(
              stocks[date] ? avg_orders[art] <= (stocks[date][art] ?? 0) : 0
            );
            const _mask = getMaskFromVendorCode(art);
            if (!(date in stocksRatio.byDate)) stocksRatio.byDate[date] = {};
            if (!(_mask in stocksRatio.byDate[date]))
              stocksRatio.byDate[date][_mask] = 0;
            stocksRatio.byDate[date][_mask] += was_present;

            const brand = brand_names[art_data.brand];
            if (!(brand in stocksRatio.byDate.byBrand))
              stocksRatio.byDate.byBrand[brand] = {};
            if (!(date in stocksRatio.byDate.byBrand[brand]))
              stocksRatio.byDate.byBrand[brand][date] = 0;
            stocksRatio.byDate.byBrand[brand][date] += was_present;
          }

          if (!sum_orders[date]) {
            // dates_datas[date] = {};
            // console.log('here');
            continue;
          }

          if (!(date in dates_datas)) dates_datas[date] = {};

          for (const [art, sum] of Object.entries(sum_orders[date])) {
            if (!art.includes(get_proper_mask(mask))) continue;
            // console.log(art, mask, sum);
            dateData.sum_orders += sum;
          }
          for (const [art, count] of Object.entries(orders[date])) {
            if (!art.includes(get_proper_mask(mask))) continue;
            // console.log(art, mask, count);
            dateData.orders += count;
          }

          dateData.stocks = `${stocksRatio.byDate[date][mask]}/${stocksRatio.all[mask]}`;
          dateData.drr = dateData.sum / dateData.sum_orders;
          dateData.avg_bill = dateData.sum_orders / dateData.orders;

          const to_push = Array(unique_params.length);
          for (let j = 0; j < unique_params.length; j++) {
            to_push[j] = dateData[param_map[unique_params[j]].name];
          }
          // if (mask == "КПБ_2_СТРАЙП") console.log(mask, to_push);
          dates_datas[date][mask] = to_push;
          // console.log(mask, fact[i], to_push);
        }
      }
      // console.log(dates_datas);

      const cur_date = new Date();
      cur_date.setDate(cur_date.getDate() + 1);
      for (let i = 0; i <= 31; i++) {
        cur_date.setDate(cur_date.getDate() - 1);
        const str_date = cur_date
          .toLocaleDateString("ru-RU")
          .replace(/(\d{2})\.(\d{2})\.(\d{4})/, "$3-$2-$1")
          .slice(0, 10);
        // console.log(str_date);

        sheet_data.push([str_date]);
        for (let j = 0; j < all_masks.length; j++) {
          if (!dates_datas[str_date]) continue;
          // save avg_drr
          // const generalMaskForDrr = all_masks[j].slice(0, 2);
          const generalMaskForDrr = all_masks[j];
          // const generalMaskForDrr = brand;
          if (!(generalMaskForDrr in avg_drr_by_mask))
            avg_drr_by_mask[generalMaskForDrr] = {
              sum: 0,
              sum_orders: 0,
              drr: 0,
            };
          if (1 <= i && i < 30) {
            // Указывыет за сколько дней считается дрр для рассчета цен
            // if (generalMaskForDrr == "ПРПЭ_120_DELICATUS")
            //   console.log(str_date, dates_datas[str_date][generalMaskForDrr]);
            if (dates_datas[str_date][all_masks[j]]) {
              const date_sum_orders =
                dates_datas[str_date][all_masks[j]][
                  unique_params.indexOf("Заказы/Р")
                ];
              const date_sum =
                dates_datas[str_date][all_masks[j]][
                  unique_params.indexOf("Расход")
                ];
              avg_drr_by_mask[generalMaskForDrr].sum += isFinite(date_sum)
                ? date_sum
                : 0;
              avg_drr_by_mask[generalMaskForDrr].sum_orders += isFinite(
                date_sum_orders
              )
                ? date_sum_orders
                : 0;
              // if (generalMaskForDrr.slice(0, 2) == "КП")
              //   console.log(
              //     Math.round(avg_drr_by_mask[generalMaskForDrr].sum_orders),
              //     str_date,
              //     Math.round(date_sum_orders)
              //   );
              avg_drr_by_mask[generalMaskForDrr].drr = avg_drr_by_mask[
                generalMaskForDrr
              ].sum_orders
                ? avg_drr_by_mask[generalMaskForDrr].sum /
                  avg_drr_by_mask[generalMaskForDrr].sum_orders
                : 0;
            }
          }

          sheet_data[sheet_data.length - 1] = sheet_data[
            sheet_data.length - 1
          ].concat(
            dates_datas[str_date][all_masks[j]] ?? Array(unique_params.length)
          );
        }
      }

      for (const [mask, mask_data] of Object.entries(avg_drr_by_mask)) {
        const generalMaskForDrr = mask.slice(0, 2);
        if (!(generalMaskForDrr in jsonDataDrr))
          jsonDataDrr[generalMaskForDrr] = {
            sum: 0,
            sum_orders: 0,
            drr: 0,
          };
        jsonDataDrr[generalMaskForDrr].sum += mask_data.sum;
        jsonDataDrr[generalMaskForDrr].sum_orders += mask_data.sum_orders;
        jsonDataDrr[generalMaskForDrr].drr = jsonDataDrr[generalMaskForDrr]
          .sum_orders
          ? jsonDataDrr[generalMaskForDrr].sum /
            jsonDataDrr[generalMaskForDrr].sum_orders
          : 0;

        jsonDataDrr[mask] = mask_data;
      }

      console.log(jsonDataDrr);
      const campaign_summary = [[]];
      if (brand in advertStatsByMaskByDay) {
        console.log(brand, advertStatsByMaskByDay[brand]);

        for (let i = 3; i < sheet_data.length; i++) {
          if (!sheet_data[i]) continue;
          const str_date = sheet_data[i][0];
          if (!(str_date in advertStatsByMaskByDay[brand]))
            advertStatsByMaskByDay[brand][str_date] = {
              views: 0,
              clicks: 0,
              unique_users: 0,
              sum: 0,
              ctr: 0,
              cpm: 0,
              cpc: 0,
              stocks: 0,
              orders: 0,
              avg_bill: 0,
              sum_orders: 0,
              drr: 0,
            };

          advertStatsByMaskByDay[brand][str_date].stocks = `${
            stocksRatio.byDate.byBrand[brand]
              ? stocksRatio.byDate.byBrand[brand][str_date]
              : 0
          }/${stocksRatio.all.byBrand[brand]}`;
          advertStatsByMaskByDay[brand][str_date].orders = byDayCampaignSum[
            brand
          ]
            ? byDayCampaignSum[brand][str_date]
              ? byDayCampaignSum[brand][str_date].count
              : 0
            : 0;
          advertStatsByMaskByDay[brand][str_date].sum_orders = byDayCampaignSum[
            brand
          ]
            ? byDayCampaignSum[brand][str_date]
              ? byDayCampaignSum[brand][str_date].sum
              : 0
            : 0;
          advertStatsByMaskByDay[brand][str_date].drr =
            advertStatsByMaskByDay[brand][str_date].sum /
            advertStatsByMaskByDay[brand][str_date].sum_orders;
          advertStatsByMaskByDay[brand][str_date].avg_bill =
            advertStatsByMaskByDay[brand][str_date].sum_orders /
            advertStatsByMaskByDay[brand][str_date].orders;

          const to_push = [];
          for (let j = 0; j < unique_params.length; j++) {
            to_push.push(
              advertStatsByMaskByDay[brand][str_date][
                param_map[unique_params[j]].name
              ] ?? 0
            );
          }
          campaign_summary.push([""].concat(to_push));
        }
      }

      json_sheet_data[brand] = sheet_data;
      await writeDataToFile(
        stocksRatio,
        path.join(__dirname, "../files", campaign, "stocksRatio.json")
      );
      const spId = `Факт ${brand}`;
      promises.push(
        sheets.spreadsheets.values
          .clear({
            spreadsheetId: "1I-hG_-dVdKusrSVXQYZrYjLWDEGLOg6ustch-AvlWHg",
            range: `${spId}!4:1000`,
          })
          .then(() =>
            sheets.spreadsheets.values
              .clear({
                spreadsheetId: "1I-hG_-dVdKusrSVXQYZrYjLWDEGLOg6ustch-AvlWHg",
                range: `${spId}!B4:K`,
              })
              .then(() =>
                sheets.spreadsheets.values
                  .update({
                    spreadsheetId:
                      "1I-hG_-dVdKusrSVXQYZrYjLWDEGLOg6ustch-AvlWHg",
                    range: `${spId}!3:1000`,
                    valueInputOption: "USER_ENTERED", // The information will be passed according to what the usere passes in as date, number or text
                    resource: {
                      values: campaign_summary,
                    },
                  })
                  .then(() =>
                    sheets.spreadsheets.values.update({
                      spreadsheetId:
                        "1I-hG_-dVdKusrSVXQYZrYjLWDEGLOg6ustch-AvlWHg",
                      range: `${spId}!1:1000`,
                      valueInputOption: "USER_ENTERED", // The information will be passed according to what the usere passes in as date, number or text
                      resource: {
                        values: sheet_data,
                      },
                    })
                  )
              )
          )
      );
    }
    await writeDataToFile(
      jsonDataDrr,
      path.join(__dirname, "../files", campaign, "avgDrrByMask.json")
    );
    await Promise.all(promises).then((pr) => resolve());
  });
}

function updateFactStatsByRK(auth, campaign) {
  return new Promise(async (resolve, reject) => {
    const sheets = google.sheets({ version: "v4", auth });

    const brands = JSON.parse(
      await fs.readFile(path.join(__dirname, "../files", "campaigns.json"))
    ).brands[campaign];
    const artsBarcodesFull = await JSON.parse(
      await fs.readFile(
        path.join(__dirname, "../files", campaign, "artsBarcodesFull.json")
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
    const std_brand_names = {
      mayusha: "МАЮША",
      delicatus: "DELICATUS",
      TKS: "ОТК",
      perinka: "Перинка",
    };

    const vendorCodes = await JSON.parse(
      await fs.readFile(
        path.join(__dirname, "../files", campaign, "vendorCodes.json")
      )
    );
    const artsData = await JSON.parse(
      await fs.readFile(path.join(__dirname, "../files", "data.json"))
    );
    const sum_orders = await JSON.parse(
      await fs.readFile(
        path.join(__dirname, "../files", campaign, "sum of orders by day.json")
      )
    );
    const orders = await JSON.parse(
      await fs.readFile(
        path.join(__dirname, "../files", campaign, "orders by day.json")
      )
    );
    const stocks = await JSON.parse(
      await fs.readFile(
        path.join(__dirname, "../files", campaign, "stocks.json")
      )
    );
    const stocksRatio = await JSON.parse(
      await fs.readFile(
        path.join(__dirname, "../files", campaign, "stocksRatio.json")
      )
    );

    const advertBudgets = await JSON.parse(
      await fs.readFile(
        path.join(__dirname, "../files", campaign, "advertBudgets.json")
      )
    );
    const advertInfos = await JSON.parse(
      await fs.readFile(
        path.join(__dirname, "../files", campaign, "advertInfos.json")
      )
    );
    const generalMasks = await JSON.parse(
      await fs.readFile(path.join(__dirname, "../files", "generalMasks.json"))
    );
    const advertNames = {};
    for (const [unused, rkData] of Object.entries(advertInfos))
      advertNames[rkData.advertId] = rkData.name;
    const advertStatsMpManager = await JSON.parse(
      await fs.readFile(
        path.join(__dirname, "../files", campaign, "advertStatsMpManager.json")
      )
    );
    const advertStatsByDay = await JSON.parse(
      await fs.readFile(
        path.join(__dirname, "../files", campaign, "advert stats by day.json")
      )
    );

    const advert_infos_columns_res = await sheets.spreadsheets.values.get({
      spreadsheetId: "1I-hG_-dVdKusrSVXQYZrYjLWDEGLOg6ustch-AvlWHg",
      range: `РК МАЮША!A1:D1`,
    });
    const advert_infos_columns = advert_infos_columns_res.data.values[0];
    const infos_columns_map = {
      "ID РК": "advertId",
      СТАТУС: "status",
      "ТИП РК": "type",
      "ИМЯ РК": "name",
    };

    const unique_params_res = await sheets.spreadsheets.values.get({
      spreadsheetId: "1I-hG_-dVdKusrSVXQYZrYjLWDEGLOg6ustch-AvlWHg",
      range: `РК МАЮША!2:2`,
    });
    const unique_params_temp = unique_params_res.data.values[0];
    const unique_params = [];
    for (let i = 1; i < unique_params_temp.length; i++)
      if (
        !unique_params.includes(unique_params_temp[i]) &&
        unique_params_temp[i]
      )
        unique_params.push(unique_params_temp[i]);

    const param_map = {
      Показы: { name: "views", formula: "СУММ" },
      Клики: { name: "clicks", formula: "СУММ" },
      CTR: { name: "ctr", formula: "СРЗНАЧ" },
      СРС: { name: "cpc", formula: "СРЗНАЧ" },
      СРМ: { name: "cpm", formula: "СРЗНАЧ" },
      Расход: { name: "sum", formula: "СУММ" },
      "Остаток/шт": { name: "stocks", formula: "СРЗНАЧ" },
      "Заказы/шт": { name: "orders", formula: "СУММ" },
      "Ср. чек": { name: "avg_bill", formula: "СРЗНАЧ" },
      "Заказы/Р": { name: "sum_orders", formula: "СУММ" },
      "ДРР%": { name: "drr", formula: "СРЗНАЧ" },
    };

    const calc_adv_stats_in_date_range = (advertId, date_range) => {
      const result = {
        views: 0,
        clicks: 0,
        sum: 0,
        ctr: 0,
        cpm: 0,
        cpc: 0,
        stocks: 0,
        orders: 0,
        avg_bill: 0,
        sum_orders: 0,
        drr: 0,
      };
      const rkData = advertStatsByDay[advertId];
      if (!rkData) return { rk_data: result, brand: undefined };
      const today_date = new Date();
      let nms_to_sum_orders = [];
      for (let i = date_range.to; i <= date_range.from; i++) {
        const cur_date = new Date();
        cur_date.setDate(today_date.getDate() - i);
        const str_date = cur_date
          .toLocaleDateString("ru-RU")
          .replace(/(\d{2})\.(\d{2})\.(\d{4})/, "$3-$2-$1")
          .slice(0, 10);

        const generalMaskOfRK = advertNames[advertId]
          .replace(/\s/, "")
          .split("/")[0];
        if (generalMasks.includes(generalMaskOfRK)) {
          // if (generalMaskOfRK == 'ПРПЭ_200') console.log(date_range);
          // console.log(advertNames[advertId], generalMaskOfRK, nms_to_sum_orders, generalMasks.includes(generalMaskOfRK));
          // const mask = advertNames[advertId].split("/")[0];
          for (const [art, art_data] of Object.entries(artsData)) {
            const generalMask = getGeneralMaskFromVendorCode(art);
            if (generalMask != generalMaskOfRK) continue;
            if (!(art in artsBarcodesFull)) continue;
            // console.log(generalMask, generalMaskOfRK);
            if (!nms_to_sum_orders.includes(art)) nms_to_sum_orders.push(art);
          }
        } else if (!artsData[advertNames[advertId]]) {
          const rkStat = advertStatsMpManager[advertId];
          for (const [index, artData] of Object.entries(rkStat)) {
            const vendorCode = vendorCodes[artData.vendorCode];
            if (!vendorCode) continue;
            const stat_date = artData.createdAt.slice(0, 10);
            if (stat_date != str_date) continue;
            // console.log(vendorCode, artData.vendorCode);
            if (!nms_to_sum_orders.includes(vendorCode))
              nms_to_sum_orders.push(vendorCode);
          }
        } else {
          nms_to_sum_orders.push(advertNames[advertId]);
        }

        if (nms_to_sum_orders[0] && nms_to_sum_orders[0].includes("ФТБЛ")) {
          const temp = nms_to_sum_orders.slice();
          nms_to_sum_orders.length = 0;
          for (const [index, brand_art] of Object.entries(temp)) {
            for (const [art, art_data] of Object.entries(artsBarcodesFull))
              if (art.includes(brand_art) && !nms_to_sum_orders.includes(art))
                nms_to_sum_orders.push(art);
          }
        }

        if (!artsBarcodesFull[nms_to_sum_orders[0]])
          return { rk_data: result, brand: undefined };

        nms_to_sum_orders = Array.from(new Set(nms_to_sum_orders));
        // if (campaign == "TKS") console.log(nms_to_sum_orders);

        // console.log(advertNames[advertId], nms_to_sum_orders, generalMasks, advertNames[advertId].split("/")[0], generalMasks.includes(advertNames[advertId].split("/")[0]));
        if (!orders[str_date]) continue;
        if (!stocksRatio.byDate[str_date]) continue;
        // console.log(str_date);
        for (const [art, value] of Object.entries(orders[str_date])) {
          if (!nms_to_sum_orders.includes(art)) continue;
          result.orders += value;
        }
        for (const [art, value] of Object.entries(sum_orders[str_date])) {
          if (!nms_to_sum_orders.includes(art)) continue;
          result.sum_orders += value;
        }

        for (const [mask, count] of Object.entries(
          stocksRatio.byDate[str_date]
        )) {
          if (
            !(nms_to_sum_orders[0]
              ? getMaskFromVendorCode(nms_to_sum_orders[0]) == mask
              : false)
          )
            continue;
          // console.log(art, mask, sum);
          // if (getMaskFromVendorCode(nms_to_sum_orders[0]) == "КПБ_2+ЕВРО_МОНТЕ_ТКС")
          //   console.log(nms_to_sum_orders, mask, count, str_date);
          result.stocks += count;
        }

        if (!rkData[str_date]) continue;

        // if (
        //   getMaskFromVendorCode(nms_to_sum_orders[0]) == "КПБ_2+ЕВРО_МОНТЕ_ТКС"
        // )
        // console.log(result.stocks, date_range, str_date);
        result.views += rkData[str_date].views ?? 0;
        result.clicks += rkData[str_date].clicks ?? 0;
        result.sum += rkData[str_date].sum ?? 0;
        if (result.views) result.ctr = result.clicks / result.views;
        if (result.views) result.cpm = result.sum / (result.views / 1000);
        if (result.clicks) result.cpc = result.sum / result.clicks;
        // console.log(result);
      }

      result.stocks = `${
        parseInt(
          Math.round(
            (result.stocks / (date_range.from - date_range.to + 1)) * 10
          )
        ) / 10
      }/${
        nms_to_sum_orders[0]
          ? stocksRatio.all[getMaskFromVendorCode(nms_to_sum_orders[0])]
          : 0
      }`;

      result.drr = result.sum / result.sum_orders;
      result.avg_bill = result.sum_orders / result.orders;
      // result.drr = result.sum_orders ? result.sum / result.sum_orders : 0;
      // console.log(artsBarcodesFull[nms_to_sum_orders[0]], nms_to_sum_orders[0], nms_to_sum_orders, advertId);

      return {
        rk_data: result,
        brand: nms_to_sum_orders.length
          ? brand_names[artsBarcodesFull[nms_to_sum_orders[0]].brand]
          : undefined,
      };
    };
    const stat_date_ranges = [
      // days before today
      { from: 0, to: 0 },
      { from: 1, to: 1 },
      { from: 7, to: 1 },
    ];

    // const formulas_to_concat = [];
    const sheet_data_temp = {};

    let brand = "";
    for (const [unused, rkData] of Object.entries(advertInfos)) {
      //// formulas
      let include_this_rk = false;
      let rkStatInRanges = [];
      for (let i = 0; i < stat_date_ranges.length; i++) {
        const adv_stats = calc_adv_stats_in_date_range(
          rkData.advertId,
          stat_date_ranges[i]
        );
        const rkRangeDateData = adv_stats.rk_data;
        brand = adv_stats.brand ?? std_brand_names[campaign];
        if (!(brand in sheet_data_temp)) sheet_data_temp[brand] = [];
        if (rkRangeDateData.sum != 0) include_this_rk = true;
        const to_push = Array(unique_params.length);
        for (let j = 0; j < to_push.length; j++) {
          to_push[j] = rkRangeDateData[param_map[unique_params[j]].name];
        }
        // if (mask == "КПБ_2_СТРАЙП") console.log(mask, to_push);
        rkStatInRanges = rkStatInRanges.concat(to_push);
        // console.log(mask, fact[i], to_push);
      }
      const rk_type_map = { 6: "Поиск", 8: "Авто" };
      const rk_status_map = {
        4: "Готова к запуску",
        7: "Завершена",
        8: "Отказался",
        9: "Идут показы",
        11: "Пауза",
      };
      if (include_this_rk && [9, 11].includes(rkData.status)) {
        // if (!advertBudgets[rkData.advertId]) continue;
        // console.log(rkData.advertId);
        rkData.type = rk_type_map[rkData.type];
        rkData.status = rk_status_map[rkData.status];
        sheet_data_temp[brand].push(
          [
            rkData[infos_columns_map[advert_infos_columns[0]]],
            rkData[infos_columns_map[advert_infos_columns[1]]],
            rkData[infos_columns_map[advert_infos_columns[2]]],
            rkData[infos_columns_map[advert_infos_columns[3]]],
          ].concat(
            rkStatInRanges.concat([
              advertBudgets[rkData.advertId]
                ? advertBudgets[rkData.advertId].total
                : 0,
            ])
          )
        );
      }
    }

    const promises = [];
    for (const [brand, _sheet] of Object.entries(sheet_data_temp)) {
      _sheet.sort((a, b) => {
        return b[0] - a[0];
      });

      const sheet_data = [Array(4), Array(4)];
      const inputed_rks = [];
      for (let i = 0; i < _sheet.length; i++) {
        if (!inputed_rks.includes(_sheet[i][0])) {
          sheet_data.push(_sheet[i]);
          inputed_rks.push(_sheet[i][0]);
        }
        // console.log(brand, _sheet[i][0]);
      }
      for (let i = 0; i < stat_date_ranges.length; i++) {
        sheet_data[1] = sheet_data[1].concat(unique_params);
      }
      // return;
      const spId = `РК ${brand}`;

      promises.push(
        sheets.spreadsheets.values
          .clear({
            spreadsheetId: "1I-hG_-dVdKusrSVXQYZrYjLWDEGLOg6ustch-AvlWHg",
            range: `${spId}!3:1000`,
          })
          .then(() =>
            sheets.spreadsheets.values.update({
              spreadsheetId: "1I-hG_-dVdKusrSVXQYZrYjLWDEGLOg6ustch-AvlWHg",
              range: `${spId}!1:1000`,
              valueInputOption: "USER_ENTERED", // The information will be passed according to what the usere passes in as date, number or text
              resource: {
                values: sheet_data,
              },
            })
          )
      );
    }
    await Promise.all(promises).then(() => resolve());
  });
}

function fetchNewRKsToCreate(auth) {
  return new Promise(async (resolve, reject) => {
    const sheets = google.sheets({ version: "v4", auth });
    const unique_params_res = await sheets.spreadsheets.values.get({
      spreadsheetId: "1I-hG_-dVdKusrSVXQYZrYjLWDEGLOg6ustch-AvlWHg",
      range: `Запуск РК!1:1`,
    });
    const unique_params_temp = unique_params_res.data.values[0];
    const unique_params = [];
    for (let i = 0; i < unique_params_temp.length; i++)
      if (!unique_params.includes(unique_params_temp[i]))
        unique_params.push(unique_params_temp[i]);
    const param_map = {
      "Группы предметов": "subjects",
      "Артикул WB": "id",
      "Артикул поставщика": "art",
      "ТИП РК": "rk_type",
      ФРАЗА: "phrase",
      СТАВКА: "bid",
      БЮДЖЕТ: "budget",
      "ID РК": "rk_id",
      СТАТУС: "status",
    };

    const res = await sheets.spreadsheets.values.get({
      spreadsheetId: "1I-hG_-dVdKusrSVXQYZrYjLWDEGLOg6ustch-AvlWHg",
      range: `Запуск РК!2:1000`,
    });
    const rows = res.data.values;
    const new_rks_data = [];
    for (let i = 0; i < rows.length; i++) {
      const row = rows[i];
      if (!row[0]) continue;
      new_rks_data.push({});
      for (let j = 0; j < unique_params.length; j++) {
        new_rks_data[i][param_map[unique_params[j]]] = row[j];
        if (
          param_map[unique_params[j]] == "budget" ||
          param_map[unique_params[j]] == "bid"
        )
          new_rks_data[i][param_map[unique_params[j]]] = parseInt(
            row[j].replace(/\s/g, "")
          );
      }
    }
    // console.log(new_rks_data);
    await sheets.spreadsheets.values.clear({
      spreadsheetId: "1I-hG_-dVdKusrSVXQYZrYjLWDEGLOg6ustch-AvlWHg",
      range: `Запуск РК!2:1000`,
    });
    writeDataToFile(
      new_rks_data,
      path.join(__dirname, `../files/RKsToCreate.json`)
    ).then((pr) => resolve());
  });
}

function fetchFeedbackAnswerTemplatesAndWriteToJSON(auth) {
  return new Promise(async (resolve, reject) => {
    const sheets = google.sheets({ version: "v4", auth });
    const campaigns = await JSON.parse(
      await fs.readFile(path.join(__dirname, "../files", "campaigns.json"))
    ).campaigns;

    const promises = [];
    const sheet_names = {
      mayusha: "Маюша",
      delicatus: "Деликатус",
      TKS: "ТКС",
      perinka: "Перинка",
    };
    for (const [index, campaign] of Object.entries(campaigns)) {
      let previouslyFetchedTemplates = {};
      if (
        afs.existsSync(
          path.join(__dirname, "../files", campaign, "answerTemplates.json")
        )
      )
        previouslyFetchedTemplates = await JSON.parse(
          await fs.readFile(
            path.join(__dirname, "../files", campaign, "answerTemplates.json")
          )
        );

      const answers_res = await sheets.spreadsheets.values.get({
        spreadsheetId: "1M31LYMUCYRQeQYtzoHasaQzsp7AQjQ-NNwVf2kY-DLc",
        range: `${sheet_names[campaign]}!1:1000`,
      });
      const answers_temp = answers_res.data.values;
      const answers = {};
      for (let j = 0; j < answers_temp[0].length; j++) {
        const mask = answers_temp[0][j];
        if (mask == "" || !mask) continue;
        for (let i = 1; i < answers_temp.length; i++) {
          const answer_template = answers_temp[i][j];
          if (answer_template == "" || !answer_template) continue;
          if (!(mask in answers)) answers[mask] = [];
          answers[mask].push(answer_template);
        }
      }

      // check if templates were modified
      const needRewrite = () => {
        // console.log(previouslyFetchedTemplates);
        let rewrite_flag = true;
        if (Object.entries(previouslyFetchedTemplates).length) {
          rewrite_flag = false;
          for (const [mask, mask_templates] of Object.entries(answers)) {
            if (!(mask in previouslyFetchedTemplates)) return true;

            for (const [index, temp] of Object.entries(mask_templates)) {
              if (!previouslyFetchedTemplates[mask].includes(temp)) return true;
            }
          }
        }
        return rewrite_flag;
      };

      if (!needRewrite()) {
        console.log("No need to rewrite", campaign, "feedback templates");
        continue;
      }
      promises.push(
        writeDataToFile(
          answers,
          path.join(__dirname, "../files", campaign, "answerTemplates.json")
        )
      );
    }
    Promise.all(promises).then((pr) => resolve());
  });
}

function genAllEqualTemplatesSheet(auth) {
  return new Promise(async (resolve, reject) => {
    const sheets = google.sheets({ version: "v4", auth });
    const campaigns = await JSON.parse(
      await fs.readFile(path.join(__dirname, "../files", "campaigns.json"))
    ).campaigns;

    const promises = [];
    const sheet_names = {
      mayusha: "Маюша",
      delicatus: "Деликатус",
      TKS: "ТКС",
    };
    const templates = {
      mayusha: [
        "Доброго времени суток! Ваш отзыв очень важен. Мы благодарны, что выбираете наши товары, ведь мы работаем для вас. Нажмите на сердечко, чтобы добавить бренд в избранное и первым узнавайте о скидках и новинках. С нежностью, Маюша.",
        "Благодарим за ваш отзыв! Это помогает нам стать еще лучше для вас. А чтобы всегда найти нас - добавьте бренд в избранное и всегда будьте в курсе новинок и распродаж. С любовью, Маюша.",
        "Здравствуйте! Спасибо за выбор нашего товара и ваш отзыв. Наша важная миссия - заботиться о вас и вашем доме. Будем рады вашим новым заказам, а чтобы всегда найти нас - добавьте бренд в избранное и всегда будьте в курсе новинок и распродаж! С нежностью, Маюша.",
        "Приветствуем! Благодарим за ваш отзыв. Благодаря обратной связи мы становимся еще лучше для своих покупателей. Добавьте наш бренд в избранное и сможете увидеть полный каталог наших товаров, а также первым узнавать о скидках и новинках. С наилучшими пожеланиями, Маюша.",
        "Здравствуйте! Спасибо за ваш отзыв и покупку. Мы работаем для вас и нам очень важна обратная связь.  Нажмите на сердечко, чтобы добавить наш бренд в избранное и первым узнавайте о скидках и новинках. С благодарностью, Маюша.",
        "Приветствуем! Спасибо, что выбрали нас. Ваше доверие - наша лучшая награда! Добавьте наш бренд в избранное и первым узнавайте о скидках и новинках. С заботой, Маюша.",
        "Приветствуем! Спасибо, что нашли время оставить отзыв! Это наполняет нашу работу смыслом. Добавьте наш бренд в избранное и сможете увидеть полный каталог наших товаров, а также первым узнавать о скидках и новинках. С благодарностью, Маюша.",
        "Доброго времени суток! Спасибо за то, что выбираете нас. Добавьте наш бренд в избранное и первым узнавайте о скидках и новинках. В нашем полном каталоге вас ждет приятный выбор товаров. С уважением, Маюша.",
        "Спасибо за ваш отзыв! Мы ценим, что вы выбираете нас. В нашем полном каталоге вас ждет увлекательный выбор) Нажмите на сердечко, чтобы добавить бренд в избранное и первым узнавайте о скидках и новинках. С наилучшими пожеланиями, Маюша.",
        "Спасибо за то, что нашли время оценить наши товары! В нашем полном каталоге прекрасный выбор и мы будем рады вашим новым заказам. С уважением, Маюша.",
      ],
      delicatus: [
        "Спасибо за ваш отзыв! Мы признательны, что вы выбираете нас. В нашем полном каталоге вас ждет яркий выбор для самого уютного дома. С теплотой, команда DELICATUS.",
        "Здравствуйте! Благодарим за выбор бренда DELICATUS. Ваше мнение делает нас лучше.  Добавьте бренд в избранное и всегда будьте в курсе новинок и распродаж.",
        "Здравствуйте! Спасибо, что выбрали нас. Ваш уютный дом - наша лучшая награда! Добавьте бренд DELICATUS в избранное и первым узнавайте о скидках и новинках.",
        "Приветствуем! Спасибо за то, что выбираете нас. Мы работаем для вас и нам очень важна обратная связь.  Нажмите на сердечко, чтобы добавить бренд DELICATUS в избранное и первым узнавайте о скидках и новинках.",
        "Приветствуем! Спасибо за ваш отзыв и покупку. Благодаря обратной связи мы становимся еще лучше для своих покупателей. Добавьте наш бренд в избранное и сможете увидеть полный каталог наших товаров, а также первым узнавать о скидках и новинках. С наилучшими пожеланиями, команда DELICATUS.",
        "Доброго времени суток! Благодарим за то, что нашли время оставить отзыв. DELICATUS растущий бренд и мнение наших покупателей помогает сделать его еще лучше для вас. Нажмите на сердечко, чтобы добавить нас в избранное и первым узнавайте о скидках и новинках.",
        "Спасибо за то, что нашли время оценить наши товары! Ваша обратная связь помогает нам стать еще лучше для вас. Добавьте наш бренд в избранное и сможете увидеть полный каталог наших товаров, а также первым узнавать о скидках и новинках. С благодарностью, команда DELICATUS.",
        "Здравствуйте! Спасибо за выбор нашего товара и ваш отзыв. Нам приятно заботиться о вас и вашем доме. Добавьте наш бренд в избранное и первым узнавайте о скидках и новинках. С заботой, команда DELICATUS.",
        "Благодарим за ваш отзыв! Ваше мнение очень важно для нас. Будем рады вашим новым заказам, а чтобы всегда найти нас, добавьте бренд в избранное и всегда будьте в курсе новинок и распродаж. С уважением, команда DELICATUS.",
      ],
      TKS: [
        "Спасибо, что нашли время оставить отзыв! Это мотивирует нас становиться еще лучше для вас. Нажмите на сердечко, чтобы добавить наш бренд в избранное и первым узнавайте о скидках и новинках магазина.",
        "Добрый день! Мы благодарны за ваш отзыв. Выбор в пользу заботы о своем комфорте - самый верный. Нам приятно, что Вы доверяете нам. С любовью и заботой, Объединенная текстильная компания",
        "Здравствуйте! Спасибо за выбор нашего товара и ваш отзыв. Миссия нашей компании - искренне заботиться о вас и вашем доме. В нашем полном каталоге прекрасный выбор качественных товаров. С наилучшими пожеланиями, Объединенная текстильная компания.",
        "Приветствуем! Спасибо, что выбрали нас. Благодарим за доверие нашему бренду. Наша главная особенность - полезные товары для дома и Вашего комфорта. Добавьте наш бренд в избранное и сможете увидеть полный каталог наших товаров, а также первым узнавать о скидках и новинках. С уважением, Объединенная текстильная компания.",
        "Здравствуйте! Спасибо за покупку и ваш отзыв. Добавьте наш бренд в избранное и первым узнавайте о скидках и новинках магазина. Переходите в полный каталог и наслаждайтесь выбором.",
        "Доброго времени суток! Мы работаем для вас и каждый отзыв очень важен. Добавьте наш бренд в избранное и сможете увидеть полный каталог наших товаров, а также первым узнавать о скидках и новинках. С заботой, Объединенная текстильная компания.",
        "Здравствуйте! Ваш отзыв очень важен. Спасибо за то, что выбираете нас! Добавьте наш бренд в избранное и первым узнавайте о скидках и новинках магазина. В нашем полном каталоге вас может многое заинтересовать)",
        "Спасибо, что нашли время оставить отзыв! Вы помогаете нам становиться лучше. Будем рады вашим новым заказам, а чтобы всегда найти нас - добавьте бренд в избранное и всегда будьте в курсе новинок и распродаж!",
        "Благодарим за ваш отзыв! Спасибо за доверие. Добавьте наш бренд в избранное и первым узнавайте о скидках и новинках. В нашем полном каталоге прекрасный выбор и мы будем рады вашим заказам. С любовью, Объединенная текстильная компания.",
      ],
    };
    for (const [index, campaign] of Object.entries(campaigns)) {
      if (!sheet_names[campaign]) continue;
      const vendorCodes = await JSON.parse(
        await fs.readFile(
          path.join(__dirname, "../files", campaign, "vendorCodes.json")
        )
      );
      const masks = [];
      for (const [id, art] of Object.entries(vendorCodes)) {
        const mask = getMaskFromVendorCode(art);
        if (!masks.includes(mask)) masks.push(mask);
      }
      masks.sort();
      console.log(masks);

      const sheet_data = [masks];
      const camp_templates = templates[campaign];
      for (const [index, template] of Object.entries(camp_templates)) {
        const to_push = [];
        for (const [index, mask] of Object.entries(masks)) {
          to_push.push(template);
        }
        sheet_data.push(to_push);
      }
      await sheets.spreadsheets.values.clear({
        spreadsheetId: "1M31LYMUCYRQeQYtzoHasaQzsp7AQjQ-NNwVf2kY-DLc",
        range: `${sheet_names[campaign]}!1:1000`,
      });
      await sheets.spreadsheets.values.update({
        spreadsheetId: "1M31LYMUCYRQeQYtzoHasaQzsp7AQjQ-NNwVf2kY-DLc",
        range: `${sheet_names[campaign]}!1:1000`,
        valueInputOption: "USER_ENTERED", // The information will be passed according to what the usere passes in as date, number or text
        resource: {
          values: sheet_data,
        },
      });
    }
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
        path.join(__dirname, "../files", campaign, "advertInfos.json")
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
        for (const st in orders) {
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

            if (!st || !advertsCreateDate[mask]) {
              // console.log(st, "con");
              continue;
            }
            // console.log(st);
            const date = st.replace(/(\d{4})\-(\d{2})\-(\d{2})/, "$3.$2.$1");

            // if ()) {
            //   // console.log(
            //   //   campaign,
            //   //   st,
            //   //   advertsCreateDate[mask],
            //   //   new Date(advertsCreateDate[mask].createTime)
            //   // );
            //   continue;
            // }
            // console.log(date, st);

            const analytics_data =
              new Date(st) >= new Date(advertsCreateDate[mask].createTime) &&
              afs.existsSync(path.join(mainDlDir, `${date}.xlsx`))
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
              rashod: parseInt(
                String(
                  analytics_data[
                    new Date(st) >= new Date("2023-07-14") ? 11 : 9
                  ]
                ).replace(/\s/g, "")
              ),
              orders: 0,
              sum_orders: 0,
              drr: 0,
            };
            // console.log(st, mask, maskStat);
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
            // console.log(campaign, mask, st, temp[mask][st]);
            // console.log(st, mask, temp[mask][st]);
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
        // console.log(temp);
        // return;
        for (let i = 0; i < days.length; i++) {
          for (const j in masks) {
            if (!sheet_data[i]) {
              // sheet_data.push(145);
              sheet_data.push(rows[0].length);
            }
            let st = days[i];
            if (!st) {
              sheet_data[i] = [];
              continue;
            }
            // st = st.replace(/(\d{2})\.(\d{2})\.(\d{4})/, "$3-$2-$1");
            sheet_data[i][0] = st;
            // console.log(st);
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
              // console.log(st, masks[j]);
              // sheet_data[i] = Array(sheet_data[0].length);
              // sheet_data[i][0] = st;
              // for (const column in columns["Заказы"]) {
              //   // console.log(i, [columns["Заказы"][column]]);
              //   sheet_data[i][columns["Заказы"][column]] =
              //     data[masks[j]][st].orders;
              // }
              // for (const column in columns["Сумма"]) {
              //   // console.log(i, [columns["Заказы"][column]]);
              //   sheet_data[i][columns["Сумма"][column]] =
              //     data[masks[j]][st].sum_orders;
              // }
              // maskValuesStrartIndex += 9;
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
                pivot_sheet.reverse();
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

function updateLowRatingStocksSheet(auth) {
  return new Promise(async (resolve, reject) => {
    const sheets = google.sheets({ version: "v4", auth });
    await sheets.spreadsheets.values.clear({
      spreadsheetId: "1iEaUSYe4BejADWpS9LgKGADknFwnvrF3Gc3PRS9ibME",
      range: `Данные!2:700`,
    });
    const find_spp = (vendorCode, rows) => {
      for (const row of rows) {
        if (row[0] != vendorCode) continue;
        return row[6];
      }
    };
    const sheet_data = [];
    const campaigns = await JSON.parse(
      await fs.readFile(path.join(__dirname, "../files/campaigns.json"))
    );
    for (const campaign of campaigns.campaigns) {
      const temp = [];
      const stocks = await JSON.parse(
        await fs.readFile(
          path.join(__dirname, "../files", campaign, "stocks.json")
        )
      ).today;
      const artRatings = await JSON.parse(
        await fs.readFile(
          path.join(__dirname, "../files", campaign, "artRatings.json")
        )
      );
      const vendorCodes = await JSON.parse(
        await fs.readFile(
          path.join(__dirname, "../files", campaign, "vendorCodes.json")
        )
      );
      const vendorCodesFull = await JSON.parse(
        await fs.readFile(
          path.join(__dirname, "../files", campaign, "vendorCodesFull.json")
        )
      );
      const xlsx_data = xlsx.parse(
        path.join(__dirname, `../files/${campaign}/data.xlsx`)
      );
      let spp_price_sheet = [];
      for (let i = 0; i < xlsx_data.length; i++) {
        spp_price_sheet = spp_price_sheet.concat(xlsx_data[i].data);
      }

      for (const [key, data] of Object.entries(artRatings)) {
        if (data.valuation >= 4.7) continue;
        // if (code.includes("НАМАТРАСНИК")) code.splice(1);
        // else if (code.includes("КПБ")) code.splice(3);
        // else code.splice(2);
        // let remask = code.join("_");
        // if (mask.match("_2$")) remask += "*2";
        // console.log(remask);
        const code = key.split("_");
        if (
          code[0].match("ПР") &&
          ["120", "140", "180", "200"].includes(code[1]) &&
          code.slice(-1) != "2"
        )
          continue;
        for (const [art, vendorCode] of Object.entries(vendorCodes)) {
          if (vendorCode != key || !stocks[vendorCode]) continue;
          temp.push([
            vendorCode,
            art,
            vendorCodesFull[vendorCode].object,
            vendorCodesFull[vendorCode].brand,
            data.valuation ?? "0",
            data.feedbacksCount,
            data.feedbacksCount
              ? Math.ceil(
                  (data.feedbacksCount * (4.7 - data.valuation ?? 0)) / 0.3
                )
              : 3,
            stocks[vendorCode] ?? 0,
            find_spp(vendorCode, spp_price_sheet),
          ]);
        }
      }
      temp.sort((a, b) => {
        if (b[1] > a[1]) return -1;
        if (b[1] < a[1]) return 1;
        return 0;
      });
      for (let i = 0; i < temp.length; i++) sheet_data.push(temp[i]);
      // console.log(temp, sheet_data);
    }

    // console.log(sheet_data);
    const update_data = async (data) => {
      await sheets.spreadsheets.values.update({
        spreadsheetId: "1iEaUSYe4BejADWpS9LgKGADknFwnvrF3Gc3PRS9ibME",
        range: `Данные!2:700`,
        valueInputOption: "USER_ENTERED", // The information will be passed according to what the usere passes in as date, number or text
        resource: {
          values: data,
        },
      });
    };
    await update_data(sheet_data);
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

async function generateAdvertSpreadsheet(auth) {
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

async function copyPricesToDataSpreadsheet(auth) {
  return new Promise(async (resolve, reject) => {
    const artPrices = await JSON.parse(
      await fs.readFile(path.join(__dirname, "../files", "artPrices.json"))
    );
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

    // console.log(prices);

    const data_rows = (
      await sheets.spreadsheets.values.get({
        spreadsheetId: destinationSpreadsheetId,
        range: `Данные!A2:A`,
      })
    ).data.values;

    const data = [];
    data_rows.forEach((row) => {
      const mask = getGeneralMaskFromVendorCode(row[0]);
      if (row[0] == "") return;
      // console.log(mask, row[0]);
      data.push([artPrices[mask] ? artPrices[mask].rc : 0]);
    });
    await sheets.spreadsheets.values.clear({
      spreadsheetId: destinationSpreadsheetId,
      range: `Данные!J2:J`,
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
      range: `${sheet}!B2:C`,
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
        if (!row[0].includes("_ПРК")) {
          if (array[0] == "ПР" || array[0] == "ПРПЭ") {
            if (
              array[1] == "120" ||
              array[1] == "140" ||
              array[1] == "180" ||
              array[1] == "200"
            ) {
              if (array.slice(-1)[0] != "2") return;
            }
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
      const sheet_data = await get_data(title);
      console.log(title, sheet_data);

      const masks = [];
      for (let i = 0; i < sheet_data.length; i++) {
        const row = sheet_data[i];
        if (!row[0]) continue;
        let mask = getMaskFromVendorCode(row[0]);
        console.log(title, mask);
        mask = mask.split("_");
        if (!mask.includes("КПБ")) {
          mask = mask.slice(0, 1);
        } else {
          mask = title == "DELICATUS" ? mask.slice(-1) : mask.slice(-2, -1);
        }
        mask =
          row[0].includes("DELICATUS") && row[0].includes("КПБ")
            ? mask[0] + " 2"
            : mask[0];

        if (
          (mask == "СТРАЙП" && title == "DELICATUS") ||
          mask.includes("НАМАТРАСНИК") ||
          (mask.includes("МОНТЕ") && title == "DELICATUS")
        )
          continue;
        if (!masks.includes(mask)) masks.push(mask);
      }
      console.log(masks);
      for (let i = 0; i < masks.length; i++) {
        const mask_title = title + " " + masks[i];
        // console.log(mask_title);
        const oldSheet = destinationSheets.data.sheets.find(
          (sheet) => sheet.properties.title === mask_title
        );
        const mask_sheet_data = [];
        for (let j = 0; j < sheet_data.length; j++) {
          const row = sheet_data[j];
          if (!row[0]) continue;
          if (!row[0].split("_").includes(masks[i].split(" ")[0])) continue;
          if (
            masks[i].split(" ").length == 1 &&
            row[0].includes("КПБ") &&
            row[0].includes("DELICATUS")
          )
            continue;
          if (masks[i].split(" ").length == 2 && !row[0].includes("DELICATUS"))
            continue;

          mask_sheet_data.push(sheet_data[j]);
        }
        // console.log(mask_sheet_data);
        // continue;
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
                  newSheetName: mask_title,
                },
              },
            ],
          },
        });
        await update_data(mask_title, mask_sheet_data);
      }
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
  fetchAvgRatingsAndWriteToJSON: async () => {
    const auth = await authorize();
    await fetchAvgRatingsAndWriteToJSON(auth).catch(console.error);
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
  fetchNewRKsToCreate: async () => {
    const auth = await authorize();
    await fetchNewRKsToCreate(auth).catch(console.error);
  },
  updateRNP: async () => {
    const auth = await authorize();
    await updateRNP(auth).catch(console.error);
  },
  updatePlanFact: async (campaign) => {
    const auth = await authorize();
    await updatePlanFact(auth, campaign).catch(console.error);
  },
  updateFactStatsByRK: async (campaign) => {
    const auth = await authorize();
    await updateFactStatsByRK(auth, campaign).catch(console.error);
  },
  generateAdvertSpreadsheet: async () => {
    const auth = await authorize();
    return await generateAdvertSpreadsheet(auth).catch(console.error);
  },
  copyPricesToDataSpreadsheet: async () => {
    const auth = await authorize();
    await copyPricesToDataSpreadsheet(auth).catch(console.error);
  },
  copyZakazToOtherSpreadsheet: async () => {
    const auth = await authorize();
    await copyZakazToOtherSpreadsheet(auth).catch(console.error);
  },
  updateLowRatingStocksSheet: async () => {
    const auth = await authorize();
    await updateLowRatingStocksSheet(auth).catch(console.error);
  },
  fetchFeedbackAnswerTemplatesAndWriteToJSON: async () => {
    const auth = await authorize();
    await fetchFeedbackAnswerTemplatesAndWriteToJSON(auth).catch(console.error);
  },
  sendEmail: async (to, subject, body) => {
    const auth = await authorize();
    await sendEmail(auth, to, subject, body).catch(console.error);
  },
  pivotOrders: async (campaign) => {
    const auth = await authorize();
    await pivotOrders(auth, campaign).catch(console.error);
  },
  writeDrrToDataSpreadsheet: async () => {
    const auth = await authorize();
    await writeDrrToDataSpreadsheet(auth).catch(console.error);
  },
  writeSppToDataSpreadsheet: async () => {
    const auth = await authorize();
    await writeSppToDataSpreadsheet(auth).catch(console.error);
  },
  calcAndWriteMinZakazToDataSpreadsheet: async () => {
    const auth = await authorize();
    await calcAndWriteMinZakazToDataSpreadsheet(auth).catch(console.error);
  },
  generatePricesTemplateSheet: async () => {
    const auth = await authorize();
    await generatePricesTemplateSheet(auth).catch(console.error);
  },
  fetchArtMaskPricesAndWriteToJSON: async () => {
    const auth = await authorize();
    await fetchArtMaskPricesAndWriteToJSON(auth).catch(console.error);
  },
  genAllEqualTemplatesSheet: async () => {
    const auth = await authorize();
    await genAllEqualTemplatesSheet(auth).catch(console.error);
  },
  fetchAutoPriceRulesAndWriteToJSON: async () => {
    const auth = await authorize();
    await fetchAutoPriceRulesAndWriteToJSON(auth).catch(console.error);
  },
  writeLogisticsToDataSpreadsheet: async () => {
    const auth = await authorize();
    await writeLogisticsToDataSpreadsheet(auth).catch(console.error);
  },
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
const indexToColumn = (index) => {
  // Validate index size
  const maxIndex = 18278;
  if (index > maxIndex) {
    return "";
  }

  // Get column from index
  const l = "ABCDEFGHIJKLMNOPQRSTUVWXYZ";
  if (index > 26) {
    const letterA = indexToColumn(Math.floor((index - 1) / 26));
    const letterB = indexToColumn(index % 26);
    return letterA + letterB;
  } else {
    if (index == 0) {
      index = 26;
    }
    return l[index - 1];
  }
};

const readIfExists = (filepath, _default = {}) => {
  let result = _default;
  if (afs.existsSync(filepath)) result = JSON.parse(afs.readFileSync(filepath));
  return result;
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
