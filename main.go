package main

import (
	"bufio"
	"bytes"
	"context"
	"encoding/json"
	"fmt"
	"io"
	"log"
	"net/http"
	"os"
	"strings"
	"time"
)

const (
	listenAddr              = ":42069"
	authHeaderKey           = "Authorization"
	authHeaderValue         = "iloveyou" // Replace with a more secure method in production
	ollamaURL               = "http://localhost:11434/api/generate"
	openrouterURL           = "https://openrouter.ai/api/v1/chat/completions"
	classificationModel     = "gemma3:4b" // Using gemma3:4b for classification
	classificationSystemMsg = "You are a helpful assistant for classification tasks."
)

// classificationMap defines the different model capabilities the backend can handle.
var classificationMap = map[string]struct {
	Name  string
	Model string // OpenRouter model for generation
}{
	"1": {
		Name:  "Research & Knowledge",
		Model: "perplexity/sonar-pro", // Perplexity models excel at research and knowledge tasks
	},
	"2": {
		Name:  "Planning & Strategy",
		Model: "openai/gpt-4o-mini", // Good all-around model for planning and structured thinking
	},
	"3": {
		Name:  "Writing & Communication",
		Model: "anthropic/claude-3.7-sonnet", // Strong model for writing assistance and clear communication
	},
	"4": {
		Name:  "Explanation & Instruction",
		Model: "google/gemini-2.5-flash-preview", // Efficient and capable model for explanations
	},
	"5": {
		Name:  "Content Generation",
		Model: "google/gemini-2.5-pro-preview-03-25", // Good for structured data and content generation
	},
	"6": {
		Name:  "Emotional Intelligence & Support",
		Model: "anthropic/claude-3.7-sonnet", // Empathetic and conversational model
	},
	"7": {
		Name:  "Code & Technical Assistance",
		Model: "x-ai/grok-3-mini-beta", // Top-tier model for coding tasks
	},
	"8": {
		Name:  "Creative & Artistic",
		Model: "openai/gpt-4.5-preview", // Strong creative and instruction-following model
	},
	"9": {
		Name:  "Reasoning & Analysis",
		Model: "openai/o3-mini-high", // Excellent model for nuanced reasoning tasks
	},
}

// --- Struct Definitions ---

type chatMessage struct {
	Role    string `json:"role"`
	Content string `json:"content"`
}

// completionRequest structure adaptable for both Ollama and OpenRouter
type completionRequest struct {
	Model    string        `json:"model"`
	Prompt   string        `json:"prompt,omitempty"`   // Used by Ollama
	Messages []chatMessage `json:"messages,omitempty"` // Used by OpenRouter Chat API
	Stream   bool          `json:"stream"`
}

// ollamaResponse structure for non-streaming responses
type ollamaResponse struct {
	Response string `json:"response"`
	Done     bool   `json:"done"`
}

// openRouterChoice structure within the response
type openRouterChoice struct {
	Message chatMessage `json:"message"`
}

// openRouterCompletionResponse structure for Chat API
type openRouterCompletionResponse struct {
	ID      string             `json:"id"`
	Object  string             `json:"object"`
	Created int64              `json:"created"`
	Model   string             `json:"model"`
	Choices []openRouterChoice `json:"choices"`
}

// StreamChunk represents a single chunk from OpenRouter's streaming response
type StreamChunk struct {
	ID      string `json:"id"`
	Object  string `json:"object"`
	Created int64  `json:"created"`
	Model   string `json:"model"`
	Choices []struct {
		Index        int    `json:"index"`
		Delta        delta  `json:"delta"`
		FinishReason string `json:"finish_reason,omitempty"`
	} `json:"choices"`
}

type delta struct {
	Role    string `json:"role,omitempty"`
	Content string `json:"content,omitempty"`
}

// ServerSentEvent represents a server-sent event to be sent to the client
type ServerSentEvent struct {
	Event string `json:"event,omitempty"`
	Data  string `json:"data"`
}

// --- Main Application Logic ---

