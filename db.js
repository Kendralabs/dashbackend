const keys = require("./keys");



const {Client} = require("pg");

const client = new Client({
  user: keys.pgUser,
  host: keys.pgHost,
  database: keys.pgDatabase,
  password: keys.pgPassword,
  port: keys.pgPort
});


module.exports = client;