const fs = require('fs')
const parse_xlsx = require("./excelParser")
const xlsx = require("node-xlsx").default
const path = require('path')
const cookies = require(path.join(__dirname, '../../secrets/mp_manager/cookies'))
const scraperObject = {
    async scraper(browser, campaign_id){
		const url = `https://app.mpmgr.ru/organizations/${campaign_id}/campaigns/auto-campaigns`;
        const context = await browser.newContext();
//		context.setDefaultTimeout(60000*3)
		context.addCookies(cookies)
		const page = await context.newPage();
		await page.setViewportSize({ width: 1600, height: 30000 });
		console.log(`Navigating to ${url}...`);
		// Navigate to the selected page
		await page.goto(url);
		await page.waitForLoadState()
		// Wait for the required DOM to be rendered
		await page.waitForSelector('.MuiTypography-root.MuiTypography-inherit.MuiLink-root.MuiLink-underlineNone');
		await page.waitForTimeout(10000)

		await page.$$eval('.MuiButtonBase-root.MuiAccordionSummary-root', els => els.forEach(async el => {
			await el.click()
		}))
		await page.waitForTimeout(5000)
		let urls = await page.$$eval('a', links => {
			// Extract the links from the data
			links = links.map(el => el.href)
			return links;
		});

		urls = urls.filter(link => link.includes('/campaign'))
//		console.log(urls);
		
		await page.close()
        await context.close()

		const good_campaign_ids = urls.filter(link => link.includes('/0/')).length == 0
		if (good_campaign_ids) {
			console.log(urls)

			const ids = []
			urls.forEach(link => ids.push(`[${link.split('/')[7]}]`))
			const path_to_file = `./files/${campaign_id}_presented.xlsx`
            fs.writeFileSync(path_to_file, xlsx.build([{ name: campaign_id, data: [ids] }]))
		}
		else { 
			return 
		}
	
		let pagePromise = (link, index, totalLength) => new Promise(async(resolve, reject) => {
			let dataObj = {};
			
			const new_context = await browser.newContext();
			new_context.setDefaultTimeout(60000*3)
			new_context.addCookies(cookies)
			const newPage = await new_context.newPage();
			await newPage.setViewportSize({ width: 1600, height: 30000 });


			await newPage.goto(link);
			await newPage.waitForLoadState()
			// await newPage.waitForTimeout(10000)

			await newPage.waitForSelector('.MuiTypography-root.MuiTypography-h3.css-11j0d37').catch(error => {console.log('Invisible'); reject(dataObj)});


			//await newPage.$eval('.MuiBox-root.css-mxe89r > .MuiBox-root', async el => {
			//	if (getComputedStyle(el).color == 'rgba(255, 191, 76, 0.25)') {
			//		console.log('Paused campaign, leaving.')
			//		await new_context.close()
			//		reject(dataObj)
			//		await newPage.close()
			//		return
			//	}
			//})			


			dataObj['id'] = `[${link.split('/')[7]}]`
			dataObj['name'] = (await newPage.$eval('.MuiBox-root.css-6n7j50 > a > h3', text => text.textContent));
//			console.log(dataObj.name)
//			dataObj['name'] = dataObj.name.split(' ').slice(1, dataObj.name.length).join(' ')

			await newPage.waitForSelector('.MuiButtonBase-root.MuiAccordionSummary-root.css-1dkwt8e');
			await newPage.$eval('.MuiButtonBase-root.MuiAccordionSummary-root.css-1dkwt8e', el => el.click());
			// await newPage.waitForTimeout(10000)
			
			//await newPage.getByText('Интервал').first().evaluate(el => el.click());
			
			//await newPage.locator('.rmdp-left')
			//await newPage.waitForTimeout(1000)
			//await newPage.locator('.sd').first().evaluate(el => el.click())
			//await newPage.waitForTimeout(1000)

			// await newPage.getByText('Экспорт').first().waitFor()
			// await newPage.waitForTimeout(5000)

			const downloadPromise = newPage.waitForEvent('download');
			await newPage.getByText('Экспорт').first().evaluate(el => el.click())
			const download = await downloadPromise;
			// Wait for the download process to complete
			// console.log(await download.path());
			// Save downloaded file somewhere

			const path_to_file = `./files/${campaign_id}/${dataObj['id']}.xlsx`
			await download.saveAs(path_to_file)

			// change sheet name to match current name in mp_manager
			const data = xlsx.parse(path_to_file)[0].data
			data[0][0] = dataObj.name
            fs.writeFileSync(path_to_file, xlsx.build([{ name: 'Sheet', data: data }]))

			// await newPage.$eval('.MuiBox-root.css-1age63q > button', button => button.click());

			await newPage.close()
			await new_context.close()
			process.stdout.write(`${index}/${totalLength} `)
			console.log(dataObj)
			resolve(dataObj)

		}).catch(error => {console.log('Passing error'); throw error})

		// let currentPageData = await pagePromise(urls[0]);
		// console.log(currentPageData)

		let scrapedData = [];
		// for(link in urls){
		// 	let currentPageData = await pagePromise(urls[link]);
		// 	scrapedData.push(currentPageData);
		// 	console.log(currentPageData);
		// }
		let all_page_promises = []
		let index = 0
		for(link in urls){
			index++
			// all_page_promises.push(pagePromise(urls[link], index, urls.length))
			// await new Promise(resolve => setTimeout(resolve, 1000));
			
			try {
				await pagePromise(urls[link], index, urls.length).then(pr => all_page_promises.push(pr)).catch(error => {console.log('Caught'); throw error})
			} catch (error) {
				//console.log(error)
				console.log('Retrying...')
				await pagePromise(urls[link], index, urls.length).then(pr => all_page_promises.push(pr)).catch(error => {console.log('Caught'); })
			}

		}
		await Promise.all(all_page_promises)
		for (pr in all_page_promises) {
			scrapedData.push(pr);
//			console.log(pr);
		}

		await parse_xlsx(campaign_id)
    }
}

module.exports = scraperObject;


