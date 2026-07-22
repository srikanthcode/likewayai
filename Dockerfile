FROM mcr.microsoft.com/playwright:v1.61.1-noble

WORKDIR /app

ENV PLAYWRIGHT_BROWSERS_PATH=/ms-playwright

COPY package.json package-lock.json ./
RUN npm install --include=dev

COPY . .
RUN npm run build

EXPOSE 10000
CMD ["npm", "start"]
