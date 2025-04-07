const { executeQuery } = require("../utils/sqlHelper");
const { NotFoundError, ValidationError } = require("../utils/errorHandler");

let stopCacheByRoute = {};
let stopCacheTime = Date.now();
const CACHE_TIMEOUT = 300000;

/**
 * Gets timetable data by ID
 * @param {number} id - Timetable ID
 * @returns {Promise<Object>} Timetable data
 */
const getTimetableById = async (id) => {
  if (!id || isNaN(parseInt(id))) {
    throw new ValidationError("Timetable ID must be a valid number");
  }

  const results = await executeQuery(
    `SELECT * FROM timetable WHERE id = @id;`,
    { id }
  );
  if (!results || !results.length) {
    throw new NotFoundError(`Timetable with ID ${id} not found`);
  }
  return results[0];
};

/**
 * Gets timetable data by departure route ID
 * @param {number} id - Departure route ID
 * @returns {Promise<Object>} Timetable data
 */
const getTimetableByRouteId = async (id) => {
  return executeQuery(`SELECT * FROM timetable WHERE route_id = @id;`, {
    id,
  });
};

/**
 * Gets stops for a route
 * @param {number} full_route_id - Route ID
 * @returns {Promise<Array>} Stops data
 */
const getStopsForRoute = async (full_route_id) => {
  if (
    stopCacheByRoute[full_route_id] &&
    Date.now() - stopCacheTime < CACHE_TIMEOUT
  ) {
    return stopCacheByRoute[full_route_id];
  }

  const results = await executeQuery(
    `SELECT s.stop_group_id, s.street, fr.stop_id, fr.travel_time, 
           fr.stop_number, fr.stop_type, sg.name, fr.is_on_request, 
           st.is_optional, st.is_first, st.is_last, fr.route_id
     FROM full_route fr
     JOIN stop s ON s.id = fr.stop_id
     JOIN stop_group sg ON sg.id = s.stop_group_id
     JOIN stop_type st ON st.id = fr.stop_type
     WHERE fr.route_id = @route_id;`,
    { route_id: full_route_id }
  );

  stopCacheByRoute[full_route_id] = results;
  stopCacheTime = Date.now();

  return results;
};

/**
 * Gets additional stops for a departure route
 * @param {number} departureRouteId - Departure route ID
 * @returns {Promise<Array>} Additional stops data
 */
const getAdditionalStops = async (departureRouteId) => {
  return executeQuery(
    `SELECT stop_number FROM additional_stop WHERE route_id = @route_id;`,
    { route_id: departureRouteId }
  );
};

/**
 * Gets departure routes by full route ID
 * @param {Array<Number>} fullRouteIds - Full route IDs
 * @returns {Promise<Array>} Departure routes
 */
const getDepartureRoutesByFullRouteIds = async (fullRouteIds) => {
  if (!fullRouteIds.length) return [];

  const params = fullRouteIds.reduce(
    (acc, id, i) => ({ ...acc, [`id${i}`]: id }),
    {}
  );
  const placeholders = fullRouteIds.map((_, i) => `@id${i}`).join(",");

  return executeQuery(
    `SELECT id, route_id, color, signature FROM departure_route WHERE route_id IN (${placeholders})`,
    params
  );
};

/**
 * Gets timetable data for multiple routes
 * @param {Array<number>} routeIds - Array of route IDs
 * @returns {Promise<Array>} Timetable data
 */
const getTimetableDataForRoutes = async (routeIds) => {
  if (!routeIds.length) return [];

  const params = routeIds.reduce(
    (acc, id, i) => ({ ...acc, [`id${i}`]: id }),
    {}
  );
  const placeholders = routeIds.map((_, i) => `@id${i}`).join(",");

  return executeQuery(
    `SELECT id, route_id, departure_time FROM timetable 
     WHERE route_id IN (${placeholders})`,
    params
  );
};

/**
 * Gets stop information by ID with group data
 * @param {number} stopId - ID of the stop
 * @returns {Promise<Object>} Stop data with group information
 */
const getStopWithGroupData = async (stopId) => {
  return executeQuery(
    `SELECT 
      stop.street,
      stop.map,
      stop.id AS stop_id, 
      stop_group.id AS group_id, 
      stop_group.name 
    FROM stop 
    JOIN stop_group ON stop_group.id = stop.stop_group_id 
    WHERE stop.id = @stopId`,
    { stopId }
  ).then((results) => results[0]);
};

/**
 * Gets line for a route ID
 * @param {number} routeId - ID of the route
 * @returns {Promise<object>} Line
 */
const getLineDataByRouteId = async (routeId) => {
  return executeQuery(
    `SELECT name, nameSingular, namePlural, color FROM route JOIN line ON line.id = route.line_id JOIN line_type ON line_type.id = line.line_type_id WHERE route.id = @routeId`,
    { routeId: routeId }
  );
};

