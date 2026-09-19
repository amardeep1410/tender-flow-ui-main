/**
 * Centralized Data Access Layer for Tenders.
 * Powered by live Supabase PostgreSQL queries, Storage, and RLS.
 */
import { supabase, isSupabaseConfigured } from "@/lib/supabase";
import {
  fromDbTender,
  fromDbDocument,
  fromDbStatusHistory,
  fromDbActivityLog,
  type Tender,
  type TenderDbRow,
  type TenderDocument,
  type TenderDocumentDbRow,
  type StatusChange,
  type TenderStatusHistoryDbRow,
  type ActivityEntry,
  type TenderActivityLogDbRow,
  type TenderStatus,
} from "@/types/tender";

export interface GetTendersParams {
  search?: string;
  status?: string;
  source?: string;
  category?: string;
  deadlineFrom?: string;
  page?: number;
  pageSize?: number;
}

export interface TenderFormData {
  tenderNumber: string;
  title: string;
  source: string;
  category?: string;
  organization?: string;
  department?: string;
  productService?: string;
  portalUrl?: string;
  description?: string;
  estimatedValue?: number | string;
  currency?: string;
  emdAmount?: number | string;
  tenderFee?: number | string;
  publishedDate?: string;
  submissionStartDate?: string;
  submissionDeadline: string;
  preBidDate?: string;
  expectedResultDate?: string;
  expectedCompletionDate?: string;
  status?: string;
}

export interface TenderStatsResult {
  totalCount: number;
  submittedCount: number;
  inProgressCount: number;
  completedCount: number;
  draftCount: number;
  cancelledCount: number;
  upcomingCount: number;
  statusDistribution: { status: TenderStatus; count: number }[];
  upcomingTenders: Tender[];
  recentTenders: Tender[];
}

export interface ReportMetricsResult {
  tenders: Tender[];
  totalTenders: number;
  statusSummary: { status: string; count: number }[];
  sourceSummary: { source: string; count: number }[];
  monthlyVolume: { month: string; monthKey: string; count: number }[];
  financials: {
    totalEstimatedValue: number;
    avgEstimatedValue: number;
    totalEmd: number;
    avgEmd: number;
    currency: string;
    tenderCount: number;
  };
}

const ALLOWED_MIME_TYPES = [
  "application/pdf",
  "application/msword",
  "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
  "application/vnd.ms-excel",
  "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
  "application/vnd.ms-powerpoint",
  "application/vnd.openxmlformats-officedocument.presentationml.presentation",
  "image/jpeg",
  "image/jpg",
  "image/png",
  "image/webp",
];

const MAX_FILE_SIZE_BYTES = 25 * 1024 * 1024; // 25 MB

function parseNumber(val?: number | string): number | null {
  if (val === undefined || val === null || val === "") return null;
  const num = Number(val);
  return isNaN(num) ? null : num;
}

function sanitizeDate(dateStr?: string): string | null {
  if (!dateStr || !dateStr.trim()) return null;
  return dateStr.trim();
}

// ==============================================================================
// 1. Tenders Query & CRUD
// ==============================================================================

export async function getTenders(params: GetTendersParams = {}): Promise<{
  tenders: Tender[];
  totalCount: number;
  error?: string;
}> {
  if (!isSupabaseConfigured) {
    return { tenders: [], totalCount: 0, error: "Supabase is not configured." };
  }

  const {
    search = "",
    status = "all",
    source = "all",
    category = "all",
    deadlineFrom = "",
    page = 1,
    pageSize = 10,
  } = params;

  try {
    let query = supabase.from("tenders").select("*", { count: "exact" }).eq("is_deleted", false);

    if (search.trim()) {
      const term = search.trim();
      query = query.or(
        `tender_number.ilike.%${term}%,title.ilike.%${term}%,organization.ilike.%${term}%`,
      );
    }

    if (status && status !== "all") {
      query = query.ilike("status", status);
    }

    if (source && source !== "all") {
      query = query.eq("source", source);
    }

    if (category && category !== "all") {
      query = query.eq("category", category);
    }

    if (deadlineFrom) {
      query = query.gte("submission_deadline", deadlineFrom);
    }

    const from = (page - 1) * pageSize;
    const to = from + pageSize - 1;

    query = query.order("created_at", { ascending: false }).range(from, to);

    const { data, count, error } = await query;

    if (error) {
      console.error("Error fetching tenders:", error);
      return { tenders: [], totalCount: 0, error: error.message };
    }

    const tenders: Tender[] = (data || []).map((row) => fromDbTender(row as TenderDbRow));
    return { tenders, totalCount: count || 0 };
  } catch (err) {
    console.error("Unexpected error in getTenders:", err);
    return { tenders: [], totalCount: 0, error: "Failed to load tenders." };
  }
}

