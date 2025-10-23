# Integrating Bubbles Chatbot

## Basic Integration

```tsx
import { WChainChatbot } from '@/components/WChainChatbot';

function Dashboard() {
  return (
    <div>
      <h1>Dashboard</h1>
      <WChainChatbot />
    </div>
  );
}
```

## Using the Chat Hook Directly

```tsx
import { useWChainChat } from '@/hooks/useWChainChat';
import { useAuth } from '@/contexts/AuthContext';

function CustomChat() {
  const { user } = useAuth();
  const { messages, loading, sendMessage } = useWChainChat({ userId: user?.id });

  const handleSend = async (text: string) => {
    await sendMessage(text);
  };

  return (
    <div>
      {messages.map((msg, idx) => (
        <div key={idx}>
          <strong>{msg.role}:</strong> {msg.content}
        </div>
      ))}
    </div>
  );
}
```
