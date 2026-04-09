import 'dart:convert';
import 'dart:typed_data';
import 'dart:io';
import 'package:flutter_secure_storage/flutter_secure_storage.dart';
import 'package:pinenacl/api.dart' show EncryptedMessage;
import 'package:pinenacl/encoding.dart';
import 'package:pinenacl/x25519.dart';
import 'package:pinenacl/tweetnacl.dart';
import 'dart:math';
import '../../api/services/crypto_api_service.dart';

/// E2EE Service using PineNaCl (XSalsa20-Poly1305)
class EncryptionService {
  static final EncryptionService _instance = EncryptionService._internal();
  factory EncryptionService() => _instance;
  EncryptionService._internal();

  final _secureStorage = const FlutterSecureStorage();
  String? _currentUserId;
  PrivateKey? _privateKey;
  Map<String, Uint8List> _conversationKeys = {};
  bool _initialized = false;

  bool get isInitialized => _initialized;
  String? get currentUserId => _currentUserId;

  Future<void> initialize(String userId) async {
    try {
      _currentUserId = userId;
      print('🔐 Init E2EE: $userId');

      final stored = await _loadKeys(userId);
      String? deviceId;

      if (stored != null) {
        _privateKey = stored['privateKey'];
        _conversationKeys = stored['conversationKeys'];
        deviceId = stored['deviceId'];
        print('✓ Loaded keys');

        // Upload existing public key to server
        print('📤 Uploading existing public key to server...');
        await _uploadPublicKey(userId, deviceId ?? _genDeviceId());
      } else {
        _privateKey = PrivateKey.generate();
        _conversationKeys = {};
        deviceId = _genDeviceId();
        await _saveKeys(userId);
        print('✓ Generated keys');

        // Upload new public key to server
        await _uploadPublicKey(userId, deviceId);
      }

      _initialized = true;
      print('✅ E2EE ready');
    } catch (e) {
      print('❌ E2EE failed: $e');
    }
  }

  /// Upload public key to server
  Future<void> _uploadPublicKey(String userId, String deviceId) async {
    if (_privateKey == null) return;

    try {
      final publicKeyBytes = Uint8List.fromList(_privateKey!.publicKey.toList());
      final publicKey = base64.encode(publicKeyBytes);
      final deviceName = _getDeviceName();

      print('📤 Uploading public key:');
      print('   Key (first 20 chars): ${publicKey.substring(0, 20)}...');
      print('   Key length: ${publicKeyBytes.length} bytes');
      print('   Device: $deviceName');

      await CryptoApiService.instance.uploadPublicKey(
        userId: userId,
        publicKey: publicKey,
        deviceId: deviceId,
        deviceName: deviceName,
      );
    } catch (e) {
      print('⚠️ Failed to upload public key: $e');
      // Non-fatal, encryption can still work locally
    }
  }

  /// Get device name
  String _getDeviceName() {
    try {
      if (Platform.isAndroid) {
        return 'Android';
      } else if (Platform.isIOS) {
        return 'iOS';
      } else if (Platform.isWindows) {
        return 'Windows';
      } else if (Platform.isMacOS) {
        return 'macOS';
      } else if (Platform.isLinux) {
        return 'Linux';
      } else {
        return 'Unknown Device';
      }
    } catch (e) {
      return 'Mobile Device';
    }
  }

