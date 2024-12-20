const express = require("express");
const sql = require("mssql");
const config = require("../utils/config");
const router = express.Router();

const executeQuery = async (query) => {
  try {
    await sql.connect(config);
    const result = await sql.query(query);
    return result.recordset;
  } catch (err) {
    console.error("Query error:", err);
    throw err;
  } finally {
    await sql.close();
  }
};

router.get("/", async (req, res) => {
  const query = `
    SELECT stop_name, MIN(id) as id
    FROM transport_stops
    GROUP BY stop_name;
  `;

  try {
    const results = await executeQuery(query);
    const groupedResults = results.reduce((acc, result) => {
      const { id, stop_name } = result;
      if (!acc[stop_name[0]]) {
        acc[stop_name[0]] = [];
      }
      acc[stop_name[0]].push({ stop_name, id });
      return acc;
    }, {});
    res.json(groupedResults);
  } catch (err) {
    console.error("Error running query:", err);
    res.status(500).send("Error running query.");
  }
});

module.exports = router;
