const axios = require("axios");
const fs = require("fs");
const path = require("path");
const { readIfExists } = require("./main");
const { scheduleJob } = require("node-schedule");

const userAgent =
    "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/58.0.3029.110 Safari/537.3";


const getTopPhrases = async (uid, campaignName) => {
    const topPhrases = [];

    let advertsInfos = undefined
    try {
        advertsInfos = readIfExists(
            path.join(
                __dirname,
                "marketMaster",
                uid,
                campaignName,
                "advertsInfos.json"
            )
        );
    }
    catch (e) {
        console.log(new Date(), e);
        return []
    }

    let advertsWords = undefined
    try {
        advertsWords = readIfExists(
            path.join(__dirname, "marketMaster", uid, campaignName, "advertsWords.json")
        );
    }
    catch (e) {
        console.log(new Date(), e);
        return []
    }


    for (const [id, advertsInfo] of Object.entries(advertsInfos)) {

        const { type, status, advertId } = advertsInfo;
        if (![9, 11].includes(status)) continue;
        //   console.log(new Date(), art, advertsType, rules);

        const words = advertsWords[advertId];
        if (!words) continue;
        if (type == 9 || type == 6) {
            const { keywords, pluse, excluded } = words.words ?? {};
            if (!keywords || !keywords.length) continue;
            for (let i = 0; i < keywords.length; i++) {
                const phrase = keywords[i].keyword;
                if (!topPhrases.includes(phrase)) {
                    topPhrases.push(phrase);
                }
            }

            for (let i = 0; i < pluse.length; i++) {
                const phrase = pluse[i];
                if (!topPhrases.includes(phrase)) {
                    topPhrases.push(phrase);
                }
            }

            for (let i = 0; i < excluded.length; i++) {
                const phrase = excluded[i];
                if (!topPhrases.includes(phrase)) {
                    topPhrases.push(phrase);
                }
            }

        } else {
            const { clusters, excluded } = words ?? {};
            if (!clusters || !clusters.length) continue;
            for (let i = 0; i < clusters.length; i++) {
                const phrase = clusters[i].cluster;
                if (!topPhrases.includes(phrase)) {
                    topPhrases.push(phrase);
                }

                const { keywords } = clusters[i] ?? {};
                if (!keywords || !keywords.length) continue;
                for (let i = 0; i < keywords.length; i++) {
                    const phrasek = keywords[i].keyword;
                    if (!topPhrases.includes(phrasek)) {
                        topPhrases.push(phrasek);
                    }
                }
            }

            for (let i = 0; i < excluded.length; i++) {
                const phrase = excluded[i];
                if (!topPhrases.includes(phrase)) {
                    topPhrases.push(phrase);
                }
            }


        }
    }
    return topPhrases;
};

async function getPresets(phrases) {
    const jsonData = { phrases: {}, presets: {} };

    for (let i = 0; i < phrases.length; i++) {

        const phrase = phrases[i];

        try {
            const url = `https://search.wb.ru/exactmatch/ru/common/v5/search?ab_testing=false&appType=1&page=${1}&curr=rub&dest=-1257218&query=${encodeURIComponent(phrase)}&resultset=catalog&sort=popular&spp=30&suppressSpellcheck=false`;

            const response = await axios.get(url, {
                headers: {
                    "User-Agent": userAgent,
                },
            });

            const data = response.data;

            const { metadata } = data ?? {};
            if (metadata) {
                jsonData.phrases[phrase] = metadata;
                const { catalog_value } = metadata ?? {};
                if (!catalog_value) continue;
                const preset = catalog_value.split('=')[1];
                jsonData.phrases[phrase].catalog_value = preset;

                if (!jsonData.presets[preset]) jsonData.presets[preset] = []
                if (!jsonData.presets[preset].includes(phrase)) jsonData.presets[preset].push(phrase)

            }

            console.log(new Date(), phrase, i, ' / ', phrases.length);
        } catch (error) {
            console.log(new Date(), error);
        }


    }

    return jsonData;
}

const start = async () => {
    const customers = readIfExists(path.join(__dirname, "marketMaster", "customers.json"))

    let phrases = []
    for (const [uid, customerData] of Object.entries(customers)) {
        const campaignsNames = customerData.campaignsNames;
        for (let i = 0; i < campaignsNames.length; i++) {
            const campaignName = campaignsNames[i];
            console.log(new Date(), uid, campaignName);
            phrases = phrases.concat(await getTopPhrases(uid, campaignName));
        }
    }

    const batches = []
    for (let i = 0; i < phrases.length; i++) {
        if (i % Math.ceil(phrases.length / 2) == 0) {
            batches.push([]);
        }
        batches[batches.length - 1].push(phrases[i])
    }

    console.log(new Date(), batches);
    // return;

    const jsonData = { phrases: {}, presets: {} }
    const batchProms = []
    for (let i = 0; i < batches.length; i++) {
        batchProms.push(getPresets(batches[i]).then(pr => {
            Object.assign(jsonData.phrases, pr.phrases);
            Object.assign(jsonData.presets, pr.presets);
        }));
        await new Promise(resolve => setTimeout(resolve, 100))
    }
    await Promise.all(batchProms);


    fs.writeFileSync(path.join(__dirname, "marketMaster", "presets.json"), JSON.stringify(jsonData))

}

start()
scheduleJob("2 */3 * * *", () => {
    start()
});