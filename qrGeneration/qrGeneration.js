const {
  fetchQrCodesAndWriteToJSON,
  fetchTagsAndWriteToJSON,
  writeCurrent,
} = require("./google_sheets/index");
const {
  main,
  zipDirectory,
  autofillAndWriteToXlsx,
  generateTags,
} = require("./main");

const qrGeneration = () => {
  return new Promise(async (resolve, reject) => {
    await fetchQrCodesAndWriteToJSON();
    main().then((pr) => resolve());
  });
};

const tagsGeneration = () => {
  return new Promise(async (resolve, reject) => {
    await fetchTagsAndWriteToJSON();
    generateTags().then((pr) => resolve());
  });
};

const autofillCurrent = () => {
  return new Promise(async (resolve, reject) => {
    await fetchTagsAndWriteToJSON();
    autofillAndWriteToXlsx().then(async (count) => {
      await writeCurrent();
      resolve(count);
    });
  });
};

module.exports = {
  qrGeneration,
  tagsGeneration,
  autofillCurrent,
};
