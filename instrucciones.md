Servidores arriba y listos. Aquí las credenciales y qué probar:

Acceso
Abre en navegador: http://localhost:5173

Usuario de prueba ya creado:

Correo: smoke@test.com
Contraseña: TestPass123
O crea uno nuevo en /register (todos los campos requeridos: nombre, celular, WhatsApp, email de emergencia, contraseña con 8+ caracteres, 1 mayúscula y 1 número).

Qué probar
Login → pedirá permiso de cámara → escaneo de 3s → avatar personalizado
Dashboard → sonríe / cara seria → avatar y tema cambian tras ~2s (debounce)
Perfil → /profile → editar teléfono/email de emergencia
Chat → escribe algo → ⚠️ requiere GROQ_API_KEY en backend/.env
Para activar el chat (Groq)
Obtén tu API key en https://console.groq.com/keys
Edita backend/.env y pon: GROQ_API_KEY=gsk_...
Reinicia el backend (Ctrl+C y npm run dev de nuevo, o solo el backend: npm run dev:backend)
Estado servidores
Servicio	URL	Estado
Frontend	http://localhost:5173	✅ 200
Backend health	http://localhost:3000/api/health	✅ ok
Modelos face-api	/models/*	✅ servidos
Resumen del MVP
27 tests en verde (18 backend + 9 frontend)
Fases A–F completas: monorepo, auth, escaneo facial, detección emocional, chatbot, pulido
Fuera del MVP (Fase 2 futura): voz, detección de crisis, envío real de emails, despliegue
Los servidores seguirán corriendo. Para detenerlos: Ctrl+C en la terminal donde corre npm run dev, o mátalos con taskkill //F //IM node.exe.