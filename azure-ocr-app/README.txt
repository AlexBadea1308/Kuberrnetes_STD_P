# OCR Azure Application

Aplicatie OCR ce utilizeaza serviciile Azure pentru recunoasterea textului din imagini.

## Componente Azure necesare

1. **Azure App Service** - pentru gazduirea aplicatiei (frontend + backend)
2. **Azure Blob Storage** - pentru stocarea fisierelor incarcate
3. **Azure SQL Database** - pentru stocarea metadatelor si rezultatelor procesarii
4. **Azure Computer Vision** (Cognitive Services) - pentru procesarea OCR

## Structura proiectului

- **client/** - Front-end React
- **server/** - Back-end Node.js
- **server.js** - Serverul principal care serveste atat API-ul cat si build-ul React

## Variabile de mediu

Urmatoarele variabile de mediu trebuie configurate in App Service:

```
# Configurare Azure Storage
AZURE_STORAGE_ACCOUNT_NAME=
AZURE_STORAGE_ACCOUNT_KEY=
AZURE_STORAGE_CONTAINER_NAME=

# Configurare Azure Computer Vision
AZURE_CV_ENDPOINT=
AZURE_CV_SUBSCRIPTION_KEY=

# Configurare SQL Database
SQL_SERVER=
SQL_DATABASE=
SQL_USER=
SQL_PASSWORD=
SQL_PORT=1433

# Port pentru server
PORT=4000
```

## Pasi pentru deployment

### 1. Pregatirea aplicatiei pentru deployment

1. Instaleaza dependentele si construieste aplicatia:

```bash
# In directorul radacina al proiectului
npm install
npm run build
```

### 2. Deployment in Azure App Service utilizand Visual Studio Code

1. Instaleaza extensia Azure App Service din Visual Studio Code
2. Conecteaza-te la contul Azure
3. Click dreapta pe folder si selecteaza "Deploy to Web App"
4. Selecteaza Subscription
5. Selecteaza sau creeaza un nou App Service
6. Adauga variabilele de mediu din sectiunea anterioara in App Service

### 3. Verificare deployment

Dupa deployment, aplicatia ar trebui sa fie accesibila la URL-ul App Service (ex: https://ocr-app-alex1308.azurewebsites.net).

## Dezvoltare locala

Pentru dezvoltare locala:

1. Creeaza un fisier `.env` in directorul radacina cu variabilele de mai sus
2. Instaleaza dependentele:

```bash
npm install
cd client && npm install
cd ../server && npm install
```

3. Porneste serverul de dezvoltare:

```bash
# In directorul radacina
npm start
``` 