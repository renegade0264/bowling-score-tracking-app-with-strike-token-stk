import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { ScrollArea } from "@/components/ui/scroll-area";
import { useInternetIdentity } from "@/hooks/useInternetIdentity";
import {
  useGetCallerUserProfile,
  useGetMessages,
  useSendMessage,
} from "@/hooks/useQueries";
import { MessageCircle, Send } from "lucide-react";
import { useEffect, useRef, useState } from "react";
import { toast } from "sonner";

interface GameChatProps {
  gameId: bigint;
  currentPlayer: string;
  players: string[];
}

export function GameChat({ gameId, currentPlayer }: GameChatProps) {
  const [message, setMessage] = useState("");
  const [isExpanded, setIsExpanded] = useState(false);
  const scrollAreaRef = useRef<HTMLDivElement>(null);

  const { identity } = useInternetIdentity();
  const { data: userProfile } = useGetCallerUserProfile();
  const { data: messages = [], refetch } = useGetMessages(gameId);
  const sendMessageMutation = useSendMessage();

  // Auto-refresh messages every 3 seconds during active game
  useEffect(() => {
    const interval = setInterval(() => {
      refetch();
    }, 3000);

    return () => clearInterval(interval);
  }, [refetch]);

  // Scroll to bottom when new messages arrive
  useEffect(() => {
    if (scrollAreaRef.current) {
      const scrollElement = scrollAreaRef.current.querySelector(
        "[data-radix-scroll-area-viewport]",
      );
      if (scrollElement) {
        scrollElement.scrollTop = scrollElement.scrollHeight;
      }
    }
  }, []);

  const getDisplayName = (senderName: string) => {
    // If the sender is the current authenticated user, use their profile name
    if (
      identity &&
      userProfile &&
      senderName === identity.getPrincipal().toString()
    ) {
      return (
        userProfile.displayName ||
        `User ${identity.getPrincipal().toString().slice(0, 8)}...`
      );
    }
    // Otherwise use the sender name as is (could be a guest player name)
    return senderName;
  };

  const getInitials = (senderName: string) => {
    const displayName = getDisplayName(senderName);
    if (
      identity &&
      userProfile &&
      senderName === identity.getPrincipal().toString() &&
      userProfile.displayName
    ) {
      const words = userProfile.displayName.trim().split(" ");
      if (words.length >= 2) {
        return (words[0][0] + words[1][0]).toUpperCase();
      }
      return words[0].slice(0, 2).toUpperCase();
    }
    if (displayName.startsWith("User ")) {
      // For user profiles, use principal-based initials
      return senderName.slice(0, 2).toUpperCase();
    }
    // For guest names, use first character
    return displayName.charAt(0).toUpperCase();
  };

  const handleSendMessage = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!message.trim()) return;

    try {
      await sendMessageMutation.mutateAsync({
        message: message.trim(),
        gameId,
      });
      setMessage("");
      // Immediately refetch to show the new message
      refetch();
    } catch (error) {
      toast.error("Failed to send message");
      console.error("Send message error:", error);
    }
  };

  const formatTimestamp = (timestamp: bigint) => {
    const date = new Date(Number(timestamp) / 1000000); // Convert nanoseconds to milliseconds
    return date.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
  };

  const unreadCount = messages.length; // Simple implementation - could be enhanced with read status

  if (!isExpanded) {
    return (
      <Card className="fixed bottom-4 right-4 w-80 z-50">
        <CardHeader
          className="pb-3 cursor-pointer hover:bg-muted/50 transition-colors"
          onClick={() => setIsExpanded(true)}
        >
          <CardTitle className="flex items-center justify-between text-sm">
            <div className="flex items-center space-x-2">
              <MessageCircle className="w-4 h-4" />
              <span>Game Chat</span>
            </div>
            {unreadCount > 0 && (
              <div className="bg-primary text-primary-foreground text-xs rounded-full w-5 h-5 flex items-center justify-center">
                {unreadCount > 99 ? "99+" : unreadCount}
              </div>
            )}
          </CardTitle>
        </CardHeader>
      </Card>
    );
  }

  return (
    <Card className="fixed bottom-4 right-4 w-80 h-96 z-50 flex flex-col">
      <CardHeader
        className="pb-3 cursor-pointer hover:bg-muted/50 transition-colors"
        onClick={() => setIsExpanded(false)}
      >
        <CardTitle className="flex items-center justify-between text-sm">
          <div className="flex items-center space-x-2">
            <MessageCircle className="w-4 h-4" />
            <span>Game Chat</span>
          </div>
          <Button variant="ghost" size="sm" className="h-6 w-6 p-0">
            ×
          </Button>
        </CardTitle>
      </CardHeader>

      <CardContent className="flex-1 flex flex-col p-4 pt-0">
        <ScrollArea className="flex-1 mb-4" ref={scrollAreaRef}>
          <div className="space-y-3">
            {messages.length === 0 ? (
              <div className="text-center text-muted-foreground text-sm py-8">
                No messages yet. Start the conversation!
              </div>
            ) : (
              messages.map((msg, index) => (
                <div
                  key={msg.id?.toString() ?? index}
                  className="flex items-start space-x-2"
                >
                  <Avatar className="w-6 h-6">
                    <AvatarFallback className="text-xs">
                      {getInitials(msg.sender)}
                    </AvatarFallback>
                  </Avatar>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center space-x-2 mb-1">
                      <span className="text-xs font-medium truncate">
                        {getDisplayName(msg.sender)}
                      </span>
                      <span className="text-xs text-muted-foreground">
                        {formatTimestamp(msg.timestamp)}
                      </span>
                    </div>
                    <div className="text-sm bg-muted/50 rounded-lg px-2 py-1 break-words">
                      {msg.message}
                    </div>
                  </div>
                </div>
              ))
            )}
          </div>
        </ScrollArea>

        <form onSubmit={handleSendMessage} className="flex space-x-2">
          <Input
            value={message}
            onChange={(e) => setMessage(e.target.value)}
            placeholder="Type a message..."
            className="flex-1 text-sm"
            maxLength={200}
          />
          <Button
            type="submit"
            size="sm"
            disabled={!message.trim() || sendMessageMutation.isPending}
          >
            <Send className="w-4 h-4" />
          </Button>
        </form>
      </CardContent>
    </Card>
  );
}
