import QRCode from 'qrcode';

/**
 * Generates a QR code that encodes the public ticket page URL itself
 * (e.g. https://your-app.com/ticket/<accessToken>), not just raw text.
 * That means scanning it with ANY phone camera — not just the admin
 * scanner — opens a page showing the attendee's own registration info.
 * The admin Scanner page still works the same way: it reads this URL,
 * pulls the access token out of it, and uses that to check the ticket in.
 */
export async function generateQrDataUrl(url) {
  return QRCode.toDataURL(url, {
    errorCorrectionLevel: 'M',
    margin: 2,
    width: 480,
  });
}

export async function generateQrBuffer(url) {
  return QRCode.toBuffer(url, {
    errorCorrectionLevel: 'M',
    margin: 2,
    width: 480,
  });
}
