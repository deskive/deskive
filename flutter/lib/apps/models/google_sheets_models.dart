/// Google Sheets Connection model
class GoogleSheetsConnection {
  final String id;
  final String workspaceId;
  final String userId;
  final String? googleEmail;
  final String? googleName;
  final String? googlePicture;
  final bool isActive;
  final DateTime? lastSyncedAt;
  final DateTime createdAt;
  final DateTime updatedAt;

  GoogleSheetsConnection({
    required this.id,
    required this.workspaceId,
    required this.userId,
    this.googleEmail,
    this.googleName,
    this.googlePicture,
    required this.isActive,
    this.lastSyncedAt,
    required this.createdAt,
    required this.updatedAt,
  });

  factory GoogleSheetsConnection.fromJson(Map<String, dynamic> json) {
    final createdAtStr = json['createdAt'] as String? ?? json['created_at'] as String?;
    final updatedAtStr = json['updatedAt'] as String? ?? json['updated_at'] as String?;
    final now = DateTime.now();

    return GoogleSheetsConnection(
      id: json['id'] as String? ?? '',
      workspaceId: json['workspaceId'] as String? ?? json['workspace_id'] as String? ?? '',
      userId: json['userId'] as String? ?? json['user_id'] as String? ?? '',
      googleEmail: json['googleEmail'] as String? ?? json['google_email'] as String?,
      googleName: json['googleName'] as String? ?? json['google_name'] as String?,
      googlePicture: json['googlePicture'] as String? ?? json['google_picture'] as String?,
      isActive: json['isActive'] as bool? ?? json['is_active'] as bool? ?? false,
      lastSyncedAt: json['lastSyncedAt'] != null
          ? DateTime.parse(json['lastSyncedAt'] as String)
          : json['last_synced_at'] != null
              ? DateTime.parse(json['last_synced_at'] as String)
              : null,
      createdAt: createdAtStr != null ? DateTime.parse(createdAtStr) : now,
      updatedAt: updatedAtStr != null ? DateTime.parse(updatedAtStr) : now,
    );
  }

  Map<String, dynamic> toJson() {
    return {
      'id': id,
      'workspaceId': workspaceId,
      'userId': userId,
      'googleEmail': googleEmail,
      'googleName': googleName,
      'googlePicture': googlePicture,
      'isActive': isActive,
      'lastSyncedAt': lastSyncedAt?.toIso8601String(),
      'createdAt': createdAt.toIso8601String(),
      'updatedAt': updatedAt.toIso8601String(),
    };
  }

  /// Get relative time since last sync
  String get lastSyncedAgo {
    if (lastSyncedAt == null) return 'Never';

    final now = DateTime.now();
    final difference = now.difference(lastSyncedAt!);

    if (difference.inMinutes < 1) {
      return 'Just now';
    } else if (difference.inMinutes < 60) {
      return '${difference.inMinutes} min ago';
    } else if (difference.inHours < 24) {
      return '${difference.inHours} hours ago';
    } else {
      return '${difference.inDays} days ago';
    }
  }

  @override
  String toString() {
    return 'GoogleSheetsConnection(id: $id, email: $googleEmail, isActive: $isActive)';
  }
}

/// Google Spreadsheet model
class GoogleSpreadsheet {
  final String id;
  final String name;
  final String? url;
  final DateTime? createdTime;
  final DateTime? modifiedTime;
  final String? iconLink;
  final String? thumbnailLink;
  final List<GoogleSheet> sheets;

  GoogleSpreadsheet({
    required this.id,
    required this.name,
    this.url,
    this.createdTime,
    this.modifiedTime,
    this.iconLink,
    this.thumbnailLink,
    this.sheets = const [],
  });

  factory GoogleSpreadsheet.fromJson(Map<String, dynamic> json) {
    List<GoogleSheet> sheets = [];
    final sheetsData = json['sheets'];
    if (sheetsData is List) {
      sheets = sheetsData
          .map((item) => GoogleSheet.fromJson(
              item is Map<String, dynamic> ? item : <String, dynamic>{}))
          .toList();
    }

    return GoogleSpreadsheet(
      id: json['id'] as String? ?? json['spreadsheetId'] as String? ?? '',
      name: json['name'] as String? ?? json['title'] as String? ?? '',
      url: json['url'] as String? ?? json['spreadsheetUrl'] as String?,
      createdTime: json['createdTime'] != null
          ? DateTime.parse(json['createdTime'] as String)
          : json['created_time'] != null
              ? DateTime.parse(json['created_time'] as String)
              : null,
      modifiedTime: json['modifiedTime'] != null
          ? DateTime.parse(json['modifiedTime'] as String)
          : json['modified_time'] != null
              ? DateTime.parse(json['modified_time'] as String)
              : null,
      iconLink: json['iconLink'] as String? ?? json['icon_link'] as String?,
      thumbnailLink: json['thumbnailLink'] as String? ?? json['thumbnail_link'] as String?,
      sheets: sheets,
    );
  }