export async function getTenderById(id: string): Promise<{
  tender: Tender | null;
  error?: string;
}> {
  if (!isSupabaseConfigured) {
    return { tender: null, error: "Supabase is not configured." };
  }

  try {
    const { data, error } = await supabase
      .from("tenders")
      .select("*")
      .eq("id", id)
      .eq("is_deleted", false)
      .maybeSingle();

    if (error) {
      console.error("Error fetching tender by id:", error);
      return { tender: null, error: error.message };
    }

    if (!data) {
      return { tender: null };
    }

    const tender = fromDbTender(data as TenderDbRow);

    // Fetch related documents, status history, and activity logs in parallel
    const [docsRes, historyRes, activityRes] = await Promise.all([
      getTenderDocuments(id),
      getTenderStatusHistory(id),
      getTenderActivityLogs(id),
    ]);

    tender.documents = docsRes.documents;
    tender.statusHistory = historyRes.history;
    tender.activity = activityRes.activity;

    return { tender };
  } catch (err) {
    console.error("Unexpected error in getTenderById:", err);
    return { tender: null, error: "Failed to load tender details." };
  }
}

export async function createTender(
  form: TenderFormData,
  userId: string,
): Promise<{
  tender: Tender | null;
  error?: string;
}> {
  if (!isSupabaseConfigured) {
    return { tender: null, error: "Supabase is not configured." };
  }

  try {
    const dbPayload = {
      tender_number: form.tenderNumber.trim(),
      title: form.title.trim(),
      source: form.source || "Other",
      category: form.category || null,
      organization: form.organization?.trim() || null,
      department: form.department?.trim() || null,
      product_service: form.productService?.trim() || null,
      portal_url: form.portalUrl?.trim() || null,
      description: form.description?.trim() || null,
      estimated_value: parseNumber(form.estimatedValue),
      currency: form.currency || "INR",
      emd_amount: parseNumber(form.emdAmount),
      tender_fee: parseNumber(form.tenderFee),
      published_date: sanitizeDate(form.publishedDate),
      submission_start_date: sanitizeDate(form.submissionStartDate),
      submission_deadline: form.submissionDeadline,
      pre_bid_date: sanitizeDate(form.preBidDate),
      expected_result_date: sanitizeDate(form.expectedResultDate),
      expected_completion_date: sanitizeDate(form.expectedCompletionDate),
      status: form.status || "Draft",
      created_by: userId,
      updated_by: userId,
      is_deleted: false,
    };

    const { data, error } = await supabase.from("tenders").insert(dbPayload).select().single();

    if (error) {
      if (error.code === "23505") {
        return {
          tender: null,
          error: `A tender with number "${form.tenderNumber}" already exists.`,
        };
      }
      return { tender: null, error: error.message };
    }

    return { tender: fromDbTender(data as TenderDbRow) };
  } catch (err) {
    console.error("Unexpected error creating tender:", err);
    return { tender: null, error: "Failed to create tender." };
  }
}

