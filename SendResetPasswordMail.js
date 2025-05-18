const { google } = require('googleapis');

// Config din variabile de mediu
const client_id = process.env.CLIENT_ID;
const client_secret = process.env.CLIENT_SECRET;
const redirect_uri = 'urn:ietf:wg:oauth:2.0:oob';
const token_json = JSON.parse(process.env.TOKEN_JSON);
const email_from = process.env.EMAIL_FROM;

// Autentificare OAuth2
const oAuth2Client = new google.auth.OAuth2(client_id, client_secret, redirect_uri);
oAuth2Client.setCredentials(token_json);

// Funcție pentru a crea email HTML codificat base64
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

// Funcția de trimitere a emailului
exports.sendPasswordReset = async (req, res) => {
  try {
    const { email, code } = req.body;

    if (!email || !code) {
      return res.status(400).send('Lipsește email sau cod');
    }

    const htmlMessage = `
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8" />
  <title>Password Reset</title>
  <style>
    body {
      font-family: Arial, sans-serif;
      color: #51423e;
      text-align: center;
      padding: 50px;
    }
    .container {
      background-color: #efebe2; /* fundal container */
      padding: 25px 20px;
      border-radius: 12px;
      display: inline-block;
      width: 90%;
      max-width: 360px;
    }
    .logo {
      width: 100%;
      max-width: 350px;
      border-radius: 10px 10px 0 0;
      margin-bottom: 20px;
    }
    .code {
      font-size: 36px;
      font-weight: bold;
      background: #ac9c94;
      color: #544541; /* culoarea textului ceruta */
      padding: 15px 30px;
      border-radius: 8px;
      display: inline-block;
      user-select: all;
      margin: 20px 0;
      letter-spacing: 6px;
      font-family: 'Courier New', Courier, monospace;
    }
    p {
      margin-top: 20px;
      font-size: 16px;
    }
  </style>
</head>
<body>
  <div class="container">
    <img src="https://storage.googleapis.com/rewear/logo3.png" alt="Rewear Logo" class="logo" />
    <h2>Password Reset</h2>
    <p>You requested a password reset for your Rewear account.</p>
    <p>Please use the code below to reset your password:</p>
    <div class="code" id="resetCode">${code}</div>
    <p>If you didn't request this, you can ignore this message.</p>
    <p>The Rewear Team</p>
  </div>
</body>
</html>
`;


    const raw = makeBody(email, email_from, 'Rewear Password Reset Code', htmlMessage);

    const gmail = google.gmail({ version: 'v1', auth: oAuth2Client });

    const result = await gmail.users.messages.send({
      userId: 'me',
      requestBody: { raw }
    });

    res.status(200).send(`Password reset email sent with ID: ${result.data.id}`);
  } catch (error) {
    console.error('Error sending email:', error);
    res.status(500).send('Error sending password reset email');
  }
};
