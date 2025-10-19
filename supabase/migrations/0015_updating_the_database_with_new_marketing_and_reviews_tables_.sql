-- Module 8: Marketing Automation
DROP TABLE IF EXISTS public.marketing_campaigns CASCADE;
CREATE TABLE public.marketing_campaigns (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
    name TEXT NOT NULL,
    status TEXT NOT NULL DEFAULT 'Draft', -- e.g., Draft, Sent
    sent_date DATE,
    open_rate NUMERIC(5, 2),
    click_rate NUMERIC(5, 2),
    created_at TIMESTAMPTZ DEFAULT NOW()
);
ALTER TABLE public.marketing_campaigns ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users can manage their own marketing campaigns" ON public.marketing_campaigns FOR ALL TO authenticated USING (auth.uid() = user_id);

DROP TABLE IF EXISTS public.reviews CASCADE;
CREATE TABLE public.reviews (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
    customer_name TEXT,
    source TEXT NOT NULL, -- e.g., Google, Yelp
    rating NUMERIC(2, 1) NOT NULL,
    review_text TEXT,
    review_date DATE NOT NULL,
    sentiment TEXT, -- Positive, Neutral, Negative
    created_at TIMESTAMPTZ DEFAULT NOW()
);
ALTER TABLE public.reviews ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users can manage their own reviews" ON public.reviews FOR ALL TO authenticated USING (auth.uid() = user_id);