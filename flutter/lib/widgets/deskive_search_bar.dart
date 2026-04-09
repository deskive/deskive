import 'package:flutter/material.dart';

/// Reusable search bar widgets for Deskive
///
/// ## Active Variants:
/// - **DeskiveSearchBarInline** - Versatile search bar for AppBar and body usage
///   - Configurable: borderless for AppBar title, bordered for body search
///   - Optional search icon prefix
///   - Auto-shows clear button when text is present
///   - Used in: Notes (AppBar), Files (body), Video Calls (body)
///
/// - **DeskiveSearchBarGlobal** - Global search style
///   - Rounded pill shape (borderRadius: 20)
///   - Borderless design
///   - Multiple action buttons (clear, voice, filters)
///   - Fixed height (40px)
///   - Used in: Search screen
///
/// ## Usage Examples:
///
/// ### 1. Inline AppBar Search (Notes screen style)
/// ```dart
/// // In AppBar title
/// DeskiveSearchBarInline(
///   controller: _searchController,
///   hintText: 'Search notes...',
///   onChanged: (value) => setState(() => _searchQuery = value),
///   autofocus: true,
///   // No border, no icon (defaults)
/// )
/// ```
///
/// ### 2. Body Search with Border (Files/Video Calls style)
/// ```dart
/// final TextEditingController _searchController = TextEditingController();
/// String _searchQuery = '';
///
/// // In body
/// Container(
///   padding: EdgeInsets.symmetric(horizontal: 16, vertical: 8),
///   child: DeskiveSearchBarInline(
///     controller: _searchController,
///     hintText: 'Search files...',
///     searchQuery: _searchQuery,
///     showPrefixIcon: true,  // Shows search icon
///     showBorder: true,      // Shows border
///     borderRadius: 8,
///     autofocus: false,
///     onChanged: (value) {
///       setState(() => _searchQuery = value.toLowerCase());
///     },
///   ),
/// )
///
/// @override
/// void dispose() {
///   _searchController.dispose();
///   super.dispose();
/// }
/// ```
///
/// ### 3. Global Search (Search screen style)
/// ```dart
/// DeskiveSearchBarGlobal(
///   controller: _searchController,
///   searchQuery: _searchQuery,
///   onChanged: (value) => setState(() => _searchQuery = value),
///   onVoiceSearch: _handleVoiceSearch,
///   onFilterTap: _showFilters,
/// )
/// ```
///
/// ## Features:
/// - Auto-clearing search with clear button
/// - Customizable hint text, colors, and borders
/// - Integrates with Material Design theming
/// - Submit callback for Enter key press
/// - Focus management with FocusNode support

// /// COMMENTED OUT - Full version with container padding
// class DeskiveSearchBar extends StatelessWidget {
//   final TextEditingController controller;
//   final ValueChanged<String>? onChanged;
//   final ValueChanged<String>? onSubmitted;
//   final String hintText;
//   final String searchQuery;
//   final bool showBorder;
//   final Widget? prefixIcon;
//   final Color? fillColor;
//   final EdgeInsetsGeometry? padding;
//   final double borderRadius;
//   final bool enabled;
//   final FocusNode? focusNode;
//   final bool autofocus;
//
//   const DeskiveSearchBar({
//     super.key,
//     required this.controller,
//     this.onChanged,
//     this.onSubmitted,
//     this.hintText = 'Search...',
//     this.searchQuery = '',
//     this.showBorder = true,
//     this.prefixIcon,
//     this.fillColor,
//     this.padding = const EdgeInsets.symmetric(horizontal: 16, vertical: 8),
//     this.borderRadius = 8,
//     this.enabled = true,
//     this.focusNode,
//     this.autofocus = false,
//   });
//
//   @override
//   Widget build(BuildContext context) {
//     return Container(
//       padding: padding,
//       decoration: BoxDecoration(
//         color: Theme.of(context).colorScheme.surface,
//       ),
//       child: TextField(
//         controller: controller,
//         focusNode: focusNode,
//         autofocus: autofocus,
//         enabled: enabled,
//         decoration: InputDecoration(
//           hintText: hintText,
//           prefixIcon: prefixIcon ?? const Icon(Icons.search),
//           suffixIcon: searchQuery.isNotEmpty
//               ? IconButton(
//                   icon: const Icon(Icons.clear),
//                   onPressed: () {
//                     controller.clear();
//                     if (onChanged != null) {
//                       onChanged!('');
//                     }
//                   },
//                 )
//               : null,
//           border: showBorder
//               ? OutlineInputBorder(
//                   borderRadius: BorderRadius.circular(borderRadius),
//                   borderSide: BorderSide(
//                     color: Theme.of(context).colorScheme.outline,
//                   ),
//                 )
//               : InputBorder.none,
//           enabledBorder: showBorder
//               ? OutlineInputBorder(
//                   borderRadius: BorderRadius.circular(borderRadius),
//                   borderSide: BorderSide(
//                     color: Theme.of(context).colorScheme.outline.withValues(alpha: 0.5),
//                   ),
//                 )
//               : InputBorder.none,
//           focusedBorder: showBorder
//               ? OutlineInputBorder(
//                   borderRadius: BorderRadius.circular(borderRadius),
//                   borderSide: BorderSide(
//                     color: Theme.of(context).colorScheme.primary,
//                     width: 2,
//                   ),
//                 )
//               : InputBorder.none,
//           filled: true,
//           fillColor: fillColor ?? Theme.of(context).colorScheme.surfaceContainerHighest,
//           contentPadding: const EdgeInsets.symmetric(horizontal: 16, vertical: 12),
//         ),
//         onChanged: onChanged,
//         onSubmitted: onSubmitted,
//       ),
//     );
//   }
// }

