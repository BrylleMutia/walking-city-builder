-- Defense in depth: a message row is only visible on its own topic, not just
-- when the joined topic is the player's.
alter policy "Players receive their own updates"
  on realtime.messages
  using (
    realtime.messages.extension = 'broadcast'
    and realtime.messages.topic = (select realtime.topic())
    and (select realtime.topic()) = 'player:' || (select auth.uid())::text
  );
