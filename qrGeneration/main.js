const QRCode = require("qrcode");
const { PDFDocument } = require("pdf-lib");
const path = require("path");
const fs = require("fs");
const xlsx = require("node-xlsx");
const archiver = require("archiver");
const { Canvas, loadImage } = require("canvas");
const fontkit = require("@pdf-lib/fontkit"); // <= here is the Most Important Thing.
const JsBarcode = require("jsbarcode");
const { type } = require("os");
/**
 * @param {String} sourceDir: /some/folder/to/compress
 * @param {String} outPath: /path/to/created.zip
 * @returns {Promise}
 */
function zipDirectory(sourceDir, outPath) {
  const archive = archiver("zip", { zlib: { level: 9 } });
  const stream = fs.createWriteStream(outPath);

  return new Promise((resolve, reject) => {
    archive
      .directory(sourceDir, false)
      .on("error", (err) => reject(err))
      .pipe(stream);

    stream.on("close", () => resolve());
    archive.finalize();
  });
}

async function saveQRPDF(qrDataArray, filePath) {
  const pdfDoc = await PDFDocument.create();
  const writeStream = fs.createWriteStream(filePath);

  for (const qrData of qrDataArray) {
    const buffer = await QRCode.toBuffer(qrData, { errorCorrectionLevel: "H" });
    const qrImage = await pdfDoc.embedPng(buffer);
    const page = pdfDoc.addPage([165, 113]);
    page.drawImage(qrImage, { x: 0, y: 0, width: 113, height: 113 });
  }

  const pdfBytes = await pdfDoc.save();
  writeStream.write(pdfBytes);
  writeStream.end();
}

async function generateNewTags() {
  return new Promise(async (resolve, reject) => {
    const generateBarcode = (value, font) => {
      const canvas = new Canvas(340 * 10, 220 * 10, "image");
      JsBarcode(canvas, value, {
        format: "EAN13",
        marginLeft: 50,
        marginBottom: 50,
        height: 50 * 10,
        width: 22,
        fontSize: 250,
        font: font,
        textMargin: 0,
      });
      return canvas.toBuffer();
    };

    const makePdf = async (campaign, art, color, type, barcode, logo) => {
      const pdfDoc = await PDFDocument.create();
      pdfDoc.registerFontkit(fontkit);
      const page = pdfDoc.addPage([169, 113]);
      const openSans = await pdfDoc.embedFont(openSansBytes);

      const canvas = new Canvas(logo.width, logo.height);
      const ctx = canvas.getContext("2d");
      ctx.drawImage(logo, 0, 0);
      const pngDataUrl = canvas.toDataURL("image/png");
      const pngBytes = Uint8Array.from(atob(pngDataUrl.split(",")[1]), (c) =>
        c.charCodeAt(0)
      );
      const pngImageEmbed = await pdfDoc.embedPng(pngBytes);
      const scalars = {
        // mayusha: pngImageEmbed.scale(0.075),
        // TKS: pngImageEmbed.scale(0.06),
        // delicatus: pngImageEmbed.scale(0.05),
        mayusha: { width: 90, height: 37.5 },
        delicatus: { width: 64, height: 26.65 },
        TKS: { width: 76.8, height: 31.98 },
      };
      const scalar = scalars[campaign];
      page.drawImage(pngImageEmbed, {
        x: (169 - scalar.width) / 2,
        y: 113 - scalar.height + (campaign != "delicatus" ? 4 : 0),
        width: scalar.width,
        height: scalar.height,
      });

      const buffer = await generateBarcode(barcode, openSans);
      const barcodeJpg = await pdfDoc.embedPng(buffer);
      const barcodeDims = barcodeJpg.scale(0.65 / 10);
      page.drawImage(barcodeJpg, {
        x: 0,
        y: 0,
        width: 149,
        height: barcodeDims.height,
      });

      const fontSizeBig = 16;
      const type_width = openSans.widthOfTextAtSize(type, fontSizeBig);
      page.drawText(type, {
        x: (169 - type_width) / 2,
        y: 63 + 9,
        size: fontSizeBig,
        lineHeight: 9,
        font: openSans,
      });

      const fontSize = 8;
      const art_text = "АРТИКУЛ: " + art;
      const art_text_width = openSans.widthOfTextAtSize(art_text, fontSize);
      page.drawText(art_text, {
        x: (169 - art_text_width) / 2,
        y: 63,
        size: fontSize,
        lineHeight: 9,
        font: openSans,
      });

      const col_text = "ЦВЕТ: " + color;
      const col_text_width = openSans.widthOfTextAtSize(col_text, fontSize);
      page.drawText(col_text, {
        x: (169 - col_text_width) / 2,
        y: 63 - fontSize,
        size: fontSize,
        lineHeight: 9,
        font: openSans,
      });

      const filepath = path.join(__dirname, "files", "tags", `${art}.pdf`);
      const pdfBytes = await pdfDoc.save();
      console.log(filepath);
      fs.writeFileSync(filepath, pdfBytes);
    };

    const openSansBytes = fs.readFileSync(
      path.join(__dirname, "files", "OpenSans_Condensed-Bold.ttf")
    );
    const newTagsXlsx = xlsx.parse(
      path.join(__dirname, "files", "newTags.xlsx")
    );

    for (const sheet of newTagsXlsx) {
      const logo = await loadImage(
        path.join(__dirname, "files", "logos", `${sheet.name}.png`)
      );

      const data = sheet.data;
      for (let i = 1; i < data.length; i++) {
        const row = data[i];
        // console.log(row);
        if (!row.length) continue;
        await makePdf(
          sheet.name,
          row[1].toUpperCase(),
          row[2].toUpperCase(),
          row[0].toUpperCase(),
          String(row[3]),
          logo
        );
      }
    }
    resolve();
  });
}

