"use client"

import { useRef, useState } from "react"

import { ChatGPTMessage } from "@/types/openai"
import ChatInput from "@/components/chat-input"
import ChatBox from "@/components/chatbox"
import ChatMessage from "@/components/chat-message"

export default function IndexPage() {
  const messageListRef = useRef<HTMLDivElement>(null);
  const [messages, setMessages] = useState<ChatGPTMessage[]>([])
  const [isSending, setIsSending] = useState(false)
  const sendMessageHandler = async (message: string) => {
    const messagesToSend: ChatGPTMessage[] = [
      ...messages,
      { role: "user", content: message },
    ]
    setMessages(messagesToSend)
    setTimeout(() => {


      messageListRef.current?.scrollTo(0, messageListRef.current.scrollHeight);
    }, 100);
    try {
      setIsSending(true)
      const response = await fetch("/api/chat", {
        method: "POST",
        body: JSON.stringify({
          messages: messagesToSend,
        }),
      })
      const data = await response.json()
      console.log('message', message)
      console.log('data call api', data)
      // Check if it's a function call
      if (data?.function_call) {
        const functionCall = data.function_call
        console.log('functionCall', functionCall)
        if (functionCall.name == "taodonphep") {

          // code block
          const functionCallMessage: ChatGPTMessage = {
            role: "assistant",
            content: `tạo đơn phép thành công.`,
          }
          setMessages([...messagesToSend, functionCallMessage])

          setTimeout(() => {


            messageListRef.current?.scrollTo(0, messageListRef.current.scrollHeight);
          }, 100);
          console.log("action api tạo đơn phép 111")
        }
        if (functionCall.name == "send_email") {

          // Send email
          try {
            const functionArguments = JSON.parse(functionCall.arguments)
            const emailResponse = await fetch("/api/email", {
              method: "POST",
              body: JSON.stringify({
                to: functionArguments.email,
                subject: functionArguments.subject,
                html: functionArguments.body,
              }),
            })
            const emailData = await emailResponse.json()
            console.log(emailData)
            const functionCallMessage: ChatGPTMessage = {
              role: "assistant",
              content: `Email has been sent to ${functionArguments.email} with subject ${functionArguments.subject}.`,
            }
            setMessages([...messagesToSend, functionCallMessage])
          } catch (error) {
            console.log(error)
            const functionCallMessage: ChatGPTMessage = {
              role: "assistant",
              content: `There is an error. I couldn't send the email. Please try again.`,
            }
            setMessages([...messagesToSend, functionCallMessage])
          } finally {
            return
          }
        }

      }
      else {
        setMessages([...messagesToSend, data])
        setTimeout(() => {


          messageListRef.current?.scrollTo(0, messageListRef.current.scrollHeight);
        }, 100);
      }



    } catch (error) {
      console.log(error)
    } finally {
      setIsSending(false)
    }
  }
  return (
    <section className="container relative flex flex-col h-full gap-6 py-10">
      <div className="flex max-w-[980px] flex-col items-start gap-2">
        <h1 className="text-3xl font-extrabold leading-tight tracking-tighter md:text-4xl">
          Function Calls  with OpenAI&apos;s
        </h1>

      </div>
      {/* Chatbox */}
      <div ref={messageListRef} style={{ height: "400px" }} className=" py-6 space-y-8 overflow-y-scroll markdown">
        {messages.map((message, index) => (
          <ChatMessage key={index + message.role} data={message} />
        ))}
        {isSending && (
          <div className="flex items-center justify-center gap-2 ml-1 max-w-fit">
            <div className="w-3 h-3 rounded-full bg-emerald-500 animate-pulse" />
            <div className="text-sm text-neutral-500">Thinking...</div>
          </div>
        )}
      </div>
      {/* <ChatBox messages={messages} isSending={isSending} /> */}
      {/* Input */}
      <ChatInput handler={sendMessageHandler} />
    </section>
  )
}
