const express = require("express");
const { executeQuery } = require("../utils/sqlHelper");
const { asyncHandler } = require("../utils/errorHandler");
const router = express.Router();

/**
 * @swagger
 * /news:
 *   get:
 *     summary: Get all news articles
 *     tags: [News]
 *     description: Retrieve a list of all news articles ordered by creation date (newest first)
 *     responses:
 *       200:
 *         description: A list of news articles
 *         content:
 *           application/json:
 *             schema:
 *               type: array
 *               items:
 *                 type: object
 *                 properties:
 *                   id:
 *                     type: integer
 *                     description: The news article ID
 *                   title:
 *                     type: string
 *                     description: The news article title
 *                   content:
 *                     type: string
 *                     description: The news article content (HTML)
 *                   created_at:
 *                     type: string
 *                     format: date-time
 *                     description: The timestamp when the article was created
 */
router.get(
  "/",
  asyncHandler(async (req, res) => {
    const query =
      "SELECT id, title, content, created_at FROM news ORDER BY created_at DESC";
    const result = await executeQuery(query);
    res.json(result);
  })
);

/**
 * @swagger
 * /news/{id}:
 *   get:
 *     summary: Get a specific news article by ID
 *     tags: [News]
 *     description: Retrieve a single news article by its ID
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: integer
 *         description: The news article ID
 *     responses:
 *       200:
 *         description: A news article
 *       404:
 *         description: Article not found
 */
router.get(
  "/:id",
  asyncHandler(async (req, res) => {
    const { id } = req.params;

    if (!id || isNaN(parseInt(id))) {
      return res.status(400).json({ message: "Invalid article ID" });
    }

    const query =
      "SELECT id, title, content, created_at FROM news WHERE id = @id";
    const result = await executeQuery(query, { id: parseInt(id) });

    if (result.length === 0) {
      return res.status(404).json({ message: "Article not found" });
    }

    res.json(result[0]);
  })
);

module.exports = router;
