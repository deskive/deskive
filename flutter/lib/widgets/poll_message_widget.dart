import 'package:flutter/material.dart';
import 'package:easy_localization/easy_localization.dart';
import '../api/services/chat_api_service.dart';
import '../theme/app_theme.dart';

/// Widget for displaying a poll in a message
class PollMessageWidget extends StatefulWidget {
  final String messageId;
  final String workspaceId;
  final Map<String, dynamic> pollData;
  final String currentUserId;
  final bool isCreator;
  final VoidCallback? onPollUpdated;

  const PollMessageWidget({
    super.key,
    required this.messageId,
    required this.workspaceId,
    required this.pollData,
    required this.currentUserId,
    required this.isCreator,
    this.onPollUpdated,
  });

  @override
  State<PollMessageWidget> createState() => _PollMessageWidgetState();
}

class _PollMessageWidgetState extends State<PollMessageWidget> {
  late Poll _poll;
  String? _userVotedOptionId;
  String? _selectedOptionId; // For two-step voting: select first, then vote
  bool _isVoting = false;
  bool _isClosing = false;

  final ChatApiService _chatApiService = ChatApiService();

  @override
  void initState() {
    super.initState();
    _initPoll();
  }

  @override
  void didUpdateWidget(PollMessageWidget oldWidget) {
    super.didUpdateWidget(oldWidget);
    if (oldWidget.pollData != widget.pollData) {
      _initPoll();
    }
  }

  void _initPoll() {
    final pollJson = widget.pollData['poll'] ?? widget.pollData;
    _poll = Poll.fromJson(pollJson is Map<String, dynamic> ? pollJson : {});
    _userVotedOptionId = widget.pollData['userVotedOptionId'] ??
        widget.pollData['user_voted_option_id'] ??
        _poll.userVotedOptionId;
    _selectedOptionId = null; // Reset selection when poll data changes

    debugPrint('🗳️ [PollWidget] Init poll - id: ${_poll.id}, question: ${_poll.question}');
    debugPrint('🗳️ [PollWidget] Options: ${_poll.options.map((o) => '${o.id}: ${o.text} (${o.voteCount} votes)').join(', ')}');
    debugPrint('🗳️ [PollWidget] totalVotes: ${_poll.totalVotes}, isOpen: ${_poll.isOpen}, showResultsBeforeVoting: ${_poll.showResultsBeforeVoting}');
    debugPrint('🗳️ [PollWidget] userVotedOptionId: $_userVotedOptionId, messageId: ${widget.messageId}');
  }

  bool get _hasVoted => _userVotedOptionId != null;

  bool get _canVote => _poll.isOpen && !_hasVoted;

  bool get _canViewResults {
    // Can view results if:
    // 1. Poll is closed
    // 2. User has already voted
    // 3. Poll is configured to show results before voting
    return !_poll.isOpen || _hasVoted || _poll.showResultsBeforeVoting;
  }

  Future<void> _votePoll() async {
    if (_selectedOptionId == null || !_canVote || _isVoting) return;

    debugPrint('🗳️ [PollWidget] Starting vote - messageId: ${widget.messageId}, pollId: ${_poll.id}, optionId: $_selectedOptionId');

    setState(() {
      _isVoting = true;
    });

    try {
      final response = await _chatApiService.votePoll(
        widget.workspaceId,
        widget.messageId,
        _poll.id,
        _selectedOptionId!,
      );

      debugPrint('🗳️ [PollWidget] Vote response - success: ${response.isSuccess}, data: ${response.data}, message: ${response.message}');

      if (response.isSuccess && response.data != null) {
        final data = response.data!;
        final pollData = data['poll'];
        debugPrint('🗳️ [PollWidget] Poll data from response: $pollData');
        if (pollData != null) {
          setState(() {
            _poll = Poll.fromJson(pollData);
            _userVotedOptionId = data['userVotedOptionId'] ?? _selectedOptionId;
            _selectedOptionId = null;
          });
          debugPrint('🗳️ [PollWidget] Updated poll from response - totalVotes: ${_poll.totalVotes}');
        } else {
          // Just update the local state optimistically
          setState(() {
            _userVotedOptionId = _selectedOptionId;
            // Update vote count
            final updatedOptions = _poll.options.map((o) {
              if (o.id == _selectedOptionId) {
                return o.copyWith(voteCount: o.voteCount + 1);
              }
              return o;
            }).toList();
            _poll = _poll.copyWith(
              options: updatedOptions,
              totalVotes: _poll.totalVotes + 1,
              userVotedOptionId: _selectedOptionId,
            );
            _selectedOptionId = null;
          });
          debugPrint('🗳️ [PollWidget] Updated poll optimistically - totalVotes: ${_poll.totalVotes}');
        }
        widget.onPollUpdated?.call();
      } else {
        debugPrint('🗳️ [PollWidget] Vote failed - message: ${response.message}');
        _showError(response.message ?? 'poll.vote_failed'.tr());
      }
    } catch (e, stackTrace) {
      debugPrint('🗳️ [PollWidget] Vote error: $e');
      debugPrint('🗳️ [PollWidget] Stack trace: $stackTrace');
      _showError('poll.vote_failed'.tr());
    } finally {
      setState(() {
        _isVoting = false;
      });
    }
  }

