
Plan de implementación: UNIA-Emotion (MVP)
Context
UNIA-Emotion es una plataforma web que combina detección emocional por cámara, un avatar animado que refleja la emoción del usuario, y un chatbot con LLM (Groq) que adapta sus respuestas a la emoción detectada. El objetivo es crear un acompañante conversacional empático para apoyo emocional, con escalamiento automático a un contacto de emergencia cuando se detectan señales de crisis.

El usuario dispone de un documento de requerimientos extenso (58 RF + 9 RS + 3 RE + 8 RD). El alcance completo abarca ~7 semanas de trabajo. Para hacer el proyecto ejecutable y validable iteración a iteración, se entregará en dos fases: un MVP (Fase 1, este plan) con el núcleo funcional, y una Fase 2 (plan futuro) con voz, detección de crisis y perfiles avanzados.

Decisiones tomadas con el usuario
Decisión	Elección
Estructura repo	Monorepo con /frontend y /backend
Lenguaje	TypeScript en ambos
Assets de avatar	Placeholders SVG animados por emoción (reemplazables)
Tests	Mínimos críticos (auth, mapeo emocional)
Base de datos local	SQLite vía Prisma (Docker no disponible; Postgres se reserva para prod)
API keys	Groq disponible; email en modo mock (log a consola) hasta Fase 2
Alcance inicial	MVP: auth + escaneo facial inicial + detección emocional + avatar dinámico + chatbot
Fuera de alcance (Fase 2)	Voz, detección de crisis, envío real de emails, admin, despliegue
Alcance del MVP (Fase 1)
Incluido:

Auth completo (RF-01 a RF-04): registro con contacto de emergencia, login, JWT, perfil editable
Escaneo facial inicial (RF-05 a RF-09)
Detección emocional en tiempo real (RF-10 a RF-15)
Avatar dinámico (MOD-04) con placeholders SVG animados
Chatbot con Groq (RF-16 a RF-21)
Seguridad esencial (RS-01, RS-02, RS-03, RS-05, RS-07, RS-08, RS-09)
Privacidad básica (RE-01, RE-03)
Tests mínimos: auth, mapeo emocional, sanitización de inputs
Diferido a Fase 2:

Entrada por voz (RF-22 a RF-25)
Sistema de detección de crisis y email de emergencia (RF-26 a RF-30)
Log administrativo de eventos de crisis
Despliegue (Vercel/Railway, dominio, Sentry, CI/CD)
Cifrado AES-256 de datos faciales (RS-06) — se almacenan como JSON en SQLite; se migra a Postgres cifrado en prod
Nota de seguridad: durante el MVP, la detección de crisis no está activa. Este aviso debe quedar reflejado en el footer del MVP y se documenta como trabajo pendiente antes de exposición pública.

Arquitectura
Topología
┌──────────────────────┐       HTTPS/JSON       ┌──────────────────────┐
│   Frontend (Vite)    │◄─────────────────────►│   Backend (Express)  │
│   React + TS         │    JWT en Authorization│   Node + TS          │
│   Tailwind           │                        │   Prisma ORM         │
│   face-api.js        │                        │                      │
│   Zustand (estado)   │                        │   Groq SDK           │
└──────────┬───────────┘                        └──────────┬───────────┘
           │                                                │
           ▼                                                ▼
     Cámara/Canvas                                  SQLite (dev)
     (procesamiento                                 Postgres (prod)
      local de frames)
