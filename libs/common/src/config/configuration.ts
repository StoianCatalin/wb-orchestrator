
export default () => {
  return {
    scrapper_name: process.env.SCRAPPER_NAME,
    delay_between_runs: process.env.DELAY_BETWEEN_RUNS,
    api_url: process.env.API_URL,
    api_key: process.env.API_KEY,
  };
};
