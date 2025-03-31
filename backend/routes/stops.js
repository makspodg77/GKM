const express = require("express");
const router = express.Router();
const { executeQuery } = require("../utils/sqlHelper");
const {
  asyncHandler,
  NotFoundError,
  ValidationError,
} = require("../utils/errorHandler");

/**
 * @swagger
 * /api/stops:
 *   get:
 *     tags: [Transport Stops]
 *     summary: Get all transport stops
 *     description: Returns all transport stops grouped alphabetically by first letter
 *     responses:
 *       200:
 *         description: Successfully retrieved stops
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               additionalProperties:
 *                 type: array
 *                 items:
 *                   type: object
 *                   properties:
 *                     name:
 *                       type: string
 *                     id:
 *                       type: integer
 *       500:
 *         description: Server error
 */
router.get(
  "/",
  asyncHandler(async (req, res) => {
    const query = `
    SELECT MIN(id) as id, name
    FROM stop_group
    GROUP BY name;
  `;

    const results = await executeQuery(query);
    const groupedResults = results.reduce((acc, result) => {
      const { id, name } = result;
      if (!acc[name[0]]) {
        acc[name[0]] = [];
      }
      acc[name[0]].push({ name, id });
      return acc;
    }, {});
    res.json(groupedResults);
  })
);

/**
 * @swagger
 * /api/stops/stop-groups/{id}:
 *   get:
 *     tags: [Transport Stops]
 *     summary: Get all stops in a group
 *     description: Returns all stops in a group with the departures are happening in the nearest 24 hours
 *     parameters:
 *       - in: path
 *         name: id
 *         schema:
 *           type: integer
 *         required: true
 *         description: ID of the stop group
 *     responses:
 *       200:
 *         description: Successfully retrieved stops
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               additionalProperties:
 *                 type: array
 *                 items:
 *                   type: object
 *                   properties:
 *                     name:
 *                       type: string
 *                     id:
 *                       type: integer
 *       500:
 *         description: Server error
 */
router.get(
  "/stop-groups/:id",
  asyncHandler(async (req, res) => {
    const { id } = req.params;

    if (!id || isNaN(parseInt(id))) {
      throw new ValidationError("ID parameter is required");
    }

    const query = `
      SELECT 
        sg.name, 
        s.map, 
        s.street,
        sg.id AS group_id, 
        s.id AS stop_id 
      FROM 
        stop_group sg 
      JOIN 
        stop s ON s.stop_group_id = sg.id 
      WHERE 
        sg.id = @id
    `;

    const result = await executeQuery(query, { id });

    if (!result || result.length === 0) {
      throw new NotFoundError(`No stops found for group with id ${id}`);
    }

    res.json(result);
  })
);

module.exports = router;