export async function updateTender(
  id: string,
  form: Partial<TenderFormData>,
  userId: string,
): Promise<{
  tender: Tender | null;
  error?: string;
}> {
  if (!isSupabaseConfigured) {
    return { tender: null, error: "Supabase is not configured." };
  }

  try {
    const dbPayload: Record<string, string | number | boolean | null> = {
      updated_by: userId,
    };

    if (form.tenderNumber !== undefined) dbPayload.tender_number = form.tenderNumber.trim();
    if (form.title !== undefined) dbPayload.title = form.title.trim();
    if (form.source !== undefined) dbPayload.source = form.source;
    if (form.category !== undefined) dbPayload.category = form.category || null;
    if (form.organization !== undefined) dbPayload.organization = form.organization?.trim() || null;
    if (form.department !== undefined) dbPayload.department = form.department?.trim() || null;
    if (form.productService !== undefined)
      dbPayload.product_service = form.productService?.trim() || null;
    if (form.portalUrl !== undefined) dbPayload.portal_url = form.portalUrl?.trim() || null;
    if (form.description !== undefined) dbPayload.description = form.description?.trim() || null;
    if (form.estimatedValue !== undefined)
      dbPayload.estimated_value = parseNumber(form.estimatedValue);
    if (form.currency !== undefined) dbPayload.currency = form.currency;
    if (form.emdAmount !== undefined) dbPayload.emd_amount = parseNumber(form.emdAmount);
    if (form.tenderFee !== undefined) dbPayload.tender_fee = parseNumber(form.tenderFee);
    if (form.publishedDate !== undefined)
      dbPayload.published_date = sanitizeDate(form.publishedDate);
    if (form.submissionStartDate !== undefined)
      dbPayload.submission_start_date = sanitizeDate(form.submissionStartDate);
    if (form.submissionDeadline !== undefined)
      dbPayload.submission_deadline = form.submissionDeadline;
    if (form.preBidDate !== undefined) dbPayload.pre_bid_date = sanitizeDate(form.preBidDate);
    if (form.expectedResultDate !== undefined)
      dbPayload.expected_result_date = sanitizeDate(form.expectedResultDate);
    if (form.expectedCompletionDate !== undefined)
      dbPayload.expected_completion_date = sanitizeDate(form.expectedCompletionDate);
    if (form.status !== undefined) dbPayload.status = form.status;

    const { data, error } = await supabase
      .from("tenders")
      .update(dbPayload)
      .eq("id", id)
      .eq("is_deleted", false)
      .select()
      .single();

    if (error) {
      if (error.code === "23505") {
        return {
          tender: null,
          error: `A tender with number "${form.tenderNumber}" already exists.`,
        };
      }
      return { tender: null, error: error.message };
    }

    return { tender: fromDbTender(data as TenderDbRow) };
  } catch (err) {
    console.error("Unexpected error updating tender:", err);
    return { tender: null, error: "Failed to update tender." };
  }
}

export async function softDeleteTender(
  id: string,
  userId: string,
): Promise<{
  success: boolean;
  error?: string;
}> {
  if (!isSupabaseConfigured) {
    return { success: false, error: "Supabase is not configured." };
  }

  try {
    const { error } = await supabase
      .from("tenders")
      .update({
        is_deleted: true,
        updated_by: userId,
      })
      .eq("id", id);

    if (error) {
      console.error("Error soft-deleting tender:", error);
      return { success: false, error: error.message };
    }

    return { success: true };
  } catch (err) {
    console.error("Unexpected error deleting tender:", err);
    return { success: false, error: "Failed to delete tender." };
  }
}

// ==============================================================================
// 2. Storage & Tender Documents
// ==============================================================================

