const fs = require("fs");
const xlsx = require("node-xlsx").default;
const path = require("path");
const { updateAnalyticsOrders } = require("../../prices/google_sheets");
const cookies = require(path.join(
  __dirname,
  "../../secrets/mp_manager/cookies"
));

function getRandomArbitrary(min, max) {
  return Math.random() * (max - min) + min;
}

const scraperObject = {
  async scraper(browser, campaign) {
    const context = await browser.newContext();
    // for (let id = 0; id < adsIds.data.length; id++) {
    const RKsToCreate = JSON.parse(
      fs.readFileSync(
        path.join(__dirname, "../../prices/files/RKsToCreate.json")
      )
    );
    const artsData = JSON.parse(
      fs.readFileSync(path.join(__dirname, "../../prices/files/data.json"))
    );
    const seller_ids = JSON.parse(
      fs.readFileSync(path.join(__dirname, "../../prices/files/campaigns.json"))
    ).seller_ids;
    const reverse_seller_ids = {};
    for (const [campaign, id] of Object.entries(seller_ids))
      reverse_seller_ids[id] = campaign;

    const activateRK = async (rk_id) =>
      new Promise(async (resolve, reject) => {
        const page = await context.newPage();
        const urls = {
          Поиск: "https://cmp.wildberries.ru/campaigns/list/all/edit/search/",
          Авто: "https://cmp.wildberries.ru/campaigns/list/all/edit/auto/",
        };

        const url = urls[rk_type] + rk_id;
        //		context.setDefaultTimeout(60000*3)
        // await page.setViewportSize({ width: 1600, height: 30000 });
        console.log(`Navigating to ${url}...`);
        // Navigate to the selected page
        await page.goto(url);
        await page.waitForLoadState();
        await page.goto(url);
        await page.waitForLoadState();
        await page.waitForTimeout(getRandomArbitrary(2000, 4000));

        await page.waitForSelector(
          "body > app-root > div > div.wrapper__body > div.wrapper__body__content > div > app-edit-auction-campaign > div > form > div:nth-child(7) > div > button.btn.btn--orange.p-l-50.p-r-50.btn--medium.ng-star-inserted"
        );
        await page.click(
          "body > app-root > div > div.wrapper__body > div.wrapper__body__content > div > app-edit-auction-campaign > div > form > div:nth-child(7) > div > button.btn.btn--orange.p-l-50.p-r-50.btn--medium.ng-star-inserted"
        );
        await page.waitForTimeout(getRandomArbitrary(2000, 4000));
        
        page.close();
        resolve();
      });

    const createRK = async (rk_name, id, subject, rk_type) =>
      new Promise(async (resolve, reject) => {
        const page = await context.newPage();
        const urls = {
          Поиск: "https://cmp.wildberries.ru/campaigns/create/search",
        };

        const url = urls[rk_type];
        //		context.setDefaultTimeout(60000*3)
        // await page.setViewportSize({ width: 1600, height: 30000 });
        console.log(`Navigating to ${url}...`);
        // Navigate to the selected page
        await page.goto(url);
        await page.waitForLoadState();
        await page.goto(url);
        await page.waitForLoadState();
        await page.waitForTimeout(getRandomArbitrary(2000, 4000));

        // return
        // Wait for the required DOM to be rendered
        await page.waitForSelector("#campaignName");
        // await page.waitForTimeout(10000);

        // for (let i = 1; i < 4; i++) {

        // await page.$eval(
        //   "body > app-root > div > div.wrapper__body > div.wrapper__body__content > div > app-campaigns-list > app-create-campaign-modal > app-modal > div.modal > div > div.modal__dialog__body > div > div.campaign-type > div:nth-child(5)",
        //   async (el) => await el.click()
        // );
        // await page.waitForTimeout(getRandomArbitrary(4000, 5000));

        await page.fill("#campaignName", rk_name);
        await page.waitForTimeout(getRandomArbitrary(500, 2000));
        await page.click(
          "body > app-root > div > div.wrapper__body > div.wrapper__body__content > div > app-create > div > div.m-t-32 > app-auction-campaign > form > div > div.panel--bordered.m-b-16 > div > div:nth-child(1) > div.flex.m-t-48.m-b-6 > button"
        );
        await page.waitForTimeout(getRandomArbitrary(3000, 7000));
        // const downloadPromise = page.waitForEvent("download");
        await page.click(
          "#subjectsList > div > div.combobox__label.form__input"
        );
        const type = { Наматрасники: 2, Простыни: 3, "Простыни натяжные": 4 };
        await page.waitForTimeout(getRandomArbitrary(500, 2000));
        await page.click(
          `#subjectsList > div > div.combobox__list.combobox__list--active > div > div:nth-child(${type[subject]})`
        );
        await page.waitForTimeout(getRandomArbitrary(500, 2000));
        await page.click(
          "#subjectsList > div > div.combobox__label.form__input"
        );
        await page.waitForTimeout(getRandomArbitrary(500, 2000));
        await page.click(
          "body > app-root > div > div.wrapper__body > div.wrapper__body__content > div > app-create > div > div.m-t-32 > app-auction-campaign > form > div > div.panel--bordered.m-b-16 > div:nth-child(5) > div > div.form__control > div > app-search-select > div > div.combobox__label.form__input"
        );
        await page.waitForTimeout(getRandomArbitrary(500, 2000));
        await page.fill(
          "body > app-root > div > div.wrapper__body > div.wrapper__body__content > div > app-create > div > div.m-t-32 > app-auction-campaign > form > div > div.panel--bordered.m-b-16 > div:nth-child(5) > div > div.form__control > div > app-search-select > div > div.combobox__list.combobox__list--active > div.combobox__label.form__input.searchbox.ng-star-inserted > input",
          id
        );
        await page.waitForTimeout(getRandomArbitrary(2000, 3000));
        await page.click(
          "body > app-root > div > div.wrapper__body > div.wrapper__body__content > div > app-create > div > div.m-t-32 > app-auction-campaign > form > div > div.panel--bordered.m-b-16 > div:nth-child(5) > div > div.form__control > div > app-search-select > div > div.combobox__list.combobox__list--active > div.combobox__rows.show-search > div > div"
        );
        await page.waitForTimeout(getRandomArbitrary(500, 2000));
        await page.click(
          "body > app-root > div > div.wrapper__body > div.wrapper__body__content > div > app-create > div > div.m-t-32 > app-auction-campaign > form > div > div:nth-child(2) > div > button"
        );
        await page.waitForTimeout(getRandomArbitrary(5000, 7000));
        await page.click(
          "body > app-root > div > div.wrapper__body > div.wrapper__body__content > div > app-create > div > div.m-t-32 > app-auction-campaign > form > div > div:nth-child(2) > div > button"
        );
        await page.waitForTimeout(getRandomArbitrary(5000, 7000));
        // const download = await downloadPromise;
        // const path_to_file = path.join(mainDlDir, `${str_date}.xlsx`);
        // await download.saveAs(path_to_file);
        // await page.waitForTimeout(getRandomArbitrary(50000, 100000));

        page.close();
        resolve();
      });

    const promises = [];
    for (let i = 0; i < RKsToCreate.length; i++) {
      const rk_data = RKsToCreate[i];
      console.log(rk_data);
      const campaign = reverse_seller_ids[artsData[rk_data.art].seller_id];
      console.log(campaign);

      await context.addCookies(cookies[campaign]);
      promises.push(
        await createRK(
          rk_data.art,
          rk_data.id,
          rk_data.subjects,
          rk_data.rk_type
        )
      );
      await context.clearCookies();
      // await new Promise((resolve) => setTimeout(resolve, 10 * 60 * 1000));
    }
    Promise.all(promises);
    // await updateAnalyticsOrders(adsIds.campaign);
    return; // await page.waitForTimeout(5000);
    let urls = await page.$$eval("a", (links) => {
      // Extract the links from the data
      links = links.map((el) => el.href);
      return links;
    });

    urls = urls.filter((link) => link.includes("/campaign"));
    urls = urls.filter((link) => link.includes("app.mpmgr.ru"));
    //		console.log(urls);

    await page.close();
    await context.close();

    const good_campaign_ids =
      urls.filter((link) => link.includes("/0/")).length == 0;
    if (good_campaign_ids) {
      console.log(urls);

      const ids = [];
      urls.forEach((link) => ids.push(`[${link.split("/")[7]}]`));
      const path_to_file = `${__dirname}/../files/${campaign_id}_presented.xlsx`;
      fs.writeFileSync(
        path_to_file,
        xlsx.build([{ name: campaign_id, data: [ids] }])
      );
    } else {
      return;
    }

    let pagePromise = (link, index, totalLength) =>
      new Promise(async (resolve, reject) => {
        let dataObj = {};

        const new_context = await browser.newContext();
        new_context.setDefaultTimeout(60000 * 3);
        new_context.addCookies(cookies);
        const newPage = await new_context.newPage();
        await newPage.setViewportSize({ width: 1600, height: 30000 });

        await newPage.goto(link);
        await newPage.waitForLoadState();
        // await newPage.waitForTimeout(10000);

        await newPage
          .waitForSelector(".MuiTypography-root.MuiTypography-h3.css-11j0d37")
          .catch((error) => {
            console.log("Invisible");
            reject(dataObj);
          });

        //await newPage.$eval('.MuiBox-root.css-mxe89r > .MuiBox-root', async el => {
        //	if (getComputedStyle(el).color == 'rgba(255, 191, 76, 0.25)') {
        //		console.log('Paused campaign, leaving.')
        //		await new_context.close()
        //		reject(dataObj)
        //		await newPage.close()
        //		return
        //	}
        //})

        dataObj["id"] = `[${link.split("/")[7]}]`;
        dataObj["name"] = await newPage.$eval(
          ".MuiBox-root.css-6n7j50 > a > h3",
          (text) => text.textContent
        );
        //			console.log(dataObj.name)
        //			dataObj['name'] = dataObj.name.split(' ').slice(1, dataObj.name.length).join(' ')

        await newPage.waitForSelector(
          ".MuiButtonBase-root.MuiAccordionSummary-root.css-1dkwt8e"
        );
        await newPage.$eval(
          ".MuiButtonBase-root.MuiAccordionSummary-root.css-1dkwt8e",
          (el) => el.click()
        );

        // await newPage.getByText('Интервал').first().evaluate(el => el.click());

        // await newPage.locator('.rmdp-left')
        // await newPage.waitForTimeout(1000)
        // await newPage.locator('.sd').first().evaluate(el => el.click())
        // await newPage.waitForTimeout(1000)

        // await newPage.getByText('Экспорт').first().waitFor()

        await newPage.waitForTimeout(10000);
        const downloadPromise = newPage.waitForEvent("download");
        await newPage
          .getByText("Экспорт")
          .first()
          .evaluate((el) => el.click());
        await newPage
          .getByText("За все время")
          .first()
          .evaluate((el) => el.click());
        const download = await downloadPromise;
        // Wait for the download process to complete
        // console.log(await download.path());
        // Save downloaded file somewhere

        const path_to_file = `${__dirname}/../files/${campaign_id}/${dataObj["id"]}.xlsx`;
        await download.saveAs(path_to_file);

        // change sheet name to match current name in mp_manager
        const data = xlsx.parse(path_to_file)[0].data;
        data[0][0] = dataObj.name;
        fs.writeFileSync(
          path_to_file,
          xlsx.build([{ name: "Sheet", data: data }])
        );

        // await newPage.$eval('.MuiBox-root.css-1age63q > button', button => button.click());

        await newPage.close();
        await new_context.close();
        console.log(`${index}/${totalLength} `);
        console.log(dataObj);
        resolve(dataObj);
      }).catch((error) => {
        console.log("Passing error");
        throw error;
      });

    // let currentPageData = await pagePromise(urls[0]);
    // console.log(currentPageData)

    let scrapedData = [];
    // for(link in urls){
    // 	let currentPageData = await pagePromise(urls[link]);
    // 	scrapedData.push(currentPageData);
    // 	console.log(currentPageData);
    // }
    let index = 0;
    const batch = 6;
    for (let i = 0; i < urls.length; i += batch) {
      let all_page_promises = [];
      for (link in urls.slice(i, i + batch)) {
        index++;
        const parallel = 1;
        if (parallel) {
          all_page_promises.push(pagePromise(urls[link], index, urls.length));
          await new Promise((resolve) => setTimeout(resolve, 1000));
        } else {
          try {
            await pagePromise(urls[link], index, urls.length)
              .then((pr) => all_page_promises.push(pr))
              .catch((error) => {
                console.log("Caught");
                throw error;
              });
          } catch (error) {
            //console.log(error)
            console.log("Retrying...");
            await pagePromise(urls[link], index, urls.length)
              .then((pr) => all_page_promises.push(pr))
              .catch((error) => {
                console.log("Caught");
              });
          }
        }
      }
      await Promise.all(all_page_promises);
      for (pr in all_page_promises) {
        scrapedData.push(pr);
        //			console.log(pr);
      }
    }
  },
};

module.exports = scraperObject;
