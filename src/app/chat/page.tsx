'use client'

import { useState, useEffect, useRef } from 'react'
import { createSupabaseClient } from '@/lib/supabase'
import { User } from '@supabase/supabase-js'
import UpgradeModal from '@/components/ui/UpgradeModal'
import FileUpload from '@/components/chat/FileUpload'
import LanguageSwitcher from '@/components/ui/LanguageSwitcher'
import { LanguageProvider, useLanguage } from '@/contexts/LanguageContext'
import { Crown, MessageCircle, Upload, RotateCcw, Send, Menu, X } from 'lucide-react'

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
  const [showMobileMenu, setShowMobileMenu] = useState(false)
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

    // Check message limits
    if (userData?.subscription_status === 'free' && userData.message_count >= userData.max_messages) {
      setShowUpgradeModal(true)
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
          setShowUpgradeModal(true)
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

      // Show upgrade modal if approaching limit (only for internal logic, no display)
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
          setShowUpgradeModal(true);
          setMessages(prev => prev.filter(msg => msg.id !== analyzingMessageId));
          return;
        }
        throw new Error(data.error || 'Failed to analyze document');
      }

      // Update the "analyzing" message with the actual analysis result
      setMessages(prev => prev.map(msg =>
        msg.id === analyzingMessageId
          ? { ...msg, content: data.analysis, id: (Date.now() + 1).toString() }
          : msg
      ));

      setShowFileUpload(false);

      // Send follow-up message to chat API
      setIsTyping(true);
      const followUpResponse = await fetch('/api/chat', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          message: `The user has just uploaded and I have analyzed a document. The summary/analysis I provided to the user was: "${data.analysis}". Now, prompt the user to ask further questions about the document or their immigration needs. Keep your response concise and conversational.`,
          chatSessionId: chatSessionId,
          language: currentLanguage
        }),
      });

      const followUpData = await followUpResponse.json();

      if (!followUpResponse.ok) {
        throw new Error(followUpData.error || 'Failed to get follow-up AI response after document analysis');
      }

      const aiFollowUpMessage: Message = {
        id: (Date.now() + 2).toString(),
        content: followUpData.response,
        role: 'assistant'
      };
      setMessages(prev => [...prev, aiFollowUpMessage]);

      if (userData && followUpData.messageCount !== undefined) {
        setUserData({
          ...userData,
          message_count: followUpData.messageCount
        });
      }

    } catch (error) {
      console.error('Error uploading file or getting follow-up AI response:', error);
      setMessages(prev => prev.map(msg =>
        msg.id === analyzingMessageId
          ? { ...msg, content: `❌ **Upload Failed**\n\nSorry, I couldn't analyze your document. ${(error as Error).message || 'Please try again.'}`, id: Date.now().toString() }
          : msg
      ));
      setError((error as Error).message || 'Failed to analyze document. Please try again.');
    } finally {
      setIsUploading(false);
      setIsTyping(false);
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

  const isAtLimit = userData?.subscription_status === 'free' && userData.message_count >= userData.max_messages
  const isPremium = userData?.subscription_status === 'premium'

  return (
    <main className="min-h-screen bg-gray-900 text-white overflow-hidden">
      {/* Animated Background - Same as Homepage */}
      <div className="fixed inset-0 z-0">
        <div className="absolute inset-0 bg-gradient-to-br from-blue-900/20 via-purple-900/20 to-gray-900"></div>
        <div className="absolute top-0 left-1/4 w-72 h-72 bg-blue-500/10 rounded-full blur-3xl animate-pulse"></div>
        <div className="absolute bottom-0 right-1/4 w-96 h-96 bg-purple-500/10 rounded-full blur-3xl animate-pulse delay-1000"></div>
      </div>

      <div className="relative z-10 min-h-screen flex flex-col">
        {/* Header - Same Style as Homepage */}
        <header className="border-b border-gray-800/50 bg-gray-900/80 backdrop-blur-sm sticky top-0 z-50">
          <div className="container mx-auto px-4 py-4 flex justify-between items-center">
            <div className="flex items-center gap-4">
              <img 
                src="https://rushrcville.com/wp-content/uploads/2025/04/AI-LOGO-TRANSP.png" 
                alt="ImmigrantAI" 
                className="w-12 h-12 md:w-16 md:h-16 object-contain"
              />
              <div>
                <h1 className="text-lg md:text-xl font-bold">ImmigrantAI</h1>
                <span className="text-xs md:text-sm text-gray-400">AI Immigration Assistant</span>
              </div>
            </div>

            {/* Desktop Navigation */}
            <div className="hidden md:flex items-center gap-4">
              <LanguageSwitcher
                currentLanguage={currentLanguage}
                onLanguageChange={setLanguage}
              />

              <button
                onClick={clearChat}
                disabled={isClearingChat}
                className="flex items-center gap-2 px-3 py-2 text-gray-400 hover:text-white transition-colors text-sm disabled:opacity-50 bg-gray-800/50 rounded-lg"
                title="Start New Chat"
              >
                {isClearingChat ? (
                  <>
                    <div className="w-4 h-4 border-2 border-gray-400 border-t-transparent rounded-full animate-spin"></div>
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
                <div className="flex items-center gap-3">
                  {userData.subscription_status === 'premium' ? (
                    <div className="flex items-center gap-2 px-3 py-2 bg-gradient-to-r from-yellow-600 to-yellow-700 rounded-lg">
                      <Crown className="w-4 h-4" />
                      <span className="text-sm font-semibold">Premium</span>
                    </div>
                  ) : (
                    <button
                      onClick={() => setShowUpgradeModal(true)}
                      className="flex items-center gap-2 px-3 py-2 bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700 rounded-lg transition-all duration-300 hover:scale-105"
                    >
                      <Crown className="w-4 h-4" />
                      <span className="text-sm font-semibold">Upgrade</span>
                    </button>
                  )}
                </div>
              )}

              <span className="text-sm text-gray-300">
                {user.user_metadata?.full_name || user.email?.split('@')[0]}
              </span>
              <button
                onClick={handleLogout}
                className="text-sm text-gray-400 hover:text-white transition-colors px-3 py-2 hover:bg-gray-800/50 rounded-lg"
              >
                Logout
              </button>
            </div>

            {/* Mobile Menu Button */}
            <button
              onClick={() => setShowMobileMenu(!showMobileMenu)}
              className="md:hidden p-2 text-gray-400 hover:text-white"
            >
              {showMobileMenu ? <X className="w-6 h-6" /> : <Menu className="w-6 h-6" />}
            </button>
          </div>

          {/* Mobile Menu */}
          {showMobileMenu && (
            <div className="md:hidden border-t border-gray-800/50 bg-gray-900/95 backdrop-blur-sm p-4 space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-sm text-gray-300">
                  {user.user_metadata?.full_name || user.email?.split('@')[0]}
                </span>
                {userData?.subscription_status === 'premium' ? (
                  <div className="flex items-center gap-1 text-yellow-400">
                    <Crown className="w-4 h-4" />
                    <span className="text-sm font-semibold">Premium</span>
                  </div>
                ) : (
                  <button
                    onClick={() => setShowUpgradeModal(true)}
                    className="flex items-center gap-1 px-3 py-1 bg-gradient-to-r from-blue-600 to-purple-600 rounded-lg text-sm"
                  >
                    <Crown className="w-4 h-4" />
                    <span>Upgrade</span>
                  </button>
                )}
              </div>
              
              <div className="flex items-center justify-between">
                <LanguageSwitcher
                  currentLanguage={currentLanguage}
                  onLanguageChange={setLanguage}
                />
                <button
                  onClick={clearChat}
                  disabled={isClearingChat}
                  className="flex items-center gap-1 text-gray-400 hover:text-white transition-colors text-sm disabled:opacity-50"
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
              </div>

              <button
                onClick={handleLogout}
                className="w-full text-left text-sm text-gray-400 hover:text-white transition-colors py-2"
              >
                Logout
              </button>
            </div>
          )}
        </header>

        {/* Error Banner */}
        {error && (
          <div className="bg-red-600/90 backdrop-blur-sm text-white px-4 py-3 text-center border-b border-red-500/50">
            {error}
          </div>
        )}

        {/* Chat Container */}
        <div className="flex-1 flex flex-col max-w-6xl mx-auto w-full">
          {/* Messages Area */}
          <div className="flex-1 overflow-y-auto p-4 md:p-6 space-y-4 md:space-y-6">
            {messages.length === 0 && (
              <div className="text-center py-8 md:py-16">
                <div className="bg-gradient-to-r from-blue-500 to-purple-600 w-16 h-16 md:w-20 md:h-20 rounded-full mx-auto mb-6 flex items-center justify-center shadow-lg">
                  <img 
                    src="https://rushrcville.com/wp-content/uploads/2025/04/AI-LOGO-TRANSP.png" 
                    alt="ImmigrantAI" 
                    className="w-8 h-8 md:w-10 md:h-10 object-contain"
                  />
                </div>
                <h2 className="text-xl md:text-2xl font-bold text-white mb-4">
                  Welcome to ImmigrantAI
                </h2>
                <p className="text-gray-300 max-w-md mx-auto mb-6 text-sm md:text-base leading-relaxed">
                  Your AI-powered immigration assistant is ready to help. Ask me anything about visas, green cards, citizenship, or any immigration concerns you have.
                </p>
                {isPremium && (
                  <div className="bg-gradient-to-r from-yellow-600/20 to-yellow-700/20 border border-yellow-500/30 rounded-xl p-4 md:p-6 max-w-lg mx-auto">
                    <p className="text-yellow-400 font-semibold mb-2 flex items-center justify-center gap-2">
                      <Crown className="w-5 h-5" />
                      Premium Features Active
                    </p>
                    <p className="text-gray-300 text-sm leading-relaxed">
                      • Unlimited conversations • Document analysis • Priority support • Multi-language support
                    </p>
                  </div>
                )}
              </div>
            )}

            {messages.map((message) => (
              <div
                key={message.id}
                className={`flex ${message.role === 'user' ? 'justify-end' : 'justify-start'} animate-fade-in`}
              >
                <div
                  className={`max-w-[85%] md:max-w-2xl px-4 md:px-6 py-3 md:py-4 rounded-2xl shadow-lg ${
                    message.role === 'user'
                      ? 'bg-gradient-to-r from-blue-600 to-blue-700 text-white'
                      : 'bg-gray-800/80 backdrop-blur-sm text-gray-100 border border-gray-700/50'
                  }`}
                >
                  <div className="whitespace-pre-wrap text-sm md:text-base leading-relaxed">{message.content}</div>
                </div>
              </div>
            ))}

            {isTyping && (
              <div className="flex justify-start animate-fade-in">
                <div className="bg-gray-800/80 backdrop-blur-sm border border-gray-700/50 max-w-xs px-4 md:px-6 py-3 md:py-4 rounded-2xl shadow-lg">
                  <div className="flex space-x-1">
                    <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce"></div>
                    <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: '0.1s' }}></div>
                    <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: '0.2s' }}></div>
                  </div>
                </div>
              </div>
            )}

            <div ref={messagesEndRef} />
          </div>

          {/* File Upload Section */}
          {showFileUpload && (
            <div ref={fileUploadRef} className="border-t border-gray-800/50 bg-gray-900/50 backdrop-blur-sm p-4 md:p-6">
              <FileUpload
                onFileUpload={handleFileUpload}
                isUploading={isUploading}
                disabled={!isPremium}
                onUpgradeClick={() => setShowUpgradeModal(true)}
              />
            </div>
          )}

          {/* Input Area */}
          <div className="border-t border-gray-800/50 bg-gray-900/80 backdrop-blur-sm p-4 md:p-6">
            <div className="flex gap-2 md:gap-3 mb-3 md:mb-4">
              <textarea
                value={inputMessage}
                onChange={(e) => setInputMessage(e.target.value)}
                onKeyPress={handleKeyPress}
                placeholder={isAtLimit ? "Upgrade to premium to continue chatting..." : "Ask your immigration question..."}
                className="flex-1 bg-gray-800/80 backdrop-blur-sm text-white border border-gray-600/50 rounded-xl px-4 md:px-6 py-3 md:py-4 focus:outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20 resize-none disabled:opacity-50 text-sm md:text-base"
                rows={1}
                disabled={isTyping || isAtLimit}
              />
              <button
                onClick={isAtLimit ? () => setShowUpgradeModal(true) : sendMessage}
                disabled={(!inputMessage.trim() || isTyping) && !isAtLimit}
                className="bg-gradient-to-r from-blue-600 to-blue-700 hover:from-blue-700 hover:to-blue-800 disabled:from-gray-600 disabled:to-gray-700 disabled:cursor-not-allowed text-white px-4 md:px-6 py-3 md:py-4 rounded-xl transition-all duration-300 hover:scale-105 disabled:hover:scale-100 shadow-lg flex items-center gap-2"
              >
                <Send className="w-4 h-4 md:w-5 md:h-5" />
                <span className="hidden sm:inline">{isAtLimit ? 'Upgrade' : 'Send'}</span>
              </button>
            </div>

            {/* Bottom Controls */}
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2 md:gap-3">
                <button
                  onClick={() => setShowFileUpload(!showFileUpload)}
                  disabled={isUploading}
                  className={`flex items-center gap-2 px-3 md:px-4 py-2 rounded-lg text-xs md:text-sm transition-all duration-300 ${
                    isPremium
                      ? 'bg-gradient-to-r from-purple-600 to-purple-700 hover:from-purple-700 hover:to-purple-800 text-white hover:scale-105'
                      : 'bg-gray-700/50 text-gray-400 cursor-not-allowed'
                  }`}
                >
                  {isUploading ? (
                    <>
                      <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                      <span className="hidden sm:inline">Analyzing...</span>
                    </>
                  ) : (
                    <>
                      <Upload className="w-4 h-4" />
                      <span className="hidden sm:inline">{showFileUpload ? 'Hide Upload' : 'Upload Document'}</span>
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

              <div className="text-xs text-gray-500 hidden sm:block">
                {isAtLimit ?
                  'Upgrade to premium for unlimited messaging' :
                  'Press Enter to send • Shift+Enter for new line'
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

      <style jsx>{`
        @keyframes fade-in {
          from { opacity: 0; transform: translateY(10px); }
          to { opacity: 1; transform: translateY(0); }
        }
        
        .animate-fade-in {
          animation: fade-in 0.3s ease-out;
        }
      `}</style>
    </main>
  )
}

export default function ChatPage() {
  return (
    <LanguageProvider>
      <ChatContent />
    </LanguageProvider>
  )
}