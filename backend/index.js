const express = require("express");
const path = require("path");
const cors = require("cors");
const swaggerJsDoc = require("swagger-jsdoc");
const swaggerUi = require("swagger-ui-express");

const timetableRouter = require("./routes/timetable");
const routesRouter = require("./routes/routes");
const linesRouter = require("./routes/lines");
const stopsRouter = require("./routes/stops");
const newsRouter = require("./routes/news");
const errorMiddleware = require("./middleware/errorMiddleware");

const app = express();
const port = process.env.PORT || 8080;

const swaggerOptions = {
  swaggerDefinition: {
    openapi: "3.0.0",
    info: {
      title: "GKM API",
      version: "1.0.0",
      description:
        "API documentation for Goleniów City Public Transport (GKM) project",
      contact: {
        name: "discord: maxymilian",
      },
      license: {
        name: "MIT",
        url: "https://opensource.org/licenses/MIT",
      },
    },
    servers: [
      {
        url: `http://localhost:${port}`,
        description: "Development server",
      },
      {
        url: "https://gkm-f6bbd9gmhnd7g6ft.northeurope-01.azurewebsites.net",
        description: "Production server",
      },
      {
        url: "https://goleniowkm.pl",
        description: "Production server (Custom Domain)",
      },
    ],
    components: {
      schemas: {
        Error: {
          type: "object",
          properties: {
            message: {
              type: "string",
              description: "Error message",
            },
            code: {
              type: "integer",
              description: "Error code",
            },
          },
        },
      },
      responses: {
        InternalServerError: {
          description: "Internal Server Error",
          content: {
            "application/json": {
              schema: {
                $ref: "#/components/schemas/Error",
              },
            },
          },
        },
      },
    },
    tags: [
      {
        name: "Transport Lines",
        description: "API endpoints for transport lines",
      },
      {
        name: "Transport Stops",
        description: "API endpoints for transport stops",
      },
      {
        name: "Timetable",
        description: "API endpoints for timetable data",
      },
      {
        name: "Routes",
        description: "API endpoints for routes",
      },
      {
        name: "News",
        description: "API endpoints for news",
      },
    ],
  },
  apis: ["./routes/*.js"],
};

const swaggerDocs = swaggerJsDoc(swaggerOptions);
app.use(
  "/api-docs",
  swaggerUi.serve,
  swaggerUi.setup(swaggerDocs, {
    explorer: true,
    customCss: ".swagger-ui .topbar { display: none }",
    customSiteTitle: "GKM API Documentation",
  })
);

app.use(cors());
app.use(express.json());

app.use("/api/timetable", timetableRouter);
app.use("/api/routes", routesRouter);
app.use("/api/lines", linesRouter);
app.use("/api/stops", stopsRouter);
app.use("/api/news", newsRouter);

const frontendPath = path.resolve(__dirname, "..", "frontend", "dist");
console.log(`Serving static files from: ${frontendPath}`);
app.use(express.static(frontendPath));

app.get("*", (req, res) => {
  res.sendFile(path.join(frontendPath, "index.html"));
});

app.use(errorMiddleware);

app.listen(port, () => {
  console.log(`Server is running on http://localhost:${port}`);
  console.log(
    `API documentation available at http://localhost:${port}/api-docs`
  );
});
