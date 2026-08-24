const express = require("express");
const listingsRouter = express.Router();
const pool = require("../db");
const { buildFilterClause } = require("../utils/listingFilters");
const { buildOrderClause } = require("../utils/listingSort");

const BUCKET_COUNT = 28;

//GET /api/properties which returns paginated and filtered property listings
listingsRouter.get("/", async (req, res) => {
  try {
    const pageSize = req.query.limit !== undefined ? Number(req.query.limit) : 20;
    const skip = req.query.offset !== undefined ? Number(req.query.offset) : 0;

    if (!Number.isInteger(pageSize) || pageSize < 1 || pageSize > 100) {
      return res
        .status(400)
        .json({ error: "limit must be an integer between 1 and 100" });
    }
    if (!Number.isInteger(skip) || skip < 0) {
      return res
        .status(400)
        .json({ error: "offset must be an integer of 0 or greater" });
    }

    //validation
    const numericFilters = ["minPrice", "maxPrice", "beds", "baths"];
    for (const field of numericFilters) {
      if (req.query[field] !== undefined && isNaN(Number(req.query[field]))) {
        return res.status(400).json({ error: `${field} must be a number` });
      }
    }

    //an unrecognised sort is rejected rather than ignored, because silently
    //returning unsorted rows looks like a broken control to the user
    const { clause: orderClause, error: sortError } = buildOrderClause(req.query);
    if (sortError) {
      return res.status(400).json({ error: sortError });
    }

    //build WHERE clause from whichever filters are present
    const { conditions, values } = buildFilterClause(req.query);
    const whereClause =
      conditions.length > 0 ? "WHERE " + conditions.join(" AND ") : "";

    //count query, total matches for these filters (ignores pagination)
    const [countResult] = await pool.query(
      `SELECT COUNT(*) AS total FROM rets_property ${whereClause}`,
      values
    );
    const total = countResult[0].total;

    //page query, the current page of matching rows
    const [rows] = await pool.query(
      `SELECT * FROM rets_property ${whereClause} ${orderClause} LIMIT ? OFFSET ?`,
      [...values, pageSize, skip]
    );

    res.json({
      total: total,
      limit: pageSize,
      offset: skip,
      results: rows,
    });
  } catch (error) {
    res.status(500).json({ error: "Failed to fetch listings" });
  }
});

//GET /api/properties/price-distribution — price histogram for current non-price filters
//must be registered BEFORE /:id, or Express matches /:id greedily
listingsRouter.get("/price-distribution", async (req, res) => {
  try {
    const { conditions, values } = buildFilterClause(req.query, {
      includePrice: false,
    });
    const where =
      "WHERE " + [...conditions, "L_SystemPrice > 0"].join(" AND ");

    //cap at the 95th percentile so a single outlier does not flatten the chart
    const [boundsRows] = await pool.query(
      `WITH ranked AS (
         SELECT L_SystemPrice AS p,
                PERCENT_RANK() OVER (ORDER BY L_SystemPrice) AS pr
         FROM rets_property ${where}
       )
       SELECT MIN(p) AS low,
              MAX(CASE WHEN pr <= 0.95 THEN p END) AS ceiling,
              MAX(p) AS high,
              COUNT(*) AS n
       FROM ranked`,
      values
    );

    const bounds = boundsRows[0];

    if (!bounds || !bounds.n) {
      return res.json({
        low: 0,
        high: 0,
        bucketSize: 0,
        buckets: [],
        capped: false,
      });
    }

    const low = Number(bounds.low);
    const ceiling = Number(bounds.ceiling ?? bounds.high);
    const high = Number(bounds.high);
    const span = Math.max(ceiling - low, 1);
    const bucketSize = Math.ceil(span / BUCKET_COUNT);

    const [bucketRows] = await pool.query(
      `SELECT LEAST(FLOOR((L_SystemPrice - ?) / ?), ?) AS idx, COUNT(*) AS n
       FROM rets_property ${where}
       GROUP BY idx
       ORDER BY idx`,
      [low, bucketSize, BUCKET_COUNT - 1, ...values]
    );

    const counts = new Array(BUCKET_COUNT).fill(0);
    bucketRows.forEach((row) => {
      const i = Number(row.idx);
      if (i >= 0 && i < BUCKET_COUNT) counts[i] = Number(row.n);
    });

    res.json({
      low,
      high: low + bucketSize * BUCKET_COUNT,
      trueHigh: high,
      capped: ceiling < high,
      bucketSize,
      buckets: counts,
    });
  } catch (error) {
    res.status(500).json({ error: "Failed to build price distribution" });
  }
});

//GET /api/properties/:id/openhouses — open house events for one property
//must be registered BEFORE /:id, or Express matches /:id greedily
listingsRouter.get("/:id/openhouses", async (req, res) => {
  try {
    const listingId = req.params.id;

    if (!listingId || listingId.length > 50) {
      return res.status(400).json({ error: "Invalid listing ID" });
    }

    //confirm the property exists first — a missing property is a 404
    const [propertyRows] = await pool.query(
      "SELECT L_ListingID FROM rets_property WHERE L_ListingID = ?",
      [listingId]
    );

    if (propertyRows.length === 0) {
      return res
        .status(404)
        .json({ error: `No property found with listing ID ${listingId}` });
    }

    //fetch the open houses, ordered by date then start time
    const [openHouseRows] = await pool.query(
      `SELECT * FROM rets_openhouse
       WHERE L_ListingID = ?
       ORDER BY OpenHouseDate, OH_StartTime`,
      [listingId]
    );

    //empty array is a valid answer, the property just has no events
    res.json(openHouseRows);
  } catch (error) {
    res.status(500).json({ error: "Failed to fetch open houses" });
  }
});

//GET /api/properties/:id — returns one property, or 404 if not found
listingsRouter.get("/:id", async (req, res) => {
  try {
    const listingId = req.params.id;

    //validate the ID before it touches the database
    if (!listingId || listingId.length > 50) {
      return res.status(400).json({ error: "Invalid listing ID" });
    }

    const [rows] = await pool.query(
      "SELECT * FROM rets_property WHERE L_ListingID = ?",
      [listingId]
    );

    if (rows.length === 0) {
      return res
        .status(404)
        .json({ error: `No property found with listing ID ${listingId}` });
    }

    res.json(rows[0]);
  } catch (error) {
    res.status(500).json({ error: "Failed to fetch property" });
  }
});

module.exports = listingsRouter;