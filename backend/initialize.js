const sql = require("mssql");
const config = require("./utils/config");

const dropTables = `
    DROP TABLE IF EXISTS timetable;
    DROP TABLE IF EXISTS routes;
    DROP TABLE IF EXISTS full_routes;
    DROP TABLE IF EXISTS stops;
    DROP TABLE IF EXISTS stop_groups;
    DROP TABLE IF EXISTS lines;
    DROP TABLE IF EXISTS line_types;
    DROP TABLE IF EXISTS route_types;
    DROP TABLE IF EXISTS stop_types;
    DROP TABLE IF EXISTS news;
    DROP TABLE IF EXISTS users;
`;

const createLineTypesTable = `
    CREATE TABLE line_types (
        id INT IDENTITY(1,1) PRIMARY KEY,
        nameSingular NVARCHAR(255) COLLATE Polish_100_CI_AS NOT NULL,
        namePlural NVARCHAR(255) COLLATE Polish_100_CI_AS NOT NULL,
        color NVARCHAR(255) COLLATE Polish_100_CI_AS NOT NULL
    );
`;

const createStopGroupsTable = `
    CREATE TABLE stop_groups (
        id BIGINT IDENTITY(1,1) PRIMARY KEY,
        name NVARCHAR(255) COLLATE Polish_100_CI_AS NOT NULL
    );
`;

const createStopTypesTable = `
    CREATE TABLE stop_types (
        id BIGINT IDENTITY(1,1) PRIMARY KEY,
        name NVARCHAR(255) COLLATE Polish_100_CI_AS NOT NULL
    );
`;

const createRouteTypesTable = `
    CREATE TABLE route_types (
        id BIGINT IDENTITY(1,1) PRIMARY KEY,
        name NVARCHAR(255) COLLATE Polish_100_CI_AS NOT NULL
    );
`;

const createLinesTable = `
    CREATE TABLE lines (
        id INT IDENTITY(1,1) PRIMARY KEY,
        name VARCHAR(255) NOT NULL,
        line_type_id INT NOT NULL,
        FOREIGN KEY (line_type_id) REFERENCES line_types(id)
    );
    CREATE INDEX lines_line_type_id_index ON lines(line_type_id);
`;

const createStopsTable = `
    CREATE TABLE stops (
        id BIGINT IDENTITY(1,1) PRIMARY KEY,
        stop_group_id BIGINT NOT NULL,
        map NVARCHAR(255) COLLATE Polish_100_CI_AS NOT NULL,
        street NVARCHAR(255) COLLATE Polish_100_CI_AS NOT NULL,
        FOREIGN KEY (stop_group_id) REFERENCES stop_groups(id)
    );
    CREATE INDEX stops_stop_group_id_index ON stops(stop_group_id);
`;

const createFullRoutesTable = `
    CREATE TABLE full_routes (
        id BIGINT IDENTITY(1,1) PRIMARY KEY,
        line_id INT NOT NULL,
        stop_group_id BIGINT NOT NULL,
        stop_id BIGINT NOT NULL,
        route_number BIGINT NOT NULL,
        travel_time INT NOT NULL,
        is_on_request BIT NOT NULL,
        stop_number BIGINT NOT NULL,
        route_type_id BIGINT NOT NULL,
        stop_type BIGINT NOT NULL,
        FOREIGN KEY (line_id) REFERENCES lines(id),
        FOREIGN KEY (stop_group_id) REFERENCES stop_groups(id),
        FOREIGN KEY (stop_id) REFERENCES stops(id),
        FOREIGN KEY (route_type_id) REFERENCES route_types(id),
        FOREIGN KEY (stop_type) REFERENCES stop_types(id)
    );
    CREATE INDEX full_routes_stop_group_id_index ON full_routes(stop_group_id);
    CREATE INDEX full_routes_stop_id_index ON full_routes(stop_id);
    CREATE INDEX full_routes_route_type_id_index ON full_routes(route_type_id);
    CREATE INDEX full_routes_stop_type_index ON full_routes(stop_type);
`;

const createRoutesTable = `
    CREATE TABLE routes (
        id BIGINT IDENTITY(1,1) PRIMARY KEY,
        full_route_number BIGINT NOT NULL,
        additional_stop_id BIGINT NOT NULL,
        FOREIGN KEY (full_route_number) REFERENCES full_routes(route_number)
    );
`;

const createTimetableTable = `
    CREATE TABLE timetable (
        id BIGINT IDENTITY(1,1) PRIMARY KEY,
        route_number BIGINT NOT NULL,
        departure_time NVARCHAR(255) COLLATE Polish_100_CI_AS NOT NULL,
        FOREIGN KEY (route_number) REFERENCES routes(route_number)
    );
    CREATE INDEX timetable_route_id_index ON timetable(route_id);
`;

const createNewsTable = `
    CREATE TABLE news (
        id BIGINT PRIMARY KEY IDENTITY(1,1),
        title NVARCHAR(255) COLLATE Polish_100_CI_AS NOT NULL,
        content NVARCHAR(MAX) COLLATE Polish_100_CI_AS NOT NULL,
        created_at DATETIME DEFAULT GETDATE()
    );
`;

const createUsersTable = `
    CREATE TABLE users (
        id INT IDENTITY(1,1) PRIMARY KEY,
        username VARCHAR(50) NOT NULL UNIQUE,
        password VARCHAR(255) NOT NULL,
        role VARCHAR(20) NOT NULL DEFAULT 'user',
        created_at DATETIME DEFAULT GETDATE(),
        last_login DATETIME
    );
`;

let poolPromise;

const getPool = () => {
  if (!poolPromise) {
    poolPromise = new sql.ConnectionPool(config.database)
      .connect()
      .then((pool) => {
        console.log("Connected to SQL Server");
        return pool;
      })
      .catch((err) => {
        console.error("Database Connection Failed! Bad Config: ", err);
        poolPromise = null;
        throw err;
      });
  }
  return poolPromise;
};

const executeQuery = async (query) => {
  try {
    const pool = await getPool();
    const result = await pool.request().query(query);
    console.log("Query executed successfully.");
    return result;
  } catch (err) {
    console.error("Error executing query:", err);
    throw err;
  }
};

const initializeTables = async () => {
  try {
    console.log("🔹 Dropping existing tables...");
    await executeQuery(dropTables);

    console.log("🔹 Creating tables...");
    await executeQuery(createLineTypesTable);
    await executeQuery(createStopGroupsTable);
    await executeQuery(createStopTypesTable);
    await executeQuery(createRouteTypesTable);
    await executeQuery(createLinesTable);
    await executeQuery(createStopsTable);
    await executeQuery(createFullRoutesTable);
    await executeQuery(createRoutesTable);
    await executeQuery(createTimetableTable);
    await executeQuery(createNewsTable);
    await executeQuery(createUsersTable);

    console.log("🔹 Database initialization completed successfully.");
  } catch (err) {
    console.error("Error initializing database:", err);
  }
};

initializeTables();