func main() {
	// Ensure OpenRouter API key is set
	if os.Getenv("OPENROUTER_API_KEY") == "" {
		log.Fatal("FATAL: OPENROUTER_API_KEY environment variable is not set")
	}

	// Set up HTTP handler
	http.HandleFunc("/api/chat", handler)
	log.Printf("Server starting on %s...", listenAddr)
	log.Fatal(http.ListenAndServe(listenAddr, nil))
}

// handler is the main HTTP request handler
func handler(w http.ResponseWriter, r *http.Request) {
	// 1. Validate Request Method
	if r.Method != http.MethodPost {
		http.Error(w, "Method Not Allowed: Only POST requests are accepted", http.StatusMethodNotAllowed)
		return
	}

	// 2. Validate Authorization (Simple Check)
	if r.Header.Get(authHeaderKey) != authHeaderValue {
		http.Error(w, "Forbidden: Invalid or missing authorization token", http.StatusForbidden)
		return
	}

	// 3. Decode Request Body
	var requestBody struct {
		Prompt string `json:"prompt"`
		Stream bool   `json:"stream"`
	}
	if err := json.NewDecoder(r.Body).Decode(&requestBody); err != nil {
		http.Error(w, "Bad Request: Could not decode JSON payload", http.StatusBadRequest)
		return
	}

	// 4. Validate Prompt
	if requestBody.Prompt == "" {
		http.Error(w, "Bad Request: 'prompt' field cannot be empty", http.StatusBadRequest)
		return
	}
	log.Printf("Received prompt: %s", requestBody.Prompt) // Log received prompt

	// 5. Classify the Prompt using Local Ollama Model (gemma3:4b)
	classificationNumber, err := classifyPrompt(requestBody.Prompt)
	if err != nil {
		log.Printf("ERROR: Classification failed: %v", err)
		http.Error(w, "Internal Server Error: Failed during prompt classification", http.StatusInternalServerError)
		return
	}
	log.Printf("Classified as: %s", classificationNumber)

	// 6. Retrieve Classification Details
	classificationInfo, ok := classificationMap[classificationNumber]
	if !ok {
		log.Printf("ERROR: Invalid classification number received: %s", classificationNumber)
		// Default to a general model or return an error
		// For now, return an error
		http.Error(w, "Bad Request: Invalid classification result", http.StatusBadRequest)
		return
	}
	fullClassificationName := classificationNumber + "-" + classificationInfo.Name
	log.Printf("Mapped to: %s (Model: %s)", fullClassificationName, classificationInfo.Model)

	// 7. Handle Special Case: Content Generation (Static JSON Response)
	if classificationNumber == "5" {
		log.Println("Handling classification '5' (Content Generation) with static JSON.")
		// Example static response structure
		staticResponse := map[string]interface{}{
			"lists": []map[string]interface{}{
				{
					"title": "Sample List",
					"items": []string{"Item 1", "Item 2", "Item 3"},
				},
			},
			"tables": []map[string]interface{}{
				{
					"headers": []string{"Column 1", "Column 2"},
					"rows": [][]string{
						{"Data 1", "Data 2"},
						{"Data 3", "Data 4"},
					},
				},
			},
			"structured_data": map[string]interface{}{
				"sample_object": map[string]string{
					"key1": "value1",
					"key2": "value2",
				},
			},
		}
		jsonResponse(w, map[string]interface{}{
			"classification": fullClassificationName,
			"model":          classificationInfo.Model, // Still report the intended model
			"response":       staticResponse,
			"response_type":  "structured_json", // Indicate the type of response
		})
		return
	}

	// 8. Handle streaming vs non-streaming mode
	if requestBody.Stream {
		// Set up SSE response headers
		w.Header().Set("Content-Type", "text/event-stream")
		w.Header().Set("Cache-Control", "no-cache")
		w.Header().Set("Connection", "keep-alive")
		w.Header().Set("X-Accel-Buffering", "no") // For Nginx
		w.WriteHeader(http.StatusOK)

		// Send initial message with classification info
		initialEvent := ServerSentEvent{
			Event: "metadata",
			Data: string(mustJSON(map[string]interface{}{
				"classification": fullClassificationName,
				"model":          classificationInfo.Model,
			})),
		}
		if err := writeSSE(w, initialEvent); err != nil {
			log.Printf("ERROR: Failed to write initial SSE event: %v", err)
			return
		}
		w.(http.Flusher).Flush()

		// Stream response from OpenRouter
		err = streamOpenRouterResponse(r.Context(), w, requestBody.Prompt, classificationInfo.Model)
		if err != nil {
			log.Printf("ERROR: Streaming OpenRouter response failed: %v", err)
			errorEvent := ServerSentEvent{
				Event: "error",
				Data:  fmt.Sprintf(`{"error": "%s"}`, err.Error()),
			}
			writeSSE(w, errorEvent)
			w.(http.Flusher).Flush()
		}

		// Send end event
		endEvent := ServerSentEvent{
			Event: "done",
			Data:  "{}",
		}
		writeSSE(w, endEvent)
		w.(http.Flusher).Flush()
		return
	}

	// Non-streaming mode (existing behavior)
	log.Printf("Forwarding prompt to OpenRouter using model: %s", classificationInfo.Model)
	openRouterResponse, err := getOpenRouterResponseWithRetry(requestBody.Prompt, "", classificationInfo.Model, 3) // 3 retries
	if err != nil {
		log.Printf("ERROR: OpenRouter request failed after retries: %v", err)
		http.Error(w, "Internal Server Error: Failed to get response from language model", http.StatusInternalServerError)
		return
	}

	// 9. Return Successful Response
	log.Printf("Successfully received response from OpenRouter for classification: %s", fullClassificationName)
	jsonResponse(w, map[string]interface{}{
		"classification": fullClassificationName,
		"model":          classificationInfo.Model,
		"response":       openRouterResponse,
		"response_type":  "text", // Indicate the type of response
	})
}

