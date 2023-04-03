const fs = require('fs');
const path = require('path');

/**
 * Clears the "files/downloads" directory.
 */
const clearDownloadsDirectory = function () {
    return new Promise((resolve, reject) => {
        const directory = path.join(__dirname, 'files', 'downloads');

        fs.readdir(directory, (err, files) => {
            if (err) reject(err);

            const promises = files.map((filename) => {
                const filepath = path.join(directory, filename);
                return new Promise((resolve, reject) => {
                    fs.unlink(filepath, (err) => {
                        if (err) reject(err);
                        resolve();
                    });
                });
            });

            Promise.all(promises)
                .then(() => resolve())
                .catch((err) => reject(err));
        });
    });
};

module.exports = clearDownloadsDirectory;