Decisiones arquitectónicas clave
Detección facial en el navegador con face-api.js. No se envía video al backend. Los frames se descartan tras procesar (cumple RE-01).
Descriptor facial y rasgos se calculan en frontend, se envían una sola vez al backend al completar el escaneo inicial, y se persisten en el perfil del usuario.
API key de Groq reside solo en el backend. El frontend llama a POST /api/chat y el backend hace proxy a Groq con streaming SSE hacia el cliente.
Estado emocional global en frontend con Zustand. Las transiciones pasan por un debounce de 2s (RF-12) antes de disparar cambios de avatar/tema.
Tematización CSS vía variables CSS custom (--emotion-color) que se actualizan al estado emocional. Saturación limitada (RF-14).
Layout del monorepo
LIA/
├── package.json                    # Workspaces raíz (npm workspaces)
├── README.md
├── .gitignore
├── .env.example
├── frontend/
│   ├── package.json
│   ├── vite.config.ts
│   ├── tsconfig.json
│   ├── tailwind.config.js
│   ├── postcss.config.js
│   ├── index.html
│   ├── public/
│   │   ├── models/                 # Modelos face-api.js (~3MB)
│   │   └── avatars/                # 6 SVG placeholder por emoción
│   └── src/
│       ├── main.tsx
│       ├── App.tsx
│       ├── api/
│       │   ├── client.ts           # fetch wrapper con JWT
│       │   ├── auth.ts
│       │   ├── chat.ts             # streaming SSE
│       │   └── user.ts
│       ├── pages/
│       │   ├── Login.tsx
│       │   ├── Register.tsx
│       │   ├── Welcome.tsx         # escaneo facial inicial
│       │   ├── Dashboard.tsx       # avatar + chat
│       │   └── Profile.tsx
│       ├── components/
│       │   ├── Avatar.tsx          # GIF/SVG + overlay de rasgos
│       │   ├── ChatWindow.tsx
│       │   ├── ChatMessage.tsx
│       │   ├── ChatInput.tsx
│       │   ├── EmotionBadge.tsx    # indicador "Felicidad 82%"
│       │   ├── CameraFeed.tsx      # video + canvas hidden
│       │   └── EmotionThemeProvider.tsx
│       ├── features/
│       │   ├── emotion/
│       │   │   ├── faceApi.ts      # inicialización de modelos
│       │   │   ├── detector.ts     # loop de detección + debounce
│       │   │   ├── mapping.ts      # face-api → emoción UNIA
│       │   │   └── store.ts        # Zustand emotion store
│       │   ├── auth/
│       │   │   ├── store.ts        # Zustand auth store
│       │   │   └── useAuth.ts
│       │   └── avatar/
│       │       ├── traits.ts       # captura rasgos de descriptor
│       │       └── overlay.ts      # filtros CSS por rasgos
│       ├── hooks/
│       │   └── useCamera.ts
│       ├── styles/
│       │   └── index.css           # tailwind + variables emocionales
│       └── types/
│           └── index.ts
└── backend/
    ├── package.json
    ├── tsconfig.json
    ├── .env.example
    ├── prisma/
    │   ├── schema.prisma
    │   └── seed.ts
    └── src/
        ├── index.ts                # entry + Express setup
        ├── config/
        │   └── env.ts              # validación de vars con zod
        ├── middleware/
        │   ├── auth.ts             # verifica JWT
        │   ├── errorHandler.ts
        │   └── rateLimit.ts
        ├── routes/
        │   ├── auth.routes.ts      # /register /login /refresh /logout
        │   ├── user.routes.ts      # /me /me/face
        │   └── chat.routes.ts      # /chat (SSE stream)
        ├── services/
        │   ├── auth.service.ts     # bcrypt, JWT
        │   ├── user.service.ts
        │   ├── groq.service.ts     # cliente Groq + system prompt
        │   └── email.service.ts    # stub logger para Fase 1
        ├── prompts/
        │   └── system.ts           # plantilla por emoción
        ├── utils/
        │   ├── jwt.ts
        │   └── sanitize.ts
        ├── lib/
        │   └── prisma.ts
        └── __tests__/
            ├── auth.test.ts
            ├── emotion-mapping.test.ts
            └── sanitize.test.ts
Stack y dependencias
Frontend
react@18, react-dom@18, react-router-dom@6
vite, typescript, @vitejs/plugin-react
tailwindcss, postcss, autoprefixer
face-api.js (detección facial + expresiones)
zustand (estado global)
zod (validación de formularios)
Backend
express, cors, helmet
typescript, tsx (dev runtime)
prisma, @prisma/client
bcrypt, jsonwebtoken
cookie-parser
zod (validación de payloads)
express-rate-limit
groq-sdk (cliente oficial Groq)
pino + pino-http (logging estructurado)
Dev: vitest, supertest
Schema de base de datos (Prisma / SQLite dev)
// backend/prisma/schema.prisma
datasource db {
  provider = "sqlite"           // cambio a "postgresql" en prod vía env
  url      = env("DATABASE_URL")
}

generator client { provider = "prisma-client-js" }

model User {
  id              String   @id @default(uuid())
  fullName        String
  email           String   @unique
  passwordHash    String
  phone           String
  whatsapp        String
  emergencyEmail  String
  faceDescriptor  String?  // JSON: number[128]
  faceTraits      String?  // JSON: { skinHueRotate, skinSepia, faceShape, landmarks }
  createdAt       DateTime @default(now())
  updatedAt       DateTime @updatedAt
  conversations   Conversation[]
}

