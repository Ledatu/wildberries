const { fetchQrCodesAndWriteToJSON, exportTZToXlsx } = require("./google_sheets/index");
const { qrGeneration, tagsGeneration, autofillCurrent, exportAll } = require("./qrGeneration");
// fetchQrCodesAndWriteToJSON()
// tagsGeneration();
// qrGeneration()
// autofillCurrent().then(count => console.log(count))
// exportTZToXlsx()
exportAll()