import 'dart:io' show Platform;
import 'package:dio/dio.dart';
import '../../api/base_api_client.dart';
import '../../services/workspace_service.dart';
import '../models/google_sheets_models.dart';
import 'native_google_signin_service.dart';

/// Service for Google Sheets integration
/// Uses existing backend endpoints at /workspaces/:workspaceId/google-sheets/
class GoogleSheetsService {
  static final GoogleSheetsService _instance = GoogleSheetsService._internal();
  static GoogleSheetsService get instance => _instance;

  GoogleSheetsService._internal();

  /// Default constructor for backward compatibility
  factory GoogleSheetsService() => _instance;

  final BaseApiClient _apiClient = BaseApiClient.instance;
  final WorkspaceService _workspaceService = WorkspaceService.instance;

  /// Get current workspace ID
  String? get _workspaceId => _workspaceService.currentWorkspace?.id;

  /// Helper to extract data from various response formats
  dynamic _extractData(dynamic responseData) {
    if (responseData is Map<String, dynamic>) {
      // Check for nested data field
      if (responseData.containsKey('data')) {
        return responseData['data'];
      }
      return responseData;
    }
    return responseData;
  }

  // ==================== OAuth & Connection ====================

  /// Native Google Sign-In service instance
  final NativeGoogleSignInService _nativeSignInService =
      NativeGoogleSignInService.instance;

  /// Connect to Google Sheets using native sign-in (recommended for mobile)
  /// This uses the device's native Google Sign-In UI and bypasses web OAuth
  Future<GoogleSheetsConnection> connectWithNativeSignIn() async {
    return _nativeSignInService.connectWithNativeSignIn();
  }

  /// Connect to Google Sheets - automatically uses native sign-in on mobile
  /// Falls back to web OAuth URL method if native fails
  Future<GoogleSheetsConnection?> connect() async {
    // On mobile platforms, use native sign-in
    if (Platform.isIOS || Platform.isAndroid) {
      try {
        return await connectWithNativeSignIn();
      } catch (e) {
        // If native sign-in fails with cancellation, don't fall back
        if (e.toString().contains('cancelled') ||
            e.toString().contains('canceled')) {
          rethrow;
        }
        // For other errors, we could fall back to web OAuth if needed
        // but for now, rethrow the error
        rethrow;
      }
    }
    // On other platforms, return null to indicate web OAuth should be used
    return null;
  }

  /// Get OAuth authorization URL for Google Sheets (web OAuth flow)
  /// Backend expects POST /connect with { returnUrl } in body
  /// [returnUrl] - Deep link URL for mobile app callback (e.g., 'deskive://sheets')
  /// Note: On mobile, prefer using connectWithNativeSignIn() instead
  Future<Map<String, dynamic>> getAuthUrl({String? returnUrl}) async {
    final workspaceId = _workspaceId;
    if (workspaceId == null) {
      throw Exception('No workspace selected');
    }

    try {
      // Backend uses POST /connect with returnUrl in body
      final response = await _apiClient.post(
        '/workspaces/$workspaceId/google-sheets/connect',
        data: {
          if (returnUrl != null) 'returnUrl': returnUrl,
        },
      );

      final data = _extractData(response.data);
      if (data is Map<String, dynamic>) {
        return {
          'authorizationUrl': data['authorizationUrl'] as String? ?? '',
          'state': data['state'] as String? ?? '',
        };
      }

      throw Exception('Invalid response format');
    } on DioException catch (e) {
      throw Exception(
        e.response?.data?['message'] ?? 'Failed to get Google Sheets auth URL',
      );
    }
  }

  /// Get current Google Sheets connection status
  Future<GoogleSheetsConnection?> getConnection() async {
    final workspaceId = _workspaceId;
    if (workspaceId == null) {
      return null;
    }

    try {
      final response = await _apiClient.get(
        '/workspaces/$workspaceId/google-sheets/connection',
      );

      final data = _extractData(response.data);

      // Handle various response formats
      if (data is Map<String, dynamic>) {
        // Check for connected field
        if (data.containsKey('connected')) {
          final connected = data['connected'] as bool? ?? false;
          if (connected && data['data'] != null) {
            return GoogleSheetsConnection.fromJson(
              data['data'] as Map<String, dynamic>,
            );
          }
          return null;
        }

        // Direct connection object (has 'id' field)
        if (data.containsKey('id')) {
          return GoogleSheetsConnection.fromJson(data);
        }
      }

      return null;
    } on DioException catch (e) {
      // 404 means no connection exists - this is not an error
      if (e.response?.statusCode == 404) {
        return null;
      }
      throw Exception(
        e.response?.data?['message'] ?? 'Failed to get Google Sheets connection',
      );
    }
  }

