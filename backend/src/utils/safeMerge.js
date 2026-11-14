/**
 * Safe Object Deep Merge Utility
 * Prevents Prototype Pollution (C-X-06 / CWE-1321)
 * Explicitly rejects __proto__, constructor, and prototype properties.
 */

function safeDeepMerge(target, source) {
  if (!source || typeof source !== 'object') {
    return target;
  }

  const output = Array.isArray(target) ? [...target] : Object.assign(Object.create(null), target);

  for (const key of Object.keys(source)) {
    // Defense: Block prototype pollution vectors
    if (key === '__proto__' || key === 'constructor' || key === 'prototype') {
      continue;
    }

    const sourceVal = source[key];
    if (sourceVal && typeof sourceVal === 'object' && !Array.isArray(sourceVal)) {
      output[key] = safeDeepMerge(output[key] || Object.create(null), sourceVal);
    } else {
      output[key] = sourceVal;
    }
  }

  return output;
}

module.exports = { safeDeepMerge };