// --- Helper Functions ---

// classifyPrompt sends the user input to a local Ollama instance for classification.
// Now specifically using the classificationModel (gemma3:4b).
func classifyPrompt(userInput string) (string, error) {
	classificationPrompt := `Analyze the user's request below and classify it into one of the following categories.

CONTEXT START
` + userInput + `
CONTEXT END

Classifications:
1 - Research & Knowledge (Finding information, summarizing data, answering factual questions)
2 - Planning & Strategy (Organization, time management, project planning, decision-making)
3 - Writing & Communication (Text refinement, proofreading, style adjustment, clarity improvement)
4 - Explanation & Instruction (Breaking down complex topics, teaching concepts, how-to guides)
5 - Content Generation (Creating structured content like lists, tables, or formatted information)
6 - Emotional Intelligence & Support (Advice, motivation, emotional processing, wellness)
7 - Code & Technical Assistance (Programming help, debugging, technical explanation)
8 - Creative & Artistic (Fiction writing, idea generation, artistic concepts, storytelling)
9 - Reasoning & Analysis (Critical thinking, ethical analysis, argument evaluation, logic)

Based *only* on the user's request provided in the CONTEXT, reply with *only* the single number corresponding to the best classification.`

	reqPayload := completionRequest{
		Model:  classificationModel, // Use the specified classification model
		Prompt: classificationPrompt,
		Stream: false,
	}

	reqBodyBytes, err := json.Marshal(reqPayload)
	if err != nil {
		log.Printf("ERROR: Failed to marshal classification request: %v", err)
		return "", err // Return specific error
	}

	// Context with timeout for the HTTP request
	ctx, cancel := context.WithTimeout(context.Background(), 20*time.Second) // Increased timeout slightly
	defer cancel()

	httpReq, err := http.NewRequestWithContext(ctx, http.MethodPost, ollamaURL, bytes.NewBuffer(reqBodyBytes))
	if err != nil {
		log.Printf("ERROR: Failed to create Ollama request: %v", err)
		return "", err
	}
	httpReq.Header.Set("Content-Type", "application/json")

	// Send request to Ollama
	client := &http.Client{Timeout: 25 * time.Second} // Client timeout slightly longer than context
	resp, err := client.Do(httpReq)
	if err != nil {
		// Handle context deadline exceeded specifically if needed
		if ctx.Err() == context.DeadlineExceeded {
			log.Printf("ERROR: Ollama request timed out: %v", err)
			return "", ctx.Err() // Return timeout error
		}
		log.Printf("ERROR: Ollama request failed: %v", err)
		return "", err
	}
	defer resp.Body.Close()

	// Read and log the raw response body for debugging if status is not OK
	respBodyBytes, readErr := io.ReadAll(resp.Body)
	if readErr != nil {
		log.Printf("ERROR: Failed to read Ollama response body: %v", readErr)
		// Decide if you should return here or try to proceed if status was OK
	}

	if resp.StatusCode != http.StatusOK {
		log.Printf("ERROR: Ollama API returned non-OK status: %d. Body: %s", resp.StatusCode, string(respBodyBytes))
		// Consider returning a more specific error
		// We should check for the "llama runner process has terminated" specifically if we want to give a helpful error.
		if bytes.Contains(respBodyBytes, []byte("llama runner process has terminated")) {
			log.Printf("SUGGESTION: The Ollama model process terminated. This often indicates insufficient system resources or a model issue. Consider using a smaller model or checking Ollama logs.")
		}
		return "", err // Or a custom error: fmt.Errorf("Ollama classification API error: status %d, body: %s", resp.StatusCode, string(respBodyBytes))
	}

	// Decode the successful response
	var ollamaResp ollamaResponse
	// Use the already read body bytes to avoid reading again
	if err := json.Unmarshal(respBodyBytes, &ollamaResp); err != nil {
		log.Printf("ERROR: Failed to decode Ollama response JSON: %v. Body: %s", err, string(respBodyBytes))
		return "", err
	}

	// Basic validation/cleaning of the response (expecting just a number)
	// Trim whitespace and potentially other non-numeric characters if needed
	classificationResult := bytes.TrimSpace([]byte(ollamaResp.Response))
	log.Printf("DEBUG: Raw classification response from Ollama: '%s'", ollamaResp.Response)

	// Add more robust validation if necessary (e.g., check if it's actually a number within the expected range)
	_, ok := classificationMap[string(classificationResult)]
	if !ok {
		log.Printf("WARN: Ollama returned an unexpected classification: '%s'. Defaulting or erroring might be needed.", classificationResult)
		// Decide how to handle - return error, default, retry? For now, return what we got.
	}

	return string(classificationResult), nil
}

