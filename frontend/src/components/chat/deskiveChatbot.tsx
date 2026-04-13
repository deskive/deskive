/**
 * Deskive Chatbot Component
 * Placeholder stub - chatbot widget to be implemented
 */

import React from "react";

interface DeskiveChatbotProps {
  debug?: boolean;
  position?: "bottom-right" | "bottom-left" | "top-right" | "top-left";
  primaryColor?: string;
  greeting?: string;
  placeholder?: string;
}

export const deskiveChatbot: React.FC<DeskiveChatbotProps> = ({
  debug,
  position,
  primaryColor,
  greeting,
  placeholder
}) => {
  // Chatbot widget placeholder
  // TODO: Implement chatbot widget
  if (debug) {
    console.log("[deskiveChatbot] Chatbot component loaded (stub)", {
      position,
      primaryColor,
      greeting,
      placeholder
    });
  }

  return null;
};
