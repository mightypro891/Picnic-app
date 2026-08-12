import QRCode from 'qrcode';

/**
 * Generates a QR code encoding student info for quick verification:
 * Name | Level | Ticket Code
 */
export async function generateQrDataUrl(data) {
  const content = `${data.fullName} | ${data.level} | ${data.ticketCode}`;
  return QRCode.toDataURL(content, {
    errorCorrectionLevel: 'M',
    margin: 2,
    width: 480,
  });
}

export async function generateQrBuffer(data) {
  const content = `${data.fullName} | ${data.level} | ${data.ticketCode}`;
  return QRCode.toBuffer(content, {
    errorCorrectionLevel: 'M',
    margin: 2,
    width: 480,
  });
}