  Map<String, dynamic> toJson() {
    return {
      'id': id,
      'name': name,
      'url': url,
      'createdTime': createdTime?.toIso8601String(),
      'modifiedTime': modifiedTime?.toIso8601String(),
      'iconLink': iconLink,
      'thumbnailLink': thumbnailLink,
      'sheets': sheets.map((s) => s.toJson()).toList(),
    };
  }

  /// Get formatted modified time
  String get modifiedTimeAgo {
    if (modifiedTime == null) return 'Unknown';

    final now = DateTime.now();
    final difference = now.difference(modifiedTime!);

    if (difference.inMinutes < 1) {
      return 'Just now';
    } else if (difference.inMinutes < 60) {
      return '${difference.inMinutes}m ago';
    } else if (difference.inHours < 24) {
      return '${difference.inHours}h ago';
    } else if (difference.inDays == 1) {
      return 'Yesterday';
    } else if (difference.inDays < 7) {
      return '${difference.inDays} days ago';
    } else if (difference.inDays < 30) {
      final weeks = difference.inDays ~/ 7;
      return '$weeks week${weeks > 1 ? 's' : ''} ago';
    } else if (difference.inDays < 365) {
      final months = difference.inDays ~/ 30;
      return '$months month${months > 1 ? 's' : ''} ago';
    } else {
      final years = difference.inDays ~/ 365;
      return '$years year${years > 1 ? 's' : ''} ago';
    }
  }

  @override
  String toString() {
    return 'GoogleSpreadsheet(id: $id, name: $name, sheets: ${sheets.length})';
  }
}

/// Google Sheet model (individual tab within a spreadsheet)
class GoogleSheet {
  final int sheetId;
  final String title;
  final int index;
  final int? rowCount;
  final int? columnCount;
  final String? sheetType;

  GoogleSheet({
    required this.sheetId,
    required this.title,
    required this.index,
    this.rowCount,
    this.columnCount,
    this.sheetType,
  });

  factory GoogleSheet.fromJson(Map<String, dynamic> json) {
    // Handle nested properties format from Google Sheets API
    final properties = json['properties'] as Map<String, dynamic>? ?? json;
    final gridProperties = properties['gridProperties'] as Map<String, dynamic>? ??
                           json['gridProperties'] as Map<String, dynamic>? ?? {};

    return GoogleSheet(
      sheetId: properties['sheetId'] as int? ??
               json['sheetId'] as int? ??
               json['sheet_id'] as int? ?? 0,
      title: properties['title'] as String? ??
             json['title'] as String? ?? '',
      index: properties['index'] as int? ??
             json['index'] as int? ?? 0,
      rowCount: gridProperties['rowCount'] as int? ??
                json['rowCount'] as int? ??
                json['row_count'] as int?,
      columnCount: gridProperties['columnCount'] as int? ??
                   json['columnCount'] as int? ??
                   json['column_count'] as int?,
      sheetType: properties['sheetType'] as String? ??
                 json['sheetType'] as String? ??
                 json['sheet_type'] as String?,
    );
  }

  Map<String, dynamic> toJson() {
    return {
      'sheetId': sheetId,
      'title': title,
      'index': index,
      'rowCount': rowCount,
      'columnCount': columnCount,
      'sheetType': sheetType,
    };
  }

  @override
  String toString() {
    return 'GoogleSheet(sheetId: $sheetId, title: $title, rows: $rowCount, cols: $columnCount)';
  }
}

/// Google Sheet Data model (range and values)
class GoogleSheetData {
  final String range;
  final String majorDimension;
  final List<List<dynamic>> values;

  GoogleSheetData({
    required this.range,
    this.majorDimension = 'ROWS',
    required this.values,
  });

