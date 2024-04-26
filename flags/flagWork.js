const fs = require("fs");
const path = require("path");

const flagsDir = path.join(__dirname, "flag-files");

/**
 * Creates a flag file with the given name in the flags directory.
 * @param {string} flagFile - The name of the flag file to create.
 * @returns {Promise<void>} A promise that resolves when the file is created, or rejects with an error.
 */
function createFlagFile(flagFile) {
  return new Promise((resolve, reject) => {
    fs.writeFile(path.join(flagsDir, flagFile), "", (err) => {
      if (err) {
        reject(err);
      } else {
        console.log(new Date(), `Flag file '${flagFile}' created.`);
        resolve();
      }
    });
  });
}

/**
 * Deletes the flag file with the given name in the flags directory.
 * @param {string} flagFile - The name of the flag file to delete.
 * @returns {Promise<void>} A promise that resolves when the file is deleted, or rejects with an error.
 */
function deleteFlagFile(flagFile) {
  return new Promise((resolve, reject) => {
    fs.unlink(path.join(flagsDir, flagFile), (err) => {
      if (err) {
        reject(err);
      } else {
        console.log(new Date(), `Flag file '${flagFile}' deleted.`);
        resolve();
      }
    });
  });
}

/**
 * Checks if any of the flag files with the given names exist in the flags directory.
 * @param {string[]} flagFiles - An array of flag file names to check.
 * @returns {Promise<boolean>} A promise that resolves with a boolean value indicating whether any of the flag files exist, or rejects with an error.
 */
function checkFlagFilesExist(flagFiles) {
  return new Promise((resolve, reject) => {
    let found = false;
    let count = 0;
    flagFiles.forEach((flagFile) => {
      fs.access(path.join(flagsDir, flagFile), fs.constants.F_OK, (err) => {
        if (err) {
          if (err.code !== "ENOENT") {
            reject(err);
          }
        } else {
          found = true;
        }
        count++;
        if (count === flagFiles.length) {
          resolve(found);
        }
      });
    });
  });
}

module.exports = {
  createFlagFile,
  deleteFlagFile,
  checkFlagFilesExist,
};
