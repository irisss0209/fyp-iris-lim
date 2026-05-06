namespace backend.Models.DTOs
{
    public class UserSessionDto
    {
        public string UserId { get; set; } = null!;
        public string UserName { get; set; } = null!;
        public string? EmployeeId { get; set; }
        public string Email { get; set; } = null!;
        public string Role { get; set; } = null!;
        public string Description { get; set; } = null!;
    }

    public class UserSummaryDto
    {
        public string UserId { get; set; } = null!;
        public string UserName { get; set; } = null!;
    }

    public class UserListItemDto
    {
        public string UserId { get; set; } = null!;
        public string UserName { get; set; } = null!;
        public string Email { get; set; } = null!;
        public string Role { get; set; } = null!;
        public string Status { get; set; } = null!;
        public DateTime CreatedAt { get; set; }
    }

    public class UserListPageDto
    {
        public int Total { get; set; }
        public int Page { get; set; }
        public int PageSize { get; set; }
        public List<UserListItemDto> Users { get; set; } = new();
    }

    public class PassengerProfileDto
    {
        public string UserId { get; set; } = null!;
        public string UserName { get; set; } = null!;
        public string Email { get; set; } = null!;
        public string Role { get; set; } = null!;
        public int Reports { get; set; }
        public int Verified { get; set; }
    }

    public class AuxiliaryProfileDto
    {
        public string UserId { get; set; } = null!;
        public string UserName { get; set; } = null!;
        public string Email { get; set; } = null!;
        public string Role { get; set; } = null!;
        public double AvgReactionTime { get; set; }
        public int Resolved { get; set; }
    }
}
