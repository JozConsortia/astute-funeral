import { useEffect, useMemo, useRef, useState, type ChangeEvent, type FormEvent } from 'react';
import { site } from '../config/site';
import { ApiError, api } from '../lib/api';
import { money, thousands } from '../lib/format';
import { useMeta } from '../lib/meta';
import { isFutureDate, isUnder18, isValidEmail, isValidIdNumber, isValidPhone } from '../lib/validation';
import type { ApplicationInput, BeneficiaryInput, DependantInput, FieldErrors, Meta, Plan } from '../types';
import { Field, FormAlert, Honeypot } from './Field';

interface ApplicationFormProps {
  /** /api/applications (public) or /api/admin/applications (admin capture). */
  endpoint: string;
  mode: 'public' | 'admin';
  initialPlan?: string;
  onCreated?: (reference: string) => void;
}

const STEPS = ['Plan', 'Main member', 'Family', 'Confirm'];
const EXTENDED = ['PARENT', 'PARENT_IN_LAW', 'SIBLING', 'GRANDPARENT', 'OTHER_EXTENDED'];

const emptyBeneficiary: BeneficiaryInput = { firstName: '', lastName: '', idNumber: '', relationship: '', phone: '' };
const emptyDependant: DependantInput = { relationship: '', firstName: '', lastName: '', idNumber: '', dateOfBirth: '' };

const blank = (plan = ''): ApplicationInput => ({
  plan,
  title: '',
  firstName: '',
  lastName: '',
  idNumber: '',
  dateOfBirth: '',
  gender: '',
  maritalStatus: '',
  phone: '',
  altPhone: '',
  email: '',
  address: '',
  city: '',
  province: '',
  postalCode: '',
  dependants: [],
  beneficiary: emptyBeneficiary,
  paymentMethod: 'DEBIT_ORDER',
  debitDay: '',
  consent: false,
  declaration: false,
  website: '',
});

type Kind = 'spouse' | 'child' | 'extended';
const kindOf = (relationship: string): Kind | null =>
  relationship === 'SPOUSE' ? 'spouse' : relationship === 'CHILD' ? 'child' : EXTENDED.includes(relationship) ? 'extended' : null;
const limitFor = (plan: Plan, kind: Kind) => (kind === 'spouse' ? (plan.spouse ? 1 : 0) : kind === 'child' ? plan.maxChildren : plan.maxExtended);

function countKinds(dependants: DependantInput[], skip = -1) {
  const counts: Record<Kind, number> = { spouse: 0, child: 0, extended: 0 };
  dependants.forEach((d, i) => {
    const kind = kindOf(d.relationship);
    if (kind && i !== skip) counts[kind]++;
  });
  return counts;
}

function allowanceProblem(plan: Plan, dependants: DependantInput[]) {
  const c = countKinds(dependants);
  if (c.spouse > limitFor(plan, 'spouse')) return plan.spouse ? 'Only one spouse can be added.' : `The ${plan.name} does not cover a spouse.`;
  if (c.child > plan.maxChildren) return `The ${plan.name} covers up to ${plan.maxChildren} children.`;
  if (c.extended > plan.maxExtended) return `The ${plan.name} covers up to ${plan.maxExtended} extended family members.`;
  return '';
}

/** Which step a server-side error key belongs to. */
function stepOf(key: string) {
  if (key === 'plan') return 0;
  if (key.startsWith('dependants') || key.startsWith('beneficiary')) return 2;
  if (['paymentMethod', 'debitDay', 'consent', 'declaration'].includes(key)) return 3;
  return 1;
}

