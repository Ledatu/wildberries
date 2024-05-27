const axios = require("axios");
const fs = require("fs");
const path = require("path");
const { readIfExists } = require("./main");
const { scheduleJob } = require("node-schedule");

const userAgent =
    "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/58.0.3029.110 Safari/537.3";


const getBrands = async (uid, campaignName) => {
    const res = [];

    let arts = undefined
    try {
        arts = readIfExists(
            path.join(
                __dirname,
                "marketMaster",
                uid,
                campaignName,
                "arts.json"
            )
        );
    }
    catch (e) {
        console.log(new Date(), e);
        return []
    }

    for (const [art, artData] of Object.entries(arts.byArt)) {
        if (!art || !artData) continue;

        const { nmId } = artData;
        if (!res.includes(nmId)) res.push(nmId);
    }

    async function getPresets(nmIds) {
        const jsonData = { arts: {} };
        const prices = readIfExists(path.join(__dirname, "marketMaster", uid, campaignName, "prices.json"))
        if (Object.keys(prices).length == 0) return jsonData;

        for (let i = 0; i < nmIds.length; i++) {

            const nmId = nmIds[i];

            try {
                const url = `https://card.wb.ru/cards/v2/detail?appType=1&curr=rub&dest=-1257218&spp=30&nm=${nmId}`;

                const response = await axios.get(url, {
                    headers: {
                        "User-Agent": userAgent,
                    },
                });

                const resdata = response.data ?? {};
                const { data } = resdata ?? {};
                const { products } = data ?? {};
                if (products) {
                    for (let j = 0; j < products.length; j++) {
                        const product = products[j];
                        const sizesTemp = {};
                        for (let k = 0; k < product.sizes.length; k++) {
                            const inf = product.sizes[k];
                            const { origName, price } = inf ?? {};
                            if (!origName || !price || !prices[nmId]) continue;

                            const priceInfo = prices[nmId].sizes[origName];

                            const { total } = price;

                            priceInfo.spp =
                                1 - (total / 100
                                    / (Math.round(priceInfo.price * (1 - prices[nmId].discount / 100))))
                            if (priceInfo.spp) {
                                priceInfo.spp *= 100;
                                priceInfo.spp = Math.abs(priceInfo.spp)
                                priceInfo.spp = Math.round(priceInfo.spp)
                            }
                            inf['spp'] = priceInfo.spp;
                            console.log(origName, uid, campaignName, priceInfo.spp);

                            sizesTemp[origName] = inf;
                        }
                        product.sizes = sizesTemp;
                        if (!jsonData.arts[nmId]) jsonData.arts[nmId] = product;
                    }
                }

                console.log(new Date(), uid, campaignName, nmId, i + 1, ' / ', nmIds.length);
            } catch (error) {
                console.log(new Date(), error);
            }


        }

        return jsonData;
    }

    const batches = []
    for (let i = 0; i < res.length; i++) {
        if (i % Math.ceil(res.length / 2) == 0) {
            batches.push([]);
        }
        batches[batches.length - 1].push(res[i])
    }
    console.log(new Date(), batches);

    const jsonData = { arts: {} }
    const batchProms = []
    for (let i = 0; i < batches.length; i++) {
        batchProms.push(getPresets(batches[i]).then(pr => {
            Object.assign(jsonData.arts, pr.arts);
        }));
        await new Promise(resolve => setTimeout(resolve, 100))
    }
    await Promise.all(batchProms);

    fs.writeFileSync(path.join(__dirname, "marketMaster", uid, campaignName, "sppPricesParsed.json"), JSON.stringify(jsonData))

};

const start = async () => {
    const customers = readIfExists(path.join(__dirname, "marketMaster", "customers.json"))

    for (const [uid, customerData] of Object.entries(customers)) {
        const campaignsNames = customerData.campaignsNames;
        for (let i = 0; i < campaignsNames.length; i++) {
            const campaignName = campaignsNames[i];

            console.log(new Date(), uid, campaignName);
            await getBrands(uid, campaignName);
        }
    }

}

// start()
scheduleJob("55 * * * *", () => {
    start()
});