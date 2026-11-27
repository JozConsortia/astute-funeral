import { useEffect, useMemo, useRef, useState, type ChangeEvent, type FormEvent, type ReactNode } from 'react';
import { site } from '../config/site';
import { ApiError, api } from '../lib/api';
import { formatBirthDate, labelOf, money, thousands } from '../lib/format';
import { useMeta, useMetaFailed } from '../lib/meta';
import {
  isFutureDate, isMistypedSaId, isUnder18, isValidEmail, isValidIdNumber, isValidPhone, readSaId,
} from '../lib/validation';
import type { ApplicationInput, BeneficiaryInput, DependantInput, FieldErrors, Meta, Plan } from '../types';
import { AddressSearch } from './AddressSearch';
import { Field, FormAlert, Honeypot } from './Field';
import { Icon, IconInput, type IconName } from './Icon';
import { Unavailable } from './Unavailable';

interface ApplicationFormProps {
  /** /api/applications (public) or /api/admin/applications (admin capture). */
  endpoint: string;
  mode: 'public' | 'admin';
  initialPlan?: string;
  onCreated?: (reference: string) => void;
}

const STEPS = ['Plan', 'Main member', 'Family', 'Confirm'];
const EXTENDED = ['PARENT', 'PARENT_IN_LAW', 'SIBLING', 'GRANDPARENT', 'OTHER_EXTENDED'];

/** Choices for the beneficiary's "Relationship to you". Anything else is typed in after picking "Other". */
const BENEFICIARY_RELATIONSHIPS = [
  'Spouse', 'Partner', 'Son', 'Daughter', 'Mother', 'Father', 'Brother', 'Sister',
  'Grandson', 'Granddaughter', 'Grandmother', 'Grandfather', 'Aunt', 'Uncle', 'Niece', 'Nephew', 'Cousin',
  'Son-in-law', 'Daughter-in-law',
];
const OTHER_RELATIONSHIP = '__other';

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

// ---------------------------------------------------------------- answers kept during the visit

/**
 * Answers are kept in this browser tab only (sessionStorage, gone when the tab closes), so a refresh or a
 * look at another page doesn't wipe a half-finished application. Cleared once it is submitted.
 */
interface Draft {
  data: ApplicationInput;
  step: number;
}
const draftKey = (mode: string) => `astute-application-${mode}`;

function loadDraft(mode: string): Draft | null {
  try {
    const saved = JSON.parse(sessionStorage.getItem(draftKey(mode)) ?? 'null') as Partial<Draft> | null;
    if (!saved?.data || typeof saved.data !== 'object') return null;
    const d = saved.data;
    return {
      data: {
        ...blank(),
        ...d,
        dependants: Array.isArray(d.dependants) ? d.dependants.map((dep) => ({ ...emptyDependant, ...dep })) : [],
        beneficiary: { ...emptyBeneficiary, ...d.beneficiary },
        website: '',
      },
      step: Math.min(Math.max(Number(saved.step) || 0, 0), STEPS.length - 1),
    };
  } catch {
    return null;
  }
}

function saveDraft(mode: string, draft: Draft | null) {
  try {
    if (draft) sessionStorage.setItem(draftKey(mode), JSON.stringify(draft));
    else sessionStorage.removeItem(draftKey(mode));
  } catch {
    // Storage full or blocked (private browsing): the form still works, it just isn't kept.
  }
}

/** Clears a half-captured applicant, e.g. when a staff member signs out. */
export const clearApplicationDraft = (mode: 'public' | 'admin') => saveDraft(mode, null);

const hasAnswers = (d: ApplicationInput) =>
  Boolean(d.firstName || d.lastName || d.idNumber || d.phone || d.address || d.dependants.length || d.beneficiary.firstName);

