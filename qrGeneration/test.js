const {
  fetchQrCodesAndWriteToJSON,
  exportTZToXlsx,
  fetchCurrentZakazAndWriteToXLSX,
} = require("./google_sheets/index");
const { generateNewTags } = require("./main");
const {
  qrGeneration,
  tagsGeneration,
  autofillCurrent,
  exportAll,
  newTagsGeneration,
} = require("./qrGeneration");
// fetchQrCodesAndWriteToJSON()
// tagsGeneration();
// qrGeneration()
// autofillCurrent().then(count => console.log(count))
// exportTZToXlsx()
// exportAll()
// newTagsGeneration();
fetchCurrentZakazAndWriteToXLSX("delicatus ПР 06 МК ТУЛА");
