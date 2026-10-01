FROM node:22-bookworm-slim AS build
WORKDIR /app
COPY package.json package-lock.json ./
RUN npm ci
COPY . .
# VITE_* values are public bundle configuration, never secrets.
ARG VITE_GOOGLE_CLIENT_ID=
ARG VITE_ALLOW_PASSWORD_LOGIN=false
ENV VITE_BACKEND_URL="" \
    VITE_GOOGLE_CLIENT_ID=$VITE_GOOGLE_CLIENT_ID \
    VITE_ALLOW_PASSWORD_LOGIN=$VITE_ALLOW_PASSWORD_LOGIN
RUN npm run build

FROM nginx:stable-alpine
COPY nginx.conf /etc/nginx/conf.d/default.conf
COPY --from=build /app/dist /usr/share/nginx/html
EXPOSE 80