const ID_TYPO = "This ID number doesn't add up. Please check the 13 digits.";
/** Parents and grandparents can't be minors, so a two-digit birth year in their ID is read as 19xx where 20xx would make them one. */
const ADULT_RELATIONSHIPS = ['PARENT', 'PARENT_IN_LAW', 'GRANDPARENT'];

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
  const metaFailed = useMetaFailed();
  const hostRef = useRef<HTMLDivElement>(null);
  const [initial] = useState(() => {
    const draft = loadDraft(mode);
    if (!draft || !hasAnswers(draft.data)) return { data: blank(initialPlan), step: 0, restored: false };
    // A plan chosen on the way in (e.g. "Apply for this plan") wins over the saved one; show it on step 1.
    if (initialPlan && initialPlan !== draft.data.plan) return { data: { ...draft.data, plan: initialPlan }, step: 0, restored: true };
    return { ...draft, restored: true };
  });
  const [data, setData] = useState<ApplicationInput>(initial.data);
  const [step, setStep] = useState(initial.step);
  const [restored, setRestored] = useState(initial.restored);
  const [errors, setErrors] = useState<FieldErrors>({});
  const [alert, setAlert] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [reference, setReference] = useState('');
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    if (!reference) saveDraft(mode, hasAnswers(data) ? { data, step } : null);
  }, [mode, data, step, reference]);

  const plan = meta?.plans.find((p) => p.id === data.plan);
  const maxDependants = plan ? limitFor(plan, 'spouse') + plan.maxChildren + plan.maxExtended : 0;

  // Ignore a ?plan= value that doesn't match a real plan once plans have loaded.
  useEffect(() => {
    if (meta && data.plan && !meta.plans.some((p) => p.id === data.plan)) setData((d) => ({ ...d, plan: '' }));
  }, [meta, data.plan]);

  // Move focus to the first invalid control when Continue / Submit finds errors. Only then: following every
  // change to `errors` pulled the cursor away after one keystroke whenever fixing a field cleared its error.
  const [errorAttempt, setErrorAttempt] = useState(0);
  const showErrors = (found: FieldErrors) => {
    setErrors(found);
    setErrorAttempt((n) => n + 1);
  };
  useEffect(() => {
    if (errorAttempt) {
      hostRef.current?.querySelector<HTMLElement>('.has-error input, .has-error select, .has-error textarea')?.focus();
    }
  }, [errorAttempt]);

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
    setRestored(false);
    hostRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' });
  };

  function startOver() {
    setData(blank(initialPlan));
    setStep(0);
    setErrors({});
    setAlert('');
    setRestored(false);
  }

  async function copyReference() {
    try {
      await navigator.clipboard.writeText(reference);
      setCopied(true);
      window.setTimeout(() => setCopied(false), 2500);
    } catch {
      // Clipboard blocked: the reference is still on screen to write down.
    }
  }

  function next() {
    const found = validateStep(step, data, plan);
    if (Object.keys(found).length) {
      showErrors(found);
      return;
    }
    setErrors({});
    goTo(step + 1);
  }

  async function submit(e: FormEvent) {
    e.preventDefault();
    if (step < STEPS.length - 1) return next();
    for (let i = 0; i < STEPS.length; i++) {
      const found = validateStep(i, data, plan);
      if (Object.keys(found).length) {
        setStep(i);
        showErrors(found);
        return;
      }
    }
    setSubmitting(true);
    setAlert('');
    try {
      const body = { ...data, debitDay: data.paymentMethod === 'EFT' ? '' : data.debitDay };
      const res = await api<{ reference: string }>(endpoint, 'POST', body);
      setReference(res.reference);
      saveDraft(mode, null);
      onCreated?.(res.reference);
      hostRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' });
    } catch (err) {
      if (err instanceof ApiError) {
        const keys = Object.keys(err.errors);
        if (keys.length) setStep(Math.min(...keys.map(stepOf)));
        showErrors(err.errors);
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
    setCopied(false);
    setStep(0);
  }

  if (!meta) {
    return metaFailed ? <Unavailable what="the application form" /> : <p className="muted">Loading application form…</p>;
  }

  if (reference) {
    return (
      <div ref={hostRef} className="form-success">
        <div className="form-success__icon" aria-hidden="true">&#10003;</div>
        <h2 className="form-success__title">Application received</h2>
        <p>Your reference number is</p>
        <p className="form-success__ref">{reference}</p>
        <div className="form-success__actions">
          <button className="btn btn--outline btn--sm" type="button" onClick={copyReference} aria-live="polite">
            {copied ? 'Copied ✓' : 'Copy reference'}
          </button>
          {mode === 'public' && (
            <a
              className="btn btn--whatsapp btn--sm"
              href={`${site.whatsappLink}?text=${encodeURIComponent(`Hello ${site.name}, I applied for funeral cover online. My reference number is ${reference}.`)}`}
              target="_blank"
              rel="noopener"
            >
              <Icon name="whatsapp" /> Send it to us on WhatsApp
            </a>
          )}
        </div>
        {mode === 'public' ? (
          <>
            <p>Thank you. Please keep your reference number. Here is what happens next:</p>
            <ol className="next-steps">
              <li><strong>We call you</strong> within one working day to confirm your details.</li>
              <li><strong>We set up your payment</strong> with you over the phone. We never ask for bank details online.</li>
              <li><strong>Your cover starts</strong> from your first premium.</li>
            </ol>
            <p>Questions in the meantime? Call <a href={site.officeLink}>{site.office}</a>.</p>
          </>
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

        {restored && (
          <p className="form-note" role="status">
            <span>Welcome back. We kept the details you already filled in.</span>
            <button className="link-btn" type="button" onClick={startOver}>Start again</button>
          </p>
        )}
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
        {step === 3 && <ConfirmStep meta={meta} plan={plan} data={data} errors={errors} update={update} mode={mode} edit={goTo} />}

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
    spellCheck: false, // names and places aren't in the dictionary: no red underlines
  });
  // A valid SA ID already says when the person was born and their gender, so fill those in for them.
  const fromId = readSaId(data.idNumber);
  const setIdNumber = (value: string) => {
    update('idNumber', value);
    const read = readSaId(value);
    if (read) {
      update('dateOfBirth', read.dateOfBirth);
      update('gender', read.gender);
    }
  };
  return (
    <fieldset className="form-step">
      <legend className="form-step__title">Main member details</legend>
      <p className="form-step__hint">The person taking out the policy. Fields marked * are required.</p>

      <FormGroup icon="user" title="About you">
        <div className="grid grid--3">
          <Field label="Title" htmlFor="f-title">
            <select id="f-title" value={data.title} onChange={(e) => update('title', e.target.value)}>
              <option value="">Select</option>
              {meta.titles.map((t) => <option key={t}>{t}</option>)}
            </select>
          </Field>
          <Field label="First name(s)" htmlFor="f-firstName" required error={errors.firstName}>
            <IconInput icon="user">
              <input {...text('firstName')} autoComplete="given-name" maxLength={60} placeholder="e.g. Thabo" />
            </IconInput>
          </Field>
          <Field label="Surname" htmlFor="f-lastName" required error={errors.lastName}>
            <IconInput icon="user">
              <input {...text('lastName')} autoComplete="family-name" maxLength={60} placeholder="e.g. Mokoena" />
            </IconInput>
          </Field>
          <Field
            label="SA ID / Passport no."
            htmlFor="f-idNumber"
            required
            error={errors.idNumber ?? (isMistypedSaId(data.idNumber) ? ID_TYPO : undefined)}
            help={fromId && fromId.dateOfBirth === data.dateOfBirth ? '✓ Date of birth and gender filled in from your ID.' : undefined}
          >
            <IconInput icon="idCard">
              {/* No numeric keypad: passport numbers have letters. */}
              <input {...text('idNumber')} onChange={(e) => setIdNumber(e.target.value)} maxLength={20} placeholder="13-digit ID or passport number" />
            </IconInput>
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
        </div>
      </FormGroup>

      <FormGroup icon="phone" title="Contact details" hint="How we will reach you about your policy.">
        <div className="grid grid--3">
          <Field label="Cellphone" htmlFor="f-phone" required error={errors.phone}>
            <IconInput icon="phone">
              <input {...text('phone')} type="tel" autoComplete="tel" placeholder="082 123 4567" />
            </IconInput>
          </Field>
          <Field label="Alternative number" htmlFor="f-altPhone" error={errors.altPhone}>
            <IconInput icon="phone">
              <input {...text('altPhone')} type="tel" placeholder="Optional" />
            </IconInput>
          </Field>
          <Field label="Email address" htmlFor="f-email" error={errors.email}>
            <IconInput icon="mail">
              <input {...text('email')} type="email" autoComplete="email" placeholder="you@example.com" />
            </IconInput>
          </Field>
        </div>
      </FormGroup>

      <FormGroup icon="home" title="Home address">
        <div className="grid grid--3">
          <Field
            label="Street address"
            htmlFor="f-address"
            required
            error={errors.address}
            className="grid__span-3"
            help={meta.addressSearch ? 'Pick your street from the list to fill in the rest (please check it), or type your address in full.' : undefined}
          >
            <AddressSearch
              id="f-address"
              value={data.address}
              invalid={Boolean(errors.address)}
              source={meta.addressSearch}
              onChange={(value) => update('address', value)}
              onPick={(a) => {
                if (a.street) update('address', a.street);
                if (a.city) update('city', a.city);
                if (a.province) update('province', a.province);
                if (a.postalCode) update('postalCode', a.postalCode);
              }}
            />
          </Field>
          <Field label="Town / City" htmlFor="f-city" required error={errors.city}>
            <input {...text('city')} autoComplete="address-level2" maxLength={80} placeholder="e.g. Pretoria" />
          </Field>
          <Field label="Province" htmlFor="f-province" required error={errors.province}>
            <select id="f-province" value={data.province} onChange={(e) => update('province', e.target.value)}>
              <option value="">Select</option>
              {meta.provinces.map((p) => <option key={p}>{p}</option>)}
            </select>
          </Field>
          <Field label="Postal code" htmlFor="f-postalCode" error={errors.postalCode}>
            <input {...text('postalCode')} inputMode="numeric" maxLength={4} autoComplete="postal-code" placeholder="e.g. 0183" />
          </Field>
        </div>
      </FormGroup>
    </fieldset>
  );
}

/** A titled box that groups related fields within a step. */
function FormGroup({ icon, title, hint, children }: { icon: IconName; title: string; hint?: string; children: ReactNode }) {
  return (
    <section className="form-group">
      <header className="form-group__head">
        <span className="form-group__icon"><Icon name={icon} /></span>
        <div>
          <h3 className="form-group__title">{title}</h3>
          {hint && <p className="form-group__hint">{hint}</p>}
        </div>
      </header>
      {children}
    </section>
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
                const adult = { adult: ADULT_RELATIONSHIPS.includes(dep.relationship) };
                const fromId = readSaId(dep.idNumber, adult);
                const setIdNumber = (value: string) => {
                  updateDependant(i, 'idNumber', value);
                  const read = readSaId(value, adult);
                  if (read) updateDependant(i, 'dateOfBirth', read.dateOfBirth);
                };
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
                      <Field
                        label="SA ID / Passport no."
                        htmlFor={id('idno')}
                        required={dep.relationship !== 'CHILD'}
                        error={err('idNumber') ?? (isMistypedSaId(dep.idNumber) ? ID_TYPO : undefined)}
                        help={fromId && fromId.dateOfBirth === dep.dateOfBirth ? '✓ Date of birth filled in from the ID.' : undefined}
                      >
                        <input id={id('idno')} value={dep.idNumber} maxLength={20} onChange={(e) => setIdNumber(e.target.value)} />
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
            <IconInput icon="user"><input {...ben('firstName')} maxLength={60} placeholder="e.g. Lerato" /></IconInput>
          </Field>
          <Field label="Surname" htmlFor="b-lastName" required error={errors['beneficiary.lastName']}>
            <IconInput icon="user"><input {...ben('lastName')} maxLength={60} placeholder="e.g. Mokoena" /></IconInput>
          </Field>
          <Field
            label="SA ID / Passport no."
            htmlFor="b-idNumber"
            required
            error={errors['beneficiary.idNumber'] ?? (isMistypedSaId(b.idNumber) ? ID_TYPO : undefined)}
          >
            <IconInput icon="idCard"><input {...ben('idNumber')} maxLength={20} placeholder="13-digit ID or passport number" /></IconInput>
          </Field>
          <BeneficiaryRelationship
            value={b.relationship}
            error={errors['beneficiary.relationship']}
            onChange={(value) => updateBeneficiary('relationship', value)}
          />
          <Field label="Phone number" htmlFor="b-phone" required error={errors['beneficiary.phone']}>
            <IconInput icon="phone"><input {...ben('phone')} type="tel" placeholder="082 123 4567" /></IconInput>
          </Field>
        </div>
      </div>
    </fieldset>
  );
}

/** Dropdown of common relationships; "Other" adds a box to type the relationship in. */
function BeneficiaryRelationship({ value, error, onChange }: { value: string; error?: string; onChange: (value: string) => void }) {
  const [otherChosen, setOtherChosen] = useState(false);
  const otherInput = useRef<HTMLInputElement>(null);
  // A typed answer that is not in the list (e.g. when coming back to this step) also means "Other".
  const isOther = otherChosen || (value !== '' && !BENEFICIARY_RELATIONSHIPS.includes(value));

  useEffect(() => {
    if (otherChosen) otherInput.current?.focus();
  }, [otherChosen]);

  function choose(choice: string) {
    if (choice === OTHER_RELATIONSHIP) {
      setOtherChosen(true);
      onChange('');
    } else {
      setOtherChosen(false);
      onChange(choice);
    }
  }

  return (
    <>
      <Field label="Relationship to you" htmlFor="b-relationship" required error={isOther ? undefined : error}>
        <select id="b-relationship" value={isOther ? OTHER_RELATIONSHIP : value} onChange={(e) => choose(e.target.value)}>
          <option value="">Select</option>
          {BENEFICIARY_RELATIONSHIPS.map((r) => <option key={r} value={r}>{r}</option>)}
          <option value={OTHER_RELATIONSHIP}>Other (type it in)</option>
        </select>
      </Field>
      {isOther && (
        <Field label="Their relationship to you" htmlFor="b-relationship-other" required error={error}>
          <input
            ref={otherInput}
            id="b-relationship-other"
            value={value}
            onChange={(e) => onChange(e.target.value)}
            maxLength={40}
            placeholder="e.g. Godmother"
          />
        </Field>
      )}
    </>
  );
}

/** One part of the summary, with a "Change" link back to the step where it was filled in. */
function SummaryPart({ title, rows, onChange }: { title: string; rows: [string, string][]; onChange: () => void }) {
  return (
    <div className="summary__part">
      <div className="summary__head">
        <h4 className="summary__part-title">{title}</h4>
        <button className="link-btn" type="button" onClick={onChange} aria-label={`Change ${title.toLowerCase()}`}>Change</button>
      </div>
      {rows.map(([label, value], i) => (
        <div className="summary__row" key={`${label}-${i}`}>
          <span>{label}</span>
          <strong>{value || '–'}</strong>
        </div>
      ))}
    </div>
  );
}

function ConfirmStep({ meta, plan, data, errors, update, mode, edit }: StepProps & { plan: Plan | undefined; mode: 'public' | 'admin'; edit: (step: number) => void }) {
  const isAdmin = mode === 'admin';
  const b = data.beneficiary;
  const fullName = (first: string, last: string) => `${first} ${last}`.trim();

  return (
    <fieldset className="form-step">
      <legend className="form-step__title">Check &amp; confirm</legend>
      <p className="form-step__hint">
        {isAdmin ? 'Check the details with the applicant' : 'Please check your details'}, then choose how to pay.
      </p>

      <div className="summary">
        <h3 className="summary__title">{isAdmin ? 'Application summary' : 'Your application summary'}</h3>
        <SummaryPart
          title="Plan"
          onChange={() => edit(0)}
          rows={[
            ['Plan', plan?.name ?? ''],
            ['Cover amount', plan ? money(plan.cover) : ''],
            ['Monthly premium', plan ? `${money(plan.premium)} per month` : ''],
          ]}
        />
        <SummaryPart
          title="Main member"
          onChange={() => edit(1)}
          rows={[
            ['Name', `${data.title} ${fullName(data.firstName, data.lastName)}`.trim()],
            ['ID / Passport', data.idNumber],
            ['Date of birth', formatBirthDate(data.dateOfBirth)],
            ['Cellphone', data.phone],
            ['Address', [data.address, data.city, data.province, data.postalCode].filter(Boolean).join(', ')],
          ]}
        />
        <SummaryPart
          title="Family & beneficiary"
          onChange={() => edit(2)}
          rows={[
            ...(data.dependants.length
              ? data.dependants.map((d): [string, string] => [labelOf(meta.relationships, d.relationship), fullName(d.firstName, d.lastName)])
              : [['Family members', 'None (main member only)'] as [string, string]]),
            ['Beneficiary', `${fullName(b.firstName, b.lastName)}${b.relationship ? ` (${b.relationship})` : ''}`],
          ]}
        />
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
            Information Act (POPIA). {/* New tab, so the half-filled form is not lost. */}
            <a href="/privacy" target="_blank" rel="noopener">Read the privacy notice</a>.
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
