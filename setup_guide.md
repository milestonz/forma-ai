# Google Cloud Credentials Setup Guide

To use the Google Slides API, you need to set up a Google Cloud Project and create OAuth 2.0 credentials. Follow these steps:

## 1. Create a Google Cloud Project

1. Go to the [Google Cloud Console](https://console.cloud.google.com/).
2. Click on the project dropdown at the top left.
3. Click **New Project**.
4. Enter a project name (e.g., "Slides Converter") and click **Create**.

## 2. Enable Google Slides API

1. In the sidebar, go to **APIs & Services** > **Library**.
2. Search for "Google Slides API".
3. Click on **Google Slides API** and then click **Enable**.
4. Also search for "Google Drive API" and **Enable** it (needed for file access).

## 3. Configure OAuth Consent Screen

1. In the sidebar, go to **APIs & Services** > **OAuth consent screen**.
2. Select **External** and click **Create**.
3. Fill in the required fields:
   - **App name**: Slides Converter
   - **User support email**: Your email
   - **Developer contact information**: Your email
4. Click **Save and Continue**.
5. Skip "Scopes" and click **Save and Continue**.
6. Under "Test users", click **Add Users** and add your own Google email address (**place.coach@gmail.com**).
7. Click **Save and Continue**.

> [!IMPORTANT]
> Since the app is in "Testing" mode, you **MUST** add your email address (`place.coach@gmail.com`) to the "Test users" list. Otherwise, you will get a "403 access_denied" error.

## 4. Create Credentials

1. In the sidebar, go to **APIs & Services** > **Credentials**.
2. Click **Create Credentials** > **OAuth client ID**.
3. Select **Desktop app** as the Application type.
4. Name it "Desktop Client" and click **Create**.
5. A popup will appear. Click **Download JSON**.
6. Rename the downloaded file to `credentials.json`.
   {"installed":{"client_id":"898468052674-1ffdmfktq7rj1isnb16ujlj4t782dciu.apps.googleusercontent.com","project_id":"charged-chain-479423-k9","auth_uri":"https://accounts.google.com/o/oauth2/auth","token_uri":"https://oauth2.googleapis.com/token","auth_provider_x509_cert_url":"https://www.googleapis.com/oauth2/v1/certs","client_secret":"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","redirect_uris":["http://localhost"]}}

7. Move this file to your project folder: `/Users/milestonz/GitHub-Desktop/google-slides-api/credentials.json`.

## 5. Run the Script

Once you have placed the `credentials.json` file, run the conversion script:

```bash
node index.js
```

It will ask you to visit a URL to authorize the app. Follow the instructions in the terminal.