function validateStep(step: number, d: ApplicationInput, plan: Plan | undefined): FieldErrors {
  const e: FieldErrors = {};
  const required = (key: string, value: string, message = 'This field is required.') => {
    if (!value.trim()) e[key] = message;
  };
  const idNumber = (key: string, value: string, isRequired: boolean) => {
    if (!value.trim()) {
      if (isRequired) e[key] = 'This field is required.';
    } else if (!isValidIdNumber(value)) e[key] = 'Enter a valid 13-digit SA ID or passport number.';
  };
  const phone = (key: string, value: string, isRequired: boolean) => {
    if (!value.trim()) {
      if (isRequired) e[key] = 'This field is required.';
    } else if (!isValidPhone(value)) e[key] = 'Enter a valid phone number.';
  };
  const birthDate = (key: string, value: string) => {
    if (!value) e[key] = 'This field is required.';
    else if (isFutureDate(value)) e[key] = 'Date of birth cannot be in the future.';
  };

  if (step === 0) {
    if (!plan) e.plan = 'Please choose a plan.';
  }
  if (step === 1) {
    required('firstName', d.firstName);
    required('lastName', d.lastName);
    idNumber('idNumber', d.idNumber, true);
    birthDate('dateOfBirth', d.dateOfBirth);
    if (!e.dateOfBirth && isUnder18(d.dateOfBirth)) e.dateOfBirth = 'The main member must be at least 18 years old.';
    required('gender', d.gender, 'Please select a gender.');
    phone('phone', d.phone, true);
    phone('altPhone', d.altPhone, false);
    if (d.email.trim() && !isValidEmail(d.email.trim())) e.email = 'Enter a valid email address.';
    required('address', d.address);
    required('city', d.city);
    required('province', d.province, 'Select your province.');
    if (d.postalCode.trim() && !/^\d{4}$/.test(d.postalCode.trim())) e.postalCode = 'Postal codes have 4 digits.';
  }
  if (step === 2) {
    d.dependants.forEach((dep, i) => {
      const p = `dependants.${i}.`;
      required(`${p}relationship`, dep.relationship, 'Select a relationship.');
      required(`${p}firstName`, dep.firstName);
      required(`${p}lastName`, dep.lastName);
      idNumber(`${p}idNumber`, dep.idNumber, dep.relationship !== 'CHILD');
      birthDate(`${p}dateOfBirth`, dep.dateOfBirth);
    });
    const problem = plan && allowanceProblem(plan, d.dependants);
    if (problem) e.dependants = problem;
    required('beneficiary.firstName', d.beneficiary.firstName);
    required('beneficiary.lastName', d.beneficiary.lastName);
    idNumber('beneficiary.idNumber', d.beneficiary.idNumber, true);
    required('beneficiary.relationship', d.beneficiary.relationship);
    phone('beneficiary.phone', d.beneficiary.phone, true);
  }
  if (step === 3) {
    required('paymentMethod', d.paymentMethod, 'Choose how you would like to pay.');
    if (d.paymentMethod !== 'EFT') required('debitDay', d.debitDay, 'Choose a deduction date.');
    if (!d.consent) e.consent = 'Please tick this box to continue.';
    if (!d.declaration) e.declaration = 'Please tick this box to continue.';
  }
  return e;
}

