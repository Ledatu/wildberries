const axios = require("axios");
const fs = require("fs");
const path = require("path");
const { readIfExists, getRoundValue } = require("./main");

const userAgent =
  "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/58.0.3029.110 Safari/537.3";

const proxyConfig = {
  host: "5.101.91.204",
  port: "8000",
  auth: {
    username: "HCqaxb",
    password: "gXaA5a",
  },
};

async function scrapeWildberriesData(searchPhrases) {
  const scrapedData = {};

  for (const searchPhrase of searchPhrases) {
    const directory = path.join(__dirname, "placementsByPhrases");
    if (!fs.existsSync(directory)) {
      fs.mkdirSync(directory);
    }

    const allCardDataList = { updateTime: undefined, cpms: { search: [], auto: [], }, firstAdvertIndex: {}, data: { count: 0 } };

    let retryCount = 0;
    for (let page = 1; page <= 3; page++) {
      // retryCount = 0;
      const url = `https://search.wb.ru/exactmatch/ru/common/v5/search?ab_testing=false&appType=1&page=${page}&curr=rub&dest=-1257218&query=${encodeURIComponent(searchPhrase)}&resultset=catalog&sort=popular&spp=30&suppressSpellcheck=false`;

      try {
        const response = await axios.get(url, {
          headers: {
            "User-Agent": userAgent,
          },
          // proxy: {
          //   host: proxyConfig.host,
          //   port: proxyConfig.port,
          //   auth: {
          //     username: proxyConfig.auth.username,
          //     password: proxyConfig.auth.password,
          //   },
          // },
        });

        // Process the response data here
        const data = response.data;;


        // Save the data to a file or do further processing
        let old = undefined
        try {
          old = readIfExists(path.join(directory, `${searchPhrase.replace(/\s/g, "_").replace(/\//g, "_")}.json`));
        }
        catch (e) { return }
        // fs.writeFileSync(filePath, JSON.stringify(data, null, 2));

        // Update allCardDataList with the fetched data
        // You can customize this part based on the structure of the response data


        if (data && data.data && data.data.products && data.data.products.length == 100) {
          const myData = {}
          const cpms = { firstPage: [] }
          for (let i = 0; i < data.data.products.length; i++) {

            const cur = data.data.products[i];
            cur.index = i + 1 + ((page - 1) * 100);
            const { id, log, name, brand, supplier } = cur;

            cur.sppPrice = getRoundValue(cur.sizes ? cur.sizes[0] ? cur.sizes[0].price ? cur.sizes[0].price.total ?? 0 : 0 : 0 : 0, 100);
            if (log) {
              cur.log.sppPrice = cur.sppPrice;
            }

            const { tp } = log ?? {};
            if (tp) {
              const advertsType = tp == 'b' ? 'auto' : tp == 'c' ? 'search' : 'none';
              cur.log.advertsType = advertsType;
              cur.advertsType = advertsType;

              cur.log.name = name;
              cur.log.brand = brand;
              cur.log.id = id;
              cur.log.supplier = supplier;
              cur.position = log.position;
              cur.promoPosition = log.promoPosition;
              cur.cpm = log.cpm;

              cur.avgBoostPrice = getRoundValue(log.cpm, cur.position - cur.promoPosition);
              cur.log.avgBoostPrice = cur.avgBoostPrice;

              if (!cpms[advertsType]) cpms[advertsType] = [];
              cpms[advertsType].push(cur.log)
              cur.cpmIndex = allCardDataList.cpms[advertsType].length + cpms[advertsType].length;
              if (page == 1) {
                if (cur.log.cpm && !allCardDataList.firstAdvertIndex[advertsType]) {
                  allCardDataList.firstAdvertIndex[advertsType] = cur.index;
                }
              }
            }
            cur.prevIndex = old ? old.data ? old.data[id] ? old.data[id].index : undefined : undefined : undefined;
            cur.prevPrevIndex = old ? old.data ? old.data[id] ? old.data[id].prevIndex : undefined : undefined : undefined;

            cur.cpmIndex = cur.cpmIndex ?? -1;
            cur.cpmPrevIndex = old ? old.data ? old.data[id] ? old.data[id].cpmIndex : undefined : undefined : undefined;
            cur.cpmPrevPrevIndex = old ? old.data ? old.data[id] ? old.data[id].cpmPrevIndex : undefined : undefined : undefined;

            myData[id] = cur;

            if (page == 1) {
              cpms.firstPage.push(cur);
            }
          }

          for (const [nmId, nmIdData] of Object.entries(myData)) {
            if (!allCardDataList.data[nmId])
              allCardDataList.data[nmId] = nmIdData;

            allCardDataList.data.count += 1;
          }

          if (!allCardDataList.cpms) allCardDataList.cpms = {}
          for (const [advertsType, logs] of Object.entries(cpms)) {
            if (!allCardDataList.cpms[advertsType]) allCardDataList.cpms[advertsType] = []
            allCardDataList.cpms[advertsType] = allCardDataList.cpms[advertsType].concat(logs);
          }

          await new Promise(resolve => setTimeout(resolve, 100))
        } else {
          page--;
          retryCount++;
          if (retryCount % 50 == 0) {
            console.log(new Date(), searchPhrase, retryCount);
            await new Promise(resolve => setTimeout(resolve, 100))
          }
          if (retryCount == 50) {
            retryCount = 0;
            break;
          }
          // console.log(new Date(), `Not enough data for search phrase: ${searchPhrase} on page ${page} only ${data.data.products.length} retrying`);

        }

        // console.log(new Date(), `Data saved for search phrase: ${searchPhrase}, page: ${page}`);
      } catch (error) {
        console.error(`Error fetching data for search phrase: ${searchPhrase}, page: ${page}`, error);
      }
    }

    if (allCardDataList && allCardDataList.data && allCardDataList.data.count == 300) {

      allCardDataList.updateTime = new Date().toISOString();

      const allDataFilePath = path.join(directory, `${searchPhrase.replace(/\s/g, "_").replace(/\//g, "_")}.json`);
      fs.writeFileSync(allDataFilePath, JSON.stringify(allCardDataList, null, 2));

      scrapedData[searchPhrase] = allCardDataList;

      console.log(new Date(), `All data saved for search phrase: ${searchPhrase}`);
    } else {

      console.log(new Date(), `Not enough data for search phrase: ${searchPhrase} only ${Object.keys(allCardDataList.data).length}`);
    }
  }

  return scrapedData;
}

module.exports = { scrapeWildberriesData };
