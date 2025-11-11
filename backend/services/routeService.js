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
let fullRoutesByStopCache = {};
let fullRoutesByStopCacheTime = Date.now();
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
      s.alias,
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
  const enrichedRoutes = sortedRoutes.map((route) => {
    const processedRoutes = new Set();
    const getRouteKey = (first, last) => {
      return [first, last].sort().join("-");
    };

    const uniqueLinePaths = departureResults
      .filter((result) => {
        if (!result.stops || result.stops.length < 2) return false;

        const firstStop = result.stops[0].name;
        const lastStop = result.stops[result.stops.length - 1].name;
        const routeKey = getRouteKey(firstStop, lastStop);

        if (processedRoutes.has(routeKey)) {
          return false;
        }

        processedRoutes.add(routeKey);
        return true;
      })
      .map((result) => ({
        first_stop: result.stops[0].alias || result.stops[0].name,
        last_stop:
          result.stops[result.stops.length - 1].alias ||
          result.stops[result.stops.length - 1].name,
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
  if (
    fullRoutesByStopCache[stopId] &&
    Date.now() - fullRoutesByStopCacheTime < CACHE_TIMEOUT_MS
  ) {
    return fullRoutesByStopCache[stopId];
  }

  const results = await executeQuery(
    `SELECT route_id FROM full_route WHERE stop_id = @stopId`,
    { stopId }
  );
  const routeIds = results.map((r) => r.route_id);

  fullRoutesByStopCache[stopId] = routeIds;
  fullRoutesByStopCacheTime = Date.now();

  return routeIds;
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
 * Gets real-time bus positions and route map data for a specific line
 * NOTE: This function does NOT use cache - always fetches fresh real-time data
 * @param {string} line_name - Name of the line (e.g., "1", "A", "12")
 * @returns {Promise<Array>} Active buses with positions and route waypoints
 */
const getActiveBusesForASpecificLine = async (line_id) => {
  const result = await executeQuery(
    `WITH current_context AS (
        SELECT 
          LOCALTIMESTAMP AS current_ts,
          CURRENT_DATE AS current_date,
          LOCALTIME AS current_time
      ),
      total_travel AS (
        SELECT 
          dr.id AS route_id,
          SUM(fr.travel_time) AS total_travel_minutes
        FROM full_route fr
        JOIN departure_route dr ON dr.route_id = fr.route_id
        LEFT JOIN additional_stop as2 ON as2.route_id = dr.id AND as2.stop_number = fr.stop_number
        WHERE fr.is_optional = FALSE OR as2.route_id IS NOT NULL
        GROUP BY dr.id
      ),
      raw_active_routes AS (
        SELECT 
          t.id AS timetable_id,
          t.route_id AS departure_route_id,
          t.departure_time,
          dr.route_id AS base_route_id,
          tt.total_travel_minutes,
          cc.current_ts,
          cc.current_time,
          (t.departure_time + (tt.total_travel_minutes * INTERVAL '1 minute'))::time AS end_time,
          (cc.current_date::timestamp + t.departure_time::interval) AS start_timestamp_today,
          (cc.current_date::timestamp + t.departure_time::interval + (tt.total_travel_minutes * INTERVAL '1 minute')) AS end_timestamp_today
        FROM timetable t
        JOIN departure_route dr ON t.route_id = dr.id
        JOIN total_travel tt ON t.route_id = tt.route_id
        CROSS JOIN current_context cc
      ),
      active_routes AS (
        SELECT 
          rar.timetable_id,
          rar.departure_route_id,
          rar.departure_time,
          rar.base_route_id,
          rar.total_travel_minutes,
          rar.current_ts,
          CASE 
            WHEN rar.end_time < rar.departure_time AND rar.current_time < rar.departure_time
              THEN rar.start_timestamp_today - INTERVAL '1 day'
            ELSE rar.start_timestamp_today
          END AS departure_timestamp
        FROM raw_active_routes rar
        WHERE 
          (
            rar.end_time < rar.departure_time
            AND (
              rar.current_time >= rar.departure_time
              OR rar.current_time < rar.end_time
            )
          )
          OR (
            rar.end_time >= rar.departure_time
            AND rar.current_time >= rar.departure_time
            AND rar.current_time < rar.end_time
          )
      ),
      route_details AS (
        SELECT
          r.id as base_route_id,
          l.name as line_name,
          l.id as line_id,
          ls.stop_group_name as direction,
          lt.color as color,
          l.vehicle_type_id
        FROM route r
        JOIN line l ON r.line_id = l.id
        JOIN line_type lt ON l.line_type_id = lt.id
        JOIN (
          SELECT 
            fr.route_id,
            sg.name as stop_group_name,
            ROW_NUMBER() OVER(PARTITION BY fr.route_id ORDER BY fr.stop_number DESC) as rn
          FROM full_route fr
          JOIN stop s ON fr.stop_id = s.id
          JOIN stop_group sg ON s.stop_group_id = sg.id
          JOIN departure_route dr ON dr.route_id = fr.route_id
          LEFT JOIN additional_stop as2 ON as2.route_id = fr.route_id AND as2.stop_number = fr.stop_number
          where (fr.is_optional = false 
            or exists (select 1 from additional_stop as3
            where dr.id = as3.route_id 
            and as3.stop_number = fr.stop_number))
        ) ls ON r.id = ls.route_id AND ls.rn = 1
      ),
      cumulative_travel AS (
        SELECT 
          fr.route_id,
          fr.stop_number,
          sg.name AS stop_group_name,
          SUM(fr.travel_time) OVER (PARTITION BY fr.route_id ORDER BY fr.stop_number) AS cumulative_minutes
        FROM full_route fr
        JOIN stop s ON s.id = fr.stop_id
        JOIN departure_route dr ON dr.route_id = fr.route_id
        JOIN stop_group sg ON sg.id = s.stop_group_id
        LEFT JOIN additional_stop as2 ON as2.route_id = fr.route_id AND as2.stop_number = fr.stop_number
        where (fr.is_optional = false 
          or exists (select 1 from additional_stop as3
          where dr.id = as3.route_id 
          and as3.stop_number = fr.stop_number))
          AND fr.route_id IN (SELECT DISTINCT ar.base_route_id FROM active_routes ar)
      ),
      stop_times AS (
        SELECT
          ar.timetable_id,
          ar.departure_route_id,
          ar.departure_time,
          ar.departure_timestamp,
          ct.stop_group_name,
          ct.stop_number,
          ar.departure_timestamp + (ct.cumulative_minutes * INTERVAL '1 minute') AS arrival_timestamp
        FROM active_routes ar
        JOIN cumulative_travel ct ON ar.base_route_id = ct.route_id
      ),
      previous_stop AS (
        SELECT
          st.timetable_id,
          st.stop_group_name,
          st.stop_number,
          st.arrival_timestamp,
          ROW_NUMBER() OVER (PARTITION BY st.timetable_id ORDER BY st.stop_number DESC) as rn
        FROM stop_times st
        JOIN active_routes ar ON st.timetable_id = ar.timetable_id
        WHERE st.arrival_timestamp <= ar.current_ts
      ),
      next_stop AS (
        SELECT
          st.timetable_id,
          st.stop_group_name,
          st.stop_number,
          st.arrival_timestamp,
          ROW_NUMBER() OVER (PARTITION BY st.timetable_id ORDER BY st.stop_number ASC) as rn
        FROM stop_times st
        JOIN active_routes ar ON st.timetable_id = ar.timetable_id
        WHERE st.arrival_timestamp > ar.current_ts
      ),
      bus_progress AS (
        SELECT 
          bp_base.*,
          CASE 
            WHEN bp_base.total_seconds > 0 
            THEN GREATEST(0.0, LEAST(1.0, bp_base.elapsed_seconds / bp_base.total_seconds))
            ELSE 0.0
          END AS progress_ratio
        FROM (
          SELECT
            ar.timetable_id,
            ar.departure_route_id,
            ar.base_route_id,
            COALESCE(ps.stop_number, 0) AS prev_stop_number,
            ns.stop_number AS next_stop_number,
            COALESCE(ps.arrival_timestamp, ar.departure_timestamp) AS prev_stop_timestamp,
            ns.arrival_timestamp AS next_stop_timestamp,
            EXTRACT(EPOCH FROM (ar.current_ts - COALESCE(ps.arrival_timestamp, ar.departure_timestamp))) AS elapsed_seconds,
            EXTRACT(EPOCH FROM (ns.arrival_timestamp - COALESCE(ps.arrival_timestamp, ar.departure_timestamp))) AS total_seconds
          FROM active_routes ar
          LEFT JOIN previous_stop ps ON ar.timetable_id = ps.timetable_id AND ps.rn = 1
          LEFT JOIN next_stop ns ON ar.timetable_id = ns.timetable_id AND ns.rn = 1
          WHERE ns.stop_number IS NOT NULL
        ) bp_base
      ),
      segment_path AS (
        SELECT
          bp.timetable_id,
          bp.departure_route_id,
          bp.base_route_id,
          bp.prev_stop_number,
          bp.next_stop_number,
          bp.progress_ratio,
          mr.id,
          mr.lat,
          mr.lon,
          mr.stop_nearby,
          mr.stop_number,
          ROW_NUMBER() OVER (PARTITION BY bp.timetable_id ORDER BY mr.id) as path_point_order,
          LAG(mr.lat) OVER (PARTITION BY bp.timetable_id ORDER BY mr.id) as prev_lat,
          LAG(mr.lon) OVER (PARTITION BY bp.timetable_id ORDER BY mr.id) as prev_lon
        FROM bus_progress bp
        JOIN map_route mr ON bp.departure_route_id = mr.departure_route_id
        WHERE mr.id >= (
          SELECT MIN(mr2.id)
          FROM map_route mr2
          WHERE mr2.departure_route_id = bp.departure_route_id
            AND mr2.stop_number = bp.prev_stop_number
        )
        AND mr.id <= (
          SELECT MIN(mr2.id)
          FROM map_route mr2
          WHERE mr2.departure_route_id = bp.departure_route_id
            AND mr2.stop_number = bp.next_stop_number
        )
      ),
      path_with_distances AS (
        SELECT
          sp.*,
          CASE
            WHEN sp.prev_lat IS NOT NULL AND sp.prev_lon IS NOT NULL
            THEN 6371000 * acos(
              least(1.0, greatest(-1.0,
                cos(radians(sp.lat)) * cos(radians(sp.prev_lat)) *
                cos(radians(sp.prev_lon) - radians(sp.lon)) +
                sin(radians(sp.lat)) * sin(radians(sp.prev_lat))
              ))
            )
            ELSE 0
          END as segment_distance
        FROM segment_path sp
      ),
      path_with_cumulative AS (
        SELECT
          pwd.*,
          SUM(pwd.segment_distance) OVER (PARTITION BY pwd.timetable_id ORDER BY pwd.id) as cumulative_distance
        FROM path_with_distances pwd
      ),
      path_with_total_distance AS (
        SELECT
          pwc.*,
          MAX(pwc.cumulative_distance) OVER (PARTITION BY pwc.timetable_id) as total_distance
        FROM path_with_cumulative pwc
      ),
      path_with_target AS (
        SELECT
          pwtd.*,
          pwtd.progress_ratio * pwtd.total_distance as target_distance,
          ABS(pwtd.cumulative_distance - (pwtd.progress_ratio * pwtd.total_distance)) as distance_from_target
        FROM path_with_total_distance pwtd
      ),
      waypoint_before_target AS (
        SELECT
          pwt.timetable_id,
          pwt.id,
          pwt.lat,
          pwt.lon,
          pwt.cumulative_distance,
          pwt.target_distance,
          pwt.progress_ratio,
          pwt.total_distance,
          ROW_NUMBER() OVER (
            PARTITION BY pwt.timetable_id 
            ORDER BY pwt.cumulative_distance DESC
          ) AS rn
        FROM path_with_target pwt
        WHERE pwt.cumulative_distance <= pwt.target_distance
      ),
      waypoint_after_target AS (
        SELECT
          pwt.timetable_id,
          pwt.id,
          pwt.lat,
          pwt.lon,
          pwt.cumulative_distance,
          ROW_NUMBER() OVER (
            PARTITION BY pwt.timetable_id 
            ORDER BY pwt.cumulative_distance ASC
          ) AS rn
        FROM path_with_target pwt
        WHERE pwt.cumulative_distance >= pwt.target_distance
      ),
      bus_location AS (
        SELECT
          wb.timetable_id,
          wb.progress_ratio,
          wb.total_distance,
          wb.target_distance,
          wb.id AS waypoint_before_id,
          CASE
            WHEN wa.cumulative_distance = wb.cumulative_distance THEN wb.lat
            ELSE wb.lat + (wa.lat - wb.lat) * 
              ((wb.target_distance - wb.cumulative_distance) / 
               NULLIF(wa.cumulative_distance - wb.cumulative_distance, 0))
          END AS lat,
          CASE
            WHEN wa.cumulative_distance = wb.cumulative_distance THEN wb.lon
            ELSE wb.lon + (wa.lon - wb.lon) * 
              ((wb.target_distance - wb.cumulative_distance) / 
               NULLIF(wa.cumulative_distance - wb.cumulative_distance, 0))
          END AS lon,
          false as stop_nearby,
          0 as stop_number
        FROM waypoint_before_target wb
        JOIN waypoint_after_target wa ON wb.timetable_id = wa.timetable_id AND wb.rn = 1 AND wa.rn = 1
      ),
      map_routes AS (
        SELECT 
          mr.departure_route_id,
          json_agg(
            json_build_object(
              'id', mr.id,
              'departure_route_id', mr.departure_route_id,
              'lat', mr.lat,
              'lon', mr.lon,
              'stop_nearby', mr.stop_nearby,
              'stop_number', mr.stop_number
            ) ORDER BY mr.id
          ) AS map_routes
        FROM map_route mr
        WHERE mr.departure_route_id IN (SELECT DISTINCT ar.departure_route_id FROM active_routes ar)
        GROUP BY mr.departure_route_id
      )
      SELECT 
        ar.departure_route_id,
        ar.departure_time AS start_time,
        ar.base_route_id,
        rd.line_name,
        rd.vehicle_type_id,
        rd.color,
        rd.direction,
        ps.stop_group_name AS previous_stop,
        ps.stop_number AS prev_stop_num,
        ns.stop_group_name AS next_stop,
        ns.stop_number AS next_stop_num,
        bp.progress_ratio,
        bp.elapsed_seconds,
        bp.total_seconds,
        ROUND(bl.total_distance::numeric, 2) AS segment_distance_meters,
        ROUND(bl.target_distance::numeric, 2) AS target_distance_meters,
        bl.lat AS bus_latitude,
        bl.lon AS bus_longitude,
        bl.stop_nearby,
        ROUND(next_wp.lat::numeric, 6) AS next_waypoint_lat,
        ROUND(next_wp.lon::numeric, 6) AS next_waypoint_lon
      FROM active_routes ar
      JOIN route_details rd ON ar.base_route_id = rd.base_route_id
      LEFT JOIN previous_stop ps ON ar.timetable_id = ps.timetable_id AND ps.rn = 1
      LEFT JOIN next_stop ns ON ar.timetable_id = ns.timetable_id AND ns.rn = 1
      LEFT JOIN bus_progress bp ON ar.timetable_id = bp.timetable_id
      LEFT JOIN bus_location bl ON ar.timetable_id = bl.timetable_id
      LEFT JOIN LATERAL (
        SELECT mr2.lat, mr2.lon
        FROM map_route mr2
        WHERE mr2.departure_route_id = ar.departure_route_id
          AND bl.waypoint_before_id IS NOT NULL
          AND mr2.id > bl.waypoint_before_id
        ORDER BY mr2.id ASC
        LIMIT 1
      ) next_wp ON true
      LEFT JOIN map_routes mr_json ON ar.departure_route_id = mr_json.departure_route_id
      WHERE rd.line_id = @line_id
      ORDER BY ar.departure_timestamp;`,
    { line_id }
  );

  return result;
};

const getMapRouteEveryVehicle = async () => {
  const result = await executeQuery(
    `WITH current_context AS (
        SELECT 
          LOCALTIMESTAMP AS current_ts,
          CURRENT_DATE AS current_date,
          LOCALTIME AS current_time
      ),
      total_travel AS (
        SELECT 
          dr.id AS route_id,
          SUM(fr.travel_time) AS total_travel_minutes
        FROM full_route fr
        JOIN departure_route dr ON dr.route_id = fr.route_id
        LEFT JOIN additional_stop as2 ON as2.route_id = dr.id AND as2.stop_number = fr.stop_number
        WHERE fr.is_optional = FALSE OR as2.route_id IS NOT NULL
        GROUP BY dr.id
      ),
      raw_active_routes AS (
        SELECT 
          t.id AS timetable_id,
          t.route_id AS departure_route_id,
          t.departure_time,
          dr.route_id AS base_route_id,
          tt.total_travel_minutes,
          cc.current_ts,
          cc.current_time,
          (t.departure_time + (tt.total_travel_minutes * INTERVAL '1 minute'))::time AS end_time,
          (cc.current_date::timestamp + t.departure_time::interval) AS start_timestamp_today,
          (cc.current_date::timestamp + t.departure_time::interval + (tt.total_travel_minutes * INTERVAL '1 minute')) AS end_timestamp_today
        FROM timetable t
        JOIN departure_route dr ON t.route_id = dr.id
        JOIN total_travel tt ON t.route_id = tt.route_id
        CROSS JOIN current_context cc
      ),
      active_routes AS (
        SELECT 
          rar.timetable_id,
          rar.departure_route_id,
          rar.departure_time,
          rar.base_route_id,
          rar.total_travel_minutes,
          rar.current_ts,
          CASE 
            WHEN rar.end_time < rar.departure_time AND rar.current_time < rar.departure_time
              THEN rar.start_timestamp_today - INTERVAL '1 day'
            ELSE rar.start_timestamp_today
          END AS departure_timestamp
        FROM raw_active_routes rar
        WHERE 
          (
            rar.end_time < rar.departure_time
            AND (
              rar.current_time >= rar.departure_time
              OR rar.current_time < rar.end_time
            )
          )
          OR (
            rar.end_time >= rar.departure_time
            AND rar.current_time >= rar.departure_time
            AND rar.current_time < rar.end_time
          )
      ),
      route_details AS (
        SELECT
          r.id as base_route_id,
          l.name as line_name,
          ls.stop_group_name as direction,
          lt.color as color,
          l.vehicle_type_id
        FROM route r
        JOIN line l ON r.line_id = l.id
        JOIN line_type lt ON l.line_type_id = lt.id
        JOIN (
          SELECT 
            fr.route_id,
            sg.name as stop_group_name,
            ROW_NUMBER() OVER(PARTITION BY fr.route_id ORDER BY fr.stop_number DESC) as rn
          FROM full_route fr
          JOIN stop s ON fr.stop_id = s.id
          JOIN stop_group sg ON s.stop_group_id = sg.id
          JOIN departure_route dr ON dr.route_id = fr.route_id
          LEFT JOIN additional_stop as2 ON as2.route_id = fr.route_id AND as2.stop_number = fr.stop_number
          where (fr.is_optional = false 
            or exists (select 1 from additional_stop as3
            where dr.id = as3.route_id 
            and as3.stop_number = fr.stop_number))
        ) ls ON r.id = ls.route_id AND ls.rn = 1
      ),
      cumulative_travel AS (
        SELECT 
          fr.route_id,
          fr.stop_number,
          sg.name AS stop_group_name,
          SUM(fr.travel_time) OVER (PARTITION BY fr.route_id ORDER BY fr.stop_number) AS cumulative_minutes
        FROM full_route fr
        JOIN stop s ON s.id = fr.stop_id
        JOIN departure_route dr ON dr.route_id = fr.route_id
        JOIN stop_group sg ON sg.id = s.stop_group_id
        LEFT JOIN additional_stop as2 ON as2.route_id = fr.route_id AND as2.stop_number = fr.stop_number
        where (fr.is_optional = false 
          or exists (select 1 from additional_stop as3
          where dr.id = as3.route_id 
          and as3.stop_number = fr.stop_number))
          AND fr.route_id IN (SELECT DISTINCT ar.base_route_id FROM active_routes ar)
      ),
      stop_times AS (
        SELECT
          ar.timetable_id,
          ar.departure_route_id,
          ar.departure_time,
          ar.departure_timestamp,
          ct.stop_group_name,
          ct.stop_number,
          ar.departure_timestamp + (ct.cumulative_minutes * INTERVAL '1 minute') AS arrival_timestamp
        FROM active_routes ar
        JOIN cumulative_travel ct ON ar.base_route_id = ct.route_id
      ),
      previous_stop AS (
        SELECT
          st.timetable_id,
          st.stop_group_name,
          st.stop_number,
          st.arrival_timestamp,
          ROW_NUMBER() OVER (PARTITION BY st.timetable_id ORDER BY st.stop_number DESC) as rn
        FROM stop_times st
        JOIN active_routes ar ON st.timetable_id = ar.timetable_id
        WHERE st.arrival_timestamp <= ar.current_ts
      ),
      next_stop AS (
        SELECT
          st.timetable_id,
          st.stop_group_name,
          st.stop_number,
          st.arrival_timestamp,
          ROW_NUMBER() OVER (PARTITION BY st.timetable_id ORDER BY st.stop_number ASC) as rn
        FROM stop_times st
        JOIN active_routes ar ON st.timetable_id = ar.timetable_id
        WHERE st.arrival_timestamp > ar.current_ts
      ),
      bus_progress AS (
        SELECT 
          bp_base.*,
          CASE 
            WHEN bp_base.total_seconds > 0 
            THEN GREATEST(0.0, LEAST(1.0, bp_base.elapsed_seconds / bp_base.total_seconds))
            ELSE 0.0
          END AS progress_ratio
        FROM (
          SELECT
            ar.timetable_id,
            ar.departure_route_id,
            ar.base_route_id,
            COALESCE(ps.stop_number, 0) AS prev_stop_number,
            ns.stop_number AS next_stop_number,
            COALESCE(ps.arrival_timestamp, ar.departure_timestamp) AS prev_stop_timestamp,
            ns.arrival_timestamp AS next_stop_timestamp,
            EXTRACT(EPOCH FROM (ar.current_ts - COALESCE(ps.arrival_timestamp, ar.departure_timestamp))) AS elapsed_seconds,
            EXTRACT(EPOCH FROM (ns.arrival_timestamp - COALESCE(ps.arrival_timestamp, ar.departure_timestamp))) AS total_seconds
          FROM active_routes ar
          LEFT JOIN previous_stop ps ON ar.timetable_id = ps.timetable_id AND ps.rn = 1
          LEFT JOIN next_stop ns ON ar.timetable_id = ns.timetable_id AND ns.rn = 1
          WHERE ns.stop_number IS NOT NULL
        ) bp_base
      ),
      segment_path AS (
        SELECT
          bp.timetable_id,
          bp.departure_route_id,
          bp.base_route_id,
          bp.prev_stop_number,
          bp.next_stop_number,
          bp.progress_ratio,
          mr.id,
          mr.lat,
          mr.lon,
          mr.stop_nearby,
          mr.stop_number,
          ROW_NUMBER() OVER (PARTITION BY bp.timetable_id ORDER BY mr.id) as path_point_order,
          LAG(mr.lat) OVER (PARTITION BY bp.timetable_id ORDER BY mr.id) as prev_lat,
          LAG(mr.lon) OVER (PARTITION BY bp.timetable_id ORDER BY mr.id) as prev_lon
        FROM bus_progress bp
        JOIN map_route mr ON bp.departure_route_id = mr.departure_route_id
        WHERE mr.id >= (
          SELECT MIN(mr2.id)
          FROM map_route mr2
          WHERE mr2.departure_route_id = bp.departure_route_id
            AND mr2.stop_number = bp.prev_stop_number
        )
        AND mr.id <= (
          SELECT MIN(mr2.id)
          FROM map_route mr2
          WHERE mr2.departure_route_id = bp.departure_route_id
            AND mr2.stop_number = bp.next_stop_number
        )
      ),
      path_with_distances AS (
        SELECT
          sp.*,
          CASE
            WHEN sp.prev_lat IS NOT NULL AND sp.prev_lon IS NOT NULL
            THEN 6371000 * acos(
              least(1.0, greatest(-1.0,
                cos(radians(sp.lat)) * cos(radians(sp.prev_lat)) *
                cos(radians(sp.prev_lon) - radians(sp.lon)) +
                sin(radians(sp.lat)) * sin(radians(sp.prev_lat))
              ))
            )
            ELSE 0
          END as segment_distance
        FROM segment_path sp
      ),
      path_with_cumulative AS (
        SELECT
          pwd.*,
          SUM(pwd.segment_distance) OVER (PARTITION BY pwd.timetable_id ORDER BY pwd.id) as cumulative_distance
        FROM path_with_distances pwd
      ),
      path_with_total_distance AS (
        SELECT
          pwc.*,
          MAX(pwc.cumulative_distance) OVER (PARTITION BY pwc.timetable_id) as total_distance
        FROM path_with_cumulative pwc
      ),
      path_with_target AS (
        SELECT
          pwtd.*,
          pwtd.progress_ratio * pwtd.total_distance as target_distance,
          ABS(pwtd.cumulative_distance - (pwtd.progress_ratio * pwtd.total_distance)) as distance_from_target
        FROM path_with_total_distance pwtd
      ),
      waypoint_before_target AS (
        SELECT
          pwt.timetable_id,
          pwt.id,
          pwt.lat,
          pwt.lon,
          pwt.cumulative_distance,
          pwt.target_distance,
          pwt.progress_ratio,
          pwt.total_distance,
          ROW_NUMBER() OVER (
            PARTITION BY pwt.timetable_id 
            ORDER BY pwt.cumulative_distance DESC
          ) AS rn
        FROM path_with_target pwt
        WHERE pwt.cumulative_distance <= pwt.target_distance
      ),
      waypoint_after_target AS (
        SELECT
          pwt.timetable_id,
          pwt.id,
          pwt.lat,
          pwt.lon,
          pwt.cumulative_distance,
          ROW_NUMBER() OVER (
            PARTITION BY pwt.timetable_id 
            ORDER BY pwt.cumulative_distance ASC
          ) AS rn
        FROM path_with_target pwt
        WHERE pwt.cumulative_distance >= pwt.target_distance
      ),
      bus_location AS (
        SELECT
          wb.timetable_id,
          wb.progress_ratio,
          wb.total_distance,
          wb.target_distance,
          wb.id AS waypoint_before_id,
          CASE
            WHEN wa.cumulative_distance = wb.cumulative_distance THEN wb.lat
            ELSE wb.lat + (wa.lat - wb.lat) * 
              ((wb.target_distance - wb.cumulative_distance) / 
               NULLIF(wa.cumulative_distance - wb.cumulative_distance, 0))
          END AS lat,
          CASE
            WHEN wa.cumulative_distance = wb.cumulative_distance THEN wb.lon
            ELSE wb.lon + (wa.lon - wb.lon) * 
              ((wb.target_distance - wb.cumulative_distance) / 
               NULLIF(wa.cumulative_distance - wb.cumulative_distance, 0))
          END AS lon,
          false as stop_nearby,
          0 as stop_number
        FROM waypoint_before_target wb
        JOIN waypoint_after_target wa ON wb.timetable_id = wa.timetable_id AND wb.rn = 1 AND wa.rn = 1
      ),
      map_routes AS (
        SELECT 
          mr.departure_route_id,
          json_agg(
            json_build_object(
              'id', mr.id,
              'departure_route_id', mr.departure_route_id,
              'lat', mr.lat,
              'lon', mr.lon,
              'stop_nearby', mr.stop_nearby,
              'stop_number', mr.stop_number
            ) ORDER BY mr.id
          ) AS map_routes
        FROM map_route mr
        WHERE mr.departure_route_id IN (SELECT DISTINCT ar.departure_route_id FROM active_routes ar)
        GROUP BY mr.departure_route_id
      )
      SELECT 
        ar.departure_route_id,
        ar.departure_time AS start_time,
        ar.base_route_id,
        rd.line_name,
        rd.vehicle_type_id,
        rd.color,
        rd.direction,
        ps.stop_group_name AS previous_stop,
        ps.stop_number AS prev_stop_num,
        ns.stop_group_name AS next_stop,
        ns.stop_number AS next_stop_num,
        bp.progress_ratio,
        bp.elapsed_seconds,
        bp.total_seconds,
        ROUND(bl.total_distance::numeric, 2) AS segment_distance_meters,
        ROUND(bl.target_distance::numeric, 2) AS target_distance_meters,
        bl.lat AS bus_latitude,
        bl.lon AS bus_longitude,
        bl.stop_nearby,
        ROUND(next_wp.lat::numeric, 6) AS next_waypoint_lat,
        ROUND(next_wp.lon::numeric, 6) AS next_waypoint_lon
      FROM active_routes ar
      JOIN route_details rd ON ar.base_route_id = rd.base_route_id
      LEFT JOIN previous_stop ps ON ar.timetable_id = ps.timetable_id AND ps.rn = 1
      LEFT JOIN next_stop ns ON ar.timetable_id = ns.timetable_id AND ns.rn = 1
      LEFT JOIN bus_progress bp ON ar.timetable_id = bp.timetable_id
      LEFT JOIN bus_location bl ON ar.timetable_id = bl.timetable_id
      LEFT JOIN LATERAL (
        SELECT mr2.lat, mr2.lon
        FROM map_route mr2
        WHERE mr2.departure_route_id = ar.departure_route_id
          AND bl.waypoint_before_id IS NOT NULL
          AND mr2.id > bl.waypoint_before_id
        ORDER BY mr2.id ASC
        LIMIT 1
      ) next_wp ON true
      LEFT JOIN map_routes mr_json ON ar.departure_route_id = mr_json.departure_route_id
      ORDER BY ar.departure_timestamp;`
  );

  return {
    vehicles: result,
    stops: [],
  };
};

const getAllRoutes = async () => {
  const result = await executeQuery(
    `SELECT 
      mr.departure_route_id,
      json_agg(
        json_build_object(
          'id', mr.id,
          'departure_route_id', mr.departure_route_id,
          'lat', mr.lat,
          'lon', mr.lon,
          'stop_nearby', mr.stop_nearby,
          'stop_number', mr.stop_number
        ) ORDER BY mr.id
      ) AS map_routes
    FROM map_route mr
    GROUP BY mr.departure_route_id`
  );

  const result2 = await executeQuery(
    `SELECT 
      s.map, sg.name, s.id, s.alias
      FROM stop_group sg
      LEFT JOIN stop s ON s.stop_group_id = sg.id
      `
  );

  return { stops: result2, routes: result };
};

const getAllRoutesForASpecificLine = async (line_id) => {
  const result = executeQuery(
    `WITH selected_departure_routes AS (
  SELECT DISTINCT
    dr.route_id,
    dr.id AS departure_route_id
  FROM departure_route dr
  JOIN route r ON r.id = dr.route_id
  JOIN line l ON l.id = r.line_id
  WHERE l.id = @line_id
),
aggregated_map_routes AS (
  SELECT 
    sdr.route_id,
    sdr.departure_route_id,
    json_agg(
      json_build_object(
        'id', mr.id,
        'departure_route_id', mr.departure_route_id,
        'lat', mr.lat,
        'lon', mr.lon,
        'stop_nearby', mr.stop_nearby,
        'stop_number', mr.stop_number
      ) ORDER BY mr.id
    ) AS map_routes
  FROM selected_departure_routes sdr
  LEFT JOIN map_route mr ON mr.departure_route_id = sdr.departure_route_id
  GROUP BY sdr.route_id, sdr.departure_route_id
),
aggregated_stops AS (
  SELECT 
    sdr.route_id,
    json_agg(
      json_build_object(
        'id', s.id,
        'name', sg.name,
        'alias', s.alias,
        'street', s.street,
        'map', s.map,
        'stop_number', fr.stop_number
      ) ORDER BY fr.stop_number
    ) AS stops
  FROM selected_departure_routes sdr
  LEFT JOIN full_route fr ON fr.route_id = sdr.route_id
  LEFT JOIN stop s ON s.id = fr.stop_id
  LEFT JOIN stop_group sg ON sg.id = s.stop_group_id
  GROUP BY sdr.route_id
)
SELECT
  sdr.route_id AS base_route_id,
  sdr.departure_route_id,
  amr.map_routes,
  ast.stops
FROM selected_departure_routes sdr
LEFT JOIN aggregated_map_routes amr ON amr.departure_route_id = sdr.departure_route_id
LEFT JOIN aggregated_stops ast ON ast.route_id = sdr.route_id
ORDER BY sdr.route_id, sdr.departure_route_id;`,
    { line_id }
  );

  return result;
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
  getMapRouteEveryVehicle,
  getLineRoutes,
  getRoute,
  calculateDepartureTimes,
  clearRouteCache,
  getActiveBusesForASpecificLine,
  getAllRoutesForASpecificLine,
  getAllRoutes,
};