export function ApplicationForm({ endpoint, mode, initialPlan = '', onCreated }: ApplicationFormProps) {
  const meta = useMeta();
  const hostRef = useRef<HTMLDivElement>(null);
  const [data, setData] = useState<ApplicationInput>(() => blank(initialPlan));
  const [step, setStep] = useState(0);
  const [errors, setErrors] = useState<FieldErrors>({});
  const [alert, setAlert] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [reference, setReference] = useState('');

  const plan = meta?.plans.find((p) => p.id === data.plan);
  const maxDependants = plan ? limitFor(plan, 'spouse') + plan.maxChildren + plan.maxExtended : 0;

  // Ignore a ?plan= value that doesn't match a real plan once plans have loaded.
  useEffect(() => {
    if (meta && data.plan && !meta.plans.some((p) => p.id === data.plan)) setData((d) => ({ ...d, plan: '' }));
  }, [meta, data.plan]);

  // Move focus to the first invalid control whenever errors are shown.
  useEffect(() => {
    if (Object.keys(errors).length) {
      hostRef.current?.querySelector<HTMLElement>('.has-error input, .has-error select, .has-error textarea')?.focus();
    }
  }, [errors]);

  const clearError = (key: string) =>
    setErrors((e) => {
      if (!(key in e) && !(key.startsWith('dependants') && 'dependants' in e)) return e;
      const next = { ...e };
      delete next[key];
      if (key.startsWith('dependants')) delete next.dependants;
      return next;
    });

  function update<K extends keyof ApplicationInput>(key: K, value: ApplicationInput[K]) {
    setData((d) => ({ ...d, [key]: value }));
    clearError(key);
  }
  function updateBeneficiary(key: keyof BeneficiaryInput, value: string) {
    setData((d) => ({ ...d, beneficiary: { ...d.beneficiary, [key]: value } }));
    clearError(`beneficiary.${key}`);
  }
  function updateDependant(index: number, key: keyof DependantInput, value: string) {
    setData((d) => ({ ...d, dependants: d.dependants.map((dep, i) => (i === index ? { ...dep, [key]: value } : dep)) }));
    clearError(`dependants.${index}.${key}`);
  }
  function removeDependant(index: number) {
    setData((d) => ({ ...d, dependants: d.dependants.filter((_, i) => i !== index) }));
    setErrors((e) => Object.fromEntries(Object.entries(e).filter(([k]) => !k.startsWith('dependants'))));
  }

  const goTo = (next: number) => {
    setStep(next);
    setAlert('');
    hostRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' });
  };

  function next() {
    const found = validateStep(step, data, plan);
    setErrors(found);
    if (!Object.keys(found).length) goTo(step + 1);
  }

  async function submit(e: FormEvent) {
    e.preventDefault();
    if (step < STEPS.length - 1) return next();
    for (let i = 0; i < STEPS.length; i++) {
      const found = validateStep(i, data, plan);
      if (Object.keys(found).length) {
        setStep(i);
        setErrors(found);
        return;
      }
    }
    setSubmitting(true);
    setAlert('');
    try {
      const body = { ...data, debitDay: data.paymentMethod === 'EFT' ? '' : data.debitDay };
      const res = await api<{ reference: string }>(endpoint, 'POST', body);
      setReference(res.reference);
      onCreated?.(res.reference);
      hostRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' });
    } catch (err) {
      if (err instanceof ApiError) {
        const keys = Object.keys(err.errors);
        if (keys.length) setStep(Math.min(...keys.map(stepOf)));
        setErrors(err.errors);
        setAlert(err.message);
      } else {
        setAlert('Could not reach the server. Please check your connection and try again.');
      }
    } finally {
      setSubmitting(false);
    }
  }

  function reset() {
    setData(blank());
    setErrors({});
    setAlert('');
    setReference('');
    setStep(0);
  }

  if (!meta) {
    return <p className="muted">Loading application form…</p>;
  }

  if (reference) {
    return (
      <div ref={hostRef} className="form-success">
        <div className="form-success__icon" aria-hidden="true">&#10003;</div>
        <h2 className="form-success__title">Application received</h2>
        <p>Your reference number is</p>
        <p className="form-success__ref">{reference}</p>
        {mode === 'public' ? (
          <p>
            Thank you. A consultant will contact you within one working day to confirm your cover and complete your
            payment mandate. Please keep your reference number.
          </p>
        ) : (
          <p>The applicant has been captured and appears in the applications list.</p>
        )}
        <button className="btn btn--outline" type="button" onClick={reset}>
          {mode === 'public' ? 'Start another application' : 'Capture another applicant'}
        </button>
      </div>
    );
  }

  return (
    <div ref={hostRef}>
      <form className="app-form" onSubmit={submit} noValidate>
        <ol className="stepper" aria-label="Application progress">
          {STEPS.map((label, i) => (
            <li
              key={label}
              className={`stepper__item${i === step ? ' is-current' : ''}${i < step ? ' is-done' : ''}`}
              aria-current={i === step ? 'step' : undefined}
            >
              <span className="stepper__label">{label}</span>
            </li>
          ))}
        </ol>
        <p className="stepper__status" aria-live="polite">
          Step {step + 1} of {STEPS.length}: <strong>{STEPS[step]}</strong>
        </p>

        <FormAlert message={alert} />
        <Honeypot value={data.website} onChange={(v) => update('website', v)} />

        {step === 0 && <PlanStep meta={meta} data={data} errors={errors} update={update} />}
        {step === 1 && <MemberStep meta={meta} data={data} errors={errors} update={update} />}
        {step === 2 && (
          <FamilyStep
            meta={meta}
            plan={plan}
            data={data}
            errors={errors}
            maxDependants={maxDependants}
            addDependant={() => setData((d) => ({ ...d, dependants: [...d.dependants, { ...emptyDependant }] }))}
            removeDependant={removeDependant}
            updateDependant={updateDependant}
            updateBeneficiary={updateBeneficiary}
          />
        )}
        {step === 3 && <ConfirmStep meta={meta} plan={plan} data={data} errors={errors} update={update} mode={mode} />}

        <div className="form-nav">
          {step > 0 && (
            <button className="btn btn--ghost" type="button" onClick={() => { setErrors({}); goTo(step - 1); }}>
              &larr; Back
            </button>
          )}
          {step < STEPS.length - 1 ? (
            <button className="btn btn--gold" type="button" onClick={next}>
              Continue &rarr;
            </button>
          ) : (
            <button className="btn btn--gold" type="submit" disabled={submitting}>
              {submitting ? 'Submitting…' : 'Submit application'}
            </button>
          )}
        </div>
        {mode === 'public' && (
          <p className="form-help">
            Need help? Call <a href={site.officeLink}>{site.office}</a> and we&rsquo;ll complete the form with you.
          </p>
        )}
      </form>
    </div>
  );
}

