# Google API Key Setup - Step by Step

## Step 1: Enable Google Drive API

1. Go to: https://console.cloud.google.com/apis/library
2. Search for: **"Google Drive API"**
3. Click on it
4. Click **"Enable"** button

## Step 2: Create API Key (No Restriction Needed)

For this gallery, you **don't need API restrictions** since the calls happen server-side.

1. Go to: https://console.cloud.google.com/apis/credentials
2. Click **"Create Credentials"** at the top
3. Select **"API Key"**
4. Copy the key (looks like: `AIzaSy...`)
5. Click **"Close"**

## Step 3: Paste in .env File

Open: `D:\Projekan\Not Really Personal\DWBCC\Desdok-University-tour-coinvest\.env`

Replace the API key:
```
GOOGLE_API_KEY=AIzaSyXxxxxxxxxxxxxxxxxxxxxxxxxxx
```

## Troubleshooting

### "API Key" option not showing?

Make sure you:
1. Have a Google Cloud Project selected/created
2. Are logged into the correct Google account

### Still can't find it?

Direct link to create API key:
https://console.cloud.google.com/apis/credentials/create/key

## Test After Setup

```bash
# Terminal 1
cd server
npm run dev

# Terminal 2
cd client
npm run dev
```

Open http://localhost:5173 - you should see your 4 folders load!
