const xlsx = require("node-xlsx").default
const fs = require("fs");
const path = require("path");
const cookies = require(path.join(__dirname, '../../secrets/mp_manager/cookies'))
const { parseStakeSheet } = require("./xlsxParser");
const { updateRow } = require("../google_sheets/index");
const scraperObject = {
	/**
	This is an async function that scrapes data from a website using Playwright.
		@async
		@function scraper
		@param {Object} browser - The Playwright browser object.
		@returns {Promise}
	*/
	async scraper(browser) {
		const url = `https://app.mpmgr.ru/organizations/Q8OWW7YMRgq5h4wk7UHHvA/promotions/keyword-places`;
		const context = await browser.newContext();
		//		context.setDefaultTimeout(60000*3)
		context.addCookies(cookies)
		const page = await context.newPage();
		// await page.setViewportSize({ width: 1600, height: 30000 });
		console.log(`Navigating to ${url}...`);
		await page.goto(url);
		await page.waitForLoadState()
		await page.waitForSelector('div > input')
		await page.waitForTimeout(1000)
		// await page.waitForTimeout(10000)

		const stakes = xlsx.parse(path.join(__dirname, 'files', 'current_google_sheets_data.xlsx'))[0]['data']
		console.log(stakes)
		/**
		This is a Promise that fills in a search input field with data from an array, clicks a search button, waits for a download button to appear, clicks the download button, saves the downloaded file, extracts data from the downloaded file, and stores the extracted data in an array.
			@async
			@function pagePromise
			@param {string} stake - The search term to be used.
			@returns {Promise>} - The extracted data from the downloaded file.
		*/
		const pagePromise = (stake, index) => new Promise(async (resolve, reject) => {
			await page.fill('div > input', stake);
			await page.waitForTimeout(1000)
			// await page.locator('div > input').first().type(stake)
			await page.getByText('Найти').first().press('Enter')
			await page.waitForTimeout(20000)
			
			let data_presence = true
			const downloadPromise = page.waitForEvent('download').catch(e => {
				console.log(`No data for ${stake}`)
				data_presence = false
			});
			await page.getByText('Экспорт').first().evaluate(el => el.click()).catch(e => {
				console.log(`No data for ${stake}`)
				data_presence = false
			});
			if (!data_presence) {
				resolve()
				return
			}

			const download = await downloadPromise
			const path_to_file = path.join(__dirname, 'files', 'downloads', `${index}.xlsx`)
			await download.saveAs(path_to_file)

			const data = xlsx.parse(path_to_file)[0].data
			fs.writeFileSync(path_to_file, xlsx.build([{name: stake, data: data}]))

			const row = parseStakeSheet(path_to_file)
			console.log(row)
			await updateRow(row)
			resolve(data)

		}).catch(error => { console.log('Passing error'); throw error })

		let all_page_promises = []
		let index = 0
		for (stake in stakes) {
			index++
			await pagePromise(stakes[stake][0], index).then(pr => all_page_promises.push(pr)).catch(error => { console.log('Caught'); throw error })
		}
		await Promise.all(all_page_promises)

		// delete all the unfinded
		// for (let i = 1; i < scrapedData.length; i++) {
		// 	const cur = scrapedData[i].slice(1, 5)
		// 	const prev = scrapedData[i - 1].slice(1, 5)
		// 	console.log(cur)
		// 	console.log(prev)
		// 	if (cur.join() == prev.join()) {
		// 		scrapedData[i] = [scrapedData[i][0]].concat(['', '', '', '', ''])
		// 		console.log('Man its identical!')
		// 		console.log(scrapedData[i])
		// 	}
		// 	console.log('-------')
		// }

		// fs.writeFileSync(path.join(__dirname, 'files', 'gathered_stakes.xlsx'), xlsx.build([{ name: 'Terms', data: scrapedData }]))


		await page.close()
		await context.close()
	}
}

module.exports = scraperObject;


