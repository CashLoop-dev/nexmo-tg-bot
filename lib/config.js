const config = {
  TELEGRAM_BOT_TOKEN: process.env.TELEGRAM_BOT_TOKEN,
  BOT_PHONE_NUMBER: process.env.BOT_PHONE_NUMBER,
  NEXMO_API_KEY: process.env.NEXMO_API_KEY,
  NEXMO_API_SECRET: process.env.NEXMO_API_SECRET,
  NEXMO_APP_ID: process.env.NEXMO_APP_ID,
  NEXMO_PRIVATE_KEY: process.env.NEXMO_PRIVATE_KEY,
  BASE_URL: process.env.BASE_URL,
  BOT_OWNER_ID: process.env.BOT_OWNER_ID // For admin rights
};

Object.entries(config).forEach(([key, val]) => {
  if (!val) throw new Error(`Missing env variable: ${key}`);
});

module.exports = config;