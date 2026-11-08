import 'dart:developer' as developer;
import 'package:shared_preferences/shared_preferences.dart';
import 'package:http/http.dart' as http;
import 'dart:convert';
import 'api_config.dart';

class AuthResponse {
  final bool success;
  final String? message;
  
  AuthResponse({required this.success, this.message});
}

class AuthService {
  static const String _tokenKey = 'auth_token';
  static const String _userKey = 'user_data';
  static String? _lastError;

  Future<bool> isLoggedIn() async {
    final prefs = await SharedPreferences.getInstance();
    return prefs.containsKey(_tokenKey);
  }

  Future<String?> getToken() async {
    final prefs = await SharedPreferences.getInstance();
    return prefs.getString(_tokenKey);
  }

  Future<Map<String, dynamic>?> getUser() async {
    final prefs = await SharedPreferences.getInstance();
    final userJson = prefs.getString(_userKey);
    if (userJson != null) {
      return jsonDecode(userJson);
    }
    return null;
  }

  String? getLastError() => _lastError;

  Future<bool> login(String email, String password) async {
    try {
      developer.log('[AUTH] Attempting login for: $email', name: 'AuthService');
      developer.log(
        '[AUTH] API URL: ${ApiConfig.uri('auth/login')}',
        name: 'AuthService',
      );

      final response = await http
          .post(
            ApiConfig.uri('auth/login'),
        headers: {'Content-Type': 'application/json'},
            body: jsonEncode({'email': email, 'password': password}),
          )
          .timeout(
            const Duration(seconds: 60),
            onTimeout: () {
              throw Exception(
                'Request timeout - server not responding. Check if server is running on port 5000',
              );
            },
          );

      developer.log(
        '[AUTH] Response status: ${response.statusCode}',
        name: 'AuthService',
      );
      developer.log(
        '[AUTH] Response body: ${response.body}',
        name: 'AuthService',
      );

      if (response.statusCode == 200) {
        final data = jsonDecode(response.body);
        final prefs = await SharedPreferences.getInstance();
        await prefs.setString(_tokenKey, data['token']);
        await prefs.setString(_userKey, jsonEncode(data['user']));
        developer.log('[AUTH] Login successful!', name: 'AuthService');
        _lastError = null;
        return true;
      } else if (response.statusCode == 401) {
        try {
          final data = jsonDecode(response.body);
          _lastError = data['message'] ?? 'Invalid email or password';
        } catch (_) {
          _lastError = 'Invalid email or password';
        }
        developer.log(
          '[AUTH] Invalid credentials: $_lastError',
          name: 'AuthService',
        );
        return false;
      } else {
        try {
          final data = jsonDecode(response.body);
          _lastError =
              data['message'] ?? 'Server error: ${response.statusCode}';
        } catch (_) {
          _lastError = 'Server error: ${response.statusCode}';
        }
        developer.log('[AUTH] Server error: $_lastError', name: 'AuthService');
        return false;
      }
    } on http.ClientException catch (e) {
      _lastError =
          'Connection error: ${e.message}. Check if server is running.';
      developer.log('[AUTH] Connection error: $e', name: 'AuthService');
      return false;
    } catch (e) {
      _lastError = e.toString();
      developer.log('[AUTH] Login error: $e', name: 'AuthService');
      return false;
    }
  }

  Future<bool> register(String email, String password, String name) async {
    try {
      developer.log(
        '[AUTH] Attempting register for: $email',
        name: 'AuthService',
      );

      final response = await http
          .post(
            ApiConfig.uri('auth/register'),
        headers: {'Content-Type': 'application/json'},
        body: jsonEncode({
          'email': email,
          'password': password,
          'name': name,
        }),
          )
          .timeout(const Duration(seconds: 60));

      developer.log(
        '[AUTH] Response status: ${response.statusCode}',
        name: 'AuthService',
      );

      if (response.statusCode == 201) {
        final data = jsonDecode(response.body);
        final prefs = await SharedPreferences.getInstance();
        await prefs.setString(_tokenKey, data['token']);
        await prefs.setString(_userKey, jsonEncode(data['user']));
        _lastError = null;
        return true;
      } else {
        try {
          final data = jsonDecode(response.body);
          _lastError = data['message'] ?? 'Registration failed';
        } catch (_) {
          _lastError = 'Registration failed';
        }
        return false;
      }
    } catch (e) {
      _lastError = e.toString();
      developer.log('[AUTH] Register error: $e', name: 'AuthService');
      return false;
    }
  }

  Future<void> logout() async {
    final prefs = await SharedPreferences.getInstance();
    await prefs.remove(_tokenKey);
    await prefs.remove(_userKey);
  }
}
