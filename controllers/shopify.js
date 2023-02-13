const models = require('../models')
const superagent = require('superagent')
const nonce = require('nonce')();
var cookieParser = require('cookie-parser')
var querystring = require('querystring');
var crypto = require('crypto')
const request = require('request-promise')
require('dotenv').config()

module.exports.controller = function (app, Shopify, Op) {
    app.get('/', async (req, res) => {
        console.log("I am here");
        const shop_name = req.query.shop;
        if (shop_name) {
            const shopState = nonce();
            const redirect_url = `${process.env.APP_URL}/shopify-api/callback`;
            const shopify_url = `https://${shop_name}/admin/oauth/authorize?client_id=${process.env.SHOPIFY_API_KEY}&scope=${process.env.SCOPES}&state=${shopState}&redirect_uri=${redirect_url}`;
           console.log(shopify_url)
            res.cookie("state", shopState);
            res.redirect(shopify_url);
        } else {
            // res.render('welcome');
            return res.status(400).send("Missing Shop Name parameter!! please add");
        }
    })

    app.get('/shopify-api/callback',cors(), async (req, res) => {
        const auth_user = req.auth_user;
        const { shop, hmac, code, shopState } = req.query;

        // try {
            const store_name = shop;
            const stateCookie = cookieParser(req.headers.cookie).state;
            // console.log(store_name)

            if (!shopState == stateCookie) {
                return res.status(403).send("Request origin cannot be verified");
            }

            if (store_name && hmac && code) {
                const queryMap = Object.assign({}, req.query);
                delete queryMap["signature"];
                delete queryMap["hmac"];

                const message = querystring.stringify(queryMap);
                const providedHmac = Buffer.from(hmac, "utf-8");
                const generatedHash = Buffer.from(crypto.createHmac("sha256", process.env.SHOPIFY_API_SECRET).update(message).digest("hex"), "utf-8");

                let hashEquals = false;

                try {
                    hashEquals = crypto.timingSafeEqual(generatedHash, providedHmac);
                } catch (e) {
                    hashEquals = false;
                }

                if (!hashEquals) {
                    return res.status(400).send("HMAC validation failed");
                }

                const accessTokenRequestUrl = `https://${store_name}/admin/oauth/access_token`;
                const accessTokenPayload = {
                    client_id: process.env.SHOPIFY_API_KEY,
                    client_secret: process.env.SHOPIFY_API_SECRET,
                    code,
                };
               
                await request.post(accessTokenRequestUrl,{json: accessTokenPayload }).then(async(accessTokenResponse) => {
                        const accessToken = accessTokenResponse.access_token;
                        console.log(req)
                        /** Insert Data in the store table **/
                        var store = await models.Store.findOne({
                            where: {
                                url: shop,
                            },
                        })
                        await store_keys(shop)
                        // App is already installed
                        if (store) {
                            await models.Store.update({
                                password: accessToken,
                                deleted_at: new Date()
                            }, {
                                where: {
                                    url: shop
                                }
                            })
                        } else {
                            store = await models.Store.create({
                                name: shop,
                                url: shop,
                                // email: 'y@t.cpm',
                                password: accessToken
                            })
                        }
                        // return res.redirect('https://admin.shopify.com/store/armeniann')
                return res.redirect('/api/shopify/configuration/index/' + store.id)

                    })
                    .catch((error) => {
                        // console.error("ShopifyCallback error----------", error);
                        res.status(error.statusCode).send(error.error.error_description);
                    });
            } else {
                res.status(400).send("Required parameters missing");
            }
        // } catch (error) {
        //     console.error("ShopifyCallback error -----------------", error);
        //     return res.json({
        //         error: error,
        //         status: false,
        //         message: "Something went wrong. Please try again.",
        //     });
        // }
    })

    async function store_keys(store_url) {

        var store_key = await models.StoreKeys.findOne({
            where: { store_url: store_url }
        })
        if (store_key) {
            // Shopify App Initialization 
            Shopify.Context.initialize({
                API_KEY: store_key.api_key,
                API_SECRET_KEY: store_key.api_secret,
                SCOPES: process.env.SCOPES,
                HOST_NAME: process.env.HOST,
                API_VERSION: process.env.SHOPIFY_API_VERSION,
                IS_EMBEDDED_APP: true,
                SESSION_STORAGE: new Shopify.Session.MemorySessionStorage(),
            })
            app.locals.api_key = store_key.api_key
        }
        return Shopify;
    }

    async function store_webhook(store, accessToken) {

        const shopRequestURL =
            'https://' +
            store +
            '/admin/api/' +
            process.env.SHOPIFY_API_VERSION +
            '/webhooks.json'

        superagent
            .post(shopRequestURL)
            .send({
                "webhook": {
                    "topic": "app/uninstalled",
                    "address": `https://${process.env.HOST}/api/shopify/uninstall/${store}`,
                    "format": "json"
                }
            })
            // sends a JSON post body
            .set('X-Shopify-Access-Token', accessToken)
            .set('Content-Type', 'application/json')
            .end((err, res) => {
            })
        return
    }

    app.get('/api/shopify/auth', async (req, res) => {
        const shop = req.query.shop
        if (!shop) {
            return res.status(400).send('Missing "Shop Name" parameter!!')
        }
        // Find is store already existing as user
        const store = await models.Store.findOne({
            where: {
                url: shop,
                password: { [Op.ne]: '' }
            },
        })
        // App is already installed
        if (store) {
            req.session.user = shop
            return res.redirect('/api/shopify/configuration/index/' + store.id)
        }
        // Generate token and install app after authorization
        if (!store && shop) {
            // Install URL for app install
            const ShopifyApp = await store_keys(shop)
            const authRoute = await ShopifyApp.Auth.beginAuth(
                req,
                res,
                req.query.shop,
                '/api/shopify/auth/callback',
                false,
            );
            return res.redirect(authRoute);
        }
        res.status(400).send('Invalid Request')
    })

    app.get('/api/shopify/auth/callback', async (req, res) => {
        try {
            const currentSession = await Shopify.Auth.validateAuthCallback(
                req,
                res,
                req.query
            )
            const { accessToken, shop, onlineAccessInfo } = currentSession
            await store_webhook(req.query.shop, accessToken);
            // Save data in database
            var store = await models.Store.findOne({
                where: {
                    url: shop,
                },
            })
            await store_keys(shop)
            // App is already installed
            if (store) {
                await models.Store.update({
                    password: accessToken,
                    deleted_at: new Date()
                }, {
                    where: {
                        url: shop
                    }
                })
            } else {
                store = await models.Store.create({
                    name: shop,
                    url: shop,
                    email: onlineAccessInfo.associated_user.email,
                    password: accessToken
                })
            }
            return res.redirect('/api/shopify/configuration/index/' + store.id)
        } catch (error) {
            res.status(400).send('Required parameters missing')
        }
    })
    app.post('/api/shopify/uninstall/:shop', async (req, res) => {
        try {
            const shop = req.params.shop;
            if (shop) {
                await models.Store.update({
                    password: '',
                    deleted_at: Date.now()
                }, {
                    where: {
                        url: shop
                    }
                })
            }
            res.status(200).send('Ok')
        } catch (error) {
            res.status(200).send('Ok')
        }
    })


}
