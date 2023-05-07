const QRCode = require("qrcode");
const { PDFDocument } = require("pdf-lib");
const path = require("path");
const fs = require("fs");
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
    const arch = path.join(__dirname, "files/qrcodes.zip");
    const qrcodes = JSON.parse(
      fs.readFileSync(path.join(__dirname, "files/qrcodes.json"))
    ).qrcodes;
    console.log(qrcodes);

    // Remove existing files
    if (fs.existsSync(arch)) {
      fs.rm(arch, (err) => {
        if (err) reject(err);
      });
    }
    const mainQrDir = path.join(__dirname, "files/qrcodes");
    if (fs.existsSync(mainQrDir)) {
      fs.rmSync(mainQrDir, { recursive: true, force: true }, (err) => {
        if (err) reject(err);
      });
    }

    // Create directory
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
          zipDirectory(mainQrDir, arch)
            .then(() => {
              console.log("Zipping complete.");
              resolve();
            })
            .catch((err) => reject(err));
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
      "../qrGeneration/files/tags_current"
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
      const tag = tags[i].replace("Й", "Й");
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
      const arch = path.join(__dirname, "../qrGeneration/files/tags.zip");
      return zipDirectory(currentTagsDir, arch).then(() => {
        console.log("Zipping complete.");
        resolve();
      });
    });
  });
}

module.exports = {
  main,
  zipDirectory,
  generateTags,
};
