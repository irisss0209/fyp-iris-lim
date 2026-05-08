using System.Net.Http.Json;
using System.Text.Json;

namespace backend.Services;

public class GeminiService : IGeminiService
{
    private readonly IHttpClientFactory _factory;
    private readonly IConfiguration _config;
    private const string Model = "gemini-2.0-flash";
    private const string Fallback = "AI insights are currently unavailable.";

    public GeminiService(IHttpClientFactory factory, IConfiguration config)
    {
        _factory = factory;
        _config = config;
    }

    public async Task<string> GenerateAsync(string prompt, CancellationToken ct = default)
    {
        var apiKey = _config["Gemini:ApiKey"] ?? "";
        if (string.IsNullOrWhiteSpace(apiKey)) return Fallback;

        try
        {
            var http = _factory.CreateClient();
            var url = $"https://generativelanguage.googleapis.com/v1beta/models/{Model}:generateContent?key={apiKey}";
            var body = new
            {
                contents = new[] { new { parts = new[] { new { text = prompt } } } }
            };

            var response = await http.PostAsJsonAsync(url, body, ct);
            if (!response.IsSuccessStatusCode) return Fallback;

            var opts = new JsonSerializerOptions { PropertyNameCaseInsensitive = true };
            var result = await response.Content.ReadFromJsonAsync<GeminiResponse>(opts, ct);
            return result?.Candidates?[0]?.Content?.Parts?[0]?.Text?.Trim() ?? Fallback;
        }
        catch
        {
            return Fallback;
        }
    }
}

public class GeminiResponse { public GeminiCandidate[]? Candidates { get; set; } }
public class GeminiCandidate { public GeminiContent? Content { get; set; } }
public class GeminiContent { public GeminiPart[]? Parts { get; set; } }
public class GeminiPart { public string? Text { get; set; } }
