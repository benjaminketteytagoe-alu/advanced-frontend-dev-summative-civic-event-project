-- Sample data, so the app is not empty on a new database.
-- Run it after 001_create_tables.sql. Running it again adds nothing,
-- because every id is fixed and ON CONFLICT DO NOTHING skips rows that exist.
-- Dates count from today, so there are always past and future events.

BEGIN;

-- Sample residents. 'no login' is not a real password hash, so nobody can log in as them
INSERT INTO users (id, full_name, email, password_hash) VALUES
('10000000-0000-4000-8000-000000000001', 'Ama Mensah', 'ama@example.com', 'no login'),
('10000000-0000-4000-8000-000000000002', 'Kofi Boateng', 'kofi@example.com', 'no login'),
('10000000-0000-4000-8000-000000000003', 'Grace Uwase', 'grace@example.com', 'no login')
ON CONFLICT DO NOTHING;

-- Three coming up, one finished, and one draft that only admins see
INSERT INTO events (id, title, description, location, starts_at, ends_at, published) VALUES
('20000000-0000-4000-8000-000000000001', 'Community Clean Up', 'Help us clean the market and the streets around it. Gloves and bags are provided.', 'Central Market', date_trunc('day', NOW()) + INTERVAL '7 days 8 hours', date_trunc('day', NOW()) + INTERVAL '7 days 12 hours', true),
('20000000-0000-4000-8000-000000000002', 'Town Hall Meeting', 'Meet your local leaders and ask about roads, water and street lights.', 'City Hall', date_trunc('day', NOW()) + INTERVAL '14 days 17 hours', date_trunc('day', NOW()) + INTERVAL '14 days 19 hours', true),
('20000000-0000-4000-8000-000000000003', 'Free Health Check', 'Blood pressure and eye checks for everyone, at no cost.', 'Community Clinic', date_trunc('day', NOW()) + INTERVAL '21 days 9 hours', date_trunc('day', NOW()) + INTERVAL '21 days 15 hours', true),
('20000000-0000-4000-8000-000000000004', 'Tree Planting Day', 'We planted trees along the river path.', 'River Park', date_trunc('day', NOW()) - INTERVAL '10 days' + INTERVAL '9 hours', date_trunc('day', NOW()) - INTERVAL '10 days' + INTERVAL '13 hours', true),
('20000000-0000-4000-8000-000000000005', 'Youth Football Cup', 'Still being planned.', 'City Stadium', date_trunc('day', NOW()) + INTERVAL '40 days 10 hours', date_trunc('day', NOW()) + INTERVAL '40 days 16 hours', false)
ON CONFLICT DO NOTHING;

-- The sound is a free (CC0) sample from MDN, not a real announcement
INSERT INTO announcements (id, title, audio_url, published) VALUES
('30000000-0000-4000-8000-000000000001', 'Sample: Water Supply Notice', 'https://interactive-examples.mdn.mozilla.net/media/cc0-audio/t-rex-roar.mp3', true),
('30000000-0000-4000-8000-000000000002', 'Sample: Road Works Draft', 'https://interactive-examples.mdn.mozilla.net/media/cc0-audio/t-rex-roar.mp3', false)
ON CONFLICT DO NOTHING;

-- Big Buck Bunny is an open film by the Blender Foundation
INSERT INTO promos (id, title, description, video_url, caption_text, published) VALUES
('40000000-0000-4000-8000-000000000001', 'Sample: Outdoor Film Night', 'A sample video promo using an open film.', 'https://www.youtube.com/watch?v=aqz-KE-bpKQ', 'Join us for a free outdoor film night. Bring a chair and a friend.', true)
ON CONFLICT DO NOTHING;

-- One person cancelled
INSERT INTO event_registrations (id, user_id, event_id, status) VALUES
('50000000-0000-4000-8000-000000000001', '10000000-0000-4000-8000-000000000001', '20000000-0000-4000-8000-000000000001', 'registered'),
('50000000-0000-4000-8000-000000000002', '10000000-0000-4000-8000-000000000002', '20000000-0000-4000-8000-000000000001', 'registered'),
('50000000-0000-4000-8000-000000000003', '10000000-0000-4000-8000-000000000003', '20000000-0000-4000-8000-000000000002', 'cancelled'),
('50000000-0000-4000-8000-000000000004', '10000000-0000-4000-8000-000000000001', '20000000-0000-4000-8000-000000000004', 'registered')
ON CONFLICT DO NOTHING;

INSERT INTO event_feedback (id, user_id, event_id, rating, comment) VALUES
('60000000-0000-4000-8000-000000000001', '10000000-0000-4000-8000-000000000001', '20000000-0000-4000-8000-000000000004', 5, 'Well organised and fun.'),
('60000000-0000-4000-8000-000000000002', '10000000-0000-4000-8000-000000000002', '20000000-0000-4000-8000-000000000004', 4, 'Great, but we needed more water.')
ON CONFLICT DO NOTHING;

-- No recipient means everyone gets it
INSERT INTO notifications (id, title, message, type, metadata) VALUES
('70000000-0000-4000-8000-000000000001', 'New Event Published', 'A new event titled "Community Clean Up" has been added!', 'event', '{"event_id": "20000000-0000-4000-8000-000000000001"}'),
('70000000-0000-4000-8000-000000000002', 'New Promo Added!', 'A new promo titled "Sample: Outdoor Film Night" has been published.', 'promo', '{"promo_id": "40000000-0000-4000-8000-000000000001"}')
ON CONFLICT DO NOTHING;

COMMIT;