async function autoGenerateNewTags(campaign, brand) {
  return new Promise(async (resolve, reject) => {
    const generateBarcode = (value, font) => {
      const canvas = new Canvas(340 * 10, 220 * 10, "image");
      JsBarcode(canvas, value, {
        format: "EAN13",
        marginLeft: 50,
        marginBottom: 50,
        height: 50 * 10,
        width: 22,
        fontSize: 250,
        font: font,
        textMargin: 0,
      });
      return canvas.toBuffer();
    };

    const makePdf = async (
      campaign,
      brand_art,
      color,
      type,
      barcode,
      size,
      logo,
      art
    ) => {
      const pdfDoc = await PDFDocument.create();
      pdfDoc.registerFontkit(fontkit);
      const page = pdfDoc.addPage([169, 113]);
      const openSans = await pdfDoc.embedFont(openSansBytes);

      const canvas = new Canvas(logo.width, logo.height);
      const ctx = canvas.getContext("2d");
      ctx.drawImage(logo, 0, 0);
      const pngDataUrl = canvas.toDataURL("image/png");
      const pngBytes = Uint8Array.from(atob(pngDataUrl.split(",")[1]), (c) =>
        c.charCodeAt(0)
      );
      const pngImageEmbed = await pdfDoc.embedPng(pngBytes);
      const scalars = {
        // mayusha: pngImageEmbed.scale(0.075),
        // TKS: pngImageEmbed.scale(0.06),
        // delicatus: pngImageEmbed.scale(0.05),
        МАЮША: { width: 90, height: 37.5 },
        DELICATUS: { width: 64, height: 26.65 },
        "Объединённая текстильная компания": { width: 76.8, height: 31.98 },
        "Amaze wear": pngImageEmbed.scale(0.05),
        Перинка: pngImageEmbed.scale(0.06),
        "Trinity Fashion": pngImageEmbed.scale(0.06),
        "Creative Cotton": pngImageEmbed.scale(0.06),
        "SLUMBER+": pngImageEmbed.scale(0.06),
      };
      const scalar = scalars[campaign];
      page.drawImage(pngImageEmbed, {
        x: (169 - scalar.width) / 2,
        y:
          113 -
          scalar.height +
          (campaign == "SLUMBER+" ? 42 : 0) +
          (campaign != "delicatus" && campaign != "Amaze wear" ? 4 : 0),
        width: scalar.width,
        height: scalar.height,
      });

      const buffer = await generateBarcode(barcode, openSans);
      const barcodeJpg = await pdfDoc.embedPng(buffer);
      const barcodeDims = barcodeJpg.scale(0.65 / 10);
      page.drawImage(barcodeJpg, {
        x: 0,
        y: 0,
        width: 149,
        height: barcodeDims.height,
      });

      const fontSizeBig = type.length > 20 ? 10 : 14;
      const type_width = openSans.widthOfTextAtSize(type, fontSizeBig);
      page.drawText(type, {
        x: (169 - type_width) / 2,
        y: 65 + 9,
        size: fontSizeBig,
        lineHeight: 9,
        font: openSans,
      });

      if (parseInt(size)) {
        const fontSizeVeryBig = 42;
        const size_width = openSans.widthOfTextAtSize(size, fontSizeVeryBig);
        page.drawText(size, {
          x: 169 - size_width - 5,
          y: 78,
          size: fontSizeVeryBig,
          lineHeight: 9,
          font: openSans,
        });
      }

      const fontSize = 8;
      const art_text = "АРТИКУЛ: " + brand_art;
      const art_text_width = openSans.widthOfTextAtSize(art_text, fontSize);
      page.drawText(art_text, {
        x: (169 - art_text_width) / 2,
        y: 65,
        size: fontSize,
        lineHeight: 9,
        font: openSans,
      });

      const col_text =
        "ЦВЕТ: " + color + (size != "0" ? `  РАЗМЕР: ${size}` : "");
      const col_text_width = openSans.widthOfTextAtSize(col_text, fontSize + 2);
      page.drawText(col_text, {
        x: (169 - col_text_width) / 2,
        y: 65 - (fontSize + 2),
        size: fontSize + 2,
        lineHeight: 9,
        font: openSans,
      });

      const filepath = path.join(__dirname, "files", "tags", `${art}.pdf`);
      const pdfBytes = await pdfDoc.save();
      console.log(filepath);
      fs.writeFileSync(filepath, pdfBytes);
    };

    const openSansBytes = fs.readFileSync(
      path.join(__dirname, "files", "OpenSans_Condensed-Bold.ttf")
    );
    const artsBarcodesFull = JSON.parse(
      fs.readFileSync(
        path.join(
          __dirname,
          "../prices/files",
          campaign,
          "artsBarcodesFull.json"
        )
      )
    );
    const artsBarcodesFullMayusha = JSON.parse(
      fs.readFileSync(
        path.join(
          __dirname,
          "../prices/files",
          "mayusha",
          "artsBarcodesFull.json"
        )
      )
    );

    const logo = await loadImage(
      path.join(__dirname, "files", "logos", `${brand}.png`)
      // path.join(__dirname, "files", "logos", `${brand}.jpg`)
    );

    for (const [art, art_data] of Object.entries(artsBarcodesFull)) {
      // if (art_data.brand != brand) continue;
      if (!art.includes("НАМАТРАСНИК")) continue;

      const otkArt = art.split("_").slice(0, 3).concat(["ОТК"]).join("_");
      console.log(art, art_data, otkArt);
      await makePdf(
        brand,
        art_data.brand_art.toUpperCase(),
        art_data.color
          ? art_data.color.toUpperCase()
          : artsBarcodesFullMayusha[otkArt].color.toUpperCase(),
        // art_data.color.toUpperCase(),
        art_data.object.toUpperCase(),
        art_data.barcode,
        art_data.size,
        logo,
        art
      );
    }

    resolve();
  });
}

