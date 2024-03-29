FROM node:18-alpine AS builder

WORKDIR /app

RUN apk update && \
    apk upgrade && \
    apk add \
    make \
    g++ \
    python3 

COPY yarn.lock package.json ./

RUN yarn --production=true --frozen-lockfile --link-duplicates

FROM node:18-alpine

WORKDIR /app

ENV NODE_ENV="production"

RUN apk update && \
    apk upgrade && \
    apk add --no-cache dumb-init \
    ffmpeg

RUN mkdir /app/data && \
    chown -R node:node /app

COPY --chown=node:node --from=builder /app .
COPY --chown=node:node src/ src/
COPY --chown=node:node public/ public/

USER node:node

EXPOSE 3000/tcp

ENV SCRIPT_NAME=start:single

ENTRYPOINT [ "/usr/bin/dumb-init", "--" ]
CMD yarn run $SCRIPT_NAME