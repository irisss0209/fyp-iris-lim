-- 1. Insert Static Train Lines
INSERT INTO "Train_Line" ("line_id", "line_name") VALUES 
('LINE_LRT_KJ', 'LRT Kelana Jaya'),
('LINE_KTM', 'KTM Komuter'),
('LINE_MRT_PJ', 'MRT Putrajaya'),
('LINE_MRT_KJ', 'MRT Kajang')
ON CONFLICT ("line_id") DO NOTHING;

-- 2. Insert Base Train Assets
INSERT INTO "Train_Asset" ("train_id", "line_id", "status", "created_at") VALUES 
('TRN_LRT_01', 'LINE_LRT_KJ', 'Active', CURRENT_TIMESTAMP),
('TRN_KTM_01', 'LINE_KTM', 'Active', CURRENT_TIMESTAMP),
('TRN_MRT_01', 'LINE_MRT_PJ', 'Active', CURRENT_TIMESTAMP)
ON CONFLICT ("train_id") DO NOTHING;

-- 3. Insert Train Coaches (e.g., Coach 1 to 6)
INSERT INTO "Train_Coach" ("coach_id", "train_id", "coach_type") VALUES 
('C_LRT_01_1', 'TRN_LRT_01', 'Mixed'),
('C_LRT_01_2', 'TRN_LRT_01', 'Womens_Only'),
('C_LRT_01_3', 'TRN_LRT_01', 'Mixed'),
('C_KTM_01_1', 'TRN_KTM_01', 'Mixed'),
('C_KTM_01_2', 'TRN_KTM_01', 'Womens_Only'),
('C_MRT_01_1', 'TRN_MRT_01', 'Mixed')
ON CONFLICT ("coach_id") DO NOTHING;

-- 4. Create Mock User for the Profile details
INSERT INTO "Users" ("user_id", "employee_id", "user_name", "email", "cognito_sub", "role", "created_at") VALUES 
('USR_MOCK_01', NULL, 'Passenger', 'passenger@email.com', 'mock-cognito-sub-001', 'Customer', CURRENT_TIMESTAMP)
ON CONFLICT ("user_id") DO NOTHING;

-- 5. Insert Mock User Reports (To feed into Incident)
-- (Assuming report_id is identity, we let it auto-generate)
INSERT INTO "User_Report" ("user_id", "coach_id", "violation_type", "description", "created_at") VALUES 
('USR_MOCK_01', 'C_LRT_01_2', 'Male in Women-Only Coach', 'Male passenger refused to leave', CURRENT_TIMESTAMP - INTERVAL '14 minutes'),
('USR_MOCK_01', 'C_KTM_01_1', 'Harassment / Inappropriate Behaviour', 'Passenger creating nuisance', CURRENT_TIMESTAMP - INTERVAL '2 minutes'),
('USR_MOCK_01', 'C_MRT_01_1', 'Suspicious Package / Item', 'Unattended bag spotted', CURRENT_TIMESTAMP - INTERVAL '1 hour');

-- 6. Insert Corresponding Incidents for Recent Reports
-- Note: Assuming report_ids 1, 2, 3 were just generated.
INSERT INTO "Incident" ("source", "report_id", "status", "created_at", "verified_at", "dismissed_at") VALUES 
('USER_REPORT', 1, 'Verified', CURRENT_TIMESTAMP - INTERVAL '14 minutes', CURRENT_TIMESTAMP - INTERVAL '10 minutes', NULL),
('USER_REPORT', 2, 'Pending', CURRENT_TIMESTAMP - INTERVAL '2 minutes', NULL, NULL),
('USER_REPORT', 3, 'Dismissed', CURRENT_TIMESTAMP - INTERVAL '1 hour', NULL, CURRENT_TIMESTAMP - INTERVAL '50 minutes');

-- Note regarding TREND_DATA: 
-- You can either insert 50+ lines of mock incidents with various CURRENT_TIMESTAMP - INTERVAL 'X days' 
-- to simulate the trends, or generate that dynamically in your API return for the charts!
