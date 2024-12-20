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

router.get("/", (req, res) => {
  const query = `
    SELECT stop_name, MIN(id) as id
    FROM transport_stops
    GROUP BY stop_name;
  `;

  executeQuery(query, (err, results) => {
    if (err) {
      console.error("Error running query:", err);
      return res.status(500).send("Error running query.");
    }

    const groupedResults = results.reduce((acc, result) => {
      const { id, stop_name } = result;
      if (!acc[stop_name[0]]) {
        acc[stop_name[0]] = [];
      }
      acc[stop_name[0]].push({ stop_name, id });
      return acc;
    }, {});
    res.json(groupedResults);
  });
});

module.exports = router;
