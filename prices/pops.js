const axios = require('axios');
const fs = require('fs');
const path = require('path');
const AdmZip = require('adm-zip');
const { getAuthTokenMM } = require('./main');

const dzhemGet = async (uid, campaignName, uuid = "6a99dbe9-60de-465c-bf6b-9f6dd1b831ef") => {
    const authToken = getAuthTokenMM(uid, campaignName);

    const dirPath = path.join(__dirname, 'marketMaster', uid, campaignName);
    const zipFilePath = path.join(dirPath, 'report.zip');
    const csvFilePath = path.join(dirPath, 'dzhem.csv');

    // Убедитесь, что каталог существует
    if (!fs.existsSync(dirPath)) {
        fs.mkdirSync(dirPath, { recursive: true });
    }

    try {
        // Отправка запроса к API
        const response = await axios.get(`https://seller-analytics-api.wildberries.ru/api/v2/nm-report/downloads/file/${uuid}`, {
            responseType: 'arraybuffer',
            headers: {
                Authorization: authToken,
                'Accept': 'application/zip',
            },
        });

        // Запись ZIP файла
        fs.writeFileSync(zipFilePath, response.data);

        // Распаковка ZIP файла
        const zip = new AdmZip(zipFilePath);
        const zipEntries = zip.getEntries();

        // Поиск и сохранение CSV файла из архива
        zipEntries.forEach((zipEntry) => {
            if (zipEntry.entryName.endsWith('.csv')) {
                fs.writeFileSync(csvFilePath, zipEntry.getData());
                console.log(`CSV файл успешно сохранен по пути: ${csvFilePath}`);
            }
        });

    } catch (error) {
        console.error('Ошибка при получении или сохранении отчета:', error);
    }
};

// Пример использования

dzhemGet("4a1f2828-9a1e-4bbf-8e07-208ba676a806", "ОТК ПРОИЗВОДСТВО")
