const startServer = require("./server");
const { deleteFlagFile } = require("./flagWork")

startServer()

function cleanup() {
    console.log('Script exiting...');
    deleteFlagFile().catch((err) => {
        console.error(`Error deleting flag file: ${err}`);
    });
    process.exit();
}

process.on('exit', cleanup);
process.on('uncaughtException', (err) => {
    console.error('Uncaught exception:', err);
    cleanup();
  });
process.on('SIGINT', cleanup);