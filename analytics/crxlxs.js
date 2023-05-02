const parse_xlsx = require("./mp_manager/excelParser");
const writeToGoogle = require("./google_sheets/index");

const a = async () => {
  let campaign_ids = ["Q8OWW7YMRgq5h4wk7UHHvA", "TsGOXnYrT22nfoDwEsftHw"];
  let campaign_names = ["MAYUSHA", "DELICATUS"];

  for (let i = 0; i < campaign_ids.length; i++) {
    await parse_xlsx(campaign_ids[i]);

    await writeToGoogle(campaign_ids[i], campaign_names[i]);
  }
};

a();