// async function saveQRPDF(qrDataArray, filePath) {
//   const pdfDoc = await PDFDocument.create();
//   const writeStream = fs.createWriteStream(filePath);

//   const qrSize = 40;
//   const margin = 20;
//   const spacing = 10;
//   const qrCols = 58;
//   const qrRows = 40;
//   const qrPerPage = qrRows * qrCols;

//   const page = pdfDoc.addPage();
//   const pageWidth = page.getWidth();
//   const pageHeight = page.getHeight();
//   const usableWidth = pageWidth - margin * 2;
//   const usableHeight = pageHeight - margin * 2;
//   const qrGridWidth = qrCols * qrSize + (qrCols - 1) * spacing;
//   const qrGridHeight = qrRows * qrSize + (qrRows - 1) * spacing;
//   const qrScale = Math.min(usableWidth / qrGridWidth, usableHeight / qrGridHeight);

//   let qrIndex = 0;
//   let qrX = margin;
//   let qrY = pageHeight - margin - qrSize * qrScale;

//   while (qrIndex < qrDataArray.length) {
//     const qrData = qrDataArray[qrIndex];
//     const buffer = await QRCode.toBuffer(qrData, { errorCorrectionLevel: 'H' });
//     const qrImage = await pdfDoc.embedPng(buffer);
//     const qrSizeScaled = qrSize * qrScale;
//     const qrXOffset = (qrSizeScaled + spacing) * (qrIndex % qrCols);
//     const qrYOffset = (qrSizeScaled + spacing) * (qrIndex % qrPerPage >= qrCols ? 1 : 0);
//     const qrXPos = qrX + qrXOffset;
//     const qrYPos = qrY - qrYOffset;

