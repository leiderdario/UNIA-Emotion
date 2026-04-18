FROM node:20-alpine

WORKDIR /app

COPY package*.json ./

# Instalamos TODAS las deps (incluyendo devDependencies) para poder compilar
RUN npm ci

COPY . .

# Generamos el cliente de Prisma ANTES de compilar TypeScript
RUN npx prisma generate

# Compilamos TypeScript
RUN npm run build

EXPOSE 3000

# En runtime: aplicamos migraciones/push y arrancamos
CMD ["sh", "-c", "npx prisma db push && npm run start"]