const sql = require("mssql");
const config = require("./utils/config");

const dropTables = `
    DROP TABLE IF EXISTS refresh_tokens;
    DROP TABLE IF EXISTS timetable;
    DROP TABLE IF EXISTS additional_stop;
    DROP TABLE IF EXISTS departure_route;
    DROP TABLE IF EXISTS full_route;
    DROP TABLE IF EXISTS route;
    DROP TABLE IF EXISTS stop;
    DROP TABLE IF EXISTS stop_group;
    DROP TABLE IF EXISTS line;
    DROP TABLE IF EXISTS line_type;
    DROP TABLE IF EXISTS route_type;
    DROP TABLE IF EXISTS stop_type;
    DROP TABLE IF EXISTS news;
`;

const createLineTypeTable = `
    CREATE TABLE line_type (
        id INT IDENTITY(1,1) PRIMARY KEY,
        name_singular NVARCHAR(255) COLLATE Polish_100_CI_AS NOT NULL,
        name_plural NVARCHAR(255) COLLATE Polish_100_CI_AS NOT NULL,
        color NVARCHAR(255) COLLATE Polish_100_CI_AS NOT NULL
    );
`;

const createStopGroupTable = `
    CREATE TABLE stop_group (
        id BIGINT IDENTITY(1,1) PRIMARY KEY,
        name NVARCHAR(255) COLLATE Polish_100_CI_AS NOT NULL
    );
`;

const createLineTable = `
    CREATE TABLE line (
        id INT IDENTITY(1,1) PRIMARY KEY,
        name VARCHAR(255) NOT NULL,
        line_type_id INT NOT NULL,
        FOREIGN KEY (line_type_id) REFERENCES line_type(id)
    );
    CREATE INDEX line_line_type_id_index ON line(line_type_id);
`;

const createStopTable = `
    CREATE TABLE stop (
        id BIGINT IDENTITY(1,1) PRIMARY KEY,
        stop_group_id BIGINT NOT NULL,
        map NVARCHAR(255) COLLATE Polish_100_CI_AS NOT NULL,
        street NVARCHAR(255) COLLATE Polish_100_CI_AS NOT NULL,
        FOREIGN KEY (stop_group_id) REFERENCES stop_group(id)
    );
    CREATE INDEX stop_stop_group_id_index ON stop(stop_group_id);
`;

const createRouteTable = `
    CREATE TABLE route (
        id BIGINT IDENTITY(1,1) PRIMARY KEY,
        line_id INT NOT NULL,
        is_circular BIT NOT NULL DEFAULT 0,
        is_night BIT NOT NULL DEFAULT 0,
        FOREIGN KEY (line_id) REFERENCES line(id)
    );
    CREATE INDEX route_line_id_index ON route(line_id);
`;

const createFullRouteTable = `
    CREATE TABLE full_route (
        id BIGINT IDENTITY(1,1) PRIMARY KEY,
        route_id BIGINT NOT NULL,
        stop_id BIGINT NOT NULL,
        travel_time INT NOT NULL,
        is_on_request BIT NOT NULL,
        stop_number BIGINT NOT NULL,
        is_first BIT NOT NULL DEFAULT 0,
        is_last BIT NOT NULL DEFAULT 0,
        is_optional BIT NOT NULL DEFAULT 0,
        FOREIGN KEY (route_id) REFERENCES route(id),
        FOREIGN KEY (stop_id) REFERENCES stop(id)
    );
    CREATE INDEX full_route_route_id_index ON full_route(route_id);
    CREATE INDEX full_route_stop_id_index ON full_route(stop_id);
`;

const createDepartureRouteTable = `
    CREATE TABLE departure_route (
        id BIGINT IDENTITY(1,1) PRIMARY KEY,
        route_id BIGINT NOT NULL,
        signature NVARCHAR(255) COLLATE Polish_100_CI_AS NULL,
        color NVARCHAR(255) COLLATE Polish_100_CI_AS NULL,
        FOREIGN KEY (route_id) REFERENCES route(id)
    );
    CREATE INDEX departure_route_route_id_index ON departure_route(route_id);
`;

const createAdditionalStopTable = `
    CREATE TABLE additional_stop (
        id BIGINT IDENTITY(1,1) PRIMARY KEY,
        route_id BIGINT NOT NULL,
        stop_number BIGINT NOT NULL, 
        FOREIGN KEY (route_id) REFERENCES departure_route(id)
    );
    CREATE INDEX additional_stop_route_id_index ON additional_stop(route_id);
    CREATE INDEX additional_stop_stop_number_index ON additional_stop(stop_number);
`;

const createTimetableTable = `
    CREATE TABLE timetable (
        id BIGINT IDENTITY(1,1) PRIMARY KEY,
        route_id BIGINT NOT NULL,
        departure_time TIME NOT NULL,
        FOREIGN KEY (route_id) REFERENCES departure_route(id)
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

const createRefreshTokensTable = `
    CREATE TABLE refresh_tokens (
        id BIGINT IDENTITY(1,1) PRIMARY KEY,
        user_id INT NOT NULL,
        token NVARCHAR(255) COLLATE Polish_100_CI_AS NOT NULL,
        expires_at DATETIME NOT NULL,
        created_at DATETIME NOT NULL DEFAULT GETDATE(),
        FOREIGN KEY (user_id) REFERENCES users(id),
        CONSTRAINT UQ_refresh_tokens_token UNIQUE (token)
    );
    CREATE INDEX refresh_tokens_user_id_index ON refresh_tokens(user_id);
    CREATE INDEX refresh_tokens_token_index ON refresh_tokens(token);
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
    await executeQuery(createLineTypeTable);
    console.log("🔹 Finished createLineTypeTable...");
    await executeQuery(createStopGroupTable);
    console.log("🔹 Finished createStopGroupTable...");
    await executeQuery(createLineTable);
    console.log("🔹 Finished createLineTable...");
    await executeQuery(createStopTable);
    console.log("🔹 Finished createStopTable...");
    await executeQuery(createRouteTable);
    console.log("🔹 Finished createRouteTable...");
    await executeQuery(createFullRouteTable);
    console.log("🔹 Finished createFullRouteTable...");
    await executeQuery(createDepartureRouteTable);
    console.log("🔹 Finished createDepartureRouteTable...");
    await executeQuery(createAdditionalStopTable);
    console.log("🔹 Finished createAdditionalStopTable...");
    await executeQuery(createTimetableTable);
    console.log("🔹 Finished createTimetableTable...");
    await executeQuery(createNewsTable);
    console.log("🔹 Finished createNewsTable...");
    await executeQuery(createRefreshTokensTable);
    console.log("🔹 Finished createRefreshTokensTable...");

    console.log("🔹 Database initialization completed successfully.");
  } catch (err) {
    console.error("Error initializing database:", err);
  }
};

initializeTables();
