const { BlobServiceClient } = require('@azure/storage-blob');
const dotenv = require('dotenv');

dotenv.config();

// Configurarea clientului pentru Azure Blob Storage
const blobServiceClient = BlobServiceClient.fromConnectionString(
  `DefaultEndpointsProtocol=https;AccountName=${process.env.AZURE_STORAGE_ACCOUNT_NAME};AccountKey=${process.env.AZURE_STORAGE_ACCOUNT_KEY};EndpointSuffix=core.windows.net`
);

const containerName = process.env.AZURE_STORAGE_CONTAINER_NAME;
const containerClient = blobServiceClient.getContainerClient(containerName);

// Funcție pentru verificarea și crearea containerului dacă nu există
async function initializeStorage() {
  try {
    const exists = await containerClient.exists();
    if (!exists) {
      console.log(`Crearea containerului: ${containerName}`);
      await containerClient.create();
      console.log(`Containerul ${containerName} a fost creat`);
    } else {
      console.log(`Containerul ${containerName} există deja`);
    }
  } catch (err) {
    console.error('Eroare la inițializarea storage-ului:', err);
    throw err;
  }
}

module.exports = {
  containerClient,
  initializeStorage
}; 