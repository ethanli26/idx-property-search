const express = require("express");
const cors = require("cors");
const listingsRouter = require("./routes/listings");
const requestLog = require("./middleware/requestLog");
const pool = require("./db");

//The Express app is built here but never started. index.js owns the listening,
//so tests can import the app and drive it through supertest without binding a
//port, and without a stray server left running after the suite finishes.
const app = express();

app.use(cors());
app.use(express.json());
app.use(requestLog);
app.use("/api/properties", listingsRouter);

app.get("/api/health", async (req, res) => {
  try {
    await pool.query("SELECT 1");
    res.json({
      status: "ok",
      database: "connected",
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    res.status(500).json({ status: "error", database: "disconnected" });
  }
});

module.exports = app;
