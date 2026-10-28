-- ExamBuddy Seed Data
-- 10 Dummy Karunya Students across 3 canonical centers
-- Run this in your Supabase SQL Editor or via npm run seed

-- Clean existing demo data if needed
DELETE FROM public.messages WHERE group_id IN (
  SELECT id FROM public.groups WHERE exam_center IN (
    'iON Digital Zone iDZ Kovai Pudur',
    'KGiSL Institute of Technology, Saravanampatti',
    'Sri Krishna College of Engineering and Technology (SKCET), Kuniamuthur'
  )
);
DELETE FROM public.group_members WHERE user_id IN (
  SELECT id FROM public.users WHERE is_demo = true
);
DELETE FROM public.agent_events WHERE user_id IN (
  SELECT id FROM public.users WHERE is_demo = true
);
DELETE FROM public.tickets WHERE user_id IN (
  SELECT id FROM public.users WHERE is_demo = true
);
DELETE FROM public.users WHERE is_demo = true;
DELETE FROM public.groups WHERE exam_center IN (
  'iON Digital Zone iDZ Kovai Pudur',
  'KGiSL Institute of Technology, Saravanampatti',
  'Sri Krishna College of Engineering and Technology (SKCET), Kuniamuthur'
);

-- 1. Insert 10 Dummy Karunya Students
INSERT INTO public.users (id, name, register_no, email, college, pickup_area, is_demo) VALUES
  ('00000000-0000-0000-0000-000000000001', 'Aarav Sharma', 'URK22CS1042', 'aarav.s@karunya.edu.in', 'Karunya Institute of Technology and Sciences', 'Karunya Nagar (Campus Gate)', true),
  ('00000000-0000-0000-0000-000000000002', 'Sneha Priya', 'URK22EC1015', 'sneha.p@karunya.edu.in', 'Karunya Institute of Technology and Sciences', 'Kovaipudur', true),
  ('00000000-0000-0000-0000-000000000003', 'Joel Mathew', 'URK22AI1088', 'joel.m@karunya.edu.in', 'Karunya Institute of Technology and Sciences', 'Gandhipuram', true),
  ('00000000-0000-0000-0000-000000000004', 'Divya R', 'URK22CS1190', 'divya.r@karunya.edu.in', 'Karunya Institute of Technology and Sciences', 'Peelamedu', true),
  ('00000000-0000-0000-0000-000000000005', 'Rohan Thomas', 'URK22ME1034', 'rohan.t@karunya.edu.in', 'Karunya Institute of Technology and Sciences', 'Singanallur', true),
  ('00000000-0000-0000-0000-000000000006', 'Ananya Nair', 'URK22BT1009', 'ananya.n@karunya.edu.in', 'Karunya Institute of Technology and Sciences', 'Saibaba Colony', true),
  ('00000000-0000-0000-0000-000000000007', 'Kevin Paul', 'URK22CS1055', 'kevin.p@karunya.edu.in', 'Karunya Institute of Technology and Sciences', 'RS Puram', true),
  ('00000000-0000-0000-0000-000000000008', 'Meera Krishnan', 'URK22EE1021', 'meera.k@karunya.edu.in', 'Karunya Institute of Technology and Sciences', 'Kuniamuthur', true),
  ('00000000-0000-0000-0000-000000000009', 'Sanjay Varma', 'URK22AI1012', 'sanjay.v@karunya.edu.in', 'Karunya Institute of Technology and Sciences', 'Ukkadam', true),
  ('00000000-0000-0000-0000-000000000010', 'Rachel Samuel', 'URK22CS1077', 'rachel.s@karunya.edu.in', 'Karunya Institute of Technology and Sciences', 'Vadavalli', true);

