const { google } = require('googleapis');

// Variabile din environment (setate în Cloud Run / Cloud Functions)
const client_id = process.env.CLIENT_ID;
const client_secret = process.env.CLIENT_SECRET;
const redirect_uri = 'urn:ietf:wg:oauth:2.0:oob'; // sau redirect-ul tău valid
const token_json = JSON.parse(process.env.TOKEN_JSON);
const email_from = process.env.EMAIL_FROM;

// Construiește mesaj raw în format base64 pentru Gmail API
function makeBody(to, from, subject, htmlMessage) {
  const str = [
    `To: ${to}`,
    `From: ${from}`,
    `Subject: ${subject}`,
    'MIME-Version: 1.0',
    'Content-Type: text/html; charset=UTF-8',
    '',
    htmlMessage
  ].join('\n');

  return Buffer.from(str)
    .toString('base64')
    .replace(/\+/g, '-')
    .replace(/\//g, '_')
    .replace(/=+$/, '');
}

// Obține client autorizat pentru Gmail API
async function getAuthorizedClient() {
  const oAuth2Client = new google.auth.OAuth2(client_id, client_secret, redirect_uri);
  oAuth2Client.setCredentials(token_json);

  // Verifică expirarea token-ului
  if (token_json.expiry_date && token_json.expiry_date < Date.now()) {
    console.log('🔁 Token expirat. Se reîmprospătează...');
    const newToken = await oAuth2Client.getAccessToken();
    oAuth2Client.setCredentials({
      access_token: newToken.token,
      refresh_token: token_json.refresh_token,
      expiry_date: Date.now() + 3600 * 1000
    });
    console.log('✅ Token reîmprospătat.');
  }

  return oAuth2Client;
}

// Funcția exportată care trimite mailul custom
exports.sendCustomEmail = async (req, res) => {
  try {
    const { to, subject, html } = req.body;

    if (!to || !subject || !html) {
      return res.status(400).send('Lipsește câmp to, subject sau html');
    }

    const auth = await getAuthorizedClient();
    const raw = makeBody(to, email_from, subject, html);
    const gmail = google.gmail({ version: 'v1', auth });

    const result = await gmail.users.messages.send({
      userId: 'me',
      requestBody: { raw }
    });

    res.status(200).send(`Email trimis cu ID: ${result.data.id}`);
  } catch (error) {
    console.error('Eroare la trimiterea emailului:', error);
    res.status(500).send('Eroare la trimiterea emailului');
  }
};
