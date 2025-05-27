SPDX license identifier: MIT


accompanying backend is written in Go
you need to export API key (or have it in .env), then go run main.go

trigger it with:

curl -X POST http://localhost:42069/api/chat \
     -H "Authorization: ljubimte" \
     -H "Content-Type: application/json" \
     -H "Accept: text/event-stream" \
     -d '{
       "model": "auto",
       "stream": true,
       "messages": [
         {"role": "user", "content": "which is better for writing apis - go or python?"}
       ]
     }'

note: set up a password for the Authorization in main.go
