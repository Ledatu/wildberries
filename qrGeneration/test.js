const { fetchQrCodesAndWriteToJSON } = require("./google_sheets/index");
const { qrGeneration, tagsGeneration, autofillCurrent } = require("./qrGeneration");
// fetchQrCodesAndWriteToJSON()
// tagsGeneration();
autofillCurrent().then(count => console.log(count))