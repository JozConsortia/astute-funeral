// Business details shown across the website. Edit them here.

/** "012 753 7710" -> "+27127537710" for tel: and WhatsApp links. */
const intl = (phone: string) => `+${phone.replace(/\D/g, '').replace(/^0/, '27')}`;

const office = '012 753 7710';
const mobile = '083 771 1303';
const emergency = '+27 67 073 5351';

export const site = {
  name: 'Astute Funerals',
  tagline: 'Class in Dignity',
  url: (import.meta.env.VITE_SITE_URL || window.location.origin).replace(/\/$/, ''),

  office,
  officeLink: `tel:${intl(office)}`,
  mobile,
  mobileLink: `tel:${intl(mobile)}`,
  emergency,
  emergencyLink: `tel:${intl(emergency)}`,
  whatsappLink: `https://wa.me/${intl(mobile).slice(1)}`,
  email: 'astutefunerals@morokagroup.co.za',

  street: '4 Sister Baumgarten Drive',
  suburb: 'Extension 10, Danville',
  city: 'Pretoria',
  postalCode: '0183',
  hoursLines: ['Mon – Fri 08:00 – 17:00', 'Sat 08:00 – 13:00'],
  hours: 'Mon – Fri 08:00 – 17:00 · Sat 08:00 – 13:00',
  fsp: 'Authorised Financial Services Provider · FSP No. 00000',
} as const;

export const fullAddress = `${site.street}, ${site.suburb}, ${site.city}, ${site.postalCode}`;
export const mapLink = `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(fullAddress)}`;
