FROM node:22-alpine AS base
WORKDIR /app

FROM base AS deps
COPY package.json package-lock.json ./
RUN npm ci --ignore-scripts

FROM base AS build
COPY --from=deps /app/node_modules ./node_modules
COPY . .
RUN npx nx build frontend --configuration=production

FROM caddy:2-alpine AS production
COPY --from=build /app/dist/apps/frontend /srv
COPY apps/frontend/Caddyfile /etc/caddy/Caddyfile
EXPOSE 5173
