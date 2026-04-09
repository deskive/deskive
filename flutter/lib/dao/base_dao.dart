/// Abstract base DAO interface defining common CRUD operations
abstract class BaseDao {
  /// GET request
  Future<T> get<T>(
    String endpoint, {
    Map<String, dynamic>? queryParameters,
  });

  /// POST request
  Future<T> post<T>(
    String endpoint, {
    dynamic data,
    Map<String, dynamic>? queryParameters,
  });

  /// PUT request
  Future<T> put<T>(
    String endpoint, {
    dynamic data,
    Map<String, dynamic>? queryParameters,
  });

  /// PATCH request
  Future<T> patch<T>(
    String endpoint, {
    dynamic data,
    Map<String, dynamic>? queryParameters,
  });

  /// DELETE request
  Future<T> delete<T>(
    String endpoint, {
    dynamic data,
    Map<String, dynamic>? queryParameters,
  });
}
