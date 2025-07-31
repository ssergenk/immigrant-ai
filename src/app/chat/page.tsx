// src/app/chat/page.tsx
'use client' // Keep this at the top

import { useState, useEffect, useRef } from 'react'
import { createSupabaseClient } from '@/lib/supabase'
import { User } from '@supabase/supabase-js'
import UpgradeModal from '@/components/ui/UpgradeModal'
import FileUpload from '@/components/chat/FileUpload'
import LanguageSwitcher from '@/components/ui/LanguageSwitcher'
import { LanguageProvider, useLanguage } from '@/contexts/LanguageContext'
import { Crown, MessageCircle, Upload, RotateCcw } from 'lucide-react'

interface Message {
  id: string
  content: string
  role: 'user' | 'assistant'
  created_at?: string
}

interface UserData {
  message_count: number
  max_messages: number
  subscription_status: 'free' | 'premium' | 'canceled'
}

function ChatContent() {
  const [user, setUser] = useState<User | null>(null)
  const [loading, setLoading] = useState(true)
  const [messages, setMessages] = useState<Message[]>([])
  const [inputMessage, setInputMessage] = useState('')
  const [isTyping, setIsTyping] = useState(false)
  const [chatSessionId, setChatSessionId] = useState<string>('')
  const [userData, setUserData] = useState<UserData | null>(null)
  const [error, setError] = useState<string>('')
  const [showUpgradeModal, setShowUpgradeModal] = useState(false)
  const [isUploading, setIsUploading] = useState(false)
  const [showFileUpload, setShowFileUpload] = useState(false)
  const [isClearingChat, setIsClearingChat] = useState(false)
  const messagesEndRef = useRef<HTMLDivElement>(null)
  const fileUploadRef = useRef<HTMLDivElement>(null)
  const supabase = createSupabaseClient()

  // Language support
  const { currentLanguage, setLanguage } = useLanguage()

  // Scroll to bottom when new messages arrive
  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }

  // Scroll to file upload section when it opens
  const scrollToFileUpload = () => {
    if (fileUploadRef.current) {
      fileUploadRef.current.scrollIntoView({ behavior: 'smooth', block: 'nearest' })
    }
  }

  useEffect(() => {
    scrollToBottom()
  }, [messages, isTyping])

  useEffect(() => {
    if (showFileUpload) {
      setTimeout(scrollToFileUpload, 100)
    }
  }, [showFileUpload])

  useEffect(() => {
    // Check if user is authenticated and load chat session
    const initializeChat = async () => {
      const { data: { user } } = await supabase.auth.getUser()
      setUser(user)

      if (!user) {
        window.location.href = '/'
        return
      }

      // Get user data
      const { data: userInfo } = await supabase
        .from('users')
        .select('message_count, max_messages, subscription_status')
        .eq('id', user.id)
        .single()

      if (userInfo) {
        setUserData(userInfo)
      }

      // Create or get existing chat session
      const { data: existingSession } = await supabase
        .from('chat_sessions')
        .select('id')
        .eq('user_id', user.id)
        .order('created_at', { ascending: false })
        .limit(1)

      let sessionId: string

      if (existingSession && existingSession.length > 0) {
        sessionId = existingSession[0].id
      } else {
        // Create new chat session
        const { data: newSession } = await supabase
          .from('chat_sessions')
          .insert({ user_id: user.id, title: 'Immigration Consultation' })
          .select('id')
          .single()

        sessionId = newSession?.id || ''
      }

      setChatSessionId(sessionId)

      // Load existing messages
      if (sessionId) {
        const { data: existingMessages } = await supabase
          .from('messages')
          .select('id, content, role, created_at')
          .eq('chat_session_id', sessionId)
          .order('created_at', { ascending: true })

        if (existingMessages) {
          setMessages(existingMessages)
        }
      }

      setLoading(false)
    }

    initializeChat()
  }, [supabase])

  const clearChat = async () => {
    if (!user || !chatSessionId) return

    setIsClearingChat(true)

    try {
      // Create a new chat session
      const { data: newSession } = await supabase
        .from('chat_sessions')
        .insert({
          user_id: user.id,
          title: `Immigration Consultation - ${new Date().toLocaleDateString()}`
        })
        .select('id')
        .single()

      if (newSession) {
        setChatSessionId(newSession.id)
        setMessages([])
        setError('')
        setShowFileUpload(false)
      }
    } catch (error) {
      console.error('Error creating new chat session:', error)
      setError('Failed to start new chat. Please try again.')
    } finally {
      setIsClearingChat(false)
    }
  }

  const sendMessage = async () => {
    if (!inputMessage.trim() || !user || !chatSessionId) return

    console.log('🔥 sendMessage called with:', inputMessage)
    console.log('🔥 Calling /api/chat endpoint')

    // Check message limits
    if (userData?.subscription_status === 'free' && userData.message_count >= userData.max_messages) {
      setShowUpgradeModal(true) // Open upgrade modal if limit reached
      return
    }

    const userMessage: Message = {
      id: Date.now().toString(),
      content: inputMessage,
      role: 'user'
    }

    setMessages(prev => [...prev, userMessage])
    setInputMessage('')
    setIsTyping(true)
    setError('')

    try {
      // Call AI API with language support
      const response = await fetch('/api/chat', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          message: inputMessage,
          chatSessionId: chatSessionId,
          language: currentLanguage
        }),
      })

      const data = await response.json()

      if (!response.ok) {
        if (response.status === 403) {
          setShowUpgradeModal(true) // Open upgrade modal on 403 (forbidden)
          return
        }
        throw new Error(data.error || 'Failed to get AI response')
      }

      const aiMessage: Message = {
        id: (Date.now() + 1).toString(),
        content: data.response,
        role: 'assistant'
      }

      setMessages(prev => [...prev, aiMessage])

      // Update user data
      if (userData) {
        setUserData({
          ...userData,
          message_count: data.messageCount
        })
      }

      // Show upgrade modal if approaching limit
      if (data.subscriptionStatus === 'free' && (data.maxMessages - data.messageCount) <= 2) {
        setTimeout(() => setShowUpgradeModal(true), 2000)
      }

    } catch (error) {
      console.error('Error sending message:', error)
      setError((error as Error).message || 'Failed to send message. Please try again.')
    } finally {
      setIsTyping(false)
    }
  }

  const handleFileUpload = async (file: File) => {
    if (!user || !chatSessionId) {
      console.error('User or chatSessionId not available for file upload.');
      return;
    }

    console.log('📎 handleFileUpload called with:', file.name)
    console.log('📎 Calling /api/analyze-document endpoint')

    // Add user's "message" indicating a document was uploaded
    const userUploadConfirmation: Message = {
      id: `user-upload-${Date.now()}`,
      content: `I've just uploaded a document: "${file.name}"`,
      role: 'user'
    };
    setMessages(prev => [...prev, userUploadConfirmation]);

    // Add initial "Analyzing..." message from assistant
    const analyzingMessageId = `analysis-${Date.now()}`;
    const analyzingMessage: Message = {
      id: analyzingMessageId,
      content: `📄 **Uploading "${file.name}"...**\n\n🔍 Analyzing your document with AI. This may take a moment...`,
      role: 'assistant'
    };
    setMessages(prev => [...prev, analyzingMessage]);

    setIsUploading(true);
    setError('');

    try {
      const formData = new FormData();
      formData.append('file', file);
      formData.append('chatSessionId', chatSessionId);

      const response = await fetch('/api/analyze-document', {
        method: 'POST',
        body: formData,
      });

      const data = await response.json();

      if (!response.ok) {
        if (response.status === 403) {
          setShowUpgradeModal(true); // Open upgrade modal on 403 (forbidden)
          // Remove the "Analyzing..." message if an upgrade is required
          setMessages(prev => prev.filter(msg => msg.id !== analyzingMessageId));
          return;
        }
        throw new Error(data.error || 'Failed to analyze document');
      }

      // Update the "analyzing" message with the actual analysis result
      setMessages(prev => prev.map(msg =>
        msg.id === analyzingMessageId
          ? { ...msg, content: data.analysis, id: (Date.now() + 1).toString() } // Update ID to ensure unique, final message
          : msg
      ));

      setShowFileUpload(false); // Hide upload area after successful upload

      // IMPORTANT: Now, send a follow-up message to the chat API to give the AI context
      // This will ensure the AI "remembers" the document and continues the conversation.
      setIsTyping(true);
      const followUpResponse = await fetch('/api/chat', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          // This "message" is an internal prompt for the AI to continue based on the document
          message: `The user has just uploaded and I have analyzed a document. The summary/analysis I provided to the user was: "${data.analysis}". Now, prompt the user to ask further questions about the document or their immigration needs. Keep your response concise and conversational.`,
          chatSessionId: chatSessionId,
          language: currentLanguage // Ensure language is passed
        }),
      });

      const followUpData = await followUpResponse.json();

      if (!followUpResponse.ok) {
        throw new Error(followUpData.error || 'Failed to get follow-up AI response after document analysis');
      }

      // Add the AI's follow-up question/response to the chat
      const aiFollowUpMessage: Message = {
        id: (Date.now() + 2).toString(),
        content: followUpData.response,
        role: 'assistant'
      };
      setMessages(prev => [...prev, aiFollowUpMessage]);


      // Update user data from the chat API response
      if (userData && followUpData.messageCount !== undefined) {
        setUserData({
          ...userData,
          message_count: followUpData.messageCount
        });
      }

    } catch (error) {
      console.error('Error uploading file or getting follow-up AI response:', error);
      // Update the "analyzing" message with error message
      setMessages(prev => prev.map(msg =>
        msg.id === analyzingMessageId
          ? { ...msg, content: `❌ **Upload Failed**\n\nSorry, I couldn't analyze your document. ${(error as Error).message || 'Please try again.'}`, id: Date.now().toString() }
          : msg
      ));
      setError((error as Error).message || 'Failed to analyze document. Please try again.');
    } finally {
      setIsUploading(false);
      setIsTyping(false); // Stop typing indicator after full flow
    }
  };


  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault()
      sendMessage()
    }
  }

  const handleLogout = async () => {
    await supabase.auth.signOut()
    window.location.href = '/'
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-900 flex items-center justify-center">
        <div className="text-white text-xl">Loading your chat...</div>
      </div>
    )
  }

  if (!user) {
    return null
  }

  const messagesRemaining = userData ? userData.max_messages - userData.message_count : 0
  const isAtLimit = userData?.subscription_status === 'free' && userData.message_count >= userData.max_messages
  const showWarning = userData?.subscription_status === 'free' && messagesRemaining <= 3
  const isPremium = userData?.subscription_status === 'premium'

  return (
    <div className="min-h-screen bg-gray-900 flex flex-col">
      {/* Sticky Header */}
      <header className="sticky top-0 z-40 bg-gray-900/95 backdrop-blur-sm border-b border-gray-800 p-4">
        <div className="max-w-4xl mx-auto flex justify-between items-center">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 bg-gradient-to-r from-blue-500 to-purple-600 rounded-lg flex items-center justify-center">
              <span className="text-white font-bold text-sm">IA</span>
            </div>
            <div>
              <h1 className="text-xl font-bold text-white">ImmigrantAI</h1>
              <span className="text-xs text-gray-400">Virtual Immigration Lawyer</span>
            </div>
          </div>
          <div className="flex items-center gap-4">
            {/* Language Switcher */}
            <LanguageSwitcher
              currentLanguage={currentLanguage}
              onLanguageChange={setLanguage}
            />

            {/* Clear Chat Button */}
            <button
              onClick={clearChat}
              disabled={isClearingChat}
              className="flex items-center gap-1 text-gray-400 hover:text-white transition-colors text-sm disabled:opacity-50"
              title="Start New Chat"
            >
              {isClearingChat ? (
                <>
                  <div className="w-3 h-3 border-2 border-gray-400 border-t-transparent rounded-full animate-spin"></div>
                  <span>Starting...</span>
                </>
              ) : (
                <>
                  <RotateCcw className="w-4 h-4" />
                  <span>New Chat</span>
                </>
              )}
            </button>

            {userData && (
              <div className="flex items-center gap-2">
                {userData.subscription_status === 'premium' ? (
                  <div className="flex items-center gap-1 text-yellow-400">
                    <Crown className="w-4 h-4" />
                    <span className="text-sm font-semibold">Premium</span>
                  </div>
                ) : (
                  <button
                    onClick={() => setShowUpgradeModal(true)}
                    className="flex items-center gap-1 text-yellow-400 hover:text-yellow-300 transition-colors text-sm"
                  >
                    <Crown className="w-4 h-4" />
                    <span>Upgrade</span>
                  </button>
                )}

                <div className="text-sm text-gray-300 flex items-center gap-1">
                  <MessageCircle className="w-4 h-4" />
                  {userData.subscription_status === 'free' ? (
                    <span className={messagesRemaining <= 3 ? 'text-yellow-400 font-semibold' : ''}>
                      {messagesRemaining} left
                    </span>
                  ) : (
                    <span className="text-green-400">∞</span>
                  )}
                </div>
              </div>
            )}
            <span className="text-sm text-gray-300">
              {user.user_metadata?.full_name || user.email}
            </span>
            <button
              onClick={handleLogout}
              className="text-sm text-gray-400 hover:text-white transition-colors"
            >
              Logout
            </button>
          </div>
        </div>
      </header>

      {/* Warning Banner */}
      {showWarning && !isAtLimit && (
        <div className="bg-yellow-600 text-black px-4 py-2 text-center">
          <span className="font-semibold">Only {messagesRemaining} messages left!</span>
          <button
            onClick={() => setShowUpgradeModal(true)}
            className="ml-2 underline hover:no-underline"
          >
            Upgrade to premium for unlimited AI immigration help - just $14/month
          </button>
        </div>
      )}

      {/* Limit Reached Banner */}
      {isAtLimit && (
        <div className="bg-red-600 text-white px-4 py-2 text-center">
          <span className="font-semibold">You have used all 15 free messages!</span>
          <button
            onClick={() => setShowUpgradeModal(true)}
            className="ml-2 underline hover:no-underline"
          >
            Upgrade to premium for unlimited messaging
          </button>
        </div>
      )}

      {/* Error Banner */}
      {error && (
        <div className="bg-red-600 text-white px-4 py-2 text-center">
          {error}
        </div>
      )}

      {/* Chat Area */}
      <div className="flex-1 max-w-4xl mx-auto w-full flex flex-col">
        {/* Messages */}
        <div className="flex-1 overflow-y-auto p-4 space-y-4">
          {messages.length === 0 && (
            <div className="text-center py-8">
              <div className="bg-gradient-to-r from-blue-400 to-purple-500 w-16 h-16 rounded-full mx-auto mb-4 flex items-center justify-center">
                <span className="text-2xl">⚖️</span>
              </div>
              <h2 className="text-xl font-semibold text-white mb-2">
                Welcome to your Virtual Immigration Lawyer
              </h2>
              <p className="text-gray-400 max-w-md mx-auto">
                I am here to help you navigate US immigration processes. Ask me anything about visas,
                green cards, citizenship, or any immigration concerns you have.
              </p>
              {isPremium && (
                <div className="mt-4 text-center">
                  <p className="text-yellow-400 font-semibold mb-2">🌟 Premium Features Unlocked!</p>
                  <p className="text-gray-300 text-sm">
                    • Unlimited AI messages • Document analysis • Multi-language support
                  </p>
                  <p className="text-blue-400 text-sm mt-2">
                    💡 Use the upload button below to analyze your immigration documents!
                  </p>
                </div>
              )}
              {userData?.subscription_status === 'free' && (
                <div className="mt-4">
                  <p className="text-yellow-400 font-semibold">
                    You have {userData.max_messages} free messages to start!
                  </p>
                  <button
                    onClick={() => setShowUpgradeModal(true)}
                    className="mt-2 text-blue-400 hover:text-blue-300 transition-colors text-sm underline"
                  >
                    Or upgrade to premium for unlimited messaging
                  </button>
                </div>
              )}
            </div>
          )}

          {messages.map((message) => (
            <div
              key={message.id}
              className={`flex ${message.role === 'user' ? 'justify-end' : 'justify-start'}`}
            >
              <div
                className={`max-w-xs lg:max-w-md px-4 py-3 rounded-lg ${
                  message.role === 'user'
                    ? 'bg-blue-600 text-white'
                    : 'bg-gray-700 text-gray-100'
                }`}
              >
                <div className="whitespace-pre-wrap">{message.content}</div>
              </div>
            </div>
          ))}

          {isTyping && (
            <div className="flex justify-start">
              <div className="bg-gray-700 text-gray-100 max-w-xs lg:max-w-md px-4 py-2 rounded-lg">
                <div className="flex space-x-1">
                  <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce"></div>
                  <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: '0.1s' }}></div>
                  <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: '0.2s' }}></div>
                </div>
              </div>
            </div>
          )}

          {/* Invisible div to scroll to */}
          <div ref={messagesEndRef} />
        </div>

        {/* File Upload Section (when expanded) */}
        {showFileUpload && (
          <div ref={fileUploadRef} className="border-t border-gray-700 p-4">
            <FileUpload
              onFileUpload={handleFileUpload}
              isUploading={isUploading}
              disabled={!isPremium}
              onUpgradeClick={() => setShowUpgradeModal(true)}
            />
          </div>
        )}

        {/* Message Input */}
        <div className="border-t border-gray-700 p-4">
          <div className="flex gap-2 mb-2">
            <textarea
              value={inputMessage}
              onChange={(e) => setInputMessage(e.target.value)}
              onKeyPress={handleKeyPress}
              placeholder={isAtLimit ? "Upgrade to premium to continue chatting..." : "Ask your immigration question..."}
              className="flex-1 bg-gray-800 text-white border border-gray-600 rounded-lg px-4 py-2 focus:outline-none focus:border-blue-500 resize-none disabled:opacity-50"
              rows={1}
              disabled={isTyping || isAtLimit}
            />
            <button
              onClick={isAtLimit ? () => setShowUpgradeModal(true) : sendMessage}
              disabled={(!inputMessage.trim() || isTyping) && !isAtLimit}
              className="bg-blue-600 hover:bg-blue-700 disabled:bg-gray-600 disabled:cursor-not-allowed text-white px-6 py-2 rounded-lg transition-colors"
            >
              {isAtLimit ? 'Upgrade' : 'Send'}
            </button>
          </div>

          {/* Upload Button Row */}
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <button
                onClick={() => setShowFileUpload(!showFileUpload)}
                disabled={isUploading}
                className={`flex items-center gap-2 px-3 py-1 rounded-lg text-sm transition-colors ${
                  isPremium
                    ? 'bg-purple-600 hover:bg-purple-700 text-white'
                    : 'bg-gray-700 text-gray-400 cursor-not-allowed'
                }`}
              >
                {isUploading ? (
                  <>
                    <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                    Document Analyzing...
                  </>
                ) : (
                  <>
                    <Upload className="w-4 h-4" />
                    {showFileUpload ? 'Hide Upload' : 'Upload Document'}
                    {!isPremium && <Crown className="w-3 h-3" />}
                  </>
                )}
              </button>

              {!isPremium && (
                <button
                  onClick={() => setShowUpgradeModal(true)}
                  className="text-yellow-400 hover:text-yellow-300 text-xs underline"
                >
                  Premium Feature
                </button>
              )}
            </div>

            <div className="text-xs text-gray-500">
              {isAtLimit ?
                'Upgrade to premium for unlimited messaging' :
                'Press Enter to send, Shift+Enter for new line'
              }
            </div>
          </div>
        </div>
      </div>

      {/* Upgrade Modal */}
      <UpgradeModal
        isOpen={showUpgradeModal}
        onClose={() => setShowUpgradeModal(false)}
        messagesUsed={userData?.message_count || 0}
        maxMessages={userData?.max_messages || 15}
      />
    </div>
  )
}

export default function ChatPage() {
  return (
    <LanguageProvider>
      <ChatContent />
    </LanguageProvider>
  )
}