const express = require("express");
const path = require("path");
const cors = require("cors");
const swaggerJsDoc = require("swagger-jsdoc");
const swaggerUi = require("swagger-ui-express");
const helmet = require("helmet");
const rateLimit = require("express-rate-limit");
const compression = require("compression");
const winston = require("winston");
const expressWinston = require("express-winston");

const timetableRouter = require("./routes/timetable");
const routesRouter = require("./routes/routes");
const linesRouter = require("./routes/lines");
const stopsRouter = require("./routes/stops");
const newsRouter = require("./routes/news");
const sitemapRouter = require("./routes/sitemap");
const errorMiddleware = require("./middleware/errorMiddleware");

const app = express();
const port = process.env.PORT || 8080;

app.disable("x-powered-by");

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
        name: "Lines",
        description: "API endpoints for transport lines",
      },
      {
        name: "Stops",
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

const corsOptions = {
  origin: [
    "https://goleniowkm.pl",
    "http://localhost:8080",
    "http://localhost:8081",
    "https://*.azurewebsites.net",
  ],
  methods: ["GET"],
  maxAge: 86400,
};

app.use(cors(corsOptions));
app.use(express.json());
app.use(
  helmet({
    contentSecurityPolicy: false,
  })
);
app.use(compression());

app.use((req, res, next) => {
  res.set("X-Content-Type-Options", "nosniff");
  res.set("X-Frame-Options", "DENY");
  res.set("X-XSS-Protection", "1; mode=block");
  next();
});

app.use((req, res, next) => {
  if (req.method === "GET") {
    if (req.path.includes("/map-route/")) {
      res.set(
        "Cache-Control",
        "no-store, no-cache, must-revalidate, proxy-revalidate"
      );
      res.set("Pragma", "no-cache");
      res.set("Expires", "0");
    } else {
      res.set("Cache-Control", "public, max-age=31536000, immutable");
    }
  }
  next();
});

app.get("/robots.txt", (req, res) => {
  res.type("text/plain");
  res.send("User-agent: *\nAllow: /");
});

const apiLimiter = rateLimit({
  windowMs: 5 * 60 * 1000,
  max: 300,
  message: "Too many requests, please try again after 5 minutes",
  standardHeaders: true,
  legacyHeaders: false,
});

app.use("/api", apiLimiter);

app.use(
  expressWinston.logger({
    transports: [new winston.transports.File({ filename: "access.log" })],
    format: winston.format.combine(
      winston.format.timestamp(),
      winston.format.json()
    ),
    meta: true,
    msg: "HTTP {{req.method}} {{req.url}}",
    expressFormat: true,
  })
);

app.use("/api/timetable", timetableRouter);
app.use("/api/routes", routesRouter);
app.use("/api/lines", linesRouter);
app.use("/api/stops", stopsRouter);
app.use("/api/news", newsRouter);
app.use(sitemapRouter);

const frontendPath = path.resolve(__dirname, "public");

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
