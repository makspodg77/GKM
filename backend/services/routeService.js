const { NotFoundError, ValidationError } = require("../utils/errorHandler");
const { executeQuery } = require("../utils/sqlHelper");
const { getLine, removeDuplicates } = require("./lineService");
const {
  getStopsForRoute,
  getAdditionalStops,
  getDepartureRoutesByFullRouteIds,
  getLineDataByRouteId,
} = require("./timetableService");
const { addMinutesToTime } = require("../utils/timeUtils");
const { processRouteStops } = require("../utils/routeUtils");

let lineRoutesCache = {};
let lineRoutesCacheTime = {};
const CACHE_TIMEOUT_MS = 300000;

/**
 * Gets all departure routes
 * @returns {Promise<Array>} Departure route data
 */
const getDepartureRoutes = async () => {
  return executeQuery(`SELECT * FROM departure_route`);
};

/**
 * Gets departure routes by full route ID
 * @param {Array<Number>} fullRouteIds - Full route IDs
 * @returns {Promise<Array>} Departure routes
 */
const getStopsForRoutes = async (fullRouteIds) => {
  if (!fullRouteIds.length) return [];

  const distinctIds = [...new Set(fullRouteIds)];

  const params = distinctIds.reduce(
    (acc, id, i) => ({ ...acc, [`id${i}`]: id }),
    {}
  );
  const placeholders = distinctIds.map((_, i) => `@id${i}`).join(",");

  const results = await executeQuery(
    `SELECT * FROM full_route WHERE route_id IN (${placeholders})`,
    params
  );

  const resultsByRouteId = {};
  results.forEach((result) => {
    if (!resultsByRouteId[result.route_id]) {
      resultsByRouteId[result.route_id] = [];
    }
    resultsByRouteId[result.route_id].push(result);
  });

  return fullRouteIds.flatMap((id) =>
    resultsByRouteId[id] ? [...resultsByRouteId[id]] : []
  );
};

/**
 * Gets all routes for a specific line
 * @param {number} line_id - ID of the line
 * @param {boolean} [useCache=true] - Whether to use cached results
 * @returns {Promise<Array>} Route data organized by route
 */
const getLineRoutes = async (line_id, useCache = true) => {
  if (!line_id || isNaN(parseInt(line_id))) {
    throw new ValidationError("Line ID parameter is required");
  }

  if (
    useCache &&
    lineRoutesCache[line_id] &&
    Date.now() - lineRoutesCacheTime[line_id] < CACHE_TIMEOUT_MS
  ) {
    return lineRoutesCache[line_id];
  }

  const lineExists = await executeQuery(
    `SELECT 1 FROM line WHERE id = @line_id`,
    { line_id }
  );

  if (!lineExists.length) {
    throw new NotFoundError(`Line with ID = ${line_id} does not exist`);
  }

  const query = `
    SELECT 
      sg.name, 
      fr.travel_time, 
      fr.is_on_request, 
      r.is_circular, 
      fr.is_optional, 
      s.map,
      fr.is_first, 
      fr.is_last, 
      sg.id AS group_id, 
      r.id AS route_id, 
      fr.stop_number,
      s.street,
      s.id AS stop_id
    FROM route r 
    JOIN full_route fr ON fr.route_id = r.id
    JOIN stop s ON s.id = fr.stop_id
    JOIN stop_group sg ON sg.id = s.stop_group_id
    WHERE r.line_id = @line_id`;

  const results = await executeQuery(query, { line_id });

  if (!results.length) {
    throw new NotFoundError(`No routes found for line with ID = ${line_id}`);
  }
  const basicData = await getLine(line_id);

  const routeGroups = results.reduce((acc, result) => {
    const { route_id } = result;
    if (!acc[route_id]) {
      acc[route_id] = [];
    }
    acc[route_id].push({
      ...result,
      stop_number: Number(result.stop_number),
    });
    return acc;
  }, {});

  const sortedRoutes = Object.keys(routeGroups).map((routeId) =>
    routeGroups[routeId].sort((a, b) => a.stop_number - b.stop_number)
  );
  const departureRoutes = await getDepartureRoutesByFullRouteIds(
    Object.keys(routeGroups)
  );

  const departurePromises = departureRoutes.map(async (route) => {
    const line = (await getLineDataByRouteId(route.route_id))[0];
    const allStops = (await getStopsForRoute(route.route_id))
      .map((result) => ({ ...result, stop_number: Number(result.stop_number) }))
      .sort((a, b) => a.stop_number - b.stop_number);

    const additionalStops = await getAdditionalStops(route.id);

    const processedStops = processRouteStops(allStops, additionalStops);

    return { line, stops: processedStops };
  });
  const departureResults = await Promise.all(departurePromises);
  console.log(departureResults);
  const enrichedRoutes = sortedRoutes.map((route) => {
    // Set to track unique routes
    const processedRoutes = new Set();
    const getRouteKey = (first, last) => {
      return [first, last].sort().join("-");
    };

    // Filter and map departures
    const uniqueLinePaths = departureResults
      .filter((result) => {
        if (!result.stops || result.stops.length < 2) return false;

        const firstStop = result.stops[0].name;
        const lastStop = result.stops[result.stops.length - 1].name;
        const routeKey = getRouteKey(firstStop, lastStop);

        // Filter duplicates
        if (processedRoutes.has(routeKey)) {
          return false;
        }

        processedRoutes.add(routeKey);
        return true;
      })
      .map((result) => ({
        first_stop: result.stops[0].name,
        last_stop: result.stops[result.stops.length - 1].name,
        streets: removeDuplicates(result.stops),
      }));

    return {
      route_id: route[0].route_id,
      is_circular: route[0].is_circular,
      line: basicData,
      linePath: uniqueLinePaths,
      stops: route,
    };
  });

  lineRoutesCache[line_id] = enrichedRoutes;
  lineRoutesCacheTime[line_id] = Date.now();

  return enrichedRoutes;
};

