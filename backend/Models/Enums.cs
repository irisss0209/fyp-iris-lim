namespace backend.Models
{
    public enum UserRole { Customer, Operator, Auxiliary }
    public enum AssetStatus { Active, Inactive, Maintenance }
    public enum CoachType { Womens_Only, Mixed }
    public enum CameraStatus { Active, Inactive, Faulty }
    public enum IncidentSource { AI_DETECTION, USER_REPORT }
    public enum IncidentStatus { Pending, Verified, En_Route, Escalated, Resolved, Dismissed }
}
