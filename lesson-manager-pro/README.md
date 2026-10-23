# S.GENCER DERS TAKİP — Web Sürümü

Bu, masaüstü (Mac/PySide6) uygulamanızın Next.js + Supabase ile yazılmış web
sürümüdür. Öğrenciler, planlı/yapılan dersler, haftalık takvim, ödeme takibi,
CSV/PDF rapor dışa aktarımı aynı mantıkla web üzerinde çalışır. Veriler artık
telefon/tablet/başka bir bilgisayardan da (internet olan her yerden) erişilebilir
şekilde Supabase'de (bulut Postgres veritabanı) saklanır.

## Mimari

- **Next.js 14** (App Router, TypeScript, Tailwind) — arayüz
- **Supabase** — veritabanı (Postgres) + kullanıcı girişi (Auth)
- **Vercel** — web sitesini yayınlamak için barındırma
- **GitHub** — kodun deposu; Vercel oradan otomatik deploy eder

Giriş yapmadan kimse verilerinizi göremez: her tabloda "Row Level Security"
(satır bazlı güvenlik) açık, yani veritabanına doğrudan biri ulaşsa bile
sizin kullanıcı hesabınız olmadan hiçbir satırı okuyamaz/değiştiremez.

## 1) Supabase projesini oluşturun

1. https://supabase.com adresinden ücretsiz hesap açın, "New project" deyin.
2. Proje oluşduktan sonra sol menüden **SQL Editor**'ı açın.
3. Bu klasördeki `supabase/schema.sql` dosyasının tüm içeriğini kopyalayıp
   SQL Editor'e yapıştırın ve **Run** deyin. Bu, `students`, `planned`,
   `lessons` tablolarını ve güvenlik kurallarını oluşturur.
4. Sol menüden **Project Settings > API** sayfasına gidin. Şunları not edin:
   - **Project URL** (`https://xxxxx.supabase.co`)
   - **anon public** key (uzun bir metin)
   Bunlara birazdan ihtiyacınız olacak.
5. (İsteğe bağlı) **Authentication > Providers**'da e-posta doğrulamasını
   isterseniz kapatabilirsiniz (Confirm email → Disabled), böylece hesap
   oluşturduktan hemen sonra giriş yapabilirsiniz. Sadece siz kullanacaksanız
   bu daha pratik olur.

### Eski verilerinizi (masaüstü uygulamasındaki öğrenci/ders kayıtları) aktarma

`supabase/seed_from_old_data.sql` dosyası, yüklediğiniz `lesson_manager.db`
içindeki mevcut 5 öğrenci ve derslerini Supabase'e aktarmak için hazır bir
script içeriyor.

1. Önce web uygulamasında (aşağıdaki adımlardan sonra) kendi hesabınızla bir
   kez kayıt olun.
2. Supabase Dashboard > Authentication > Users kısmından kendi kullanıcı
   ID'nizi (UUID) kopyalayın.
3. `supabase/seed_from_old_data.sql` dosyasını açın, içindeki her
   `YOUR_USER_ID` yazan yeri kendi UUID'niz ile değiştirin (bul-değiştir).
4. SQL Editor'e yapıştırıp çalıştırın.

## 2) Kodu GitHub'a yükleyin

Bu klasörün tamamını (bu README dahil) bir GitHub deposuna yükleyin:

```bash
cd ders-takip-web   # bu klasör
git init
git add .
git commit -m "İlk sürüm"
git branch -M main
git remote add origin https://github.com/KULLANICI_ADINIZ/ders-takip-web.git
git push -u origin main
```

(GitHub'da önce boş bir repo oluşturmanız gerekir: github.com > New repository)

## 3) Vercel'de yayınlayın

1. https://vercel.com adresinden GitHub hesabınızla giriş yapın.
2. **Add New... > Project** deyin, az önce oluşturduğunuz GitHub reposunu seçin.
3. **Environment Variables** kısmına şunları ekleyin (Supabase'den aldığınız
   değerlerle):
   - `NEXT_PUBLIC_SUPABASE_URL` = Supabase Project URL
   - `NEXT_PUBLIC_SUPABASE_ANON_KEY` = Supabase anon public key
4. **Deploy** deyin. Birkaç dakika içinde `https://ders-takip-web-xxxx.vercel.app`
   gibi bir adres alırsınız — bu artık web uygulamanızın canlı adresi.
5. İsterseniz Vercel > Settings > Domains kısmından kendi alan adınızı
   (örn. derstakip.com) bağlayabilirsiniz.

Bundan sonra kodda her değişiklik yapıp GitHub'a `git push` yaptığınızda,
Vercel otomatik olarak yeni sürümü yayınlar.

## 4) İlk girişi yapın

1. Yayınlanan adrese gidin, "Hesap Oluştur" ile kendi e-posta/şifrenizle
   kayıt olun.
2. E-posta doğrulamasını kapatmadıysanız gelen doğrulama bağlantısına
   tıklayın, sonra giriş yapın.
3. Öğrenciler sayfasından öğrencilerinizi ekleyin (veya yukarıdaki seed
   script'iyle eski verilerinizi aktarın).

## Yerel geliştirme (isteğe bağlı)

Kodu kendi bilgisayarınızda çalıştırıp değişiklik yapmak isterseniz:

```bash
npm install
cp .env.local.example .env.local   # içine kendi Supabase bilgilerinizi yazın
npm run dev
```

Sonra tarayıcıda `http://localhost:3000` adresini açın.

## Özellik karşılaştırması (masaüstü ↔ web)

| Masaüstü (PySide6)              | Web (Next.js + Supabase)              |
|----------------------------------|----------------------------------------|
| Dashboard kartları + bugünün dersleri | Aynı, gerçek zamanlı saat ile |
| Öğrenciler sayfası               | Aynı |
| Ders Ekle (hızlı giriş)          | Aynı |
| Haftalık takvim (çizim/canvas)   | Haftalık takvim (sürükle-bırak destekli) |
| Dersler listesi + Konu düzenleme | Aynı, ayrıca ödeme durumuna tıklayıp değiştirebilirsiniz |
| Raporlar (aylık özet)            | Aynı |
| CSV Aktar                        | Aynı |
| PDF Kaydet (reportlab)           | Aynı (jsPDF ile tarayıcıda oluşturulur) |
| Yerel SQLite dosyası + yedekleme | Supabase bulut veritabanı (Supabase kendi otomatik yedeklemesini yapar) |

## Notlar

- Bu uygulama tek kullanıcılı (siz) düşünülerek tasarlandı, ama veritabanı
  şeması her kullanıcının sadece kendi verisini görmesine izin verecek
  şekilde kuruldu — isterseniz ileride asistanınıza da ayrı bir hesap
  açabilirsiniz, verileriniz birbirine karışmaz.
- Supabase'in ücretsiz planı bu ölçekte bir kullanım için fazlasıyla yeterli.
- Vercel'in ücretsiz planı da kişisel/tek kullanıcılı projeler için yeterli.
