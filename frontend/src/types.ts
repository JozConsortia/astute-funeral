// Shapes shared with the Spring Boot API.

export interface Plan {
  id: string;
  name: string;
  cover: number;
  premium: number;
  spouse: boolean;
  maxChildren: number;
  maxExtended: number;
  featured: boolean;
  summary: string;
  features: string[];
}

export interface Option {
  value: string;
  label: string;
}

export interface Meta {
  plans: Plan[];
  provinces: string[];
  titles: string[];
  genders: Option[];
  maritalStatuses: Option[];
  relationships: Option[];
  paymentMethods: Option[];
  debitDays: Option[];
  statuses: Option[];
  adminRoles: Option[];
  replyChannels: Option[];
}

export type Status = 'NEW' | 'IN_REVIEW' | 'APPROVED' | 'DECLINED';
export type Source = 'WEBSITE' | 'ADMIN';

export interface DependantInput {
  relationship: string;
  firstName: string;
  lastName: string;
  idNumber: string;
  dateOfBirth: string;
}

export interface BeneficiaryInput {
  firstName: string;
  lastName: string;
  idNumber: string;
  relationship: string;
  phone: string;
}

export interface ApplicationInput {
  plan: string;
  title: string;
  firstName: string;
  lastName: string;
  idNumber: string;
  dateOfBirth: string;
  gender: string;
  maritalStatus: string;
  phone: string;
  altPhone: string;
  email: string;
  address: string;
  city: string;
  province: string;
  postalCode: string;
  dependants: DependantInput[];
  beneficiary: BeneficiaryInput;
  paymentMethod: string;
  debitDay: string;
  consent: boolean;
  declaration: boolean;
  /** Honeypot - must stay empty. */
  website: string;
}

export interface ApplicationSummary {
  id: number;
  reference: string;
  firstName: string;
  lastName: string;
  idNumber: string;
  phone: string;
  planName: string;
  monthlyPremium: number;
  status: Status;
  source: Source;
  createdAt: string;
}

export interface ApplicationDetail extends ApplicationSummary {
  planId: string;
  coverAmount: number;
  title: string;
  dateOfBirth: string;
  gender: string;
  maritalStatus: string;
  altPhone: string;
  email: string;
  address: string;
  city: string;
  province: string;
  postalCode: string;
  dependants: DependantInput[];
  beneficiary: BeneficiaryInput;
  paymentMethod: string;
  debitDay: string;
  notes: string;
  capturedBy: string | null;
  lastUpdatedBy: string | null;
  updatedAt: string;
}

export interface PageResult<T> {
  rows: T[];
  total: number;
  page: number;
  pages: number;
}

export interface Stats {
  total: number;
  byStatus: Record<Status, number>;
  thisMonth: number;
  approvedPremium: number;
  unreadMessages: number;
  awaitingReply: number;
  byPlan: { planName: string; count: number }[];
  recent: ApplicationSummary[];
}

export type ReplyChannel = 'EMAIL' | 'EMAIL_APP' | 'WHATSAPP' | 'PHONE';

export interface MessageReply {
  id: number;
  body: string;
  channel: ReplyChannel;
  sentBy: string;
  sentAt: string;
}

export interface ContactMessage {
  id: number;
  name: string;
  email: string;
  phone: string;
  subject: string;
  message: string;
  read: boolean;
  createdAt: string;
  replies: MessageReply[];
}

export type AdminRole = 'SUPER_ADMIN' | 'ADMIN';

/** The signed-in admin. */
export interface Me {
  username: string;
  fullName: string;
  email: string | null;
  role: AdminRole;
  /** True when the server can send email replies itself (SMTP configured). */
  emailEnabled: boolean;
  /** Still using a temporary password from a super admin; must choose their own first. */
  mustChangePassword: boolean;
}

export interface AdminUser {
  id: number;
  username: string;
  fullName: string;
  email: string | null;
  role: AdminRole;
  active: boolean;
  mustChangePassword: boolean;
  createdAt: string;
  lastLoginAt: string | null;
}

/** Returned when a user is added or their password is reset; the password is shown only once. */
export interface TemporaryPassword {
  user: AdminUser;
  temporaryPassword: string;
}

export type FieldErrors = Record<string, string>;
