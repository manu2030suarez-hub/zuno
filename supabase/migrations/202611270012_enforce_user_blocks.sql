-- ZUNO security enforcement for blocks and reports
CREATE OR REPLACE FUNCTION public.zuno_is_blocked_between(p_user_a uuid, p_user_b uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = ''
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.user_blocks b
    WHERE (b.blocker_id = p_user_a AND b.blocked_id = p_user_b)
       OR (b.blocker_id = p_user_b AND b.blocked_id = p_user_a)
  );
$$;

REVOKE ALL ON FUNCTION public.zuno_is_blocked_between(uuid, uuid) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.zuno_is_blocked_between(uuid, uuid) TO authenticated;

-- A block immediately hides the profile in discovery and prevents further chat activity.
DROP POLICY IF EXISTS "Authenticated users can discover public profiles" ON public.profiles;
CREATE POLICY "Authenticated users can discover public profiles"
ON public.profiles FOR SELECT TO authenticated
USING (
  auth.uid() = id
  OR NOT public.zuno_is_blocked_between(auth.uid(), id)
);

DROP POLICY IF EXISTS "Members can view their conversations" ON public.conversations;
CREATE POLICY "Members can view their conversations"
ON public.conversations FOR SELECT TO authenticated
USING (
  (auth.uid() = member_one OR auth.uid() = member_two)
  AND NOT public.zuno_is_blocked_between(member_one, member_two)
);

DROP POLICY IF EXISTS "Members can start conversations" ON public.conversations;
CREATE POLICY "Members can start conversations"
ON public.conversations FOR INSERT TO authenticated
WITH CHECK (
  (auth.uid() = member_one OR auth.uid() = member_two)
  AND member_one < member_two
  AND NOT public.zuno_is_blocked_between(member_one, member_two)
);

DROP POLICY IF EXISTS "Members can view messages in their conversations" ON public.messages;
CREATE POLICY "Members can view messages in their conversations"
ON public.messages FOR SELECT TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM public.conversations c
    WHERE c.id = conversation_id
      AND auth.uid() IN (c.member_one, c.member_two)
      AND NOT public.zuno_is_blocked_between(c.member_one, c.member_two)
  )
);

DROP POLICY IF EXISTS "Members can send messages in their conversations" ON public.messages;
CREATE POLICY "Members can send messages in their conversations"
ON public.messages FOR INSERT TO authenticated
WITH CHECK (
  sender_id = auth.uid()
  AND EXISTS (
    SELECT 1 FROM public.conversations c
    WHERE c.id = conversation_id
      AND auth.uid() IN (c.member_one, c.member_two)
      AND NOT public.zuno_is_blocked_between(c.member_one, c.member_two)
  )
);

DROP POLICY IF EXISTS "Members can view their connection requests" ON public.connection_requests;
CREATE POLICY "Members can view their connection requests"
ON public.connection_requests FOR SELECT TO authenticated
USING (
  (auth.uid() = sender_id OR auth.uid() = receiver_id)
  AND NOT public.zuno_is_blocked_between(sender_id, receiver_id)
);

DROP POLICY IF EXISTS "Members can send connection requests" ON public.connection_requests;
CREATE POLICY "Members can send connection requests"
ON public.connection_requests FOR INSERT TO authenticated
WITH CHECK (
  auth.uid() = sender_id
  AND status = 'pending'
  AND NOT public.zuno_is_blocked_between(sender_id, receiver_id)
);

DROP POLICY IF EXISTS "Recipients can respond to connection requests" ON public.connection_requests;
CREATE POLICY "Recipients can respond to connection requests"
ON public.connection_requests FOR UPDATE TO authenticated
USING (
  auth.uid() = receiver_id
  AND status = 'pending'
  AND NOT public.zuno_is_blocked_between(sender_id, receiver_id)
)
WITH CHECK (
  auth.uid() = receiver_id
  AND status IN ('accepted', 'rejected')
  AND NOT public.zuno_is_blocked_between(sender_id, receiver_id)
);

-- Allow a blocker to retrieve the profile card for their own blocked list,
-- without making it appear in public discovery.
DROP POLICY IF EXISTS "Users can view profiles they have blocked" ON public.profiles;
CREATE POLICY "Users can view profiles they have blocked"
ON public.profiles FOR SELECT TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM public.user_blocks b
    WHERE b.blocker_id = auth.uid() AND b.blocked_id = profiles.id
  )
);