  Future<Map<String, dynamic>> encryptMessage(String conversationId, String plaintext) async {
    if (!_initialized) throw Exception('Not initialized');

    Uint8List symmetricKey;
    if (_conversationKeys.containsKey(conversationId)) {
      symmetricKey = _conversationKeys[conversationId]!;
      print('🔐 Using existing conversation key for: $conversationId');
    } else {
      symmetricKey = _genKey();
      _conversationKeys[conversationId] = symmetricKey;
      if (_currentUserId != null) await _saveKeys(_currentUserId!);
      print('🔐 Generated new conversation key for: $conversationId');
    }

    // Use TweetNaCl.crypto_secretbox for symmetric encryption
    final nonce = _genNonce();
    final messageBytes = Uint8List.fromList(utf8.encode(plaintext));

    print('🔐 ENCRYPTION DEBUG:');
    print('   Conversation ID: $conversationId');
    print('   Key (first 20): ${base64.encode(symmetricKey).substring(0, 20)}');
    print('   Key length: ${symmetricKey.length} bytes');
    print('   Message: ${plaintext.substring(0, plaintext.length < 50 ? plaintext.length : 50)}');
    print('   Message length: ${messageBytes.length} bytes');
    print('   Nonce length: ${nonce.length} bytes');
    print('   Nonce (first 20): ${base64.encode(nonce).substring(0, 20)}');

    // Allocate output buffer: message + crypto_secretbox_BOXZEROBYTES (32 bytes for auth tag)
    final int mlen = messageBytes.length;
    final paddedMessage = Uint8List(32 + mlen);
    paddedMessage.setRange(32, 32 + mlen, messageBytes);

    final cipherText = Uint8List(paddedMessage.length);
    TweetNaCl.crypto_secretbox(cipherText, paddedMessage, paddedMessage.length, nonce, symmetricKey);

    // Remove the first 16 bytes (boxzerobytes) to get the actual ciphertext
    final actualCipherText = cipherText.sublist(16);

    print('🔐 ENCRYPTION - Encrypted length: ${actualCipherText.length} bytes');

    return {
      'encryptedContent': base64.encode(actualCipherText),
      'encryptionMetadata': {
        'algorithm': 'x25519-xsalsa20-poly1305',
        'version': '1.0',
        'nonce': base64.encode(nonce),
        'conversationId': conversationId,
      },
    };
  }

  Future<String> decryptMessage(Map<String, dynamic> msg) async {
    if (!_initialized) throw Exception('Not initialized');

    // Support both formats
    final meta = msg['encryption_metadata'] ?? msg['encryptionMetadata'];
    if (meta == null) throw Exception('No metadata');

    final convId = meta['conversationId'];
    final symmetricKey = _conversationKeys[convId];
    if (symmetricKey == null) throw Exception('No key for: $convId');

    final cipherText = base64.decode(msg['encrypted_content'] ?? msg['encryptedContent']);
    final nonce = base64.decode(meta['nonce']);

    print('🔓 DECRYPTION DEBUG:');
    print('   Conversation ID: $convId');
    print('   Key (first 20): ${base64.encode(symmetricKey).substring(0, 20)}');
    print('   Key length: ${symmetricKey.length} bytes');
    print('   CipherText length: ${cipherText.length} bytes');
    print('   CipherText (first 20): ${base64.encode(cipherText).substring(0, cipherText.length < 20 ? cipherText.length : 20)}');
    print('   Nonce length: ${nonce.length} bytes');
    print('   Nonce (first 20): ${base64.encode(nonce).substring(0, 20)}');

    // Pad the ciphertext with 16 zero bytes at the beginning (boxzerobytes)
    final paddedCipherText = Uint8List(16 + cipherText.length);
    paddedCipherText.setRange(16, 16 + cipherText.length, cipherText);

    print('   Padded ciphertext length: ${paddedCipherText.length} bytes');

    // Allocate output buffer
    final decryptedPadded = Uint8List(paddedCipherText.length);

    // Decrypt using TweetNaCl
    print('   Calling TweetNaCl.crypto_secretbox_open...');
    final result = TweetNaCl.crypto_secretbox_open(
      decryptedPadded,
      paddedCipherText,
      paddedCipherText.length,
      nonce,
      symmetricKey,
    );

    print('   Decryption completed');

    // The result is the decrypted data (Uint8List), not a status code
    // Remove the first 32 bytes (zerobytes padding) to get the actual message
    final actualMessage = result is Uint8List && result.length > 32
        ? result.sublist(32)
        : decryptedPadded.sublist(32);

    final plaintext = utf8.decode(actualMessage);
    print('✅ DECRYPTION successful: ${plaintext.substring(0, plaintext.length < 50 ? plaintext.length : 50)}');
    return plaintext;
  }

  bool hasConversationKey(String id) => _conversationKeys.containsKey(id);
  String? getConversationKey(String id) => _conversationKeys[id] != null ? base64.encode(_conversationKeys[id]!) : null;

  /// Get public key for the current user
  String? getPublicKey() {
    if (_privateKey == null) return null;
    final publicKeyBytes = Uint8List.fromList(_privateKey!.publicKey.toList());
    return base64.encode(publicKeyBytes);
  }

