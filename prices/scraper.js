const { chromium } = require("playwright");
const fs = require("fs");
const path = require("path");
const axios = require("axios");
const { readIfExists } = require("./main");

const config = {
  headless: true,
};

const userAgent =
  "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/58.0.3029.110 Safari/537.3";

async function scrapeWildberriesData(searchPhrases) {
  const browser = await chromium.launch({
    ...config,
    context: {
      userAgent: userAgent,
    },
    proxy: {
      server: "wproxy.site:15133", // Новый
      username: "mAabUr",
      password: "vUsEz1baHUHA",
    },
  });

  const scrapedData = {};

  const context = await browser.newContext({});
  const pages = [
    await context.newPage(),
    await context.newPage(),
    await context.newPage(),
    await context.newPage(),
    await context.newPage(),
  ];

  await pages[0].setViewportSize({ width: 1280, height: 720 });
  await pages[1].setViewportSize({ width: 1280, height: 720 });
  await pages[2].setViewportSize({ width: 1280, height: 720 });
  await pages[3].setViewportSize({ width: 1280, height: 720 });
  await pages[4].setViewportSize({ width: 1280, height: 720 });

  let searchPhraseCount = 0;

  for (const searchPhrase of searchPhrases) {
    searchPhraseCount++;

    const directory = path.join(__dirname, "placementsByPhrases");
    if (!fs.existsSync(directory)) {
      fs.mkdirSync(directory);
    }

    const filePath = path.join(
      directory,
      `${searchPhrase.replace(/\s/g, "_")}.json`
    );

    const currentPlacementsForSearchPhrase = readIfExists(filePath);

    const allCardDataList = { updateTime: undefined, data: {} };
    const fetchss = (i) => {
      return new Promise(async (resolve, reject) => {
        const page = pages[i - 1];
        const url = `https://www.wildberries.ru/catalog/0/search.aspx?page=${i}&sort=popular&search=${searchPhrase}`;

        try {
          await page.goto(url);
        } catch (e) {
          try {
            await page.goto(url);
          } catch (e) {
            ("SHIT IS HAPPENING AND ITS REAL");
          }
        }

        console.log(
          `Scraping data for search phrase: ${searchPhrase}, page: ${i}`
        );

        try {
          await page.waitForSelector(".product-card");
        } catch (e) {
          try {
            await page.goto(url);
            await page.waitForSelector(".product-card");
          } catch (e) {
            ("SHIT IS HAPPENING AND ITS REAL");
          }
        }

        await new Promise((resolve) => setTimeout(resolve, 2 * 1000)); // Wait for the new cards to load
        for (let j = 0; j < 15; j++) {
          await page.mouse.wheel(0, 1000);
          await new Promise((resolve) => setTimeout(resolve, 1000));
        }
        await new Promise((resolve) => setTimeout(resolve, 20 * 1000)); // Wait for the new cards to load

        //   await new Promise((resolve) => setTimeout(resolve, 1 * 1000)); // Wait for the new cards to load

        const cardDataList = await page.evaluate(
          ({ i, currentPlacementsForSearchPhrase }) => {
            const cardElements = document.querySelectorAll(".product-card");
            const cardDataList = {};

            cardElements.forEach((cardElement, index) => {
              if (index > 99) return;
              const cardIndex = (i - 1) * 100 + index + 1;
              const link = cardElement
                .querySelector(".product-card__link")
                .getAttribute("href");
              const nmId = link.split("/").slice(-2, -1)[0];
              const imageSrc = cardElement
                .querySelector(".j-thumbnail")
                .getAttribute("src");
              const title = cardElement
                .querySelector(".product-card__name")
                .textContent.trim()
                .slice(2);
              const price = parseInt(
                cardElement
                  .querySelector(".price__lower-price")
                  .textContent.trim()
                  .replace(/\D/g, ""),
                10
              );
              const brand = cardElement
                .querySelector(".product-card__brand")
                .textContent.trim();

              const prevIndex = currentPlacementsForSearchPhrase.data
                ? currentPlacementsForSearchPhrase.data[nmId]
                  ? currentPlacementsForSearchPhrase.data[nmId].index
                  : -1
                : -1;

              cardDataList[nmId] = {
                index: cardIndex,
                prevIndex,
                nmId,
                link,
                imageSrc,
                title,
                price,
                brand,
              };
            });

            return cardDataList;
          },
          { i, currentPlacementsForSearchPhrase }
        );

        resolve(cardDataList);
        return cardDataList;
      });
    };

    const promises = [];
    for (let i = 1; i <= 1; i++) {
      promises.push(
        fetchss(i).then((cardDataList) => {
          Object.assign(allCardDataList.data, cardDataList);
        })
      );
      await new Promise((resolve) => setTimeout(resolve, 20 * 1000)); // Wait for the new cards to load
    }
    await Promise.all(promises);

    // allCardDataList.sort((a, b) => {
    //   return a.index - b.index;
    // });
    allCardDataList.updateTime = new Date().toISOString();

    fs.writeFileSync(filePath, JSON.stringify(allCardDataList, null, 2));

    scrapedData[searchPhrase] = allCardDataList;

    console.log(`Data saved for search phrase: ${searchPhrase}`);
  }

  //   const allDataFilePath = path.join(__dirname, "all_card_data.json");
  //   fs.writeFileSync(allDataFilePath, JSON.stringify(allCardDataList, null, 2));

  // console.log("All card data saved to all_card_data.json");
  // await new Promise((resolve) => setTimeout(resolve, 60 * 1000));
  await browser.close();

  return scrapedData;
}

module.exports = { scrapeWildberriesData };
