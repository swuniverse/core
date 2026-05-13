FROM node:22-alpine AS base
WORKDIR /app

FROM base AS deps
COPY package.json package-lock.json ./
RUN npm ci --ignore-scripts

FROM base AS build
COPY --from=deps /app/node_modules ./node_modules
COPY package.json package-lock.json nx.json tsconfig.base.json tsconfig.json ./
COPY apps/backend ./apps/backend
COPY packages ./packages
RUN npx nx build backend

FROM base AS production
COPY --from=deps /app/node_modules ./node_modules
COPY --from=build /app/apps/backend/dist ./dist
COPY game-data ./game-data
EXPOSE 3001
CMD ["node", "dist/main.js"]
