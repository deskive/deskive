import 'package:flutter/foundation.dart';
import '../message/chat_screen.dart';

class BookmarkService extends ChangeNotifier {
  static final BookmarkService _instance = BookmarkService._internal();
  factory BookmarkService() => _instance;
  BookmarkService._internal();

  final List<ChatMessage> _bookmarkedMessages = [];

  List<ChatMessage> get bookmarkedMessages => List.unmodifiable(_bookmarkedMessages);

  bool isBookmarked(String messageId) {
    return _bookmarkedMessages.any((message) => message.id == messageId);
  }

  void addBookmark(ChatMessage message) {
    if (!isBookmarked(message.id)) {
      _bookmarkedMessages.add(message);
      notifyListeners();
    }
  }

  void removeBookmark(String messageId) {
    _bookmarkedMessages.removeWhere((message) => message.id == messageId);
    notifyListeners();
  }

  void toggleBookmark(ChatMessage message) {
    if (isBookmarked(message.id)) {
      removeBookmark(message.id);
    } else {
      addBookmark(message);
    }
  }

  int get bookmarkCount => _bookmarkedMessages.length;
}