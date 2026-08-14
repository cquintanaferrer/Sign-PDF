# Build stage
FROM node:22-alpine AS build

# Install pnpm
RUN npm install -g pnpm@10.34.3

WORKDIR /app

# Copy dependency definition files
COPY package.json pnpm-lock.yaml ./

# Install dependencies
RUN pnpm install --frozen-lockfile

# Copy the rest of the application files
COPY . .

# Build the production bundle
RUN pnpm build

# Production stage
FROM nginx:alpine AS production

# Copy built static files to Nginx directory
COPY --from=build /app/dist /usr/share/nginx/html

# Copy custom Nginx configuration
COPY nginx.conf /etc/nginx/conf.d/default.conf

EXPOSE 80

CMD ["nginx", "-g", "daemon off;"]
