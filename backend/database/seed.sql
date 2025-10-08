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
INSERT INTO public.orders (user_id, product_id, store_id, quantity)
SELECT 
  (SELECT id FROM public.users WHERE name='Ali Valiyev'),
  (SELECT id FROM public.products WHERE name='Nam salfetka Classic'),
  (SELECT id FROM public.stores WHERE name='Andijon Market'),
  100
WHERE NOT EXISTS (
  SELECT 1 FROM public.orders WHERE quantity = 100
);

INSERT INTO public.orders (user_id, product_id, store_id, quantity)
SELECT 
  (SELECT id FROM public.users WHERE name='Aziz Karimov'),
  (SELECT id FROM public.products WHERE name='Bolalar tagligi'),
  (SELECT id FROM public.stores WHERE name='Toshkent Savdo'),
  50
WHERE NOT EXISTS (
  SELECT 1 FROM public.orders WHERE quantity = 50
);
