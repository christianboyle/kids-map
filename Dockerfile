FROM node:18-alpine

WORKDIR /app

# Copy all files
COPY . .

# Check if package.json exists (for debugging)
RUN ls -la package.json || echo "package.json not found"

# Install dependencies
RUN npm install -g pnpm
RUN pnpm install

# Build the frontend
RUN pnpm run build

# Expose the port
EXPOSE 3457

# Start the server
CMD ["pnpm", "start"] 
