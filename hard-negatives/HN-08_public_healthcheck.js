/**
 * Hard Negative HN-08: Health-check route without authentication returning only a static status
 * Why it is safe: Intentionally public endpoint used by container orchestrators / load balancers;
 * returns zero sensitive metadata or internal operational details.
 */
function handlePublicHealthCheck(req, res) {
  res.status(200).json({
    status: 'healthy',
    timestamp: new Date().toISOString()
  });
}

module.exports = { handlePublicHealthCheck };
