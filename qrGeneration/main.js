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
    const page = pdfDoc.addPage([58, 40]);
    page.drawImage(qrImage, { x: 0, y: 0, width: 40, height: 40 });
  }

  const pdfBytes = await pdfDoc.save();
  writeStream.write(pdfBytes);
  writeStream.end();
}

function main() {
  return new Promise((resolve, reject) => {
    const arch = path.join(__dirname, "files/qrcodes.zip");
    const qrcodes = JSON.parse(fs.readFileSync(path.join(__dirname, "files/qrcodes.json"))).qrcodes;
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

module.exports = {
  main,
  zipDirectory,
};
