const sql = require("mssql");
const config = require("./config");
const { DatabaseError } = require("./errorHandler");

let globalPool = null;

const getPool = async () => {
  if (!globalPool) {
    globalPool = await sql.connect(config.database);
  }
  return globalPool;
};

const executeQuery = async (query, params = {}, transaction = null) => {
  try {
    const pool = await getPool();
    const request = transaction ? transaction.request() : pool.request();

    Object.entries(params).forEach(([key, value]) => {
      request.input(key, value);
    });

    const result = await request.query(query);
    return result.recordset;
  } catch (err) {
    console.error("Query error:", err);
    throw new DatabaseError(`Database query failed: ${err.message}`);
  }
};

const beginTransaction = async () => {
  const pool = await getPool();
  const transaction = new sql.Transaction(pool);
  await transaction.begin();
  return transaction;
};

const commitTransaction = async (transaction) => {
  await transaction.commit();
};

const rollbackTransaction = async (transaction) => {
  await transaction.rollback();
};

const closePool = async () => {
  if (globalPool) {
    try {
      await globalPool.close();
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
