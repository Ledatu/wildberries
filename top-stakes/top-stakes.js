const startServer = require("./server");
const { deleteFlagFile } = require("../flags/flagWork");
const {
  fetchAdverts,
  getPrices,
  calcAutoPrices,
  writeSpp,
  RNPupdation,
  fetchAdvertsMM,
} = require("../prices/prices");
const { scheduleJob, gracefulShutdown } = require("node-schedule");

startServer();
// scheduleJob("20 * * * *", () => writeSpp());
scheduleJob("50 * * * *", () => getPrices(true));
scheduleJob("55 * * * *", () => fetchAdverts());
scheduleJob("40 * * * *", () => fetchAdvertsMM());
scheduleJob("58 * * * *", () => calcAutoPrices());
scheduleJob("10 * * * *", () => RNPupdation());

const flagFile = "top-stakes-flag.txt";

function cleanup() {
  console.log("Script exiting...");
  deleteFlagFile(flagFile).catch((err) => {
    console.error(`Error deleting flag file: ${err}`);
  });
  gracefulShutdown().then(() => process.exit(0));
}

process.on("exit", cleanup);
process.on("uncaughtException", (err) => {
  console.error("Uncaught exception:", err);
  cleanup();
});
process.on("SIGINT", cleanup);
