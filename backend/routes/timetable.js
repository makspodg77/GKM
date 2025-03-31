const express = require("express");
const router = express.Router();
const { asyncHandler } = require("../utils/errorHandler");
const {
  processRouteStops,
  calculateDepartureTimes,
} = require("../utils/routeUtils");
const {
  getTimetableById,
  getDepartureRouteById,
  getStopsForRoute,
  getAdditionalStops,
  getDeparturesForStop,
  getTimetableDataForRoutes,
  getStopGroupWithDepartures,
  getAdditionalStopsForRoutes,
  getDepartureRoutesByFullRouteId,
} = require("../services/timetableService");
const {
  executeQuery,
  beginTransaction,
  commitTransaction,
  rollbackTransaction,
} = require("../utils/sqlHelper");
const { NotFoundError, ValidationError } = require("../utils/errorHandler");

/**
 * @swagger
 * /api/timetable/route/{id}:
 *   get:
 *     tags: [Timetable]
 *     summary: Get departures for all stops in a route
 *     description: Return all the stops and departure times for a specific route
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: integer
 *         description: ID of the departure to show route to
 *     responses:
 *       200:
 *         description: Successfully retrieved route
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
 *       404:
 *         description: Departure not found
 */
router.get(
  "/route/:id",
  asyncHandler(async (req, res) => {
    const { id } = req.params;
    try {
      const timetableData = await getTimetableById(id);
      if (!timetableData) {
        throw new NotFoundError("Timetable entry not found");
      }

      const departureRouteData = await getDepartureRouteById(
        timetableData.route_id
      );
      if (!departureRouteData) {
        throw new NotFoundError("Departure route not found");
      }

      const results = await getStopsForRoute(departureRouteData.route_id);
      const additionalStops = await getAdditionalStops(departureRouteData.id);

      const processedStops = processRouteStops(results, additionalStops);
      const stopsWithDepartureTimes = calculateDepartureTimes(
        processedStops,
        timetableData.departure_time
      );

      res.json(stopsWithDepartureTimes);
    } catch (error) {
      throw error;
    }
  })
);

/**
 * @swagger
 * /api/timetable/departure-times/{full_route_id}/{stop_number}:
 *   get:
 *     tags: [Timetable]
 *     summary: Get departures for a specific stop and specific route
 *     description: Returns all departure times for a specific stop and a specific full route
 *     parameters:
 *       - in: path
 *         name: full_route_id
 *         required: true
 *         schema:
 *           type: integer
 *         description: ID of the full route
 *       - in: path
 *         name: stop_number
 *         required: true
 *         schema:
 *           type: integer
 *         description: number of the stop which departure times are to be shown
 *     responses:
 *       200:
 *         description: Successfully retrieved departure times
 *         content:
 *           application/json:
 *             schema:
 *               type: array
 *               items:
 *                 type: object
 *                 properties:
 *                   stop_id:
 *                     type: integer
 *                     description: ID of the stop
 *                   stop_group_id:
 *                     type: integer
 *                     description: ID of the stop group
 *                   name:
 *                     type: string
 *                     description: Name of the stop
 *                   stop_number:
 *                     type: integer
 *                     description: Position of this stop in the route
 *                   stop_type:
 *                     type: integer
 *                     description: Type of the stop
 *                   is_on_request:
 *                     type: boolean
 *                     description: Indicates if the stop is on request
 *                   is_optional:
 *                     type: boolean
 *                     description: Indicates if the stop is optional
 *                   is_first:
 *                     type: boolean
 *                     description: Indicates if this is the first stop
 *                   is_last:
 *                     type: boolean
 *                     description: Indicates if this is the last stop
 *                   travel_time:
 *                     type: integer
 *                     description: Travel time to this stop from previous stop
 *                   departure_time:
 *                     type: string
 *                     description: Time of departure from this stop
 *                     example: "14:35"
 *                   color:
 *                     type: string
 *                     description: Color code for this route
 *                     example: "#FF5733"
 *                   signature:
 *                     type: string
 *                     description: Signature/identifier of the route
 *                     example: "A"
 *       404:
 *         description: Departure not found
 *       500:
 *         description: Server error
 */
router.get(
  "/departure-times/:full_route_id/:stop_number",
  asyncHandler(async (req, res) => {
    const { stop_number, full_route_id } = req.params;

    const departureRoutes = await getDepartureRoutesByFullRouteId(
      full_route_id
    );

    if (!departureRoutes.length) {
      return res.status(404).json({
        message: `No departure routes found for route ${full_route_id}`,
      });
    }

    const allStops = (await getStopsForRoute(full_route_id))
      .map((result) => ({ ...result, stop_number: Number(result.stop_number) }))
      .sort((a, b) => a.stop_number - b.stop_number);

    const routeIds = departureRoutes.map((route) => route.id);
    const allAdditionalStops = await getAdditionalStopsForRoutes(routeIds);
    const allTimetableData = await getTimetableDataForRoutes(routeIds);

    const departuresFlat = [];

    for (const route of departureRoutes) {
      const { color, signature } = route;

      const additionalStops = allAdditionalStops.filter(
        (stop) => stop.route_id === route.id
      );

      const processedStops = processRouteStops(allStops, additionalStops);

      const routeTimetable = allTimetableData.filter(
        (entry) => entry.route_id === route.id
      );

      for (const departure of routeTimetable) {
        const relevantStops = calculateDepartureTimes(
          processedStops,
          departure.departure_time
        )
          .filter((item) => Number(item.stop_number) === Number(stop_number))
          .map((stop) => ({
            ...stop,
            color,
            signature,
          }));

        departuresFlat.push(...relevantStops);
      }
    }

    departuresFlat.sort((a, b) => {
      return a.departure_time.localeCompare(b.departure_time);
    });

    res.json(departuresFlat);
  })
);

// /api/timetable/timetable?stopId=1
// Returns the timetable for a specific stop
// The stop is identified by its stop id
/**
 * @swagger
 * /api/timetable/{stop_id}:
 *   get:
 *     tags: [Timetable]
 *     summary: Get departures for a specific stop
 *     description: Returns all the departures in a day for a stop
 *     parameters:
 *       - in: path
 *         name: stop_id
 *         required: true
 *         schema:
 *           type: integer
 *         description: ID of the stop to show departures for
 *     responses:
 *       200:
 *         description: Successfully retrieved departures
 *       404:
 *         description: Stop not found
 *       500:
 *         description: Server error
 */
router.get(
  "/:stop_id",
  asyncHandler(async (req, res) => {
    const { stop_id } = req.params;
    const result = await getDeparturesForStop(stop_id);
    res.json(result);
  })
);
/**
 * @swagger
 * /api/timetable/stop-group/{groupId}:
 *   get:
 *     tags: [Timetable]
 *     summary: Get all stops and their departures in a group
 *     description: Returns all the stops and their departures within a stop group
 *     parameters:
 *       - in: path
 *         name: groupId
 *         required: true
 *         schema:
 *           type: integer
 *         description: ID of the group to show stop departures for
 *     responses:
 *       200:
 *         description: Successfully retrieved stops
 *       404:
 *         description: Stop not found
 *       500:
 *         description: Server error
 */
router.get(
  "/stop-group/:groupId",
  asyncHandler(async (req, res) => {
    const { groupId } = req.params;
    const result = await getStopGroupWithDepartures(groupId);
    res.json(result);
  })
);

module.exports = router;
