-- ============================================================
-- SafeCoach — PostgreSQL Schema
-- Fixes applied vs original:
--   1. SERIAL replaces INT AUTO_INCREMENT / INT SERIAL
--   2. VARCHAR + CHECK replaces ENUM(...)
--   3. escalated_at column renamed (was duplicate of escalated_by)
--   4. Missing comma in Train_Coach added
--   5. Trailing comma removed from Detection FK block
-- ============================================================

-- ============================================================
-- 1. USER
-- ============================================================
CREATE TABLE "Users" (
    user_id         VARCHAR(20)  PRIMARY KEY,
    employee_id     VARCHAR(20)  UNIQUE,
    user_name       VARCHAR(100) NOT NULL,
    email           VARCHAR(255) NOT NULL UNIQUE,
    cognito_sub     VARCHAR(255) NOT NULL UNIQUE,
    role            VARCHAR(20)  NOT NULL
                        CHECK (role IN ('Customer', 'Operator', 'Auxiliary')),
    created_at      TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- ============================================================
-- 2. TRAIN LINE
-- ============================================================
CREATE TABLE Train_Line (
    line_id     VARCHAR(20)  PRIMARY KEY,
    line_name   VARCHAR(100) NOT NULL
);

-- ============================================================
-- 3. STATION
-- ============================================================
CREATE TABLE Station (
    station_id      VARCHAR(20)  PRIMARY KEY,
    station_name    VARCHAR(150) NOT NULL
);

-- ============================================================
-- 4. LINE STATION
-- ============================================================
CREATE TABLE Line_Station (
    line_id         VARCHAR(20) NOT NULL,
    station_id      VARCHAR(20) NOT NULL,
    sequence_order  INT         NOT NULL,
    PRIMARY KEY (line_id, station_id),
    FOREIGN KEY (line_id)    REFERENCES Train_Line(line_id),
    FOREIGN KEY (station_id) REFERENCES Station(station_id)
);

-- ============================================================
-- 5. TRAIN ASSET
-- ============================================================
CREATE TABLE Train_Asset (
    train_id    VARCHAR(20) PRIMARY KEY,
    line_id     VARCHAR(20) NOT NULL,
    status      VARCHAR(20) NOT NULL DEFAULT 'Active'
                    CHECK (status IN ('Active', 'Inactive', 'Maintenance')),
    created_at  TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (line_id) REFERENCES Train_Line(line_id)
);

-- ============================================================
-- 6. TRAIN COACH
-- ============================================================
CREATE TABLE Train_Coach (
    coach_id    VARCHAR(20) PRIMARY KEY,
    train_id    VARCHAR(20) NOT NULL,
    coach_type  VARCHAR(20) NOT NULL DEFAULT 'Womens_Only'
                    CHECK (coach_type IN ('Womens_Only', 'Mixed')),   -- ← comma fixed
    FOREIGN KEY (train_id) REFERENCES Train_Asset(train_id)
);

-- ============================================================
-- 7. CAMERA
-- ============================================================
CREATE TABLE Camera (
    camera_id   VARCHAR(20)  PRIMARY KEY,
    coach_id    VARCHAR(20)  NOT NULL,
    stream_url  VARCHAR(255),
    status      VARCHAR(20)  NOT NULL DEFAULT 'Active'
                    CHECK (status IN ('Active', 'Inactive', 'Faulty')),
    FOREIGN KEY (coach_id) REFERENCES Train_Coach(coach_id)
);

-- ============================================================
-- 8. DETECTION  (AI camera)
-- ============================================================
CREATE TABLE Detection (
    detection_id     SERIAL       PRIMARY KEY,   -- ← SERIAL, not INT SERIAL
    camera_id        VARCHAR(20)  NULL,
    confidence_score DECIMAL(5,2),
    image_url        VARCHAR(255),
    detected_at      TIMESTAMP    DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (camera_id) REFERENCES Camera(camera_id)  -- ← trailing comma removed
);

-- ============================================================
-- 9. USER REPORT  (passenger-submitted)
-- ============================================================
CREATE TABLE User_Report (
    report_id      SERIAL       PRIMARY KEY,
    user_id        VARCHAR(20)  NOT NULL,
    coach_id       VARCHAR(20)  NULL,
    violation_type VARCHAR(100) NOT NULL,
    description    TEXT,
    image_url      VARCHAR(255),
    created_at     TIMESTAMP    DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (user_id)  REFERENCES "Users"(user_id),
    FOREIGN KEY (coach_id) REFERENCES Train_Coach(coach_id)
);

-- ============================================================
-- 10. INCIDENT
-- ============================================================
CREATE TABLE Incident (
    incident_id  SERIAL      PRIMARY KEY,
    source       VARCHAR(20) NOT NULL
                     CHECK (source IN ('AI_DETECTION', 'USER_REPORT')),
    detection_id INT         NULL,
    report_id    INT         NULL,
    status       VARCHAR(20) DEFAULT 'Pending'
                     CHECK (status IN ('Pending','Verified','En_Route','Escalated','Resolved','Dismissed')),

    -- who handled each step
    verified_by   VARCHAR(20) NULL,
    escalated_by  VARCHAR(20) NULL,
    enroute_by    VARCHAR(20) NULL,
    resolved_by   VARCHAR(20) NULL,
    dismissed_by  VARCHAR(20) NULL,

    -- when each step happened
    verified_at   TIMESTAMP NULL,
    escalated_at  TIMESTAMP NULL,   -- ← renamed from duplicate 'escalated_by'
    enroute_at    TIMESTAMP NULL,
    resolved_at   TIMESTAMP NULL,
    dismissed_at  TIMESTAMP NULL,

    created_at    TIMESTAMP DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT chk_incident_has_source
        CHECK (detection_id IS NOT NULL OR report_id IS NOT NULL),

    FOREIGN KEY (detection_id) REFERENCES Detection(detection_id),
    FOREIGN KEY (report_id)    REFERENCES User_Report(report_id),
    FOREIGN KEY (verified_by)  REFERENCES "Users"(user_id),
    FOREIGN KEY (escalated_by) REFERENCES "Users"(user_id),
    FOREIGN KEY (enroute_by)   REFERENCES "Users"(user_id),
    FOREIGN KEY (resolved_by)  REFERENCES "Users"(user_id),
    FOREIGN KEY (dismissed_by) REFERENCES "Users"(user_id)
);
