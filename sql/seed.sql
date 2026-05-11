INSERT INTO users (username, password, full_name, role, portal) VALUES
('test', 'test', 'Demo Director', 'director', 'all'),
('student', 'test', 'Nguyễn Văn An', 'student', 'student'),
('teacher', 'test', 'Trần Minh Hoàng', 'teacher', 'teacher'),
('academic', 'test', 'Giáo vụ Quận 12', 'academic', 'academic'),
('accounting', 'test', 'Kế toán Demo', 'accounting', 'accounting'),
('vehicle', 'test', 'Quản lý xe Demo', 'vehicle_manager', 'vehicle');

INSERT INTO students
(student_code, full_name, course, area, phone, progress_percent, current_stage, dat_completed_km, dat_required_km, dat_completed_hours, dat_required_hours, tuition_total, tuition_paid, status)
VALUES
('HV-2026-00034', 'Nguyễn Văn An', 'B2 Số Sàn – K2026-04', 'Quận 12', '0901234567', 62, 'Đang học DAT', 320, 710, 14, 24, 18000000, 14500000, 'Đang học DAT'),
('HV-2026-00041', 'Trần Thị Mai', 'B Tự Động – K2026-04', 'Bình Tân', '0912345678', 78, 'Chờ thi tốt nghiệp', 710, 710, 24, 24, 20000000, 20000000, 'Chờ thi tốt nghiệp'),
('HV-2026-00058', 'Lê Quốc Bình', 'C1 – K2026-04', 'Thủ Đức', '0923456789', 88, 'Thi lại sa hình', 710, 710, 24, 24, 25000000, 24500000, 'Thi lại sa hình'),
('HV-2026-00062', 'Phạm Quang Huy', 'B2 Số Sàn – K2026-05', 'Quận 12', '0934567890', 42, 'Đang học Cabin', 0, 710, 0, 24, 18000000, 18000000, 'Đang học Cabin');

INSERT INTO teachers
(teacher_code, full_name, area, phone, rating, teaching_hours_month, status)
VALUES
('GV-001', 'Trần Minh Hoàng', 'Quận 12', '0901111222', 4.8, 142, 'Đang hoạt động'),
('GV-002', 'Lê Quốc Dũng', 'Bình Tân', '0902222333', 4.6, 128, 'Đang hoạt động'),
('GV-003', 'Phạm Văn Hải', 'Thủ Đức', '0903333444', 4.7, 118, 'Nghỉ phép chờ duyệt');

INSERT INTO vehicles
(plate_number, model, area, odo, fuel_liters_month, fuel_cost_month, status, document_alert)
VALUES
('51A-123.45', 'Toyota Vios', 'Quận 12', 45320, 128.5, 3520000, 'Đang hoạt động', 'Sắp bảo dưỡng'),
('51F-678.90', 'Hyundai i10', 'Bình Tân', 38450, 112.8, 2980000, 'Đang hoạt động', 'Đăng kiểm 7 ngày'),
('51G-234.56', 'Kia Morning', 'Thủ Đức', 62150, 144.0, 4120000, 'Bảo dưỡng', 'Tiêu hao cao'),
('51H-987.65', 'Ford EcoSport', 'Quận 12', 29780, 102.2, 2800000, 'Đang hoạt động', 'OK');

INSERT INTO bookings
(student_id, teacher_id, vehicle_id, booking_type, booking_date, start_time, end_time, area, status, note)
VALUES
(1, 1, 1, 'DAT đường trường', '2026-05-18', '09:00', '11:00', 'Quận 12', 'assigned', 'Lịch DAT đã xác nhận'),
(2, 2, 2, 'Cabin 2H', '2026-05-20', '13:00', '15:00', 'Bình Tân', 'assigned', 'Lịch cabin'),
(3, NULL, NULL, 'Sa hình thô', '2026-05-21', '15:00', '17:00', 'Quận 12', 'pending', 'Chờ phân giáo viên');

INSERT INTO training_sessions
(booking_id, student_id, teacher_id, vehicle_id, session_type, session_date, start_time, end_time, odo_start, odo_end, km, hours, status)
VALUES
(1, 1, 1, 1, 'DAT đường trường', '2026-05-18', '09:00', '11:00', 45320, 45362, 42, 2, 'scheduled');

INSERT INTO payments
(student_id, payment_type, amount, method, receipt_no, status, created_by)
VALUES
(1, 'Học phí lần 1', 8000000, 'Chuyển khoản', 'PT-2026-0001', 'paid', 'Kế toán Demo'),
(1, 'Học phí lần 2', 6500000, 'Chuyển khoản', 'PT-2026-0002', 'paid', 'Kế toán Demo'),
(2, 'Trọn gói B tự động', 20000000, 'Chuyển khoản', 'PT-2026-0003', 'paid', 'Kế toán Demo');

INSERT INTO maintenance_requests
(vehicle_id, requested_by, item, priority, description, status)
VALUES
(1, 'Trần Minh Hoàng', 'Thay bố thắng', 'high', 'Xe phát tiếng kêu khi phanh', 'pending'),
(2, 'Hệ thống', 'Gia hạn đăng kiểm', 'high', 'Đăng kiểm còn 7 ngày', 'pending');

INSERT INTO audit_logs (actor, action, entity_type, entity_id, detail)
VALUES
('System', 'SEED_DEMO_DATA', 'system', 1, 'Khởi tạo dữ liệu demo ban đầu');
