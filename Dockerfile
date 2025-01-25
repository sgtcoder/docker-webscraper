## Set our base image ##
FROM node:22-bookworm

# Updates and Installs latest Chromium package.
RUN apt-get update && apt-get upgrade -y && \
    apt-get install -y chromium

# Help prevent zombie chrome processes
RUN wget https://github.com/Yelp/dumb-init/releases/download/v1.2.5/dumb-init_1.2.5_amd64.deb
RUN dpkg -i dumb-init_*.deb

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
ENV PUPPETEER_SKIP_CHROMIUM_DOWNLOAD true

# Install node packages
RUN npm install

# Expose Ports
ENV PORT 8080
EXPOSE 8080

# Entrypoint
ENTRYPOINT ["dumb-init", "--"]
CMD ["node", "index.js"]
