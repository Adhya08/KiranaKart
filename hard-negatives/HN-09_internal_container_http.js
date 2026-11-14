/**
 * Hard Negative HN-09: HTTP (non-TLS) URL for an internal container-to-container healthcheck on an isolated network
 * Why it is safe: Confined entirely within a Docker bridge network isolated from the public internet.
 */
const INTERNAL_DOCKER_HEALTHCHECK_URL = 'http://backend:4000/health';

function isInternalHealthcheckTarget(targetUrl) {
  return targetUrl === INTERNAL_DOCKER_HEALTHCHECK_URL;
}

module.exports = { isInternalHealthcheckTarget, INTERNAL_DOCKER_HEALTHCHECK_URL };

