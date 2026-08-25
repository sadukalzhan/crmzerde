export type Role = 'ADMIN' | 'SALES_HEAD' | 'MANAGER' | 'WAREHOUSE' | 'CLIENT';

export type OrderStatus =
  | 'NEW'
  | 'REJECTED'
  | 'RESERVATION'
  | 'SPEC_PREPARATION'
  | 'SHIPMENT'
  | 'CLOSED';

export interface ReservationHolder {
  reservationId: string;
  quantity: number;
  orderId: string;
  orderNumber: number;
  clientName: string;
  managerName: string | null;
  sameClient: boolean;
  confirmedForShipment: boolean;
  /** Резерв своего клиента без подтверждения под отгрузку — можно забрать сразу. */
  releasable: boolean;
}

export interface AvailabilityLine {
  productId: string;
  grade: Grade;
  name: string;
  needed: number;
  free: number;
  covered: number;
  shortage: number;
  reservedBy: ReservationHolder[];
}

export interface Availability {
  status: 'FULL' | 'PARTIAL' | 'NONE';
  lines: AvailabilityLine[];
}

export type Priority = 'HIGH' | 'MEDIUM' | 'LOW';
export type PaymentTerm = 'PREPAYMENT' | 'POSTPAYMENT';
export type PaymentStatus = 'UNPAID' | 'PARTIAL' | 'PAID' | 'POSTPAY_APPROVED';
export type Unit = 'M2' | 'PALLET';
// Сорт — свободный код из справочника: A, A1, R3, B, B12, C, BRAK и другие.
export type Grade = string;

export interface GradeRef {
  id: string;
  code: string;
  label: string;
  noBox: boolean;
  sortOrder: number;
  isActive: boolean;
}
export type Format = '60x60' | '120x60';

export interface User {
  id: string;
  fullName: string;
  email: string;
  role: Role;
  phone?: string | null;
  isActive?: boolean;
  createdAt?: string;
  clientProfile?: Client | null;
}

export interface Client {
  id: string;
  companyName: string;
  contactName?: string | null;
  email?: string | null;
  phone?: string | null;
  bin?: string | null;
  address?: string | null;
  actualAddress?: string | null;
  bankName?: string | null;
  bankAccount?: string | null;
  bik?: string | null;
  vatCert?: string | null;
  kbe?: string | null;
  director?: string | null;
  managerId?: string | null;
  manager?: { id: string; fullName: string } | null;
  _count?: { orders: number };
}

export interface Product {
  id: string;
  name: string;
  format: Format;
  size?: string | null;
  collection?: string | null;
  color?: string | null;
  unit: Unit;
  isActive: boolean;
  inventory?: Inventory[];
}

export interface Inventory {
  id: string;
  productId: string;
  grade: Grade;
  quantity: number;
  reserved: number;
  unit: Unit;
  free?: number;
  boxes?: number;
  pallets?: number;
  product?: Product;
}

export interface OrderItem {
  id: string;
  productId: string;
  quantity: number;
  unit: Unit;
  grade: Grade;
  product?: Product;
}

export interface OrderHistoryEntry {
  id: string;
  fromStatus: string | null;
  toStatus: string;
  note?: string | null;
  createdAt: string;
  actor?: { id: string; fullName: string; role: Role } | null;
}

export interface DocumentItem {
  id: string;
  type: 'TTN' | 'UPD' | 'ACT' | 'INVOICE' | 'OTHER';
  name: string;
  fileUrl: string;
  createdAt: string;
  uploadedBy?: { fullName: string } | null;
}

export interface Specification {
  id: string;
  number: string;
  total: number;
  fileUrl?: string | null;
  managerSigned: boolean;
  clientSigned: boolean;
  createdAt: string;
  items?: { id: string; name: string; quantity: number; unit: Unit; price: number; sum: number }[];
  order?: { number: number; status: string; client?: { companyName: string } };
}

export interface Contract {
  id: string;
  number: string;
  fileUrl?: string | null;
  managerSigned: boolean;
  clientSigned: boolean;
  signedAt?: string | null;
  order?: { number: number; client?: { companyName: string } };
}

export interface Claim {
  id: string;
  orderId: string;
  description: string;
  status: 'OPEN' | 'IN_REVIEW' | 'RESOLVED' | 'REJECTED';
  resolution?: string | null;
  createdAt: string;
  order?: { number: number; client?: { companyName: string } };
}

export interface Order {
  id: string;
  number: number;
  status: OrderStatus;
  priority: Priority;
  productionPriority?: number | null;
  paymentTerm: PaymentTerm;
  paymentStatus: PaymentStatus;
  quantity: number;
  unit: Unit;
  selfPickup: boolean;
  shipFrom?: string | null;
  shipTo?: string | null;
  route?: string | null;
  desiredDate?: string | null;
  productionStartDate?: string | null;
  rejectionReason?: string | null;
  closedAt?: string | null;
  createdAt: string;
  updatedAt: string;
  client: Client;
  manager?: { id: string; fullName: string; email: string; role: Role } | null;
  carrier?: { id: string; name: string } | null;
  items: OrderItem[];
  specifications?: Specification[];
  contracts?: Contract[];
  documents?: DocumentItem[];
  history?: OrderHistoryEntry[];
  claims?: Claim[];
  reservations?: { id: string; quantity: number; grade?: Grade; confirmedForShipment?: boolean; product?: Product }[];
  productionPlanItems?: { id: string; priority: number; status: string; plan?: { year: number; month: number } }[];
}

export interface Reservation {
  id: string;
  orderId: string;
  productId: string;
  grade: Grade;
  quantity: number;
  boxes?: number;
  pallets?: number;
  createdAt: string;
  createdBy?: { fullName: string; role: Role } | null;
  product?: Product;
  order?: { number: number; status: string; client?: { companyName: string }; manager?: { fullName: string } | null };
}

export interface Notification {
  id: string;
  type: string;
  title: string;
  body?: string | null;
  orderId?: string | null;
  isRead: boolean;
  createdAt: string;
}

export interface Carrier {
  id: string;
  name: string;
  phone?: string | null;
  isActive: boolean;
}

export interface Meta {
  roles: Role[];
  roleMeta: Record<Role, { key: Role; label: string; color: string; staff: boolean }>;
  orderStatuses: OrderStatus[];
  statusMeta: Record<OrderStatus, { key: OrderStatus; label: string; color: string; terminal: boolean; hint: string }>;
  transitions: Record<OrderStatus, { to: OrderStatus; roles: Role[] }[]>;
  paymentTermLabels: Record<string, string>;
  paymentStatusLabels: Record<string, string>;
  priorityLabels: Record<string, string>;
  formats: Format[];
  formatLabels: Record<string, string>;
  formatSpecs: Record<string, { m2PerBox: number; boxesPerPallet: number; m2PerTile: number; maxTilesPerPallet: number }>;
  grades: Grade[];
  gradeLabels: Record<string, string>;
  documentTypes: Record<string, string>;
}

export interface AppSettings {
  brandName: string;
  currency: string;
  dateFormat: string;
  language: string;
}