model Conversation {
  id         String   @id @default(uuid())
  userId     String
  user       User     @relation(fields: [userId], references: [id], onDelete: Cascade)
  startedAt  DateTime @default(now())
  emotionLog String   // JSON array
  messages   Message[]
}

model Message {
  id              String   @id @default(uuid())
  conversationId  String
  conversation    Conversation @relation(fields: [conversationId], references: [id], onDelete: Cascade)
  role            String   // "user" | "assistant"
  content         String
  emotionAtTime   String   // "happy" | "sad" | ...
  createdAt       DateTime @default(now())
  isCrisisFlagged Boolean  @default(false)
}
Nota: crisis_events se añade en Fase 2.

Mapeo emocional (núcleo del sistema)
frontend/src/features/emotion/mapping.ts implementa:

face-api expression → emoción UNIA → color
happy       → Felicidad → #F5C842
angry       → Enojo     → #E24B4A
sad         → Tristeza  → #378ADD
disgusted   → Asco      → #639922
surprised   → Sorpresa  → #D4537E
neutral     → Neutral   → #888780
fearful     → Neutral   → #888780
Debounce RF-12: buffer circular de frames en los últimos 2000ms. Cambio de estado solo si una emoción domina ≥60% de los frames del buffer y su confianza promedio ≥0.6. Implementado como test unitario (emotion-mapping.test.ts).

Integraciones clave
Groq
backend/src/services/groq.service.ts usando groq-sdk:

Modelo: llama-3.3-70b-versatile (reemplaza llama3-70b-8192, que ya no existe en Groq)
System prompt inyecta la emoción actual + historial últimos 20 mensajes
Streaming vía stream: true, reenviado al frontend como SSE (text/event-stream)
System prompts por emoción en backend/src/prompts/system.ts. Template:

"Eres UNIA, un asistente emocional empático. El usuario está actualmente [EMOCIÓN]. Responde con calidez, valida su emoción como lo haría un psicólogo, crea un espacio seguro, y al mismo tiempo responde la pregunta que haga. No digas 'detecto que estás...'; usa frases naturales como 'noto que quizás...'. UNIA-Emotion no reemplaza atención profesional — recuérdalo si la conversación sugiere crisis."

face-api.js
Modelos a descargar manualmente desde el repo oficial justadudewhohacks/face-api.js y colocar en frontend/public/models/:

ssd_mobilenetv1_model-*
face_landmark_68_model-*
face_expression_model-*
face_recognition_model-* (para descriptor en escaneo inicial)
Instrucciones de descarga se documentan en README.md raíz.

Overlay de avatar (RF-07)
6 SVG placeholders en frontend/public/avatars/{happy,sad,angry,disgusted,surprised,neutral}.svg, con caras estilizadas animadas con CSS (parpadeo, boca).
Rasgos aplicados como filtros CSS sobre el <img>:
Tono de piel → filter: hue-rotate(Xdeg) sepia(Y%) derivado del HSL promedio de la región cutánea
Forma de rostro → transform: scaleX(a) scaleY(b) derivado de bounding box de landmarks
Componente <Avatar emotion traits /> en Avatar.tsx.
Plan de ejecución por fases
Cada fase termina con una verificación manual concreta. Al final de cada fase pido revisión antes de avanzar.

Fase A — Andamiaje del monorepo (setup)
Entregable: monorepo arranca con npm run dev en ambos lados.

Inicializar monorepo con npm workspaces en raíz
Scaffold frontend/ con Vite + React + TS + Tailwind
Scaffold backend/ con Express + TS + tsx + Prisma
Configurar ESLint + Prettier compartidos (config mínima)
Crear .env.example en raíz y en backend/
Script raíz dev que ejecuta ambos en paralelo (usando concurrently)
README.md con pasos de setup
Verificación: npm run dev arranca frontend en :5173 y backend en :3000/api/health devolviendo {status:'ok'}.

Fase B — Autenticación (RF-01 a RF-04, RS-01, RS-02, RS-08)
Entregable: registro y login funcionales con sesión persistente.

