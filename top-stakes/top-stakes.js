const startServer = require("./server");
const { deleteFlagFile } = require("../flags/flagWork");
const {
  fetchAdverts,
  getPrices,
  calcAutoPrices,
  writeSpp,
  RNPupdation,
  fetchAdvertsMM,
  calcAndSendTrendsToTg,
} = require("../prices/prices");
const { scheduleJob, gracefulShutdown } = require("node-schedule");
const { writeDetailedByPeriod } = require("../prices/google_sheets");

startServer();
scheduleJob("20 * * * *", () => writeSpp());
scheduleJob("55 * * * *", () => fetchAdverts());
scheduleJob("40 * * * *", () => fetchAdvertsMM());
scheduleJob("50 * * * *", () => {
  if ([3, 9, 15, 21].includes(new Date().getHours())) getPrices(true);
});
scheduleJob("58 * * * *", () => {
  calcAutoPrices();
});
scheduleJob("10 * * * *", () => RNPupdation());
scheduleJob("58 * * * *", () => {
  const now = new Date();
  calcAndSendTrendsToTg(now);
});
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
