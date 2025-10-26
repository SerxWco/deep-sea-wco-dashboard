import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.57.4';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

const TELEGRAM_BOT_TOKEN = Deno.env.get('TELEGRAM_BOT_TOKEN');
const SUPABASE_URL = Deno.env.get('SUPABASE_URL')!;
const SUPABASE_ANON_KEY = Deno.env.get('SUPABASE_ANON_KEY')!;

const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

// Escape special characters for Telegram MarkdownV2
function escapeMarkdown(text: string): string {
  const specialChars = ['_', '*', '[', ']', '(', ')', '~', '`', '>', '#', '+', '-', '=', '|', '{', '}', '.', '!'];
  let escaped = text;
  for (const char of specialChars) {
    escaped = escaped.split(char).join('\\' + char);
  }
  return escaped;
}

// Format response for Telegram
function formatForTelegram(text: string): string {
  // Simple formatting - preserve line breaks and basic structure
  // Don't try to convert complex markdown, just escape special chars
  return escapeMarkdown(text);
}

// Split long messages into chunks (Telegram limit: 4096 chars)
function splitMessage(text: string, maxLength: number = 4000): string[] {
  if (text.length <= maxLength) return [text];
  
  const chunks: string[] = [];
  let currentChunk = '';
  const lines = text.split('\n');
  
  for (const line of lines) {
    if ((currentChunk + line + '\n').length > maxLength) {
      if (currentChunk) chunks.push(currentChunk);
      currentChunk = line + '\n';
    } else {
      currentChunk += line + '\n';
    }
  }
  
  if (currentChunk) chunks.push(currentChunk);
  return chunks;
}

// Send message to Telegram
async function sendTelegramMessage(chatId: number, text: string, parseMode: string = 'MarkdownV2') {
  const chunks = splitMessage(text);
  
  for (const chunk of chunks) {
    try {
      const response = await fetch(`https://api.telegram.org/bot${TELEGRAM_BOT_TOKEN}/sendMessage`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          chat_id: chatId,
          text: chunk,
          parse_mode: parseMode
        })
      });
      
      if (!response.ok) {
        const error = await response.text();
        console.error('Telegram API error:', error);
        
        // If markdown parsing fails, try sending as plain text
        if (parseMode === 'MarkdownV2') {
          await sendTelegramMessage(chatId, chunk, '');
        }
      }
    } catch (error) {
      console.error('Error sending message to Telegram:', error);
      throw error;
    }
  }
}

// Send photo to Telegram
async function sendTelegramPhoto(chatId: number, photoUrl: string, caption?: string) {
  try {
    const response = await fetch(`https://api.telegram.org/bot${TELEGRAM_BOT_TOKEN}/sendPhoto`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        chat_id: chatId,
        photo: photoUrl,
        caption: caption ? escapeMarkdown(caption) : undefined,
        parse_mode: caption ? 'MarkdownV2' : undefined
      })
    });
    
    if (!response.ok) {
      const error = await response.text();
      console.error('Telegram photo API error:', error);
    }
  } catch (error) {
    console.error('Error sending photo to Telegram:', error);
  }
}

// Generate chart image URL using QuickChart
function generateChartImage(chartConfig: {
  type: 'line' | 'bar' | 'horizontalBar' | 'pie';
  title: string;
  labels: string[];
  datasets: Array<{
    label: string;
    data: number[];
    backgroundColor?: string | string[];
    borderColor?: string;
    fill?: boolean;
  }>;
}): string {
  const { type, title, labels, datasets } = chartConfig;
  
  const chartJsConfig = {
    type,
    data: {
      labels,
      datasets: datasets.map(ds => ({
        label: ds.label,
        data: ds.data,
        backgroundColor: ds.backgroundColor || 'rgba(59, 130, 246, 0.5)',
        borderColor: ds.borderColor || 'rgb(59, 130, 246)',
        fill: ds.fill !== undefined ? ds.fill : false,
        borderWidth: 2
      }))
    },
    options: {
      title: {
        display: true,
        text: title,
        fontSize: 16
      },
      legend: {
        display: datasets.length > 1
      },
      scales: {
        xAxes: [{
          gridLines: {
            display: type === 'line'
          }
        }],
        yAxes: [{
          ticks: {
            beginAtZero: type !== 'line'
          }
        }]
      }
    }
  };
  
  const encodedConfig = encodeURIComponent(JSON.stringify(chartJsConfig));
  return `https://quickchart.io/chart?c=${encodedConfig}&width=800&height=400&backgroundColor=white`;
}

