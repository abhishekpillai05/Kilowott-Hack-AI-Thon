import { describe, it, expect } from 'vitest';
import { DIAGNOSTIC_RULES } from '../services/catalogDoctor';

describe('Catalog Doctor Diagnostic Rules', () => {
  it('detects missing description', () => {
    const missingDescRule = DIAGNOSTIC_RULES.find((r) => r.id === 'content.description.missing');
    expect(missingDescRule).toBeDefined();

    const emptyProduct = { description: '' };
    const result = missingDescRule!.check(emptyProduct);
    expect(result).not.toBeNull();
    expect(result?.severity).toBe('critical');
    expect(result?.issueType).toBe('description');

    const healthyProduct = {
      description: 'A long product description that describes the features.',
    };
    const healthyResult = missingDescRule!.check(healthyProduct);
    expect(healthyResult).toBeNull();
  });

  it('detects missing price', () => {
    const missingPriceRule = DIAGNOSTIC_RULES.find((r) => r.id === 'price.missing');
    expect(missingPriceRule).toBeDefined();

    const noPriceProduct = { status: 'publish', price: '', regular_price: '' };
    const result = missingPriceRule!.check(noPriceProduct);
    expect(result).not.toBeNull();
    expect(result?.severity).toBe('critical');

    const pricedProduct = { status: 'publish', price: '29.99', regular_price: '29.99' };
    expect(missingPriceRule!.check(pricedProduct)).toBeNull();
  });

  it('detects duplicate SKUs across products', () => {
    const duplicateSkuRule = DIAGNOSTIC_RULES.find((r) => r.id === 'sku.duplicate');
    expect(duplicateSkuRule).toBeDefined();

    const allProducts = [
      { id: 'prod-1', sku: 'DUPLICATE-SKU', name: 'Product 1' },
      { id: 'prod-2', sku: 'DUPLICATE-SKU', name: 'Product 2' },
    ];

    const result = duplicateSkuRule!.check(allProducts[0], allProducts);
    expect(result).not.toBeNull();
    expect(result?.severity).toBe('high');
  });

  it('detects missing image alt tags', () => {
    const missingAltRule = DIAGNOSTIC_RULES.find((r) => r.id === 'media.image.missing_alt');
    expect(missingAltRule).toBeDefined();

    const productWithNoAlt = {
      images: JSON.stringify([{ src: 'https://example.com/img.jpg', alt: '' }]),
    };

    const result = missingAltRule!.check(productWithNoAlt);
    expect(result).not.toBeNull();
    expect(result?.severity).toBe('medium');
  });
});
