const express = require("express");
const router = express.Router();
const sql = require("mssql");
const config = require("../utils/config");

router.get("/", async (req, res) => {
  try {
    await sql.connect(config);

    const query = "SELECT * FROM news ORDER BY created_at DESC";

    const result = await sql.query(query);

    res.json(result.recordset);
  } catch (err) {
    console.error("Database query error:", err);
    res.status(500).send("Internal Server Error");
  } finally {
    await sql.close();
  }
});

module.exports = router;