const generateSignatureExplanation = (additionalStops, allStops) => {
  if (!additionalStops || !additionalStops.length) {
    return null;
  }

  const additionalStopInfo = additionalStops
    .map((addStop) => {
      const stopNumber = Number(addStop.stop_number);
      const stopDetails = allStops.find(
        (stop) => Number(stop.stop_number) === stopNumber
      );
      return stopDetails
        ? {
            ...addStop,
            ...stopDetails,
          }
        : addStop;
    })
    .filter((stop) => stop);

  const firstStops = additionalStopInfo.filter((stop) => stop.is_first);
  const lastStops = additionalStopInfo.filter((stop) => stop.is_last);
  const middleStops = additionalStopInfo.filter(
    (stop) => !stop.is_first && !stop.is_last
  );

  let explanation = "";

  if (firstStops.length && lastStops.length) {
    const firstStop = firstStops[0].name;
    const lastStop = lastStops[0].name;
    explanation = `Kurs od przystanku "${firstStop}" do przystanku "${lastStop}"`;

    if (middleStops.length) {
      const middleStopNames = middleStops
        .map((stop) => `"${stop.name}"`)
        .join(", ");
      explanation += ` przez ${middleStopNames}`;
    }
  } else if (firstStops.length) {
    const firstStop = firstStops[0].name;
    explanation = `Kurs od przystanku "${firstStop}"`;

    if (middleStops.length) {
      const middleStopNames = middleStops
        .map((stop) => `"${stop.name}"`)
        .join(", ");
      explanation += ` przez ${middleStopNames}`;
    }
  } else if (lastStops.length) {
    const lastStop = lastStops[0].name;
    explanation = `Kurs tylko do przystanku "${lastStop}"`;

    if (middleStops.length) {
      const middleStopNames = middleStops
        .map((stop) => `"${stop.name}"`)
        .join(", ");
      explanation += ` przez ${middleStopNames}`;
    }
  } else if (middleStops.length) {
    if (middleStops.length === 1) {
      explanation = `Kurs z obsługą przystanku "${middleStops[0].name}"`;
    } else {
      const middleStopNames = middleStops
        .map((stop) => `"${stop.name}"`)
        .join(", ");
      explanation = `Kurs z obsługą przystanków: ${middleStopNames}`;
    }
  } else {
    explanation = "Kurs specjalny";
  }

  return explanation;
};

/**
 * Formats departure times by hour
 * @param {Array} departures - List of departures to format
 * @returns {Object} Departures grouped by hour
 */
const formatDeparturesByHour = (departures) => {
  return departures.reduce((acc, departure) => {
    const { departure_time } = departure;
    const hour =
      departure_time[0] === "0"
        ? departure_time.substr(1, 2)
        : departure_time.substr(0, 2);

    if (!acc[hour]) acc[hour] = [];

    acc[hour].push({
      departure_time: departure_time.substr(3, 2),
      signature: departure.signature,
      color: departure.color,
      timetable_id: departure.timetable_id,
      route_id: departure.route_id,
    });

    return acc;
  }, {});
};

/**
 * Extracts unique signatures with explanations
 * @param {Array} departures - List of departures
 * @returns {Array} Unique signatures with explanations
 */
const extractUniqueSignatures = (departures) => {
  const signatureMap = new Map();

  departures.forEach((departure) => {
    if (departure.signature) {
      signatureMap.set(departure.signature, {
        signature: departure.signature,
        signature_explanation: departure.signatureExplanation,
      });
    }
  });

  return Array.from(signatureMap.values());
};

const getLinesFullRoutes = async (useCache = true) => {
  if (
    useCache &&
    linesFullRoutesCache &&
    Date.now() - linesFullRoutesCacheTime < 300000
  ) {
    return linesFullRoutesCache;
  }

  const allRouteIds = await executeQuery(`SELECT id FROM route`);
  const routeIds = allRouteIds.map((r) => r.id);
  const departureRoutes = await getDepartureRoutesByFullRouteIds(routeIds);

  const departurePromises = departureRoutes.map(async (route) => {
    try {
      const line = (await getLineDataByRouteId(route.route_id))[0];
      if (!line) {
        return null;
      }

      const allStops = (await getStopsForRoute(route.route_id))
        .map((result) => ({
          ...result,
          stop_number: Number(result.stop_number),
        }))
        .sort((a, b) => a.stop_number - b.stop_number);

      if (!allStops || !allStops.length) {
        return null;
      }

      const additionalStops = await getAdditionalStops(route.id);
      const processedStops = processRouteStops(allStops, additionalStops);

      return { line, stops: processedStops };
    } catch (error) {
      console.error(`Error processing departure route ${route.id}:`, error);
      return null;
    }
  });

  const usedRoutes = new Set();
  const departureResults = (await Promise.all(departurePromises)).filter(
    Boolean
  );

  const reducedDepartures = departureResults.reduce((acc, obj) => {
    if (!obj || !obj.line || !obj.stops || obj.stops.length < 2) {
      return acc;
    }

    const { line, stops } = obj;
    const firstStop = stops[0];
    const lastStop = stops[stops.length - 1];

    const routeKey = `${firstStop.name}-${lastStop.name}`;
    const reverseRouteKey = `${lastStop.name}-${firstStop.name}`;

    if (usedRoutes.has(routeKey) || usedRoutes.has(reverseRouteKey)) {
      return acc;
    }

    if (!acc[line.namePlural]) acc[line.namePlural] = { color: line.color };
    if (!acc[line.namePlural][line.name]) {
      acc[line.namePlural][line.name] = [];
    }

    acc[line.namePlural][line.name].push({
      first_stop: firstStop.name,
      last_stop: lastStop.name,
      streets: [...new Set(stops.map((stop) => stop.street).filter(Boolean))],
    });

    usedRoutes.add(routeKey);

    return acc;
  }, {});

  linesFullRoutesCache = reducedDepartures;
  linesFullRoutesCacheTime = Date.now();

  return reducedDepartures;
};

/**
 * Clear caches to force fresh data
 */
const clearCache = () => {
  stopCacheByRoute = {};
  stopCacheTime = 0;
  return { success: true, message: "Timetable cache cleared" };
};

module.exports = {
  getTimetableById,
  getStopsForRoute,
  getTimetableByRouteId,
  getTimetableDataForRoutes,
  getDepartureRoutesByFullRouteIds,
  getLineDataByRouteId,
  getStopWithGroupData,
  formatDeparturesByHour,
  getAdditionalStops,
  extractUniqueSignatures,
  generateSignatureExplanation,
  getLinesFullRoutes,
  clearCache,
};
