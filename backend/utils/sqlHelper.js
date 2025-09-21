const { Pool } = require("pg");
const config = require("./config");
const { DatabaseError } = require("./errorHandler");

let globalPool = null;

const getPool = () => {
  if (!globalPool) {
    globalPool = new Pool(config.database);
  }
  return globalPool;
};

const executeQuery = async (query, params = {}, transaction = null) => {
  try {
    const pool = getPool();
    const client = transaction || pool;

    const paramKeys = Object.keys(params);
    let sqlQuery = query;
    const values = [];

    paramKeys.forEach((key, index) => {
      const placeholder = `$${index + 1}`;
      sqlQuery = sqlQuery.replace(new RegExp(`@${key}\\b`, "g"), placeholder);
      values.push(params[key]);
    });

    const result = await client.query(sqlQuery, values);
    return result.rows;
  } catch (err) {
    console.error("Query error:", err);
    throw new DatabaseError(`Database query failed: ${err.message}`);
  }
};

const beginTransaction = async () => {
  const pool = getPool();
  const client = await pool.connect();
  await client.query("BEGIN");
  return client;
};

const commitTransaction = async (transaction) => {
  await transaction.query("COMMIT");
  transaction.release();
};

const rollbackTransaction = async (transaction) => {
  await transaction.query("ROLLBACK");
  transaction.release();
};

const closePool = async () => {
  if (globalPool) {
    try {
      await globalPool.end();
      globalPool = null;
    } catch (err) {
      console.error("Error closing pool:", err);
      throw err;
    }
  }
};

module.exports = {
  executeQuery,
  beginTransaction,
  commitTransaction,
  rollbackTransaction,
  closePool,
  getPool,
};
