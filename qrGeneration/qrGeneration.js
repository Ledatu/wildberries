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
const {
  updateAtriculesData,
} = require("../prices/prices");
const path = require("path");

const qrGeneration = () => {
  return new Promise(async (resolve, reject) => {
    // await fetchQrCodesAndWriteToJSON();
    main().then((pr) => resolve());
  });
};

const tagsGeneration = () => {
  return new Promise(async (resolve, reject) => {
    // await fetchTagsAndWriteToJSON();
    generateTags().then((pr) => resolve());
  });
};

const autofillCurrent = (name) => {
  return new Promise(async (resolve, reject) => {
  await updateAtriculesData(); //prices
    await fetchTagsAndWriteToJSON(name);
    autofillAndWriteToXlsx().then(async (count) => {
      await writeCurrent();
      resolve(count);
    });
  });
};

const exportAll = () => {
  return new Promise(async (resolve, reject) => {
    await qrGeneration().then(() => tagsGeneration());
    const arch = path.join(__dirname, "../qrGeneration/files/Поставка");
    return zipDirectory(arch, arch + ".zip").then(() => {
      console.log("Zipping complete.");
      resolve();
    });
  });
};

module.exports = {
  qrGeneration,
  tagsGeneration,
  autofillCurrent,
  exportAll,
};