// Detect and generate charts from response
async function detectAndSendCharts(chatId: number, fullResponse: string) {
  const response = fullResponse.toLowerCase();
  
  try {
    // Historical price chart
    if (response.includes('price') && (response.includes('history') || response.includes('trend') || response.includes('chart') || response.includes('past') || response.includes('days') || response.includes('weeks'))) {
      console.log('Detected price history query - attempting chart generation');
      
      // Extract price data patterns from response
      const pricePattern = /(\$?0\.\d{4,}|\d+\.\d{2})/g;
      const prices = fullResponse.match(pricePattern);
      
      if (prices && prices.length >= 5) {
        const numericPrices = prices.slice(0, 30).map(p => parseFloat(p.replace('$', '')));
        const labels = numericPrices.map((_, i) => {
          if (numericPrices.length > 24) return `Day ${i + 1}`;
          return `Point ${i + 1}`;
        });
        
        const chartUrl = generateChartImage({
          type: 'line',
          title: 'WCO Price Trend',
          labels,
          datasets: [{
            label: 'Price (USD)',
            data: numericPrices,
            borderColor: 'rgb(34, 197, 94)',
            backgroundColor: 'rgba(34, 197, 94, 0.1)',
            fill: true
          }]
        });
        
        await sendTelegramPhoto(chatId, chartUrl, '📈 Price Chart');
        return;
      }
    }
    
    // Trending coins chart
    if (response.includes('trending') || response.includes('top movers') || response.includes('gainers')) {
      console.log('Detected trending coins query');
      
      // Look for percentage patterns
      const percentPattern = /([+-]?\d+\.?\d*%)/g;
      const percentages = fullResponse.match(percentPattern);
      
      if (percentages && percentages.length >= 3) {
        const values = percentages.slice(0, 7).map(p => parseFloat(p.replace('%', '')));
        const labels = values.map((_, i) => `Token ${i + 1}`);
        const colors = values.map(v => v >= 0 ? 'rgba(34, 197, 94, 0.8)' : 'rgba(239, 68, 68, 0.8)');
        
        const chartUrl = generateChartImage({
          type: 'horizontalBar',
          title: 'Trending Tokens (24h Change)',
          labels,
          datasets: [{
            label: '24h Change %',
            data: values,
            backgroundColor: colors
          }]
        });
        
        await sendTelegramPhoto(chatId, chartUrl, '🔥 Trending Chart');
        return;
      }
    }
    
    // Market stats chart
    if ((response.includes('market') && response.includes('cap')) || response.includes('dominance') || response.includes('total volume')) {
      console.log('Detected market overview query');
      
      // Try to extract market cap and volume numbers
      const largeNumberPattern = /(\d{1,3}(?:,\d{3})*(?:\.\d+)?[BMK]?)/g;
      const numbers = fullResponse.match(largeNumberPattern);
      
      if (numbers && numbers.length >= 2) {
        const values = numbers.slice(0, 4).map(n => {
          const num = parseFloat(n.replace(/,/g, ''));
          if (n.includes('B')) return num * 1000000000;
          if (n.includes('M')) return num * 1000000;
          if (n.includes('K')) return num * 1000;
          return num;
        });
        
        const chartUrl = generateChartImage({
          type: 'bar',
          title: 'Market Overview',
          labels: ['Market Cap', 'Volume', 'Metric 3', 'Metric 4'].slice(0, values.length),
          datasets: [{
            label: 'Value',
            data: values,
            backgroundColor: 'rgba(59, 130, 246, 0.8)'
          }]
        });
        
        await sendTelegramPhoto(chatId, chartUrl, '📊 Market Stats');
        return;
      }
    }
    
  } catch (error) {
    console.error('Error generating chart:', error);
    // Silently fail - user still gets text response
  }
}