// /// COMMENTED OUT - Compact version without container padding
// class DeskiveSearchBarCompact extends StatelessWidget {
//   final TextEditingController controller;
//   final ValueChanged<String>? onChanged;
//   final ValueChanged<String>? onSubmitted;
//   final String hintText;
//   final String searchQuery;
//   final Widget? prefixIcon;
//   final Color? fillColor;
//   final double borderRadius;
//   final bool enabled;
//   final FocusNode? focusNode;
//   final bool autofocus;
//
//   const DeskiveSearchBarCompact({
//     super.key,
//     required this.controller,
//     this.onChanged,
//     this.onSubmitted,
//     this.hintText = 'Search...',
//     this.searchQuery = '',
//     this.prefixIcon,
//     this.fillColor,
//     this.borderRadius = 8,
//     this.enabled = true,
//     this.focusNode,
//     this.autofocus = false,
//   });
//
//   @override
//   Widget build(BuildContext context) {
//     return TextField(
//       controller: controller,
//       focusNode: focusNode,
//       autofocus: autofocus,
//       enabled: enabled,
//       decoration: InputDecoration(
//         hintText: hintText,
//         prefixIcon: prefixIcon ?? const Icon(Icons.search),
//         suffixIcon: searchQuery.isNotEmpty
//             ? IconButton(
//                 icon: const Icon(Icons.clear),
//                 onPressed: () {
//                   controller.clear();
//                   if (onChanged != null) {
//                     onChanged!('');
//                   }
//                 },
//               )
//             : null,
//         border: OutlineInputBorder(
//           borderRadius: BorderRadius.circular(borderRadius),
//           borderSide: BorderSide(
//             color: Theme.of(context).colorScheme.outline,
//           ),
//         ),
//         enabledBorder: OutlineInputBorder(
//           borderRadius: BorderRadius.circular(borderRadius),
//           borderSide: BorderSide(
//             color: Theme.of(context).colorScheme.outline.withValues(alpha: 0.5),
//           ),
//         ),
//         focusedBorder: OutlineInputBorder(
//           borderRadius: BorderRadius.circular(borderRadius),
//           borderSide: BorderSide(
//             color: Theme.of(context).colorScheme.primary,
//             width: 2,
//           ),
//         ),
//         filled: true,
//         fillColor: fillColor ?? Theme.of(context).colorScheme.surfaceContainerHighest,
//         contentPadding: const EdgeInsets.symmetric(horizontal: 16, vertical: 12),
//       ),
//       onChanged: onChanged,
//       onSubmitted: onSubmitted,
//     );
//   }
// }

/// Versatile inline search bar for AppBar and body usage
/// Features:
/// - Minimal, flexible design
/// - Optional search icon prefix
/// - Auto-shows clear button when text is present
/// - Configurable border (borderless for AppBar, bordered for body)
/// - Perfect for Notes AppBar, Files body, Video Calls body
class DeskiveSearchBarInline extends StatelessWidget {
  /// The controller for the search text field
  final TextEditingController controller;

  /// Callback when search text changes
  final ValueChanged<String>? onChanged;

  /// Callback when search is submitted
  final ValueChanged<String>? onSubmitted;

  /// Hint text to display in the search field
  final String hintText;

  /// Current search query (for showing/hiding clear button)
  final String searchQuery;

  /// Whether to show prefix search icon
  final bool showPrefixIcon;

  /// Custom prefix icon (if showPrefixIcon is true)
  final Widget? prefixIcon;

  /// Background color of the search field
  final Color? fillColor;

  /// Border radius for the search field
  final double borderRadius;

  /// Whether to show border
  final bool showBorder;

  /// Whether the search field is enabled
  final bool enabled;

  /// Focus node for the search field
  final FocusNode? focusNode;

  /// Whether to autofocus the search field
  final bool autofocus;

  const DeskiveSearchBarInline({
    super.key,
    required this.controller,
    this.onChanged,
    this.onSubmitted,
    this.hintText = 'Search...',
    this.searchQuery = '',
    this.showPrefixIcon = false,
    this.prefixIcon,
    this.fillColor,
    this.borderRadius = 8,
    this.showBorder = false,
    this.enabled = true,
    this.focusNode,
    this.autofocus = true,
  });

