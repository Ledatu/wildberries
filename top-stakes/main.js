const scrape = require("./mp_manager/index");
const { getStakes } = require("./google_sheets/index");
const clearDownloadsDirectory = require("./mp_manager/clearDownloadsFolder");
const {
  createFlagFile,
  deleteFlagFile,
  checkFlagFilesExist,
} = require("../flags/flagWork");

const flagFile = "top-stakes-flag.txt";

/**
 * Runs some operation only if the flag file is not present.
 * @returns {Promise<void>} A promise that resolves when the operation is completed, or rejects with an error.
 */
module.exports = () => {
  return new Promise((resolve, reject) => {
    checkFlagFilesExist([flagFile, "analytics-flag.txt"])
      .then(async (flagExists) => {
        if (!flagExists) {
          console.log("Running operation...");

          await createFlagFile(flagFile);

          await clearDownloadsDirectory();
          await getStakes();
          await scrape();

          await deleteFlagFile(flagFile);
        } else {
          console.log(`Flag file present. Skipping operation.`);
          resolve();
        }
      })
      .catch(reject);
  });
};