export async function uploadTenderDocument(
  tenderId: string,
  file: File,
  userId: string,
): Promise<{
  document: TenderDocument | null;
  error?: string;
}> {
  if (!isSupabaseConfigured) {
    return { document: null, error: "Supabase is not configured." };
  }

  // Business Document Validation
  if (file.size > MAX_FILE_SIZE_BYTES) {
    return {
      document: null,
      error: `File "${file.name}" exceeds the maximum allowed size of 25MB.`,
    };
  }

  const ext = (file.name.split(".").pop() || "").toLowerCase();
  const validExtensions = [
    "pdf",
    "doc",
    "docx",
    "xls",
    "xlsx",
    "ppt",
    "pptx",
    "jpg",
    "jpeg",
    "png",
    "webp",
  ];
  if (file.type && !ALLOWED_MIME_TYPES.includes(file.type) && !validExtensions.includes(ext)) {
    return {
      document: null,
      error: `File format .${ext} is not supported. Please upload PDF, Word, Excel, PowerPoint or Image files.`,
    };
  }

  const sanitizedBaseName = file.name.replace(/[^a-zA-Z0-9._-]/g, "_");
  const uniqueName = `${Date.now()}_${Math.random().toString(36).slice(2, 7)}_${sanitizedBaseName}`;
  const filePath = `tenders/${tenderId}/${uniqueName}`;

  try {
    // 1. Upload to Supabase Storage
    const { error: uploadError } = await supabase.storage
      .from("tender-documents")
      .upload(filePath, file, {
        cacheControl: "3600",
        upsert: false,
      });

    if (uploadError) {
      console.error("Storage upload error:", uploadError);
      return { document: null, error: `Upload failed: ${uploadError.message}` };
    }

    // 2. Insert metadata record into public.tender_documents
    const fileType = (file.name.split(".").pop() || "FILE").toUpperCase();
    const { data: dbData, error: dbError } = await supabase
      .from("tender_documents")
      .insert({
        tender_id: tenderId,
        file_name: file.name,
        file_path: filePath,
        file_type: fileType,
        file_size: file.size,
        uploaded_by: userId,
      })
      .select("*, profiles:uploaded_by(name, email)")
      .single();

    if (dbError) {
      console.error("Database insert error for document:", dbError);
      // Clean up orphaned storage object
      await supabase.storage.from("tender-documents").remove([filePath]);
      return { document: null, error: `Failed to record document: ${dbError.message}` };
    }

    return { document: fromDbDocument(dbData as TenderDocumentDbRow) };
  } catch (err) {
    console.error("Unexpected error in uploadTenderDocument:", err);
    return { document: null, error: "An unexpected error occurred during document upload." };
  }
}

export async function getTenderDocuments(tenderId: string): Promise<{
  documents: TenderDocument[];
  error?: string;
}> {
  if (!isSupabaseConfigured) {
    return { documents: [] };
  }

  try {
    const { data, error } = await supabase
      .from("tender_documents")
      .select("*, profiles:uploaded_by(name, email)")
      .eq("tender_id", tenderId)
      .order("created_at", { ascending: false });

    if (error) {
      console.error("Error fetching documents:", error);
      return { documents: [], error: error.message };
    }

    const documents = (data || []).map((row) => fromDbDocument(row as TenderDocumentDbRow));
    return { documents };
  } catch (err) {
    console.error("Unexpected error in getTenderDocuments:", err);
    return { documents: [], error: "Failed to load documents." };
  }
}

export async function getSignedDocumentUrl(
  filePath: string,
  expiresInSeconds = 300,
): Promise<{
  signedUrl: string | null;
  error?: string;
}> {
  if (!isSupabaseConfigured) {
    return { signedUrl: null, error: "Supabase is not configured." };
  }

  try {
    const { data, error } = await supabase.storage
      .from("tender-documents")
      .createSignedUrl(filePath, expiresInSeconds);

    if (error) {
      console.error("Error generating signed URL:", error);
      return { signedUrl: null, error: error.message };
    }

    return { signedUrl: data.signedUrl };
  } catch (err) {
    console.error("Unexpected error in getSignedDocumentUrl:", err);
    return { signedUrl: null, error: "Failed to generate download link." };
  }
}

export async function deleteTenderDocument(
  documentId: string,
  filePath: string,
): Promise<{
  success: boolean;
  error?: string;
}> {
  if (!isSupabaseConfigured) {
    return { success: false, error: "Supabase is not configured." };
  }

  try {
    // 1. Remove from Storage
    const { error: storageError } = await supabase.storage
      .from("tender-documents")
      .remove([filePath]);

    if (storageError) {
      console.warn("Could not delete file from storage (might already be removed):", storageError);
    }

    // 2. Remove from database
    const { error: dbError } = await supabase
      .from("tender_documents")
      .delete()
      .eq("id", documentId);

    if (dbError) {
      console.error("Error deleting document record:", dbError);
      return { success: false, error: dbError.message };
    }

    return { success: true };
  } catch (err) {
    console.error("Unexpected error deleting document:", err);
    return { success: false, error: "Failed to delete document." };
  }
}

// ==============================================================================
// 3. Status History & Activity Logs
// ==============================================================================