// getOpenRouterResponse sends the prompt to OpenRouter.
func getOpenRouterResponse(userInput, _, model string) (string, error) {
	// Use the Chat Completions format for OpenRouter
	reqPayload := completionRequest{
		Model: model,
		Messages: []chatMessage{
			// Include only the user's input without any additional prompt template
			{Role: "user", Content: userInput},
		},
		Stream: false,
		// Add other parameters like temperature, max_tokens if needed
		// "max_tokens": 1024,
		// "temperature": 0.7,
	}

	reqBodyBytes, err := json.Marshal(reqPayload)
	if err != nil {
		log.Printf("ERROR: Failed to marshal OpenRouter request: %v", err)
		return "", err
	}

	// Context with timeout
	ctx, cancel := context.WithTimeout(context.Background(), 45*time.Second) // Longer timeout for potentially complex generation
	defer cancel()

	httpReq, err := http.NewRequestWithContext(ctx, http.MethodPost, openrouterURL, bytes.NewBuffer(reqBodyBytes))
	if err != nil {
		log.Printf("ERROR: Failed to create OpenRouter request: %v", err)
		return "", err
	}

	// Set Headers
	httpReq.Header.Set("Content-Type", "application/json")
	httpReq.Header.Set("Authorization", "Bearer "+os.Getenv("OPENROUTER_API_KEY"))
	// OpenRouter specific headers (optional, check their docs)
	// httpReq.Header.Set("HTTP-Referer", "your-app-url")
	// httpReq.Header.Set("X-Title", "Your App Name")

	// Send Request
	client := &http.Client{Timeout: 60 * time.Second} // Longer client timeout
	resp, err := client.Do(httpReq)
	if err != nil {
		if ctx.Err() == context.DeadlineExceeded {
			log.Printf("ERROR: OpenRouter request timed out: %v", err)
			return "", ctx.Err()
		}
		log.Printf("ERROR: OpenRouter request failed: %v", err)
		return "", err
	}
	defer resp.Body.Close()

	// Read response body for potential error logging
	respBodyBytes, readErr := io.ReadAll(resp.Body)
	if readErr != nil {
		log.Printf("ERROR: Failed to read OpenRouter response body: %v", readErr)
		// Continue to check status code, but log this failure
	}

	if resp.StatusCode != http.StatusOK {
		log.Printf("ERROR: OpenRouter API returned non-OK status: %d. Body: %s", resp.StatusCode, string(respBodyBytes))
		// Consider returning a more specific error based on status code
		return "", err // Or a custom error: fmt.Errorf("OpenRouter API error: status %d", resp.StatusCode)
	}

	// Decode successful response
	var openRouterResp openRouterCompletionResponse
	if err := json.Unmarshal(respBodyBytes, &openRouterResp); err != nil {
		log.Printf("ERROR: Failed to decode OpenRouter response JSON: %v. Body: %s", err, string(respBodyBytes))
		return "", err
	}

	// Extract the content from the first choice
	if len(openRouterResp.Choices) == 0 || openRouterResp.Choices[0].Message.Content == "" {
		log.Printf("WARN: OpenRouter response contained no choices or empty content. Body: %s", string(respBodyBytes))
		// Decide how to handle: return error, empty string, default message?
		return "", err // Or a custom error: errors.New("no content in OpenRouter response")
	}

	return openRouterResp.Choices[0].Message.Content, nil
}

