import { useAuth } from '../context/AuthContext';

const CURRENCY_SYMBOLS = {
  USD: '$',
  INR: '₹',
  EUR: '€',
  GBP: '£',
  JPY: '¥',
  CAD: 'CA$',
  AUD: 'A$',
  CHF: 'CHF',
  CNY: '¥',
  SGD: 'S$',
};

/**
 * Returns the currency symbol and a formatter for the logged-in user's currency.
 * Falls back to '$' if the currency is unknown.
 */
export function useCurrency() {
  const { user } = useAuth();
  const currencyCode = user?.currency || 'USD';
  const symbol = CURRENCY_SYMBOLS[currencyCode] || currencyCode;

  const format = (amount, decimals = 2) =>
    `${symbol}${Number(amount || 0).toFixed(decimals)}`;

  const formatK = (amount) =>
    `${symbol}${(Number(amount || 0) / 1000).toFixed(0)}k`;

  return { symbol, format, formatK, currencyCode };
}
