-- Create user_plans table for managing subscription tiers
CREATE TABLE IF NOT EXISTS user_plans (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    plan_type VARCHAR NOT NULL DEFAULT 'free',  -- 'free' or 'premium'
    subject_limit INTEGER NOT NULL DEFAULT 3,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT unique_user_plan UNIQUE (user_id)
);

-- Create index for faster queries
CREATE INDEX IF NOT EXISTS idx_user_plans_user_id ON user_plans(user_id);

-- Set up RLS (Row Level Security)
ALTER TABLE user_plans ENABLE ROW LEVEL SECURITY;

-- Create policies for access control
CREATE POLICY "Users can view their own plan"
    ON user_plans FOR SELECT
    USING (auth.uid() = user_id);

CREATE POLICY "Admin can manage all plans"
    ON user_plans FOR ALL
    USING (auth.jwt() ? auth.jwt()->>'role' = 'admin' : false);

-- Create a trigger to update the updated_at timestamp
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER update_user_plans_updated_at
    BEFORE UPDATE ON user_plans
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

-- Add default user plans for existing users
INSERT INTO user_plans (user_id, plan_type, subject_limit)
SELECT id, 'free', 3
FROM auth.users
WHERE NOT EXISTS (
    SELECT 1 FROM user_plans WHERE user_plans.user_id = auth.users.id
); 