export async function getTenderStatusHistory(tenderId: string): Promise<{
  history: StatusChange[];
  error?: string;
}> {
  if (!isSupabaseConfigured) {
    return { history: [] };
  }

  try {
    const { data, error } = await supabase
      .from("tender_status_history")
      .select("*, profiles:changed_by(name, email)")
      .eq("tender_id", tenderId)
      .order("created_at", { ascending: false });

    if (error) {
      console.error("Error fetching status history:", error);
      return { history: [], error: error.message };
    }

    const history = (data || []).map((row) => fromDbStatusHistory(row as TenderStatusHistoryDbRow));
    return { history };
  } catch (err) {
    console.error("Unexpected error in getTenderStatusHistory:", err);
    return { history: [], error: "Failed to load status history." };
  }
}

export async function getTenderActivityLogs(
  tenderId?: string,
  limit = 50,
): Promise<{
  activity: ActivityEntry[];
  error?: string;
}> {
  if (!isSupabaseConfigured) {
    return { activity: [] };
  }

  try {
    let query = supabase
      .from("tender_activity_logs")
      .select("*, profiles:user_id(name, email)")
      .order("created_at", { ascending: false })
      .limit(limit);

    if (tenderId) {
      query = query.eq("tender_id", tenderId);
    }

    const { data, error } = await query;

    if (error) {
      console.error("Error fetching activity logs:", error);
      return { activity: [], error: error.message };
    }

    const activity = (data || []).map((row) => fromDbActivityLog(row as TenderActivityLogDbRow));
    return { activity };
  } catch (err) {
    console.error("Unexpected error in getTenderActivityLogs:", err);
    return { activity: [], error: "Failed to load activity logs." };
  }
}

// ==============================================================================
// 4. Dashboard & Super Admin Reports
// ==============================================================================

export async function getTenderStats(): Promise<{
  stats: TenderStatsResult;
  error?: string;
}> {
  const defaultStats: TenderStatsResult = {
    totalCount: 0,
    submittedCount: 0,
    inProgressCount: 0,
    completedCount: 0,
    draftCount: 0,
    cancelledCount: 0,
    upcomingCount: 0,
    statusDistribution: [
      { status: "Draft", count: 0 },
      { status: "Submitted", count: 0 },
      { status: "In Progress", count: 0 },
      { status: "Completed", count: 0 },
      { status: "Cancelled", count: 0 },
    ],
    upcomingTenders: [],
    recentTenders: [],
  };

  if (!isSupabaseConfigured) {
    return { stats: defaultStats };
  }

  try {
    const { data, error } = await supabase
      .from("tenders")
      .select("*")
      .eq("is_deleted", false)
      .order("updated_at", { ascending: false });

    if (error) {
      console.error("Error fetching tender stats:", error);
      return { stats: defaultStats, error: error.message };
    }

    const rows = (data || []) as TenderDbRow[];
    const allTenders = rows.map(fromDbTender);

    const todayStr = new Date().toISOString().split("T")[0];

    let draftCount = 0;
    let submittedCount = 0;
    let inProgressCount = 0;
    let completedCount = 0;
    let cancelledCount = 0;

    allTenders.forEach((t) => {
      const s = String(t.status).toLowerCase();
      if (s === "draft") draftCount++;
      else if (s === "submitted") submittedCount++;
      else if (s === "in_progress" || s === "in progress") inProgressCount++;
      else if (s === "completed") completedCount++;
      else if (s === "cancelled") cancelledCount++;
    });

    const upcomingTenders = allTenders
      .filter((t) => t.submissionDeadline >= todayStr)
      .sort((a, b) => a.submissionDeadline.localeCompare(b.submissionDeadline));

    const recentTenders = allTenders.slice(0, 5);

    const stats: TenderStatsResult = {
      totalCount: allTenders.length,
      submittedCount,
      inProgressCount,
      completedCount,
      draftCount,
      cancelledCount,
      upcomingCount: upcomingTenders.length,
      statusDistribution: [
        { status: "Draft", count: draftCount },
        { status: "Submitted", count: submittedCount },
        { status: "In Progress", count: inProgressCount },
        { status: "Completed", count: completedCount },
        { status: "Cancelled", count: cancelledCount },
      ],
      upcomingTenders,
      recentTenders,
    };

    return { stats };
  } catch (err) {
    console.error("Unexpected error in getTenderStats:", err);
    return { stats: defaultStats, error: "Failed to calculate stats." };
  }
}