  /// Disconnect Google Sheets from the workspace
  Future<void> disconnect() async {
    final workspaceId = _workspaceId;
    if (workspaceId == null) {
      throw Exception('No workspace selected');
    }

    try {
      await _apiClient.delete(
        '/workspaces/$workspaceId/google-sheets/disconnect',
      );
    } on DioException catch (e) {
      throw Exception(
        e.response?.data?['message'] ?? 'Failed to disconnect Google Sheets',
      );
    }
  }

  // ==================== Spreadsheets ====================

  /// List user's spreadsheets
  Future<SpreadsheetListResponse> listSpreadsheets({
    int page = 1,
    int limit = 20,
    String? query,
    String orderBy = 'modifiedTime desc',
  }) async {
    final workspaceId = _workspaceId;
    if (workspaceId == null) {
      throw Exception('No workspace selected');
    }

    try {
      final queryParams = <String, dynamic>{
        'pageSize': limit.toString(),
      };

      final response = await _apiClient.get(
        '/workspaces/$workspaceId/google-sheets/spreadsheets',
        queryParameters: queryParams,
      );

      final data = _extractData(response.data);
      if (data is Map<String, dynamic>) {
        // Backend returns { spreadsheets: [...], nextPageToken?: string }
        final spreadsheetsList = data['spreadsheets'] as List? ?? [];
        final spreadsheets = spreadsheetsList
            .map((item) => GoogleSpreadsheet.fromJson(
                item is Map<String, dynamic> ? item : <String, dynamic>{}))
            .toList();

        return SpreadsheetListResponse(
          spreadsheets: spreadsheets,
          total: spreadsheets.length,
          page: page,
          limit: limit,
          hasMore: data['nextPageToken'] != null,
        );
      }

      return SpreadsheetListResponse(
        spreadsheets: [],
        total: 0,
        page: page,
        limit: limit,
        hasMore: false,
      );
    } on DioException catch (e) {
      throw Exception(
        e.response?.data?['message'] ?? 'Failed to list spreadsheets',
      );
    }
  }

  /// Get a specific spreadsheet with its sheets
  Future<GoogleSpreadsheet> getSpreadsheet(String spreadsheetId) async {
    final workspaceId = _workspaceId;
    if (workspaceId == null) {
      throw Exception('No workspace selected');
    }

    try {
      final response = await _apiClient.get(
        '/workspaces/$workspaceId/google-sheets/spreadsheets/$spreadsheetId',
      );

      final data = _extractData(response.data);
      if (data is Map<String, dynamic>) {
        return GoogleSpreadsheet.fromJson(data);
      }

      throw Exception('Invalid response format');
    } on DioException catch (e) {
      throw Exception(
        e.response?.data?['message'] ?? 'Failed to get spreadsheet',
      );
    }
  }

  /// Get sheets (tabs) from a spreadsheet
  Future<List<GoogleSheet>> getSheets(String spreadsheetId) async {
    final workspaceId = _workspaceId;
    if (workspaceId == null) {
      throw Exception('No workspace selected');
    }

    try {
      final response = await _apiClient.get(
        '/workspaces/$workspaceId/google-sheets/spreadsheets/$spreadsheetId/sheets',
      );

      final data = _extractData(response.data);
      List<GoogleSheet> sheets = [];

      if (data is Map<String, dynamic>) {
        final sheetsData = data['sheets'] ?? data['data'];
        if (sheetsData is List) {
          sheets = sheetsData
              .map((item) => GoogleSheet.fromJson(
                  item is Map<String, dynamic> ? item : <String, dynamic>{}))
              .toList();
        }
      } else if (data is List) {
        sheets = data
            .map((item) => GoogleSheet.fromJson(
                item is Map<String, dynamic> ? item : <String, dynamic>{}))
            .toList();
      }

      return sheets;
    } on DioException catch (e) {
      throw Exception(
        e.response?.data?['message'] ?? 'Failed to get sheets',
      );
    }
  }

