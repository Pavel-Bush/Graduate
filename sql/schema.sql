DROP DATABASE IF EXISTS rentaluxe;
CREATE DATABASE rentaluxe CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
USE rentaluxe;

-- Пользователи
CREATE TABLE users (
    user_id BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
    full_name VARCHAR(255) NOT NULL,
    email VARCHAR(255) NOT NULL UNIQUE,
    phone VARCHAR(30) UNIQUE,
    password_hash VARCHAR(255) NOT NULL,
    role ENUM('client', 'employee', 'admin') NOT NULL DEFAULT 'client',
    driver_license_number VARCHAR(50) UNIQUE,
    license_issue_date DATE NULL,
    license_categories JSON NULL,
    birth_date DATE,
    is_blocked BOOLEAN NOT NULL DEFAULT FALSE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    INDEX idx_users_role (role),
    INDEX idx_users_is_blocked (is_blocked)
) ENGINE=InnoDB;

-- Платёжные карты
CREATE TABLE payment_cards (
    id BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
    user_id BIGINT UNSIGNED NOT NULL,
    card_token VARCHAR(255) NOT NULL,
    card_last4 CHAR(4) NOT NULL,
    is_default BOOLEAN NOT NULL DEFAULT FALSE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT fk_payment_cards_user FOREIGN KEY (user_id) REFERENCES users(user_id) ON DELETE CASCADE,
    INDEX idx_payment_cards_user (user_id)
) ENGINE=InnoDB;

-- Локации
CREATE TABLE locations (
    id BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
    name VARCHAR(255) NOT NULL,
    address VARCHAR(255),
    latitude DECIMAL(10,7) NULL,
    longitude DECIMAL(10,7) NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
) ENGINE=InnoDB;

-- Модели автомобилей (уникальность brand+model убрана)
CREATE TABLE car_models (
    id BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
    brand VARCHAR(100) NOT NULL,
    model VARCHAR(100) NOT NULL,
    transmission ENUM('manual', 'automatic'),
    fuel_type ENUM('petrol', 'diesel', 'electric', 'hybrid'),
    engine_volume DECIMAL(3,1),
    engine_power INT,
    fuel_consumption DECIMAL(4,1),
    drive_type ENUM('fwd', 'rwd', 'awd'),
    body_type ENUM('sedan', 'hatchback', 'suv', 'wagon', 'coupe', 'convertible', 'minivan'),
    seats INT,
    has_ac BOOLEAN NOT NULL DEFAULT FALSE,
    has_bluetooth BOOLEAN NOT NULL DEFAULT FALSE,
    has_seat_heating BOOLEAN NOT NULL DEFAULT FALSE,
    has_parking_sensors BOOLEAN NOT NULL DEFAULT FALSE,
    min_experience INT DEFAULT 0,
    required_license_category VARCHAR(10),
    description TEXT,
    image VARCHAR(255) NULL,
    base_price_per_day DECIMAL(10,2) NOT NULL DEFAULT 0.00
) ENGINE=InnoDB;

-- Автомобили (статусы: available, service)
CREATE TABLE cars (
    id BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
    model_id BIGINT UNSIGNED NOT NULL,
    location_id BIGINT UNSIGNED,
    color VARCHAR(50),
    license_plate VARCHAR(20) NOT NULL UNIQUE,
    status ENUM('available', 'service') NOT NULL DEFAULT 'available',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT fk_cars_model FOREIGN KEY (model_id) REFERENCES car_models(id) ON DELETE RESTRICT,
    CONSTRAINT fk_cars_location FOREIGN KEY (location_id) REFERENCES locations(id) ON DELETE SET NULL,
    INDEX idx_cars_status (status),
    INDEX idx_cars_model (model_id),
    INDEX idx_cars_location (location_id)
) ENGINE=InnoDB;

