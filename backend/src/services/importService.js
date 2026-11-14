/**
 * Bulk Product Import Service
 * Security Control: C-A05-07 / CWE-611
 * XML parser configured with external entities, DTDs, and entity expansion strictly disabled (XXE defense).
 */

const { XMLParser } = require('fast-xml-parser');
const productRepo = require('../repositories/productRepo');
const cryptoService = require('./cryptoService');

function parseSafeXmlCatalog(xmlString) {
  // Reject DOCTYPE or ENTITY definitions immediately
  if (/<!DOCTYPE|<!ENTITY/i.test(xmlString)) {
    throw new Error('XML DTDs and External Entities are strictly prohibited');
  }

  const parser = new XMLParser({
    ignoreAttributes: false,
    parseAttributeValue: true,
    processEntities: false // Disable XML entity resolution to defuse billion-laughs / XXE
  });

  return parser.parse(xmlString);
}

function importBulkProducts(storeId, rawData, format = 'csv') {
  const imported = [];

  if (format === 'xml') {
    const parsed = parseSafeXmlCatalog(rawData);
    const items = parsed.catalog?.item || [];
    const arrayItems = Array.isArray(items) ? items : [items];

    for (const item of arrayItems) {
      if (!item.name || !item.price) continue;
      const product = productRepo.createProduct({
        id: `prd_${cryptoService.generateSecureToken(8)}`,
        storeId,
        name: String(item.name).slice(0, 100),
        category: String(item.category || 'Pantry Essentials').slice(0, 50),
        price: parseFloat(item.price) || 10.0,
        discountPrice: item.discountPrice ? parseFloat(item.discountPrice) : null,
        stockQuantity: parseInt(item.stock, 10) || 50,
        unit: String(item.unit || '1 unit')
      });
      imported.push(product);
    }
  } else {
    // Simple CSV parser
    const lines = rawData.split('\n').filter(l => l.trim().length > 0);
    // Format: name,category,price,stock,unit
    for (let i = 1; i < lines.length; i++) {
      const parts = lines[i].split(',').map(s => s.trim());
      if (parts.length >= 3) {
        const product = productRepo.createProduct({
          id: `prd_${cryptoService.generateSecureToken(8)}`,
          storeId,
          name: parts[0].slice(0, 100),
          category: parts[1].slice(0, 50),
          price: parseFloat(parts[2]) || 10.0,
          stockQuantity: parts[3] ? parseInt(parts[3], 10) : 50,
          unit: parts[4] || '1 unit'
        });
        imported.push(product);
      }
    }
  }

  return { importedCount: imported.length, items: imported };
}

module.exports = {
  parseSafeXmlCatalog,
  importBulkProducts
};

