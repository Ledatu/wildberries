const startServer = require("./server");
const { deleteFlagFile } = require("../flags/flagWork");

startServer();
const flagFile = "top-stakes-flag.txt";

function cleanup() {
  console.log("Script exiting...");
  deleteFlagFile(flagFile).catch((err) => {
    console.error(`Error deleting flag file: ${err}`);
  });
  process.exit();
}

process.on("exit", cleanup);
process.on("uncaughtException", (err) => {
  console.error("Uncaught exception:", err);
  cleanup();
});
process.on("SIGINT", cleanup);
