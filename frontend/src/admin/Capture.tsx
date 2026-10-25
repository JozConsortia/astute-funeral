import { ApplicationForm } from '../components/ApplicationForm';
import { useAdmin } from './context';

export function Capture() {
  const { toast, refresh } = useAdmin();
  return (
    <section>
      <div className="panel panel--form">
        <p className="panel__intro">
          Capture an application on behalf of a client (e.g. walk-in or telephone sales). It will be marked as
          &ldquo;captured&rdquo; in the applications list.
        </p>
        <ApplicationForm
          endpoint="/api/admin/applications"
          mode="admin"
          onCreated={(reference) => {
            toast(`Application ${reference} captured.`);
            refresh();
          }}
        />
      </div>
    </section>
  );
}
