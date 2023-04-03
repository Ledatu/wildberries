const main = require("./main");
const parse_xlsx = require("./mp_manager/excelParser");
const cron = require('node-cron');

console.log('Running main.js every 2 hrs');
cron.schedule('0 */2 * * *', () => {
	main()
})

// parse_xlsx('Q8OWW7YMRgq5h4wk7UHHvA')
