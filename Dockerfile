## Set our base image ##
FROM node:22-bookworm

# Updates and Installs latest Chromium package.
RUN apt-get update && apt-get upgrade -y && \
    apt-get install -y chromium dumb-init \
    libasound2 libatk-bridge2.0-0 libatk1.0-0 libatspi2.0-0 libc6 libcairo2 libcups2 libdbus-1-3 libdrm2 libexpat1 libgbm1 libglib2.0-0 libnspr4 libnss3 libpango-1.0-0 libpangocairo-1.0-0 libstdc++6 libudev1 libuuid1 libx11-6 libx11-xcb1 libxcb-dri3-0 libxcb1 libxcomposite1 libxcursor1 libxdamage1 libxext6 libxfixes3 libxi6 libxkbcommon0 libxrandr2 libxrender1 libxshmfence1 libxss1 libxtst6

# Copy App Files
COPY ./app /app/

# Create User and Group
RUN useradd --user-group --system pptruser \
    && mkdir -p /home/pptruser/Downloads \
    && chown -R pptruser:pptruser /home/pptruser \
    && chown -R pptruser:pptruser /app

# Run user as non privileged.
USER pptruser
WORKDIR /app

# Skip downloading Chromium when installing puppeteer. We'll use the installed package.
ENV PUPPETEER_SKIP_CHROMIUM_DOWNLOAD=true

# Install node packages
RUN npm install

# Install Browsers
#RUN npx puppeteer browsers install chrome

# Expose Ports
ENV PORT=8080
EXPOSE 8080

# Entrypoint
ENTRYPOINT ["dumb-init", "--"]
CMD ["node", "index.js"]
