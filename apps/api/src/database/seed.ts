import Database from 'better-sqlite3';
import { v4 as uuidv4 } from 'uuid';

interface SeedProduct {
  id: string;
  wc_id: number | null;
  sku: string;
  name: string;
  slug: string;
  description: string;
  short_description: string;
  price: string;
  regular_price: string;
  sale_price: string;
  status: string;
  catalog_visibility: string;
  categories: string;
  tags: string;
  images: string;
  attributes: string;
  meta_title: string;
  meta_description: string;
  stock_status: string;
  stock_quantity: number | null;
  weight: string;
  dimensions: string;
  type: string;
  health_score: number;
  issues_count: number;
  source: string;
}

export function seedDatabase(db: Database.Database): void {
  const now = new Date().toISOString();

  const products: SeedProduct[] = [
    {
      id: 'prod-001',
      wc_id: 101,
      sku: 'WR-PRO-2024',
      name: 'ProFlex Wireless Ergonomic Mouse',
      slug: 'proflex-wireless-ergonomic-mouse',
      description: `<p>The ProFlex Wireless Ergonomic Mouse is engineered for professionals who spend long hours at their workstation. Its carefully contoured shape supports a natural hand position, reducing wrist strain and cumulative fatigue.</p>
<p>A precision 3200 DPI optical sensor with four adjustable sensitivity levels ensures smooth, accurate tracking on virtually any surface — including glass. The 2.4 GHz wireless link provides a reliable, interference-resistant connection up to 10 metres from the USB nano-receiver.</p>
<ul>
  <li>3200 DPI optical sensor with 4-step DPI adjustment</li>
  <li>60-hour battery life on a single AA battery</li>
  <li>2.4 GHz wireless — up to 10 m range</li>
  <li>Ambidextrous ergonomic design</li>
  <li>5 programmable buttons</li>
  <li>USB nano-receiver stored in mouse</li>
</ul>`,
      short_description:
        'Professional wireless ergonomic mouse with 3200 DPI sensor, 60-hour battery, and ambidextrous design.',
      price: '49.99',
      regular_price: '59.99',
      sale_price: '49.99',
      status: 'publish',
      catalog_visibility: 'visible',
      categories: JSON.stringify([{ id: 1, name: 'Peripherals', slug: 'peripherals' }]),
      tags: JSON.stringify([{ name: 'wireless' }, { name: 'ergonomic' }, { name: 'mouse' }]),
      images: JSON.stringify([
        {
          src: 'https://images.unsplash.com/photo-1527864550417-7fd91fc51a46?w=800',
          alt: 'ProFlex Wireless Ergonomic Mouse — side profile on desk',
          name: 'proflex-mouse-main',
        },
      ]),
      attributes: JSON.stringify([
        { name: 'Color', options: ['Black', 'Silver'], visible: true },
        { name: 'Connectivity', options: ['Wireless 2.4 GHz'], visible: true },
        { name: 'DPI', options: ['800', '1200', '2400', '3200'], visible: true },
        { name: 'Battery', options: ['AA (included)'], visible: true },
      ]),
      meta_title: 'ProFlex Wireless Ergonomic Mouse | 3200 DPI | 60 Hr Battery',
      meta_description:
        'Shop the ProFlex wireless ergonomic mouse — 3200 DPI precision, 60-hour battery, ambidextrous. Free shipping on orders over $50.',
      stock_status: 'instock',
      stock_quantity: 145,
      weight: '0.12',
      dimensions: JSON.stringify({ length: '12', width: '6.5', height: '4' }),
      type: 'simple',
      health_score: 94,
      issues_count: 0,
      source: 'demo',
    },
    {
      id: 'prod-002',
      wc_id: 102,
      sku: 'KB-MECH-001',
      name: 'TactileForce Mechanical Keyboard',
      slug: 'tactileforce-mechanical-keyboard',
      description: '', // ← ISSUE: missing description
      short_description: '', // ← ISSUE: missing short description
      price: '89.99',
      regular_price: '89.99',
      sale_price: '',
      status: 'publish',
      catalog_visibility: 'visible',
      categories: JSON.stringify([{ id: 1, name: 'Peripherals', slug: 'peripherals' }]),
      tags: JSON.stringify([{ name: 'keyboard' }, { name: 'mechanical' }]),
      images: JSON.stringify([
        {
          src: 'https://images.unsplash.com/photo-1541140532154-b024d705b90a?w=800',
          alt: '', // ← ISSUE: missing alt
          name: 'keyboard-main',
        },
      ]),
      attributes: JSON.stringify([]), // ← ISSUE: no attributes
      meta_title: '', // ← ISSUE: no SEO
      meta_description: '',
      stock_status: 'instock',
      stock_quantity: 78,
      weight: '0.95',
      dimensions: JSON.stringify({}),
      type: 'simple',
      health_score: 22,
      issues_count: 5,
      source: 'demo',
    },
    {
      id: 'prod-003',
      wc_id: 103,
      sku: 'MON-4K-32',
      name: '4K Ultra HD Monitor 32"',
      slug: '4k-ultra-hd-monitor-32',
      description: `<p>Experience stunning 4K resolution on this premium 32-inch IPS monitor. The wide colour gamut (99% sRGB) and HDR400 support make it ideal for creative work, content creation, and immersive gaming.</p>
<p>A 178° viewing angle ensures accurate colours from virtually any position, while the ergonomic stand offers height, tilt, and pivot adjustments.</p>`,
      short_description:
        'Premium 32-inch 4K UHD IPS monitor with HDR400, 99% sRGB, and fully adjustable stand.',
      price: '', // ← ISSUE: missing price
      regular_price: '',
      sale_price: '',
      status: 'publish',
      catalog_visibility: 'visible',
      categories: JSON.stringify([{ id: 2, name: 'Monitors', slug: 'monitors' }]),
      tags: JSON.stringify([{ name: '4K' }, { name: 'monitor' }, { name: 'UHD' }]),
      images: JSON.stringify([
        {
          src: 'https://images.unsplash.com/photo-1547119957-637f8679db1e?w=800',
          alt: '32-inch 4K UHD Monitor on a standing desk',
          name: 'monitor-4k-main',
        },
      ]),
      attributes: JSON.stringify([
        { name: 'Panel Type', options: ['IPS'], visible: true },
        { name: 'Resolution', options: ['3840×2160 (4K)'], visible: true },
        { name: 'Refresh Rate', options: ['60 Hz'], visible: true },
      ]),
      meta_title: '4K Ultra HD 32" Monitor | IPS | HDR400 | 99% sRGB',
      meta_description:
        'Shop the 32-inch 4K UHD IPS monitor with HDR400. Perfect for creative professionals and gamers.',
      stock_status: 'instock',
      stock_quantity: 23,
      weight: '6.8',
      dimensions: JSON.stringify({ length: '72', width: '9', height: '50' }),
      type: 'simple',
      health_score: 52,
      issues_count: 1,
      source: 'demo',
    },
    {
      id: 'prod-004',
      wc_id: 104,
      sku: 'KB-MECH-001', // ← ISSUE: duplicate SKU (same as prod-002)
      name: 'Mechanical Gaming Keyboard RGB',
      slug: 'mechanical-gaming-keyboard-rgb',
      description:
        '<p>Level up your gaming with this RGB mechanical keyboard. Cherry MX switches deliver precise, tactile feedback for competitive advantage.</p>',
      short_description: 'RGB mechanical gaming keyboard with Cherry MX switches.',
      price: '79.99',
      regular_price: '79.99',
      sale_price: '',
      status: 'publish',
      catalog_visibility: 'visible',
      categories: JSON.stringify([{ id: 1, name: 'Peripherals', slug: 'peripherals' }]),
      tags: JSON.stringify([{ name: 'gaming' }, { name: 'keyboard' }, { name: 'RGB' }]),
      images: JSON.stringify([
        {
          src: 'https://images.unsplash.com/photo-1595225476474-87563907a212?w=800',
          alt: 'RGB Mechanical Gaming Keyboard with full-colour backlighting',
          name: 'gaming-keyboard-main',
        },
      ]),
      attributes: JSON.stringify([
        { name: 'Switch Type', options: ['Cherry MX Red'], visible: true },
        { name: 'Backlight', options: ['RGB per-key'], visible: true },
      ]),
      meta_title: 'Mechanical Gaming Keyboard RGB | Cherry MX | Full-colour Backlight',
      meta_description:
        'Dominate every match with this Cherry MX RGB mechanical gaming keyboard. Tactile, responsive, and fully customisable lighting.',
      stock_status: 'instock',
      stock_quantity: 56,
      weight: '1.1',
      dimensions: JSON.stringify({ length: '44', width: '14', height: '4' }),
      type: 'simple',
      health_score: 61,
      issues_count: 1,
      source: 'demo',
    },
    {
      id: 'prod-005',
      wc_id: null,
      sku: '', // ← ISSUE: missing SKU
      name: 'USB-C Hub 7-in-1',
      slug: 'usb-c-hub-7-in-1',
      description: `<p>Expand your laptop's connectivity with this versatile 7-in-1 USB-C hub. Features 4K HDMI output, three USB-A 3.0 ports, SD and microSD card readers, and 100 W USB-C Power Delivery pass-through charging.</p>
<p>Plug-and-play — no drivers required. Compatible with MacBook Pro, MacBook Air, iPad Pro, Dell XPS, and other USB-C laptops.</p>`,
      short_description:
        '7-in-1 USB-C hub with 4K HDMI, 3× USB-A 3.0, SD/microSD readers, and 100 W PD charging.',
      price: '34.99',
      regular_price: '44.99',
      sale_price: '34.99',
      status: 'publish',
      catalog_visibility: 'visible',
      categories: JSON.stringify([{ id: 3, name: 'Accessories', slug: 'accessories' }]),
      tags: JSON.stringify([{ name: 'USB-C' }, { name: 'hub' }, { name: 'connectivity' }]),
      images: JSON.stringify([]), // ← ISSUE: no images
      attributes: JSON.stringify([
        {
          name: 'Ports',
          options: ['HDMI 4K', 'USB-A 3.0 ×3', 'SD', 'microSD', 'USB-C PD 100 W'],
          visible: true,
        },
        {
          name: 'Compatibility',
          options: ['MacBook', 'iPad Pro', 'Windows laptops'],
          visible: true,
        },
      ]),
      meta_title: '7-in-1 USB-C Hub | 4K HDMI | 3× USB-A | 100 W PD Charging',
      meta_description:
        'Connect everything with this 7-in-1 USB-C hub. 4K HDMI output, fast USB-A ports, card reader, and 100 W PD charging.',
      stock_status: 'instock',
      stock_quantity: 210,
      weight: '0.08',
      dimensions: JSON.stringify({ length: '11', width: '4', height: '1.5' }),
      type: 'simple',
      health_score: 55,
      issues_count: 2,
      source: 'demo',
    },
    {
      id: 'prod-006',
      wc_id: 106,
      sku: 'HS-ANC-PRO',
      name: 'NoiseShield Pro ANC Headset',
      slug: 'noiseshield-pro-anc-headset',
      description: `<p>The NoiseShield Pro uses hybrid active noise cancellation to block up to 35 dB of ambient noise — whether you're in a busy office, on a flight, or working from a café.</p>
<p>40 mm neodymium drivers deliver rich, balanced audio across the full frequency range. The built-in microphone with AI noise suppression ensures crystal-clear calls even in noisy environments. Memory-foam ear cushions and a foldable design make it comfortable for extended wear and easy to carry.</p>`,
      short_description:
        'Hybrid ANC headset with 40 mm drivers, 30-hour battery, and AI-powered mic noise suppression.',
      price: '119.99',
      regular_price: '149.99',
      sale_price: '119.99',
      status: 'publish',
      catalog_visibility: 'visible',
      categories: JSON.stringify([{ id: 4, name: 'Audio', slug: 'audio' }]),
      tags: JSON.stringify([{ name: 'headset' }, { name: 'ANC' }, { name: 'wireless' }]),
      images: JSON.stringify([
        {
          src: 'https://images.unsplash.com/photo-1505740420928-5e560c06d30e?w=800',
          alt: 'NoiseShield Pro ANC Headset — over-ear, in midnight black',
          name: 'headset-main',
        },
      ]),
      attributes: JSON.stringify([
        { name: 'Driver Size', options: ['40 mm'], visible: true },
        { name: 'Connectivity', options: ['Bluetooth 5.2', '3.5 mm'], visible: true },
        { name: 'Battery Life', options: ['30 hours (ANC on)'], visible: true },
        { name: 'Noise Cancellation', options: ['Hybrid ANC (−35 dB)'], visible: true },
        { name: 'Foldable', options: ['Yes'], visible: true },
      ]),
      meta_title: 'NoiseShield Pro ANC Headset | 35 dB Noise Cancellation | 30 Hr Battery',
      meta_description:
        'Professional hybrid ANC headset. 35 dB noise cancellation, 30-hour battery, AI-powered mic. Shop NoiseShield Pro.',
      stock_status: 'instock',
      stock_quantity: 89,
      weight: '0.32',
      dimensions: JSON.stringify({ length: '20', width: '18', height: '9' }),
      type: 'simple',
      health_score: 97,
      issues_count: 0,
      source: 'demo',
    },
    // ── Demo repair product — multiple fixable issues for the demo workflow ──
    {
      id: 'prod-repair-demo',
      wc_id: null,
      sku: 'LP-STAND-ADJ',
      name: 'Laptop Stand',
      slug: 'laptop-stand',
      description: 'A laptop stand.', // ← ISSUE: weak description
      short_description: '', // ← ISSUE: missing short desc
      price: '29.99',
      regular_price: '29.99',
      sale_price: '',
      status: 'publish',
      catalog_visibility: 'visible',
      categories: JSON.stringify([{ id: 3, name: 'Accessories', slug: 'accessories' }]),
      tags: JSON.stringify([]),
      images: JSON.stringify([
        {
          src: 'https://images.unsplash.com/photo-1593642632582-db15548c0dd8?w=800',
          alt: '', // ← ISSUE: missing alt
          name: 'laptop-stand',
        },
      ]),
      attributes: JSON.stringify([]), // ← ISSUE: no attributes
      meta_title: '', // ← ISSUE: no SEO
      meta_description: '',
      stock_status: 'instock',
      stock_quantity: 55,
      weight: '0.45',
      dimensions: JSON.stringify({}),
      type: 'simple',
      health_score: 18,
      issues_count: 6,
      source: 'demo',
    },
    // ── Demo failure product — for showing safe error handling ──
    {
      id: 'prod-fail-demo',
      wc_id: 112,
      sku: 'SSD-NVMe-2TB',
      name: 'NVMe SSD 2 TB',
      slug: 'nvme-ssd-2tb',
      description:
        '<p>Blazing-fast NVMe SSD with 7400 MB/s sequential read speeds. PCIe Gen 4 interface for maximum throughput. Compatible with PlayStation 5, laptops, and desktop PCs with M.2 slots.</p>',
      short_description: '2 TB NVMe SSD with 7400 MB/s reads and PCIe Gen 4.',
      price: '189.99',
      regular_price: '189.99',
      sale_price: '',
      status: 'publish',
      catalog_visibility: 'visible',
      categories: JSON.stringify([{ id: 6, name: 'Storage', slug: 'storage' }]),
      tags: JSON.stringify([{ name: 'SSD' }, { name: 'NVMe' }, { name: 'PCIe-Gen4' }]),
      images: JSON.stringify([
        {
          src: 'https://images.unsplash.com/photo-1591488320449-011701bb6704?w=800',
          alt: 'NVMe M.2 SSD 2 TB drive — top view',
          name: 'ssd-main',
        },
      ]),
      attributes: JSON.stringify([
        { name: 'Capacity', options: ['2 TB'], visible: true },
        { name: 'Interface', options: ['PCIe Gen 4 × 4 NVMe 1.4'], visible: true },
        { name: 'Sequential Read', options: ['7400 MB/s'], visible: true },
        { name: 'Sequential Write', options: ['6500 MB/s'], visible: true },
        { name: 'Form Factor', options: ['M.2 2280'], visible: true },
      ]),
      meta_title: '2 TB NVMe SSD | PCIe Gen 4 | 7400 MB/s Read Speed',
      meta_description:
        'Upgrade storage with this 2 TB NVMe Gen 4 SSD. 7400 MB/s read, PS5 compatible, M.2 2280.',
      stock_status: 'instock',
      stock_quantity: 43,
      weight: '0.01',
      dimensions: JSON.stringify({ length: '8', width: '2.2', height: '0.23' }),
      type: 'simple',
      health_score: 92,
      issues_count: 1,
      source: 'demo',
    },
  ];

  const insertProduct = db.prepare(`
    INSERT OR REPLACE INTO products (
      id, wc_id, sku, name, slug, description, short_description, price, regular_price, sale_price,
      status, catalog_visibility, featured, categories, tags, images, attributes, variations,
      meta_title, meta_description, stock_status, stock_quantity, weight, dimensions, type,
      health_score, issues_count, source, created_at, updated_at
    ) VALUES (
      @id, @wc_id, @sku, @name, @slug, @description, @short_description, @price, @regular_price, @sale_price,
      @status, @catalog_visibility, 0, @categories, @tags, @images, @attributes, '[]',
      @meta_title, @meta_description, @stock_status, @stock_quantity, @weight, @dimensions, @type,
      @health_score, @issues_count, @source, @now, @now
    )
  `);

  db.transaction(() => {
    for (const p of products) insertProduct.run({ ...p, now });
  })();

  // ── Catalog issues ──────────────────────────────────────────────────────────
  const issues = [
    // prod-002: TactileForce Keyboard
    {
      id: 'issue-002-desc',
      product_id: 'prod-002',
      issue_type: 'description',
      severity: 'critical',
      title: 'Missing product description',
      description:
        'This product has no description. Customers cannot make informed purchase decisions without product information.',
      evidence: JSON.stringify({ description_length: 0, short_description_length: 0 }),
      recommendation:
        'Write a comprehensive description covering switch type, key layout, connectivity, build material, and compatibility.',
      auto_fixable: 1,
      rule_id: 'content.description.missing',
    },
    {
      id: 'issue-002-seo',
      product_id: 'prod-002',
      issue_type: 'seo',
      severity: 'high',
      title: 'Missing SEO metadata',
      description:
        'No meta title or meta description — this product will not rank in search results.',
      evidence: JSON.stringify({ meta_title: '', meta_description: '' }),
      recommendation:
        'Add an SEO title (50–60 chars) and description (120–160 chars) including key product terms.',
      auto_fixable: 1,
      rule_id: 'seo.meta.missing',
    },
    {
      id: 'issue-002-alt',
      product_id: 'prod-002',
      issue_type: 'media',
      severity: 'medium',
      title: 'Missing image alt text',
      description: 'The product image has no alt attribute — hurting both accessibility and SEO.',
      evidence: JSON.stringify({ image_count: 1, images_without_alt: 1 }),
      recommendation:
        'Add descriptive alt text, e.g. "TactileForce Mechanical Keyboard — full layout, dark grey".',
      auto_fixable: 1,
      rule_id: 'media.image.missing_alt',
    },
    {
      id: 'issue-002-attrs',
      product_id: 'prod-002',
      issue_type: 'attributes',
      severity: 'medium',
      title: 'No product attributes defined',
      description: 'No attributes (switch type, layout, connectivity) are set for this keyboard.',
      evidence: JSON.stringify({ attribute_count: 0 }),
      recommendation: 'Add: Switch Type, Layout, Connectivity, Backlight, Key Count.',
      auto_fixable: 0,
      rule_id: 'attributes.missing',
    },
    {
      id: 'issue-002-short',
      product_id: 'prod-002',
      issue_type: 'description',
      severity: 'medium',
      title: 'Missing short description',
      description: 'No short description is shown on product listing pages.',
      evidence: JSON.stringify({ short_description: '' }),
      recommendation: 'Add a 1–2 sentence summary for catalog listing cards.',
      auto_fixable: 1,
      rule_id: 'content.short_description.missing',
    },
    // prod-003: 4K Monitor — missing price
    {
      id: 'issue-003-price',
      product_id: 'prod-003',
      issue_type: 'price',
      severity: 'critical',
      title: 'Published product has no price',
      description: 'This live product has no price. Customers cannot add it to their cart.',
      evidence: JSON.stringify({ price: '', regular_price: '' }),
      recommendation: 'Set a valid numeric price before this product can be purchased.',
      auto_fixable: 0,
      rule_id: 'price.missing',
    },
    // prod-004: duplicate SKU
    {
      id: 'issue-004-dup-sku',
      product_id: 'prod-004',
      issue_type: 'duplicate',
      severity: 'high',
      title: 'Duplicate SKU: KB-MECH-001',
      description:
        'SKU "KB-MECH-001" is already assigned to "TactileForce Mechanical Keyboard" (prod-002). Duplicate SKUs cause order fulfilment and inventory failures.',
      evidence: JSON.stringify({
        sku: 'KB-MECH-001',
        conflicting_product_id: 'prod-002',
        conflicting_product_name: 'TactileForce Mechanical Keyboard',
      }),
      recommendation: 'Assign a unique SKU, e.g. KB-MECH-RGB-001.',
      auto_fixable: 0,
      rule_id: 'sku.duplicate',
    },
    // prod-005: missing SKU and images
    {
      id: 'issue-005-sku',
      product_id: 'prod-005',
      issue_type: 'identifier',
      severity: 'high',
      title: 'Missing SKU',
      description:
        'This product has no SKU. SKUs are essential for inventory management and order fulfilment.',
      evidence: JSON.stringify({ sku: '' }),
      recommendation:
        'Assign a unique SKU following your naming convention, e.g. USB-HUB-7IN1-001.',
      auto_fixable: 0,
      rule_id: 'sku.missing',
    },
    {
      id: 'issue-005-images',
      product_id: 'prod-005',
      issue_type: 'media',
      severity: 'high',
      title: 'No product images',
      description:
        'No images are attached to this product, significantly reducing conversion rates.',
      evidence: JSON.stringify({ image_count: 0 }),
      recommendation: 'Upload at least one high-quality product image (min 800×800 px).',
      auto_fixable: 0,
      rule_id: 'media.image.missing',
    },
    // prod-repair-demo: the primary demo repair target
    {
      id: 'issue-repair-desc',
      product_id: 'prod-repair-demo',
      issue_type: 'description',
      severity: 'critical',
      title: 'Product description is too weak',
      description:
        'The description "A laptop stand." is only 16 characters — insufficient for customer decisions or search ranking.',
      evidence: JSON.stringify({
        description: 'A laptop stand.',
        length: 16,
        min_recommended: 200,
      }),
      recommendation:
        'Write a full description covering materials, adjustability range, compatibility, ergonomic benefits, and what is included.',
      auto_fixable: 1,
      rule_id: 'content.description.weak',
    },
    {
      id: 'issue-repair-short',
      product_id: 'prod-repair-demo',
      issue_type: 'description',
      severity: 'medium',
      title: 'Missing short description',
      description: 'No short description for product listing pages.',
      evidence: JSON.stringify({ short_description: '' }),
      recommendation: 'Add a 1–2 sentence teaser for the catalog card.',
      auto_fixable: 1,
      rule_id: 'content.short_description.missing',
    },
    {
      id: 'issue-repair-seo',
      product_id: 'prod-repair-demo',
      issue_type: 'seo',
      severity: 'high',
      title: 'Missing SEO metadata',
      description: 'No meta title or description — zero search engine visibility.',
      evidence: JSON.stringify({ meta_title: '', meta_description: '' }),
      recommendation: 'Add an SEO title and description with target keywords.',
      auto_fixable: 1,
      rule_id: 'seo.meta.missing',
    },
    {
      id: 'issue-repair-alt',
      product_id: 'prod-repair-demo',
      issue_type: 'media',
      severity: 'medium',
      title: 'Missing image alt text',
      description: 'Product image has no alt attribute.',
      evidence: JSON.stringify({ images_without_alt: 1 }),
      recommendation: 'Add alt text, e.g. "Adjustable aluminium laptop stand — portrait tilt".',
      auto_fixable: 1,
      rule_id: 'media.image.missing_alt',
    },
    {
      id: 'issue-repair-attrs',
      product_id: 'prod-repair-demo',
      issue_type: 'attributes',
      severity: 'medium',
      title: 'No product attributes',
      description: 'No attributes (material, adjustable height, compatibility) defined.',
      evidence: JSON.stringify({ attribute_count: 0 }),
      recommendation: 'Add: Material, Height Range, Tilt Range, Compatibility, Included in Box.',
      auto_fixable: 0,
      rule_id: 'attributes.missing',
    },
    {
      id: 'issue-repair-tags',
      product_id: 'prod-repair-demo',
      issue_type: 'other',
      severity: 'low',
      title: 'No product tags',
      description: 'No tags to aid site search and related-product discovery.',
      evidence: JSON.stringify({ tag_count: 0 }),
      recommendation: 'Add tags: laptop-stand, ergonomic, adjustable, desk-accessories.',
      auto_fixable: 1,
      rule_id: 'taxonomy.tags.missing',
    },
    // prod-fail-demo: unverified claim
    {
      id: 'issue-fail-claim',
      product_id: 'prod-fail-demo',
      issue_type: 'description',
      severity: 'low',
      title: 'Potentially unverified PS5 compatibility claim',
      description:
        'The description states PS5 compatibility. This should be verified against official Sony M.2 expansion slot specifications before display.',
      evidence: JSON.stringify({
        claim: 'Compatible with PlayStation 5',
        source: 'description',
        concern: 'Hardware compatibility claim not validated against spec sheet',
      }),
      recommendation:
        'Verify against official PS5 M.2 spec. If confirmed, add to attributes and include heatsink requirement. If uncertain, remove claim.',
      auto_fixable: 0,
      rule_id: 'content.unverified_claim',
    },
  ];

  const insertIssue = db.prepare(`
    INSERT OR REPLACE INTO catalog_issues (
      id, product_id, issue_type, severity, title, description, evidence,
      recommendation, auto_fixable, status, rule_id, detected_by, created_at, updated_at
    ) VALUES (
      @id, @product_id, @issue_type, @severity, @title, @description, @evidence,
      @recommendation, @auto_fixable, 'open', @rule_id, 'catalog_doctor', @now, @now
    )
  `);

  db.transaction(() => {
    for (const i of issues) insertIssue.run({ ...i, now });
  })();

  // ── Audit events ────────────────────────────────────────────────────────────
  const auditEvents = [
    {
      id: uuidv4(),
      event_type: 'system.initialized',
      actor: 'system',
      product_id: null,
      metadata: JSON.stringify({
        message: 'CatalogPilot AI initialized with deterministic demo data',
        version: '1.0.0',
        products: products.length,
        issues: issues.length,
      }),
    },
  ];

  const insertAudit = db.prepare(`
    INSERT INTO audit_events (id, event_type, actor, product_id, metadata, created_at)
    VALUES (@id, @event_type, @actor, @product_id, @metadata, @now)
  `);

  db.transaction(() => {
    for (const e of auditEvents) insertAudit.run({ ...e, now });
  })();
}

if (
  process.argv[1] &&
  (process.argv[1].endsWith('seed.ts') || process.argv[1].endsWith('seed.js'))
) {
  const path = require('path');
  const fs = require('fs');
  const { runMigrations } = require('./db');
  const dbPath = path.resolve(process.env.DB_PATH || './data/catalogpilot.db');
  const dbDir = path.dirname(dbPath);
  if (!fs.existsSync(dbDir)) fs.mkdirSync(dbDir, { recursive: true });
  const db = new Database(dbPath);
  db.pragma('journal_mode = WAL');
  db.pragma('foreign_keys = ON');
  runMigrations(db);
  seedDatabase(db);
  db.close();
  console.log('✅ Database seeded with demo data');
}
