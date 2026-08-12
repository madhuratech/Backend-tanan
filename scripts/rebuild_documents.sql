-- Safe migration for the new documents/FAQs/branches structure
-- Run this script in the MySQL database used by TANAN.

SET FOREIGN_KEY_CHECKS = 0;

DROP TABLE IF EXISTS faqs;
DROP TABLE IF EXISTS documents;
DROP TABLE IF EXISTS regional_branches;

SET FOREIGN_KEY_CHECKS = 1;

CREATE TABLE regional_branches (
    id INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
    name VARCHAR(255) NOT NULL,
    description TEXT NULL,
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
        ON UPDATE CURRENT_TIMESTAMP
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

CREATE TABLE documents (
    id INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
    title VARCHAR(255) NOT NULL,
    pdf VARCHAR(500) NOT NULL,
    scope ENUM('organization', 'regional') NOT NULL DEFAULT 'organization',
    branch_id INT UNSIGNED NULL,
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
        ON UPDATE CURRENT_TIMESTAMP,
    CONSTRAINT fk_documents_branch
        FOREIGN KEY (branch_id)
        REFERENCES regional_branches(id)
        ON DELETE CASCADE
        ON UPDATE CASCADE,
    INDEX idx_documents_scope (scope),
    INDEX idx_documents_branch_id (branch_id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

CREATE TABLE faqs (
    id INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
    title VARCHAR(255) NOT NULL,
    answer TEXT NOT NULL,
    scope ENUM('organization', 'regional') NOT NULL DEFAULT 'organization',
    branch_id INT UNSIGNED NULL,
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
        ON UPDATE CURRENT_TIMESTAMP,
    CONSTRAINT fk_faqs_branch
        FOREIGN KEY (branch_id)
        REFERENCES regional_branches(id)
        ON DELETE CASCADE
        ON UPDATE CASCADE,
    INDEX idx_faqs_scope (scope),
    INDEX idx_faqs_branch_id (branch_id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
