"use client";

import React, { useState, FormEvent } from "react";
import { Button } from "@/components/ui/button";
import { getPolarityLabel, getSubjectivityLabel } from "@/lib/utils/sentiment"; // Ensure these utilities are available

interface ChatMessage {
  role: "human" | "ai";
  content: string;
  sentiment?: {
    polarity: number;
    subjectivity: number;
  };
}

interface AgenticChatWindowProps {
  patentId: string;
  userId: string;
  handleAgenticSend: (query: string) => Promise<void>;
  messages: ChatMessage[];
  isLoading: boolean;
}

const AgenticChatWindow: React.FC<AgenticChatWindowProps> = ({
  patentId,
  userId,
  handleAgenticSend,
  messages,
  isLoading,
}) => {
  const [query, setQuery] = useState<string>("");

  /**
   * Determines the type of the message content.
   *
   * @param {string} content - The message content.
   * @returns {string} - The type of content: 'audio', 'image', or 'text'.
   */
  const determineContentType = (content: string): string => {
    const audioExtensions = [".mp3", ".wav", ".ogg"];
    const imageExtensions = [".png", ".jpg", ".jpeg", ".gif", ".bmp"];

    try {
      const url = new URL(content);
      const pathname = url.pathname.toLowerCase();

      if (audioExtensions.some((ext) => pathname.endsWith(ext))) {
        return "audio";
      }

      if (imageExtensions.some((ext) => pathname.endsWith(ext))) {
        return "image";
      }

      return "text";
    } catch (e) {
      // If not a valid URL, treat as text
      return "text";
    }
  };

  /**
   * Parses the message content to identify URLs and their types.
   *
   * @param {string} content - The message content.
   * @returns {Array<{ type: string; content: string; key: number }>} - An array of content segments with their types.
   */
  const parseMessageContent = (content: string) => {
    // Regular expression to match URLs
    const urlRegex = /(https?:\/\/[^\s",!?]+)/g;
    const parts = content.split(urlRegex);
    let key = 0;

    return parts.map((part) => {
      if (urlRegex.test(part)) {
        const type = determineContentType(part);
        return { type, content: part, key: key++ };
      }
      return { type: "text", content: part, key: key++ };
    });
  };

  /**
   * Renders the content based on its type.
   *
   * @param {Array<{ type: string; content: string; key: number }>} parsedContent - The parsed content segments.
   * @returns {JSX.Element[]} - An array of JSX elements.
   */
  const renderContent = (
    parsedContent: Array<{ type: string; content: string; key: number }>
  ): JSX.Element[] => {
    return parsedContent.map((segment) => {
      switch (segment.type) {
        case "audio":
          // Extract the file extension and assign correct MIME type
          const fileExtension = segment.content.split(".").pop()?.toLowerCase();
          let mimeType = "audio/wav"; // Default to 'audio/wav'
          
          // If the extension is mp3, change the mime type to 'audio/mpeg'
          if (fileExtension === "mp3") {
            mimeType = "audio/mpeg";
          } else if (fileExtension === "ogg") {
            mimeType = "audio/ogg";
          }

          return (
            <audio
              controls
              className="w-full mt-2"
              key={segment.key}
              onError={() =>
                console.error(`Failed to load audio from ${segment.content}`)
              }
            >
              <source src={segment.content} type={mimeType} />
              Your browser does not support the audio element.
              <p>Failed to load audio. Please check the URL.</p>
            </audio>
          );
        case "image":
          return (
            <img
              src={segment.content}
              alt="Agentic Chatbot Response"
              className="w-full h-auto mt-2 rounded"
              key={segment.key}
              onError={() =>
                console.error(`Failed to load image from ${segment.content}`)
              }
            />
          );
        case "text":
        default:
          return <span key={segment.key}>{segment.content}</span>;
      }
    });
  };

  /**
   * Handles the form submission to send a query to the Agentic Chatbot.
   *
   * @param {FormEvent<HTMLFormElement>} e - The form event.
   */
  const handleSubmit = async (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    await handleAgenticSend(query);
    setQuery("");
  };

  return (
    <div className="h-[90vh] overflow-hidden rounded-lg shadow-md">
      <div className="flex flex-col h-full">
        {/* Chat Header */}
        <div className="p-4 bg-gray-100 border-b border-gray-300">
          <h2 className="text-xl font-semibold">Agentic Chatbot</h2>
        </div>

        {/* Chat Messages */}
        <div className="flex-1 p-4 overflow-y-auto bg-gray-50">
          {/* Display Chat History */}
          {messages.length > 0 ? (
            messages.map((msg, index) => (
              <div
                key={index}
                className={`mb-4 flex ${msg.role === "human" ? "justify-end" : "justify-start"}`}
              >
                <div
                  className={`${
                    msg.role === "human"
                      ? "bg-blue-500 text-white"
                      : "bg-gray-300 text-black"
                  } rounded-lg p-2 max-w-xs`}
                >
                  {msg.role === "ai" ? (
                    (() => {
                      const parsed = parseMessageContent(msg.content);
                      return renderContent(parsed);
                    })()
                  ) : (
                    msg.content
                  )}

                  {/* Display sentiment data for AI messages if available */}
                  {msg.role === "ai" && msg.sentiment && (
                    <div className="mt-2 text-sm">
                      <span
                        className={`inline-block px-2 py-1 rounded mr-2 ${getPolarityLabel(
                          msg.sentiment.polarity
                        ).color}`}
                      >
                        Polarity: {getPolarityLabel(msg.sentiment.polarity).label} (
                        {msg.sentiment.polarity.toFixed(2)})
                      </span>
                      <span
                        className={`inline-block px-2 py-1 rounded ${getSubjectivityLabel(
                          msg.sentiment.subjectivity
                        ).color}`}
                      >
                        Subjectivity: {getSubjectivityLabel(msg.sentiment.subjectivity).label} (
                        {msg.sentiment.subjectivity.toFixed(2)})
                      </span>
                    </div>
                  )}
                </div>
              </div>
            ))
          ) : (
            <p className="text-center text-gray-700">No chat history available.</p>
          )}
        </div>

        {/* Chat Input */}
        <div className="p-4 bg-white flex items-center space-x-2">
          <form onSubmit={handleSubmit} className="flex-1 flex">
            <input
              type="text"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Ask the Agentic Chatbot..."
              className="flex-1 border border-gray-300 rounded p-2"
            />
            <Button
              type="submit"
              disabled={isLoading}
              className="ml-2 bg-green-500 text-white px-4 py-2 rounded"
            >
              {isLoading ? "Sending..." : "Ask"}
            </Button>
          </form>
        </div>
      </div>
    </div>
  );
};

export default AgenticChatWindow;
