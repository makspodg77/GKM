const { executeQuery } = require("../utils/sqlHelper");
const { NotFoundError } = require("../utils/errorHandler"); // Added this import
const {
  getFullRoutesByStopId,
  processRouteStops,
  calculateDepartureTimes,
  getAdditionalStopsForRoutes,
} = require("./routeService");
const {
  getTimetableDataForRoutes,
  getStopWithGroupData,
  getDepartureRoutesByFullRouteIds,
  getLineDataByRouteId,
  getLineDataForRoutes,
  getStopsForRoute,
  getAdditionalStops,
} = require("./timetableService");

/**
 * Gets departure route data by ID
 * @param {number} id - Departure route ID
 * @returns {Promise<Object>} Departure route data
 */
const getDepartureRouteById = async (id) => {
  const result = await executeQuery(
    `SELECT * FROM departure_route WHERE id = @id;`,
    {
      id,
    }
  );

  if (!result || result.length === 0) {
    throw new NotFoundError(`Departure route with ID ${id} not found`);
  }

  return result[0];
};

/**
 * Gets departure routes by full route ID
 * @param {number} full_route_id - Full route ID
 * @returns {Promise<Array>} Departure routes
 */
const getDepartureRoutesByFullRouteId = async (full_route_id) => {
  const routes = await executeQuery(
    `SELECT id, route_id, color, signature FROM departure_route WHERE route_id = @full_route_id`,
    { full_route_id }
  );

  return routes || [];
};

/**
 * Gets departures for a specific stop aggregated by route
 * @param {number} stopId - ID of the stop
 * @returns {Promise<Object>} Object with baseData and departures
 * @throws {NotFoundError} If stop doesn't exist
 */
const getDeparturesForStop = async (stopId, get_base_data = true) => {
  const stopExists = await executeQuery(
    `SELECT 1 FROM stop WHERE id = @stopId`,
    { stopId }
  );

  if (!stopExists.length) {
    throw new NotFoundError(`Stop with ID = ${stopId} does not exist.`);
  }

  const fullRouteIds = await getFullRoutesByStopId(stopId);
  const departureRoutes = await getDepartureRoutesByFullRouteIds(fullRouteIds);

  const routeIds = departureRoutes.map((route) => route.route_id);
  const departureRouteIds = departureRoutes.map((route) => route.id);

  const linesData = await getLineDataForRoutes(routeIds);
  const additionalStopsRaw = await getAdditionalStopsForRoutes(
    departureRouteIds
  );
  const additionalStopsData = additionalStopsRaw.reduce((acc, stop) => {
    if (!acc[stop.route_id]) acc[stop.route_id] = [];
    acc[stop.route_id].push({ stop_number: stop.stop_number });
    return acc;
  }, {});
  const timetableData = await getTimetableDataForRoutes(departureRouteIds);

  const departurePromises = departureRoutes.map(async (route) => {
    const line = (linesData[route.route_id] || [])[0];
    if (!line) {
      return [];
    }

    const allStops = (await getStopsForRoute(route.route_id))
      .map((result) => ({ ...result, stop_number: Number(result.stop_number) }))
      .sort((a, b) => a.stop_number - b.stop_number);

    const additionalStops = additionalStopsData[route.id] || [];

    const processedStops = processRouteStops(allStops, additionalStops);
    if (processedStops.length === 0) {
      return [];
    }

    const lastStop = processedStops[processedStops.length - 1];

    const timetableEntries = timetableData.filter(
      (entry) => entry.route_id === route.id
    );

    return timetableEntries.flatMap((entry) => {
      try {
        return calculateDepartureTimes(processedStops, entry.departure_time)
          .filter((item) => Number(item.stop_id) === Number(stopId))
          .filter((item) => !item.is_last)
          .map((stop) => ({
            line,
            departure_time: stop.departure_time,
            is_on_request: stop.is_on_request,
            last_stop: lastStop.name,
            route_id: entry.full_route_id,
            timetable_id: entry.id,
            stop_number: stop.stop_number,
            is_last: stop.is_last,
          }));
      } catch (error) {
        console.error(`Error calculating times for entry ${entry.id}:`, error);
        return [];
      }
    });
  });

  const departureResults = await Promise.all(departurePromises);

  const departures = departureResults
    .flat()
    .sort((a, b) => a.departure_time.localeCompare(b.departure_time));

  if (get_base_data) {
    const baseData = await getStopWithGroupData(stopId);
    return { baseData, departures };
  } else {
    return departures;
  }
};

module.exports = {
  getDeparturesForStop,
  getDepartureRouteById,
  getDepartureRoutesByFullRouteId,
};
