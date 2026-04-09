// Stub file for dart:io classes on web platform
// This provides no-op implementations that throw errors if used

/// Stub File class for web platform
class File {
  final String path;

  File(this.path);

  Future<bool> exists() async {
    throw UnsupportedError('File operations are not supported on web');
  }

  Future<List<int>> readAsBytes() async {
    throw UnsupportedError('File operations are not supported on web');
  }

  Future<String> readAsString() async {
    throw UnsupportedError('File operations are not supported on web');
  }

  Future<File> writeAsString(String contents) async {
    throw UnsupportedError('File operations are not supported on web');
  }

  Future<File> writeAsBytes(List<int> bytes) async {
    throw UnsupportedError('File operations are not supported on web');
  }
}

/// Stub Directory class for web platform
class Directory {
  final String path;

  Directory(this.path);

  Future<bool> exists() async {
    throw UnsupportedError('Directory operations are not supported on web');
  }

  Future<Directory> create({bool recursive = false}) async {
    throw UnsupportedError('Directory operations are not supported on web');
  }
}

/// Stub Platform class for web platform
class Platform {
  static bool get isAndroid => false;
  static bool get isIOS => false;
  static bool get isWindows => false;
  static bool get isMacOS => false;
  static bool get isLinux => false;
  static bool get isFuchsia => false;
}
