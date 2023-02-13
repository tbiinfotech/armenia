require("dotenv").config();
const express = require("express"),
  cookieParser = require("cookie-parser"),
  session = require("express-session"),
  fs = require("fs"),
  https = require("https"),
  cors = require("cors"),
  app = express(),
 
  helmet = require("helmet");
const { Op } = require("sequelize");
const { Shopify } = require("@shopify/shopify-api");
const PORT = 443;
// Parse application/x-www-form-urlencoded
app.use(express.static("public"));
app.use(cookieParser());
app.use(cors(
  { origin: '*'}
));
app.use(express.urlencoded({ extended: false }));
const path = require("path");
app.use(helmet());

// View Template Engine
app.set("view engine", "pug");

// App session
app.use(
  session({
    secret: process.env.SHOPIFY_API_SECRET,
    cookie: {
      path: "/",
      httpOnly: false,
      expires: new Date(Date.now() + 60000),
      maxAge: 60000,
    },
    resave: true,
    saveUninitialized: true,
  })
);
console.log('asdasdas');
app.use(function (req, res, next) {
  console.log('here');
  res.header('Access-Control-Allow-Origin', '*');

  // res.setHeader(
    // 'Content-Security-Policy', 
    // `frame-ancestors 'self' https://armeniann.myshopify.com  https://admin.shopify.com;`,
    // "script-src 'self' https://app.primecasualwear.com:443"
  //  `frame-ancestors 'self' https://armeniann.myshopify.com  https://admin.shopify.com;`,
  // );
  // console.log(res.setHeader("Content-Security-Policy", "frame-src https://admin.shopify.com/store/armeniann/apps/armeniana https://app.primecasualwear.com:443/"))
  // res.setHeader("Content-Security-Policy", "frame-ancestors https://myshopify.com https://armeniann.myshopify.com https://admin.shopify.com;");
  // res.setHeader(
  //   'Content-Security-Policy',
  //   // "script-src 'self' https://armeniann.myshopify.com  https://admin.shopify.com;"
  //   "frame-ancestors 'self' https://armeniann.myshopify.com  https://admin.shopify.com;"
  // );
  // res.setHeader(
  //   'Content-Security-Policy',
  //   "frame-ancestors 'primecasualwear.com'"

  // );
  next();
});

const dirPath = path.resolve(__dirname, "./controllers");
fs.readdirSync(dirPath).forEach(function (file) {
  if (file !== "api") {
    fs.readdirSync(dirPath).forEach(function (file) {
      if (file.substr(-3) == ".js") {
        var api = require(dirPath + "/" + file);
        api.controller(app, Shopify, Op);
      }
    });
  }
});
const httpsServer = https.createServer({
  cert: fs.readFileSync("/etc/letsencrypt/archive/app.primecasualwear.com/fullchain1.pem"),
  ca: fs.readFileSync("/etc/letsencrypt/archive/app.primecasualwear.com/cert1.pem"),
  key: fs.readFileSync("/etc/letsencrypt/archive/app.primecasualwear.com/privkey1.pem"),
},
app
);

httpsServer.listen(PORT, () => {
  console.log(`HTTPS Server running on PORT ${PORT}`);
});
// app.listen(port);
// console.log("listening on port " + port);
