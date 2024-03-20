import {
  ParsedEvent,
  ReconnectInterval,
  createParser,
} from "eventsource-parser"

import { OpenAIStreamPayload } from "@/types/openai"

export async function OpenAIStream(payload: OpenAIStreamPayload) {
  const encoder = new TextEncoder()
  const decoder = new TextDecoder()

  let counter = 0

  const res = await fetch("https://api.openai.com/v1/chat/completions", {
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${payload.api_key}`,
    },
    method: "POST",
    body: JSON.stringify({
      model: payload.model,
      messages: payload.messages,
      functions: payload.functions,
      max_tokens: payload.max_tokens,
      temperature: payload.temperature,
      stream: true,
    }),
  })

  // If there is an error, throw it
  if (!res.ok) {
    const error = (await res.json()).error
    console.log(error)
    throw new Error(error)
  }

  const stream = new ReadableStream({
    async start(controller) {
      // callback
      function onParse(event: ParsedEvent | ReconnectInterval) {
        if (event.type === "event") {
          const data = event.data
          const json = JSON.parse(data)
          // Check if it's a function call or not
          const isFunctionCall = json.choices[0].delta?.function_call
          // https://beta.openai.com/docs/api-reference/completions/create#completions/create-stream
          if (data === "[DONE]") {
            // If it's a function call, we need to send function call object
            if (isFunctionCall) {
              const functionCall = json.choices[0].delta?.function_call
              console.log(functionCall)
              controller.enqueue(encoder.encode(JSON.stringify(functionCall)))
            }
            controller.close()
            return
          }
          try {
            const text = json.choices[0].delta?.content || ""
            if (counter < 2 && (text.match(/\n/) || []).length) {
              // this is a prefix character (i.e., "\n\n"), do nothing
              return
            }
            const queue = encoder.encode(isFunctionCall ? counter : text)
            controller.enqueue(queue)
            counter++
          } catch (e) {
            // maybe parse error
            controller.error(e)
          }
        }
      }

      // stream response (SSE) from OpenAI may be fragmented into multiple chunks
      // this ensures we properly read chunks and invoke an event for each SSE event stream
      const parser = createParser(onParse)
      // https://web.dev/streams/#asynchronous-iteration
      for await (const chunk of res.body as any) {
        parser.feed(decoder.decode(chunk))
      }
    },
  })

  return stream
}
