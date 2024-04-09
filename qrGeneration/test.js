const {
  fetchQrCodesAndWriteToJSON,
  exportTZToXlsx,
  fetchCurrentZakazAndWriteToXLSX,
  fetchOTKArtMathcingAndWriteToJSON,
} = require("./google_sheets/index");
const { generateNewTags, autoGenerateNewTags, generateTagsRaspredelenniy } = require("./main");
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
// autofillCurrent("delicatus ПР 06 МК ТУЛА");
// autoGenerateNewTags('perinka', 'Перинка');
// autoGenerateNewTags('mayusha', 'МАЮША');
// autoGenerateNewTags('delicatus', 'DELICATUS');
autoGenerateNewTags('TKS', 'Объединённая текстильная компания');
// autoGenerateNewTags('SLUMBER+', 'SLUMBER+');
// exportAll()
// generateTagsRaspredelenniy()
// fetchOTKArtMathcingAndWriteToJSON()