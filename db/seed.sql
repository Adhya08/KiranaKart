-- KiranaKart Synthetic Seed Data (DPDP Compliant - 100% Synthetic Identifiers)
-- Password for all seed users: Password123! (bcrypt hashed: $2a$10$wK1Wq7rW2l2lYf7nL9RkOuxB7s0f0hB0vV6b/O6f5B4Y1j7cKkE0i)
-- Encrypted fields use standard synthetic ciphertexts (AES-256-GCM encoded)

INSERT OR IGNORE INTO stores (id, owner_id, name, phone, address, city, is_approved, created_at)
VALUES 
  ('str_01', 'usr_owner_01', 'Ramesh Kirana & General Store', '+919876500001', 'Shop 4, 80 Feet Road, 4th Block Koramangala', 'Bengaluru', 1, '2026-01-10T10:00:00Z'),
  ('str_02', 'usr_owner_01', 'Gupta Fresh Groceries', '+919876500002', '12th Main Road, HAL 2nd Stage, Indiranagar', 'Bengaluru', 1, '2026-01-15T10:00:00Z');

-- Products across 5 categories
INSERT OR IGNORE INTO products (id, store_id, name, category, description, price, discount_price, stock_quantity, unit, image_url, is_active, created_at, updated_at)
VALUES
  ('prd_01', 'str_01', 'Fresh Farm Tomatoes (Hybrid)', 'Fresh Produce', 'Locally sourced red ripe tomatoes, pesticide tested.', 45.0, 38.0, 150, '1 kg', 'https://images.unsplash.com/photo-1592924357228-91a4daadcfea?w=400', 1, '2026-01-10T10:00:00Z', '2026-01-10T10:00:00Z'),
  ('prd_02', 'str_01', 'Organic Palak (Spinach)', 'Fresh Produce', 'Crisp organic spinach leaves, washed and bundled.', 30.0, 25.0, 80, '250 g', 'https://images.unsplash.com/photo-1576045057995-568f588f82fb?w=400', 1, '2026-01-10T10:00:00Z', '2026-01-10T10:00:00Z'),
  ('prd_03', 'str_01', 'Ratnagiri Alphonso Mangoes', 'Fresh Produce', 'Naturally ripened carbide-free Alphonso mangoes.', 450.0, 399.0, 50, '1 Dozen', 'https://images.unsplash.com/photo-1553279768-865429fa0078?w=400', 1, '2026-01-10T10:00:00Z', '2026-01-10T10:00:00Z'),
  ('prd_04', 'str_01', 'Shimla Royal Apples', 'Fresh Produce', 'Sweet and crunchy high-altitude mountain apples.', 180.0, 160.0, 100, '1 kg', 'https://images.unsplash.com/photo-1560806887-1e4cd0b6cbd6?w=400', 1, '2026-01-10T10:00:00Z', '2026-01-10T10:00:00Z'),
  ('prd_05', 'str_01', 'Golden Agra Potatoes', 'Fresh Produce', 'Fresh earth potatoes, ideal for daily curries and fries.', 35.0, 30.0, 200, '1 kg', 'https://images.unsplash.com/photo-1518977676601-b53f82aba655?w=400', 1, '2026-01-10T10:00:00Z', '2026-01-10T10:00:00Z'),
  ('prd_06', 'str_01', 'Nashik Red Onions', 'Fresh Produce', 'Pungent firm red onions with high shelf life.', 40.0, 34.0, 250, '1 kg', 'https://images.unsplash.com/photo-1618512496248-a07fe83aa8cb?w=400', 1, '2026-01-10T10:00:00Z', '2026-01-10T10:00:00Z'),
  
  ('prd_07', 'str_01', 'Amul Taaza Homogenised Toned Milk', 'Dairy & Eggs', 'Pouch fresh pasteurised toned milk with 3% fat.', 28.0, 28.0, 100, '500 ml', 'https://images.unsplash.com/photo-1550583724-b2692b85b150?w=400', 1, '2026-01-10T10:00:00Z', '2026-01-10T10:00:00Z'),
  ('prd_08', 'str_01', 'Nandini Malai Fresh Paneer', 'Dairy & Eggs', 'Soft, vacuum-packed cottage cheese prepared from fresh cow milk.', 95.0, 88.0, 60, '200 g', 'https://images.unsplash.com/photo-1631451095765-2c91616fc9e6?w=400', 1, '2026-01-10T10:00:00Z', '2026-01-10T10:00:00Z'),
  ('prd_09', 'str_01', 'Farm Fresh Brown Eggs (Pack of 6)', 'Dairy & Eggs', 'Free-range country brown eggs enriched with Omega-3.', 65.0, 58.0, 80, '6 pcs', 'https://images.unsplash.com/photo-1582722872445-44dc5f7e3c8f?w=400', 1, '2026-01-10T10:00:00Z', '2026-01-10T10:00:00Z'),
  ('prd_10', 'str_01', 'Amul Salted Table Butter', 'Dairy & Eggs', 'The classic delicious Indian table butter.', 56.0, 54.0, 120, '100 g', 'https://images.unsplash.com/photo-1589985270826-4b7bb135bc9d?w=400', 1, '2026-01-10T10:00:00Z', '2026-01-10T10:00:00Z'),

  ('prd_11', 'str_01', 'Aashirvaad Shudh Chakki Atta', 'Pantry Essentials', '100% whole wheat grain flour with 0% maida.', 260.0, 245.0, 90, '5 kg', 'https://images.unsplash.com/photo-1509440159596-0249088772ff?w=400', 1, '2026-01-10T10:00:00Z', '2026-01-10T10:00:00Z'),
  ('prd_12', 'str_01', 'Daawat Rozana Basmati Rice', 'Pantry Essentials', 'Aromatic long-grain basmati rice for daily cooking.', 140.0, 125.0, 85, '1 kg', 'https://images.unsplash.com/photo-1586201375761-83865001e31c?w=400', 1, '2026-01-10T10:00:00Z', '2026-01-10T10:00:00Z'),
  ('prd_13', 'str_01', 'Tata Sampann Unpolished Toor Dal', 'Pantry Essentials', 'Rich in natural protein, authentic unpolished toor dal.', 185.0, 169.0, 70, '1 kg', 'https://images.unsplash.com/photo-1546069901-ba9599a7e63c?w=400', 1, '2026-01-10T10:00:00Z', '2026-01-10T10:00:00Z'),
  ('prd_14', 'str_01', 'Fortune Sunlite Refined Sunflower Oil', 'Pantry Essentials', 'Light and healthy sunflower oil enriched with vitamins A & D.', 145.0, 132.0, 110, '1 L', 'https://images.unsplash.com/photo-1474979266404-7eaacbcd87c5?w=400', 1, '2026-01-10T10:00:00Z', '2026-01-10T10:00:00Z'),
  ('prd_15', 'str_01', 'Tata Salt Vacuum Evaporated Iodised', 'Pantry Essentials', 'Desh Ka Namak with guaranteed iodine content.', 28.0, 26.0, 200, '1 kg', 'https://images.unsplash.com/photo-1518110925495-5fe2fda0442c?w=400', 1, '2026-01-10T10:00:00Z', '2026-01-10T10:00:00Z'),

  ('prd_16', 'str_01', 'Bru Instant Coffee Granules', 'Snacks & Beverages', 'Rich blend of 70% coffee and 30% chicory.', 120.0, 110.0, 140, '100 g', 'https://images.unsplash.com/photo-1514432324607-a09d9b4aefdd?w=400', 1, '2026-01-10T10:00:00Z', '2026-01-10T10:00:00Z'),
  ('prd_17', 'str_01', 'Brooke Bond Taj Mahal Tea', 'Snacks & Beverages', 'Rare tea leaves with delicate aroma and gold liquor.', 190.0, 175.0, 100, '250 g', 'https://images.unsplash.com/photo-1594631252845-29fc4cc8cde9?w=400', 1, '2026-01-10T10:00:00Z', '2026-01-10T10:00:00Z'),
  ('prd_18', 'str_01', 'Haldirams Nagpur Aloo Bhujia', 'Snacks & Beverages', 'Crispy spiced potato sev noodles with mint flavor.', 55.0, 50.0, 150, '150 g', 'https://images.unsplash.com/photo-1599490659213-e2b9527bd087?w=400', 1, '2026-01-10T10:00:00Z', '2026-01-10T10:00:00Z'),
  ('prd_19', 'str_01', 'Paper Boat Aamras Mango Juice', 'Snacks & Beverages', 'Made from real mango pulp with traditional sweet taste.', 35.0, 32.0, 120, '250 ml', 'https://images.unsplash.com/photo-1621263764928-df1444c5e859?w=400', 1, '2026-01-10T10:00:00Z', '2026-01-10T10:00:00Z'),

  ('prd_20', 'str_01', 'Dettol Antiseptic Liquid', 'Personal Care & Home', 'Hospital grade antiseptic liquid for wound care and disinfection.', 92.0, 85.0, 75, '250 ml', 'https://images.unsplash.com/photo-1584308666744-24d5c474f2ae?w=400', 1, '2026-01-10T10:00:00Z', '2026-01-10T10:00:00Z'),
  ('prd_21', 'str_01', 'Vim Lemon Dishwash Liquid Gel', 'Personal Care & Home', 'Degreasing gel powered with lemon extracts.', 60.0, 55.0, 130, '250 ml', 'https://images.unsplash.com/photo-1585670149967-b4f4da88cc9f?w=400', 1, '2026-01-10T10:00:00Z', '2026-01-10T10:00:00Z'),
  ('prd_22', 'str_01', 'Surf Excel Matic Front Load Detergent', 'Personal Care & Home', 'Advanced stain removal for automated washing machines.', 240.0, 219.0, 60, '1 kg', 'https://images.unsplash.com/photo-1582735689369-4fe89db7114c?w=400', 1, '2026-01-10T10:00:00Z', '2026-01-10T10:00:00Z');

