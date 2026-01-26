const express = require("express");
const router = express.Router();
const { executeQuery } = require("../utils/sqlHelper");
const { asyncHandler } = require("../utils/errorHandler");
const { getStopGroupWithDepartures } = require("../services/stopService");

/**
 * @swagger
 * /api/stops:
 *   get:
 *     tags: [Stops]
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
 *                       description: Stop name
 *                     id:
 *                       type: integer
 *                       description: Stop group ID
 *       500:
 *         description: Server error
 */
router.get(
  "/",
  asyncHandler(async (req, res) => {
    res.set("Cache-Control", "public, max-age=3600");

    const query = `
    SELECT DISTINCT
      stop_group.id AS id,
      stop_group.name AS name,
      stop.alias AS alias
    FROM stop_group
    LEFT JOIN stop ON stop.stop_group_id = stop_group.id
    ORDER BY stop_group.name, stop.alias;
    `;

    const results = await executeQuery(query);
    const seenEntries = new Set();
    const groupedResults = results.reduce((acc, result) => {
      const { id, name, alias } = result;
      const baseKey = `${id}|`;

      const addEntry = (label) => {
        const trimmed = label ? label.trim() : "";
        if (!trimmed) return;
        const firstChar = trimmed[0]?.toUpperCase();
        if (!firstChar) return;

        const uniqueKey = `${baseKey}${trimmed.toLowerCase()}`;
        if (seenEntries.has(uniqueKey)) return;
        seenEntries.add(uniqueKey);

        if (!acc[firstChar]) {
          acc[firstChar] = [];
        }
        acc[firstChar].push({ name: trimmed, id });
      };

      addEntry(name);
      addEntry(alias);

      return acc;
    }, {});

    Object.keys(groupedResults).forEach((key) => {
      groupedResults[key].sort((a, b) => a.name.localeCompare(b.name));
    });

    res.json(groupedResults);
  }),
);

/**
 * @swagger
 * /api/stops/stop-groups/{id}:
 *   get:
 *     tags: [Stops]
 *     summary: Get all stops in a group
 *     description: Returns all stops in a group with their location information
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
 *               type: array
 *               items:
 *                 type: object
 *                 properties:
 *                   name:
 *                     type: string
 *                     description: Name of the stop group
 *                   map:
 *                     type: string
 *                     description: Map reference for the stop
 *                   street:
 *                     type: string
 *                     description: Street name where the stop is located
 *                   group_id:
 *                     type: integer
 *                     description: ID of the stop group
 *                   stop_id:
 *                     type: integer
 *                     description: ID of the specific stop
 *       404:
 *         description: Stop group not found
 *       400:
 *         description: Invalid ID parameter
 *       500:
 *         description: Server error
 */
router.get(
  "/stop-groups/:id",
  asyncHandler(async (req, res) => {
    const { id } = req.params;

    res.json(await getStopGroupWithDepartures(id));
  }),
);

router.get(
  "/stops-ids",
  asyncHandler(async (req, res) => {
    const result = await executeQuery("select id from stop");
    console.log(result);
    res.json(result.map((r) => Number(r.id)));
  }),
);
module.exports = router;
