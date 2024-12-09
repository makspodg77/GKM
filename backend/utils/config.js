require('dotenv').config();

const connectionString = process.env.CONNECTION_STRING;

module.exports = {
    CONNECTION_STRING: connectionString
}