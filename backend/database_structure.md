# Database Table Structures

This document outlines the schema for the 13 tables in the database, mapping the C# models to their database representations.

---

### **1. Users**
| Field | Type | Null | Key | Default |
| :--- | :--- | :--- | :--- | :--- |
| `user_id` | VARCHAR(50) | NO | PRI | - |
| `employee_id` | VARCHAR(50) | YES | - | - |
| `user_name` | VARCHAR(100) | NO | - | - |
| `email` | VARCHAR(255) | NO | - | - |
| `password_hash` | TEXT | YES | - | - |
| `role` | user_role (Enum) | NO | - | - |
| `status` | user_status (Enum) | NO | - | 'Active' |
| `created_at` | TIMESTAMP | NO | - | CURRENT_TIMESTAMP |
| `MfaSecret` | VARCHAR(255) | YES | - | - |
| `MfaEnabled` | BOOLEAN | NO | - | FALSE |

---

### **2. Train_Line**
| Field | Type | Null | Key | Default |
| :--- | :--- | :--- | :--- | :--- |
| `line_id` | VARCHAR(50) | NO | PRI | - |
| `line_name` | VARCHAR(100) | NO | - | - |

---

### **3. Station**
| Field | Type | Null | Key | Default |
| :--- | :--- | :--- | :--- | :--- |
| `station_id` | VARCHAR(50) | NO | PRI | - |
| `station_name` | VARCHAR(150) | NO | - | - |
| `latitude` | DOUBLE PRECISION | NO | - | - |
| `longitude` | DOUBLE PRECISION | NO | - | - |

---

### **4. Line_Station**
| Field | Type | Null | Key | Default |
| :--- | :--- | :--- | :--- | :--- |
| `line_id` | VARCHAR(50) | NO | PRI, FK | - |
| `station_id` | VARCHAR(50) | NO | PRI, FK | - |
| `sequence_order` | INT | NO | - | - |

---

### **5. Train_Asset**
| Field | Type | Null | Key | Default |
| :--- | :--- | :--- | :--- | :--- |
| `train_id` | INT | NO | PRI | - |
| `line_id` | VARCHAR(50) | NO | FK | - |
| `status` | asset_status (Enum) | NO | - | 'Active' |
| `created_at` | TIMESTAMP | NO | - | CURRENT_TIMESTAMP |

---

### **6. Train_Coach**
| Field | Type | Null | Key | Default |
| :--- | :--- | :--- | :--- | :--- |
| `train_id` | INT | NO | PRI, FK | - |
| `coach_id` | INT | NO | PRI | - |
| `coach_type` | coach_type (Enum) | NO | - | 'Womens_Only' |

---

### **7. Camera**
| Field | Type | Null | Key | Default |
| :--- | :--- | :--- | :--- | :--- |
| `camera_id` | VARCHAR(50) | NO | PRI | - |
| `train_id` | INT | NO | FK | - |
| `coach_id` | INT | NO | FK | - |
| `stream_url` | TEXT | NO | - | - |
| `status` | camera_status (Enum) | NO | - | 'Active' |

---

### **8. Detection**
| Field | Type | Null | Key | Default |
| :--- | :--- | :--- | :--- | :--- |
| `detection_id` | SERIAL (INT) | NO | PRI | - |
| `camera_id` | VARCHAR(50) | NO | FK | - |
| `confidence_score` | DECIMAL | NO | - | - |
| `image_url` | VARCHAR(255) | NO | - | - |
| `detected_at` | TIMESTAMP | NO | - | CURRENT_TIMESTAMP |
| `line_id` | VARCHAR(50) | NO | FK | - |
| `station_id` | VARCHAR(50) | NO | FK | - |

---

### **9. User_Report**
| Field | Type | Null | Key | Default |
| :--- | :--- | :--- | :--- | :--- |
| `report_id` | SERIAL (INT) | NO | PRI | - |
| `user_id` | VARCHAR(50) | NO | FK | - |
| `train_id` | INT | NO | FK | - |
| `coach_id` | INT | NO | FK | - |
| `description` | TEXT | NO | - | - |
| `image_url` | VARCHAR(255) | YES | - | - |
| `created_at` | TIMESTAMP | NO | - | CURRENT_TIMESTAMP |
| `line_id` | VARCHAR(50) | NO | FK | - |
| `station_id` | VARCHAR(50) | NO | FK | - |

---

