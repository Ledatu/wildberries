const xlsx = require("node-xlsx").default;
const fs = require("fs");

module.exports = (campaign_id) => {
  console.log(`Started pasrsing ${campaign_id} data from the files`);
  const downloadsForlder = `./files/${campaign_id}/`;
  const presented_ids = xlsx.parse(`./files/${campaign_id}_presented.xlsx`)[0][
    "data"
  ][0];
  //	console.log(presented_ids)

  const clearDownloadsFolder = () => {
    fs.readdirSync(downloadsForlder).forEach((file) => {
      if (file.split(" ").length < 2) {
        return;
      }
      //				const camp_id = file.split('.')[0]
      //
      //				const sheet = xlsx.parse(`${downloadsForlder}${file}`)[0]
      //				let name = names[camp_id]
      //				name = name.slice(0, name.length-5).split(',').join(' ')
      //				const data = sheet['data']

      //				fs.writeFileSync(`${downloadsForlder}${camp_id}.xlsx`, xlsx.build([{ name: name, data: data }]));

      fs.unlink(`${downloadsForlder}${file}`, (err) => {
        if (err) throw err;
      });
    });

    console.log("Downloads cleared.");
  };
  //	clearDownloadsFolder()
  //	return

  const resultSheet = [];
  fs.readdirSync(downloadsForlder).forEach((file) => {
    const sheet = xlsx.parse(`${downloadsForlder}${file}`)[0];
    const data = sheet["data"];
    const id = file.split(".")[0];
    const name = id + " " + data[0][0];

    //		console.log(id)
    if (!presented_ids.includes(id)) {
      return;
    }

    if (data[0].length < 1) {
      return;
    }
    //    console.log(file, data)
    const rashod = data[7];
    const clicks = data[3];
    const srs = data[6];
    const orders = data[12];
    const drr = data[16];
    const stavka = data[11];
    const index = rashod.length - 1;
    const to_push = [name];

    const date = new Date();
    date.setDate(date.getDate() + 1);
    //		console.log('Tomorrow: ', date.getDate())
    let days = -1;
    for (let i = 0; i < 30; i++) {

      days++;
      date.setDate(date.getDate() - 1);
      const today = date.getDate();
      //            console.log(today)
      const jndex = index - days;

      if (jndex < 1) continue;

      if (data[0][jndex].split("-")[0] != today) {
        days--;
        //				console.log(today, 'is invalid date for', file)
        for (let u = 0; u < 6; u++) {
          to_push.push(undefined);
        }
        continue;
      }

      to_push.push(rashod[jndex] ? rashod[jndex].replace(".", ",") : undefined);
      to_push.push(stavka[jndex] ? stavka[jndex].replace(".", ",") : undefined);
      to_push.push(clicks[jndex] ? clicks[jndex].replace(".", ",") : undefined);
      to_push.push(srs[jndex] ? srs[jndex].replace(".", ",") : undefined);
      to_push.push(orders[jndex] ? orders[jndex].replace(".", ",") : undefined);
      to_push.push(drr[jndex] ? drr[jndex].replace(".", ",") : undefined);
    }

    resultSheet.push(to_push);
  });

  //    console.log(resultSheet)
  fs.writeFileSync(
    `./files/${campaign_id}.xlsx`,
    xlsx.build([{ name: "Аналитика", data: resultSheet }])
  );
  //    clearDownloadsFolder()
};
