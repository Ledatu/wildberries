const fs = require('fs');
const path = require('path');
const scrape = require('./mp_manager/index');
const getGoogleData = require('./google_sheets/index');
const clearDownloadsDirectory = require('./mp_manager/clearDownloadsFolder');
const { createFlagFile, deleteFlagFile } = require('./flagWork');

const flagsDir = path.join(__dirname, '..', 'flags');
const flagFile = 'top-stakes-flag.txt';

/**
 * Runs some operation only if the flag file is not present.
 * @returns {Promise<void>} A promise that resolves when the operation is completed, or rejects with an error.
 */
module.exports = () => {
    return new Promise((resolve, reject) => {
        fs.access(path.join(flagsDir, flagFile), async (err) => {
            if (err) {
                console.log('Running operation...');
                await createFlagFile()

                await clearDownloadsDirectory()
                await getGoogleData()
                await scrape()
                
                await deleteFlagFile()
                resolve();
            } else {
                // Flag file present, so skip the operation
                console.log(`Flag file '${flagFile}' present. Skipping operation.`);
                resolve();
            }
        });
    });
}
