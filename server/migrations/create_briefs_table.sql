    -- Create briefs table
    CREATE TABLE IF NOT EXISTS briefs (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        lecture_id VARCHAR NOT NULL,
        user_id VARCHAR NOT NULL,
        total_pages INTEGER NOT NULL,
        created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
        current_page INTEGER DEFAULT 1,
        summaries JSONB NOT NULL,  -- Store array of page summaries
        metadata JSONB,  -- For any additional metadata
        CONSTRAINT unique_lecture_brief UNIQUE (lecture_id)
    );

    -- Create indexes for faster queries
    CREATE INDEX IF NOT EXISTS idx_briefs_lecture_id ON briefs(lecture_id);
    CREATE INDEX IF NOT EXISTS idx_briefs_user_id ON briefs(user_id);

    -- Set up RLS
    ALTER TABLE briefs ENABLE ROW LEVEL SECURITY;

    -- Create policies
    CREATE POLICY "Users can view their own briefs"
        ON briefs FOR SELECT
        USING (auth.uid() = user_id);

    CREATE POLICY "Users can insert their own briefs"
        ON briefs FOR INSERT
        WITH CHECK (auth.uid() = user_id);

    CREATE POLICY "Users can update their own briefs"
        ON briefs FOR UPDATE
        USING (auth.uid() = user_id)
        WITH CHECK (auth.uid() = user_id);

    CREATE POLICY "Users can delete their own briefs"
        ON briefs FOR DELETE
        USING (auth.uid() = user_id);
