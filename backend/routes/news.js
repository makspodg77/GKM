const express = require("express");
const sql = require("msnodesqlv8");
const config = require("../utils/config");
const router = express.Router();
router.get("/", (req, res) => {
  const query = `
    SELECT * FROM news`;

  sql.query(config.CONNECTION_STRING, query, (err, results) => {
    res.json(results);
  });
});

module.exports = router;
