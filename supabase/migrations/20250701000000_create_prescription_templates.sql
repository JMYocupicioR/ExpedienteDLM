CREATE TABLE "public"."prescription_templates" (
    "id" uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    "user_id" uuid NOT NULL REFERENCES "auth"."users"("id") ON DELETE CASCADE UNIQUE,
    "style_definition" jsonb NOT NULL,
    "created_at" timestamp with time zone DEFAULT now() NOT NULL,
    "updated_at" timestamp with time zone DEFAULT now() NOT NULL
);

ALTER TABLE "public"."prescription_templates" ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Allow users to manage their own templates"
ON "public"."prescription_templates"
FOR ALL
USING (auth.uid() = user_id)
WITH CHECK (auth.uid() = user_id);

-- Function to update updated_at timestamp
CREATE OR REPLACE FUNCTION public.handle_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger to update updated_at on row update
CREATE TRIGGER on_prescription_templates_updated
BEFORE UPDATE ON public.prescription_templates
FOR EACH ROW
EXECUTE FUNCTION public.handle_updated_at(); 