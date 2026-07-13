//logging every request: method, URL, status code, and how long it took.
function requestLog(req, res, next) {
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