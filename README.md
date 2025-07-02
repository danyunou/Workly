# Workly - Plataforma de Contratación de Servicios

Proyecto base full stack para una plataforma tipo freelance usando **React**, **Node.js**, **Express** y **PostgreSQL**.

---

## 📁 Estructura del Proyecto

```
workly/
├── client/                     # Frontend (React + Vite)
│   ├── package.json
│   └── src/
│       ├── App.jsx
│       └── pages/
│           ├── Home.jsx
│           ├── Login.jsx
│           ├── Register.jsx
│           └── Services.jsx
│
├── server/                     # Backend (Node.js + Express)
│   ├── db.js
│   ├── index.js
│   ├── package.json
│   └── routes/
│       ├── auth.js
│       └── services.js
│
├── sql/
│   └── init_db.sql             # Script SQL para estructura de base de datos
│
├── .env.example                # Variables de entorno de ejemplo
└── README.md                   # Esta guía
```

---

## 🚀 Instalación

### 1. Clona el repositorio
```bash
git clone https://github.com/tu_usuario/workly.git
cd workly
```

### 2. Configura la base de datos
- Crea una base de datos en PostgreSQL llamada `workly_db`.
- Usa el script en `sql/init_db.sql`.

### 3. Backend
```bash
cd server
npm install
cp ../.env.example .env
npm run dev
```

### 4. Frontend
```bash
cd ../client
npm install
npm run dev
```

---

## 🔐 Variables de Entorno

Copia el archivo `.env.example` y renómbralo como `.env` en la carpeta `server/`. Completa los valores:

```env
DATABASE_URL=postgresql://tu_usuario:tu_contraseña@localhost:5432/workly_db
JWT_SECRET=un_secreto_super_seguro
```

---

## ✨ Funcionalidades implementadas

- Registro e inicio de sesión con JWT
- Listado y publicación de servicios
- Comunicación entre frontend y backend