// ---------------------------------------------------------------- steps

interface StepProps {
  meta: Meta;
  data: ApplicationInput;
  errors: FieldErrors;
  update: <K extends keyof ApplicationInput>(key: K, value: ApplicationInput[K]) => void;
}

function PlanStep({ meta, data, errors, update }: StepProps) {
  return (
    <fieldset className="form-step">
      <legend className="form-step__title">Choose your plan</legend>
      <p className="form-step__hint">
        All plans include a 6-month waiting period on natural death. Accidental death is covered from day one.
      </p>
      <Field error={errors.plan} className="plan-options">
        {meta.plans.map((p) => (
          <label className="plan-option" key={p.id}>
            <input
              type="radio"
              name="plan"
              value={p.id}
              checked={data.plan === p.id}
              onChange={() => update('plan', p.id)}
            />
            <span className="plan-option__body">
              <span className="plan-option__name">{p.name}</span>
              <span className="plan-option__price">
                R{thousands(p.premium)}
                <small>/month</small>
              </span>
              <span className="plan-option__cover">
                R{thousands(p.cover)} cover · {p.summary}
              </span>
            </span>
          </label>
        ))}
      </Field>
    </fieldset>
  );
}

function MemberStep({ meta, data, errors, update }: StepProps) {
  const text = (key: 'firstName' | 'lastName' | 'idNumber' | 'phone' | 'altPhone' | 'email' | 'address' | 'city' | 'postalCode') => ({
    id: `f-${key}`,
    value: data[key],
    onChange: (e: ChangeEvent<HTMLInputElement>) => update(key, e.target.value),
    'aria-invalid': Boolean(errors[key]),
  });
  return (
    <fieldset className="form-step">
      <legend className="form-step__title">Main member details</legend>
      <div className="grid grid--3">
        <Field label="Title" htmlFor="f-title">
          <select id="f-title" value={data.title} onChange={(e) => update('title', e.target.value)}>
            <option value="">Select</option>
            {meta.titles.map((t) => <option key={t}>{t}</option>)}
          </select>
        </Field>
        <Field label="First name(s)" htmlFor="f-firstName" required error={errors.firstName}>
          <input {...text('firstName')} autoComplete="given-name" maxLength={60} />
        </Field>
        <Field label="Surname" htmlFor="f-lastName" required error={errors.lastName}>
          <input {...text('lastName')} autoComplete="family-name" maxLength={60} />
        </Field>
        <Field label="SA ID / Passport no." htmlFor="f-idNumber" required error={errors.idNumber}>
          <input {...text('idNumber')} maxLength={20} />
        </Field>
        <Field label="Date of birth" htmlFor="f-dob" required error={errors.dateOfBirth}>
          <input id="f-dob" type="date" value={data.dateOfBirth} onChange={(e) => update('dateOfBirth', e.target.value)} />
        </Field>
        <Field label="Gender" htmlFor="f-gender" required error={errors.gender}>
          <select id="f-gender" value={data.gender} onChange={(e) => update('gender', e.target.value)}>
            <option value="">Select</option>
            {meta.genders.map((g) => <option key={g.value} value={g.value}>{g.label}</option>)}
          </select>
        </Field>
        <Field label="Marital status" htmlFor="f-marital">
          <select id="f-marital" value={data.maritalStatus} onChange={(e) => update('maritalStatus', e.target.value)}>
            <option value="">Select</option>
            {meta.maritalStatuses.map((m) => <option key={m.value} value={m.value}>{m.label}</option>)}
          </select>
        </Field>
        <Field label="Cellphone" htmlFor="f-phone" required error={errors.phone}>
          <input {...text('phone')} type="tel" autoComplete="tel" placeholder="e.g. 082 123 4567" />
        </Field>
        <Field label="Alternative number" htmlFor="f-altPhone" error={errors.altPhone}>
          <input {...text('altPhone')} type="tel" />
        </Field>
        <Field label="Email address" htmlFor="f-email" error={errors.email} className="grid__span-2">
          <input {...text('email')} type="email" autoComplete="email" />
        </Field>
        <Field label="Street address" htmlFor="f-address" required error={errors.address} className="grid__span-3">
          <input {...text('address')} autoComplete="street-address" maxLength={200} />
        </Field>
        <Field label="Town / City" htmlFor="f-city" required error={errors.city}>
          <input {...text('city')} autoComplete="address-level2" maxLength={80} />
        </Field>
        <Field label="Province" htmlFor="f-province" required error={errors.province}>
          <select id="f-province" value={data.province} onChange={(e) => update('province', e.target.value)}>
            <option value="">Select</option>
            {meta.provinces.map((p) => <option key={p}>{p}</option>)}
          </select>
        </Field>
        <Field label="Postal code" htmlFor="f-postalCode" error={errors.postalCode}>
          <input {...text('postalCode')} inputMode="numeric" maxLength={4} autoComplete="postal-code" />
        </Field>
      </div>
    </fieldset>
  );
}

