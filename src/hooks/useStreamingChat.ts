import { useState, useRef, useCallback, startTransition } from 'react';
import type { Message } from '../types/message';

interface UseStreamingChatProps {
  selectedModel: string;
  isWebSearchEnabled: boolean;
  messages: Message[];
  setMessages: React.Dispatch<React.SetStateAction<Message[]>>;
}

export const useStreamingChat = ({ 
  selectedModel, 
  isWebSearchEnabled, 
  messages, 
  setMessages 
}: UseStreamingChatProps) => {
  const [isAiResponding, setIsAiResponding] = useState(false);
  
  // Stream accumulation for better performance - now per message
  const streamAccumulatorsRef = useRef<Map<string, { content: string; reasoning: string }>>(new Map());

  // Throttled update function for streaming - now message-specific
  const updateStreamingMessage = useCallback((messageId: string, content: string, reasoning?: string) => {
    startTransition(() => {
      setMessages(prev => prev.map(msg => {
        if (msg.id === messageId) {
          return { 
            ...msg, 
            content,
            reasoning,
            isStreaming: true
          };
        }
        return msg; // Keep other messages unchanged
      }));
    });
  }, [setMessages]);

  // Create a throttled update function for a specific message
  const createThrottledUpdateForMessage = useCallback((messageId: string) => {
    let timeoutRef: number | null = null;
    let updateCount = 0;
    
    return () => {
      if (timeoutRef) return; // Skip if already scheduled
      
      // Use faster updates for the first few chunks to show markdown formatting immediately
      const delay = updateCount < 3 ? 8 : 16; // 8ms for first 3 updates, then 16ms
      updateCount++;
      
      timeoutRef = window.setTimeout(() => {
        const accumulator = streamAccumulatorsRef.current.get(messageId);
        if (accumulator) {
          updateStreamingMessage(
            messageId, 
            accumulator.content,
            accumulator.reasoning || undefined
          );
        }
        timeoutRef = null;
      }, delay);
    };
  }, [updateStreamingMessage]);

  const sendMessage = useCallback(async (inputValue: string) => {
    const currentInput = inputValue.trim();
    if (!currentInput) return;

    setIsAiResponding(true);

    const userMessage: Message = {
      id: Date.now().toString(),
      content: currentInput,
      sender: 'user',
      timestamp: new Date(),
    };

    // Limit the history sent to the API to improve performance for the first token
    const HISTORY_SIZE_LIMIT = 20; // Keep the last 20 messages
    const recentMessages = messages.slice(-HISTORY_SIZE_LIMIT);

    const messagesForApi = [
      ...recentMessages.map(msg => ({ 
        role: msg.sender === 'user' ? 'user' : 'assistant',
        content: msg.content,
      })),
      { role: 'user', content: currentInput }
    ];

    const aiMessageId = (Date.now() + 1).toString();
    let initialAiModel: string | undefined = undefined;
    if (selectedModel === 'auto') {
      initialAiModel = 'classifying'; // Special status for auto mode
    } else if (selectedModel) {
      initialAiModel = selectedModel; // Pre-set model if manually chosen
    }

    const aiPlaceholderMessage: Message = {
      id: aiMessageId,
      content: '', 
      sender: 'ai',
      timestamp: new Date(),
      model: initialAiModel,
      isStreaming: true,
    };
    setMessages(prev => [...prev, userMessage, aiPlaceholderMessage]);

    // Initialize accumulator for this specific message
    streamAccumulatorsRef.current.set(aiMessageId, { content: '', reasoning: '' });
    const throttledUpdateForThisMessage = createThrottledUpdateForMessage(aiMessageId);

    try {
      const response = await fetch('https://ai-api.gmsoftwares.com/api/chat', {
        method: 'POST',
        headers: {
          'Authorization': 'ljubimte',
          'Content-Type': 'application/json',
          'Accept': 'text/event-stream',
        },
        body: JSON.stringify({
          model: selectedModel === 'auto' ? selectedModel : (isWebSearchEnabled ? `${selectedModel}:online` : selectedModel),
          stream: true,
          messages: messagesForApi,
        }),
      });

      if (!response.ok || !response.body) {
        const errorText = response.body ? await response.text() : `HTTP error! status: ${response.status}`;
        setMessages(prev => prev.map(msg =>
          msg.id === aiMessageId ? { ...msg, content: `Error: ${errorText}`, isStreaming: false } : msg
        ));
        streamAccumulatorsRef.current.delete(aiMessageId); // Clean up
        return;
      }

      const reader = response.body.getReader();
      const decoder = new TextDecoder();
      let streamBuffer = ''; 
      let currentAiMessageModel: string | undefined = undefined;
      let firstChunk = true;

      // eslint-disable-next-line no-constant-condition
      while (true) {
        const { value, done } = await reader.read();
        if (done) break;

        streamBuffer += decoder.decode(value, { stream: true });
        let eolIndex;

        while ((eolIndex = streamBuffer.indexOf('\n')) >= 0) {
          const line = streamBuffer.substring(0, eolIndex).trim();
          streamBuffer = streamBuffer.substring(eolIndex + 1);

          if (line.startsWith('event: metadata')) {
            const nextLine = streamBuffer.substring(0, streamBuffer.indexOf('\n')).trim();
            if (nextLine.startsWith('data: ')) {
              try {
                const metadata = JSON.parse(nextLine.substring(5));
                if (metadata.final_model_used_for_generation) {
                  currentAiMessageModel = metadata.final_model_used_for_generation;
                  setMessages(prev =>
                    prev.map(msg =>
                      msg.id === aiMessageId ? { ...msg, model: currentAiMessageModel } : msg
                    )
                  );
                }
              } catch (parseError) {
                console.error('Error parsing metadata:', parseError, 'Data:', nextLine);
              }
            }
            continue;
          } 

          if (line.startsWith('data: ')) {
            const jsonData = line.substring(5).trim();
            if (jsonData === '[DONE]') {
              continue;
            }
            if (jsonData) {
              try {
                const chunk = JSON.parse(jsonData);
                if (chunk.choices && chunk.choices[0] && chunk.choices[0].delta) {
                  const deltaContent = chunk.choices[0].delta.content;
                  if (deltaContent) {
                    const accumulator = streamAccumulatorsRef.current.get(aiMessageId);
                    if (accumulator) {
                      accumulator.content += deltaContent;
                      
                      // For first chunk, update immediately for faster display
                      if (firstChunk) {
                        firstChunk = false;
                        updateStreamingMessage(aiMessageId, accumulator.content);
                      } else {
                        // Throttle subsequent updates
                        throttledUpdateForThisMessage();
                      }
                    }
                  }
                  // Check for reasoning
                  const reasoningContent = chunk.choices[0].delta.reasoning;
                  if (reasoningContent) {
                    const accumulator = streamAccumulatorsRef.current.get(aiMessageId);
                    if (accumulator) {
                      accumulator.reasoning += reasoningContent;
                      throttledUpdateForThisMessage();
                    }
                  }
                }
                if (chunk.usage) {
                  console.log('API Usage:', chunk.usage);
                }
              } catch (parseError) {
                console.error('Error parsing stream data:', parseError, 'Data:', jsonData);
              }
            }
          }
        }
      }
      
      // Process any remaining data and finalize
      if (streamBuffer.startsWith('data: ')) {
        const jsonData = streamBuffer.substring(5).trim();
        if (jsonData && jsonData !== '[DONE]') {
            try {
                const chunk = JSON.parse(jsonData);
                if (chunk.choices && chunk.choices[0] && chunk.choices[0].delta) {
                    const deltaContent = chunk.choices[0].delta.content;
                    const reasoningContent = chunk.choices[0].delta.reasoning;
                    const accumulator = streamAccumulatorsRef.current.get(aiMessageId);
                    if (accumulator) {
                      if (deltaContent) {
                        accumulator.content += deltaContent;
                      }
                      if (reasoningContent) {
                        accumulator.reasoning += reasoningContent;
                      }
                    }
                }
            } catch(e) {
                console.error("Error parsing final accumulated data:", e, "Data:", jsonData);
            }
        }
      }

      // Final update with complete content and mark as not streaming
      const finalAccumulator = streamAccumulatorsRef.current.get(aiMessageId);
      setMessages(prev => prev.map(msg =>
        msg.id === aiMessageId ? { 
          ...msg, 
          content: finalAccumulator?.content || '',
          reasoning: finalAccumulator?.reasoning || undefined,
          model: currentAiMessageModel,
          isStreaming: false 
        } : msg
      ));

      // Clean up accumulator for this message
      streamAccumulatorsRef.current.delete(aiMessageId);

    } catch (error) {
      console.error('Failed to send message or process stream:', error);
      setMessages(prev => prev.map(msg =>
        msg.id === aiMessageId ? { 
          ...msg, 
          content: `Error: ${error instanceof Error ? error.message : String(error)}`,
          isStreaming: false 
        } : msg
      ));
      // Clean up accumulator for this message
      streamAccumulatorsRef.current.delete(aiMessageId);
    } finally {
      setIsAiResponding(false);
    }
  }, [selectedModel, isWebSearchEnabled, messages, setMessages, updateStreamingMessage, createThrottledUpdateForMessage]);

  return {
    sendMessage,
    isAiResponding
  };
}; 