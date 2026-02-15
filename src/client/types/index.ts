// Roles - NOTE: "free" = invited guest who pays nothing
export type Role = 'boss' | 'senior' | 'member' | 'junior' | 'student' | 'free';
export type Gender = 'male' | 'female' | 'other';
export type Attendance = 'pending' | 'attending' | 'declined';
export type EventStatus = 'draft' | 'open' | 'closed' | 'settled';
export type PaymentStatus = 'unpaid' | 'paid';
export type Rounding = 'ceil_100' | 'ceil_500' | 'ceil_1000';

export interface Organizer {
  id: string;
  google_id: string;
  email: string;
  name: string;
  avatar_url?: string;
  paypay_link?: string;
  created_at: string;
  updated_at: string;
}

export interface Event {
  id: string;
  organizer_id: string;
  title: string;
  description?: string;
  event_date: string;
  venue_name?: string;
  venue_address?: string;
  venue_url?: string;
  budget_per_person?: number;
  total_amount?: number;
  status: EventStatus;
  paypay_link?: string;
  created_at: string;
  updated_at: string;
  attending_count?: number;
  total_count?: number;
}

export interface Participant {
  id: string;
  event_id: string;
  name: string;
  attendance: Attendance;
  role: Role;
  gender?: Gender;
  assigned_amount?: number;
  payment_status: PaymentStatus;
  created_at: string;
  updated_at: string;
}

export interface SplitRule {
  id: string;
  event_id: string;
  rounding: Rounding;
}

export interface SplitRatio {
  id: string;
  split_rule_id: string;
  role: Role;
  gender?: Gender;
  ratio: number;
}

export interface Restaurant {
  id: string;
  name: string;
  address: string;
  access: string;
  budget: string;
  photo: string;
  url: string;
}

// Role labels in Japanese
export const ROLE_LABELS: Record<Role, string> = {
  boss: '上司・部長',
  senior: '先輩',
  member: '一般',
  junior: '後輩',
  student: '学生',
  free: '無料招待',
};

export const GENDER_LABELS: Record<Gender, string> = {
  male: '男性',
  female: '女性',
  other: 'その他',
};

export const ATTENDANCE_LABELS: Record<Attendance, string> = {
  pending: '未回答',
  attending: '出席',
  declined: '欠席',
};

export const STATUS_LABELS: Record<EventStatus, string> = {
  draft: '下書き',
  open: '募集中',
  closed: '締切',
  settled: '精算済',
};

export const ROUNDING_LABELS: Record<Rounding, string> = {
  ceil_100: '100円単位',
  ceil_500: '500円単位',
  ceil_1000: '1000円単位',
};
