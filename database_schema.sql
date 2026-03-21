-- Create Table Customer
CREATE TABLE Customer (
    meter_no VARCHAR(255) PRIMARY KEY,
    name VARCHAR(255) NOT NULL,
    email VARCHAR(255) UNIQUE NOT NULL,
    address TEXT NOT NULL,
    contact_no VARCHAR(20) NOT NULL,
    role VARCHAR(50) DEFAULT 'USER',
    createdAt TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Create Table Login
CREATE TABLE Login (
    meter_no VARCHAR(255) PRIMARY KEY,
    password TEXT NOT NULL,
    FOREIGN KEY (meter_no) REFERENCES Customer(meter_no) ON DELETE CASCADE
);

-- Create Table Meter_Info
CREATE TABLE Meter_Info (
    meter_no VARCHAR(255) PRIMARY KEY,
    meter_type VARCHAR(50) NOT NULL,
    phase_code VARCHAR(20) NOT NULL,
    bill_type VARCHAR(50) NOT NULL,
    days INT DEFAULT 30,
    FOREIGN KEY (meter_no) REFERENCES Customer(meter_no) ON DELETE CASCADE
);

-- Create Table Bill
CREATE TABLE Bill (
    bill_id SERIAL PRIMARY KEY, -- Use AUTO_INCREMENT for MySQL
    meter_no VARCHAR(255) NOT NULL,
    month VARCHAR(20) NOT NULL,
    year INT NOT NULL,
    units FLOAT NOT NULL,
    amount FLOAT NOT NULL,
    tax_amount FLOAT NOT NULL,
    total_amount FLOAT NOT NULL,
    status VARCHAR(20) DEFAULT 'UNPAID',
    dueDate TIMESTAMP NOT NULL,
    createdAt TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (meter_no) REFERENCES Customer(meter_no) ON DELETE CASCADE
);

-- Create Table Tax
CREATE TABLE Tax (
    tax_id SERIAL PRIMARY KEY, -- Use AUTO_INCREMENT for MySQL
    tax_name VARCHAR(50) NOT NULL,
    percentage FLOAT NOT NULL
);