Prisma: migración inicial con modelo User
Endpoints: POST /api/auth/register, POST /api/auth/login, POST /api/auth/refresh, POST /api/auth/logout, GET /api/auth/me
Hash bcrypt (rounds ≥12), JWT access 15min + refresh 7 días en httpOnly cookie
Validación con zod en backend; validación de formularios con zod + react en frontend
Páginas: Login.tsx, Register.tsx, Profile.tsx
Middleware requireAuth que verifica JWT
Zustand store de auth; persistencia via refresh flow
Tests: auth.test.ts (registro duplicado, login inválido, hash correcto, JWT válido)
Verificación: registrar usuario → hacer login → refrescar página → sigue autenticado → logout → redirect a login.

Fase C — Escaneo facial inicial (RF-05 a RF-09, RS-07)
Entregable: al primer login, el usuario ve su avatar personalizado.

Descargar modelos face-api.js (documentado en README)
useCamera hook con getUserMedia
Pantalla Welcome.tsx con consentimiento explícito + botón iniciar/saltar
faceApi.ts: carga modelos, detectSingleFace().withFaceLandmarks().withFaceDescriptor()
features/avatar/traits.ts: extrae tono de piel (HSL de bounding box del rostro sobre canvas) + forma + landmarks
PATCH /api/user/me/face: guarda faceDescriptor y faceTraits como JSON
Componente <Avatar /> aplica filtros CSS desde traits
Verificación: primer login muestra modal de consentimiento, escanea 3s, guarda rasgos, avatar visible con tono ajustado. Segundo login no repite escaneo.

Fase D — Detección emocional en tiempo real (RF-10 a RF-15)
Entregable: avatar e interfaz reaccionan a la cara del usuario en vivo.

features/emotion/detector.ts: loop requestAnimationFrame con throttle a ~12 FPS, detectSingleFace().withFaceExpressions()
mapping.ts: mapeo face-api → emoción UNIA con umbral 0.6
Debounce de 2s (buffer circular) → emite cambio solo cuando dominancia ≥60%
Zustand emotion/store.ts expone { current, confidence, lastChange }
EmotionThemeProvider.tsx actualiza variable CSS --emotion-color con transición 1.2s, saturación ≤35%
Avatar.tsx cambia SVG según emoción + aplica overlay de rasgos
EmotionBadge.tsx muestra "Felicidad — 82%"
Tests: emotion-mapping.test.ts (mapeo, debounce con casos sintéticos, umbrales)
Verificación: sonreír → avatar pasa a Felicidad y el tema se tiñe amarillo suave en <3s. Neutral → gris. Cambios bruscos no saltan el debounce.

Fase E — Chatbot con Groq (RF-16 a RF-21, RS-02, RS-09)
Entregable: conversación funcional donde UNIA adapta su tono a la emoción actual.

backend/src/services/groq.service.ts con groq-sdk
POST /api/chat (autenticado): recibe { message }, obtiene emoción actual del cuerpo (o del último log), carga últimos 20 mensajes, construye system prompt, llama a Groq en streaming
Respuesta como text/event-stream al frontend
Persistir mensaje del usuario y de la IA en Message, con emotionAtTime
Sanitización de input (sanitize.ts) antes de enviar a Groq y de persistir
Frontend: ChatWindow.tsx, ChatMessage.tsx, ChatInput.tsx con scroll automático, indicador de escritura, timestamps
api/chat.ts consume el stream con EventSource o fetch + ReadableStream
Rate limit: 30 msg/min por usuario (RS-04)
Tests: sanitize.test.ts (XSS, prompt injection básica), test de construcción de system prompt por emoción
Verificación: enviar mensaje estando triste → UNIA responde con tono empático validador. Cambiar a feliz → siguiente respuesta usa tono alegre. Refrescar → historial persiste.

Fase F — Pulido MVP
Footer permanente con aviso RE-03
Manejo de errores global (frontend toast + backend errorHandler)
Estados de carga y vacíos en todas las pantallas
Accesibilidad básica: roles ARIA en chat, contraste WCAG AA
Responsive mínimo desktop + tablet
Revisión de CORS (RS-03), helmet (RS-05 en dev proxy), cookies seguras
Script npm test corre todos los tests mínimos
Actualizar README.md con: setup, env vars, cómo correr, cómo probar cada flujo
Verificación: flujo completo end-to-end sin errores de consola. npm test pasa.

Variables de entorno
backend/.env.example:

