/**
 * Hard Negative HN-05: Assignment of a sanitised value passed through an approved sanitiser
 * Why it is safe: User content is strictly passed through an allow-list sanitiser before
 * insertion into markup, removing malicious tags, attributes, and script execution vectors.
 */
const sanitizeHtml = require('sanitize-html');

function renderSafeProductDescription(rawDescription) {
  const cleanMarkup = sanitizeHtml(rawDescription, {
    allowedTags: ['b', 'i', 'em', 'strong', 'p', 'ul', 'li', 'span'],
    allowedAttributes: {
      'span': ['class']
    }
  });

  return cleanMarkup;
}

module.exports = { renderSafeProductDescription };

