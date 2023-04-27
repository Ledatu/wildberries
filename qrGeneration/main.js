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

async function main() {
  const arch = path.join(__dirname, "files/qrcodes.zip");
  if (fs.existsSync(arch)) {
    fs.rmSync(arch);
  }

  const qrcodes = JSON.parse(
    fs.readFileSync(path.join(__dirname, "files/qrcodes.json"))
  ).qrcodes;
  console.log(qrcodes);
  const mainQrDir = path.join(__dirname, "files/qrcodes");
  fs.rmSync(mainQrDir, { recursive: true, force: true });
  fs.mkdirSync(mainQrDir, (err) => {});

  qrs = {};
  for (qr of qrcodes) {
    const params = qr.split(";");
    const multiplicity = String(params[3]);

    if (multiplicity in qrs) {
      qrs[multiplicity].push(qr);
    } else {
      qrs[multiplicity] = [qr];
    }
  }

  for (let [key, value] of Object.entries(qrs)) {
    const multPdf = path.join(mainQrDir, `QR Кратность ${key}.pdf`);
    await saveQRPDF(value, multPdf);
  }

  await zipDirectory(mainQrDir, arch);
  console.log("Zipping complete.");

}

module.exports = {
  main,
  zipDirectory,
};
