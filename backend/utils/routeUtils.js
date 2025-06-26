const { executeQuery } = require("../utils/sqlHelper");

/**
 * Get departure routes
 * @returns {Promise<Array>} Departure routes
 */
const getDepartureRoutes = async () => {
  return executeQuery(`
    SELECT DISTINCT dr.id, dr.route_id
    FROM departure_route dr
    JOIN timetable t ON t.route_id = dr.id
  `);
};

/**
 * Process route stops
 * @param {Array} results - Raw stop data
 * @param {Array} additionalStops - Additional stops to include
 * @returns {Array} Processed stops
 */
const processRouteStops = (results, additionalStops = []) => {
  let processedResults = results
    .map((result) => ({ ...result, stop_number: Number(result.stop_number) }))
    .sort((a, b) => a.stop_number - b.stop_number);

  const additionalStopMap = {};
  additionalStops.forEach((stop) => {
    additionalStopMap[Number(stop.stop_number)] = stop;
  });

  let effectiveFirstStopNumber = null;

  const additionalFirstStops = additionalStops
    .filter((stop) => stop.is_first)
    .sort((a, b) => Number(a.stop_number) - Number(b.stop_number));

  if (additionalFirstStops.length > 0) {
    effectiveFirstStopNumber = Number(additionalFirstStops[0].stop_number);
  } else {
    const defaultFirstStops = processedResults
      .filter((stop) => stop.is_first && !stop.is_optional)
      .sort((a, b) => a.stop_number - b.stop_number);

    if (defaultFirstStops.length > 0) {
      effectiveFirstStopNumber = defaultFirstStops[0].stop_number;
    }
  }

  processedResults = processedResults.map((result) => {
    const stopNumber = Number(result.stop_number);
    const additionalStop = additionalStopMap[stopNumber];

    if (result.is_first && stopNumber === effectiveFirstStopNumber) {
      return {
        ...result,
        is_included: true,
        is_effective_first: true,
      };
    }

    if (result.is_first && stopNumber !== effectiveFirstStopNumber) {
      return {
        ...result,
        is_first: additionalStop ? additionalStop.is_first : false,
        is_included: additionalStop ? true : !result.is_optional,
      };
    }

    if (additionalStop) {
      return {
        ...result,
        is_included: true,
        is_last: additionalStop.is_last || result.is_last,
      };
    }

    if (!result.is_optional) {
      return { ...result, is_included: true };
    }

    return { ...result, is_included: false };
  });

  const includedStops = processedResults.filter((stop) => stop.is_included);
  const lastStops = includedStops.filter((stop) => stop.is_last);

  const effectiveLastStop =
    lastStops.length > 0
      ? lastStops.reduce(
          (latest, stop) =>
            stop.stop_number > latest.stop_number ? stop : latest,
          lastStops[0]
        )
      : { stop_number: Number.MAX_VALUE };

  processedResults = processedResults.filter((result) => {
    if (additionalStopMap[result.stop_number]) {
      return true;
    }

    if (effectiveFirstStopNumber !== null) {
      return (
        !result.is_optional &&
        result.stop_number >= effectiveFirstStopNumber &&
        result.stop_number <= effectiveLastStop.stop_number
      );
    } else {
      return (
        !result.is_optional &&
        result.stop_number <= effectiveLastStop.stop_number
      );
    }
  });

  return processedResults.map(
    ({ is_included, is_effective_first, ...rest }) => rest
  );
};

module.exports = {
  getDepartureRoutes,
  processRouteStops,
};
