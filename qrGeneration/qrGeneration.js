const { fetchQrCodesAndWriteToJSON } = require("./google_sheets/index");
const { main, zipDirectory } = require("./main");

const qrGeneration = () => {
  return new Promise(async (resolve, reject) => {
    await fetchQrCodesAndWriteToJSON();
    main().then((pr) => resolve());
  });
};

module.exports = {
  qrGeneration,
};
