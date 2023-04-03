const main = require("./main");
const { deleteFlagFile } = require('../flags/flagWork');


main()

const flagFile = 'analytics-flag.txt';
function cleanup() {
    console.log('Script exiting...');
    deleteFlagFile(flagFile).catch((err) => {
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