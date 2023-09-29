const startServer = require("./server");
const { deleteFlagFile } = require("../flags/flagWork");
const { fetchAdverts } = require("../prices/prices");
const { scheduleJob, gracefulShutdown } = require("node-schedule");

startServer();
scheduleJob("55 * * * *", () => fetchAdverts());

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
