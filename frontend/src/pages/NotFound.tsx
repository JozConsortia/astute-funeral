import { Link, useLocation } from 'react-router-dom';
import { Seo } from '../components/Seo';
import { site } from '../config/site';

export function NotFound() {
  const { pathname } = useLocation();
  return (
    <>
      <Seo title={`Page not found | ${site.name}`} description="The page you are looking for could not be found." path={pathname} noindex />
      <section className="page-hero page-hero--full">
        <div className="container">
          <p className="eyebrow">Error 404</p>
          <h1 className="page-hero__title">We couldn't find that page</h1>
          <p className="page-hero__lead">The page may have moved or no longer exists.</p>
          <p><Link className="btn btn--gold" to="/">Back to home</Link></p>
        </div>
      </section>
    </>
  );
}
