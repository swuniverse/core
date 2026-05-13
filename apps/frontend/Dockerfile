FROM node:22-alpine AS base
WORKDIR /app

FROM base AS deps
COPY package.json package-lock.json ./
RUN npm ci --ignore-scripts

FROM base AS build
COPY --from=deps /app/node_modules ./node_modules
COPY package.json package-lock.json nx.json tsconfig.base.json tsconfig.json ./
COPY apps/frontend ./apps/frontend
COPY packages ./packages
RUN npx nx build frontend

FROM caddy:2-alpine AS production
COPY --from=build /app/apps/frontend/dist /srv
COPY --from=build /app/apps/frontend/Caddyfile /etc/caddy/Caddyfile
EXPOSE 5173
