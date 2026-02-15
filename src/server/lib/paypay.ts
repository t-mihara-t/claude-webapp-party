/**
 * PayPay link helper
 *
 * Takes a base PayPay.me link and an amount, returns the payment URL.
 * PayPay.me links follow the format: https://paypay.me/USERNAME
 * Appending /{amount} creates a pre-filled payment request.
 */
export function generatePayPayLink(paypayLink: string, amount: number): string {
  if (!paypayLink) {
    return '';
  }

  // Remove trailing slash if present
  const baseLink = paypayLink.replace(/\/+$/, '');

  // Ensure amount is a positive integer
  const roundedAmount = Math.max(0, Math.round(amount));

  if (roundedAmount === 0) {
    return baseLink;
  }

  return `${baseLink}/${roundedAmount}`;
}
