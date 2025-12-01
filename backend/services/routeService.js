const { NotFoundError, ValidationError } = require("../utils/errorHandler");
const { executeQuery, getPool } = require("../utils/sqlHelper");
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
async function getActiveBusesForASpecificLine(line_id) {
  const pool = getPool();
  const client = await pool.connect();

  try {
    await client.query(`
      DO $$
      DECLARE
        v_current_time TIME := LOCALTIME;
        v_time_window_start TIME := (LOCALTIME - INTERVAL '2 hours')::TIME;
        v_time_window_end TIME := (LOCALTIME + INTERVAL '2 hours')::TIME;
        v_line_id INT := ${line_id};
      BEGIN
        DROP TABLE IF EXISTS temp_context;
        DROP TABLE IF EXISTS temp_active_timetable;
        DROP TABLE IF EXISTS temp_active_stops_raw;
        DROP TABLE IF EXISTS temp_active_stops;

        CREATE TEMP TABLE temp_context AS
        SELECT 
          LOCALTIMESTAMP AS current_ts,
          CURRENT_DATE AS current_date,
          LOCALTIME AS current_time;

        CREATE TEMP TABLE temp_active_timetable AS
        SELECT 
          t.id AS timetable_id,
          t.route_id AS departure_route_id,
          t.departure_time,
          dr.route_id AS base_route_id
        FROM timetable t
        JOIN departure_route dr ON t.route_id = dr.id
        JOIN route r ON dr.route_id = r.id
        JOIN line l ON r.line_id = l.id
        WHERE 
          l.id = v_line_id
          AND (
            (v_time_window_end >= v_time_window_start AND t.departure_time BETWEEN v_time_window_start AND v_time_window_end)
            OR (v_time_window_end < v_time_window_start AND (t.departure_time >= v_time_window_start OR t.departure_time <= v_time_window_end))
          );

        CREATE INDEX idx_temp_timetable_departure ON temp_active_timetable(departure_route_id);
        CREATE INDEX idx_temp_timetable_base ON temp_active_timetable(base_route_id);

        CREATE TEMP TABLE temp_active_stops_raw AS
        SELECT DISTINCT
          tat.departure_route_id,
          tat.base_route_id,
          fr.stop_number AS original_stop_number,
          fr.stop_id,
          fr.travel_time
        FROM temp_active_timetable tat
        JOIN full_route fr ON fr.route_id = tat.base_route_id
        WHERE 
          fr.is_optional = FALSE
          OR EXISTS (
            SELECT 1 
            FROM additional_stop ads
            WHERE ads.route_id = tat.departure_route_id
              AND ads.stop_number = fr.stop_number
          );

        CREATE TEMP TABLE temp_active_stops AS
        SELECT
          departure_route_id,
          base_route_id,
          ROW_NUMBER() OVER (PARTITION BY departure_route_id ORDER BY original_stop_number) AS stop_number,
          original_stop_number,
          stop_id,
          travel_time
        FROM temp_active_stops_raw;
      END $$;
    `);

    const result = await client.query(`
      WITH current_context AS (
        SELECT * FROM temp_context
      ),
      route_data AS (
        SELECT
          tas.departure_route_id,
          tat.timetable_id,
          tat.departure_time,
          tas.base_route_id,
          tas.stop_number,
          tas.stop_id,
          tas.travel_time,
          ROW_NUMBER() OVER (PARTITION BY tas.departure_route_id ORDER BY tas.stop_number) AS rn,
          COUNT(*) OVER (PARTITION BY tas.departure_route_id) AS stop_count
        FROM temp_active_stops tas
        JOIN temp_active_timetable tat 
          ON tas.departure_route_id = tat.departure_route_id
          AND tas.base_route_id = tat.base_route_id
      ),
      route_travel AS (
        SELECT
          timetable_id,
          departure_route_id,
          departure_time,
          base_route_id,
          SUM(CASE WHEN rn = 1 THEN 0 ELSE travel_time END) AS total_travel_minutes
        FROM route_data
        GROUP BY timetable_id, departure_route_id, departure_time, base_route_id
      ),
      -- Filter to active routes
      active_routes AS (
        SELECT 
          rt.*,
          cc.current_ts,
          cc.current_time,
          (rt.departure_time + (rt.total_travel_minutes * INTERVAL '1 minute'))::time AS end_time,
          CASE 
            WHEN (rt.departure_time + (rt.total_travel_minutes * INTERVAL '1 minute'))::time < rt.departure_time 
             AND cc.current_time < rt.departure_time
            THEN (cc.current_date - INTERVAL '1 day')::timestamp + rt.departure_time::interval
            ELSE cc.current_date::timestamp + rt.departure_time::interval
          END AS departure_timestamp
        FROM route_travel rt
        CROSS JOIN current_context cc
        WHERE rt.total_travel_minutes > 0
          AND (
            (
              (rt.departure_time + (rt.total_travel_minutes * INTERVAL '1 minute'))::time < rt.departure_time
              AND (cc.current_time >= rt.departure_time OR cc.current_time < (rt.departure_time + (rt.total_travel_minutes * INTERVAL '1 minute'))::time)
            )
            OR (
              (rt.departure_time + (rt.total_travel_minutes * INTERVAL '1 minute'))::time >= rt.departure_time
              AND cc.current_time >= rt.departure_time
              AND cc.current_time < (rt.departure_time + (rt.total_travel_minutes * INTERVAL '1 minute'))::time
            )
          )
      ),
      active_route_stops AS (
        SELECT
          rd.timetable_id,
          rd.departure_route_id,
          rd.stop_number,
          rd.stop_id,
          rd.travel_time,
          rd.rn,
          COALESCE(s.alias, sg.name) AS stop_group_name
        FROM route_data rd
        JOIN active_routes ar ON ar.timetable_id = rd.timetable_id
        JOIN stop s ON s.id = rd.stop_id
        JOIN stop_group sg ON sg.id = s.stop_group_id
      ),
      stop_times_calc AS (
        SELECT
          ars.*,
          SUM(CASE WHEN ars.rn = 1 THEN 0 ELSE ars.travel_time END) 
            OVER (PARTITION BY ars.departure_route_id ORDER BY ars.stop_number) AS cumulative_minutes
        FROM active_route_stops ars
      ),
      normalized_stops AS (
        SELECT
          stc.*,
          stc.cumulative_minutes - MIN(stc.cumulative_minutes) OVER (PARTITION BY stc.departure_route_id) AS normalized_minutes
        FROM stop_times_calc stc
      ),
      -- Route metadata
      route_details AS (
        SELECT DISTINCT ON (ar.departure_route_id)
          ar.departure_route_id,
          l.name AS line_name,
          l.id AS line_id,
          lt.color AS color,
          l.vehicle_type_id,
          (
            SELECT COALESCE(s.alias, sg.name)
            FROM active_route_stops ars
            JOIN stop s ON s.id = ars.stop_id
            JOIN stop_group sg ON sg.id = s.stop_group_id
            WHERE ars.departure_route_id = ar.departure_route_id
            ORDER BY ars.stop_number DESC
            LIMIT 1
          ) AS direction
        FROM active_routes ar
        JOIN route r ON ar.base_route_id = r.id
        JOIN line l ON r.line_id = l.id
        JOIN line_type lt ON l.line_type_id = lt.id
      ),
      -- Calculate stop arrival times
      stop_arrivals AS (
        SELECT
          ns.timetable_id,
          ns.departure_route_id,
          ns.stop_number,
          ns.stop_group_name,
          ar.departure_timestamp + (ns.normalized_minutes * INTERVAL '1 minute') AS arrival_time,
          ar.current_ts
        FROM normalized_stops ns
        JOIN active_routes ar ON ar.timetable_id = ns.timetable_id
      ),
      bus_position_base AS (
        SELECT
          sa.timetable_id,
          sa.departure_route_id,
          MAX(CASE WHEN sa.arrival_time <= sa.current_ts THEN sa.stop_number END) AS prev_stop_num,
          MAX(CASE WHEN sa.arrival_time <= sa.current_ts THEN sa.arrival_time END) AS prev_time,
          MIN(CASE WHEN sa.arrival_time > sa.current_ts THEN sa.stop_number END) AS next_stop_num,
          MIN(CASE WHEN sa.arrival_time > sa.current_ts THEN sa.arrival_time END) AS next_time,
          sa.current_ts,
          ar.departure_timestamp
        FROM stop_arrivals sa
        JOIN active_routes ar ON ar.timetable_id = sa.timetable_id
        GROUP BY sa.timetable_id, sa.departure_route_id, sa.current_ts, ar.departure_timestamp
      ),
      bus_position AS (
        SELECT
          bp.*,
          prev_stop.stop_group_name AS prev_stop_name,
          next_stop.stop_group_name AS next_stop_name
        FROM bus_position_base bp
        LEFT JOIN active_route_stops prev_stop 
          ON prev_stop.departure_route_id = bp.departure_route_id 
          AND prev_stop.stop_number = bp.prev_stop_num
        LEFT JOIN active_route_stops next_stop 
          ON next_stop.departure_route_id = bp.departure_route_id 
          AND next_stop.stop_number = bp.next_stop_num
      ),
      progress_calc AS (
        SELECT
          bp.*,
          EXTRACT(EPOCH FROM (bp.current_ts - COALESCE(bp.prev_time, bp.departure_timestamp))) AS elapsed_sec,
          EXTRACT(EPOCH FROM (bp.next_time - COALESCE(bp.prev_time, bp.departure_timestamp))) AS total_sec,
          CASE 
            WHEN EXTRACT(EPOCH FROM (bp.next_time - COALESCE(bp.prev_time, bp.departure_timestamp))) > 0 
            THEN GREATEST(0.0, LEAST(1.0, 
              EXTRACT(EPOCH FROM (bp.current_ts - COALESCE(bp.prev_time, bp.departure_timestamp))) / 
              EXTRACT(EPOCH FROM (bp.next_time - COALESCE(bp.prev_time, bp.departure_timestamp)))
            ))
            ELSE 0.0
          END AS progress_pct
        FROM bus_position bp
        WHERE bp.next_stop_num IS NOT NULL
      ),
      map_segment AS (
        SELECT
          pc.timetable_id,
          pc.departure_route_id,
          pc.progress_pct,
          mr.id,
          mr.lat,
          mr.lon,
          mr.stop_number
        FROM progress_calc pc
        JOIN map_route mr ON mr.departure_route_id = pc.departure_route_id
        WHERE mr.id BETWEEN 
          COALESCE((SELECT MIN(id) FROM map_route WHERE departure_route_id = pc.departure_route_id AND stop_number = pc.prev_stop_num), 
                   (SELECT MIN(id) FROM map_route WHERE departure_route_id = pc.departure_route_id))
          AND
          COALESCE((SELECT MIN(id) FROM map_route WHERE departure_route_id = pc.departure_route_id AND stop_number = pc.next_stop_num),
                   (SELECT MAX(id) FROM map_route WHERE departure_route_id = pc.departure_route_id))
      ),
      distances AS (
        SELECT
          ms.*,
          LAG(ms.lat) OVER w AS prev_lat,
          LAG(ms.lon) OVER w AS prev_lon
        FROM map_segment ms
        WINDOW w AS (PARTITION BY ms.timetable_id ORDER BY ms.id)
      ),
      segment_distances AS (
        SELECT
          d.*,
          CASE
            WHEN d.prev_lat IS NOT NULL
            THEN 6371000 * acos(LEAST(1.0, GREATEST(-1.0,
              cos(radians(d.lat)) * cos(radians(d.prev_lat)) *
              cos(radians(d.prev_lon) - radians(d.lon)) +
              sin(radians(d.lat)) * sin(radians(d.prev_lat))
            )))
            ELSE 0
          END AS seg_dist
        FROM distances d
      ),
      distance_calc AS (
        SELECT
          sd.*,
          SUM(sd.seg_dist) OVER (PARTITION BY sd.timetable_id ORDER BY sd.id) AS cum_dist,
          SUM(sd.seg_dist) OVER (PARTITION BY sd.timetable_id) AS total_dist
        FROM segment_distances sd
      ),
      bus_coords AS (
        SELECT DISTINCT ON (dc.timetable_id)
          dc.timetable_id,
          dc.progress_pct,
          ROUND(dc.total_dist::numeric, 2) AS total_dist_m,
          ROUND((dc.progress_pct * dc.total_dist)::numeric, 2) AS target_dist_m,
          (
            SELECT 
              wb.lat + COALESCE((wa.lat - wb.lat) * 
                ((dc.progress_pct * dc.total_dist - wb.cum_dist) / NULLIF(wa.cum_dist - wb.cum_dist, 0)), 0)
            FROM distance_calc wb
            CROSS JOIN LATERAL (
              SELECT lat, cum_dist
              FROM distance_calc
              WHERE timetable_id = dc.timetable_id AND cum_dist >= (dc.progress_pct * dc.total_dist)
              ORDER BY cum_dist LIMIT 1
            ) wa
            WHERE wb.timetable_id = dc.timetable_id AND wb.cum_dist <= (dc.progress_pct * dc.total_dist)
            ORDER BY wb.cum_dist DESC LIMIT 1
          ) AS bus_lat,
          (
            SELECT 
              wb.lon + COALESCE((wa.lon - wb.lon) * 
                ((dc.progress_pct * dc.total_dist - wb.cum_dist) / NULLIF(wa.cum_dist - wb.cum_dist, 0)), 0)
            FROM distance_calc wb
            CROSS JOIN LATERAL (
              SELECT lon, cum_dist
              FROM distance_calc
              WHERE timetable_id = dc.timetable_id AND cum_dist >= (dc.progress_pct * dc.total_dist)
              ORDER BY cum_dist LIMIT 1
            ) wa
            WHERE wb.timetable_id = dc.timetable_id AND wb.cum_dist <= (dc.progress_pct * dc.total_dist)
            ORDER BY wb.cum_dist DESC LIMIT 1
          ) AS bus_lon,
          (
            SELECT id FROM distance_calc
            WHERE timetable_id = dc.timetable_id AND cum_dist <= (dc.progress_pct * dc.total_dist)
            ORDER BY cum_dist DESC LIMIT 1
          ) AS waypoint_id
        FROM distance_calc dc
      )
      -- Final output
      SELECT 
        ar.departure_route_id,
        ar.departure_time AS start_time,
        ar.base_route_id,
        rd.line_name,
        rd.line_id,
        rd.vehicle_type_id,
        rd.color,
        rd.direction,
        pc.prev_stop_name AS previous_stop,
        pc.prev_stop_num,
        pc.next_stop_name AS next_stop,
        pc.next_stop_num,
        pc.progress_pct AS progress_ratio,
        pc.elapsed_sec AS elapsed_seconds,
        pc.total_sec AS total_seconds,
        bc.total_dist_m AS segment_distance_meters,
        bc.target_dist_m AS target_distance_meters,
        bc.bus_lat AS bus_latitude,
        bc.bus_lon AS bus_longitude,
        false AS stop_nearby,
        (
          SELECT ROUND(lat::numeric, 6)
          FROM map_route
          WHERE departure_route_id = ar.departure_route_id AND id > bc.waypoint_id
          ORDER BY id LIMIT 1
        ) AS next_waypoint_lat,
        (
          SELECT ROUND(lon::numeric, 6)
          FROM map_route
          WHERE departure_route_id = ar.departure_route_id AND id > bc.waypoint_id
          ORDER BY id LIMIT 1
        ) AS next_waypoint_lon
      FROM active_routes ar
      JOIN route_details rd ON ar.departure_route_id = rd.departure_route_id
      LEFT JOIN progress_calc pc ON ar.timetable_id = pc.timetable_id
      LEFT JOIN bus_coords bc ON ar.timetable_id = bc.timetable_id
      ORDER BY ar.departure_timestamp
    `);

    await client.query(`
      DROP TABLE IF EXISTS temp_context;
      DROP TABLE IF EXISTS temp_active_timetable;
      DROP TABLE IF EXISTS temp_active_stops;
      DROP TABLE IF EXISTS temp_active_stops_raw;
    `);

    return result.rows || [];
  } catch (error) {
    console.error("Query execution failed:", error);
    try {
      await client.query("DROP TABLE IF EXISTS temp_context");
      await client.query("DROP TABLE IF EXISTS temp_active_timetable");
      await client.query("DROP TABLE IF EXISTS temp_active_stops");
      await client.query("DROP TABLE IF EXISTS temp_active_stops_raw");
    } catch (cleanupError) {}
    throw error;
  } finally {
    client.release();
  }
}
async function getMapRouteEveryVehicle() {
  const pool = getPool();
  const client = await pool.connect();

  try {
    await client.query(`
      DO $$
      DECLARE
        v_current_time TIME := LOCALTIME;
        v_time_window_start TIME := (LOCALTIME - INTERVAL '2 hours')::TIME;
        v_time_window_end TIME := (LOCALTIME + INTERVAL '2 hours')::TIME;
      BEGIN
        DROP TABLE IF EXISTS temp_context;
        DROP TABLE IF EXISTS temp_active_timetable;
        DROP TABLE IF EXISTS temp_active_stops;
        DROP TABLE IF EXISTS temp_active_stops_raw;

        CREATE TEMP TABLE temp_context AS
        SELECT 
          LOCALTIMESTAMP AS current_ts,
          CURRENT_DATE AS current_date,
          LOCALTIME AS current_time;

        CREATE TEMP TABLE temp_active_timetable AS
        SELECT 
          t.id AS timetable_id,
          t.route_id AS departure_route_id,
          t.departure_time,
          dr.route_id AS base_route_id
        FROM timetable t
        JOIN departure_route dr ON t.route_id = dr.id
        WHERE 
          (v_time_window_end >= v_time_window_start AND t.departure_time BETWEEN v_time_window_start AND v_time_window_end)
          OR (v_time_window_end < v_time_window_start AND (t.departure_time >= v_time_window_start OR t.departure_time <= v_time_window_end));

        CREATE INDEX idx_temp_timetable_departure ON temp_active_timetable(departure_route_id);
        CREATE INDEX idx_temp_timetable_base ON temp_active_timetable(base_route_id);

        CREATE TEMP TABLE temp_active_stops_raw AS
        SELECT DISTINCT
          tat.departure_route_id,
          tat.base_route_id,
          fr.stop_number AS original_stop_number,
          fr.stop_id,
          fr.travel_time
        FROM temp_active_timetable tat
        JOIN full_route fr ON fr.route_id = tat.base_route_id
        WHERE 
          -- Include all non-optional stops
          fr.is_optional = FALSE
          -- Or include optional stops that are enabled in additional_stop
          OR EXISTS (
            SELECT 1 
            FROM additional_stop ads
            WHERE ads.route_id = tat.departure_route_id
              AND ads.stop_number = fr.stop_number
          );

        CREATE TEMP TABLE temp_active_stops AS
        SELECT
          departure_route_id,
          base_route_id,
          ROW_NUMBER() OVER (PARTITION BY departure_route_id ORDER BY original_stop_number) AS stop_number,
          original_stop_number,
          stop_id,
          travel_time
        FROM temp_active_stops_raw;
      END $$;
    `);

    const result = await client.query(`
      WITH current_context AS (
        SELECT * FROM temp_context
      ),
      route_data AS (
        SELECT
          tas.departure_route_id,
          tat.timetable_id,
          tat.departure_time,
          tas.base_route_id,
          tas.stop_number,
          tas.stop_id,
          tas.travel_time,
          ROW_NUMBER() OVER (PARTITION BY tas.departure_route_id ORDER BY tas.stop_number) AS rn,
          COUNT(*) OVER (PARTITION BY tas.departure_route_id) AS stop_count
        FROM temp_active_stops tas
        JOIN temp_active_timetable tat 
          ON tas.departure_route_id = tat.departure_route_id
          AND tas.base_route_id = tat.base_route_id
      ),
      route_travel AS (
        SELECT
          timetable_id,
          departure_route_id,
          departure_time,
          base_route_id,
          SUM(CASE WHEN rn = 1 THEN 0 ELSE travel_time END) AS total_travel_minutes
        FROM route_data
        GROUP BY timetable_id, departure_route_id, departure_time, base_route_id
      ),
      active_routes AS (
        SELECT 
          rt.*,
          cc.current_ts,
          cc.current_time,
          (rt.departure_time + (rt.total_travel_minutes * INTERVAL '1 minute'))::time AS end_time,
          CASE 
            WHEN (rt.departure_time + (rt.total_travel_minutes * INTERVAL '1 minute'))::time < rt.departure_time 
             AND cc.current_time < rt.departure_time
            THEN (cc.current_date - INTERVAL '1 day')::timestamp + rt.departure_time::interval
            ELSE cc.current_date::timestamp + rt.departure_time::interval
          END AS departure_timestamp
        FROM route_travel rt
        CROSS JOIN current_context cc
        WHERE rt.total_travel_minutes > 0
          AND (
            (
              (rt.departure_time + (rt.total_travel_minutes * INTERVAL '1 minute'))::time < rt.departure_time
              AND (cc.current_time >= rt.departure_time OR cc.current_time < (rt.departure_time + (rt.total_travel_minutes * INTERVAL '1 minute'))::time)
            )
            OR (
              (rt.departure_time + (rt.total_travel_minutes * INTERVAL '1 minute'))::time >= rt.departure_time
              AND cc.current_time >= rt.departure_time
              AND cc.current_time < (rt.departure_time + (rt.total_travel_minutes * INTERVAL '1 minute'))::time
            )
          )
      ),
      active_route_stops AS (
        SELECT
          rd.timetable_id,
          rd.departure_route_id,
          rd.stop_number,
          rd.stop_id,
          rd.travel_time,
          rd.rn,
          COALESCE(s.alias, sg.name) AS stop_group_name
        FROM route_data rd
        JOIN active_routes ar ON ar.timetable_id = rd.timetable_id
        JOIN stop s ON s.id = rd.stop_id
        JOIN stop_group sg ON sg.id = s.stop_group_id
      ),
      stop_times_calc AS (
        SELECT
          ars.*,
          SUM(CASE WHEN ars.rn = 1 THEN 0 ELSE ars.travel_time END) 
            OVER (PARTITION BY ars.departure_route_id ORDER BY ars.stop_number) AS cumulative_minutes
        FROM active_route_stops ars
      ),
      normalized_stops AS (
        SELECT
          stc.*,
          stc.cumulative_minutes - MIN(stc.cumulative_minutes) OVER (PARTITION BY stc.departure_route_id) AS normalized_minutes
        FROM stop_times_calc stc
      ),
      route_details AS (
        SELECT DISTINCT ON (ar.departure_route_id)
          ar.departure_route_id,
          l.name AS line_name,
          lt.color AS color,
          l.vehicle_type_id,
          (
            SELECT COALESCE(s.alias, sg.name)
            FROM active_route_stops ars
            JOIN stop s ON s.id = ars.stop_id
            JOIN stop_group sg ON sg.id = s.stop_group_id
            WHERE ars.departure_route_id = ar.departure_route_id
            ORDER BY ars.stop_number DESC
            LIMIT 1
          ) AS direction
        FROM active_routes ar
        JOIN route r ON ar.base_route_id = r.id
        JOIN line l ON r.line_id = l.id
        JOIN line_type lt ON l.line_type_id = lt.id
      ),
      stop_arrivals AS (
        SELECT
          ns.timetable_id,
          ns.departure_route_id,
          ns.stop_number,
          ns.stop_group_name,
          ar.departure_timestamp + (ns.normalized_minutes * INTERVAL '1 minute') AS arrival_time,
          ar.current_ts
        FROM normalized_stops ns
        JOIN active_routes ar ON ar.timetable_id = ns.timetable_id
      ),
      bus_position_base AS (
        SELECT
          sa.timetable_id,
          sa.departure_route_id,
          MAX(CASE WHEN sa.arrival_time <= sa.current_ts THEN sa.stop_number END) AS prev_stop_num,
          MAX(CASE WHEN sa.arrival_time <= sa.current_ts THEN sa.arrival_time END) AS prev_time,
          MIN(CASE WHEN sa.arrival_time > sa.current_ts THEN sa.stop_number END) AS next_stop_num,
          MIN(CASE WHEN sa.arrival_time > sa.current_ts THEN sa.arrival_time END) AS next_time,
          sa.current_ts,
          ar.departure_timestamp
        FROM stop_arrivals sa
        JOIN active_routes ar ON ar.timetable_id = sa.timetable_id
        GROUP BY sa.timetable_id, sa.departure_route_id, sa.current_ts, ar.departure_timestamp
      ),
      bus_position AS (
        SELECT
          bp.*,
          prev_stop.stop_group_name AS prev_stop_name,
          next_stop.stop_group_name AS next_stop_name
        FROM bus_position_base bp
        LEFT JOIN active_route_stops prev_stop 
          ON prev_stop.departure_route_id = bp.departure_route_id 
          AND prev_stop.stop_number = bp.prev_stop_num
        LEFT JOIN active_route_stops next_stop 
          ON next_stop.departure_route_id = bp.departure_route_id 
          AND next_stop.stop_number = bp.next_stop_num
      ),
      progress_calc AS (
        SELECT
          bp.*,
          EXTRACT(EPOCH FROM (bp.current_ts - COALESCE(bp.prev_time, bp.departure_timestamp))) AS elapsed_sec,
          EXTRACT(EPOCH FROM (bp.next_time - COALESCE(bp.prev_time, bp.departure_timestamp))) AS total_sec,
          CASE 
            WHEN EXTRACT(EPOCH FROM (bp.next_time - COALESCE(bp.prev_time, bp.departure_timestamp))) > 0 
            THEN GREATEST(0.0, LEAST(1.0, 
              EXTRACT(EPOCH FROM (bp.current_ts - COALESCE(bp.prev_time, bp.departure_timestamp))) / 
              EXTRACT(EPOCH FROM (bp.next_time - COALESCE(bp.prev_time, bp.departure_timestamp)))
            ))
            ELSE 0.0
          END AS progress_pct
        FROM bus_position bp
        WHERE bp.next_stop_num IS NOT NULL
      ),
      map_segment AS (
        SELECT
          pc.timetable_id,
          pc.departure_route_id,
          pc.progress_pct,
          mr.id,
          mr.lat,
          mr.lon,
          mr.stop_number
        FROM progress_calc pc
        JOIN map_route mr ON mr.departure_route_id = pc.departure_route_id
        WHERE mr.id BETWEEN 
          COALESCE((SELECT MIN(id) FROM map_route WHERE departure_route_id = pc.departure_route_id AND stop_number = pc.prev_stop_num), 
                   (SELECT MIN(id) FROM map_route WHERE departure_route_id = pc.departure_route_id))
          AND
          COALESCE((SELECT MIN(id) FROM map_route WHERE departure_route_id = pc.departure_route_id AND stop_number = pc.next_stop_num),
                   (SELECT MAX(id) FROM map_route WHERE departure_route_id = pc.departure_route_id))
      ),
      distances AS (
        SELECT
          ms.*,
          LAG(ms.lat) OVER w AS prev_lat,
          LAG(ms.lon) OVER w AS prev_lon
        FROM map_segment ms
        WINDOW w AS (PARTITION BY ms.timetable_id ORDER BY ms.id)
      ),
      segment_distances AS (
        SELECT
          d.*,
          CASE
            WHEN d.prev_lat IS NOT NULL
            THEN 6371000 * acos(LEAST(1.0, GREATEST(-1.0,
              cos(radians(d.lat)) * cos(radians(d.prev_lat)) *
              cos(radians(d.prev_lon) - radians(d.lon)) +
              sin(radians(d.lat)) * sin(radians(d.prev_lat))
            )))
            ELSE 0
          END AS seg_dist
        FROM distances d
      ),
      distance_calc AS (
        SELECT
          sd.*,
          SUM(sd.seg_dist) OVER (PARTITION BY sd.timetable_id ORDER BY sd.id) AS cum_dist,
          SUM(sd.seg_dist) OVER (PARTITION BY sd.timetable_id) AS total_dist
        FROM segment_distances sd
      ),
      bus_coords AS (
        SELECT DISTINCT ON (dc.timetable_id)
          dc.timetable_id,
          dc.progress_pct,
          ROUND(dc.total_dist::numeric, 2) AS total_dist_m,
          ROUND((dc.progress_pct * dc.total_dist)::numeric, 2) AS target_dist_m,
          (
            SELECT 
              wb.lat + COALESCE((wa.lat - wb.lat) * 
                ((dc.progress_pct * dc.total_dist - wb.cum_dist) / NULLIF(wa.cum_dist - wb.cum_dist, 0)), 0)
            FROM distance_calc wb
            CROSS JOIN LATERAL (
              SELECT lat, cum_dist
              FROM distance_calc
              WHERE timetable_id = dc.timetable_id AND cum_dist >= (dc.progress_pct * dc.total_dist)
              ORDER BY cum_dist LIMIT 1
            ) wa
            WHERE wb.timetable_id = dc.timetable_id AND wb.cum_dist <= (dc.progress_pct * dc.total_dist)
            ORDER BY wb.cum_dist DESC LIMIT 1
          ) AS bus_lat,
          (
            SELECT 
              wb.lon + COALESCE((wa.lon - wb.lon) * 
                ((dc.progress_pct * dc.total_dist - wb.cum_dist) / NULLIF(wa.cum_dist - wb.cum_dist, 0)), 0)
            FROM distance_calc wb
            CROSS JOIN LATERAL (
              SELECT lon, cum_dist
              FROM distance_calc
              WHERE timetable_id = dc.timetable_id AND cum_dist >= (dc.progress_pct * dc.total_dist)
              ORDER BY cum_dist LIMIT 1
            ) wa
            WHERE wb.timetable_id = dc.timetable_id AND wb.cum_dist <= (dc.progress_pct * dc.total_dist)
            ORDER BY wb.cum_dist DESC LIMIT 1
          ) AS bus_lon,
          (
            SELECT id FROM distance_calc
            WHERE timetable_id = dc.timetable_id AND cum_dist <= (dc.progress_pct * dc.total_dist)
            ORDER BY cum_dist DESC LIMIT 1
          ) AS waypoint_id
        FROM distance_calc dc
      )
      SELECT 
        ar.departure_route_id,
        ar.departure_time AS start_time,
        ar.base_route_id,
        rd.line_name,
        rd.vehicle_type_id,
        rd.color,
        rd.direction,
        pc.prev_stop_name AS previous_stop,
        pc.prev_stop_num,
        pc.next_stop_name AS next_stop,
        pc.next_stop_num,
        pc.progress_pct AS progress_ratio,
        pc.elapsed_sec AS elapsed_seconds,
        pc.total_sec AS total_seconds,
        bc.total_dist_m AS segment_distance_meters,
        bc.target_dist_m AS target_distance_meters,
        bc.bus_lat AS bus_latitude,
        bc.bus_lon AS bus_longitude,
        false AS stop_nearby,
        (
          SELECT ROUND(lat::numeric, 6)
          FROM map_route
          WHERE departure_route_id = ar.departure_route_id AND id > bc.waypoint_id
          ORDER BY id LIMIT 1
        ) AS next_waypoint_lat,
        (
          SELECT ROUND(lon::numeric, 6)
          FROM map_route
          WHERE departure_route_id = ar.departure_route_id AND id > bc.waypoint_id
          ORDER BY id LIMIT 1
        ) AS next_waypoint_lon
      FROM active_routes ar
      JOIN route_details rd ON ar.departure_route_id = rd.departure_route_id
      LEFT JOIN progress_calc pc ON ar.timetable_id = pc.timetable_id
      LEFT JOIN bus_coords bc ON ar.timetable_id = bc.timetable_id
      ORDER BY ar.departure_timestamp
    `);

    await client.query(`
      DROP TABLE IF EXISTS temp_context;
      DROP TABLE IF EXISTS temp_active_timetable;
      DROP TABLE IF EXISTS temp_active_stops;
      DROP TABLE IF EXISTS temp_active_stops_raw;
    `);

    return {
      vehicles: result.rows || [],
      stops: [],
    };
  } catch (error) {
    console.error("Query execution failed:", error);
    try {
      await client.query("DROP TABLE IF EXISTS temp_context");
      await client.query("DROP TABLE IF EXISTS temp_active_timetable");
      await client.query("DROP TABLE IF EXISTS temp_active_stops");
      await client.query("DROP TABLE IF EXISTS temp_active_stops_raw");
    } catch (cleanupError) {}
    throw error;
  } finally {
    client.release();
  }
}
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