  @override
  Widget build(BuildContext context) {
    return TextField(
      controller: controller,
      focusNode: focusNode,
      autofocus: autofocus,
      enabled: enabled,
      onChanged: onChanged,
      onSubmitted: onSubmitted,
      style: TextStyle(color: Theme.of(context).colorScheme.onSurface),
      decoration: InputDecoration(
        hintText: hintText,
        prefixIcon: showPrefixIcon ? (prefixIcon ?? const Icon(Icons.search)) : null,
        suffixIcon: searchQuery.isNotEmpty
            ? IconButton(
                icon: const Icon(Icons.clear),
                onPressed: () {
                  controller.clear();
                  if (onChanged != null) {
                    onChanged!('');
                  }
                },
              )
            : null,
        border: showBorder
            ? OutlineInputBorder(
                borderRadius: BorderRadius.circular(borderRadius),
                borderSide: BorderSide(
                  color: Theme.of(context).colorScheme.outline,
                ),
              )
            : InputBorder.none,
        enabledBorder: showBorder
            ? OutlineInputBorder(
                borderRadius: BorderRadius.circular(borderRadius),
                borderSide: BorderSide(
                  color: Theme.of(context).colorScheme.outline.withValues(alpha: 0.5),
                ),
              )
            : InputBorder.none,
        focusedBorder: showBorder
            ? OutlineInputBorder(
                borderRadius: BorderRadius.circular(borderRadius),
                borderSide: BorderSide(
                  color: Theme.of(context).colorScheme.primary,
                  width: 2,
                ),
              )
            : InputBorder.none,
        filled: fillColor != null || showBorder,
        fillColor: fillColor ?? (showBorder ? Theme.of(context).colorScheme.surfaceContainerHighest : null),
        contentPadding: showBorder
            ? const EdgeInsets.symmetric(horizontal: 16, vertical: 12)
            : EdgeInsets.zero,
        hintStyle: TextStyle(
          color: Theme.of(context).colorScheme.onSurface.withValues(alpha: 0.6),
        ),
      ),
    );
  }
}

/// Global search bar variant matching the global search screen style
/// Features:
/// - Rounded pill shape (borderRadius: 20)
/// - Borderless design
/// - Multiple action buttons (clear, voice, filters)
/// - Fixed height (40px)
/// - Used in AppBar title
class DeskiveSearchBarGlobal extends StatelessWidget {
  /// The controller for the search text field
  final TextEditingController controller;

  /// Callback when search text changes
  final ValueChanged<String>? onChanged;

  /// Callback when search is submitted
  final ValueChanged<String>? onSubmitted;

  /// Hint text to display in the search field
  final String hintText;

  /// Current search query (for showing/hiding clear button)
  final String searchQuery;

  /// Callback when voice search is pressed
  final VoidCallback? onVoiceSearch;

  /// Callback when filter button is pressed
  final VoidCallback? onFilterTap;

  /// Background color of the search field
  final Color? fillColor;

  /// Focus node for the search field
  final FocusNode? focusNode;

  /// Whether to autofocus the search field
  final bool autofocus;

  /// Fixed height for the search bar
  final double height;

  const DeskiveSearchBarGlobal({
    super.key,
    required this.controller,
    this.onChanged,
    this.onSubmitted,
    this.hintText = 'Search everything...',
    this.searchQuery = '',
    this.onVoiceSearch,
    this.onFilterTap,
    this.fillColor,
    this.focusNode,
    this.autofocus = true,
    this.height = 40,
  });

  @override
  Widget build(BuildContext context) {
    return SizedBox(
      height: height,
      child: TextField(
        controller: controller,
        focusNode: focusNode,
        autofocus: autofocus,
        decoration: InputDecoration(
          hintText: hintText,
          prefixIcon: const Icon(Icons.search),
          suffixIcon: Row(
            mainAxisSize: MainAxisSize.min,
            children: [
              // Clear button (only shown when there's text)
              if (searchQuery.isNotEmpty)
                IconButton(
                  icon: const Icon(Icons.clear),
                  onPressed: () {
                    controller.clear();
                    if (onChanged != null) {
                      onChanged!('');
                    }
                  },
                ),
              // Voice search button
              if (onVoiceSearch != null)
                IconButton(
                  icon: const Icon(Icons.mic_outlined),
                  onPressed: onVoiceSearch,
                  tooltip: 'Voice search',
                ),
              // Filter button
              if (onFilterTap != null)
                IconButton(
                  icon: const Icon(Icons.tune),
                  onPressed: onFilterTap,
                  tooltip: 'Filters',
                ),
            ],
          ),
          border: OutlineInputBorder(
            borderRadius: BorderRadius.circular(20), // Rounded pill shape
            borderSide: BorderSide.none, // No border
          ),
          enabledBorder: OutlineInputBorder(
            borderRadius: BorderRadius.circular(20),
            borderSide: BorderSide.none,
          ),
          focusedBorder: OutlineInputBorder(
            borderRadius: BorderRadius.circular(20),
            borderSide: BorderSide.none,
          ),
          filled: true,
          fillColor: fillColor ?? Theme.of(context).colorScheme.surfaceContainerHighest,
          contentPadding: const EdgeInsets.symmetric(horizontal: 16),
        ),
        onChanged: onChanged,
        onSubmitted: onSubmitted,
      ),
    );
  }
}
