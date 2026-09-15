//logging every request: method, URL, status code, and how long it took.
function requestLog(req, res, next) {
  //the test suite drives hundreds of requests through this; logging each one
  //buries the actual test results
  if (process.env.NODE_ENV === "test") return next();

  const startedAt = Date.now();

  //finish fires once the response has been fully sent
  res.on("finish", () => {
    const elapsedMs = Date.now() - startedAt;
    const stamp = new Date().toISOString();
    console.log(
      `[${stamp}] ${req.method} ${req.originalUrl} ${res.statusCode} - ${elapsedMs}ms`
    );
  });

  next();
}

module.exports = requestLog;