//     const page = pdfDoc.addPage();
//     page.drawImage(qrImage, { x: qrXPos, y: qrYPos, width: qrSizeScaled, height: qrSizeScaled });

//     qrIndex++;

//     if (qrIndex % qrPerPage === 0 || qrIndex === qrDataArray.length) {
//       qrX = margin;
//       qrY -= qrSizeScaled + spacing;
//     } else if (qrIndex % qrCols === 0) {
//       qrX = margin;
//       qrY -= qrSizeScaled + spacing;
//     } else {
//       qrX += qrSizeScaled + spacing;
//     }
//   }

//   const pdfBytes = await pdfDoc.save();
//   writeStream.write(pdfBytes);
//   writeStream.end();
// }

function main() {
  return new Promise((resolve, reject) => {
    const current = xlsx.parse(path.join(__dirname, "files/current.xlsx"))[0]
      .data;
    const qrcodes = [];
    for (let i = 1; i < current.length; i++) {
      qrcodes.push(current[i][5]);
    }
    console.log(qrcodes);

    // // Remove existing files
    // const arch = path.join(__dirname, "files/Поставка/qrcodes.zip");
    // if (fs.existsSync(arch)) {
    //   fs.rm(arch, (err) => {
    //     if (err) reject(err);
    //   });
    // }
    const mainQrDir = path.join(__dirname, "files/Поставка");
    if (fs.existsSync(mainQrDir)) {
      fs.rmSync(mainQrDir, { recursive: true, force: true }, (err) => {
        if (err) reject(err);
      });
    }
    fs.mkdir(mainQrDir, (err) => {
      if (err) reject(err);

      // Group qrcodes by multiplicity
      const qrs = {};
      for (const qr of qrcodes) {
        const params = qr.split(";");
        const multiplicity = String(params[3]);
        if (multiplicity in qrs) {
          qrs[multiplicity].push(qr);
        } else {
          qrs[multiplicity] = [qr];
        }
      }

      // Generate PDFs for each multiplicity
      const promises = [];
      for (const [key, value] of Object.entries(qrs)) {
        const multPdf = path.join(mainQrDir, `QR Кратность ${key}.pdf`);
        promises.push(saveQRPDF(value, multPdf));
      }

      Promise.all(promises)
        .then(() => {
          // Zip directory
          // zipDirectory(mainQrDir, arch)
          // .then(() => {
          //   console.log("Zipping complete.");
          // })
          // .catch((err) => reject(err));
          resolve();
        })
        .catch((err) => reject(err));
    });
  });
}

