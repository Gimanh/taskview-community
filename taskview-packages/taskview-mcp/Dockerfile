FROM node:24-alpine AS deps

WORKDIR /usr/src/app

COPY package.json ./
# npm cannot parse pnpm's workspace: protocol in devDependencies; only the
# runtime deps matter here, so drop the dev section before installing
RUN node -e "const p = require('./package.json'); delete p.devDependencies; require('fs').writeFileSync('package.json', JSON.stringify(p, null, 2))" \
  && npm install --omit=dev

FROM node:24-alpine

WORKDIR /usr/src/app

# npm/corepack are build-time tools; their vendored deps (tar, undici, ...)
# carry CVEs, so the runtime image ships without them
RUN rm -rf /usr/local/lib/node_modules /usr/local/bin/npm /usr/local/bin/npx /usr/local/bin/corepack /opt/yarn* /usr/local/bin/yarn /usr/local/bin/yarnpkg

COPY --from=deps /usr/src/app/node_modules ./node_modules
COPY package.json ./
COPY dist ./dist

ENV MCP_HTTP_PORT=3100
EXPOSE 3100

USER node

CMD ["node", "dist/http.js"]
