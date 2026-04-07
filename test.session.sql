-- Dummy Data for Users Table
INSERT INTO users (name, email, password, phone_number, role) VALUES 
('Iris Tan', 'iris@railly.com', 'password123', '91234567', 'operator'),
('Sgt. Smith', 'smith@police.gov', 'securepass789', '81234568', 'police'),
('Admin User', 'admin@railly.com', 'admin789', '87654321', 'operator'),
('Regular User', 'user@example.com', 'userpass', '90001111', 'user');

-- Dummy Data for Alerts Table (including the new coach_id column)
INSERT INTO alerts (source_type, confidence_score, status, train_line, coach_id, station_name, image_url, description) VALUES 
('AI Detected', 98.50, 'pending', 'North-South Line', 'C101', 'Jurong East', '/assets/alerts/alert1.jpg', 'Unattended bag detected near platform B.'),
('Passenger Reported', NULL, 'escalated', 'East-West Line', 'C205', 'City Hall', '/assets/alerts/report2.jpg', 'Suspicious activity reported on train car 1042.'),
('AI Detected', 85.20, 'resolved', 'Circle Line', 'C312', 'Bishan', '/assets/alerts/alert3.jpg', 'Aggressive behavior detected on platform level 2.'),
('Passenger Reported', NULL, 'dismissed', 'Downtown Line', 'C408', 'Bugis', NULL, 'False alarm: passenger left an empty water bottle.'),
('AI Detected', 92.00, 'pending', 'North-East Line', 'C503', 'Serangoon', '/assets/alerts/alert5.jpg', 'Individual crossing yellow line repeatedly.');

-- Select data to verify
SELECT * FROM users;
SELECT * FROM alerts;