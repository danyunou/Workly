// server/services/paypalService.js
const paypal = require('@paypal/checkout-server-sdk');
const { paypalClientId, paypalSecret } = require('../config/envConfig');

const env = new paypal.core.SandboxEnvironment(paypalClientId, paypalSecret);

const client = new paypal.core.PayPalHttpClient(env);

exports.createOrder = async (value) => {
  const request = new paypal.orders.OrdersCreateRequest();
  request.requestBody({
    intent: 'CAPTURE',
    purchase_units: [{ amount: { currency_code: 'USD', value } }],
  });

  const order = await client.execute(request);
  return order.result.id;
};

exports.captureOrder = async (orderID) => {
  const request = new paypal.orders.OrdersCaptureRequest(orderID);
  const capture = await client.execute(request);
  return capture.result.status;
};
