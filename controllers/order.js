const models = require('../models')
const request = require('request-promise')
const superagent = require('superagent')
require('dotenv').config()
const api_version = process.env.SHOPIFY_API_VERSION

module.exports.controller = function (app) {
    // get order
    app.get('/api/shopify/get-order/:order_id/:shop', async (req, res) => {
        // console.log('get-order');
        var order_id = req.params.order_id
        var shop_name = req.params.shop
        try {
            var order = await models.order.findOne({
                where: { order_id: order_id },
            })
            // console.log(order, 'orders');
            if (!order) {
                var shop = await models.Store.findOne({
                    where: { url: shop_name },
                })
                if (shop) {
                    const accessToken = shop.password
                    const shopRequestURL =
                        'https://' +
                        shop_name +
                        '/admin/api/' +
                        api_version +
                        '/orders/' +
                        order_id +
                        '.json'
                    const shopRequestHeaders = {
                        'X-Shopify-Access-Token': accessToken,
                    }
                    request
                        .get(shopRequestURL, { headers: shopRequestHeaders })
                        .then(async (shopResponse) => {
                            const order_response =
                                JSON.parse(shopResponse).order
                            const email = order_response.email
                            const order_status_url =
                                order_response.order_status_url
                            const processing_method =
                                order_response.processing_method
                            const order_placed = await models.order.create({
                                order_id: order_id,
                                order_payment_id: order_id.substring(4, 13),
                                order_name: order_response.name,
                                amount: order_response.total_price,
                                email,
                                first_name: order_response.customer.first_name,
                                last_name: order_response.customer.last_name,
                                customer_id: order_response.customer.id,
                                currency: order_response.customer.currency,
                                code: '',
                                phone: order_response.customer.phone,
                                payment_status: order_response.financial_status,
                                payment_method: processing_method,
                                order_status_url,
                                mode: 1,
                                processed: 0,
                                store_id: shop.id,
                            })
                            if (order_placed) {
                                // console.log(order_placed, 'order_placed');
                                return res.send({
                                    status: true,
                                    gateway: 'armenian',
                                    financial_status: order_response.financial_status
                                })
                            } else {
                                return res.send({ status: false })
                            }
                        }).catch((err) => {
                            console.log('get-order', err)
                            return res.send({ status: false, message: err.message })
                        })
                }
            } else {
                return res.send({
                    status: false,
                    gateway: order.payment_method,
                    financial_status: order.payment_status,
                })
            }
        } catch (e) {
            return res.send({
                status: false,
                error: 'Something went wrong.'
            })
        }
    })

    //processed api
    app.get('/api/shopify/processed/:order_id', async (req, res) => {
        var order_id = req.params.order_id
        try {
            var process = await models.order.findOne({
                where: { order_id: order_id, processed: 0 },
            })
            if (process) {
                return res.send({ status: true })
            } else {
                return res.send({ status: false })
            }
        } catch (e) {
            return res.send({ error: true, messsage: 'Something went wrong.' })
        }
    })

    app.get('/api/shopify/processing/:order_id/:shop', async (req, resp) => {
        var order_id = req.params.order_id
        var shop = req.params.shop
        var order = await models.order.findOne({
            where: { order_id },
        })
        // console.log(order.order_payment_id,"new detail")
        if (!order) {
            return resp.redirect('/api/shopify/error-page')
        }

        var store = await models.Store.findOne({
            where: { name: shop }
        })

        if (!store) {
            return resp.redirect(order.order_status_url)
        }

        var configuration = await models.Configuration.findOne({
            where: { store_id: store.id }
        })

        if (!configuration) {
            return resp.redirect(order.order_status_url)
        }

        var token = configuration.token;
        if (token == '') {
            return resp.redirect(order.order_status_url)
        }
        var UserName = configuration.api_key;
        if (UserName == '') {
            return resp.redirect(order.order_status_url)
        }
        var password = configuration.password;
        if (password == '') {
            return resp.redirect(order.order_status_url)
        }
        var ClientId = configuration.api_secret;
        if (ClientId == '') {
            return resp.redirect(order.order_status_url)
        }
        // console.log(order);

        try {

            superagent
                .post(process.env.PAYMENT_PROCESS_URL)
                .send({
                    UserName: UserName,
                    password: password,
                    orderID: order.order_payment_id,
                    Currency: "051",
                    Amount: order.amount,
                    ClientId: ClientId,
                    BackURL: `${process.env.APP_URL}/api/shopify/payment/callback`
                    // UserName: '19534038_api',
                    // password: 'DA5GQpXGeaXovP16',
                    // orderID: order.order_payment_id,
                    // Currency: "051",
                    // Amount: order.amount,
                    // ClientId: '8be292d8-c027-4ac9-a75f-6698b9cfc2ac',
                    // BackURL: 'https://app.primecasualwear.com:443/api/shopify/payment/callback'

                })
                //  sends a JSON post body
                .set('Authorization', 'Bearer ' + token)
                .set('Content-Type', 'application/json')
                .end((err, res) => {
                    // console.log(order.order_payment_id, 'order_id.order_payment_id');
                    console.log(res, 'resres');
                    console.log(res._body.PaymentID, 'PaymentID');
                    return resp.redirect(process.env.PAYMENT_PAY_URL + '?id=' + res._body.PaymentID)

                })
        } catch (e) {
            if (order) {
                return resp.redirect(order.order_status_url)
            }
            return resp.redirect('/api/shopify/error-page')
        }
    })
    app.get('/api/shopify/test', async (req, resp) => {
    //    res.setHeader("Content-Security-Policy", "frame-ancestors https://myshopify.com");

        return resp.redirect(`${process.env.APP_URL}`)
        // superagent
        //     .post(process.env.PAYMENT_PROCESS_URL)
        //     .send({
        //         UserName: '19534038_api',
        //         password: "DA5GQpXGeaXovP16",
        //         orderID: '854362414',
        //         Currency: "051",
        //         Amount: '111',
        //         ClientId: "8be292d8-c027-4ac9-a75f-6698b9cfc2ac",
        //         BackURL: "https://app.primecasualwear.com:443/api/shopify/payment/callback"
        //     })
        //     //  sends a JSON post body
        //     .set('Authorization', 'Bearer ' + token)
        //     .set('Content-Type', 'application/json')
        //     .end((err, res) => {
        //         console.log(res._body.PaymentID, 'res redirect');
        //         return resp.redirect('https://services.ameriabank.am/VPOS/Payments/Pay?id=' + res._body.PaymentID)
        //     })

    });
    app.get('/api/shopify/test', async (req, resp) => {
        //    res.setHeader("Content-Security-Policy", "frame-ancestors https://myshopify.com");
    
           
    
        });
    app.get('/api/shopify/payment/callback', async (req, resp) => {
        var order_payment_id = req.query.orderID;
        var resposneCode = req.query.resposneCode;
        var payment_status = req.query.status;
        // var order = await models.order.findOne({
        //     where: { order_id },
        // })
        var order = await models.order.findOne({
            where: {order_payment_id: order_payment_id},
        })
      var order_id =order.order_id
        try {
            if (order) {
                var shop = await models.Store.findOne({
                    where: { id: order.store_id },
                })
                var shop_name = shop.name;
                if (shop) {
                    const accessToken = shop.password
                    if (resposneCode == '00') {
                            //payment complete
                            const transactionRequestURL =
                                'https://' +
                                shop_name +
                                '/admin/api/' +
                                api_version +
                                '/orders/' +
                                order_id +
                                '/transactions.json'
                            superagent
                                .get(transactionRequestURL)
                                // sends a JSON post body
                                .set('X-Shopify-Access-Token', accessToken)
                                .set('Content-Type', 'application/json')
                                .end((err, res) => {
                                  
                                    var transaction_amount = res.body.transactions[0].amount;
                                    var transaction_currency = res.body.transactions[0].currency;
                                    var transaction_parent = res.body.transactions[0].id;
                                    //post
                                    const transactionPostURL =
                                        'https://' +
                                        shop_name +
                                        '/admin/api/' +
                                        api_version +
                                        '/orders/' +
                                        order_id +
                                        '/transactions.json'

                                    superagent
                                        .post(transactionPostURL)
                                        // sends a JSON post body
                                        .send({
                                            "transaction": {
                                                "amount": transaction_amount,
                                                "currency": transaction_currency,
                                                "kind": "capture",
                                                "parent_id": transaction_parent
                                            }
                                        })
                                        .set('X-Shopify-Access-Token', accessToken)
                                        .set('Content-Type', 'application/json')
                                        .end((err, ress) => {
                                            models.order.update({
                                                payment_status: ress.body.transaction.status,
                                                txid: ress.body.transaction.id,
                                                amount_paid: ress.body.transaction.amount,
                                                currency: ress.body.transaction.currency,
                                                payment_message: ress.body.transaction.message
                                            }, {
                                                where: {
                                                    order_id: order_id
                                                }
                                            })
                                            const shopRequestURL =
                                                'https://' +
                                                shop_name +
                                                '/admin/api/' +
                                                api_version +
                                                '/orders/' +
                                                order_id +
                                                '.json'
                                            superagent
                                                .get(shopRequestURL)
                                                // sends a JSON post body
                                                .set('X-Shopify-Access-Token', accessToken)
                                                .set('Content-Type', 'application/json')
                                                .end((err, resss) => {
                                                    resp.redirect(resss.body.order.order_status_url)
                                                })
                                        })
                                })

                    } else if (resposneCode == '02003') {
                        //decline payment
                        const accessToken = shop.password
                        const shopRequestURL =
                            'https://' +
                            shop_name +
                            '/admin/api/' +
                            api_version +
                            '/orders/' +
                            order_id +
                            '/cancel.json'
                        superagent
                            .post(shopRequestURL)
                            .send({
                                "order_id": order_id,
                            })
                            // sends a JSON post body
                            .set('X-Shopify-Access-Token', accessToken)
                            .set('Content-Type', 'application/json')
                            .end((err, res) => {
                                var  order_idz =order.order_id 
                                // console.log(order_id,'order_id')

                           var test =     models.order.update({
                                    payment_status: 'decline',
                                }, {
                                    where: {
                                        order_id: order_idz
                                    }
                                })
                                // console.log(test,'asdasdasdasd')
                                // console.log(res.body.order.order_status_url,'werdfgdfg')
                                resp.redirect(res.body.order.order_status_url)
                            })
                    } else {
                        //cancel payment
                        const accessToken = shop.password
                        const shopRequestURL =
                            'https://' +
                            shop_name +
                            '/admin/api/' +
                            api_version +
                            '/orders/' +
                            order_id +
                            '/cancel.json'
                        superagent
                            .post(shopRequestURL)
                            .send({
                                "order_id": order_id,
                            })
                            // sends a JSON post body
                            .set('X-Shopify-Access-Token', accessToken)
                            .set('Content-Type', 'application/json')
                            .end((err, res) => {
                                models.order.update({
                                    payment_status: 'cancel',
                                }, {  
                                    where: {
                                        order_id: order_id
                                    }
                                })
                                resp.redirect(res.body.order.order_status_url)
                            })
                    }
                }
            }
        } catch (e) {
            console.log('catch')
            if (order) {
                return resp.redirect(order.order_status_url)
            }
            return resp.redirect('/api/shopify/error-page')
        }
    })



}
