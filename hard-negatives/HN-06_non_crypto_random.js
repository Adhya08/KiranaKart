/**
 * Hard Negative HN-06: Random number use exclusively for UI animation or jitter
 * Why it is safe: Math.random() is used only for non-security UI effects (e.g. staggering animation
 * delays for grocery card rendering), while CSPRNG (crypto.randomBytes) is used for tokens & OTPs.
 */
function calculateUiCardStaggerDelay(itemIndex) {
  // Safe: Non-cryptographic visual animation jitter
  const visualJitterMs = Math.floor(Math.random() * 50);
  return (itemIndex * 80) + visualJitterMs;
}

module.exports = { calculateUiCardStaggerDelay };

