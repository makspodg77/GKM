const express = require("express");
const router = express.Router();
const { asyncHandler } = require("../utils/errorHandler");
const { buildSitemap } = require("../services/sitemapService");

router.get(
  "/sitemap.xml",
  asyncHandler(async (req, res) => {
    const xml = await buildSitemap(req);
    res.type("application/xml");
    res.set("Cache-Control", "public, max-age=43200");
    res.send(xml);
  })
);

module.exports = router;
