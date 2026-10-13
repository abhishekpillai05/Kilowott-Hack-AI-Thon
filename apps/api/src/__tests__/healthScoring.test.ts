import { describe, it, expect } from 'vitest';
import { calculateHealthScore, scoreLabel } from '../services/healthScoring';

describe('Health Scoring Service', () => {
  it('gives 100/100 to a fully optimized product', () => {
    const perfectProduct = {
      description: 'A'.repeat(350),
      short_description: 'B'.repeat(60),
      meta_title: 'ProFlex Ergonomic Wireless Mouse - Official Store',
      meta_description:
        'Discover the ergonomic wireless mouse engineered for precision, comfort, and all-day battery life. Free shipping on orders over $50.',
      images: [
        { src: 'https://example.com/1.jpg', alt: 'Front view' },
        { src: 'https://example.com/2.jpg', alt: 'Side view' },
        { src: 'https://example.com/3.jpg', alt: 'In-hand angle' },
      ],
      attributes: [
        { name: 'Color', options: ['Black'] },
        { name: 'DPI', options: ['4000'] },
        { name: 'Connectivity', options: ['Bluetooth', '2.4GHz'] },
        { name: 'Battery', options: ['Rechargeable'] },
      ],
      sku: 'PF-MOUSE-01',
      price: '59.99',
    };

    const breakdown = calculateHealthScore(perfectProduct);
    expect(breakdown.total).toBe(100);
    expect(breakdown.description).toBe(25);
    expect(breakdown.seo).toBe(20);
    expect(breakdown.media).toBe(20);
    expect(breakdown.attributes).toBe(15);
    expect(breakdown.identifier).toBe(10);
    expect(breakdown.price).toBe(10);
  });

  it('calculates score correctly for an empty/deficient product', () => {
    const emptyProduct = {};
    const breakdown = calculateHealthScore(emptyProduct);
    expect(breakdown.total).toBe(0);
    expect(breakdown.description).toBe(0);
    expect(breakdown.seo).toBe(0);
    expect(breakdown.media).toBe(0);
    expect(breakdown.attributes).toBe(0);
    expect(breakdown.identifier).toBe(0);
    expect(breakdown.price).toBe(0);
  });

  it('properly penalizes missing alt tags in media dimension', () => {
    const productWithNoAlt = {
      images: [
        { src: 'https://example.com/1.jpg' },
        { src: 'https://example.com/2.jpg' },
        { src: 'https://example.com/3.jpg' },
      ],
    };
    const breakdown = calculateHealthScore(productWithNoAlt);
    // 3 images = 12 pts, 0 alt tags = 0 pts for altRatio
    expect(breakdown.media).toBe(12);
  });

  it('correctly categorizes score labels', () => {
    expect(scoreLabel(95)).toBe('Excellent');
    expect(scoreLabel(80)).toBe('Good');
    expect(scoreLabel(60)).toBe('Fair');
    expect(scoreLabel(30)).toBe('Poor');
    expect(scoreLabel(10)).toBe('Critical');
  });
});
