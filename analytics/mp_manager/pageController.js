const pageScraper = require('./pageScraper');
async function scrapeAll(browserInstance, campaign_id){
	let browser;
	try{
		browser = await browserInstance;
		await pageScraper.scraper(browser, campaign_id);	
		
	}
	catch(err){
		console.log("Could not resolve the browser instance => ", err);
	}
}

module.exports = (browserInstance, campaign_id) => scrapeAll(browserInstance, campaign_id)