// streamOpenRouterResponse sends a streaming request to OpenRouter and forwards chunks to the client
func streamOpenRouterResponse(ctx context.Context, w http.ResponseWriter, userInput, model string) error {
	// Create the OpenRouter request payload with streaming enabled
	reqPayload := completionRequest{
		Model: model,
		Messages: []chatMessage{
			{Role: "user", Content: userInput},
		},
		Stream: true,
	}

	reqBodyBytes, err := json.Marshal(reqPayload)
	if err != nil {
		return fmt.Errorf("failed to marshal OpenRouter request: %w", err)
	}

	// Create HTTP request with context
	httpReq, err := http.NewRequestWithContext(ctx, http.MethodPost, openrouterURL, bytes.NewBuffer(reqBodyBytes))
	if err != nil {
		return fmt.Errorf("failed to create OpenRouter request: %w", err)
	}

	// Set headers
	httpReq.Header.Set("Content-Type", "application/json")
	httpReq.Header.Set("Authorization", "Bearer "+os.Getenv("OPENROUTER_API_KEY"))
	httpReq.Header.Set("Accept", "text/event-stream")

	// Send request
	client := &http.Client{Timeout: 120 * time.Second} // Longer timeout for streaming
	resp, err := client.Do(httpReq)
	if err != nil {
		return fmt.Errorf("OpenRouter request failed: %w", err)
	}
	defer resp.Body.Close()

	if resp.StatusCode != http.StatusOK {
		respBody, _ := io.ReadAll(resp.Body)
		return fmt.Errorf("OpenRouter API returned non-OK status: %d. Body: %s", resp.StatusCode, string(respBody))
	}

	// Process streaming response
	reader := bufio.NewReader(resp.Body)
	var contentBuilder strings.Builder

	for {
		line, err := reader.ReadString('\n')
		if err != nil {
			if err == io.EOF {
				break
			}
			return fmt.Errorf("error reading stream: %w", err)
		}

		// Skip empty or "data: [DONE]" lines
		line = strings.TrimSpace(line)
		if line == "" || line == "data: [DONE]" {
			continue
		}

		// Extract the JSON data payload
		if !strings.HasPrefix(line, "data: ") {
			continue
		}
		data := strings.TrimPrefix(line, "data: ")

		// Parse the stream chunk
		var chunk StreamChunk
		if err := json.Unmarshal([]byte(data), &chunk); err != nil {
			log.Printf("WARN: Failed to unmarshal chunk: %v, data: %s", err, data)
			continue
		}

		// Process the chunk
		if len(chunk.Choices) > 0 {
			choice := chunk.Choices[0]
			content := choice.Delta.Content
			
			if content != "" {
				// Add to content builder for tracking total response
				contentBuilder.WriteString(content)
				
				// Create and send SSE event
				event := ServerSentEvent{
					Event: "chunk",
					Data:  string(mustJSON(map[string]string{"content": content})),
				}
				
				if err := writeSSE(w, event); err != nil {
					return fmt.Errorf("failed to write SSE: %w", err)
				}
				w.(http.Flusher).Flush()
			}
			
			// Check if the response is complete
			if choice.FinishReason != "" {
				log.Printf("Streaming response complete. Finish reason: %s", choice.FinishReason)
				break
			}
		}
	}

	log.Printf("Successfully streamed full response (%d characters)", contentBuilder.Len())
	return nil
}

