# Armenia Shopify Payment Gateway

Armeniapayment gateway application in Shopify code.

## Rename .env-sample to .env

update the HOST value to your host URL (domain should be SSL enabled)

update SHOPIFY_REDIRECT_URI={HOST}/auth/callback

## Script File

In public/armenia_script.js

update var url = {HOST}/api/shopify

## Installation

Use the node package manager to install dependencies

npm install

## Running the tests

node index.js

## Database

In config/config.json

username={username}

password={password}

database={database_name}

host={HOST}

## Migration command

install npm install --save-dev sequelize-cli

migration npx sequelize-cli db:migrate

## NPM Versioning

node version: v18.13.0