  /// Encrypt data for a specific user (for sharing conversation keys)
  /// Uses public key encryption with recipient's public key (nacl.box)
  Future<String> encryptForUser(String data, String recipientPublicKeyBase64) async {
    if (!_initialized || _privateKey == null) {
      throw Exception('Not initialized');
    }

    print('🔐 Encrypting data for user with public key: ${recipientPublicKeyBase64.substring(0, 20)}...');

    try {
      final recipientPublicKey = Uint8List.fromList(base64.decode(recipientPublicKeyBase64));
      final myPrivateKeyBytes = Uint8List.fromList(_privateKey!.toList());
      final nonce = _genNonce();
      final dataBytes = Uint8List.fromList(utf8.encode(data));

      print('   Data to encrypt: ${data.substring(0, data.length < 50 ? data.length : 50)}');
      print('   My private key length: ${myPrivateKeyBytes.length} bytes');
      print('   Recipient public key length: ${recipientPublicKey.length} bytes');
      print('   Nonce length: ${nonce.length} bytes');

      // Use TweetNaCl.crypto_box (same as web's nacl.box)
      // Pad message with 32 zeros at start
      final paddedMessage = Uint8List(32 + dataBytes.length);
      paddedMessage.setRange(32, 32 + dataBytes.length, dataBytes);

      final cipherText = Uint8List(paddedMessage.length);
      TweetNaCl.crypto_box(cipherText, paddedMessage, paddedMessage.length, nonce, recipientPublicKey, myPrivateKeyBytes);

      // Remove first 16 bytes (boxzerobytes) to get actual ciphertext
      final actualCipherText = cipherText.sublist(16);

      // Combine nonce and ciphertext (same as web implementation)
      final combined = Uint8List(nonce.length + actualCipherText.length);
      combined.setRange(0, nonce.length, nonce);
      combined.setRange(nonce.length, combined.length, actualCipherText);

      final result = base64.encode(combined);
      print('✅ Encrypted for user successfully (${combined.length} bytes)');
      return result;
    } catch (e) {
      print('❌ Failed to encrypt for user: $e');
      rethrow;
    }
  }

  /// Decrypt data that was encrypted for this user
  /// Uses private key decryption with sender's public key
  Future<String> decryptFromUser(String encryptedDataBase64, String senderPublicKeyBase64) async {
    if (!_initialized || _privateKey == null) {
      throw Exception('Not initialized');
    }

    print('🔓 Decrypting data from user with public key: ${senderPublicKeyBase64.substring(0, 20)}...');

    try {
      final senderPublicKey = Uint8List.fromList(base64.decode(senderPublicKeyBase64));
      final myPrivateKeyBytes = Uint8List.fromList(_privateKey!.toList());
      final combined = Uint8List.fromList(base64.decode(encryptedDataBase64));

      print('   Sender public key length: ${senderPublicKey.length} bytes');
      print('   My private key length: ${myPrivateKeyBytes.length} bytes');
      print('   Combined data length: ${combined.length} bytes');

      // Extract nonce and encrypted data
      final nonce = combined.sublist(0, 24);
      final cipherText = combined.sublist(24);

      print('   Nonce length: ${nonce.length} bytes');
      print('   CipherText length: ${cipherText.length} bytes');

      // Use TweetNaCl.crypto_box_open (same as web's nacl.box.open)
      // Pad ciphertext with 16 zeros at start
      final paddedCipherText = Uint8List(16 + cipherText.length);
      paddedCipherText.setRange(16, 16 + cipherText.length, cipherText);

      final decryptedPadded = Uint8List(paddedCipherText.length);

      print('   Attempting TweetNaCl.crypto_box_open...');
      final result = TweetNaCl.crypto_box_open(
        decryptedPadded,
        paddedCipherText,
        paddedCipherText.length,
        nonce,
        senderPublicKey,
        myPrivateKeyBytes,
      );

      // Extract actual message (remove 32 bytes padding)
      final actualMessage = result is Uint8List && result.length > 32
          ? result.sublist(32)
          : decryptedPadded.sublist(32);

      final plaintext = utf8.decode(actualMessage);
      print('✅ Decrypted from user successfully: ${plaintext.substring(0, plaintext.length < 50 ? plaintext.length : 50)}');
      return plaintext;
    } catch (e, stack) {
      print('❌ Failed to decrypt from user: $e');
      print('Stack trace: $stack');
      rethrow;
    }
  }

