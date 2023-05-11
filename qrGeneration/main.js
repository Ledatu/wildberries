const QRCode = require("qrcode");
const { PDFDocument } = require("pdf-lib");
const path = require("path");
const fs = require("fs");
const xlsx = require("node-xlsx");
const archiver = require("archiver");
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
      uniqueId = uniqueId.slice(0, 12);
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

module.exports = {
  main,
  zipDirectory,
  generateTags,
  autofillAndWriteToXlsx,
};
