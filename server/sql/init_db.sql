CREATE TABLE roles (
  id SERIAL PRIMARY KEY,
  name TEXT UNIQUE NOT NULL -- admin, freelancer, client
);

CREATE TABLE users (
  id SERIAL PRIMARY KEY,
  full_name TEXT NOT NULL,
  username TEXT UNIQUE NOT NULL,
  email TEXT UNIQUE NOT NULL,
  password_hash TEXT NOT NULL,
  role_id INTEGER REFERENCES roles(id),
  profile_picture TEXT,
  biography TEXT,
  preferences JSONB,
  is_verified BOOLEAN DEFAULT FALSE,
  verify_token TEXT,
  token_expires TIMESTAMP,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  is_freelancer BOOLEAN DEFAULT FALSE
);

CREATE TABLE freelancer_profiles (
  id SERIAL PRIMARY KEY,
  user_id INTEGER REFERENCES users(id),
  alias TEXT,
  description TEXT,
  languages TEXT[],
  skills TEXT[],
  education JSONB, -- ejemplo: [{"institution":"MIT", "degree":"CS", "year":2020}]
  website TEXT,
  social_links TEXT[],
  verification_file TEXT,
  verified BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE pending_users (
  id SERIAL PRIMARY KEY,
  full_name TEXT NOT NULL,
  username TEXT UNIQUE NOT NULL,
  email TEXT UNIQUE NOT NULL,
  password_hash TEXT NOT NULL,
  usage_preference TEXT NOT NULL,
  verify_token TEXT NOT NULL,
  token_expires TIMESTAMP NOT NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  image_url TEXT NOT NULL
);

CREATE TABLE categories (
  id SERIAL PRIMARY KEY,
  name TEXT NOT NULL
);

CREATE TABLE services (
  id SERIAL PRIMARY KEY,
  title TEXT NOT NULL,
  description TEXT NOT NULL,
  price NUMERIC(10,2) NOT NULL,
  freelancer_id INTEGER REFERENCES users(id),
  category_id INTEGER REFERENCES categories(id),
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  is_active BOOLEAN DEFAULT TRUE
);

CREATE TABLE requests (
  id SERIAL PRIMARY KEY,
  title TEXT NOT NULL,
  description TEXT NOT NULL,
  budget NUMERIC(10,2) NOT NULL,
  deadline DATE NOT NULL,
  client_id INTEGER REFERENCES users(id),
  category_id INTEGER REFERENCES categories(id),
  status TEXT DEFAULT 'open',
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE proposals (
  id SERIAL PRIMARY KEY,
  request_id INTEGER REFERENCES requests(id),
  freelancer_id INTEGER REFERENCES users(id),
  message TEXT,
  proposed_price NUMERIC(10,2),
  proposed_deadline DATE,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  status TEXT DEFAULT 'pending'
);

CREATE TABLE projects (
  id SERIAL PRIMARY KEY,
  proposal_id INTEGER REFERENCES proposals(id),
  status TEXT DEFAULT 'in_progress',
  started_at TIMESTAMP,
  completed_at TIMESTAMP,
  approved_by_client BOOLEAN DEFAULT FALSE
);

CREATE TABLE messages (
  id SERIAL PRIMARY KEY,
  sender_id INTEGER REFERENCES users(id),
  receiver_id INTEGER REFERENCES users(id),
  project_id INTEGER REFERENCES projects(id),
  content TEXT,
  file_url TEXT,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE files (
  id SERIAL PRIMARY KEY,
  uploaded_by INTEGER REFERENCES users(id),
  related_service_id INTEGER REFERENCES services(id),
  related_project_id INTEGER REFERENCES projects(id),
  related_message_id INTEGER REFERENCES messages(id),
  file_url TEXT,
  file_type TEXT,
  uploaded_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE payments (
  id SERIAL PRIMARY KEY,
  project_id INTEGER REFERENCES projects(id),
  amount NUMERIC(10,2),
  method TEXT DEFAULT 'paypal',
  status TEXT DEFAULT 'pending',
  paid_at TIMESTAMP
);

CREATE TABLE reviews (
  id SERIAL PRIMARY KEY,
  reviewer_id INTEGER REFERENCES users(id),
  reviewed_id INTEGER REFERENCES users(id),
  rating INTEGER CHECK (rating >= 1 AND rating <= 5),
  comment TEXT,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE verifications (
  id SERIAL PRIMARY KEY,
  user_id INTEGER REFERENCES users(id),
  submitted_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  status TEXT DEFAULT 'pending', -- pending, approved, rejected
  reviewed_by INTEGER REFERENCES users(id),
  reviewed_at TIMESTAMP,
  file_url TEXT
);

CREATE TABLE transactions (
  id SERIAL PRIMARY KEY,
  payment_id INTEGER REFERENCES payments(id),
  paypal_order_id TEXT,
  paypal_capture_id TEXT,
  transaction_fee NUMERIC(10,2),
  status TEXT,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE disputes (
  id SERIAL PRIMARY KEY,
  project_id INTEGER REFERENCES projects(id),
  opened_by INTEGER REFERENCES users(id),
  opened_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  description TEXT NOT NULL,
  policy_accepted BOOLEAN NOT NULL,
  status TEXT DEFAULT 'pendiente', -- pendiente, resuelta, irresoluble
  closed_by INTEGER REFERENCES users(id),
  closed_at TIMESTAMP,
  resolution TEXT
);

CREATE TABLE dispute_files (
  id SERIAL PRIMARY KEY,
  dispute_id INTEGER REFERENCES disputes(id),
  uploaded_by INTEGER REFERENCES users(id),
  file_url TEXT NOT NULL,
  file_type TEXT,
  uploaded_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE dispute_logs (
  id SERIAL PRIMARY KEY,
  dispute_id INTEGER REFERENCES disputes(id),
  action_by INTEGER REFERENCES users(id),
  action_type TEXT, -- mensaje, archivo, decisión
  action_description TEXT,
  timestamp TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);
