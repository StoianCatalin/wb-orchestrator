FROM --platform=linux/amd64 node:lts as builder

ARG project

# Create app directory
WORKDIR /usr/src/app

# Install app dependencies
COPY package.json yarn.lock ./

RUN yarn install --frozen-lockfile

COPY . .

RUN yarn build $project

FROM --platform=linux/amd64 node:lts-slim

ARG project

# Create app directory
WORKDIR /usr/src/app

# Install app dependencies
COPY package.json yarn.lock ./

RUN yarn install --production --frozen-lockfile

COPY --from=builder /usr/src/app/dist/apps/$project ./dist

CMD [ "node", "dist/main.js" ]