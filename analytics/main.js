const createXlsx = require('./mp_manager/index.js');
const writeToGoole = require('./google_sheets/index.js');

module.exports = async () => {
    return new Promise((resolve, reject) => {
        fs.access(path.join(flagsDir, flagFile), async (err) => {
            if (err) {
                // Flag file not present, so run the operation
                console.log('Running operation...');

                let campaign_ids = ['Q8OWW7YMRgq5h4wk7UHHvA', 'TsGOXnYrT22nfoDwEsftHw']
                let campaign_names = ['MAYUSHA', 'DELICATUS']

                for (let i = 0; i < campaign_ids.length; i++) {
                    await createXlsx(campaign_ids[i])
                    await writeToGoole(campaign_ids[i], campaign_names[i])
                }

            } else {
                // Flag file present, so skip the operation
                console.log(`Flag file '${flagFile}' present. Skipping operation.`);
                resolve();
            }
        });
    });
}

const fs = require('fs');
const path = require('path');

const flagsDir = path.join(__dirname, '..', 'flags');
const flagFile = 'top-stakes-flag.txt';
