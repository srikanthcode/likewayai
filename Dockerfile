FROM mcr.microsoft.com/playwright:v1.61.1-noble

WORKDIR /app

# Set Playwright browsers path and production environment for Render
ENV PLAYWRIGHT_BROWSERS_PATH=/ms-playwright
ENV PLAYWRIGHT_SKIP_BROWSER_DOWNLOAD=0
ENV PORT=10000
ENV NODE_ENV=production

# Copy package files first for better caching
COPY package.json package-lock.json ./
RUN npm install --include=dev

# Verify Playwright browsers are available
RUN npx playwright install --with-deps chromium 2>&1 || echo "WARNING: Chromium install failed (non-fatal)"

# Copy application source
COPY . .

# Build the Next.js application
RUN npm run build

# Expose Render default port
EXPOSE 10000

# Start the application
CMD ["npm", "start"]
