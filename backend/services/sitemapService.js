const { executeQuery } = require("../utils/sqlHelper");

const STATIC_ROUTES = [
  { path: "/", changefreq: "daily", priority: "1.0" },
  {
    path: "/rozklad-jazdy-wedlug-linii",
    changefreq: "daily",
    priority: "0.9",
  },
  { path: "/linie", changefreq: "weekly", priority: "0.7" },
  {
    path: "/rozklady-jazdy/wedlug-przystankow",
    changefreq: "daily",
    priority: "0.8",
  },
  {
    path: "/mapa-pojazdow-i-przystankow",
    changefreq: "hourly",
    priority: "0.8",
  },
  { path: "/aktualnosci", changefreq: "weekly", priority: "0.6" },
  { path: "/o-projekcie", changefreq: "monthly", priority: "0.5" },
];

const today = () => new Date().toISOString().split("T")[0];

const escapeXml = (value) =>
  value
    .replace(/&/g, "&amp;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&apos;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;");

const buildUrlEntry = ({
  loc,
  lastmod = today(),
  changefreq = "weekly",
  priority = "0.5",
}) => `  <url>
    <loc>${escapeXml(loc)}</loc>
    <lastmod>${lastmod}</lastmod>
    <changefreq>${changefreq}</changefreq>
    <priority>${priority}</priority>
  </url>`;

const fetchDynamicEntries = async () => {
  const [lineRows, stopGroupRows, routeStopRows] = await Promise.all([
    executeQuery("SELECT id FROM line ORDER BY id"),
    executeQuery("SELECT id FROM stop_group ORDER BY id"),
    executeQuery(
      `SELECT DISTINCT fr.route_id, fr.stop_number
       FROM full_route fr
       ORDER BY fr.route_id, fr.stop_number`
    ),
  ]);

  return {
    lines: lineRows,
    stopGroups: stopGroupRows,
    routeStops: routeStopRows,
  };
};

const resolveBaseUrl = (req) => {
  if (process.env.PUBLIC_BASE_URL) {
    return process.env.PUBLIC_BASE_URL.replace(/\/$/, "");
  }

  const host = (
    req.get("x-forwarded-host") ||
    req.get("host") ||
    "goleniowkm.pl"
  ).replace(/\/$/, "");
  const isLocalhost = host.includes("localhost") || host.includes("127.0.0.1");
  const protocol = isLocalhost ? req.protocol || "http" : "https";

  return `${protocol}://${host}`;
};

const buildSitemap = async (req) => {
  const baseUrl = resolveBaseUrl(req);
  const { lines, stopGroups, routeStops } = await fetchDynamicEntries();
  const currentDate = today();

  const staticEntries = STATIC_ROUTES.map((item) =>
    buildUrlEntry({
      loc: `${baseUrl}${item.path === "/" ? "" : item.path}`,
      changefreq: item.changefreq,
      priority: item.priority,
      lastmod: currentDate,
    })
  );

  const lineEntries = lines.map((line) =>
    buildUrlEntry({
      loc: `${baseUrl}/rozklad-jazdy-wedlug-linii/${line.id}`,
      changefreq: "daily",
      priority: "0.8",
      lastmod: currentDate,
    })
  );

  const stopEntries = stopGroups.map((group) =>
    buildUrlEntry({
      loc: `${baseUrl}/zespol-przystankowy/${group.id}`,
      changefreq: "daily",
      priority: "0.6",
      lastmod: currentDate,
    })
  );

  const routeStopEntries = routeStops.map((row) =>
    buildUrlEntry({
      loc: `${baseUrl}/rozklad-jazdy-wedlug-linii/${row.route_id}/${row.stop_number}`,
      changefreq: "daily",
      priority: "0.6",
      lastmod: currentDate,
    })
  );

  const xml = [
    '<?xml version="1.0" encoding="UTF-8"?>',
    '<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">',
    ...staticEntries,
    ...lineEntries,
    ...stopEntries,
    ...routeStopEntries,
    "</urlset>",
  ].join("\n");

  return xml;
};

module.exports = {
  buildSitemap,
};
