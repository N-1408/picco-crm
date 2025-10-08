# Prompt: PICCO Mini App (Telegram Mini App + CRM)

🎯 **Vazifa**

PICCO brendi uchun Telegram Mini App (WebApp) yarat. Ilova mobil-friendly va barcha ekranlarga (mobil, planshet, PC) mos bo‘lsin. UI zamonaviy, minimalistik, ammo professional bo‘lishi kerak.

Ilova CRM xususiyatlariga ega bo‘ladi: agentlar buyurtma qo‘shadi, do‘konlar bilan ishlaydi, adminlar esa mahsulotlar va statistika ustidan nazorat qiladi.

---

🔑 **Telegram Bot Logikasi**

User birinchi marta /start bosadi.  

- Bot → ism-familiyani so‘raydi.  
- User ism yuboradi.  
- Bot → telefon raqamini request_contact tugmasi orqali oladi.  
- User raqam yuboradi.  
- Backend foydalanuvchini Supabase’da users jadvaliga yozadi (role=agent).  
- Bot → foydalanuvchiga xabar yuboradi:  

“Tabriklaymiz 🎉! Siz muvaffaqqiyatli ro‘yxatdan o‘tdingiz va endi PICCO kompaniyasining rasmiy agentisiz.”  

Bot tugmalar chiqaradi:  
- 🧑‍💼 Agent Paneli (WebApp link)  
- 👑 Admin Paneli (shu ham umumiy WebApp link)  

Agar user ro‘yxatdan o‘tmagan bo‘lsa va WebApp tugmasini bossa → “Avval bot orqali ro‘yxatdan o‘ting” sahifasi chiqadi.  

---

🧑‍💼 **Agent Flow**

Kirish: login/parol talab qilinmaydi. Telegram ID orqali aniqlanadi.  

**Agent Dashboard:**  
- 📦 Buyurtma qo‘shish: mahsulot tanlash, miqdor kiritish, do‘kon tanlash.  
- 🏪 Do‘konlar: agentga tegishli do‘konlar ro‘yxati, yangi do‘kon qo‘shish.  
- 📊 Statistika: agent o‘z sotuvlarini grafiklarda ko‘radi.  

**Feedback:**  
- ✅ Modal (yashil): “Buyurtma muvaffaqqiyatli qo‘shildi.”  
- ❌ Modal (qizil): “Xatolik yuz berdi.”  

---

👑 **Admin Flow**

Super-admin avtomatik mavjud:  
- Login: Admin  
- Parol: Picco0000  

Super-admin yangi admin qo‘shishi mumkin (login + parol bilan).  
Adminlar faqat login/parol orqali tizimga kiradi.  

**Admin Dashboard (sidebar bilan):**  
- 📦 Mahsulotlar: CRUD (qo‘shish, tahrirlash, o‘chirish)  
- 🏪 Do‘konlar: CRUD (yangi do‘kon qo‘shish, agentga biriktirish)  
- 📊 Statistika:  
  - Agentlar bo‘yicha sotuv grafigi  
  - Mahsulotlar bo‘yicha ulush  
  - Oylik sotuv dinamikasi  
  - Export → Excel / PDF  
- 👥 Agentlar: barcha agentlar ro‘yxati, sotuv hajmi, shaxsiy statistika.  
- 🔑 Admin boshqaruvi:  
  - Admin parolini o‘zgartirish  
  - Yangi admin qo‘shish (faqat super-admin)  
  - ⚠ Ma’lumotlarni tozalash tugmasi (faqat super-admin, ogohlantirish modal bilan)  

---

🗄️ **Supabase Database Strukturasi**

```sql
CREATE TABLE users (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    telegram_id BIGINT UNIQUE NOT NULL,
    name TEXT NOT NULL,
    phone TEXT NOT NULL,
    role TEXT DEFAULT 'agent',
    created_at TIMESTAMP DEFAULT now()
);

CREATE TABLE admins (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    username TEXT UNIQUE NOT NULL,
    password_hash TEXT NOT NULL,
    created_at TIMESTAMP DEFAULT now()
);

CREATE TABLE products (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name TEXT NOT NULL,
    description TEXT,
    price NUMERIC(10,2) NOT NULL,
    stock INT DEFAULT 0,
    created_at TIMESTAMP DEFAULT now()
);

CREATE TABLE stores (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name TEXT NOT NULL,
    phone TEXT,
    address TEXT,
    location JSONB,
    agent_id UUID REFERENCES users(id) ON DELETE SET NULL,
    created_at TIMESTAMP DEFAULT now()
);

CREATE TABLE orders (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES users(id) ON DELETE CASCADE,
    product_id UUID REFERENCES products(id) ON DELETE CASCADE,
    store_id UUID REFERENCES stores(id) ON DELETE CASCADE,
    quantity INT NOT NULL,
    created_at TIMESTAMP DEFAULT now()
);

-- Super admin qo‘shish
INSERT INTO admins (username, password_hash)
VALUES ('Admin', crypt('Picco0000', gen_salt('bf')));
```

---

📊 **Demo Data (boshlang‘ich to‘ldirish)**

