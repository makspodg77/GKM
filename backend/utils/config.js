require("dotenv").config();

const connectionString = process.env.CONNECTION_STRING;

const parseConnectionString = (connectionString) => {
  const params = connectionString.split(";");
  const config = {};

  params.forEach((param) => {
    const [key, value] = param.split("=");
    if (key && value) {
      config[key.trim()] = value.trim();
    }
  });

  return config;
};

const parsedConfig = parseConnectionString(connectionString);

const config = {
  server: parsedConfig.Server,
  authentication: {
    type: "default",
    options: {
      userName: parsedConfig.Uid,
      password: parsedConfig.Pwd,
    },
  },
  options: {
    database: parsedConfig.Database,
    encrypt: true,
  },
};

module.exports = config;