NODE_ENV=development
PORT=3000
DATABASE_URL="file:./dev.db"
JWT_ACCESS_SECRET=change_me_32_chars_min
JWT_REFRESH_SECRET=change_me_32_chars_min_distinto
JWT_ACCESS_TTL=15m
JWT_REFRESH_TTL=7d
FRONTEND_URL=http://localhost:5173
GROQ_API_KEY=
GROQ_MODEL=llama-3.3-70b-versatile
EMAIL_MODE=mock   # mock | smtp (smtp se implementa en Fase 2)
frontend/.env.example:

VITE_API_URL=http://localhost:3000/api
Seguridad aplicada en MVP
RS-01: bcrypt rounds=12, política mínima 8 chars/1 núm/1 mayús validada con zod
RS-02: GROQ_API_KEY solo en backend, nunca expuesta a Vite
RS-03: cors({ origin: FRONTEND_URL, credentials: true })
RS-04: express-rate-limit en auth (60/min) y chat (30/min)
RS-05: diferido para despliegue; en dev solo HTTP local
RS-07: modal de consentimiento explícito antes de activar cámara
RS-08: access 15m + refresh 7d en httpOnly, secure en prod
RS-09: sanitize.ts con escape HTML + strip de patrones conocidos de prompt injection (ignore previous, system:, etc.)
RS-06 (cifrado AES-256): diferido; se deja nota de TODO en el schema Prisma
Privacidad aplicada en MVP
RE-01: frames nunca persisten, solo se procesan en memoria del browser
RE-02 (derecho de eliminación): endpoint DELETE /api/user/me que borra User en cascada
RE-03: footer y mensaje en primera sesión
Testing mínimo
Vitest en backend:

auth.test.ts: registro válido, email duplicado, login con password incorrecta, JWT decodificable, refresh flow
emotion-mapping.test.ts: mapeo face-api → UNIA, umbral 0.6, debounce 2s/60% con series temporales sintéticas
sanitize.test.ts: XSS básico, prompt injection básica
Frontend queda sin tests unitarios en MVP (verificación manual). Se añade en Fase 2 si el alcance lo permite.

Archivos críticos a crear
Por prioridad de revisión:

backend/prisma/schema.prisma — modelo de datos, revisión temprana
backend/src/prompts/system.ts — calidad de respuestas depende de esto
frontend/src/features/emotion/mapping.ts — núcleo emocional, tiene tests
frontend/src/features/emotion/detector.ts — pipeline + debounce
frontend/src/components/Avatar.tsx — lógica de overlay de rasgos
backend/src/services/groq.service.ts — integración LLM + streaming
backend/src/routes/chat.routes.ts — SSE al frontend
frontend/src/components/EmotionThemeProvider.tsx — tematización
Verificación end-to-end del MVP
npm install en raíz (instala workspaces)
Descargar modelos face-api.js siguiendo README.md → frontend/public/models/
Copiar backend/.env.example → backend/.env y poner GROQ_API_KEY
npx prisma migrate dev en backend/
npm run dev desde raíz → levanta frontend y backend
Abrir http://localhost:5173
Registro: completar formulario → cuenta creada → redirect a login
Login: credenciales → aceptar permiso de cámara → escaneo 3s → avatar personalizado aparece
Detección: sonreír, entristecer, sorprender → avatar y tema cambian tras ~2s, nunca instantáneo
Chat: enviar "¿cómo puedo mejorar mi día?" estando neutral → respuesta normal. Fingir tristeza y repetir → tono validador empático
Persistencia: refrescar → sigue logueado, historial sigue
Perfil: cambiar email de emergencia → persiste
Logout: vuelve a login
npm test en backend/ → verde
Riesgos conocidos
face-api.js en Firefox/Safari: funciona mejor en Chrome/Edge. Documentar en README.
Modelos ~3MB: carga inicial lenta. Mitigar con pantalla de carga en Welcome.
Groq free tier: límite de tokens/día. Monitorear durante desarrollo.
SQLite dev vs Postgres prod: campos JSON vs JSONB. Prisma abstrae, pero validar antes de migrar.
MVP sin detección de crisis: riesgo ético si se expone a usuarios. Mantener el MVP en desarrollo local hasta completar Fase 2.
Próximos pasos tras aprobación
Ejecutar Fase A (andamiaje) y mostrar output funcionando
Revisar juntos antes de Fase B
Continuar fase a fase con checkpoints
Al terminar el MVP, iniciar planificación de Fase 2 (voz + crisis + email real)