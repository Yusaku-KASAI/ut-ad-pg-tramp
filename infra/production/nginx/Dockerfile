FROM node:lts as node-vue

COPY ./laravel /var/www/html

WORKDIR /var/www/html

RUN npm install && \
    npm run build


FROM nginx:alpine

COPY ./infra/production/nginx/default.conf /etc/nginx/conf.d/default.conf

WORKDIR /var/www/html

COPY --from=node-vue /var/www/html/public ./public

EXPOSE 80
