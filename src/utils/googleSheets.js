const { google } = require('googleapis');

/**
 * Appends a row of data to a specified Google Sheet.
 * @param {Array} values Array of values to append in the row
 */
const appendToSheet = async (values) => {
  const { GOOGLE_SERVICE_ACCOUNT_EMAIL, GOOGLE_PRIVATE_KEY, GOOGLE_SHEET_ID } = process.env;

  if (!GOOGLE_SERVICE_ACCOUNT_EMAIL || !GOOGLE_PRIVATE_KEY || !GOOGLE_SHEET_ID) {
    console.warn('Google Sheets API credentials are not fully configured. Skipping append operation.');
    return;
  }

  ('Google Sheets API credentials are ', {
    GOOGLE_SERVICE_ACCOUNT_EMAIL,
    GOOGLE_PRIVATE_KEY,
    GOOGLE_SHEET_ID
  })

  try {
    // Handle potential newlines in the private key from .env file
    const formattedPrivateKey = GOOGLE_PRIVATE_KEY.replace(/\\n/g, '\n');

    ('formattedPrivateKey', formattedPrivateKey)

    const auth = new google.auth.GoogleAuth({
      credentials: {
        client_email: GOOGLE_SERVICE_ACCOUNT_EMAIL,
        private_key: formattedPrivateKey,
      },
      scopes: ['https://www.googleapis.com/auth/spreadsheets'],
    });

    const client = await auth.getClient();
    const sheets = google.sheets({ version: 'v4', auth: client });

    await sheets.spreadsheets.values.append({
      spreadsheetId: GOOGLE_SHEET_ID,
      range: 'Sheet1!A1', // Adjust if the sheet name is different
      valueInputOption: 'USER_ENTERED',
      resource: {
        values: [values],
      },
    });

    ('Successfully appended row to Google Sheet.');
  } catch (error) {
    console.error('Error appending to Google Sheet:', error.message);
    // We don't want to throw the error to avoid breaking the main student creation flow
  }
};

const appendMultipleToSheet = async (rows) => {
  const { GOOGLE_SERVICE_ACCOUNT_EMAIL, GOOGLE_PRIVATE_KEY, GOOGLE_SHEET_ID } = process.env;

  if (!GOOGLE_SERVICE_ACCOUNT_EMAIL || !GOOGLE_PRIVATE_KEY || !GOOGLE_SHEET_ID) {
    console.warn('Google Sheets API credentials are not fully configured. Skipping append operation.');
    return;
  }

  try {
    const formattedPrivateKey = GOOGLE_PRIVATE_KEY.replace(/\\n/g, '\n');

    const auth = new google.auth.GoogleAuth({
      credentials: {
        client_email: GOOGLE_SERVICE_ACCOUNT_EMAIL,
        private_key: formattedPrivateKey,
      },
      scopes: ['https://www.googleapis.com/auth/spreadsheets'],
    });

    const client = await auth.getClient();
    const sheets = google.sheets({ version: 'v4', auth: client });

    await sheets.spreadsheets.values.append({
      spreadsheetId: GOOGLE_SHEET_ID,
      range: 'Sheet1!A1',
      valueInputOption: 'USER_ENTERED',
      resource: {
        values: rows,
      },
    });

    ('Successfully appended multiple rows to Google Sheet.');
  } catch (error) {
    console.error('Error appending to Google Sheet:', error.message);
  }
};

module.exports = {
  appendToSheet,
  appendMultipleToSheet
};
