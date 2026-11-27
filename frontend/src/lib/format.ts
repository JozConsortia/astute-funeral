import type { Option } from '../types';

export const money = (n: number) => `R${Number(n || 0).toLocaleString('en-ZA')}`;

/** "10000" -> "10 000" (South African thousands separator). */
export const thousands = (n: number) => n.toLocaleString('en-ZA').replace(/,/g, ' ');

export const formatDate = (iso: string) =>
  new Date(iso).toLocaleDateString('en-ZA', { day: '2-digit', month: 'short', year: 'numeric' });

export const formatDateTime = (iso: string) =>
  new Date(iso).toLocaleString('en-ZA', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });

export const labelOf = (options: Option[], value: string) => options.find((o) => o.value === value)?.label ?? value;

export const telLink = (phone: string) => `tel:${phone.replace(/[^\d+]/g, '')}`;

/** "082 123 4567" -> "27821234567", the form wa.me links need. */
export const whatsappNumber = (phone: string) => phone.replace(/\D/g, '').replace(/^0/, '27');

/** "1980-01-31" -> "31 January 1980". */
export const formatBirthDate = (isoDate: string) =>
  isoDate ? new Date(`${isoDate}T00:00:00`).toLocaleDateString('en-ZA', { day: 'numeric', month: 'long', year: 'numeric' }) : '';

export const capitalise = (s: string) => (s ? s[0].toUpperCase() + s.slice(1) : s);

/** "Thabo Mokoena" -> "TM" for avatar circles. */
export const initials = (name: string) =>
  name.split(/\s+/).filter(Boolean).slice(0, 2).map((p) => p[0]!.toUpperCase()).join('');
