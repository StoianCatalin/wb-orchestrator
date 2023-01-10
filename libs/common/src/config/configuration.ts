
export default () => {
  return {
    scrapper_name: process.env.SCRAPPER_NAME,
    getTypeOrmConfig: async () => {
      return {
        type: 'postgres',
        host: process.env.DATABASE_HOST,
        username: process.env.DATABASE_USER,
        password: process.env.DATABASE_PASSWORD,
        database: process.env.DATABASE_NAME,
        port: parseInt(process.env.DATABASE_PORT, 10) || 5432,
      };
    },
  };
};
