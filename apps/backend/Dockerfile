FROM node:22-alpine AS base
WORKDIR /app

FROM base AS deps
COPY package.json package-lock.json ./
RUN npm ci --ignore-scripts

FROM base AS production
COPY --from=deps /app/node_modules ./node_modules
COPY dist/apps/backend ./
EXPOSE 3001
CMD ["node", "main.js"]
