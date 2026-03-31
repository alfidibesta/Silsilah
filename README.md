# Silsilah Keluarga · Mbah Kromohardjo

Aplikasi web statis untuk mengelola data silsilah keluarga.  
**Vanilla JS · No framework · localStorage · Vercel-ready**

---

## 📁 Struktur Folder

```
kromohardjo/
├── public/
│   ├── index.html
│   ├── style.css
│   ├── js/
│   │   ├── main.js    ← controller utama
│   │   ├── api.js     ← data layer (localStorage + JSON)
│   │   └── ui.js      ← rendering DOM
│   └── data/
│       └── family.json  ← data awal (seed)
└── vercel.json
```

---

## 🚀 Cara Jalankan Lokal

```bash
# Butuh web server (bukan file://) karena ES Modules
npx serve public
# atau
python -m http.server 3000 --directory public
```

Buka `http://localhost:3000`

---

## ☁ Deploy ke Vercel

```bash
npm i -g vercel
vercel --prod
```

Atau: drag folder ke [vercel.com/new](https://vercel.com/new)  
**Root directory: `public`** (atau biarkan default dengan vercel.json)

---

## ✨ Fitur

| Fitur | Keterangan |
|---|---|
| CRUD | Tambah, lihat, edit, hapus anggota |
| Tree view | Hierarki expand/collapse rekursif |
| List view | Tabel dengan sort & filter |
| Search | Cari nama, pasangan, catatan |
| Filter | Filter by orang tua |
| Dark mode | Auto-detect + toggle |
| Export JSON | Unduh data sebagai .json |
| Import JSON | Muat data dari file .json |
| Reset | Kembalikan ke data family.json |
| localStorage | Data persisten tanpa backend |
| Responsive | Mobile-friendly |

---

## 📦 Struktur Data (family.json)

```json
[
  {
    "id": "1",
    "name": "Mbah Kromohardjo",
    "spouse": null,
    "gen": 1,
    "parentId": null,
    "deceased": false,
    "notes": "Kepala keluarga besar"
  }
]
```

| Field | Tipe | Keterangan |
|---|---|---|
| `id` | string | UUID/timestamp otomatis |
| `name` | string | Nama lengkap |
| `spouse` | string\|null | Nama pasangan |
| `gen` | number | Nomor generasi (1-4+) |
| `parentId` | string\|null | ID orang tua, null = root |
| `deceased` | boolean | Status almarhum |
| `notes` | string | Catatan bebas |

---

## 🔧 Customisasi

- Ganti data di `public/data/family.json`
- Warna generasi di `:root` vars dalam `style.css`
- Tambah field baru di `api.js` `create()`/`update()`
