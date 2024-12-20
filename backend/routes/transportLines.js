const express = require("express");
const { Connection, Request } = require("tedious");
const config = require("../utils/config");
const router = express.Router();

const executeQuery = (query, callback) => {
  const connection = new Connection(config);

  connection.on("connect", (err) => {
    if (err) {
      console.error("Connection error:", err);
      callback(err, null);
      return;
    }

    const request = new Request(query, (err, rowCount, rows) => {
      if (err) {
        console.error("Query error:", err);
        callback(err, null);
        return;
      }

      const results = rows.map((row) => {
        const result = {};
        row.forEach((column) => {
          result[column.metadata.colName] = column.value;
        });
        return result;
      });

      callback(null, results);
    });

    connection.execSql(request);
  });

  connection.connect();
};

// /api/transportLines
// Returns the lines grouped by their type
router.get("/", (req, res) => {
  const query = `
    SELECT lt.line_type_name, tl.line_name, ts.stop_name
    FROM transport_lines tl
    JOIN line_types lt ON tl.line_type_id = lt.id
    JOIN routes r ON tl.id = r.line_id
    JOIN transport_stops ts ON r.stop_id = ts.id
    WHERE ts.stop_direction = 0
  `;

  executeQuery(query, (err, results) => {
    if (err) {
      console.error("Error running query:", err);
      return res.status(500).send("Error running query.");
    }

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
  });
});

// /api/transportLines/transportStop
// Returns the lines that stop at a specific stop
// The stop is identified by its stop id
// The line is identified by its line id
router.get("/transportStop", (req, res) => {
  const { stopId, lineId } = req.query;
  const query = `
    SELECT DISTINCT tl.line_name, lt.line_type_color, r.line_id
    FROM transport_lines tl
    JOIN line_types lt ON tl.line_type_id = lt.id
    JOIN routes r ON tl.id = r.line_id
    WHERE r.stop_id = ${stopId}
    AND r.line_id != ${lineId}
  `;

  executeQuery(query, (err, results) => {
    if (err) {
      console.error("Error running query:", err);
      return res.status(500).send("Error running query.");
    }

    res.json(results);
  });
});

module.exports = router;