  Future<void> _closePoll() async {
    if (!_poll.isOpen || _isClosing) return;

    setState(() {
      _isClosing = true;
    });

    try {
      final response = await _chatApiService.closePoll(
        widget.workspaceId,
        widget.messageId,
        _poll.id,
      );

      if (response.isSuccess && response.data != null) {
        setState(() {
          _poll = response.data!;
        });
        widget.onPollUpdated?.call();
      } else {
        _showError(response.message ?? 'poll.close_failed'.tr());
      }
    } catch (e) {
      _showError('poll.close_failed'.tr());
    } finally {
      setState(() {
        _isClosing = false;
      });
    }
  }

  void _showError(String message) {
    if (mounted) {
      ScaffoldMessenger.of(context).showSnackBar(
        SnackBar(
          content: Text(message),
          backgroundColor: Colors.red,
        ),
      );
    }
  }

  double _getVotePercentage(int voteCount) {
    if (_poll.totalVotes == 0) return 0;
    return (voteCount / _poll.totalVotes) * 100;
  }

  @override
  Widget build(BuildContext context) {
    final isDarkMode = Theme.of(context).brightness == Brightness.dark;
    final primaryColor = AppTheme.primaryLight;

    return Container(
      margin: const EdgeInsets.only(top: 8),
      padding: const EdgeInsets.all(16),
      constraints: const BoxConstraints(maxWidth: 400),
      decoration: BoxDecoration(
        color: isDarkMode
            ? AppTheme.cardDark.withOpacity(0.3)
            : Colors.grey[100]?.withOpacity(0.3),
        borderRadius: BorderRadius.circular(12),
        border: Border.all(
          color: isDarkMode ? Colors.grey[700]! : Colors.grey[300]!,
        ),
      ),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          // Poll header
          Row(
            children: [
              Icon(
                Icons.bar_chart,
                color: primaryColor,
                size: 20,
              ),
              const SizedBox(width: 8),
              Text(
                'poll.title'.tr(),
                style: TextStyle(
                  fontSize: 14,
                  fontWeight: FontWeight.w500,
                  color: isDarkMode ? Colors.grey[300] : Colors.grey[700],
                ),
              ),
              const Spacer(),
              if (!_poll.isOpen)
                Container(
                  padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 4),
                  decoration: BoxDecoration(
                    color: isDarkMode
                        ? Colors.grey[700]?.withOpacity(0.5)
                        : Colors.grey[200],
                    borderRadius: BorderRadius.circular(12),
                  ),
                  child: Text(
                    'poll.closed'.tr(),
                    style: TextStyle(
                      fontSize: 12,
                      fontWeight: FontWeight.w500,
                      color: isDarkMode ? Colors.grey[400] : Colors.grey[600],
                    ),
                  ),
                ),
            ],
          ),
          const SizedBox(height: 12),

          // Question
          Text(
            _poll.question,
            style: TextStyle(
              fontSize: 16,
              fontWeight: FontWeight.w600,
              color: isDarkMode ? Colors.white : Colors.black87,
            ),
          ),
          const SizedBox(height: 12),

          // Options
          ..._poll.options.map((option) => _buildOptionItem(option, isDarkMode, primaryColor)),

          // Vote button (only when user can vote and has selected an option)
          if (_canVote && _selectedOptionId != null) ...[
            const SizedBox(height: 12),
            SizedBox(
              width: double.infinity,
              child: ElevatedButton(
                onPressed: _isVoting ? null : _votePoll,
                style: ElevatedButton.styleFrom(
                  backgroundColor: primaryColor,
                  foregroundColor: Colors.white,
                  padding: const EdgeInsets.symmetric(vertical: 12),
                  shape: RoundedRectangleBorder(
                    borderRadius: BorderRadius.circular(8),
                  ),
                ),
                child: _isVoting
                    ? const SizedBox(
                        width: 20,
                        height: 20,
                        child: CircularProgressIndicator(
                          strokeWidth: 2,
                          valueColor: AlwaysStoppedAnimation<Color>(Colors.white),
                        ),
                      )
                    : Text(
                        'poll.vote'.tr(),
                        style: const TextStyle(
                          fontWeight: FontWeight.w600,
                        ),
                      ),
              ),
            ),
          ],

          // Footer
          const SizedBox(height: 12),
          Container(
            padding: const EdgeInsets.only(top: 12),
            decoration: BoxDecoration(
              border: Border(
                top: BorderSide(
                  color: isDarkMode ? Colors.grey[700]! : Colors.grey[300]!,
                ),
              ),
            ),
            child: Row(
              mainAxisAlignment: MainAxisAlignment.spaceBetween,
              children: [
                Text(
                  'poll.total_votes'.tr(args: [_poll.totalVotes.toString()]),
                  style: TextStyle(
                    fontSize: 12,
                    color: isDarkMode ? Colors.grey[400] : Colors.grey[600],
                  ),
                ),
                // Close poll button (only for creator and if poll is open)
                if (widget.isCreator && _poll.isOpen)
                  TextButton(
                    onPressed: _isClosing ? null : _closePoll,
                    style: TextButton.styleFrom(
                      foregroundColor: isDarkMode ? Colors.grey[400] : Colors.grey[600],
                      padding: const EdgeInsets.symmetric(horizontal: 8),
                      minimumSize: Size.zero,
                      tapTargetSize: MaterialTapTargetSize.shrinkWrap,
                    ),
                    child: _isClosing
                        ? const SizedBox(
                            width: 16,
                            height: 16,
                            child: CircularProgressIndicator(strokeWidth: 2),
                          )
                        : Text(
                            'poll.close_poll'.tr(),
                            style: const TextStyle(fontSize: 12),
                          ),
                  ),
              ],
            ),
          ),

          // Hint for users who haven't voted on closed poll
          if (!_hasVoted && !_poll.isOpen) ...[
            const SizedBox(height: 8),
            Text(
              'poll.closed_no_vote'.tr(),
              style: TextStyle(
                fontSize: 12,
                fontStyle: FontStyle.italic,
                color: isDarkMode ? Colors.grey[500] : Colors.grey[500],
              ),
            ),
          ],
        ],
      ),
    );
  }

  Widget _buildOptionItem(PollOption option, bool isDarkMode, Color primaryColor) {
    final isSelected = _selectedOptionId == option.id;
    final isVoted = _userVotedOptionId == option.id;
    final percentage = _getVotePercentage(option.voteCount);
    final showResults = _canViewResults;

    // Green color for voted option (matching frontend design)
    final votedColor = const Color(0xFF10B981); // Emerald/green color

    return Padding(
      padding: const EdgeInsets.only(bottom: 8),
      child: InkWell(
        onTap: _canVote ? () {
          setState(() {
            _selectedOptionId = option.id;
          });
        } : null,
        borderRadius: BorderRadius.circular(8),
        child: Container(
          padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 10),
          decoration: BoxDecoration(
            // Use green background for voted option
            color: isVoted
                ? votedColor.withOpacity(0.15)
                : (isDarkMode ? Colors.grey[800] : Colors.white),
            borderRadius: BorderRadius.circular(8),
            border: Border.all(
              // Use green border for voted option
              color: isVoted
                  ? votedColor
                  : (isSelected
                      ? primaryColor
                      : (isDarkMode ? Colors.grey[700]! : Colors.grey[300]!)),
              width: isSelected || isVoted ? 2 : 1,
            ),
          ),
          child: Stack(
            children: [
              // Progress bar (only if results visible and not the voted option - voted option already has green bg)
              if (showResults && !isVoted)
                Positioned.fill(
                  child: ClipRRect(
                    borderRadius: BorderRadius.circular(6),
                    child: LinearProgressIndicator(
                      value: percentage / 100,
                      backgroundColor: Colors.transparent,
                      valueColor: AlwaysStoppedAnimation<Color>(
                        (isDarkMode ? Colors.grey[600]! : Colors.grey[300]!).withOpacity(0.3),
                      ),
                    ),
                  ),
                ),
              // Content
              Row(
                children: [
                  // Selection indicator (radio button style) - only when can vote
                  if (_canVote) ...[
                    Container(
                      width: 18,
                      height: 18,
                      decoration: BoxDecoration(
                        shape: BoxShape.circle,
                        border: Border.all(
                          color: isSelected
                              ? primaryColor
                              : (isDarkMode ? Colors.grey[500]! : Colors.grey[400]!),
                          width: 2,
                        ),
                      ),
                      child: isSelected
                          ? Center(
                              child: Container(
                                width: 8,
                                height: 8,
                                decoration: BoxDecoration(
                                  shape: BoxShape.circle,
                                  color: primaryColor,
                                ),
                              ),
                            )
                          : null,
                    ),
                    const SizedBox(width: 10),
                  ],
                  // Green checkmark for voted option
                  if (!_canVote && isVoted) ...[
                    Icon(
                      Icons.check,
                      size: 18,
                      color: votedColor,
                    ),
                    const SizedBox(width: 8),
                  ],
                  // Option text
                  Expanded(
                    child: Text(
                      option.text,
                      style: TextStyle(
                        fontSize: 14,
                        fontWeight: isVoted ? FontWeight.w600 : FontWeight.normal,
                        color: isVoted
                            ? (isDarkMode ? Colors.white : Colors.black87)
                            : (isDarkMode ? Colors.white : Colors.black87),
                      ),
                    ),
                  ),
                  // Vote count and percentage (only if results visible)
                  if (showResults) ...[
                    const SizedBox(width: 8),
                    Text(
                      '${percentage.toStringAsFixed(0)}%',
                      style: TextStyle(
                        fontSize: 14,
                        fontWeight: FontWeight.w600,
                        color: isVoted
                            ? votedColor
                            : (isDarkMode ? Colors.grey[400] : Colors.grey[600]),
                      ),
                    ),
                    const SizedBox(width: 4),
                    Text(
                      '(${option.voteCount})',
                      style: TextStyle(
                        fontSize: 12,
                        color: isVoted
                            ? votedColor.withOpacity(0.8)
                            : (isDarkMode ? Colors.grey[500] : Colors.grey[500]),
                      ),
                    ),
                  ],
                  // Lock icon when results are hidden
                  if (!showResults && !_canVote)
                    Icon(
                      Icons.lock_outline,
                      size: 16,
                      color: isDarkMode ? Colors.grey[500] : Colors.grey[500],
                    ),
                ],
              ),
            ],
          ),
        ),
      ),
    );
  }

  /// Update poll data from external source (e.g., socket event)
  void updatePoll(Map<String, dynamic> newPollData) {
    setState(() {
      final pollJson = newPollData['poll'] ?? newPollData;
      _poll = Poll.fromJson(pollJson is Map<String, dynamic> ? pollJson : {});
      _userVotedOptionId = newPollData['userVotedOptionId'] ??
          newPollData['user_voted_option_id'] ??
          _poll.userVotedOptionId ??
          _userVotedOptionId;
      _selectedOptionId = null; // Clear selection after external update
    });
  }
}