// writeSSE writes a server-sent event to the response writer
func writeSSE(w http.ResponseWriter, event ServerSentEvent) error {
	if event.Event != "" {
		if _, err := fmt.Fprintf(w, "event: %s\n", event.Event); err != nil {
			return err
		}
	}
	if _, err := fmt.Fprintf(w, "data: %s\n\n", event.Data); err != nil {
		return err
	}
	return nil
}

// mustJSON marshals an object to JSON, panicking on error
func mustJSON(v interface{}) []byte {
	data, err := json.Marshal(v)
	if err != nil {
		panic(fmt.Sprintf("failed to marshal JSON: %v", err))
	}
	return data
}

// getOpenRouterResponseWithRetry wraps getOpenRouterResponse with exponential backoff retry logic.
func getOpenRouterResponseWithRetry(userInput, _, model string, maxRetries int) (string, error) {
	var lastErr error
	baseDelay := 1 * time.Second // Initial delay

	for attempt := 0; attempt < maxRetries; attempt++ {
		response, err := getOpenRouterResponse(userInput, "", model)
		if err == nil {
			// Success
			return response, nil
		}

		// Store the last error encountered
		lastErr = err
		log.Printf("WARN: OpenRouter attempt %d/%d failed: %v", attempt+1, maxRetries, err)

		// Check if the error indicates a timeout or a potentially temporary server issue
		// Add more specific error checks if needed (e.g., rate limits 429)
		if err == context.DeadlineExceeded || (err != nil && (bytes.Contains([]byte(err.Error()), []byte("500")) || bytes.Contains([]byte(err.Error()), []byte("503")))) {
			// Calculate delay: baseDelay * 2^attempt (exponential backoff)
			delay := baseDelay * time.Duration(1<<attempt) // 1s, 2s, 4s, ...
			// Add some jitter to avoid thundering herd
			jitter := time.Duration(time.Now().UnixNano()%1000) * time.Millisecond
			actualDelay := delay + jitter

			log.Printf("Retrying OpenRouter request in %v...", actualDelay)
			time.Sleep(actualDelay)
		} else {
			// Don't retry on non-transient errors (like bad request 4xx, auth errors 401/403)
			log.Printf("Not retrying due to non-transient error: %v", err)
			break // Exit the retry loop
		}
	}

	log.Printf("ERROR: OpenRouter request failed after %d attempts.", maxRetries)
	return "", lastErr // Return the last error encountered
}

// jsonResponse is a helper to marshal data to JSON and write it to the response writer.
func jsonResponse(w http.ResponseWriter, data interface{}) {
	w.Header().Set("Content-Type", "application/json")
	// Marshal the data
	jsonBytes, err := json.Marshal(data)
	if err != nil {
		log.Printf("ERROR: Failed to marshal JSON response: %v", err)
		http.Error(w, `{"error": "Internal Server Error: Failed to encode response"}`, http.StatusInternalServerError)
		return
	}

	// Write the response
	_, err = w.Write(jsonBytes)
	if err != nil {
		// This error usually means the client disconnected, log it but often can't fix it server-side
		log.Printf("ERROR: Failed to write JSON response to client: %v", err)
	}
}