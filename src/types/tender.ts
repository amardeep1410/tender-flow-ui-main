export type TenderStatus =
  | "draft"
  | "submitted"
  | "in_progress"
  | "completed"
  | "cancelled"
  | "Draft"
  | "Submitted"
  | "In Progress"
  | "Completed"
  | "Cancelled";

export type TenderSource = "GeM" | "UNGM" | "Other";

export type UserRole = "TENDER_USER" | "SUPER_ADMIN" | "tender_user" | "super_admin";

export type AccountStatus = "ACTIVE" | "INACTIVE" | "active" | "suspended";

export interface TenderDocument {
  id: string;
  tenderId: string;
  name: string;
  filePath: string;
  type: string;
  size: number;
  uploadedBy: string;
  uploaderName?: string;
  uploadedAt: string;
}

export interface StatusChange {
  id: string;
  tenderId?: string;
  from: TenderStatus | null;
  to: TenderStatus;
  changedBy: string;
  changedByName?: string;
  changedAt: string;
  remarks?: string;
}

export interface ActivityEntry {
  id: string;
  tenderId?: string;
  action: string;
  description: string;
  user: string;
  userId?: string;
  userName?: string;
  timestamp: string;
}

export interface Tender {
  id: string;
  tenderNumber: string;
  title: string;
  source: TenderSource;
  category: string;
  organization: string;
  department: string;
  productService: string;
  portalUrl: string;
  description: string;
  estimatedValue: number;
  currency: string;
  emdAmount: number;
  tenderFee: number;
  publishedDate: string;
  submissionStartDate: string;
  submissionDeadline: string;
  preBidDate: string;
  expectedResultDate: string;
  expectedCompletionDate: string;
  status: TenderStatus;
  createdBy?: string;
  updatedBy?: string;
  createdAt?: string;
  updatedAt: string;
  isDeleted?: boolean;
  documents: TenderDocument[];
  statusHistory: StatusChange[];
  activity: ActivityEntry[];
}

export interface UserProfile {
  id?: string;
  name: string;
  email: string;
  role: "TENDER_USER" | "SUPER_ADMIN";
  accountStatus: "ACTIVE" | "INACTIVE";
  createdAt: string;
  updatedAt?: string;
}

export interface TenderDbRow {
  id: string;
  tender_number: string;
  title: string;
  description: string | null;
  source: string;
  category: string | null;
  organization: string | null;
  department: string | null;
  product_service: string | null;
  portal_url: string | null;
  estimated_value: number | null;
  currency: string;
  emd_amount: number | null;
  tender_fee: number | null;
  published_date: string | null;
  submission_start_date: string | null;
  submission_deadline: string;
  pre_bid_date: string | null;
  expected_result_date: string | null;
  expected_completion_date: string | null;
  status: string;
  created_by: string;
  updated_by: string | null;
  created_at: string;
  updated_at: string;
  is_deleted: boolean;
}

export interface TenderDocumentDbRow {
  id: string;
  tender_id: string;
  file_name: string;
  file_path: string;
  file_type: string | null;
  file_size: number | null;
  uploaded_by: string;
  created_at: string;
  profiles?: { name?: string; email?: string } | null;
}

export interface TenderStatusHistoryDbRow {
  id: string;
  tender_id: string;
  old_status: string | null;
  new_status: string;
  changed_by: string;
  remarks: string | null;
  created_at: string;
  profiles?: { name?: string; email?: string } | null;
}

export interface TenderActivityLogDbRow {
  id: string;
  tender_id: string | null;
  user_id: string;
  action: string;
  description: string | null;
  created_at: string;
  profiles?: { name?: string; email?: string } | null;
}

export function fromDbDocument(row: TenderDocumentDbRow): TenderDocument {
  return {
    id: row.id,
    tenderId: row.tender_id,
    name: row.file_name,
    filePath: row.file_path,
    type: row.file_type || (row.file_name.split(".").pop() || "FILE").toUpperCase(),
    size: Number(row.file_size) || 0,
    uploadedBy: row.uploaded_by,
    uploaderName: row.profiles?.name || row.profiles?.email || "User",
    uploadedAt: row.created_at,
  };
}

export function fromDbStatusHistory(row: TenderStatusHistoryDbRow): StatusChange {
  return {
    id: row.id,
    tenderId: row.tender_id,
    from: (row.old_status as TenderStatus) || null,
    to: row.new_status as TenderStatus,
    changedBy: row.changed_by,
    changedByName: row.profiles?.name || row.profiles?.email || "User",
    changedAt: row.created_at,
    remarks: row.remarks || undefined,
  };
}

export function fromDbActivityLog(row: TenderActivityLogDbRow): ActivityEntry {
  return {
    id: row.id,
    tenderId: row.tender_id || undefined,
    action: row.action,
    description: row.description || "",
    userId: row.user_id,
    user: row.profiles?.name || row.profiles?.email || "User",
    userName: row.profiles?.name || row.profiles?.email || "User",
    timestamp: row.created_at,
  };
}

export function fromDbTender(row: TenderDbRow): Tender {
  return {
    id: row.id,
    tenderNumber: row.tender_number,
    title: row.title,
    source: (row.source as TenderSource) || "Other",
    category: row.category || "",
    organization: row.organization || "",
    department: row.department || "",
    productService: row.product_service || "",
    portalUrl: row.portal_url || "",
    description: row.description || "",
    estimatedValue: Number(row.estimated_value) || 0,
    currency: row.currency || "INR",
    emdAmount: Number(row.emd_amount) || 0,
    tenderFee: Number(row.tender_fee) || 0,
    publishedDate: row.published_date || "",
    submissionStartDate: row.submission_start_date || "",
    submissionDeadline: row.submission_deadline || "",
    preBidDate: row.pre_bid_date || "",
    expectedResultDate: row.expected_result_date || "",
    expectedCompletionDate: row.expected_completion_date || "",
    status: row.status as TenderStatus,
    createdBy: row.created_by,
    updatedBy: row.updated_by || undefined,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
    isDeleted: row.is_deleted,
    documents: [],
    statusHistory: [],
    activity: [],
  };
}
