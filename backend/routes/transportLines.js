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

// /api/transportLines
// Returns the lines grouped by their type
router.get("/", async (req, res) => {
  const query = `
    SELECT lt.line_type_name, tl.line_name, ts.stop_name
    FROM transport_lines tl
    JOIN line_types lt ON tl.line_type_id = lt.id
    JOIN routes r ON tl.id = r.line_id
    JOIN transport_stops ts ON r.stop_id = ts.id
    WHERE ts.stop_direction = 0
  `;

  try {
    const results = await executeQuery(query);
    const groupedResults = results.reduce((acc, result) => {
      const { line_type_name, line_name, stop_name } = result;
      if (!acc[line_type_name]) {
        acc[line_type_name] = {};
      }
      if (!acc[line_type_name][line_name]) {
        acc[line_type_name][line_name] = [];
      }
      acc[line_type_name][line_name].push(stop_name);
      return acc;
    }, {});
    res.json(groupedResults);
  } catch (err) {
    console.error("Error running query:", err);
    res.status(500).send("Error running query.");
  }
});

// /api/transportLines/transportStop
// Returns the lines that stop at a specific stop
// The stop is identified by its stop id
// The line is identified by its line id
router.get("/transportStop", async (req, res) => {
  const { stopId, lineId } = req.query;
  const query = `
    SELECT DISTINCT tl.line_name, lt.line_type_color, r.line_id
    FROM transport_lines tl
    JOIN line_types lt ON tl.line_type_id = lt.id
    JOIN routes r ON tl.id = r.line_id
    WHERE r.stop_id = ${stopId}
    AND r.line_id != ${lineId}
  `;

  try {
    const results = await executeQuery(query);
    res.json(results);
  } catch (err) {
    console.error("Error running query:", err);
    res.status(500).send("Error running query.");
  }
});

module.exports = router;