interface FamilyStepProps {
  meta: Meta;
  plan: Plan | undefined;
  data: ApplicationInput;
  errors: FieldErrors;
  maxDependants: number;
  addDependant: () => void;
  removeDependant: (index: number) => void;
  updateDependant: (index: number, key: keyof DependantInput, value: string) => void;
  updateBeneficiary: (key: keyof BeneficiaryInput, value: string) => void;
}

function FamilyStep({ meta, plan, data, errors, maxDependants, addDependant, removeDependant, updateDependant, updateBeneficiary }: FamilyStepProps) {
  const allowance = useMemo(() => {
    if (!plan) return '';
    const parts = [];
    if (plan.spouse) parts.push('1 spouse');
    if (plan.maxChildren) parts.push(`up to ${plan.maxChildren} children`);
    if (plan.maxExtended) parts.push(`up to ${plan.maxExtended} extended family members`);
    return parts.length
      ? `Your ${plan.name} covers you plus ${parts.join(', ')}.`
      : `The ${plan.name} covers the main member only. Choose another plan to add family members.`;
  }, [plan]);

  const b = data.beneficiary;
  const ben = (key: keyof BeneficiaryInput) => ({
    id: `b-${key}`,
    value: b[key],
    onChange: (e: ChangeEvent<HTMLInputElement>) => updateBeneficiary(key, e.target.value),
  });

  return (
    <fieldset className="form-step">
      <legend className="form-step__title">Family members &amp; beneficiary</legend>

      <div className="subsection">
        <div className="subsection__head">
          <div>
            <h3 className="subsection__title">People covered on your plan</h3>
            <p className="form-step__hint">{allowance}</p>
          </div>
          {maxDependants > 0 && (
            <button className="btn btn--outline btn--sm" type="button" onClick={addDependant} disabled={data.dependants.length >= maxDependants}>
              + Add family member
            </button>
          )}
        </div>
        <Field error={errors.dependants}>
          {data.dependants.length > 0 && (
            <div className="dependants">
              {data.dependants.map((dep, i) => {
                const others = countKinds(data.dependants, i);
                const id = (k: string) => `dep-${i}-${k}`;
                const err = (k: string) => errors[`dependants.${i}.${k}`];
                return (
                  <div className="dependant" key={i}>
                    <div className="dependant__head">
                      <span className="dependant__title">Family member {i + 1}</span>
                      <button className="link-btn" type="button" onClick={() => removeDependant(i)}>Remove</button>
                    </div>
                    <div className="grid grid--3">
                      <Field label="Relationship" htmlFor={id('rel')} required error={err('relationship')}>
                        <select id={id('rel')} value={dep.relationship} onChange={(e) => updateDependant(i, 'relationship', e.target.value)}>
                          <option value="">Select</option>
                          {meta.relationships.map((r) => {
                            const kind = kindOf(r.value);
                            const full = !!plan && !!kind && others[kind] >= limitFor(plan, kind) && r.value !== dep.relationship;
                            return <option key={r.value} value={r.value} disabled={full}>{r.label}</option>;
                          })}
                        </select>
                      </Field>
                      <Field label="First name(s)" htmlFor={id('first')} required error={err('firstName')}>
                        <input id={id('first')} value={dep.firstName} maxLength={60} onChange={(e) => updateDependant(i, 'firstName', e.target.value)} />
                      </Field>
                      <Field label="Surname" htmlFor={id('last')} required error={err('lastName')}>
                        <input id={id('last')} value={dep.lastName} maxLength={60} onChange={(e) => updateDependant(i, 'lastName', e.target.value)} />
                      </Field>
                      <Field label="SA ID / Passport no." htmlFor={id('idno')} required={dep.relationship !== 'CHILD'} error={err('idNumber')}>
                        <input id={id('idno')} value={dep.idNumber} maxLength={20} onChange={(e) => updateDependant(i, 'idNumber', e.target.value)} />
                      </Field>
                      <Field label="Date of birth" htmlFor={id('dob')} required error={err('dateOfBirth')}>
                        <input id={id('dob')} type="date" value={dep.dateOfBirth} onChange={(e) => updateDependant(i, 'dateOfBirth', e.target.value)} />
                      </Field>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </Field>
      </div>

      <div className="subsection">
        <h3 className="subsection__title">Beneficiary</h3>
        <p className="form-step__hint">The person who will receive the payout when a claim is made.</p>
        <div className="grid grid--3">
          <Field label="First name(s)" htmlFor="b-firstName" required error={errors['beneficiary.firstName']}>
            <input {...ben('firstName')} maxLength={60} />
          </Field>
          <Field label="Surname" htmlFor="b-lastName" required error={errors['beneficiary.lastName']}>
            <input {...ben('lastName')} maxLength={60} />
          </Field>
          <Field label="SA ID / Passport no." htmlFor="b-idNumber" required error={errors['beneficiary.idNumber']}>
            <input {...ben('idNumber')} maxLength={20} />
          </Field>
          <Field label="Relationship to you" htmlFor="b-relationship" required error={errors['beneficiary.relationship']}>
            <input {...ben('relationship')} maxLength={40} placeholder="e.g. Daughter" />
          </Field>
          <Field label="Phone number" htmlFor="b-phone" required error={errors['beneficiary.phone']}>
            <input {...ben('phone')} type="tel" />
          </Field>
        </div>
      </div>
    </fieldset>
  );
}

function ConfirmStep({ meta, plan, data, errors, update, mode }: StepProps & { plan: Plan | undefined; mode: 'public' | 'admin' }) {
  const rows: [string, string][] = [
    ['Plan', plan?.name ?? '–'],
    ['Cover amount', plan ? money(plan.cover) : '–'],
    ['Monthly premium', plan ? `${money(plan.premium)} per month` : '–'],
    ['Main member', `${data.title} ${data.firstName} ${data.lastName}`.trim()],
    ['Family members', data.dependants.length ? `${data.dependants.length} added` : 'None'],
    ['Beneficiary', `${data.beneficiary.firstName} ${data.beneficiary.lastName} (${data.beneficiary.relationship})`],
  ];
  const isAdmin = mode === 'admin';

  return (
    <fieldset className="form-step">
      <legend className="form-step__title">Payment &amp; confirmation</legend>

      <div className="summary">
        <h3 className="summary__title">{isAdmin ? 'Application summary' : 'Your application summary'}</h3>
        {rows.map(([label, value]) => (
          <div className="summary__row" key={label}>
            <span>{label}</span>
            <strong>{value || '–'}</strong>
          </div>
        ))}
      </div>

      <div className="grid grid--2">
        <Field label="How would you like to pay?" required error={errors.paymentMethod}>
          <div className="choices">
            {meta.paymentMethods.map((m) => (
              <label className="choice" key={m.value}>
                <input
                  type="radio"
                  name="paymentMethod"
                  value={m.value}
                  checked={data.paymentMethod === m.value}
                  onChange={() => update('paymentMethod', m.value)}
                />
                <span>{m.label}</span>
              </label>
            ))}
          </div>
        </Field>
        {data.paymentMethod !== 'EFT' && (
          <Field
            label="Deduction date"
            htmlFor="f-debit"
            required
            error={errors.debitDay}
            help="A consultant will call you to complete the debit or stop order mandate. We never ask for banking PINs or passwords."
          >
            <select id="f-debit" value={data.debitDay} onChange={(e) => update('debitDay', e.target.value)}>
              <option value="">Select</option>
              {meta.debitDays.map((d) => <option key={d.value} value={d.value}>{d.label}</option>)}
            </select>
          </Field>
        )}
      </div>

      <Field error={errors.consent} className="check">
        <label className="choice choice--check">
          <input type="checkbox" checked={data.consent} onChange={(e) => update('consent', e.target.checked)} />
          <span>
            {isAdmin ? 'The applicant consents' : 'I consent'} to {site.name} collecting and processing this personal
            information to assess the application and administer the policy, in line with the Protection of Personal
            Information Act (POPIA).
          </span>
        </label>
      </Field>
      <Field error={errors.declaration} className="check">
        <label className="choice choice--check">
          <input type="checkbox" checked={data.declaration} onChange={(e) => update('declaration', e.target.checked)} />
          <span>
            {isAdmin ? 'The applicant confirms' : 'I confirm'} that the information provided is true and complete, and
            that the people listed have agreed to be included on the policy.
          </span>
        </label>
      </Field>
    </fieldset>
  );
}
