const { getStopWithGroupData } = require("./stopService");
const { getFullRoutesByStopId, getStopsForRoute } = require("./routeService");
const { getTimetableDataForRoutes } = require("./timetableService");

/**
 * Gets departure route data by ID
 * @param {number} id - Departure route ID
 * @returns {Promise<Object>} Departure route data
 */
const getDepartureRouteById = async (id) => {
  return executeQuery(`SELECT * FROM departure_route WHERE id = @id;`, {
    id,
  }).then((results) => results[0]);
};

/**
 * Gets departure routes by full route ID
 * @param {number} full_route_id - Full route ID
 * @returns {Promise<Array>} Departure routes
 */
const getDepartureRoutesByFullRouteId = async (full_route_id) => {
  return executeQuery(
    `SELECT id, route_id, color, signature FROM departure_route WHERE route_id = @full_route_id`,
    { full_route_id }
  );
};

/**
 * Gets departures for a specific stop aggregated by route
 * @param {number} stopId - ID of the stop
 * @returns {Promise<Array>} Departure data with line and destination info
 */
const getDeparturesForStop = async (stopId) => {
  const stopExists = await executeQuery(
    `SELECT 1 FROM stop WHERE id = @stopId`,
    { stopId }
  );

  if (!stopExists.length) {
    throw new NotFoundError(`Stop with ID = ${stopId} does not exist.`);
  }

  const baseData = await getStopWithGroupData(stopId);

  const fullRouteIds = await getFullRoutesByStopId(stopId);

  const departureRoutes = await getDepartureRoutesByFullRouteIds(fullRouteIds);

  const departurePromises = departureRoutes.map(async (route) => {
    const line = (await getLineDataByRouteId(route.route_id))[0];

    const allStops = (await getStopsForRoute(route.route_id))
      .map((result) => ({ ...result, stop_number: Number(result.stop_number) }))
      .sort((a, b) => a.stop_number - b.stop_number);

    const additionalStops = await getAdditionalStops(route.id);

    const processedStops = processRouteStops(allStops, additionalStops);
    const lastStop = processedStops[processedStops.length - 1];

    const timetableEntries = await getTimetableDataForRoutes([route.id]);

    return timetableEntries.flatMap((entry) => {
      return calculateDepartureTimes(processedStops, entry.departure_time)
        .filter((item) => Number(item.stop_id) === Number(stopId))
        .map((stop) => ({
          line,
          departure_time: stop.departure_time,
          is_on_request: stop.is_on_request,
          lastStop: lastStop.name,
        }));
    });
  });

  const departureResults = await Promise.all(departurePromises);

  const departures = departureResults
    .flat()
    .sort((a, b) => a.departure_time.localeCompare(b.departure_time));

  return { baseData, departures };
};
