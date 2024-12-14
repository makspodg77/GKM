const express = require("express");
const sql = require("msnodesqlv8");
const config = require("../utils/config");
const router = express.Router();

router.get("/", (req, res) => {
  const query = `
          SELECT stop_name, MIN(id) as id
            FROM transport_stops
            GROUP BY stop_name;
      `;

  sql.query(config.CONNECTION_STRING, query, (err, results) => {
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
