const browserObject = require('./browser');
const scraperController = require('./pageController');

module.exports = async () => {
    const browserInstance = await browserObject.startBrowser();
    await scraperController(browserInstance)
    await browserInstance.close()
}