/**
 * Gets route IDs that contain a specific stop
 * @param {number} stopId - ID of the stop
 * @returns {Promise<Array>} List of full route IDs
 */
const getFullRoutesByStopId = async (stopId) => {
  return executeQuery(
    `SELECT route_id FROM full_route WHERE stop_id = @stopId`,
    { stopId }
  ).then((results) => results.map((r) => r.route_id));
};

/**
 * Gets additional stops for multiple routes
 * @param {Array<number>} routeIds - Array of route IDs
 * @returns {Promise<Array>} Additional stops
 */
const getAdditionalStopsForRoutes = async (routeIds) => {
  if (!routeIds.length) return [];

  const params = routeIds.reduce(
    (acc, id, i) => ({ ...acc, [`id${i}`]: id }),
    {}
  );
  const placeholders = routeIds.map((_, i) => `@id${i}`).join(",");

  return executeQuery(
    `SELECT route_id, stop_number FROM additional_stop 
       WHERE route_id IN (${placeholders})`,
    params
  );
};

/**
 * Gets one whole route with all the data
 * @param {number} departureId ID of the departure
 * @returns {object} Whole route
 */
const getRoute = async (departure_id, line_id) => {
  if (!departure_id || isNaN(parseInt(departure_id))) {
    throw new ValidationError(
      "departure ID parameter is required and must be a number"
    );
  }

  const departureExists = await executeQuery(
    `SELECT * FROM timetable WHERE id = @departure_id`,
    { departure_id }
  );

  if (!departureExists.length) {
    throw new NotFoundError(
      `Departure with ID = ${departure_id} does not exist`
    );
  }

  const departureRoute = (
    await executeQuery(
      `SELECT t.id AS timetable_id, dr.route_id AS full_route_id, dr.id AS departure_id, dr.signature, dr.color, t.departure_time FROM departure_route dr JOIN timetable t ON t.route_id = dr.id WHERE t.id = @departure_id`,
      { departure_id }
    )
  )[0];

  const basicData = await getLine(line_id);

  const stops = await getStopsForRoute(departureRoute.full_route_id);

  const additionalStops = await getAdditionalStops(departureRoute.departure_id);

  const processedStops = processRouteStops(stops, additionalStops);

  return {
    departureInfo: departureExists[0],
    routeInfo: departureRoute,
    lineInfo: basicData,
    stops: calculateDepartureTimes(
      processedStops,
      departureRoute.departure_time
    ),
  };
};

/**
 * Calculates departure times for each stop in a route
 * @param {Array} stops - Processed stops
 * @param {string|Date} initialDeparture - Initial departure time
 * @param {Object} departureData - Additional departure data
 * @returns {Array} Stops with calculated departure times
 */
const calculateDepartureTimes = (
  stops,
  initialDeparture,
  departureData = {}
) => {
  let departureTime = initialDeparture;
  let previousTravelTime = 0;

  return stops.map((stop, index) => {
    previousTravelTime = stop.travel_time;
    departureTime = addMinutesToTime(departureTime, previousTravelTime);

    return {
      ...stop,
      departure_time: departureTime,
      timetable_id: departureData?.timetable_id ?? stop?.timetable_id ?? null,
      route_id: departureData?.route_id ?? stop?.route_id ?? null,
    };
  });
};

/**
 * Clears the route cache for a specific line or all lines
 * @param {number} [lineId] - Optional specific line ID to clear cache for
 * @returns {Object} Status of the operation
 */
const clearRouteCache = (lineId = null) => {
  if (lineId) {
    delete lineRoutesCache[lineId];
    delete lineRoutesCacheTime[lineId];
    return {
      success: true,
      message: `Cache cleared for line ID ${lineId}`,
    };
  }

  lineRoutesCache = {};
  lineRoutesCacheTime = {};
  return { success: true, message: "All route cache cleared" };
};

module.exports = {
  getDepartureRoutes,
  getStopsForRoutes,
  getFullRoutesByStopId,
  getAdditionalStopsForRoutes,
  processRouteStops,
  getLineRoutes,
  getRoute,
  calculateDepartureTimes,
  clearRouteCache,
};