function generateTags() {
  return new Promise((resolve, reject) => {
    const mainTagsDir = path.join(__dirname, "../qrGeneration/files/tags");
    const currentTagsDir = path.join(
      __dirname,
      "../qrGeneration/files/Поставка/Этикетки"
    );
    if (fs.existsSync(currentTagsDir)) {
      fs.rmSync(currentTagsDir, { recursive: true, force: true }, (err) => {
        if (err) reject(err);
      });
    }
    fs.mkdirSync(currentTagsDir);

    const tags = JSON.parse(
      fs.readFileSync(path.join(__dirname, "files/tags.json"))
    ).tags;
    console.log(tags);

    const promises = [];
    for (let i = 0; i < tags.length; i++) {
      const tag = tags[i].tag;
      promises.push(
        fs.copyFile(
          path.join(mainTagsDir, tag + ".pdf"),
          path.join(currentTagsDir, tag + ".pdf"),
          (err) => {
            if (err) throw err;
          }
        )
      );
    }
    Promise.all(promises).then((pr) => {
      // const arch = path.join(
      //   __dirname,
      //   "../qrGeneration/files/Поставка/tags.zip"
      // );
      // return zipDirectory(currentTagsDir, arch).then(() => {
      //   console.log("Zipping complete.");
      // });
      resolve();
    });
  });
}

function generateTagsRaspredelenniy() {
  return new Promise((resolve, reject) => {
    const mainTagsDir = path.join(__dirname, "../qrGeneration/files/tags");
    const brands = JSON.parse(
      fs.readFileSync(path.join(__dirname, "../prices/files/campaigns.json"))
    ).brands;
    const promises = [];

    for (const [campaign, brand_data] of Object.entries(brands)) {
      const artsBarcodesFull = JSON.parse(
        fs.readFileSync(
          path.join(
            __dirname,
            "../prices/files",
            campaign,
            "artsBarcodesFull.json"
          )
        )
      );
      for (const [art, art_data] of Object.entries(artsBarcodesFull)) {
        const array = art.split("_");
        if (!art.includes("НАМАТРАСНИК") || !art.includes("ТКС")) continue;
        // if (art.includes("СЛВДР")) {
        //   if (parseInt(array[3]) < 3000) continue;
        // }
        if (!art.includes("_ПРК")) {
          if (array[0] == "ПР" || array[0] == "ПРПЭ") {
            if (
              array[1] == "120" ||
              array[1] == "140" ||
              array[1] == "180" ||
              array[1] == "200"
            ) {
              if (array.slice(-1)[0] != "2") continue;
            }
          }
        }

        let mask = getGeneralMaskFromVendorCode(art);
        // mask = mask.split("_");
        // if (!mask.includes("КПБ")) {
        //   mask = mask.slice(0, 1);
        // } else {
        //   mask =
        //     art_data.brand == "DELICATUS" ? mask.slice(-1) : mask.slice(-2, -1);
        // }
        // mask =
        //   art.includes("DELICATUS") && art.includes("КПБ")
        //     ? mask[0] + " 2"
        //     : mask[0];

        // if (
        //   (mask == "СТРАЙП" && title == "DELICATUS") ||
        //   mask.includes("НАМАТРАСНИК") ||
        //   (mask.includes("МОНТЕ") && title == "DELICATUS")
        // )
        //   continue;

        const currentTagsDir_brand = path.join(
          __dirname,
          "../qrGeneration/files/Распределенные Этикетки",
          art_data.brand
        );
        if (!fs.existsSync(currentTagsDir_brand)) {
          fs.rmSync(
            currentTagsDir_brand,
            { recursive: true, force: true },
            (err) => {
              if (err) reject(err);
            }
          );
          fs.mkdirSync(currentTagsDir_brand);
        }
        const currentTagsDir = path.join(currentTagsDir_brand, mask);
        if (!fs.existsSync(currentTagsDir)) {
          // fs.rmSync(currentTagsDir, { recursive: true, force: true }, (err) => {
          //   if (err) reject(err);
          // });
          fs.mkdirSync(currentTagsDir);
        }
        console.log(currentTagsDir);

        promises.push(
          fs.copyFile(
            path.join(mainTagsDir, art + ".pdf"),
            path.join(currentTagsDir, art + ".pdf"),
            (err) => {
              if (err) throw err;
            }
          )
        );
      }
    }
    Promise.all(promises).then((pr) => {
      const arch = path.join(__dirname, "../qrGeneration/files/Этикетки.zip");
      return zipDirectory(
        path.join(__dirname, "../qrGeneration/files/Распределенные Этикетки"),
        arch
      ).then(() => {
        console.log("Zipping complete.");
      });
      resolve();
    });
  });
}

