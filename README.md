# UNIA-Emotion

Asistente emocional web con detección facial en tiempo real, avatar dinámico y chatbot empático.

## Stack

- **Monorepo** con npm workspaces
- **Frontend**: React 18 + Vite + TypeScript + Tailwind + face-api.js + Zustand
- **Backend**: Node 20 + Express + TypeScript + Prisma + SQLite (dev)
- **LLM**: Groq (llama-3.3-70b-versatile)
- **TTS**: Web Speech API (con soporte futuro para ElevenLabs)

## Setup local

### Requisitos
- Node ≥ 20
- npm ≥ 10

### Pasos

```bash
# 1. Instalar dependencias (hidrata ambos workspaces)
npm install

# 2. Configurar variables de entorno
cp backend/.env.example backend/.env
cp frontend/.env.example frontend/.env
# Edita backend/.env y pon tu GROQ_API_KEY

# 3. Migrar base de datos (SQLite local)
npm -w backend run db:migrate

# 4. Descargar modelos de face-api.js (ver sección abajo)

# 5. Arrancar ambos servidores
npm run dev
```

- Frontend: http://localhost:5173
- Backend: http://localhost:3000
- Health: http://localhost:3000/api/health

## Cuenta de Administrador

Al iniciar el backend por primera vez, se crea automáticamente una cuenta de administrador:

| Campo | Valor |
|-------|-------|
| **Email** | `admin@unia.co` |
| **Contraseña** | `Admin2024!UNIA` |

### Funciones del administrador:
- Ver panel de estadísticas (usuarios, conversaciones, mensajes)
- Listar todos los usuarios registrados
- Eliminar cuentas de usuarios
- Acceso vía: **Perfil → ⭐ Panel Admin**

> ⚠️ **Importante:** Cambia estas credenciales en producción. La cuenta admin se crea solo si no existe ninguna cuenta con rol `admin`.

## Modelos de face-api.js

Se necesitan los siguientes modelos del repo oficial (https://github.com/justadudewhohacks/face-api.js/tree/master/weights). Descarga y coloca los archivos en `frontend/public/models/`:

- `ssd_mobilenetv1_model-weights_manifest.json` + shards
- `face_landmark_68_model-weights_manifest.json` + shards
- `face_expression_model-weights_manifest.json` + shards
- `face_recognition_model-weights_manifest.json` + shards

Script de descarga automática (opcional):

```bash
npm -w frontend run models:download
```

## Scripts raíz

| Script | Descripción |
|---|---|
| `npm run dev` | Levanta frontend + backend en paralelo |
| `npm run dev:frontend` | Solo frontend |
| `npm run dev:backend` | Solo backend |
| `npm run test` | Tests del backend (vitest) |
| `npm run build` | Build de producción de ambos |

## Funcionalidades principales

### Detección Emocional
- Cámara en tiempo real con face-api.js
- Escaneo facial de 68 puntos (pupilas, boca, nariz, cejas, mandíbula)
- Detección de 7 emociones: felicidad, tristeza, enojo, asco, sorpresa, miedo, neutral

### Avatar Personalizado
- Captura de foto del rostro durante el escaneo
- Avatar con el rostro real del usuario + efectos emocionales
- GIF de emoción como badge decorativo
- Filtros de color y brillo según la emoción detectada
- Re-escaneo disponible desde el perfil

### Chat Empático
- Chatbot con Groq (LLM) que adapta tono a la emoción
- Historial de conversaciones con sidebar colapsable
- Títulos temáticos auto-generados por conversación
- Streaming de respuestas en tiempo real (SSE)

### Entrada/Salida de voz
- Speech-to-Text: dictado por micrófono con preview en textarea
- Text-to-Speech: lectura de respuestas del asistente (Web Speech API)
- Estructura preparada para integración con ElevenLabs

> ⚠️ UNIA-Emotion no reemplaza la atención de un profesional de salud mental. El sistema de detección de crisis no está activo en el MVP; no exponer a usuarios reales hasta completar las fases de seguridad.
