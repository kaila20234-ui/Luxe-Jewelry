class ApiConfig {
  static const String baseUrl = String.fromEnvironment(
    'API_BASE_URL',
    defaultValue: 'http://10.0.2.2:5000/api',
  );

  static Uri uri(String path, {Map<String, String>? queryParameters}) {
    final normalizedBase = baseUrl.endsWith('/')
        ? baseUrl.substring(0, baseUrl.length - 1)
        : baseUrl;
    final normalizedPath = path.startsWith('/') ? path.substring(1) : path;

    return Uri.parse('$normalizedBase/$normalizedPath').replace(
      queryParameters: queryParameters,
    );
  }
}
