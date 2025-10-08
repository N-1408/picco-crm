-- Demo agents
INSERT INTO public.users (telegram_id, name, phone, role)
VALUES 
  (1111111, 'Ali Valiyev', '+998901111111', 'agent'),
  (2222222, 'Aziz Karimov', '+998902222222', 'agent')
ON CONFLICT (telegram_id) DO NOTHING;

-- Demo products
INSERT INTO public.products (name, description, price, stock)
VALUES
  ('Nam salfetka Classic', 'Bolalar uchun gigiyenik salfetka', 15000, 500),
  ('Bolalar tagligi', 'Turli o''lchamdagi tagliklar', 80000, 200),
  ('Quruq sochiq', 'Gigiyenik kichik o''ram', 12000, 300)
ON CONFLICT (name) DO NOTHING;

-- Demo stores
INSERT INTO public.stores (name, phone, address)
VALUES
  ('Andijon Market', '+998907777777', 'Andijon sh. Bog''bon ko''chasi 12'),
  ('Toshkent Savdo', '+998908888888', 'Toshkent sh. Chilonzor 15'),
  ('Namangan Do''kon', '+998909999999', 'Namangan sh. Mustaqillik ko''chasi 7')
ON CONFLICT (name) DO NOTHING;

-- Demo orders
WITH ali AS (
  SELECT id FROM public.users WHERE name = 'Ali Valiyev'
),
classic AS (
  SELECT id FROM public.products WHERE name = 'Nam salfetka Classic'
),
andijon AS (
  SELECT id FROM public.stores WHERE name = 'Andijon Market'
)
INSERT INTO public.orders (user_id, product_id, store_id, quantity)
SELECT ali.id, classic.id, andijon.id, 100
FROM ali, classic, andijon
WHERE NOT EXISTS (
  SELECT 1 FROM public.orders
  WHERE user_id = ali.id
    AND product_id = classic.id
    AND store_id = andijon.id
);

WITH aziz AS (
  SELECT id FROM public.users WHERE name = 'Aziz Karimov'
),
diaper AS (
  SELECT id FROM public.products WHERE name = 'Bolalar tagligi'
),
tashkent AS (
  SELECT id FROM public.stores WHERE name = 'Toshkent Savdo'
)
INSERT INTO public.orders (user_id, product_id, store_id, quantity)
SELECT aziz.id, diaper.id, tashkent.id, 50
FROM aziz, diaper, tashkent
WHERE NOT EXISTS (
  SELECT 1 FROM public.orders
  WHERE user_id = aziz.id
    AND product_id = diaper.id
    AND store_id = tashkent.id
);
