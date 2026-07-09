export type Role = 'ADMIN' | 'MANAGER' | 'FACTORY' | 'WAREHOUSE' | 'LOGIST' | 'ACCOUNTANT' | 'CLIENT';

export type OrderStatus =
  | 'NEW'
  | 'CREDIT_CHECK'
  | 'REJECTED'
  | 'SPEC_PREPARATION'
  | 'SIGNING'
  | 'AWAITING_PAYMENT'
  | 'DOCS_CONFIRMED'
  | 'RESERVATION'
  | 'PRODUCTION'
  | 'READY'
  | 'SHIPMENT'
  | 'DELIVERY'
  | 'AWAITING_DOCS'
  | 'CLAIM'
  | 'POSTPAYMENT'
  | 'CLOSED';

export type Priority = 'HIGH' | 'MEDIUM' | 'LOW';
export type PaymentTerm = 'PREPAYMENT' | 'POSTPAYMENT';
export type PaymentStatus = 'UNPAID' | 'PARTIAL' | 'PAID' | 'POSTPAY_APPROVED';
export type Unit = 'M2' | 'PALLET';
export type Grade = 'A' | 'B' | 'C' | 'BRAK';
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
  debt: number;
  creditBlocked: boolean;
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
  surface?: string | null;
  unit: Unit;
  pricePerUnit: number;
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
  pricePerUnit: number;
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
  factory?: { id: string; name: string; city: string } | null;
  carrier?: { id: string; name: string } | null;
  items: OrderItem[];
  specifications?: Specification[];
  contracts?: Contract[];
  documents?: DocumentItem[];
  history?: OrderHistoryEntry[];
  claims?: Claim[];
  reservations?: { id: string; quantity: number; product?: Product }[];
  productionPlanItems?: { id: string; priority: number; status: string; plan?: { year: number; month: number } }[];
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

export interface Factory {
  id: string;
  name: string;
  city: string;
  isActive: boolean;
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
  surfaces: string[];
  documentTypes: Record<string, string>;
}

export interface AppSettings {
  brandName: string;
  currency: string;
  dateFormat: string;
  language: string;
}
