FROM node:lts as node-vue

COPY ./laravel /var/www/html

WORKDIR /var/www/html

RUN npm install && \
    npm run build


FROM php:8.2-fpm

# composer create-project laravel/laravel . に必要
RUN apt-get update && apt-get install -y git zip unzip

# MySQLドライバ
RUN docker-php-ext-install pdo_mysql

COPY --from=composer:latest /usr/bin/composer /usr/bin/composer

WORKDIR /var/www/html

COPY ./laravel /var/www/html

COPY --from=node-vue /var/www/html/public ./public

# ECSではkeyは環境変数で注入する
RUN chown -R www-data:www-data /var/www/html/storage /var/www/html/bootstrap/cache && \
    chmod -R 777 /var/www/html/storage /var/www/html/bootstrap/cache && \
    rm -rf /var/www/html/.env.production /var/www/html/public/hot && \
    composer install --optimize-autoloader --no-dev && \
    php artisan config:clear && \
    php artisan route:clear && \
    php artisan view:clear && \ 
    php artisan key:generate && \
    php artisan config:cache && \
    php artisan route:cache && \
    php artisan view:cache

EXPOSE 9000
