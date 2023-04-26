const QRCode = require("qrcode");
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

  console.log("Zipping.");
  return new Promise((resolve, reject) => {
    archive
      .directory(sourceDir, false)
      .on("error", (err) => reject(err))
      .pipe(stream);

    stream.on("close", () => resolve());
    archive.finalize();
  });
}

async function main() {
  const arch = path.join(__dirname, "files/qrcodes.zip");
  if (fs.existsSync(arch)) {
    fs.rmSync(arch);
  }

  const qrcodes = JSON.parse(fs.readFileSync(path.join(__dirname, "files/qrcodes.json"))).qrcodes;
  console.log(qrcodes);
  const mainQrDir = path.join(__dirname, "files/qrcodes");
  fs.rmSync(mainQrDir, { recursive: true, force: true });
  fs.mkdirSync(mainQrDir, (err) => {});

  for (qr of qrcodes) {
    const params = qr.split(";");
    const multiplicity = params[3];
    const uid = params[2];

    const qrDir = path.join(mainQrDir, `QR Кратность ${multiplicity}`);
    if (!fs.existsSync(qrDir)) {
      fs.mkdirSync(qrDir, (err) => {});
    }
    QRCode.toFile(path.join(qrDir, `${uid}.png`), qr);
  }

  await zipDirectory(mainQrDir, arch);
}

module.exports = {
  main,
  zipDirectory,
};
