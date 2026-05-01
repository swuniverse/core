FROM node:22-alpine AS base
WORKDIR /app

FROM base AS deps
COPY package.json package-lock.json ./
RUN npm ci --ignore-scripts

FROM base AS build
COPY --from=deps /app/node_modules ./node_modules
COPY . .
RUN npx nx build backend --configuration=production

FROM base AS production
COPY --from=deps /app/node_modules ./node_modules
COPY --from=build /app/dist/apps/backend ./
EXPOSE 3001
CMD ["node", "main.js"]