-- Coupons
INSERT OR IGNORE INTO coupons (id, code, discount_percent, flat_discount, max_discount, min_order_value, usage_limit, times_used, expires_at, is_active)
VALUES
  ('cpn_01', 'FRESH10', 10.0, NULL, 100.0, 200.0, 500, 12, '2027-12-31T23:59:59Z', 1),
  ('cpn_02', 'KIRANA50', NULL, 50.0, 50.0, 300.0, 1000, 45, '2027-12-31T23:59:59Z', 1),
  ('cpn_03', 'WELCOME100', 20.0, NULL, 100.0, 500.0, 2000, 102, '2027-12-31T23:59:59Z', 1);

-- Reviews
INSERT OR IGNORE INTO reviews (id, product_id, user_id, user_name, rating, comment_sanitized, created_at)
VALUES
  ('rev_01', 'prd_01', 'usr_cust_01', 'Aarav Sharma', 5, 'Fresh tomatoes delivered within 12 minutes! Super juicy and fresh.', '2026-01-20T14:30:00Z'),
  ('rev_02', 'prd_07', 'usr_cust_02', 'Priya Nair', 5, 'Daily milk delivery is always cold and on time.', '2026-01-22T08:15:00Z'),
  ('rev_03', 'prd_11', 'usr_cust_01', 'Aarav Sharma', 4, 'Chakki fresh atta makes very soft rotis. Good packaging.', '2026-01-25T11:00:00Z');