  // ==================== Sheet Data ====================

  /// Get data from a sheet
  /// Backend expects: GET /spreadsheets/:id/sheets/:sheetName/rows?range=
  /// [spreadsheetId] - The spreadsheet ID
  /// [sheetName] - The sheet name
  /// [range] - Optional range in A1 notation (e.g., 'A1:D10')
  Future<GoogleSheetData> getSheetData(
    String spreadsheetId,
    String sheetNameOrRange,
  ) async {
    final workspaceId = _workspaceId;
    if (workspaceId == null) {
      throw Exception('No workspace selected');
    }

    try {
      // Parse the range to extract sheet name and range
      String sheetName;
      String? range;

      if (sheetNameOrRange.contains('!')) {
        final parts = sheetNameOrRange.split('!');
        sheetName = parts[0];
        range = parts.length > 1 ? parts[1] : null;
      } else {
        sheetName = sheetNameOrRange;
      }

      final queryParams = <String, dynamic>{};
      if (range != null) {
        queryParams['range'] = range;
      }

      final response = await _apiClient.get(
        '/workspaces/$workspaceId/google-sheets/spreadsheets/$spreadsheetId/sheets/${Uri.encodeComponent(sheetName)}/rows',
        queryParameters: queryParams.isNotEmpty ? queryParams : null,
      );

      final data = _extractData(response.data);
      if (data is Map<String, dynamic>) {
        return GoogleSheetData.fromJson(data);
      }

      return GoogleSheetData(range: sheetNameOrRange, values: []);
    } on DioException catch (e) {
      throw Exception(
        e.response?.data?['message'] ?? 'Failed to get sheet data',
      );
    }
  }

  /// Update data in a sheet
  /// Backend expects: PUT /spreadsheets/:id/sheets/:sheetName/rows
  /// [spreadsheetId] - The spreadsheet ID
  /// [sheetName] - The sheet name
  /// [range] - The A1 notation range
  /// [values] - The 2D array of values to write
  /// [valueInputOption] - How to interpret input ('RAW' or 'USER_ENTERED')
  Future<void> updateSheetData(
    String spreadsheetId,
    String sheetNameOrRange,
    List<List<dynamic>> values, {
    String valueInputOption = 'USER_ENTERED',
  }) async {
    final workspaceId = _workspaceId;
    if (workspaceId == null) {
      throw Exception('No workspace selected');
    }

    try {
      // Parse the range to extract sheet name and range
      String sheetName;
      String range;

      if (sheetNameOrRange.contains('!')) {
        final parts = sheetNameOrRange.split('!');
        sheetName = parts[0];
        range = parts.length > 1 ? parts[1] : 'A1';
      } else {
        sheetName = sheetNameOrRange;
        range = 'A1';
      }

      await _apiClient.put(
        '/workspaces/$workspaceId/google-sheets/spreadsheets/$spreadsheetId/sheets/${Uri.encodeComponent(sheetName)}/rows',
        data: {
          'range': range,
          'values': values,
          'valueInputOption': valueInputOption,
        },
      );
    } on DioException catch (e) {
      throw Exception(
        e.response?.data?['message'] ?? 'Failed to update sheet data',
      );
    }
  }

  /// Append rows to a sheet
  /// Backend expects: POST /spreadsheets/:id/sheets/:sheetName/rows
  /// [spreadsheetId] - The spreadsheet ID
  /// [sheetName] - The sheet name to append to
  /// [rows] - The rows to append
  Future<void> appendRows(
    String spreadsheetId,
    String sheetName,
    List<List<dynamic>> rows, {
    String valueInputOption = 'USER_ENTERED',
  }) async {
    final workspaceId = _workspaceId;
    if (workspaceId == null) {
      throw Exception('No workspace selected');
    }

    try {
      await _apiClient.post(
        '/workspaces/$workspaceId/google-sheets/spreadsheets/$spreadsheetId/sheets/${Uri.encodeComponent(sheetName)}/rows',
        data: {
          'values': rows,
          'valueInputOption': valueInputOption,
        },
      );
    } on DioException catch (e) {
      throw Exception(
        e.response?.data?['message'] ?? 'Failed to append rows',
      );
    }
  }

