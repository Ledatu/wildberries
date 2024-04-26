const xlsx = require("node-xlsx").default;
const fs = require("fs");
const path = require("path");

module.exports = {
  parseXlsx: async (adsIds) => {
    const resultSheet = [];
    for (const id in adsIds.data) {
      const adId = adsIds.data[id];
      const mainDlDir = path.join(
        __dirname,
        "../files",
        adsIds.campaign,
        adId.title
      );

      if (!fs.existsSync(mainDlDir)) continue;

      fs.readdirSync(mainDlDir).forEach((file) => {
        const sheet = xlsx.parse(path.join(mainDlDir, file))[0];
        const data = sheet.data.slice(-1)[0];

        console.log(new Date(), adId, data);
        
        if (data[0].length < 1) {
          return;
        }
        //    console.log(new Date(), file, data)
        const shows = data[2];
        const clicks = data[3];
        const rashod = data[11];
        
        resultSheet.push(to_push);
      });

      // make pivot table
      const pivotSheet = [];
      for (row of resultSheet) {
        const days = (row.length - 1) / 6;
        const stats = [0, 0, 0, 0, 0, 0];
        for (let day = 0; day < days; day++) {
          for (let i = 0; i < 6; i++) {
            let val = row[1 + day * 6 + i];
            val = Number(val ? val.replace(",", ".") : 0);
            if (i == 1 || i == 3 || i == 5) val /= days;
            stats[i] += val;
          }
        }
        pivotSheet.push([row[0]].concat(stats));
      }

      // console.log(new Date(), pivotSheet);
      fs.writeFileSync(
        path.join(
          __dirname,
          "../files",
          adsIds.campaign,
          `${adsIds.campaign}.xlsx`
        ),
        xlsx.build([
          { name: "Аналитика", data: resultSheet },
          { name: "Сводка", data: pivotSheet },
        ])
      );
      //    clearDownloadsFolder()
    }
  },
};
