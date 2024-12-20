require("dotenv").config();

const connectionString =
  "Driver={ODBC Driver 17 for SQL Server};Server=sql.bsite.net\\MSSQL2016;Database=makspodg_;Uid=makspodg_;Pwd=ni25#ttS8!RwUiT;";

module.exports = {
  CONNECTION_STRING: connectionString,
};
