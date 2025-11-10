const express = require("express");
const router = express.Router();

const {
  getTimetableById,
  getStopsForRoute,
  getAdditionalStops,
  getTimetableDataForRoutes,
  getDepartureRoutesByFullRouteIds,
  formatDeparturesByHour,
  extractUniqueSignatures,
  generateSignatureExplanation,
} = require("../services/timetableService");

const {
  getDepartureRouteById,
  getDeparturesForStop,
} = require("../services/departureService");

const { calculateDepartureTimes } = require("../services/routeService");

const { getLine, getOtherLinesAtStop } = require("../services/lineService");
const { executeQuery } = require("../utils/sqlHelper");
const { processRouteStops } = require("../utils/routeUtils");
const { asyncHandler, NotFoundError } = require("../utils/errorHandler");
const { getStopGroupWithDepartures } = require("../services/stopService");

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
 *         description: ID of the departure to show route for
 *     responses:
 *       200:
 *         description: Successfully retrieved route
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
 *                   signatureExplanation:
 *                     type: string
 *                     description: Explanation of the route signature
 *                     example: "Kurs od przystanku 'X' do przystanku 'Y' przez 'Z'"
 *       404:
 *         description: Departure not found
 *       500:
 *         description: Server error
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
 *                   signatureExplanation:
 *                     type: string
 *                     description: Explanation of the route signature
 *                     example: "Kurs od przystanku 'X' do przystanku 'Y' przez 'Z'"
 *       404:
 *         description: Departure not found
 *       500:
 *         description: Server error
 */
router.get(
  "/departure-times/:full_route_id/:stop_number",
  asyncHandler(async (req, res) => {
    const { stop_number, full_route_id } = req.params;

    const departureRoutes = await getDepartureRoutesByFullRouteIds([
      full_route_id,
    ]);
    if (!departureRoutes || departureRoutes.length === 0) {
      throw new NotFoundError(
        `No departure routes found for route ${full_route_id}`
      );
    }

    const is_night = await executeQuery(
      `SELECT is_night FROM route WHERE id = ${full_route_id}`
    );

    const allStops = (await getStopsForRoute(full_route_id))
      .map((result) => ({ ...result, stop_number: Number(result.stop_number) }))
      .sort((a, b) => a.stop_number - b.stop_number);

    const routeIds = departureRoutes.map((route) => route.id);
    const allTimetableData = await getTimetableDataForRoutes(routeIds);
    const route = await executeQuery(
      `SELECT * FROM route WHERE id = @full_route_id`,
      { full_route_id }
    );
    if (!route || route.length === 0) {
      throw new NotFoundError(`Route with ID ${full_route_id} not found`);
    }

    const departuresFlat = [];
    const uniqueDepartures = new Set();

    for (const route of departureRoutes) {
      const { color, signature } = route;
      const additionalStops = await getAdditionalStops(route.id);

      let signatureExplanation = null;
      if (signature && additionalStops.length > 0) {
        signatureExplanation = generateSignatureExplanation(
          additionalStops,
          allStops
        );
      }

      const processedStops = processRouteStops(allStops, additionalStops);
      const routeTimetable = allTimetableData.filter(
        (entry) => entry.route_id === route.id
      );

      for (const departure of routeTimetable) {
        const calculatedStops = calculateDepartureTimes(
          processedStops,
          departure.departure_time,
          { timetable_id: departure.id, route_id: departure.route_id }
        );

        const relevantStop = calculatedStops
          .filter((item) => Number(item.stop_number) === Number(stop_number))
          .filter((item, idx, arr) => {
            if (!item.is_first) return true;

            const sameSignaturePrior = arr
              .slice(0, idx)
              .some((s) => s.is_first && s.signature === signature);
            return !sameSignaturePrior;
          })
          .map((stop) => ({
            ...stop,
            color,
            signature,
            signatureExplanation,
            departure_id: departure.id,
          }))[0];

        if (relevantStop) {
          const departureKey = `${relevantStop.departure_time}_${signature}`;

          if (!uniqueDepartures.has(departureKey)) {
            uniqueDepartures.add(departureKey);
            departuresFlat.push(relevantStop);
          }
        }
      }
    }

    departuresFlat.sort((a, b) => {
      return a.departure_time.localeCompare(b.departure_time);
    });

    const stop = allStops.find(
      (stop) => Number(stop.stop_number) === Number(stop_number)
    );

    const other_lines = await getOtherLinesAtStop(
      stop.stop_id,
      route[0].line_id
    );

    res.json({
      line: await getLine(route[0].line_id),
      is_night: is_night[0].is_night,
      departures: formatDeparturesByHour(departuresFlat),
      signatures: extractUniqueSignatures(departuresFlat),
      stops: allStops,
      stop,
      other_lines,
      last_stops: Array.from(
        new Set(
          allStops
            .filter((stop) => stop.is_last)
            .map((stop) => stop.alias || stop.name)
        )
      ),
    });
  })
);

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

    res.json(await getDeparturesForStop(stop_id));
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

    res.json(await getStopGroupWithDepartures(groupId));
  })
);

module.exports = router;
