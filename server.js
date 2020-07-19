require('dotenv').config();

const path = require('path')
const express = require('express');
const session = require('express-session');
const bodyParser = require('body-parser');
const app = express();
const Nexmo = require('nexmo');
const nexmo = new Nexmo({
  apiKey: process.env.NEXMO_API_KEY,
  apiSecret: process.env.NEXMO_API_SECRET
});
const SmsProxy = require('./smsProxy');

const smsProxy = new SmsProxy();
const availableProfessionals = [];

let verifyRequestId = null;
let verifyRequestNumber = null;

app.use(express.static('public'));

app.use(session({
  secret: 'wowwhatanamazingsecretsuchsecrecy',
  resave: false,
  saveUninitialized: true
}));

app.use(bodyParser.urlencoded({ extended: true }));

app.set('view engine', 'pug');

app.get('/', (req, res) => {
  //Display session
  if (!req.session.user) {
    res.render('index', {
      brand: process.env.NEXMO_BRAND_NAME
    });
  } else {
  res.render('index', {
    number: req.session.user.number,
    brand: process.env.NEXMO_BRAND_NAME,
    role: req.session.user.role
  });
}
});

app.get('/login', (req, res) => {
  res.render('login');
});

app.get('/logout', (req, res) => {
  req.session.destroy();
  res.redirect('/');
});

app.get('/webhooks/inbound-sms', (req, res) => {
  const from = req.query.msisdn;
  const to = req.query.to;
  const text = req.query.text;

  console.log('Message: ', from)

  smsProxy.proxySms(from, text);

  res.sendStatus(204);
});

app.post('/verify', (req, res) => {
  verifyRequestNumber = req.body.number;
  console.log('VERIFY NUMBER: ', verifyRequestNumber);
  nexmo.verify.request({
    number: verifyRequestNumber,
    brand: process.env.NEXMO_BRAND_NAME
  }, (err, result) => {
    console.log('RESULT::: ', result);
    if (err) {
      console.error(err);
    } else {
      verifyRequestId = result.request_id;
      console.log(`request_id: ${verifyRequestId}`);
    }
  });
  res.render('entercode');
});

app.post('/check-code', (req, res) => {
  nexmo.verify.check({
    request_id: verifyRequestId,
    code: req.body.code
  }, (err, result) => {
    if (err) {
      console.error(err);
    } else {
      if (result.status == 0) {
        if (req.body.role === 'driver') availableProfessionals.push({ number: verifyRequestNumber });
        req.session.user = {
          number: verifyRequestNumber,
          role: req.body.role
        }
      }
    }
    res.redirect('/');
  });
});

app.post('/chat', (req, res) => {
  const firstUserNumber = req.body.user;
  console.log('Req number: ', req.body.user)
  const driver = availableProfessionals.shift();
  const secondUserNumber = driver && driver.number;

  console.log('Passenger number: ', firstUserNumber);
  console.log('Driver number: ', driver);

  smsProxy.createChat(firstUserNumber, secondUserNumber, (err, result) => {
    if (err) {
      res.status(500).json(err);
    } else {
      res.json(result);
    }
  });
  res.redirect('/');
});

const server = app.listen(3000, () => {
  console.log(`Server running on port ${server.address().port}`);
});