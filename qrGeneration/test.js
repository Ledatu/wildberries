const {
  fetchQrCodesAndWriteToJSON,
  exportTZToXlsx,
  fetchCurrentZakazAndWriteToXLSX,
  fetchOTKArtMathcingAndWriteToJSON,
} = require("./google_sheets/index");
const { generateNewTags, autoGenerateNewTags, generateTagsRaspredelenniy, getGeneralMaskFromVendorCode, getMaskFromVendorCode } = require("./main");
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
// autofillCurrent().then(count => console.log(new Date(), count))
// exportTZToXlsx()
// exportAll()
// newTagsGeneration();
// autofillCurrent("delicatus ПР 06 МК ТУЛА");
// autoGenerateNewTags('perinka', 'Перинка');
// autoGenerateNewTags('mayusha', 'МАЮША');
// autoGenerateNewTags('delicatus', 'DELICATUS');
// autoGenerateNewTags('TKS', 'Объединённая текстильная компания');
// autoGenerateNewTags('Amaze wear', 'Amaze wear');
// exportAll()
generateTagsRaspredelenniy()
// console.log(getMaskFromVendorCode('ФТБЛ_ЖЕН_ОВЕР_Ф-13_Хаки_43'), getGeneralMaskFromVendorCode('ФТБЛ_ЖЕН_ОВЕР_Ф-13_Хаки_XL'));
// fetchOTKArtMathcingAndWriteToJSON()