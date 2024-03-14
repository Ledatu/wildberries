const { readIfExists } = require("./main");
const { scheduleJob } = require("node-schedule");
const fs = require("fs");
const path = require("path");
const { scrapeWildberriesData } = require("./scraper");

const getTopPhrases = async (uid, campaignName) => {
  const topPhrases = [];

  const advertsManagerRules = readIfExists(
    path.join(
      __dirname,
      "marketMaster",
      uid,
      campaignName,
      "advertsManagerRules.json"
    )
  );
  const advertsWords = readIfExists(
    path.join(__dirname, "marketMaster", uid, campaignName, "advertsWords.json")
  );
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
        const { keywords } = words.words ?? {};
        if (!keywords || !keywords.length) continue;

        const top = keywords[0];
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
    const customers = readIfExists(
      path.join(__dirname, "marketMaster", "customers.json")
    );
    const topPhrases = [];
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

    const placements = await scrapeWildberriesData(topPhrases);

    fs.writeFileSync(
      path.join(__dirname, "placements.json"),
      JSON.stringify(placements)
    );
  }
};

start();
//  scheduleJob("31 * * * *", () => start());
