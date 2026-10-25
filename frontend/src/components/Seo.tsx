import { site } from '../config/site';

interface SeoProps {
  title: string;
  description: string;
  path: string;
  noindex?: boolean;
}

/** Per-page title and meta tags. React 19 hoists these into <head>. */
export function Seo({ title, description, path, noindex = false }: SeoProps) {
  const url = `${site.url}${path}`;
  return (
    <>
      <title>{title}</title>
      <meta name="description" content={description} />
      <meta name="robots" content={noindex ? 'noindex, nofollow' : 'index, follow'} />
      <link rel="canonical" href={url} />
      <meta property="og:title" content={title} />
      <meta property="og:description" content={description} />
      <meta property="og:url" content={url} />
      <meta name="twitter:title" content={title} />
      <meta name="twitter:description" content={description} />
    </>
  );
}
