const { fetchQrCodesAndWriteToJSON } = require('./google_sheets/index')
const { main, zipDirectory } = require("./main");

const qrGeneration = async () => {
  await fetchQrCodesAndWriteToJSON();
  const sleep = (ms) => new Promise((resolve) => {
    setTimeout(resolve, ms);
  });
  await sleep(1000)
  main();
};

module.exports = {
  qrGeneration,
};
