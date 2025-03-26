-- Function to enforce lecture limit for free plan users
CREATE OR REPLACE FUNCTION enforce_lecture_limit()
RETURNS TRIGGER AS $$
DECLARE
  user_plan_type TEXT;
  lecture_count INTEGER;
  max_free_lectures INTEGER := 5;
BEGIN
  -- Check the user's plan type
  SELECT plan_type INTO user_plan_type 
  FROM user_plans 
  WHERE user_id = (
    SELECT user_id 
    FROM subjects 
    WHERE id = NEW.subject_id
  );
  
  -- If user is on premium plan, allow the insert
  IF user_plan_type = 'premium' THEN
    RETURN NEW;
  END IF;
  
  -- Count existing lectures in this subject
  SELECT COUNT(*) INTO lecture_count 
  FROM lectures 
  WHERE subject_id = NEW.subject_id;
  
  -- If user is on free plan or has no plan, enforce the limit
  IF (user_plan_type = 'free' OR user_plan_type IS NULL) AND lecture_count >= max_free_lectures THEN
    RAISE EXCEPTION 'Free plan users can create up to % lectures per subject', max_free_lectures;
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create or replace trigger
DROP TRIGGER IF EXISTS check_lecture_limit ON lectures;
CREATE TRIGGER check_lecture_limit
BEFORE INSERT ON lectures
FOR EACH ROW
EXECUTE FUNCTION enforce_lecture_limit();

-- Add comment to explain the trigger
COMMENT ON TRIGGER check_lecture_limit ON lectures IS 'Enforces a limit of 5 lectures per subject for free plan users'; 