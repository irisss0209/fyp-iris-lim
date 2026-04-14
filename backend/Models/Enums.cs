using NpgsqlTypes;

namespace backend.Models
{
    public enum UserRole
    {
        [PgName("Customer")]  Customer,
        [PgName("Operator")]  Operator,
        [PgName("Auxiliary")] Auxiliary
    }

    public enum UserStatus
    {
        [PgName("Active")]    Active,
        [PgName("Suspended")]  Suspended,
        [PgName("Archived")] Archived
    }
    public enum AssetStatus
    {
        [PgName("Active")]      Active,
        [PgName("Inactive")]    Inactive,
        [PgName("Maintenance")] Maintenance
    }

    public enum CoachType
    {
        [PgName("Womens_Only")] Womens_Only,
        [PgName("Mixed")]       Mixed
    }

    public enum CameraStatus
    {
        [PgName("Active")]   Active,
        [PgName("Inactive")] Inactive,
        [PgName("Faulty")]   Faulty
    }

    public enum IncidentSource
    {
        [PgName("AI_DETECTION")] AI_DETECTION,
        [PgName("USER_REPORT")]  USER_REPORT
    }

    public enum IncidentStatus
    {
        [PgName("Pending")]   Pending,
        [PgName("Verified")]  Verified,
        [PgName("En_Route")]  En_Route,
        [PgName("Escalated")] Escalated,
        [PgName("Resolved")]  Resolved,
        [PgName("Dismissed")] Dismissed
    }
}
