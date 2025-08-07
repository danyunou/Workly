
CREATE TABLE roles (
    id SERIAL PRIMARY KEY,
    name TEXT NOT NULL
);

CREATE TABLE users (
    id SERIAL PRIMARY KEY,
    full_name TEXT NOT NULL,
    username TEXT NOT NULL,
    email TEXT NOT NULL UNIQUE,
    password_hash TEXT NOT NULL,
    role_id INTEGER REFERENCES roles(id),
    profile_picture TEXT,
    biography TEXT,
    preferences JSONB,
    is_verified BOOLEAN DEFAULT false,
    verify_token TEXT,
    token_expires TIMESTAMP,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    is_freelancer BOOLEAN DEFAULT false
);

CREATE TABLE pending_users (
    id SERIAL PRIMARY KEY,
    full_name TEXT NOT NULL,
    username TEXT NOT NULL,
    email TEXT NOT NULL,
    password_hash TEXT NOT NULL,
    usage_preference TEXT NOT NULL,
    verify_token TEXT NOT NULL,
    token_expires TIMESTAMP NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE freelancer_profiles (
    id SERIAL PRIMARY KEY,
    user_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
    alias TEXT NOT NULL,
    description TEXT,
    languages TEXT[],
    skills TEXT[],
    education JSONB,
    website TEXT,
    social_links TEXT[],
    verification_file TEXT,
    verified BOOLEAN DEFAULT false,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    categories TEXT[]
);

CREATE TABLE services (
    id SERIAL PRIMARY KEY,
    title TEXT NOT NULL,
    description TEXT NOT NULL,
    price NUMERIC(10, 2) NOT NULL,
    freelancer_id INTEGER REFERENCES users(id),
    category TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    is_active BOOLEAN DEFAULT true,
    image_url TEXT
);

CREATE TABLE requests (
    id SERIAL PRIMARY KEY,
    title TEXT NOT NULL,
    description TEXT NOT NULL,
    budget NUMERIC(10, 2) NOT NULL,
    deadline DATE NOT NULL,
    client_id INTEGER REFERENCES users(id),
    category TEXT,
    status TEXT DEFAULT 'open',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE service_requests (
    id SERIAL PRIMARY KEY,
    service_id INTEGER REFERENCES services(id),
    client_id INTEGER REFERENCES users(id),
    message TEXT,
    proposed_deadline DATE,
    status TEXT DEFAULT 'pending',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    proposed_budget NUMERIC(10,2)
);

CREATE TABLE proposals (
    id SERIAL PRIMARY KEY,
    request_id INTEGER REFERENCES requests(id),
    freelancer_id INTEGER REFERENCES users(id),
    message TEXT,
    proposed_price NUMERIC(10, 2),
    proposed_deadline DATE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    status TEXT DEFAULT 'pending'
);

CREATE TABLE projects (
    id SERIAL PRIMARY KEY,
    proposal_id INTEGER REFERENCES proposals(id),
    request_id INTEGER REFERENCES requests(id),
    freelancer_id INTEGER REFERENCES users(id),
    client_id INTEGER REFERENCES users(id),
    service_request_id INTEGER REFERENCES service_requests(id),
    service_id INTEGER REFERENCES services(id),
    status TEXT DEFAULT 'pending_contract',
    started_at TIMESTAMP,
    completed_at TIMESTAMP,
    approved_by_client BOOLEAN DEFAULT false,
    contract_accepted_at TIMESTAMP,
    payment_status TEXT DEFAULT 'pending',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    client_accepted BOOLEAN DEFAULT false,
    freelancer_accepted BOOLEAN DEFAULT false
);

CREATE TABLE deliverables (
    id SERIAL PRIMARY KEY,
    project_id INTEGER REFERENCES projects(id),
    freelancer_id INTEGER REFERENCES users(id),
    file_url TEXT NOT NULL,
    uploaded_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    approved_by_client BOOLEAN DEFAULT false,
    rejected_by_client BOOLEAN DEFAULT false,
    rejection_message TEXT,
    version INTEGER DEFAULT 1
);

CREATE TABLE disputes (
    id SERIAL PRIMARY KEY,
    project_id INTEGER REFERENCES projects(id),
    opened_by INTEGER REFERENCES users(id),
    opened_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    description TEXT NOT NULL,
    policy_accepted BOOLEAN NOT NULL,
    status TEXT DEFAULT 'pendiente',
    closed_by INTEGER REFERENCES users(id),
    closed_at TIMESTAMP,
    resolution TEXT
);

CREATE TABLE dispute_logs (
    id SERIAL PRIMARY KEY,
    dispute_id INTEGER REFERENCES disputes(id),
    action_by INTEGER REFERENCES users(id),
    action_type TEXT,
    action_description TEXT,
    timestamp TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE verifications (
    id SERIAL PRIMARY KEY,
    user_id INTEGER REFERENCES users(id),
    submitted_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    status TEXT DEFAULT 'pending',
    reviewed_by INTEGER REFERENCES users(id),
    reviewed_at TIMESTAMP,
    file_url TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    rejection_message TEXT
);

CREATE TABLE verification_logs (
    id SERIAL PRIMARY KEY,
    verification_id INTEGER REFERENCES verifications(id),
    action TEXT NOT NULL,
    message TEXT,
    action_by INTEGER REFERENCES users(id),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);