-- Аренда (объединённая бронь и аренда)
CREATE TABLE rentals (
    id BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
    user_id BIGINT UNSIGNED NOT NULL,
    car_id BIGINT UNSIGNED NOT NULL,
    start_datetime DATETIME NOT NULL,
    end_datetime DATETIME NOT NULL,
    actual_end_datetime DATETIME NULL,
    blocked_until DATETIME NULL,
    status ENUM('pending', 'paid', 'active', 'completed', 'cancelled', 'expired') NOT NULL DEFAULT 'pending',
    total_price DECIMAL(10,2) NOT NULL DEFAULT 0.00,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT fk_rentals_user FOREIGN KEY (user_id) REFERENCES users(user_id) ON DELETE RESTRICT,
    CONSTRAINT fk_rentals_car FOREIGN KEY (car_id) REFERENCES cars(id) ON DELETE RESTRICT,
    INDEX idx_rentals_user (user_id),
    INDEX idx_rentals_car (car_id),
    INDEX idx_rentals_status (status),
    INDEX idx_rentals_car_dates (car_id, start_datetime, end_datetime),
    CONSTRAINT chk_rental_dates CHECK (end_datetime > start_datetime)
) ENGINE=InnoDB;

-- Платежи
CREATE TABLE payments (
    id BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
    rental_id BIGINT UNSIGNED NOT NULL,
    user_id BIGINT UNSIGNED NOT NULL,
    amount DECIMAL(10,2) NOT NULL,
    payment_method ENUM('card', 'cash') NOT NULL DEFAULT 'card',
    status ENUM('pending', 'completed', 'failed') NOT NULL DEFAULT 'pending',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT fk_payments_rental FOREIGN KEY (rental_id) REFERENCES rentals(id) ON DELETE RESTRICT,
    CONSTRAINT fk_payments_user FOREIGN KEY (user_id) REFERENCES users(user_id) ON DELETE RESTRICT,
    INDEX idx_payments_rental (rental_id),
    INDEX idx_payments_user (user_id),
    INDEX idx_payments_status (status),
    CONSTRAINT chk_payment_amount CHECK (amount > 0)
) ENGINE=InnoDB;

-- Штрафы
CREATE TABLE fines (
    id BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
    user_id BIGINT UNSIGNED NOT NULL,
    rental_id BIGINT UNSIGNED NOT NULL,
    amount DECIMAL(10,2) NOT NULL,
    reason TEXT,
    status ENUM('unpaid', 'paid') NOT NULL DEFAULT 'unpaid',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT fk_fines_user FOREIGN KEY (user_id) REFERENCES users(user_id) ON DELETE RESTRICT,
    CONSTRAINT fk_fines_rental FOREIGN KEY (rental_id) REFERENCES rentals(id) ON DELETE RESTRICT,
    INDEX idx_fines_user (user_id),
    INDEX idx_fines_rental (rental_id),
    INDEX idx_fines_status (status),
    CONSTRAINT chk_fine_amount CHECK (amount > 0)
) ENGINE=InnoDB;

-- Услуги
CREATE TABLE services (
    id BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
    name VARCHAR(255) NOT NULL UNIQUE,
    description TEXT,
    base_price DECIMAL(10,2) NOT NULL,
    unit_type ENUM('piece', 'day', 'hour') NOT NULL DEFAULT 'piece',
    required_license_category VARCHAR(10) NULL,
    CONSTRAINT chk_service_price CHECK (base_price >= 0)
) ENGINE=InnoDB;

-- Дополнительные услуги аренды
CREATE TABLE rental_services (
    id BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
    rental_id BIGINT UNSIGNED NOT NULL,
    service_id BIGINT UNSIGNED NOT NULL,
    unit_price DECIMAL(10,2) NOT NULL,
    quantity DECIMAL(10,2) NOT NULL DEFAULT 1.00,
    is_paid TINYINT(1) NOT NULL DEFAULT 0,
    CONSTRAINT fk_rental_services_rental FOREIGN KEY (rental_id) REFERENCES rentals(id) ON DELETE CASCADE,
    CONSTRAINT fk_rental_services_service FOREIGN KEY (service_id) REFERENCES services(id) ON DELETE RESTRICT,
    INDEX idx_rental_services_rental (rental_id),
    INDEX idx_rental_services_service (service_id),
    CONSTRAINT chk_rental_service_price CHECK (unit_price >= 0),
    CONSTRAINT chk_rental_service_qty CHECK (quantity > 0)
) ENGINE=InnoDB;