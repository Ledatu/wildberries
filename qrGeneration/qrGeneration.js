const {
  fetchQrCodesAndWriteToJSON,
  fetchTagsAndWriteToJSON,
  writeCurrent,
  fetchNewTagsAndWriteToXLSX,
  fetchCurrentZakazAndWriteToXLSX,
} = require("./google_sheets/index");
const {
  main,
  zipDirectory,
  autofillAndWriteToXlsx,
  generateTags,
  generateNewTags,
} = require("./main");
const { updateAtriculesData } = require("../prices/prices");
const path = require("path");
const fs = require("fs");

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

const newTagsGeneration = () => {
  return new Promise(async (resolve, reject) => {
    // await fetchTagsAndWriteToJSON();
    fetchNewTagsAndWriteToXLSX().then((pr) => {
      generateNewTags().then((pr) => resolve());
    });
  });
};

const autofillCurrent = (name) => {
  return new Promise(async (resolve, reject) => {
    await updateAtriculesData(); //prices
    await fetchTagsAndWriteToJSON(name);
    autofillAndWriteToXlsx()
      .then(async (count) => {
        await writeCurrent();
        await qrGeneration().then(() =>
          tagsGeneration().then(() => fetchCurrentZakazAndWriteToXLSX(name))
        );
        resolve(count);
      })
      .catch((error) => {
        reject(error);
      });
  });
};

const exportAll = () => {
  return new Promise(async (resolve, reject) => {
    const name = JSON.parse(
      fs.readFileSync(path.join(__dirname, "../qrGeneration/files/supply.json"))
    ).name;
    const arch = path.join(__dirname, "../qrGeneration/files/Поставка");
    return zipDirectory(
      arch,
      path.join(__dirname, `../qrGeneration/files/Поставки/${name}.zip`)
    ).then(() => {
      console.log(new Date(), "Zipping complete.");
      resolve();
    });
  });
};

module.exports = {
  qrGeneration,
  tagsGeneration,
  autofillCurrent,
  newTagsGeneration,
  exportAll,
};
