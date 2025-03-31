const { addMinutesToTime } = require("./timeUtils");

/**
 * Calculates departure times for each stop in a route
 * @param {Array} stops - Processed stops
 * @param {string|Date} initialDeparture - Initial departure time
 * @returns {Array} Stops with calculated departure times
 */
const calculateDepartureTimes = (stops, initialDeparture) => {
  let departureTime = initialDeparture;

  return stops.map((stop) => {
    const stopWithDeparture = {
      ...stop,
      departure_time: (departureTime = addMinutesToTime(
        departureTime,
        stop.travel_time
      )),
    };
    return stopWithDeparture;
  });
};

module.exports = {
  processRouteStops,
  calculateDepartureTimes,
};
