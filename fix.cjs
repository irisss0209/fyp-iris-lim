const fs = require('fs');
let text = fs.readFileSync('backend/Controllers/DataController.cs', 'utf8');

text = text.replace(/inc\.Source == "AI_DETECTION"/g, 'inc.Source == IncidentSource.AI_DETECTION');
text = text.replace(/Source = "USER_REPORT"/g, 'Source = IncidentSource.USER_REPORT');
text = text.replace(/Status = "Pending"/g, 'Status = IncidentStatus.Pending');
text = text.replace(/i\.Status == "Pending"/g, 'i.Status == IncidentStatus.Pending');
text = text.replace(/i\.Status == "Verified"/g, 'i.Status == IncidentStatus.Verified');
text = text.replace(/i\.Status == "Escalated"/g, 'i.Status == IncidentStatus.Escalated');
text = text.replace(/i\.Status == "Resolved"/g, 'i.Status == IncidentStatus.Resolved');
text = text.replace(/i\.Status == "Dismissed"/g, 'i.Status == IncidentStatus.Dismissed');
text = text.replace(/c\.Status == "Active"/g, 'c.Status == CameraStatus.Active');
text = text.replace(/user\.Role != "Auxiliary"/g, 'user.Role != UserRole.Auxiliary');
text = text.replace(/u\.Role == "Auxiliary"/g, 'u.Role == UserRole.Auxiliary');
text = text.replace(/i\.Status\.ToLower\(\)/g, 'i.Status.ToString().ToLower()');

fs.writeFileSync('backend/Controllers/DataController.cs', text);