export async function getReportMetrics(params: { from?: string; to?: string }): Promise<{
  report: ReportMetricsResult | null;
  error?: string;
}> {
  if (!isSupabaseConfigured) {
    return { report: null, error: "Supabase is not configured." };
  }

  try {
    let query = supabase
      .from("tenders")
      .select("*")
      .eq("is_deleted", false)
      .order("created_at", { ascending: false });

    // Consistent date filtering on created_at / published_date / submission_deadline
    if (params.from) {
      query = query.gte("created_at", `${params.from}T00:00:00.000Z`);
    }
    if (params.to) {
      query = query.lte("created_at", `${params.to}T23:59:59.999Z`);
    }

    const { data, error } = await query;

    if (error) {
      console.error("Error fetching report data:", error);
      return { report: null, error: error.message };
    }

    const rows = (data || []) as TenderDbRow[];
    const tenders = rows.map(fromDbTender);

    // 1. Status Summary
    const statusMap: Record<string, number> = {
      Draft: 0,
      Submitted: 0,
      "In Progress": 0,
      Completed: 0,
      Cancelled: 0,
    };

    // 2. Source Summary
    const sourceMap: Record<string, number> = {
      GeM: 0,
      UNGM: 0,
      Other: 0,
    };

    // 3. Financials (INR denominated / all)
    let totalEstimatedValue = 0;
    let totalEmd = 0;
    let valuedCount = 0;

    // 4. Monthly counts across last 6 months
    const monthNames = [
      "Jan",
      "Feb",
      "Mar",
      "Apr",
      "May",
      "Jun",
      "Jul",
      "Aug",
      "Sep",
      "Oct",
      "Nov",
      "Dec",
    ];
    const now = new Date();
    const last6Months: { month: string; monthKey: string; count: number }[] = [];

    for (let i = 5; i >= 0; i--) {
      const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
      const mKey = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
      const mName = monthNames[d.getMonth()];
      last6Months.push({ month: mName, monthKey: mKey, count: 0 });
    }

    tenders.forEach((tender) => {
      // Status
      const st = tender.status?.toLowerCase();
      if (st === "draft") statusMap["Draft"]++;
      else if (st === "submitted") statusMap["Submitted"]++;
      else if (st === "in_progress" || st === "in progress") statusMap["In Progress"]++;
      else if (st === "completed") statusMap["Completed"]++;
      else if (st === "cancelled") statusMap["Cancelled"]++;

      // Source
      if (tender.source === "GeM") sourceMap["GeM"]++;
      else if (tender.source === "UNGM") sourceMap["UNGM"]++;
      else sourceMap["Other"]++;

      // Financials
      if (tender.estimatedValue && tender.estimatedValue > 0) {
        totalEstimatedValue += tender.estimatedValue;
        valuedCount++;
      }
      if (tender.emdAmount && tender.emdAmount > 0) {
        totalEmd += tender.emdAmount;
      }

      // Monthly volume by creation date
      const cDate = tender.createdAt ? tender.createdAt.slice(0, 7) : "";
      const matchedMonth = last6Months.find((m) => m.monthKey === cDate);
      if (matchedMonth) {
        matchedMonth.count++;
      }
    });

    const statusSummary = Object.entries(statusMap).map(([status, count]) => ({ status, count }));
    const sourceSummary = Object.entries(sourceMap).map(([source, count]) => ({ source, count }));

    const report: ReportMetricsResult = {
      tenders,
      totalTenders: tenders.length,
      statusSummary,
      sourceSummary,
      monthlyVolume: last6Months,
      financials: {
        totalEstimatedValue,
        avgEstimatedValue: valuedCount > 0 ? totalEstimatedValue / valuedCount : 0,
        totalEmd,
        avgEmd: valuedCount > 0 ? totalEmd / valuedCount : 0,
        currency: "INR",
        tenderCount: tenders.length,
      },
    };

    return { report };
  } catch (err) {
    console.error("Unexpected error generating report:", err);
    return { report: null, error: "Failed to compute report metrics." };
  }
}