  // ==================== Create & Manage ====================

  /// Create a new spreadsheet
  /// Backend expects: POST /spreadsheets with { title, sheets?: [] }
  /// [title] - The title of the new spreadsheet
  /// [sheets] - Optional list of sheet names to create
  Future<GoogleSpreadsheet> createSpreadsheet(
    String title, {
    List<String>? sheets,
  }) async {
    final workspaceId = _workspaceId;
    if (workspaceId == null) {
      throw Exception('No workspace selected');
    }

    try {
      final response = await _apiClient.post(
        '/workspaces/$workspaceId/google-sheets/spreadsheets',
        data: {
          'title': title,
          if (sheets != null) 'sheets': sheets,
        },
      );

      final data = _extractData(response.data);
      if (data is Map<String, dynamic>) {
        // Backend returns { spreadsheetId, spreadsheetUrl, title }
        return GoogleSpreadsheet(
          id: data['spreadsheetId'] ?? '',
          name: data['title'] ?? title,
          url: data['spreadsheetUrl'],
        );
      }

      throw Exception('Invalid response format');
    } on DioException catch (e) {
      throw Exception(
        e.response?.data?['message'] ?? 'Failed to create spreadsheet',
      );
    }
  }

  /// Get column headers from a sheet
  /// Backend expects: GET /spreadsheets/:id/sheets/:sheetName/columns
  Future<List<String>> getColumnHeaders(
    String spreadsheetId,
    String sheetName,
  ) async {
    final workspaceId = _workspaceId;
    if (workspaceId == null) {
      throw Exception('No workspace selected');
    }

    try {
      final response = await _apiClient.get(
        '/workspaces/$workspaceId/google-sheets/spreadsheets/$spreadsheetId/sheets/${Uri.encodeComponent(sheetName)}/columns',
      );

      final data = _extractData(response.data);
      if (data is List) {
        return data.map((item) {
          if (item is Map<String, dynamic>) {
            return item['label']?.toString() ?? item['value']?.toString() ?? '';
          }
          return item.toString();
        }).toList();
      }

      return [];
    } on DioException catch (e) {
      throw Exception(
        e.response?.data?['message'] ?? 'Failed to get column headers',
      );
    }
  }

  /// Clear data from a range
  /// Backend expects: DELETE /spreadsheets/:id/sheets/:sheetName/clear?range=
  /// [spreadsheetId] - The spreadsheet ID
  /// [sheetName] - The sheet name
  /// [range] - The A1 notation range to clear
  Future<void> clearRange(
    String spreadsheetId,
    String sheetName,
    String range,
  ) async {
    final workspaceId = _workspaceId;
    if (workspaceId == null) {
      throw Exception('No workspace selected');
    }

    try {
      await _apiClient.delete(
        '/workspaces/$workspaceId/google-sheets/spreadsheets/$spreadsheetId/sheets/${Uri.encodeComponent(sheetName)}/clear',
        queryParameters: {'range': range},
      );
    } on DioException catch (e) {
      throw Exception(
        e.response?.data?['message'] ?? 'Failed to clear range',
      );
    }
  }

  /// Append or update a row based on matching column
  /// Backend expects: POST /spreadsheets/:id/sheets/:sheetName/upsert
  Future<void> appendOrUpdateRow(
    String spreadsheetId,
    String sheetName,
    Map<String, dynamic> columns, {
    String? columnToMatchOn,
    String? valueToMatch,
    String valueInputOption = 'USER_ENTERED',
    bool appendIfNotFound = true,
  }) async {
    final workspaceId = _workspaceId;
    if (workspaceId == null) {
      throw Exception('No workspace selected');
    }

    try {
      await _apiClient.post(
        '/workspaces/$workspaceId/google-sheets/spreadsheets/$spreadsheetId/sheets/${Uri.encodeComponent(sheetName)}/upsert',
        data: {
          'columns': columns,
          if (columnToMatchOn != null) 'columnToMatchOn': columnToMatchOn,
          if (valueToMatch != null) 'valueToMatch': valueToMatch,
          'valueInputOption': valueInputOption,
          'appendIfNotFound': appendIfNotFound,
        },
      );
    } on DioException catch (e) {
      throw Exception(
        e.response?.data?['message'] ?? 'Failed to upsert row',
      );
    }
  }
}