### **10. Incident**
| Field | Type | Null | Key | Default |
| :--- | :--- | :--- | :--- | :--- |
| `incident_id` | SERIAL (INT) | NO | PRI | - |
| `source` | incident_source (Enum) | NO | - | - |
| `detection_id` | INT | YES | FK | - |
| `report_id` | INT | YES | FK | - |
| `status` | incident_status (Enum) | NO | - | 'Pending' |
| `verified_by` | VARCHAR(50) | YES | FK | - |
| `escalated_by` | VARCHAR(50) | YES | FK | - |
| `enroute_by` | VARCHAR(50) | YES | FK | - |
| `resolved_by` | VARCHAR(50) | YES | FK | - |
| `dismissed_by` | VARCHAR(50) | YES | FK | - |
| `verified_at` | TIMESTAMP | YES | - | - |
| `escalated_at` | TIMESTAMP | YES | - | - |
| `enroute_at` | TIMESTAMP | YES | - | - |
| `enroute_comment` | TEXT | YES | - | - |
| `resolved_at` | TIMESTAMP | YES | - | - |
| `dismissed_at` | TIMESTAMP | YES | - | - |
| `created_at` | TIMESTAMP | NO | - | CURRENT_TIMESTAMP |
| `verified_comment` | TEXT | YES | - | - |
| `escalated_comment` | TEXT | YES | - | - |
| `resolved_comment` | TEXT | YES | - | - |
| `dismissed_comment` | TEXT | YES | - | - |

---

### **11. Auxiliary_Shift**
| Field | Type | Null | Key | Default |
| :--- | :--- | :--- | :--- | :--- |
| `shift_id` | SERIAL (INT) | NO | PRI | - |
| `user_id` | VARCHAR(50) | NO | FK | - |
| `station_id` | VARCHAR(50) | NO | FK | - |
| `shift_date` | DATE | NO | - | - |
| `start_time` | TIME | NO | - | - |
| `end_time` | TIME | NO | - | - |
| `created_at` | TIMESTAMP | NO | - | CURRENT_TIMESTAMP |

---

### **12. Push_Subscriptions**
| Field | Type | Null | Key | Default |
| :--- | :--- | :--- | :--- | :--- |
| `id` | SERIAL (INT) | NO | PRI | - |
| `user_id` | VARCHAR(50) | NO | FK | - |
| `endpoint` | TEXT | NO | - | - |
| `p256dh` | VARCHAR(512) | NO | - | - |
| `auth` | VARCHAR(256) | NO | - | - |
| `updated_at` | TIMESTAMP | NO | - | CURRENT_TIMESTAMP |

---

### **13. Notification_Preferences**
| Field | Type | Null | Key | Default |
| :--- | :--- | :--- | :--- | :--- |
| `user_id` | VARCHAR(50) | NO | PRI, FK | - |
| `sound_alerts` | sound_alert_mode (Enum) | NO | - | 'on' |
| `time_format` | VARCHAR(5) | NO | - | '24h' |
---

## **Custom Enum Types (PostgreSQL Types)**

These are custom types defined in the database using the `CREATE TYPE ... AS ENUM` syntax.

### **1. user_role**
| PgName (DB Value) | C# Member | Description |
| :--- | :--- | :--- |
| `Passenger` | `Passenger` | Regular mobile app users |
| `Operator` | `Operator` | Command center operators |
| `Auxiliary` | `Auxiliary` | On-site auxiliary staff |

---

### **2. user_status**
| PgName (DB Value) | C# Member | Description |
| :--- | :--- | :--- |
| `Active` | `Active` | User can log in and use the system |
| `Suspended` | `Suspended` | User access is temporarily blocked |
| `Archived` | `Archived` | User account is deactivated |

---

### **3. asset_status**
| PgName (DB Value) | C# Member | Description |
| :--- | :--- | :--- |
| `Active` | `Active` | Train asset is in service |
| `Inactive` | `Inactive` | Train asset is out of service |
| `Maintenance` | `Maintenance` | Train asset is being repaired |

---

### **4. coach_type**
| PgName (DB Value) | C# Member | Description |
| :--- | :--- | :--- |
| `Womens_Only` | `Womens_Only` | Restricted to female passengers |
| `Mixed` | `Mixed` | Open to all passengers |

---

### **5. camera_status**
| PgName (DB Value) | C# Member | Description |
| :--- | :--- | :--- |
| `Active` | `Active` | Camera is streaming correctly |
| `Inactive` | `Inactive` | Camera is intentionally offline |
| `Faulty` | `Faulty` | Camera has a hardware/connection issue |

---

### **6. incident_source**
| PgName (DB Value) | C# Member | Description |
| :--- | :--- | :--- |
| `AI_DETECTION` | `AI_DETECTION` | Triggered by automated camera analysis |
| `USER_REPORT` | `USER_REPORT` | Submitted by a passenger via the app |

---

### **7. incident_status**
| PgName (DB Value) | C# Member | Description |
| :--- | :--- | :--- |
| `Pending` | `Pending` | Initial state of an alert |
| `Verified` | `Verified` | Confirmed as a real violation by operator |
| `En_Route` | `En_Route` | Auxiliary staff assigned and moving to location |
| `Escalated` | `Escalated` | Reported to higher authorities/police |
| `Resolved` | `Resolved` | Violation handled and cleared |
| `Dismissed` | `Dismissed` | False alarm or ignorable event |

---

### **8. sound_alert_mode**
| PgName (DB Value) | C# Member | Description |
| :--- | :--- | :--- |
| `on` | `On` | Audible alerts enabled |
| `off` | `Off` | Audible alerts disabled |
| `peak` | `Peak` | Audible alerts only during peak hours |

