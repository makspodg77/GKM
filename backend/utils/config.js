const config = {
  server: "sql.bsite.net\\MSSQL2016",
  authentication: {
    type: "default",
    options: {
      userName: "dorismalpa_makspodg_",
      password: "123456qwert",
    },
  },
  options: {
    database: "dorismalpa_makspodg_",
    trustServerCertificate: true,
  },
};

module.exports = config;