// Handle commands
async function handleCommand(command: string, chatId: number, userId: number): Promise<boolean> {
  switch (command) {
    case '/start':
      await sendTelegramMessage(
        chatId,
        escapeMarkdown(
          '🌊 Welcome to WCO Bubbles!\n\n' +
          'I\'m your AI assistant for W-Chain blockchain data. Ask me anything about:\n' +
          '• Token prices and market data\n' +
          '• Wallet holders and distribution\n' +
          '• Trading activity and volume\n' +
          '• Network statistics\n' +
          '• And much more!\n\n' +
          'Just send me a message or use these commands:\n' +
          '/price - Check WCO price\n' +
          '/help - See all available commands\n' +
          '/clear - Clear conversation history'
        )
      );
      return true;
      
    case '/help':
      await sendTelegramMessage(
        chatId,
        escapeMarkdown(
          '📚 Available Commands:\n\n' +
          '/price - Get current WCO price\n' +
          '/clear - Clear your conversation history\n' +
          '/help - Show this help message\n\n' +
          'You can also ask me questions in natural language:\n' +
          '• "What\'s the WCO price?"\n' +
          '• "Show me top 10 holders"\n' +
          '• "Recent whale transactions"\n' +
          '• "Network activity today"\n\n' +
          'I have access to 50+ W-Chain data tools!'
        )
      );
      return true;
      
    case '/clear':
      const sessionId = `telegram_${userId}`;
      
      // Find and delete conversation for this session
      const { data: conversations } = await supabase
        .from('chat_conversations')
        .select('id')
        .eq('session_id', sessionId);
      
      if (conversations && conversations.length > 0) {
        for (const conv of conversations) {
          await supabase
            .from('chat_messages')
            .delete()
            .eq('conversation_id', conv.id);
          
          await supabase
            .from('chat_conversations')
            .delete()
            .eq('id', conv.id);
        }
      }
      
      await sendTelegramMessage(
        chatId,
        escapeMarkdown('✅ Conversation history cleared! Start fresh.')
      );
      return true;
      
    case '/price':
      // Let this fall through to Bubbles to handle naturally
      return false;
      
    default:
      return false;
  }
}

serve(async (req) => {
  // Handle CORS preflight
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }
  
  try {
    const update = await req.json();
    console.log('Received Telegram update:', JSON.stringify(update, null, 2));
    
    // Extract message
    const message = update.message || update.edited_message;
    if (!message || !message.text) {
      return new Response('OK', { status: 200 });
    }
    
    const chatId = message.chat.id;
    const userId = message.from.id;
    const messageText = message.text;
    const sessionId = `telegram_${userId}`;
    
    console.log(`Processing message from user ${userId}: ${messageText}`);
    
    // Handle commands
    if (messageText.startsWith('/')) {
      const handled = await handleCommand(messageText, chatId, userId);
      if (handled) {
        return new Response('OK', { status: 200 });
      }
    }
    
    // Send typing indicator
    await fetch(`https://api.telegram.org/bot${TELEGRAM_BOT_TOKEN}/sendChatAction`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        chat_id: chatId,
        action: 'typing'
      })
    });
    
    // Find existing conversation
    const { data: conversations } = await supabase
      .from('chat_conversations')
      .select('id')
      .eq('session_id', sessionId)
      .order('updated_at', { ascending: false })
      .limit(1);
    
    const conversationId = conversations && conversations.length > 0 ? conversations[0].id : null;
    
    // Call chat-wchain function with streaming
    console.log('Calling chat-wchain with session:', sessionId);
    
    const response = await fetch(`${SUPABASE_URL}/functions/v1/chat-wchain`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${SUPABASE_ANON_KEY}`,
      },
      body: JSON.stringify({
        messages: [{ role: 'user', content: messageText }],
        conversationId,
        sessionId
      }),
    });

    if (!response.ok) {
      console.error('Error calling chat-wchain:', response.status);
      await sendTelegramMessage(
        chatId,
        escapeMarkdown('Sorry, I encountered an error processing your request. Please try again.')
      );
      return new Response('OK', { status: 200 });
    }

    // Accumulate streaming response
    const reader = response.body?.getReader();
    const decoder = new TextDecoder();
    
    if (!reader) {
      throw new Error('No reader available');
    }

    let fullMessage = '';
    let buffer = '';

    while (true) {
      const { done, value } = await reader.read();
      if (done) break;

      buffer += decoder.decode(value, { stream: true });
      const lines = buffer.split('\n');
      buffer = lines.pop() || '';

      for (const line of lines) {
        if (!line.trim() || line.startsWith(':')) continue;
        if (!line.startsWith('data: ')) continue;

        const data = line.slice(6);
        
        try {
          const parsed = JSON.parse(data);
          if (parsed.delta) {
            fullMessage += parsed.delta;
          }
        } catch (e) {
          // Skip invalid JSON
        }
      }
    }
    
    console.log('Received complete response from chat-wchain');
    
    // Format and send response
    const responseText = fullMessage || 'I apologize, but I couldn\'t generate a response.';
    const formattedResponse = formatForTelegram(responseText);
    
    await sendTelegramMessage(chatId, formattedResponse);
    
    // Try to detect and send charts
    await detectAndSendCharts(chatId, fullMessage);
    
    return new Response('OK', { status: 200 });
    
  } catch (error) {
    console.error('Error in telegram-bot function:', error);
    return new Response('OK', { status: 200 }); // Always return 200 to Telegram
  }
});
