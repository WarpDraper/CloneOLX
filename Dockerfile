# --- Build stage --------------------------------------------------------------------------
FROM node:20-alpine AS build
WORKDIR /app

# Install deps as a distinct layer so `npm ci` only reruns when package*.json actually change.
COPY package.json package-lock.json ./
RUN npm ci

COPY . .

# Build-time env: VITE_* vars are baked into the static bundle at build time (Vite convention),
# not read at container runtime. Pass them with `docker build --build-arg VITE_API_BASE_URL=...`
# (or via your CI/CD build step) — defaults below only cover a plain `docker build` with nothing
# passed in. .env.production (tracked, non-secret defaults) is also picked up automatically by
# `vite build` if no build-arg overrides it.
ARG VITE_API_BASE_URL
ENV VITE_API_BASE_URL=${VITE_API_BASE_URL}

RUN npm run build

# --- Serve stage ---------------------------------------------------------------------------
FROM nginx:1.27-alpine AS serve

COPY --from=build /app/dist /usr/share/nginx/html
COPY nginx.conf /etc/nginx/conf.d/default.conf

EXPOSE 80
CMD ["nginx", "-g", "daemon off;"]
