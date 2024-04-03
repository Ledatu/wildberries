const axios = require("axios");
const fs = require("fs");
const path = require("path");
const { readIfExists } = require("./main");

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

    const allCardDataList = { updateTime: undefined };

    let firstAdvertIndexFlag = 0;
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
          for (let i = 0; i < data.data.products.length; i++) {

            const cur = data.data.products[i];
            cur.index = i + 1 + ((page - 1) * 100);
            const { id, log } = cur;
            if (page == 1) {
              if (log && log.cpm && !firstAdvertIndexFlag) { firstAdvertIndexFlag = 1; allCardDataList.firstAdvertIndex = cur.index; }
            }
            cur.prevIndex = old ? old.data ? old.data[id] ? old.data[id].index : undefined : undefined : undefined;
            cur.prevPrevIndex = old ? old.data ? old.data[id] ? old.data[id].prevIndex : undefined : undefined : undefined;
            myData[id] = cur;
          }

          if (!allCardDataList.data) allCardDataList.data = {}
          Object.assign(allCardDataList.data, myData);

          await new Promise(resolve => setTimeout(resolve, 100))
        } else {
          page--;
          retryCount++;
          if (retryCount % 100 == 0) {
            console.log(searchPhrase, retryCount);
            await new Promise(resolve => setTimeout(resolve, 100))
          }
          if (retryCount == 200) {
            retryCount = 0;
            break;
          }
          // console.log(`Not enough data for search phrase: ${searchPhrase} on page ${page} only ${data.data.products.length} retrying`);

        }

        // console.log(`Data saved for search phrase: ${searchPhrase}, page: ${page}`);
      } catch (error) {
        console.error(`Error fetching data for search phrase: ${searchPhrase}, page: ${page}`, error);
      }
    }

    if (allCardDataList && allCardDataList.data && Object.keys(allCardDataList.data).length == 300) {

      allCardDataList.updateTime = new Date().toISOString();

      const allDataFilePath = path.join(directory, `${searchPhrase.replace(/\s/g, "_").replace(/\//g, "_")}.json`);
      fs.writeFileSync(allDataFilePath, JSON.stringify(allCardDataList, null, 2));

      scrapedData[searchPhrase] = allCardDataList;

      console.log(`All data saved for search phrase: ${searchPhrase}`);
    } else {

      // console.log(`Not enough data for search phrase: ${searchPhrase} only ${Object.keys(allCardDataList.data).length}`);
    }
  }

  return scrapedData;
}

module.exports = { scrapeWildberriesData };