  factory GoogleSheetData.fromJson(Map<String, dynamic> json) {
    List<List<dynamic>> values = [];
    final valuesData = json['values'];
    if (valuesData is List) {
      values = valuesData.map((row) {
        if (row is List) {
          return row.toList();
        }
        return <dynamic>[];
      }).toList();
    }

    return GoogleSheetData(
      range: json['range'] as String? ?? '',
      majorDimension: json['majorDimension'] as String? ??
                      json['major_dimension'] as String? ?? 'ROWS',
      values: values,
    );
  }

  Map<String, dynamic> toJson() {
    return {
      'range': range,
      'majorDimension': majorDimension,
      'values': values,
    };
  }

  /// Get number of rows
  int get rowCount => values.length;

  /// Get number of columns (based on first row)
  int get columnCount => values.isNotEmpty ? values.first.length : 0;

  /// Get a specific cell value
  dynamic getCell(int row, int col) {
    if (row < 0 || row >= values.length) return null;
    if (col < 0 || col >= values[row].length) return null;
    return values[row][col];
  }

  /// Get a specific row
  List<dynamic>? getRow(int row) {
    if (row < 0 || row >= values.length) return null;
    return values[row];
  }

  /// Get headers (first row)
  List<dynamic> get headers => values.isNotEmpty ? values.first : [];

  /// Get data rows (excluding headers)
  List<List<dynamic>> get dataRows => values.length > 1 ? values.sublist(1) : [];

  @override
  String toString() {
    return 'GoogleSheetData(range: $range, rows: $rowCount, cols: $columnCount)';
  }
}

/// Request parameters for listing spreadsheets
class ListSpreadsheetsParams {
  final int page;
  final int limit;
  final String? query;
  final String orderBy;

  ListSpreadsheetsParams({
    this.page = 1,
    this.limit = 20,
    this.query,
    this.orderBy = 'modifiedTime desc',
  });

  Map<String, String> toQueryParams() {
    final params = <String, String>{
      'page': page.toString(),
      'limit': limit.toString(),
      'orderBy': orderBy,
    };
    if (query != null && query!.isNotEmpty) {
      params['query'] = query!;
    }
    return params;
  }
}

/// Request parameters for updating sheet data
class UpdateSheetDataRequest {
  final String range;
  final List<List<dynamic>> values;
  final String valueInputOption;

  UpdateSheetDataRequest({
    required this.range,
    required this.values,
    this.valueInputOption = 'USER_ENTERED',
  });

  Map<String, dynamic> toJson() {
    return {
      'range': range,
      'values': values,
      'valueInputOption': valueInputOption,
    };
  }
}

/// Request parameters for appending rows
class AppendRowsRequest {
  final String sheetName;
  final List<List<dynamic>> rows;
  final String valueInputOption;
  final String insertDataOption;

  AppendRowsRequest({
    required this.sheetName,
    required this.rows,
    this.valueInputOption = 'USER_ENTERED',
    this.insertDataOption = 'INSERT_ROWS',
  });

  Map<String, dynamic> toJson() {
    return {
      'sheetName': sheetName,
      'rows': rows,
      'valueInputOption': valueInputOption,
      'insertDataOption': insertDataOption,
    };
  }
}

/// Response for spreadsheet list
class SpreadsheetListResponse {
  final List<GoogleSpreadsheet> spreadsheets;
  final int total;
  final int page;
  final int limit;
  final bool hasMore;

  SpreadsheetListResponse({
    required this.spreadsheets,
    required this.total,
    required this.page,
    required this.limit,
    required this.hasMore,
  });

  factory SpreadsheetListResponse.fromJson(Map<String, dynamic> json) {
    List<GoogleSpreadsheet> spreadsheets = [];
    final data = json['spreadsheets'] ?? json['files'] ?? json['data'];
    if (data is List) {
      spreadsheets = data
          .map((item) => GoogleSpreadsheet.fromJson(
              item is Map<String, dynamic> ? item : <String, dynamic>{}))
          .toList();
    }

    return SpreadsheetListResponse(
      spreadsheets: spreadsheets,
      total: json['total'] as int? ?? spreadsheets.length,
      page: json['page'] as int? ?? 1,
      limit: json['limit'] as int? ?? 20,
      hasMore: json['hasMore'] as bool? ?? json['has_more'] as bool? ?? false,
    );
  }
}
