import React from 'react'
import { MessageRenderer } from './MessageRenderer'

/**
 * MessageRenderer Usage Examples
 *
 * This file demonstrates various use cases of the MessageRenderer component.
 * Copy these examples into your chat components as needed.
 */

export const MessageRendererExamples = () => {
  const handleMentionClick = (username: string) => {
    console.log('Mention clicked:', username)
    // Navigate to user profile or open DM
  }

  const handleChannelClick = (channelName: string) => {
    console.log('Channel clicked:', channelName)
    // Navigate to channel
  }

  return (
    <div className="p-8 space-y-8 max-w-4xl mx-auto">
      <h1 className="text-3xl font-bold mb-6">MessageRenderer Examples</h1>

      {/* Example 1: Basic Formatting */}
      <section className="space-y-4">
        <h2 className="text-2xl font-semibold">1. Basic Text Formatting</h2>
        <div className="p-4 bg-white dark:bg-gray-800 rounded-lg border">
          <MessageRenderer
            text="This is **bold text**, *italic text*, ~~strikethrough~~, and `inline code`."
          />
        </div>
      </section>

      {/* Example 2: Code Blocks */}
      <section className="space-y-4">
        <h2 className="text-2xl font-semibold">2. Code Blocks</h2>
        <div className="p-4 bg-white dark:bg-gray-800 rounded-lg border">
          <MessageRenderer
            text={`Here's some code:\n\`\`\`const greeting = "Hello World";\nconsole.log(greeting);\`\`\``}
          />
        </div>
      </section>

      {/* Example 3: Lists */}
      <section className="space-y-4">
        <h2 className="text-2xl font-semibold">3. Lists</h2>
        <div className="p-4 bg-white dark:bg-gray-800 rounded-lg border">
          <MessageRenderer
            text={`Shopping list:\n• Milk\n• Eggs\n• Bread\n\nSteps:\n1. First step\n2. Second step\n3. Third step`}
          />
        </div>
      </section>

      {/* Example 4: Blockquotes */}
      <section className="space-y-4">
        <h2 className="text-2xl font-semibold">4. Blockquotes</h2>
        <div className="p-4 bg-white dark:bg-gray-800 rounded-lg border">
          <MessageRenderer
            text="> This is a quoted text\n> It can span multiple lines"
          />
        </div>
      </section>

      {/* Example 5: Mentions and Channels */}
      <section className="space-y-4">
        <h2 className="text-2xl font-semibold">5. Mentions and Channel References</h2>
        <div className="p-4 bg-white dark:bg-gray-800 rounded-lg border">
          <MessageRenderer
            text="Hey @john and @alice, please check #general and #dev-team channels!"
            onMentionClick={handleMentionClick}
            onChannelClick={handleChannelClick}
          />
        </div>
      </section>

      {/* Example 6: Combined Formatting */}
      <section className="space-y-4">
        <h2 className="text-2xl font-semibold">6. Combined Formatting</h2>
        <div className="p-4 bg-white dark:bg-gray-800 rounded-lg border">
          <MessageRenderer
            text={`**Important Update**

> The deployment is scheduled for tomorrow

@team please review the following:

1. Check the **production** environment
2. Run \`npm test\` to verify tests
3. Update the documentation in #docs

Here's the code snippet:
\`\`\`
git pull origin main
npm run build
\`\`\`

Thanks! ~~Let me know~~ Contact @admin if you have questions.`}
            onMentionClick={handleMentionClick}
            onChannelClick={handleChannelClick}
          />
        </div>
      </section>

      {/* Example 7: Mixed Inline Formatting */}
      <section className="space-y-4">
        <h2 className="text-2xl font-semibold">7. Mixed Inline Formatting</h2>
        <div className="p-4 bg-white dark:bg-gray-800 rounded-lg border">
          <MessageRenderer
            text="You can combine **bold with `code`** or *italic with **bold*** formatting."
          />
        </div>
      </section>

      {/* Example 8: Real Chat Message */}
      <section className="space-y-4">
        <h2 className="text-2xl font-semibold">8. Real Chat Message Example</h2>
        <div className="p-4 bg-white dark:bg-gray-800 rounded-lg border">
          <div className="flex gap-3">
            <img
              src="https://images.unsplash.com/photo-1472099645785-5658abf4ff4e?w=40&h=40&fit=crop&crop=face"
              alt="User avatar"
              className="w-10 h-10 rounded-full"
            />
            <div className="flex-1">
              <div className="flex items-center gap-2 mb-1">
                <span className="font-semibold">John Doe</span>
                <span className="text-xs text-gray-500">2:30 PM</span>
              </div>
              <MessageRenderer
                text="@everyone I've just pushed the new feature to #development. Please test it and let me know if you find any bugs. The main changes:\n\n1. **Authentication** improvements\n2. *Performance* optimizations\n3. UI updates\n\nRun `npm install` to get the latest dependencies.\n\n> Remember: test in staging before production!"
                onMentionClick={handleMentionClick}
                onChannelClick={handleChannelClick}
                className="text-sm"
              />
            </div>
          </div>
        </div>
      </section>

      {/* Example 9: Custom Styling */}
      <section className="space-y-4">
        <h2 className="text-2xl font-semibold">9. Custom Styling</h2>
        <div className="p-4 bg-white dark:bg-gray-800 rounded-lg border">
          <MessageRenderer
            text="This message has **custom** styling applied via the className prop."
            className="text-sm p-3 bg-blue-50 dark:bg-blue-900/20 rounded-md border border-blue-200 dark:border-blue-800"
          />
        </div>
      </section>

      {/* Example 10: Empty and Edge Cases */}
      <section className="space-y-4">
        <h2 className="text-2xl font-semibold">10. Edge Cases</h2>
        <div className="space-y-2">
          <div className="p-4 bg-white dark:bg-gray-800 rounded-lg border">
            <p className="text-xs text-gray-500 mb-2">Empty message:</p>
            <MessageRenderer text="" />
          </div>
          <div className="p-4 bg-white dark:bg-gray-800 rounded-lg border">
            <p className="text-xs text-gray-500 mb-2">Plain text (no formatting):</p>
            <MessageRenderer text="Just a plain message without any formatting." />
          </div>
          <div className="p-4 bg-white dark:bg-gray-800 rounded-lg border">
            <p className="text-xs text-gray-500 mb-2">Incomplete formatting:</p>
            <MessageRenderer text="This has incomplete **bold and `code formatting" />
          </div>
        </div>
      </section>
    </div>
  )
}

export default MessageRendererExamples

/**
 * Integration with Chat Component Example:
 *
 * ```tsx
 * import { MessageRenderer } from './components/MessageRenderer'
 *
 * function ChatMessage({ message, user }) {
 *   return (
 *     <div className="flex gap-3 p-4 hover:bg-gray-50">
 *       <img src={user.avatar} className="w-10 h-10 rounded-full" />
 *       <div className="flex-1">
 *         <div className="flex items-center gap-2 mb-1">
 *           <span className="font-semibold">{user.name}</span>
 *           <span className="text-xs text-gray-500">
 *             {formatTime(message.timestamp)}
 *           </span>
 *         </div>
 *         <MessageRenderer
 *           text={message.content}
 *           onMentionClick={(username) => {
 *             // Open user profile or DM
 *             navigate(`/chat/@${username}`)
 *           }}
 *           onChannelClick={(channel) => {
 *             // Navigate to channel
 *             navigate(`/chat/${channel}`)
 *           }}
 *         />
 *       </div>
 *     </div>
 *   )
 * }
 * ```
 */
