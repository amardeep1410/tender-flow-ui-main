-- ==============================================================================
-- Tender Management System - Credit 3: Tenders Table, Indexes & RLS Migration
-- Safe to execute in Supabase SQL Editor
-- ==============================================================================

-- 1. Create tenders table
CREATE TABLE IF NOT EXISTS public.tenders (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tender_number TEXT NOT NULL,
    title TEXT NOT NULL,
    description TEXT,
    source TEXT NOT NULL CHECK (source IN ('GeM', 'UNGM', 'Other')),
    category TEXT,
    organization TEXT,
    department TEXT,
    product_service TEXT,
    portal_url TEXT,
    estimated_value NUMERIC(15,2),
    currency TEXT NOT NULL DEFAULT 'INR',
    emd_amount NUMERIC(15,2),
    tender_fee NUMERIC(15,2),
    
    -- Dates
    published_date DATE,
    submission_start_date DATE,
    submission_deadline DATE NOT NULL,
    pre_bid_date DATE,
    expected_result_date DATE,
    expected_completion_date DATE,

    -- Status
    status TEXT NOT NULL DEFAULT 'Draft' CHECK (status IN ('Draft', 'Submitted', 'In Progress', 'Completed', 'Cancelled', 'draft', 'submitted', 'in_progress', 'completed', 'cancelled')),

    -- Audit & ownership
    created_by UUID NOT NULL REFERENCES public.profiles(id),
    updated_by UUID REFERENCES public.profiles(id),
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),

    -- Soft delete
    is_deleted BOOLEAN NOT NULL DEFAULT FALSE
);

-- 2. Indexes for fast query and filtering
CREATE INDEX IF NOT EXISTS idx_tenders_tender_number ON public.tenders(tender_number);
CREATE INDEX IF NOT EXISTS idx_tenders_status ON public.tenders(status);
CREATE INDEX IF NOT EXISTS idx_tenders_source ON public.tenders(source);
CREATE INDEX IF NOT EXISTS idx_tenders_category ON public.tenders(category);
CREATE INDEX IF NOT EXISTS idx_tenders_submission_deadline ON public.tenders(submission_deadline);
CREATE INDEX IF NOT EXISTS idx_tenders_created_by ON public.tenders(created_by);
CREATE INDEX IF NOT EXISTS idx_tenders_created_at ON public.tenders(created_at);
CREATE INDEX IF NOT EXISTS idx_tenders_is_deleted ON public.tenders(is_deleted);
CREATE INDEX IF NOT EXISTS idx_tenders_active_deadline ON public.tenders(is_deleted, submission_deadline);

-- Partial unique index for active tender numbers (prevent active duplicates)
CREATE UNIQUE INDEX IF NOT EXISTS idx_tenders_unique_active_number 
    ON public.tenders(tender_number) 
    WHERE is_deleted = FALSE;

-- 3. Trigger for automatic updated_at maintenance
CREATE OR REPLACE FUNCTION public.handle_tender_updated_at()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS set_tenders_updated_at ON public.tenders;
CREATE TRIGGER set_tenders_updated_at
    BEFORE UPDATE ON public.tenders
    FOR EACH ROW
    EXECUTE FUNCTION public.handle_tender_updated_at();

-- 4. Enable Row Level Security (RLS)
ALTER TABLE public.tenders ENABLE ROW LEVEL SECURITY;

-- 5. RLS Policies
-- SELECT: Authenticated users can view active (non-deleted) tenders
DROP POLICY IF EXISTS "Authenticated users can view active tenders" ON public.tenders;
CREATE POLICY "Authenticated users can view active tenders"
    ON public.tenders
    FOR SELECT
    TO authenticated
    USING (is_deleted = FALSE);

-- INSERT: Authenticated users can create tenders where created_by is their own ID
DROP POLICY IF EXISTS "Authenticated users can create tenders" ON public.tenders;
CREATE POLICY "Authenticated users can create tenders"
    ON public.tenders
    FOR INSERT
    TO authenticated
    WITH CHECK (auth.uid() = created_by);

-- UPDATE: Authenticated users can update active tenders
DROP POLICY IF EXISTS "Authenticated users can update active tenders" ON public.tenders;
CREATE POLICY "Authenticated users can update active tenders"
    ON public.tenders
    FOR UPDATE
    TO authenticated
    USING (is_deleted = FALSE)
    WITH CHECK (auth.uid() IS NOT NULL);

-- Hard DELETE: Disallow hard DELETE from client (soft-deletes use UPDATE is_deleted = true)
DROP POLICY IF EXISTS "Disallow client hard delete" ON public.tenders;
