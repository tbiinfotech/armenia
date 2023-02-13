const models = require("../models");
cors = require("cors"),

module.exports.controller = function (app) {
  app.get("/api/shopify/configuration/index/:id", cors(),async (req, res) => {
    res.setHeader("Content-Security-Policy", "script-src 'self' https://app.primecasualwear.com:443/");
    // res.setHeader( 
    //   'Content-Security-Policy',
    //   "frame-src 'https://armeniann.myshopify.com/' 'https://app.primecasualwear.com:443/' 'https://admin.shopify.com/';"
    // );
    res.setHeader("X-Frame-Options", "ALLOWALL");
    // res.setHeader(
    //   'Content-Security-Policy',
    //   "frame-src self;"
    // );
    var store_id = req.params.id;
    var configuration = await models.Configuration.findOne({
      where: { store_id },
    });
    var store = await models.Store.findOne({
      where: { id: store_id },
    });
    if (!configuration) {
      configuration = {
        store_id,
        mode: 0,
        password:"",
        api_key: "",
        token: "",
        api_secret: "",
      };
    }
    var host = Buffer.from(`${store.url}/admin`).toString("base64");
    res.render("configuration/index", {
      configuration,
      host: JSON.stringify(host),
    });
  });

  app.get("/api/shopify", async (req, res) => {
    res.send("ArmenianShopify");
  });
  app.post("/api/shopify/configuration/create", async (req, res) => {
    res.setHeader(
      'Content-Security-Policy',
      `frame-ancestors https://*.primecasualwear.com:443/ https://*.myshopify.com  https://*.shopify.com;`
    );

  //  console.log('test')
    const { api_key, password, api_secret, token, mode, store_id } = req.body;
    var configuration = await models.Configuration.findOne({
      where: { store_id },
    });
    try {
      if (configuration) {
        await models.Configuration.update(
          {
            api_key,
            password,
            api_secret,
            store_id,
            token,
            mode: mode === "on" ? 1 : 0,
          },
          {
            where: { id: configuration.id },
          }
        );
      } else {
        await models.Configuration.create({
          api_key,
          password,
          api_secret,
          store_id,
          token,
          mode: mode === "on" ? 1 : 0,
        });
      }
    } catch (errr) {
      return res.redirect("/api/shopify/error-page");
    }
    return res.redirect("/api/shopify/configuration/index/" + store_id);
  });

  app.get("/api/shopify/error-page", async (req, res) => {
    res.render("configuration/error");
  });
};
