FROM node:18-alpine

WORKDIR /app

# Copy package files
COPY package*.json ./
COPY pnpm-lock.yaml ./

# Install pnpm
RUN npm install -g pnpm

# Install dependencies
RUN pnpm install

# Copy source files
COPY . .

# Build the frontend
RUN pnpm build

# Expose the port
EXPOSE 3456

# Start the server
CMD ["pnpm", "start"] 