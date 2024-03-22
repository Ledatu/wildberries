const { readIfExists } = require("./main");
const { scheduleJob } = require("node-schedule");
const fs = require("fs");
const path = require("path");
const { scrapeWildberriesData } = require("./scraper");

const getTopPhrases = async (uid, campaignName) => {
  const topPhrases = [];

  let advertsManagerRules = undefined
  try {
    advertsManagerRules = readIfExists(
      path.join(
        __dirname,
        "marketMaster",
        uid,
        campaignName,
        "advertsManagerRules.json"
      )
    );
  }
  catch (e) {
    console.log(e);
    return []
  }

  let advertsWords = undefined
  try {
    advertsWords = readIfExists(
      path.join(__dirname, "marketMaster", uid, campaignName, "advertsWords.json")
    );
  }
  catch (e) {
    console.log(e);
    return []
  }


  for (const [art, advertsTypes] of Object.entries(advertsManagerRules)) {
    const topPhrase = {};

    if (!art || !advertsTypes) continue;
    for (const [advertsType, rules] of Object.entries(advertsTypes)) {
      if (!advertsType || !rules) continue;
      const { advertId, mode } = rules;
      if (!advertId || !mode) continue;
      //   console.log(art, advertsType, rules);

      const words = advertsWords[advertId];
      if (!words) continue;
      if (advertsType == "search") {
        const { keywords, pluse } = words.words ?? {};
        if (!keywords || !keywords.length) continue;

        if (pluse) {
          for (let j = 0; j < pluse.length; j++) {
            const keyword = pluse[j];
            const { stat } = advertsWords[advertId];
            if (!stat[keyword]) continue;
            const { views } = stat[keyword] ?? {};
            // console.log(stat[keyword], keyword);
            keywords.push({
              keyword: keyword,
              count: views,
            });
          }
        }

        keywords.sort((a, b) => b.count - a.count);

        const top = keywords[0];
        // for (const key of keywords) {
        //   if (!topPhrases.includes(key.keyword))
        //     topPhrases.push(key.keyword);
        // }
        // console.log(art, advertsType, top);

        if (!topPhrase.count || topPhrase.count < top.count) {
          topPhrase.phrase = top.keyword;
          topPhrase.count = top.count;
          //   console.log(art, advertsType, topPhrase);
        }
      } else {
        const { clusters } = words ?? {};
        if (!clusters || !clusters.length) continue;

        const top = clusters[0];
        // for (const key of clusters) {
        //   if (!topPhrases.includes(key.cluster))
        //     topPhrases.push(key.cluster);
        // }

        if (!topPhrase.count || topPhrase.count < top.count) {
          topPhrase.phrase = top.cluster;
          topPhrase.count = top.count;
          //   console.log(art, advertsType, topPhrase);
        }
      }
    }
    if (topPhrase.count && !topPhrases.includes(topPhrase.phrase)) {
      //   if (topPhrase.phrase == "пастельная белье") console.log(art);
      topPhrases.push(topPhrase.phrase);
      // console.log(topPhrases);
    }
  }
  return topPhrases;
};

const start = async () => {

  while (true) {
    let customers = undefined
    try {
      customers = readIfExists(
        path.join(__dirname, "marketMaster", "customers.json")
      );
    }
    catch (e) { continue }

    const topPhrases = []
    for (const [uid, customerData] of Object.entries(customers)) {
      const campaignsNames = customerData.campaignsNames;
      for (let i = 0; i < campaignsNames.length; i++) {
        const campaignName = campaignsNames[i];
        // if (campaignName != "Объединённая текстильная компания") continue;
        console.log(uid, campaignName);
        const topPhrasesCampaing = await getTopPhrases(uid, campaignName);
        //   console.log(campaignName, topPhrasesCampaing);
        for (let j = 0; j < topPhrasesCampaing.length; j++) {
          if (!topPhrases.includes(topPhrasesCampaing[j]))
            topPhrases.push(topPhrasesCampaing[j]);
        }
      }
    }
    console.log(topPhrases, topPhrases.length);
    // await scrapeWildberriesData(topPhrases)

    const batches = []
    for (let i = 0; i < topPhrases.length; i++) {
      // console.log(i, i % (topPhrases.length / 10));
      if (i % Math.ceil(topPhrases.length / 100) == 0) {
        batches.push([]);
      }
      batches[batches.length - 1].push(topPhrases[i])
    }
    const batchProms = []
    // console.log(topPhrases.length);
    for (let i = 0; i < batches.length; i++) {
      batchProms.push(scrapeWildberriesData(batches[i]));
      await new Promise(resolve => setTimeout(resolve, 100))
    }
    await Promise.all(batchProms);
  }

};

start();
//  scheduleJob("*/10 * * * *", () => start());