-- 2. Insert Tickets
INSERT INTO public.tickets (user_id, course_name, exam_center, exam_date, session, extracted_json) VALUES
  ('00000000-0000-0000-0000-000000000001', 'Cloud Computing and Distributed Systems', 'iON Digital Zone iDZ Kovai Pudur', '2026-11-15', 'Forenoon', '{"courseCode":"noc24-cs101","reportingTime":"07:30 AM"}'::jsonb),
  ('00000000-0000-0000-0000-000000000002', 'Deep Learning for Computer Vision', 'iON Digital Zone iDZ Kovai Pudur', '2026-11-15', 'Forenoon', '{"courseCode":"noc24-cs112","reportingTime":"07:30 AM"}'::jsonb),
  ('00000000-0000-0000-0000-000000000003', 'Applied Natural Language Processing', 'iON Digital Zone iDZ Kovai Pudur', '2026-11-15', 'Forenoon', '{"courseCode":"noc24-cs108","reportingTime":"07:30 AM"}'::jsonb),
  ('00000000-0000-0000-0000-000000000004', 'Cloud Computing and Distributed Systems', 'iON Digital Zone iDZ Kovai Pudur', '2026-11-15', 'Forenoon', '{"courseCode":"noc24-cs101","reportingTime":"07:30 AM"}'::jsonb),
  ('00000000-0000-0000-0000-000000000005', 'Robotics and Control Systems', 'KGiSL Institute of Technology, Saravanampatti', '2026-11-15', 'Afternoon', '{"courseCode":"noc24-ee104","reportingTime":"12:30 PM"}'::jsonb),
  ('00000000-0000-0000-0000-000000000006', 'Bioinformatics: Algorithms and Applications', 'KGiSL Institute of Technology, Saravanampatti', '2026-11-15', 'Afternoon', '{"courseCode":"noc24-bt102","reportingTime":"12:30 PM"}'::jsonb),
  ('00000000-0000-0000-0000-000000000007', 'Database Management Systems', 'KGiSL Institute of Technology, Saravanampatti', '2026-11-15', 'Afternoon', '{"courseCode":"noc24-cs100","reportingTime":"12:30 PM"}'::jsonb),
  ('00000000-0000-0000-0000-000000000008', 'Smart Grid Technologies', 'Sri Krishna College of Engineering and Technology (SKCET), Kuniamuthur', '2026-11-15', 'Forenoon', '{"courseCode":"noc24-ee108","reportingTime":"07:30 AM"}'::jsonb),
  ('00000000-0000-0000-0000-000000000009', 'Reinforcement Learning', 'Sri Krishna College of Engineering and Technology (SKCET), Kuniamuthur', '2026-11-15', 'Afternoon', '{"courseCode":"noc24-ai105","reportingTime":"12:30 PM"}'::jsonb),
  ('00000000-0000-0000-0000-000000000010', 'Software Engineering Agile Methodologies', 'Sri Krishna College of Engineering and Technology (SKCET), Kuniamuthur', '2026-11-15', 'Forenoon', '{"courseCode":"noc24-cs105","reportingTime":"07:30 AM"}'::jsonb);

-- 3. Groups
-- Group A: Center A, Forenoon (4 seeded members)
INSERT INTO public.groups (id, exam_center, exam_date, session, meetup_point, meetup_time, transport, est_total_cost) VALUES
  ('11111111-1111-1111-1111-111111111111', 'iON Digital Zone iDZ Kovai Pudur', '2026-11-15', 'Forenoon', 'Karunya Nagar Main Bus Stop / Campus Gate', '06:45 AM', 'Shared Maxi Cab / Tempo Traveller', 1600.00);

-- Group B: Center B, Afternoon (3 seeded members)
INSERT INTO public.groups (id, exam_center, exam_date, session, meetup_point, meetup_time, transport, est_total_cost) VALUES
  ('22222222-2222-2222-2222-222222222222', 'KGiSL Institute of Technology, Saravanampatti', '2026-11-15', 'Afternoon', 'Gandhipuram Central Bus Stand (Platform 3)', '11:45 AM', 'Pre-booked 7-Seater Cab (Innova)', 1200.00);

-- 4. Group Members
INSERT INTO public.group_members (group_id, user_id) VALUES
  ('11111111-1111-1111-1111-111111111111', '00000000-0000-0000-0000-000000000001'),
  ('11111111-1111-1111-1111-111111111111', '00000000-0000-0000-0000-000000000002'),
  ('11111111-1111-1111-1111-111111111111', '00000000-0000-0000-0000-000000000003'),
  ('11111111-1111-1111-1111-111111111111', '00000000-0000-0000-0000-000000000004'),
  ('22222222-2222-2222-2222-222222222222', '00000000-0000-0000-0000-000000000005'),
  ('22222222-2222-2222-2222-222222222222', '00000000-0000-0000-0000-000000000006'),
  ('22222222-2222-2222-2222-222222222222', '00000000-0000-0000-0000-000000000007');

-- 5. Welcome Messages from Coordinator Agent
INSERT INTO public.messages (group_id, is_bot, body, created_at) VALUES
  ('11111111-1111-1111-1111-111111111111', true, 'Welcome everyone! I am your ExamBuddy Coordinator. You have been matched for the NPTEL exam at iON Digital Zone Kovai Pudur on Nov 15 (Forenoon). Current estimated cost is ₹1,600 (₹400 / person). Meetup at Karunya Nagar Main Bus Stop by 06:45 AM.', now() - interval '20 minutes'),
  ('22222222-2222-2222-2222-222222222222', true, 'Welcome to your NPTEL travel squad for KGiSL Institute of Technology (Afternoon session). Estimated fare is ₹1,200 (₹400 / person). Meetup at Gandhipuram Central Bus Stand by 11:45 AM.', now() - interval '15 minutes');

-- 6. Initial Agent Events
INSERT INTO public.agent_events (user_id, group_id, agent, message, status, created_at) VALUES
  ('00000000-0000-0000-0000-000000000001', '11111111-1111-1111-1111-111111111111', 'Intake agent', 'Extracted hall ticket details for Aarav Sharma (URK22CS1042)', 'done', now() - interval '25 minutes'),
  ('00000000-0000-0000-0000-000000000001', '11111111-1111-1111-1111-111111111111', 'Matching agent', 'Matched 4 Karunya classmates for iON Digital Zone Kovai Pudur', 'done', now() - interval '22 minutes'),
  ('00000000-0000-0000-0000-000000000001', '11111111-1111-1111-1111-111111111111', 'Coordinator agent', 'Calculated route plan and updated cost split to ₹400 per person', 'done', now() - interval '20 minutes');
