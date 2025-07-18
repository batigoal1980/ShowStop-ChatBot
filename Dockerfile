# Use Node.js 18 Alpine for smaller image size
FROM node:18-alpine

# Set working directory
WORKDIR /app

# Copy package files
COPY package*.json ./
COPY client/package*.json ./client/

# Install dependencies
RUN npm install
RUN cd client && npm install

# Copy source code
COPY . .

# Build the React app
RUN cd client && npm run build

# Expose port
EXPOSE 5001

# Set environment variables
ENV NODE_ENV=production
ENV PORT=5001

# Start the application
CMD ["npm", "run", "start:prod"] 