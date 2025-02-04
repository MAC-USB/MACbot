FROM node:20-bookworm-slim

# Set working directory
WORKDIR /app

# Copy docker-json folder
COPY docker-json ./docker-json

# Copy the entrypoint script
COPY bot-runner.sh .

# Update npm
RUN npm install -g npm@latest

# Run the bash script for building and starting the bot
ENTRYPOINT [ "/bin/bash", "bot-runner.sh" ]
