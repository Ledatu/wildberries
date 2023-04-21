const { fetchDataAndWriteToXlsx, fetchCardsAndWriteToJSON } = require('./prices');
const writePrices = require('./google_sheets/index')

const main = async () => {
    Promise.all([
        await fetchCardsAndWriteToJSON(),
        await fetchDataAndWriteToXlsx(),
    ]).then(async () => {
        console.log('All tasks completed successfully');
        await writePrices();
    }).catch((error) => {
        console.error('An error occurred:', error);
    });
}

main()
