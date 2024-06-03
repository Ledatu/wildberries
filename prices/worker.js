// worker.js
const { parentPort, workerData } = require('worker_threads');
const { autoSetAdvertsCPMsAndWriteToJsonMM } = require("./main");

const autoBidder = async (uid, campaignName) => {
    while (true) {
        await autoSetAdvertsCPMsAndWriteToJsonMM(uid, campaignName).then(() =>
            console.log(new Date(), uid, campaignName, "Adverts bids set.")
        );
        await new Promise((resolve) => setTimeout(resolve, 1 * 10 * 1000));
    }
};

const { uid, campaignName } = workerData;
autoBidder(uid, campaignName).then(() => {
    parentPort.postMessage('done');
});
