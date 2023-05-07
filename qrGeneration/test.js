const { fetchQrCodesAndWriteToJSON } = require("./google_sheets/index");
const { qrGeneration, tagsGeneration } = require("./qrGeneration");
// fetchQrCodesAndWriteToJSON()
tagsGeneration();