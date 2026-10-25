import { labelOf } from '../lib/format';
import type { Option, Status } from '../types';

export function StatusPill({ status, statuses }: { status: Status; statuses: Option[] }) {
  return <span className={`status status--${status.toLowerCase()}`}>{labelOf(statuses, status)}</span>;
}
