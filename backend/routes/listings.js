const express = require("express");
const listingsRouter = express.Router();
const pool = require("../db");

//GET /api/properties which returns paginate and filtered property listings
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
        return res
          .status(400)
          .json({ error: `${field} must be a number` });
      }
    }

    //build WHERE clause piece by piece from whichever filters are present
    const filters = [];
    const filterValues = [];

    if (req.query.city) {
      filters.push("LOWER(TRIM(L_City)) = LOWER(TRIM(?))");
      filterValues.push(req.query.city);
    }
    if (req.query.zipcode) {
      filters.push("L_Zip = ?");
      filterValues.push(req.query.zipcode);
    }
    if (req.query.minPrice) {
      filters.push("L_SystemPrice >= ?");
      filterValues.push(Number(req.query.minPrice));
    }
    if (req.query.maxPrice) {
      filters.push("L_SystemPrice <= ?");
      filterValues.push(Number(req.query.maxPrice));
    }
    if (req.query.beds) {
      filters.push("L_Keyword2 = ?");
      filterValues.push(Number(req.query.beds));
    }
    if (req.query.baths) {
      filters.push("LM_Dec_3 = ?");
      filterValues.push(Number(req.query.baths));
    }

    //only add WHERE keyword if at least one filter exists
    const whereClause =
      filters.length > 0 ? "WHERE " + filters.join(" AND ") : "";

    //count query, total matches for these filters (ignores pagination)
    const [countResult] = await pool.query(
      `SELECT COUNT(*) AS total FROM rets_property ${whereClause}`,
      filterValues
    );
    const total = countResult[0].total;

    //page query, the current page of matching rows
    const [rows] = await pool.query(
      `SELECT * FROM rets_property ${whereClause} LIMIT ? OFFSET ?`,
      [...filterValues, pageSize, skip]
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