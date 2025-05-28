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
	listenAddr          = ":42069"
	authHeaderKey       = "Authorization"
	authHeaderValue     = "ljubimte" // Development value
	ollamaURL           = "http://localhost:11434/api/generate"
	openrouterURL       = "https://openrouter.ai/api/v1/chat/completions"
	classificationModel = "gemma3:4b" // Using gemma3:4b for classification
	autoModelIdentifier = "auto"
)

const (
	ContextMaxChars = 4000 * 3
) // Assuming average 3 chars per token for context window estimation

// classificationMap defines the different model capabilities the backend can handle.
var classificationMap = map[string]struct {
	Name             string
	Model            string // OpenRouter model for generation
	AdditionalPrompt string // New field for prepending to user prompt
}{
	"1": {
		Name:  "Research & Knowledge",
		Model: "google/gemini-2.5-flash-preview", // Perplexity models excel at research and knowledge tasks
	},
	"2": {
		Name:  "Real-time web-necessary Research & Knowledge",
		Model: "google/gemini-2.5-flash-preview:online", // Perplexity models excel at research and knowledge tasks
	},
	"3": {
		Name:  "Complex Problem Solving & Strategy",
		Model: "anthropic/claude-sonnet-4", // Excels at complex reasoning, problem-solving
	},
	"4": {
		Name:  "Writing & Communication",
		Model: "x-ai/grok-3-mini-beta", // Strong model for writing assistance and clear communication
	},
	"5": {
		Name:  "Explanation & Instruction",
		Model: "google/gemini-2.5-flash-preview", // Efficient and capable model for explanations
	},
	"6": {
		Name:  "Content Generation",
		Model: "anthropic/claude-3.7-sonnet:thinking", // Good for structured data and content generation
	},
	"7": {
		Name:  "Emotional Intelligence & Support",
		Model: "google/gemini-2.5-flash-preview", // Empathetic and conversational model
	},
	"8": {
		Name:  "Coding & Technical Tasks",
		Model: "anthropic/claude-sonnet-4", // Top-tier model for coding, reasoning, summarization
	},
	"9": {
		Name:  "Creative & Artistic",
		Model: "openai/gpt-4.5-preview", // Strong creative and instruction-following model
	},
	"10": {
		Name:             "Small chit chat",
		Model:            "microsoft/phi-4",
		AdditionalPrompt: "Instruction for response: Please use 1 emoji in your response to the following user message if appropriate. If and only if asked for a joke, do not. User message: ",
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
	// CORS Headers - Allow all origins
	w.Header().Set("Access-Control-Allow-Origin", "*")
	w.Header().Set("Access-Control-Allow-Methods", "POST, OPTIONS")
	w.Header().Set("Access-Control-Allow-Headers", "Authorization, Content-Type, Accept")

	// Handle preflight OPTIONS requests
	if r.Method == http.MethodOptions {
		w.WriteHeader(http.StatusOK)
		return
	}

	// 1. Validate Request Method (ensure it's POST after handling OPTIONS)
	if r.Method != http.MethodPost {
		http.Error(w, "Method Not Allowed: Only POST requests are accepted", http.StatusMethodNotAllowed)
		return
	}

	// 2. Validate Authorization
	if r.Header.Get(authHeaderKey) != authHeaderValue {
		http.Error(w, "Forbidden: Invalid or missing authorization token", http.StatusForbidden)
		return
	}

	// 3. Decode Request Body (New OpenRouter-like format)
	var requestBody completionRequest
	if err := json.NewDecoder(r.Body).Decode(&requestBody); err != nil {
		http.Error(w, "Bad Request: Could not decode JSON payload: "+err.Error(), http.StatusBadRequest)
		return
	}

	// 4. Validate Messages
	if len(requestBody.Messages) == 0 {
		http.Error(w, "Bad Request: 'messages' field cannot be empty", http.StatusBadRequest)
		return
	}

	userInput, err := extractUserPrompt(requestBody.Messages)
	if err != nil {
		// If no user prompt is found, but messages are present, it's unusual but proceed.
		// Classification might fail or OpenRouter might handle it.
		// For classification, an empty userInput will be sent.
		log.Printf("WARN: Could not extract user prompt: %v. Proceeding with empty prompt for classification if 'auto'.", err)
		userInput = "" // Ensure userInput is empty for classification if extraction failed
	}
	// Log the full messages array for debugging if needed, be mindful of log size.
	log.Printf("Received request for model '%s', stream: %t.", requestBody.Model, requestBody.Stream)

	chosenModel := requestBody.Model
	var classificationNumber string
	var classificationNameForMetadata string
	var modelSelectedByClassification string
	classificationPerformed := false

	if strings.ToLower(chosenModel) == autoModelIdentifier {
		classificationPerformed = true
		var classErr error
		classificationNumber, classErr = classifyPrompt(userInput)
		if classErr != nil {
			log.Printf("ERROR: Classification failed: %v", classErr)
			// If streaming, send error in stream, otherwise HTTP error
			if requestBody.Stream {
				setupSSEHeaders(w)
				w.WriteHeader(http.StatusInternalServerError) // Set status before writing body
				sendErrorSSE(w, "Internal Server Error: Failed during prompt classification")
				sendDoneSSE(w) // Signal end of problematic stream
			} else {
				http.Error(w, "Internal Server Error: Failed during prompt classification", http.StatusInternalServerError)
			}
			return
		}
		log.Printf("Classified as: %s", classificationNumber)

		classificationInfo, ok := classificationMap[classificationNumber]
		if !ok {
			log.Printf("ERROR: Invalid classification number received: %s", classificationNumber)
			if requestBody.Stream {
				setupSSEHeaders(w)
				w.WriteHeader(http.StatusBadRequest)
				sendErrorSSE(w, "Bad Request: Invalid classification result")
				sendDoneSSE(w)
			} else {
				http.Error(w, "Bad Request: Invalid classification result", http.StatusBadRequest)
			}
			return
		}
		chosenModel = classificationInfo.Model
		classificationNameForMetadata = classificationNumber + "-" + classificationInfo.Name
		modelSelectedByClassification = classificationInfo.Model
		log.Printf("Mapped to: %s (Model: %s)", classificationNameForMetadata, chosenModel)

		// Prepend AdditionalPrompt if it exists for the classification
		if classificationInfo.AdditionalPrompt != "" {
			// Find the last user message and prepend the additional prompt
			// We iterate from the end to find the *last* user message.
			// The original user input is already extracted into `userInput` for classification,
			// but for sending to OpenRouter, we modify the `requestBody.Messages` array.
			modifiedMessages := false
			for i := len(requestBody.Messages) - 1; i >= 0; i-- {
				if requestBody.Messages[i].Role == "user" {
					// Prepend the additional prompt to the existing content of the last user message
					requestBody.Messages[i].Content = classificationInfo.AdditionalPrompt + "\n" + requestBody.Messages[i].Content
					log.Printf("INFO: Prepended additional prompt to user message for classification %s: '%s'", classificationNumber, classificationInfo.AdditionalPrompt)
					modifiedMessages = true
					break // Modify only the last user message
				}
			}
			if !modifiedMessages {
				log.Printf("WARN: AdditionalPrompt was present for classification %s, but no user message was found in the request to prepend it to.", classificationNumber)
			}
		}

	} else {
		// Direct model specified
		classificationNameForMetadata = "direct_request_classification_skipped"
		modelSelectedByClassification = chosenModel
		log.Printf("Direct model specified: %s, classification skipped.", chosenModel)
	}

	// Construct metadata for the response
	metaData := make(map[string]interface{})
	metaData["requested_model_parameter"] = requestBody.Model // What user sent in "model"
	metaData["classification_performed"] = classificationPerformed
	if classificationPerformed {
		metaData["classification_result_name"] = classificationNameForMetadata
		metaData["model_selected_by_classification"] = modelSelectedByClassification
	}
	metaData["final_model_used_for_generation"] = chosenModel

	if requestBody.Stream {
		// Setup SSE headers
		setupSSEHeaders(w)
		w.WriteHeader(http.StatusOK) // Indicate success for stream setup

		// Send initial metadata event
		initialEvent := ServerSentEvent{
			Event: "metadata",
			Data:  string(mustJSON(metaData)),
		}
		if err := writeSSE(w, initialEvent); err != nil {
			log.Printf("ERROR: Failed to write initial SSE metadata event: %v", err)
			// Client connection might be gone. Attempt to send a final [DONE] if possible.
			sendDoneSSE(w)
			return
		}
		w.(http.Flusher).Flush()

		// Handle Special Case: Content Generation (Static JSON Response, streamed)
		// This applies only if model was "auto" and classification resulted in "5"
		if classificationPerformed && classificationNumber == "5" {
			log.Println("Handling classification '5' (Content Generation) by streaming static JSON.")
			streamStaticContentForпять(w, chosenModel, classificationNameForMetadata) // Renamed "5" to "пять" to avoid syntax issues with numbers
			sendDoneSSE(w)                                                            // Send data: [DONE] after static content
		} else {
			// Stream response from OpenRouter for other classifications or direct model
			forwardedDone, streamErr := streamOpenRouterResponse(r.Context(), w, requestBody.Messages, chosenModel)
			if streamErr != nil {
				log.Printf("ERROR: Streaming OpenRouter response failed: %v", streamErr)
				// Attempt to send error to client if not already sent.
				// streamOpenRouterResponse might have already written to w.
				// Check if headers already sent. If not, can send HTTP error. But they are by now.
				// So, send error in stream.
				// Do not send another error if [DONE] was already forwarded, as the stream is over.
				if !forwardedDone {
					sendErrorSSE(w, fmt.Sprintf("Streaming error: %v", streamErr))
				}
			}
			// If OpenRouter's stream didn't end with data: [DONE] or an error occurred before that,
			// ensure our stream is properly terminated with data: [DONE].
			if !forwardedDone {
				sendDoneSSE(w)
			}
		}
		log.Println("Finished streaming request.")

	} else { // Non-streaming request
		log.Printf("Handling non-streaming request for model: %s", chosenModel)
		// For non-streaming, if classification was "5", what to do?
		// The current logic for "5" is streaming. For non-streaming, we'd need a non-streaming static response.
		// For now, let's assume non-streaming "5" (if auto-classified) will also attempt OpenRouter.
		// Or, we can explicitly return the static content as a single JSON blob.
		if classificationPerformed && classificationNumber == "5" {
			log.Println("Handling classification '5' (Content Generation) non-streamed.")
			staticResponse := generateStaticContentForFive()
			// Wrap it to look like an OpenRouter non-streaming response if desired, or send as is.
			// For simplicity, sending the raw static content.
			w.Header().Set("Content-Type", "application/json")
			w.WriteHeader(http.StatusOK)
			json.NewEncoder(w).Encode(map[string]interface{}{
				"model":             chosenModel,
				"classification":    classificationNameForMetadata,
				"response_type":     "structured_json",
				"simulated_choices": []interface{}{map[string]interface{}{"message": map[string]interface{}{"role": "assistant", "content": staticResponse}}},
				"simulated_usage":   map[string]int{"prompt_tokens": 0, "completion_tokens": 0, "total_tokens": 0},
			})

		} else {
			// Call OpenRouter non-streamed
			// The getOpenRouterResponseWithRetry function needs to accept messages
			responseContent, err := getOpenRouterResponseWithRetry(requestBody.Messages, chosenModel, 3)
			if err != nil {
				log.Printf("ERROR: OpenRouter non-streaming request failed: %v", err)
				http.Error(w, "Internal Server Error: Failed to get response from provider", http.StatusInternalServerError)
				return
			}

			// Construct a response similar to OpenRouter's non-streaming format
			// openRouterCompletionResponse is already defined for this.
			// We only have the content string, not the full structured response from OpenRouter.
			// getOpenRouterResponse currently returns only content.
			// To fully mimic, getOpenRouterResponse needs to return the full openRouterCompletionResponse.
			// For now, create a simplified response.
			// TODO: Enhance getOpenRouterResponse to return the full openRouterCompletionResponse object.
			simplifiedResp := openRouterCompletionResponse{
				ID:      "non-streamed-id-" + fmt.Sprintf("%d", time.Now().UnixNano()),
				Object:  "chat.completion",
				Created: time.Now().Unix(),
				Model:   chosenModel,
				Choices: []openRouterChoice{
					{Message: chatMessage{Role: "assistant", Content: responseContent}},
				},
				// Usage: nil, // Not available from current getOpenRouterResponse
			}
			metaData["non_streaming_response_details"] = "Simplified response; usage data not populated."
			// Combine metadata with response
			finalResponse := map[string]interface{}{
				"api_metadata": metaData,
				"llm_response": simplifiedResp,
			}

			w.Header().Set("Content-Type", "application/json")
			w.WriteHeader(http.StatusOK)
			if err := json.NewEncoder(w).Encode(finalResponse); err != nil {
				log.Printf("ERROR: Failed to write non-streaming JSON response: %v", err)
			}
		}
		log.Println("Finished non-streaming request.")
	}
}

// setupSSEHeaders configures the HTTP headers for Server-Sent Events.
func setupSSEHeaders(w http.ResponseWriter) {
	w.Header().Set("Content-Type", "text/event-stream")
	w.Header().Set("Cache-Control", "no-cache")
	w.Header().Set("Connection", "keep-alive")
	w.Header().Set("X-Accel-Buffering", "no") // For Nginx
}

// sendErrorSSE sends a standardized error event over SSE.
func sendErrorSSE(w http.ResponseWriter, errorMessage string) {
	errorData := map[string]interface{}{"error": errorMessage, "done": false} // done is false as stream is not successfully done
	errorEvent := ServerSentEvent{
		Event: "error",
		Data:  string(mustJSON(errorData)),
	}
	if err := writeSSE(w, errorEvent); err != nil {
		log.Printf("ERROR: Failed to write error SSE event: %v", err)
	}
	w.(http.Flusher).Flush()
}

// sendDoneSSE sends the "data: [DONE]" signal over SSE.
func sendDoneSSE(w http.ResponseWriter) {
	if _, err := fmt.Fprint(w, "data: [DONE]\n\n"); err != nil {
		log.Printf("ERROR: Failed to write [DONE] SSE event: %v", err)
	}
	w.(http.Flusher).Flush()
	log.Println("Sent data: [DONE] event.")
}

// streamStaticContentForпять handles streaming for classification "5"
func streamStaticContentForпять(w http.ResponseWriter, modelName, classificationName string) {
	staticResponse := generateStaticContentForFive()

	// Send the static content as a single custom chunk
	chunkEvent := ServerSentEvent{
		Event: "chunk", // Custom event type for this static content
		Data: string(mustJSON(map[string]interface{}{
			// "classification": classificationName, // Already in metadata
			// "model":          modelName,          // Already in metadata
			"response":      staticResponse,
			"response_type": "structured_json", // Indicates the type of content in "response"
			"done":          false,             // This chunk is part of the stream
		})),
	}
	if err := writeSSE(w, chunkEvent); err != nil {
		log.Printf("ERROR: Failed to write static content SSE event for classification 5: %v", err)
		// Error event might be good here, but the stream is likely broken.
		// The main handler will send [DONE] after this.
	}
	w.(http.Flusher).Flush()
}

// generateStaticContentForFive returns the predefined static content for classification "5".
func generateStaticContentForFive() map[string]interface{} {
	return map[string]interface{}{
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
}

// extractUserPrompt extracts the content of the last message with role "user".
func extractUserPrompt(messages []chatMessage) (string, error) {
	if len(messages) == 0 {
		return "", fmt.Errorf("no messages provided")
	}
	for i := len(messages) - 1; i >= 0; i-- {
		if messages[i].Role == "user" {
			if messages[i].Content == "" {
				// Allow empty user message content, as some use cases might have it.
				// The classification model should handle it.
				return "", nil
			}
			return messages[i].Content, nil
		}
	}
	return "", fmt.Errorf("no user message found in messages")
}

// classifyPrompt sends the user input to a local Ollama instance for classification.
// Now specifically using the classificationModel (gemma3:4b).
func classifyPrompt(userInput string) (string, error) {
	classificationPrompt := `Analyze the user\'s request below and classify it into one of the following categories.

CONTEXT START
---

` + userInput + `

---
CONTEXT END

Classifications:
1 - Research & Knowledge
2 - Real-time WEB-necessary Research & Knowledge
3 - Complex Problem Solving & Strategy 
4 - Writing & Communication 
5 - Explanation & Instruction 
6 - Content Generation 
7 - Emotional Intelligence & Support
8 - Coding, Programming, and Technical Tasks
9 - Creative & Artistic
10 - Small talk (short messages, like Hi or Hello or How are you or asking for a joke)

Based *only* on the user\'s request provided in the CONTEXT, reply with *only* the single number corresponding to the best classification. Be conservative when choosing web-enabled classifications, as they are more resource-intensive - only if the prompt absolutely needs web access, choose 2.
Do not reply with ANYHING But a number from 1 to 10. Only a number can be your output.
`

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

// getOpenRouterResponse sends the prompt to OpenRouter (non-streaming).
// TODO: This function should ideally return the full openRouterCompletionResponse object, not just the content string,
// to allow the handler to construct a more accurate non-streaming JSON response.
func getOpenRouterResponse(messages []chatMessage, modelName string) (string, error) {
	// Use the Chat Completions format for OpenRouter
	reqPayload := completionRequest{ // This matches the external API struct now
		Model:    modelName,
		Messages: messages,
		Stream:   false, // Explicitly false for this function
		// Add other parameters like temperature, max_tokens if needed by passing them through
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
		return "", fmt.Errorf("no content in OpenRouter response: %s", string(respBodyBytes))
	}

	return openRouterResp.Choices[0].Message.Content, nil
}

// streamOpenRouterResponse sends a streaming request to OpenRouter and forwards chunks to the client.
// Returns true if "data: [DONE]" was successfully forwarded, false otherwise.
func streamOpenRouterResponse(ctx context.Context, w http.ResponseWriter, messages []chatMessage, modelName string) (bool, error) {
	// Create the OpenRouter request payload with streaming enabled
	reqPayload := completionRequest{ // This matches the external API struct
		Model:    modelName,
		Messages: messages,
		Stream:   true,
	}

	reqBodyBytes, err := json.Marshal(reqPayload)
	if err != nil {
		return false, fmt.Errorf("failed to marshal OpenRouter request: %w", err)
	}

	// Create HTTP request with context
	httpReq, err := http.NewRequestWithContext(ctx, http.MethodPost, openrouterURL, bytes.NewBuffer(reqBodyBytes))
	if err != nil {
		return false, fmt.Errorf("failed to create OpenRouter request: %w", err)
	}

	// Set headers
	httpReq.Header.Set("Content-Type", "application/json")
	httpReq.Header.Set("Authorization", "Bearer "+os.Getenv("OPENROUTER_API_KEY"))
	httpReq.Header.Set("Accept", "text/event-stream")

	// Send request
	client := &http.Client{Timeout: 120 * time.Second} // Longer timeout for streaming
	resp, err := client.Do(httpReq)
	if err != nil {
		return false, fmt.Errorf("OpenRouter request failed: %w", err)
	}
	defer resp.Body.Close()

	if resp.StatusCode != http.StatusOK {
		respBody, _ := io.ReadAll(resp.Body)
		return false, fmt.Errorf("OpenRouter API returned non-OK status: %d. Body: %s", resp.StatusCode, string(respBody))
	}

	// Process streaming response
	reader := bufio.NewReader(resp.Body)
	var contentBuilder strings.Builder // Kept for potential future use like full response logging
	var forwardedDone bool

	for {
		// Read one line from the stream, ending in \n
		lineBytes, err := reader.ReadBytes('\n')
		if err != nil {
			if err == io.EOF {
				// If EOF, process any remaining bytes in lineBytes
				if len(lineBytes) > 0 {
					trimmedLine := strings.TrimSpace(string(lineBytes))
					if trimmedLine != "" { // Only process if not just whitespace
						if _, writeErr := w.Write(lineBytes); writeErr != nil {
							log.Printf("ERROR: Failed to write trailing SSE data on EOF: %v", writeErr)
							// Don't return error here, as EOF is expected. Let main logic handle [DONE] if not sent.
						} else {
							// Send the second newline for SSE message termination
							if _, writeErr := w.Write([]byte("\n")); writeErr != nil {
								log.Printf("ERROR: Failed to write trailing SSE terminator on EOF: %v", writeErr)
							}
						}
						w.(http.Flusher).Flush()
						if trimmedLine == "data: [DONE]" {
							log.Println("Successfully forwarded data: [DONE] from OpenRouter (on EOF).")
							forwardedDone = true
						}
					}
				}
				break // Expected end of stream
			}
			// For other errors, log and return
			log.Printf("ERROR: Error reading stream from OpenRouter: %v", err)
			return forwardedDone, fmt.Errorf("error reading stream from OpenRouter: %w", err)
		}

		trimmedLine := strings.TrimSpace(string(lineBytes))

		// Skip empty lines (e.g. if OpenRouter sends \n\n between data chunks, ReadBytes('\n') would yield just "\n")
		if trimmedLine == "" {
			continue
		}

		// Forward the line (which includes "data: ..." and the first "\n")
		if _, err := w.Write(lineBytes); err != nil {
			log.Printf("ERROR: Failed to write SSE data: %v", err)
			return forwardedDone, fmt.Errorf("failed to write SSE data: %w", err)
		}
		// Send the second newline for SSE message termination
		if _, err := w.Write([]byte("\n")); err != nil {
			log.Printf("ERROR: Failed to write SSE terminator: %v", err)
			return forwardedDone, fmt.Errorf("failed to write SSE terminator: %w", err)
		}
		w.(http.Flusher).Flush()

		// Log the content being streamed for debugging (optional)
		// Be cautious with logging entire chunks if they are large or frequent.
		// log.Printf("Streamed chunk: %s", trimmedLine)

		if strings.HasPrefix(trimmedLine, "data: ") {
			dataContent := strings.TrimPrefix(trimmedLine, "data: ")
			if dataContent != "[DONE]" { // Only add to contentBuilder if it's not the DONE signal
				var chunk StreamChunk
				if err := json.Unmarshal([]byte(dataContent), &chunk); err == nil {
					if len(chunk.Choices) > 0 && chunk.Choices[0].Delta.Content != "" {
						contentBuilder.WriteString(chunk.Choices[0].Delta.Content)
					}
				}
			}
		}

		if trimmedLine == "data: [DONE]" {
			log.Println("Successfully forwarded data: [DONE] from OpenRouter.")
			forwardedDone = true
			break // End of stream from OpenRouter
		}
	}

	if forwardedDone {
		log.Printf("Successfully streamed full response from OpenRouter, forwarded [DONE]. Total content characters (approx): %d", contentBuilder.Len())
	} else {
		log.Printf("Streaming from OpenRouter finished but [DONE] was not explicitly forwarded. Total content characters (approx): %d", contentBuilder.Len())
	}
	return forwardedDone, nil
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
// It now accepts messages []chatMessage instead of userInput.
func getOpenRouterResponseWithRetry(messages []chatMessage, modelName string, maxRetries int) (string, error) {
	var lastErr error
	baseDelay := 1 * time.Second // Initial delay

	for attempt := 0; attempt < maxRetries; attempt++ {
		// getOpenRouterResponse now takes messages and modelName
		response, err := getOpenRouterResponse(messages, modelName)
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
// This function is no longer directly used by the main handler path for successful responses,
// but might be kept for other purposes or future use.
// If it's definitely not needed, it could be removed. For now, let's keep it.
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
