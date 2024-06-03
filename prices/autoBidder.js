// main.js
const { Worker } = require('worker_threads');
const fs = require('fs');
const path = require('path');

const start = async () => {
  const customers = JSON.parse(
    fs.readFileSync(path.join(__dirname, "marketMaster", "customers.json"))
  );

  for (const [uid, customerData] of Object.entries(customers)) {
    const campaignsNames = customerData.campaignsNames;
    for (let i = 0; i < campaignsNames.length; i++) {
      const campaignName = campaignsNames[i];
      console.log(new Date(), uid, campaignName);

      const worker = new Worker(path.join(__dirname, 'worker.js'), {
        workerData: { uid, campaignName }
      });

      worker.on('message', (msg) => {
        if (msg === 'done') {
          console.log(new Date(), uid, campaignName, "Worker finished.");
        }
      });

      worker.on('error', (err) => {
        console.error(new Date(), uid, campaignName, "Worker error:", err);
      });

      worker.on('exit', (code) => {
        if (code !== 0) {
          console.error(new Date(), uid, campaignName, `Worker stopped with exit code ${code}`);
        }
      });
    }
  }

  console.log(new Date(), "Started");
};

start();