  /// Add conversation key for a conversation (used when joining existing encrypted conversations)
  Future<void> addConversationKey(String conversationId, String encryptedKey, String senderPublicKey) async {
    if (!_initialized) throw Exception('Not initialized');

    print('🔑 ADDING conversation key for: $conversationId');
    print('🔑 ADDING - Encrypted key (first 30): ${encryptedKey.substring(0, encryptedKey.length < 30 ? encryptedKey.length : 30)}');
    print('🔑 ADDING - Sender public key (first 20): ${senderPublicKey.substring(0, 20)}');

    try {
      // Decrypt the conversation key using sender's public key and our private key
      final symmetricKey = await decryptFromUser(encryptedKey, senderPublicKey);

      print('🔑 DECRYPTED conversation key (first 20): ${symmetricKey.substring(0, 20)}');

      // Store the conversation key
      _conversationKeys[conversationId] = Uint8List.fromList(base64.decode(symmetricKey));

      // Save updated keys
      if (_currentUserId != null) {
        await _saveKeys(_currentUserId!);
        print('💾 Saved conversation key after adding: $conversationId');
      }

      print('✅ Conversation key added successfully');
    } catch (e) {
      print('❌ Failed to add conversation key: $e');
      rethrow;
    }
  }

  Future<void> clearKeys() async {
    _initialized = false;
    _privateKey = null;
    _conversationKeys.clear();
    if (_currentUserId != null) {
      await _secureStorage.delete(key: 'e2ee_keys_$_currentUserId');
    }
  }

  /// Force regenerate keys (for testing/debugging)
  Future<void> regenerateKeys() async {
    if (_currentUserId == null) {
      print('❌ Cannot regenerate keys: no user ID');
      return;
    }

    print('🔄 Regenerating encryption keys...');

    // Clear old keys
    await clearKeys();

    // Generate new keys
    _privateKey = PrivateKey.generate();
    _conversationKeys = {};

    // Save new keys
    await _saveKeys(_currentUserId!);

    // Upload new public key
    await _uploadPublicKey(_currentUserId!, _genDeviceId());

    _initialized = true;
    print('✅ Keys regenerated successfully');
  }

  Future<Map<String, dynamic>?> _loadKeys(String userId) async {
    try {
      final enc = await _secureStorage.read(key: 'e2ee_keys_$userId');
      if (enc == null) return null;

      final d = json.decode(enc);
      final priv = PrivateKey(Uint8List.fromList(base64.decode(d['privateKey'])));

      final conv = <String, Uint8List>{};
      (d['conversationKeys'] as Map?)?.forEach((k, v) {
        conv[k] = Uint8List.fromList(base64.decode(v));
      });

      return {'privateKey': priv, 'conversationKeys': conv, 'deviceId': d['deviceId']};
    } catch (e) {
      return null;
    }
  }

  Future<void> _saveKeys(String userId) async {
    if (_privateKey == null) return;
    final conv = <String, String>{};
    _conversationKeys.forEach((k, v) => conv[k] = base64.encode(v));

    // Ensure we're encoding the raw bytes
    final privateKeyBytes = Uint8List.fromList(_privateKey!.toList());
    final publicKeyBytes = Uint8List.fromList(_privateKey!.publicKey.toList());

    await _secureStorage.write(
      key: 'e2ee_keys_$userId',
      value: json.encode({
        'privateKey': base64.encode(privateKeyBytes),
        'publicKey': base64.encode(publicKeyBytes),
        'conversationKeys': conv,
        'deviceId': _genDeviceId(),
      }),
    );
  }

  Uint8List _genKey() => Uint8List.fromList(List.generate(32, (_) => Random.secure().nextInt(256)));
  Uint8List _genNonce() => Uint8List.fromList(List.generate(24, (_) => Random.secure().nextInt(256)));
  String _genDeviceId() => 'device_${base64.encode(List.generate(16, (_) => Random.secure().nextInt(256))).substring(0, 22)}';
}
