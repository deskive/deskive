import 'package:flutter/foundation.dart';
import '../services/auth_service.dart';
import '../models/user.dart';

/// Provider for managing authentication state throughout the app
class AuthProvider extends ChangeNotifier {
  static AuthProvider? _instance;
  static AuthProvider get instance => _instance ??= AuthProvider._();
  
  AuthProvider._() {
    // Listen to auth service changes
    _authService.addListener(_onAuthStateChanged);
  }
  
  final AuthService _authService = AuthService.instance;
  
  // Getters that delegate to auth service
  bool get isInitialized => _authService.isInitialized;
  bool get isAuthenticated => _authService.isAuthenticated;
  User? get currentUser => _authService.currentUser;
  String? get currentSession => _authService.currentSession;
  
  /// Initialize the auth provider
  Future<void> initialize() async {
    await _authService.initialize();
    notifyListeners();
  }
  
  /// Sign up with email and password
  Future<User> signUp({
    required String email,
    required String password,
    required String name,
    String? workspaceId,
  }) async {
    final user = await _authService.signUp(
      email: email,
      password: password,
      name: name,
      workspaceId: workspaceId,
    );
    notifyListeners();
    return user;
  }
  
  /// Sign in with email and password
  Future<User> signIn({
    required String email,
    required String password,
  }) async {
    final user = await _authService.signIn(
      email: email,
      password: password,
    );
    notifyListeners();
    return user;
  }
  
  /// Sign out
  Future<void> signOut() async {
    await _authService.signOut();
    notifyListeners();
  }
  
  /// Refresh the current session
  Future<void> refreshSession() async {
    await _authService.refreshSession();
    notifyListeners();
  }
  
  /// Reset password
  Future<void> resetPassword(String email) async {
    await _authService.resetPassword(email);
  }
  
  /// OAuth sign in
  Future<User> signInWithOAuth({
    required String provider,
    required String redirectUrl,
  }) async {
    final user = await _authService.signInWithOAuth(
      provider: provider,
      redirectUrl: redirectUrl,
    );
    notifyListeners();
    return user;
  }
  
  /// Handle OAuth callback
  Future<User> handleOAuthCallback({
    required String provider,
    required String code,
    required String state,
  }) async {
    final user = await _authService.handleOAuthCallback(
      provider: provider,
      code: code,
    );
    notifyListeners();
    return user;
  }
  
  /// Called when auth service state changes
  void _onAuthStateChanged() {
    notifyListeners();
  }
  
  @override
  void dispose() {
    _authService.removeListener(_onAuthStateChanged);
    super.dispose();
  }
}