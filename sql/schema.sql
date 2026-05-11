PRAGMA foreign_keys = OFF;

DROP TABLE IF EXISTS audit_logs;
DROP TABLE IF EXISTS maintenance_requests;
DROP TABLE IF EXISTS payments;
DROP TABLE IF EXISTS training_sessions;
DROP TABLE IF EXISTS bookings;
DROP TABLE IF EXISTS vehicles;
DROP TABLE IF EXISTS teachers;
DROP TABLE IF EXISTS students;
DROP TABLE IF EXISTS users;

PRAGMA foreign_keys = ON;

CREATE TABLE users (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  username TEXT NOT NULL UNIQUE,
  password TEXT NOT NULL,
  full_name TEXT NOT NULL,
  role TEXT NOT NULL,
  portal TEXT NOT NULL DEFAULT 'all',
  status TEXT NOT NULL DEFAULT 'active',
  created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE students (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  student_code TEXT NOT NULL UNIQUE,
  full_name TEXT NOT NULL,
  course TEXT NOT NULL,
  area TEXT NOT NULL,
  phone TEXT,
  progress_percent INTEGER NOT NULL DEFAULT 0,
  current_stage TEXT NOT NULL DEFAULT 'new',
  dat_completed_km INTEGER NOT NULL DEFAULT 0,
  dat_required_km INTEGER NOT NULL DEFAULT 710,
  dat_completed_hours REAL NOT NULL DEFAULT 0,
  dat_required_hours REAL NOT NULL DEFAULT 24,
  tuition_total INTEGER NOT NULL DEFAULT 0,
  tuition_paid INTEGER NOT NULL DEFAULT 0,
  status TEXT NOT NULL DEFAULT 'active',
  updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE teachers (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  teacher_code TEXT NOT NULL UNIQUE,
  full_name TEXT NOT NULL,
  area TEXT NOT NULL,
  phone TEXT,
  rating REAL NOT NULL DEFAULT 5.0,
  teaching_hours_month REAL NOT NULL DEFAULT 0,
  status TEXT NOT NULL DEFAULT 'active'
);

CREATE TABLE vehicles (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  plate_number TEXT NOT NULL UNIQUE,
  model TEXT NOT NULL,
  area TEXT NOT NULL,
  odo INTEGER NOT NULL DEFAULT 0,
  fuel_liters_month REAL NOT NULL DEFAULT 0,
  fuel_cost_month INTEGER NOT NULL DEFAULT 0,
  status TEXT NOT NULL DEFAULT 'active',
  document_alert TEXT NOT NULL DEFAULT 'OK',
  updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE bookings (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  student_id INTEGER NOT NULL,
  teacher_id INTEGER,
  vehicle_id INTEGER,
  booking_type TEXT NOT NULL,
  booking_date TEXT NOT NULL,
  start_time TEXT NOT NULL,
  end_time TEXT NOT NULL,
  area TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'pending',
  note TEXT,
  created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (student_id) REFERENCES students(id),
  FOREIGN KEY (teacher_id) REFERENCES teachers(id),
  FOREIGN KEY (vehicle_id) REFERENCES vehicles(id)
);

CREATE TABLE training_sessions (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  booking_id INTEGER,
  student_id INTEGER NOT NULL,
  teacher_id INTEGER NOT NULL,
  vehicle_id INTEGER NOT NULL,
  session_type TEXT NOT NULL,
  session_date TEXT,
  start_time TEXT,
  end_time TEXT,
  odo_start INTEGER,
  odo_end INTEGER,
  km INTEGER NOT NULL DEFAULT 0,
  hours REAL NOT NULL DEFAULT 0,
  dat_start_image TEXT,
  dat_end_image TEXT,
  status TEXT NOT NULL DEFAULT 'scheduled',
  created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  completed_at TEXT,
  FOREIGN KEY (booking_id) REFERENCES bookings(id),
  FOREIGN KEY (student_id) REFERENCES students(id),
  FOREIGN KEY (teacher_id) REFERENCES teachers(id),
  FOREIGN KEY (vehicle_id) REFERENCES vehicles(id)
);

CREATE TABLE payments (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  student_id INTEGER NOT NULL,
  payment_type TEXT NOT NULL,
  amount INTEGER NOT NULL,
  method TEXT NOT NULL DEFAULT 'Chuyển khoản',
  receipt_no TEXT,
  status TEXT NOT NULL DEFAULT 'paid',
  created_by TEXT,
  created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (student_id) REFERENCES students(id)
);

CREATE TABLE maintenance_requests (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  vehicle_id INTEGER NOT NULL,
  requested_by TEXT NOT NULL,
  item TEXT NOT NULL,
  priority TEXT NOT NULL DEFAULT 'medium',
  description TEXT,
  status TEXT NOT NULL DEFAULT 'pending',
  created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  approved_at TEXT,
  FOREIGN KEY (vehicle_id) REFERENCES vehicles(id)
);

CREATE TABLE audit_logs (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  actor TEXT NOT NULL,
  action TEXT NOT NULL,
  entity_type TEXT,
  entity_id INTEGER,
  detail TEXT,
  ip_address TEXT,
  created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_bookings_status ON bookings(status);
CREATE INDEX idx_bookings_student ON bookings(student_id);
CREATE INDEX idx_training_status ON training_sessions(status);
CREATE INDEX idx_payment_student ON payments(student_id);
CREATE INDEX idx_maintenance_status ON maintenance_requests(status);
CREATE INDEX idx_audit_created ON audit_logs(created_at);
