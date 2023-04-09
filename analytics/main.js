const createXlsx = require('./mp_manager/index.js');
const writeToGoole = require('./google_sheets/index.js');
const { createFlagFile, deleteFlagFile, checkFlagFilesExist } = require('../flags/flagWork');

const flagFile = 'analytics-flag.txt';

/**
 * Runs some operation only if the flag file is not present.
 * @returns {Promise<void>} A promise that resolves when the operation is completed, or rejects with an error.
 */
module.exports = () => {
    return new Promise((resolve, reject) => {
        checkFlagFilesExist([flagFile, 'top-stakes-flag.txt'])
            .then(async (flagExists) => {
                if (!flagExists) {
                    console.log('Running operation...');
                    
                    // await createFlagFile(flagFile)
                    
                    let campaign_ids = ['Q8OWW7YMRgq5h4wk7UHHvA', 'TsGOXnYrT22nfoDwEsftHw']
                    let campaign_names = ['MAYUSHA', 'DELICATUS']

                    for (let i = 0; i < campaign_ids.length; i++) {
                        await createXlsx(campaign_ids[i])
                        await writeToGoole(campaign_ids[i], campaign_names[i])
                    }

                    // await deleteFlagFile(flagFile)

                } else {
                    console.log(`Flag file present. Skipping operation.`);
                    resolve();
                }
            })
            .catch(reject);
    });
};
