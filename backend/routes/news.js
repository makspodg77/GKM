const express = require("express");
const router = express.Router();
const sql = require("mssql");
const config = require("../config"); // Ensure you have the config file set up as shown previously

router.get("/", async (req, res) => {
  try {
    // Connect to the database
    await sql.connect(config);

    // Query to fetch news
    const query = "SELECT * FROM news";

    // Execute the query
    const result = await sql.query(query);

    // Send the results as JSON
    res.json(result.recordset);
  } catch (err) {
    console.error("Database query error:", err);
    res.status(500).send("Internal Server Error");
  } finally {
    // Close the database connection
    await sql.close();
  }
});

module.exports = router;
