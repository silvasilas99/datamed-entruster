FROM node:24-bookworm-slim

ARG DOCKER_VERSION=27.3.1
ARG COMPOSE_VERSION=v2.29.7

RUN apt-get update \
  && apt-get install -y --no-install-recommends \
    bash \
    ca-certificates \
    curl \
    git \
    jq \
    python3 \
    make \
    g++ \
  && rm -rf /var/lib/apt/lists/*

# Official static Docker CLI (no docker-compose v1 — network.sh must use `docker compose`)
RUN curl -fsSL "https://download.docker.com/linux/static/stable/x86_64/docker-${DOCKER_VERSION}.tgz" \
    | tar -xz -C /tmp \
  && mv /tmp/docker/docker /usr/local/bin/docker \
  && rm -rf /tmp/docker \
  && mkdir -p /usr/local/lib/docker/cli-plugins \
  && curl -fsSL "https://github.com/docker/compose/releases/download/${COMPOSE_VERSION}/docker-compose-linux-x86_64" \
    -o /usr/local/lib/docker/cli-plugins/docker-compose \
  && chmod +x /usr/local/lib/docker/cli-plugins/docker-compose \
  && ln -s /usr/local/lib/docker/cli-plugins/docker-compose /usr/local/bin/docker-compose

WORKDIR /workspace

COPY entrypoint.sh /entrypoint.sh
RUN chmod +x /entrypoint.sh

ENTRYPOINT ["/entrypoint.sh"]
