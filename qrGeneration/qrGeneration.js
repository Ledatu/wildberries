const { fetchQrCodesAndWriteToJSON, fetchTagsAndWriteToJSON } = require("./google_sheets/index");
const { main, zipDirectory, generateTags } = require("./main");

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

module.exports = {
  qrGeneration,
  tagsGeneration,
};
