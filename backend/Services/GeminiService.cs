using System.Net.Http.Headers;
using System.Net.Http.Json;
using System.Text.Json;
using Google.Apis.Auth.OAuth2;

namespace backend.Services;

public class GeminiService : IGeminiService
{
    private readonly IHttpClientFactory _factory;
    private readonly IConfiguration _config;
    private readonly GoogleCredential? _credential;

    private const string Model    = "gemini-2.5-flash";
    private const string Location = "us-central1";
    private const string Fallback = "AI insights are currently unavailable.";

    public GeminiService(IHttpClientFactory factory, IConfiguration config)
    {
        _factory = factory;
        _config  = config;

        var json = config["VertexAI:ServiceAccountJson"];
        if (!string.IsNullOrWhiteSpace(json))
        {
            _credential = GoogleCredential.FromJson(json)
                .CreateScoped("https://www.googleapis.com/auth/cloud-platform");
        }
    }

    public async Task<string> GenerateAsync(string prompt, CancellationToken ct = default)
    {
        var projectId = _config["VertexAI:ProjectId"] ?? "";
        if (string.IsNullOrWhiteSpace(projectId) || _credential == null) return Fallback;

        try
        {
            var token = await ((ITokenAccess)_credential).GetAccessTokenForRequestAsync(cancellationToken: ct);

            var http = _factory.CreateClient();
            var url  = $"https://{Location}-aiplatform.googleapis.com/v1/projects/{projectId}" +
                       $"/locations/{Location}/publishers/google/models/{Model}:generateContent";

            var request = new HttpRequestMessage(HttpMethod.Post, url);
            request.Headers.Authorization = new AuthenticationHeaderValue("Bearer", token);
            request.Content = JsonContent.Create(new
            {
                contents = new[] { new { parts = new[] { new { text = prompt } } } }
            });

            var response = await http.SendAsync(request, ct);
            if (!response.IsSuccessStatusCode) return Fallback;

            var opts   = new JsonSerializerOptions { PropertyNameCaseInsensitive = true };
            var result = await response.Content.ReadFromJsonAsync<GeminiResponse>(opts, ct);
            return result?.Candidates?[0]?.Content?.Parts?[0]?.Text?.Trim() ?? Fallback;
        }
        catch
        {
            return Fallback;
        }
    }
}

public class GeminiResponse  { public GeminiCandidate[]? Candidates { get; set; } }
public class GeminiCandidate { public GeminiContent?     Content    { get; set; } }
public class GeminiContent   { public GeminiPart[]?      Parts      { get; set; } }
public class GeminiPart      { public string?            Text       { get; set; } }
