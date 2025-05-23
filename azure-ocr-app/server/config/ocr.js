const { ComputerVisionClient } = require('@azure/cognitiveservices-computervision');
const { ApiKeyCredentials } = require('@azure/ms-rest-js');
const dotenv = require('dotenv');

dotenv.config();

// Configurarea clientului pentru Azure Computer Vision
const endpoint = process.env.AZURE_CV_ENDPOINT;
const key = process.env.AZURE_CV_SUBSCRIPTION_KEY;

if (!endpoint || !key) {
  throw new Error('AZURE_CV_ENDPOINT și AZURE_CV_SUBSCRIPTION_KEY trebuie configurate în .env');
}

const client = new ComputerVisionClient(
  new ApiKeyCredentials({ inHeader: { 'Ocp-Apim-Subscription-Key': key } }),
  endpoint
);

module.exports = { client }; 