function autofillAndWriteToXlsx() {
  return new Promise((resolve, reject) => {
    const tags = JSON.parse(
      fs.readFileSync(path.join(__dirname, "files/tags.json"))
    ).tags;
    const arts_data = JSON.parse(
      fs.readFileSync(path.join(__dirname, "../prices/files/data.json"))
    );

    const generate_qr_data = (index, seller_id, multiplicity) => {
      let uniqueId = new Date().toISOString();
      uniqueId = uniqueId.replace(/-/g, "");
      uniqueId = uniqueId.replace(/:/g, "");
      uniqueId = uniqueId.replace(/T/g, "");
      uniqueId = uniqueId.slice(0, 14);
      return `#wbbox#0002;${seller_id};${uniqueId}${index};${multiplicity}`;
    };

    const data = [
      [
        "шк единицы товара",
        "кол-во товаров",
        "если товар с кизом, заполните – да",
        "шк короба",
        "срок годности",
        "QR короба",
      ],
    ];
    current_qr_index = 0;
    for (let i = 0; i < tags.length; i++) {
      const calcTag = (tag) => {
        console.log(tag);
        const box = [
          arts_data[tag.tag].barcode,
          arts_data[tag.tag].multiplicity,
          "Да",
          "",
          "",
        ];

        if (tag.count % arts_data[tag.tag].multiplicity != 0) {
          throw Error(`Некратное кол-во шт в поставке ${tag.tag}.`);
        }

        const num_of_boxes = tag.count / arts_data[tag.tag].multiplicity;
        // let boxes = [];
        for (let j = 0; j < num_of_boxes; j++) {
          current_qr_index++;
          data.push(
            box.concat([
              generate_qr_data(
                current_qr_index,
                arts_data[tag.tag].seller_id,
                arts_data[tag.tag].multiplicity
              ),
              tag.tag,
            ])
          );
        }
        // return boxes;
      };

      // data.concat();
      calcTag(tags[i]);
    }
    // console.log(data);

    const buffer = xlsx.build([{ name: "Готовый", data: data }]);
    fs.writeFileSync(path.join(__dirname, "files", "current.xlsx"), buffer);
    resolve(current_qr_index);
  });
}

const getMaskFromVendorCode = (vendorCode, cut_namatr = true) => {
  if (!vendorCode) return "NO_SUCH_MASK_AVAILABLE";
  const code = vendorCode.split("_");
  if (code.slice(-1) == "2") code.pop();
  if (cut_namatr && code.includes("НАМАТРАСНИК")) code.splice(1, 1);
  else if (code.includes("КПБ")) {
    code.splice(3, 1);
    if (code.includes("DELICATUS")) code.pop();
  } else if (code.includes("ФТБЛ")) {
    if (code.includes("МАЮ")) code.splice(-2, 1);
    else if (code.includes("СС")) code.splice(-2, 1);
    else if (code.includes("TF")) code.splice(-2, 1);
    if (isNaN(parseInt(code.slice(-1)))) code.splice(-1, 1);
    else code.splice(-2, 2);
  } else code.splice(2, 1);

  if (code.includes("ЕН")) code.splice(-2, 1);

  return code.join("_");
};

const getGeneralMaskFromVendorCode = (vendorCode) => {
  const mask = getMaskFromVendorCode(vendorCode, false);
  const mask_array = mask.split("_");
  let campaign_flag = mask_array[mask_array.length - 1];
  if ("САВ" == campaign_flag) mask_array.pop();
  campaign_flag = mask_array[mask_array.length - 1];

  if (["ОТК", "ТКС", "DELICATUS", "ПРК"].includes(campaign_flag))
    mask_array.pop();

  return mask_array.join("_");
};

module.exports = {
  main,
  zipDirectory,
  generateTags,
  generateNewTags,
  autofillAndWriteToXlsx,
  generateTagsRaspredelenniy,
  autoGenerateNewTags,
};
