
export default () => {
  return {
    storage_path: process.env.STORAGE_PATH,
    scrapper_name: process.env.SCRAPPER_NAME,
    delay_between_runs: process.env.DELAY_BETWEEN_RUNS,
    api_url: process.env.API_URL,
    api_key: process.env.API_KEY,
    ocr_url: process.env.OCR_URL,
    orchestrator_url: process.env.ORCHESTRATOR_URL,
  };
};
