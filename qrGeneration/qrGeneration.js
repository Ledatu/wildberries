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
    autofillAndWriteToXlsx().then((pr) =>
      writeCurrent().then((pr) => resolve())
    );
  });
};

module.exports = {
  qrGeneration,
  tagsGeneration,
  autofillCurrent,
};
