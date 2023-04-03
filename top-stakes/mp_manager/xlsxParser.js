const fs = require('fs');
const path = require('path');
const xlsx = require('node-xlsx');

const columnNumber = 13;
const rowCount = 5;

/**
 * Parses data from a specified column and row count in an xlsx sheet.
 * @param {string} filepath - The path to the xlsx file.
 * @returns {Array} - An array of extracted data.
 */
const parseStakeSheet = function (filepath) {
    const sheet = xlsx.parse(filepath)[0];
    const data = [];
    for (let i = 1; i <= rowCount; i++) {
        const data_row = sheet.data[i];
        if (!data_row)
            continue

        const cell = data_row[columnNumber];
        data.push(cell ? cell : null);
    }
    return [filepath.slice(0, filepath.lastIndexOf('.')).split(' ').slice(1).join(' ')].concat(data);
};

/**
 * Parses xlsx files in the default directory, extracts data from a specified column and row count,
 * fills the extracted data with blank cells if the content is identical to the one before it,
 * removes repeated rows from the extracted data,
 * and writes the extracted data to a new excel file in the default directory.
 */
const parseXlsxFiles = function () {
    return new Promise((resolve, reject) => {
        const data = [];

        fs.readdir(directory, (err, files) => {
            if (err) reject(err);

            files.forEach((filename) => {
                const extname = path.extname(filename);
                if (extname !== '.xlsx') {
                    console.log(`Skipping file ${filename} because it is not an xlsx file.`);
                    return;
                }

                const filepath = path.join(directory, filename);
                const row = parseStakeSheet(filepath);
                data.push([sheet.name].concat(row))
            });

            for (let i = 1; i < data.length; i++) {
                const cur = data[i].slice(1, 5)
                const prev = data[i - 1].slice(1, 5)
                if (cur.join() == prev.join()) {
                    data[i] = [data[i][0]].concat(['', '', '', '', ''])
                }
            }

            const outputBuffer = xlsx.build([{ name: 'Sheet1', data: data }]);
            fs.writeFileSync(path.join(directory, '..', outputFilename), outputBuffer);

            resolve(0);
        });
    });
};

const directory = path.join(__dirname, 'files', 'downloads');
const outputFilename = 'gathered_stakes.xlsx';

module.exports = {
    parseXlsxFiles,
    parseStakeSheet
};