```sql
-- Agents
INSERT INTO users (telegram_id, name, phone, role)
VALUES 
  (1111111, 'Ali Valiyev', '+998901111111', 'agent'),
  (2222222, 'Aziz Karimov', '+998902222222', 'agent');

-- Products
INSERT INTO products (name, description, price, stock)
VALUES
  ('Nam salfetka Classic', 'Bolalar uchun gigiyenik salfetka', 15000, 500),
  ('Bolalar tagligi', 'Turli o‘lchamdagi tagliklar', 80000, 200),
  ('Quruq sochiq', 'Gigiyenik kichik o‘ram', 12000, 300);

-- Stores
INSERT INTO stores (name, phone, address)
VALUES
  ('Andijon Market', '+998907777777', 'Andijon sh. Bog‘bon ko‘chasi 12'),
  ('Toshkent Savdo', '+998908888888', 'Toshkent sh. Chilonzor 15'),
  ('Namangan Do‘kon', '+998909999999', 'Namangan sh. Mustaqillik ko‘chasi 7');

-- Orders
INSERT INTO orders (user_id, product_id, store_id, quantity)
SELECT 
  (SELECT id FROM users WHERE name='Ali Valiyev'),
  (SELECT id FROM products WHERE name='Nam salfetka Classic'),
  (SELECT id FROM stores WHERE name='Andijon Market'),
  100
UNION
SELECT 
  (SELECT id FROM users WHERE name='Aziz Karimov'),
  (SELECT id FROM products WHERE name='Bolalar tagligi'),
  (SELECT id FROM stores WHERE name='Toshkent Savdo'),
  50;
```

---

🌐 **Backend API Endpoints**

**Auth**  
- `POST /register` – yangi user (agent) qo‘shish  
- `POST /login` – admin login  

**Agent**  
- `POST /orders` – yangi buyurtma  
- `GET /orders/:user_id` – agent buyurtmalari  
- `GET /stores/:agent_id` – agent do‘konlari  
- `GET /stats/agent/:user_id` – agent statistikasi  

**Admin**  
- `GET /products` – mahsulotlar ro‘yxati  
- `POST /products` – mahsulot qo‘shish  
- `PUT /products/:id` – mahsulot tahrirlash  
- `DELETE /products/:id` – mahsulot o‘chirish  
- `POST /stores` – do‘kon qo‘shish  
- `GET /stats/admin` – umumiy statistika  
- `GET /stats/export?format=excel|pdf` – yuklab olish  
- `POST /admins/add` – yangi admin qo‘shish (faqat super-admin)  
- `PUT /admins/change-password` – admin parolini o‘zgartirish  
- `DELETE /reset` – barcha ma’lumotlarni tozalash (faqat super-admin)  

---

🖥️ **Frontend Strukturasi**

```plaintext
frontend/
├── index.html             # Ro‘yxatdan o‘tmaganlar uchun “Bot orqali ro‘yxatdan o‘ting”
│
├── pages/
│   ├── agent/
│   │   ├── dashboard.html # Agent paneli
│   │   ├── orders.html    # Buyurtma qo‘shish
│   │   ├── stores.html    # Do‘konlar
│   │   └── stats.html     # Statistika
│   │
│   ├── admin/
│   │   ├── login.html     # Admin login
│   │   ├── dashboard.html # Sidebar bilan asosiy panel
│   │   ├── products.html  # Mahsulotlar
│   │   ├── stores.html    # Do‘konlar
│   │   ├── stats.html     # Statistika
│   │   ├── agents.html    # Agentlar
│   │   └── settings.html  # Admin boshqaruvi
│
├── css/
│   └── style.css          # Tailwind/Bootstrap asosida
└── js/
    ├── api.js             # Backend bilan aloqa
    ├── telegram.js        # Telegram WebApp API integratsiyasi
    ├── agent.js           # Agent logikasi
    └── admin.js           # Admin logikasi
```

---

🎨 **UI Mapping (asosiy sahifalar)**

**Agent**  
- Buyurtma qo‘shish → Forma + Submit tugmasi → ✅/❌ modal  
- Do‘konlar → Jadval + “Do‘kon qo‘shish” tugmasi  
- Statistika → Grafiklar (Line, Bar, Pie) + Dashboard kartalar  

**Admin**  
- Login → Login/Parol input, “Kirish” tugmasi  
- Sidebar → 📦 Mahsulotlar | 🏪 Do‘konlar | 📊 Statistika | 👥 Agentlar | 🔑 Admin boshqaruvi  
- Mahsulotlar → Jadval + CRUD tugmalari  
- Statistika → Grafiklar + “Export Excel/PDF”  
- Admin boshqaruvi → Parol o‘zgartirish, Admin qo‘shish, ⚠ Reset tugmasi (modal bilan)  

---

🛠️ **Muhim Qoidalar**

- PICCO branding: logotip faqat asosiy joylarda (login page, dashboard footer), footer’da kichkina: © PICCO 2025.  
- Mobile-friendly dizayn, barcha ekranlarda chiroyli ishlashi kerak.  
- Modal oynalar: yashil (success), qizil (error), sariq (ogohlantirish).  
- Super-admin: doim mavjud (Admin / Picco0000), faqat u reset qilishi va yangi admin qo‘shishi mumkin.  

---

✅ **Yakuniy topshiriq**

Codex, ushbu ta’rif asosida PICCO Mini Appni yarat:  
- Telegram bot (Node.js, node-telegram-bot-api)  
- Backend (Express.js, JWT auth)  
- Frontend (Vercel, Tailwind/Bootstrap)  
- Database (Supabase/PostgreSQL)  

Barcha yuqoridagi logikalarni, endpointlarni, sahifa mappingini, UI dizaynlarini va brend talablarini to‘liq implementatsiya qil.
