# Despliegue en Producción: Vercel + Railway

## Requisitos Previos
- Repo en GitHub
- Cuenta en [Vercel](https://vercel.com)
- Cuenta en [Railway](https://railway.app)

---

## 1. Backend → Railway

### Paso 1: Crear proyecto en Railway
1. Ve a [railway.app](https://railway.app) → "New Project"
2. Selecciona "Empty Project"
3. Nombre: `unia-backend`

### Paso 2: Agregar base de datos PostgreSQL
1. En el dashboard del proyecto → "Add New" → "Database" → "PostgreSQL"
2. Railway creará automaticamente la variable `DATABASE_URL`

### Paso 3: Conectar repo de GitHub
1. "Add New" → "GitHub Repo"
2. Selecciona tu repositorio
3. En "Root Directory" especifica: `backend`

### Paso 4: Variables de entorno
Agrega estas variables en Railway:

```
NODE_ENV=production
PORT=3000
DATABASE_URL=<se genera automaticamente>

# JWT - GENERA CLAVES SEGURAS
JWT_ACCESS_SECRET=genera_una_clave_muy_larga_min_32_caracteres_aqui
JWT_REFRESH_SECRET=otra_clave_diferente_muy_larga_aqui

# Frontend URL (reemplaza con tu URL de Vercel)
FRONTEND_URL=https://tu-proyecto.vercel.app

# APIs
GROQ_API_KEY=tu_api_key_de_groq
```

### Paso 5: Deploy
1. Click en "Deploy"
2. Verifica que el build pase (puede tomar 2-3 min)
3. Obtén tu URL: `https://tu-backend.up.railway.app`

---

## 2. Frontend → Vercel

### Paso 1: Importar proyecto
1. Ve a [vercel.com](https://vercel.com) → "Add New" → "Project"
2. Importa tu repositorio GitHub
3. Framework Preset: **Vite** (se detecta automáticamente)

### Paso 2: Configuración
- Root Directory: `frontend`
- Build Command: `npm run build`
- Output Directory: `dist`

### Paso 3: Variables de entorno
En Vercel, agrega:

```
VITE_API_URL=https://tu-backend.up.railway.app/api
```

### Paso 4: Deploy
1. Click en "Deploy"
2. Obtén tu URL: `https://tu-proyecto.vercel.app`

---

## 3. Obtener API Keys

### GroQ (IA-Chatbot)
1. Ve a [console.groq.com](https://console.groq.com)
2. Crea cuenta o inicia sesión
3. Crea API Key (hay tier gratuito)
4. Copia la key y agrégala en Railway

### ElevenLabs (TTS)
1. Ve a [elevenlabs.io](https://elevenlabs.io)
2. Crea cuenta gratuita
3. Ve a Profile → API Key
4. La key se usa en el frontend (VITE_ELEVENLABS_API_KEY)

---

## 4. Actualizar CORS en Railway

Después de obtener tu URL de Vercel, actualiza en Railway:
```
FRONTEND_URL=https://tu-proyecto.vercel.app
```

---

## 5. Notas Importantes

- **Cold Start**: Railway suspende el backend si no hay actividad (despierta en ~30s)
- **Free Tier**: 
  - Railway: 500h/mes, $5 crédito
  - Vercel: Ilimitado para proyectos personales
- **Dominio Custom**: Puedes agregar tu propio dominio gratis en Vercel

---

## Troubleshooting

### Error de conexión al backend
- Verifica que `VITE_API_URL` en Vercel termine en `/api`
- Verifica que `FRONTEND_URL` en Railway sea exactamente tu URL de Vercel

### Error de base de datos
- Asegúrate de estar usando PostgreSQL (schema.postgresql.prisma)
- Verifica que `DATABASE_URL` esté configurada en Railway

### Error de CORS
- En backend/src/index.ts verifica que cors permita tu dominio de Vercel