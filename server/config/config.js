require('dotenv').config();

module.exports = {
  development: {
    dialect: "sqlite",
    storage: process.env.DB_STORAGE || "./database.sqlite"
  },
  test: {
    dialect: "sqlite",
    storage: ":memory:"
  },
  production: {
    dialect: "sqlite",
    storage: "./database-prod.sqlite"
  }
};
