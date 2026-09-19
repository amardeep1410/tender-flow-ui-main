-- ==============================================================================
-- Tender Management System - Credit 4: Documents, Status History & Activity Logs
-- Safe to execute in Supabase SQL Editor
-- ==============================================================================

-- 1. Create tender_documents table
CREATE TABLE IF NOT EXISTS public.tender_documents (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tender_id UUID NOT NULL REFERENCES public.tenders(id) ON DELETE CASCADE,
    file_name TEXT NOT NULL,
    file_path TEXT NOT NULL,
    file_type TEXT,
    file_size BIGINT,
    uploaded_by UUID NOT NULL REFERENCES public.profiles(id),
    created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- 2. Create tender_status_history table
CREATE TABLE IF NOT EXISTS public.tender_status_history (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tender_id UUID NOT NULL REFERENCES public.tenders(id) ON DELETE CASCADE,
    old_status TEXT,
    new_status TEXT NOT NULL,
    changed_by UUID NOT NULL REFERENCES public.profiles(id),
    remarks TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- 3. Create tender_activity_logs table
CREATE TABLE IF NOT EXISTS public.tender_activity_logs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tender_id UUID REFERENCES public.tenders(id) ON DELETE CASCADE,
    user_id UUID NOT NULL REFERENCES public.profiles(id),
    action TEXT NOT NULL CHECK (action IN ('CREATE', 'UPDATE', 'DELETE', 'STATUS_CHANGE', 'DOCUMENT_UPLOAD', 'DOCUMENT_DELETE')),
    description TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- 4. Create indexes for high-performance lookups
CREATE INDEX IF NOT EXISTS idx_tender_documents_tender_id ON public.tender_documents(tender_id);
CREATE INDEX IF NOT EXISTS idx_tender_status_history_tender_id ON public.tender_status_history(tender_id);
CREATE INDEX IF NOT EXISTS idx_tender_activity_logs_tender_id ON public.tender_activity_logs(tender_id);
CREATE INDEX IF NOT EXISTS idx_tender_activity_logs_created_at ON public.tender_activity_logs(created_at DESC);

-- 5. Setup private Storage Bucket for tender documents
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
    'tender-documents',
    'tender-documents',
    false,
    26214400, -- 25MB limit
    ARRAY[
        'application/pdf',
        'application/msword',
        'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
        'application/vnd.ms-excel',
        'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
        'application/vnd.ms-powerpoint',
        'application/vnd.openxmlformats-officedocument.presentationml.presentation',
        'image/jpeg',
        'image/png',
        'image/webp'
    ]
)
ON CONFLICT (id) DO UPDATE SET
    public = false,
    file_size_limit = 26214400;

-- 6. Trigger Function: Automatic Status History
CREATE OR REPLACE FUNCTION public.handle_tender_status_history()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
    IF (TG_OP = 'INSERT') THEN
        INSERT INTO public.tender_status_history (
            tender_id,
            old_status,
            new_status,
            changed_by,
            remarks
        )
        VALUES (
            NEW.id,
            NULL,
            NEW.status,
            NEW.created_by,
            'Initial status upon creation'
        );
        RETURN NEW;
    ELSIF (TG_OP = 'UPDATE') THEN
        IF (OLD.status IS DISTINCT FROM NEW.status) THEN
            INSERT INTO public.tender_status_history (
                tender_id,
                old_status,
                new_status,
                changed_by,
                remarks
            )
            VALUES (
                NEW.id,
                OLD.status,
                NEW.status,
                COALESCE(NEW.updated_by, auth.uid(), NEW.created_by),
                NULL
            );
        END IF;
        RETURN NEW;
    END IF;
    RETURN NULL;
END;
$$;

DROP TRIGGER IF EXISTS trg_tender_status_history ON public.tenders;
CREATE TRIGGER trg_tender_status_history
    AFTER INSERT OR UPDATE OF status ON public.tenders
    FOR EACH ROW
    EXECUTE FUNCTION public.handle_tender_status_history();

-- 7. Trigger Function: Automatic Tender Activity Logging
CREATE OR REPLACE FUNCTION public.handle_tender_activity()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    v_user UUID;
BEGIN
    IF (TG_OP = 'INSERT') THEN
        INSERT INTO public.tender_activity_logs (
            tender_id,
            user_id,
            action,
            description
        )
        VALUES (
            NEW.id,
            NEW.created_by,
            'CREATE',
            'Tender "' || NEW.title || '" (' || NEW.tender_number || ') created with status ' || NEW.status
        );
        RETURN NEW;
    ELSIF (TG_OP = 'UPDATE') THEN
        v_user := COALESCE(NEW.updated_by, auth.uid(), NEW.created_by);
        
        -- Soft deletion activity
        IF (OLD.is_deleted = false AND NEW.is_deleted = true) THEN
            INSERT INTO public.tender_activity_logs (
                tender_id,
                user_id,
                action,
                description
            )
            VALUES (
                NEW.id,
                v_user,
                'DELETE',
                'Tender "' || NEW.tender_number || '" was soft-deleted'
            );
        -- Status change activity
        ELSIF (OLD.status IS DISTINCT FROM NEW.status) THEN
            INSERT INTO public.tender_activity_logs (
                tender_id,
                user_id,
                action,
                description
            )
            VALUES (
                NEW.id,
                v_user,
                'STATUS_CHANGE',
                'Status changed from "' || OLD.status || '" to "' || NEW.status || '"'
            );
        -- General details update
        ELSE
            INSERT INTO public.tender_activity_logs (
                tender_id,
                user_id,
                action,
                description
            )
            VALUES (
                NEW.id,
                v_user,
                'UPDATE',
                'Tender "' || NEW.tender_number || '" details updated'
            );
        END IF;
        RETURN NEW;
    END IF;
    RETURN NULL;
END;
$$;

DROP TRIGGER IF EXISTS trg_tender_activity ON public.tenders;
CREATE TRIGGER trg_tender_activity
    AFTER INSERT OR UPDATE ON public.tenders
    FOR EACH ROW
    EXECUTE FUNCTION public.handle_tender_activity();

-- 8. Trigger Function: Document Activity Logging
CREATE OR REPLACE FUNCTION public.handle_document_activity()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
    IF (TG_OP = 'INSERT') THEN
        INSERT INTO public.tender_activity_logs (
            tender_id,
            user_id,
            action,
            description
        )
        VALUES (
            NEW.tender_id,
            NEW.uploaded_by,
            'DOCUMENT_UPLOAD',
            'Uploaded document "' || NEW.file_name || '"'
        );
        RETURN NEW;
    ELSIF (TG_OP = 'DELETE') THEN
        INSERT INTO public.tender_activity_logs (
            tender_id,
            user_id,
            action,
            description
        )
        VALUES (
            OLD.tender_id,
            COALESCE(auth.uid(), OLD.uploaded_by),
            'DOCUMENT_DELETE',
            'Deleted document "' || OLD.file_name || '"'
        );
        RETURN OLD;
    END IF;
    RETURN NULL;
END;
$$;

DROP TRIGGER IF EXISTS trg_document_activity ON public.tender_documents;
CREATE TRIGGER trg_document_activity
    AFTER INSERT OR DELETE ON public.tender_documents
    FOR EACH ROW
    EXECUTE FUNCTION public.handle_document_activity();

-- 9. Enable Row Level Security
ALTER TABLE public.tender_documents ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.tender_status_history ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.tender_activity_logs ENABLE ROW LEVEL SECURITY;

-- 10. RLS Policies: tender_documents
DROP POLICY IF EXISTS "Users can view accessible tender documents" ON public.tender_documents;
CREATE POLICY "Users can view accessible tender documents"
    ON public.tender_documents
    FOR SELECT
    TO authenticated
    USING (
        EXISTS (
            SELECT 1 FROM public.tenders t
            WHERE t.id = tender_documents.tender_id
            AND t.is_deleted = false
        )
    );

DROP POLICY IF EXISTS "Users can insert own tender documents" ON public.tender_documents;
CREATE POLICY "Users can insert own tender documents"
    ON public.tender_documents
    FOR INSERT
    TO authenticated
    WITH CHECK (auth.uid() = uploaded_by);

DROP POLICY IF EXISTS "Users can delete tender documents for active tenders" ON public.tender_documents;
CREATE POLICY "Users can delete tender documents for active tenders"
    ON public.tender_documents
    FOR DELETE
    TO authenticated
    USING (
        EXISTS (
            SELECT 1 FROM public.tenders t
            WHERE t.id = tender_documents.tender_id
            AND t.is_deleted = false
        )
    );

-- 11. RLS Policies: tender_status_history (Read-only from client)
DROP POLICY IF EXISTS "Users can view accessible tender status history" ON public.tender_status_history;
CREATE POLICY "Users can view accessible tender status history"
    ON public.tender_status_history
    FOR SELECT
    TO authenticated
    USING (
        EXISTS (
            SELECT 1 FROM public.tenders t
            WHERE t.id = tender_status_history.tender_id
            AND t.is_deleted = false
        )
    );

-- 12. RLS Policies: tender_activity_logs (Read-only from client)
DROP POLICY IF EXISTS "Users can view accessible tender activity logs" ON public.tender_activity_logs;
CREATE POLICY "Users can view accessible tender activity logs"
    ON public.tender_activity_logs
    FOR SELECT
    TO authenticated
    USING (
        tender_id IS NULL OR EXISTS (
            SELECT 1 FROM public.tenders t
            WHERE t.id = tender_activity_logs.tender_id
            AND t.is_deleted = false
        )
    );

-- 13. Storage Policies for 'tender-documents' bucket
DROP POLICY IF EXISTS "Authenticated users can upload tender documents" ON storage.objects;
CREATE POLICY "Authenticated users can upload tender documents"
    ON storage.objects
    FOR INSERT
    TO authenticated
    WITH CHECK (bucket_id = 'tender-documents');

DROP POLICY IF EXISTS "Authenticated users can read tender documents" ON storage.objects;
CREATE POLICY "Authenticated users can read tender documents"
    ON storage.objects
    FOR SELECT
    TO authenticated
    USING (bucket_id = 'tender-documents');

DROP POLICY IF EXISTS "Authenticated users can delete tender documents" ON storage.objects;
CREATE POLICY "Authenticated users can delete tender documents"
    ON storage.objects
    FOR DELETE
    TO authenticated
    USING (bucket_id = 'tender-documents');
