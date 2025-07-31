'use client'

import { useState, useEffect, useRef } from 'react'
import GoogleLogin from '@/components/auth/GoogleLogin'
import { MessageCircle, Shield, Clock, Globe, FileText, CheckCircle, Star } from 'lucide-react'

export default function Home() {
  const [currentMessageIndex, setCurrentMessageIndex] = useState(0)
  const [isTyping, setIsTyping] = useState(true)
  const chatContainerRef = useRef<HTMLDivElement>(null)

  // Short, focused chat conversation for preview
  const chatConversation = [
    { 
      role: 'user', 
      message: "Can you help me file for citizenship?",
      delay: 1000
    },
    { 
      role: 'ai', 
      message: "Of course! You need to file Form N-400, but before starting let's make sure you're eligible to apply for citizenship.\n\nHow long have you been a permanent resident?",
      delay: 2000
    },
    { 
      role: 'user', 
      message: "I've been a green card holder for 4 years.",
      delay: 1500
    },
    { 
      role: 'ai', 
      message: "Perfect! You meet the 3-year requirement if married to a US citizen, or 5-year for others.\n\nAre you married to a US citizen?",
      delay: 2200
    },
    { 
      role: 'user', 
      message: "Yes, my husband is a US citizen.",
      delay: 1200
    },
    { 
      role: 'ai', 
      message: "Excellent! You qualify under the 3-year rule. I'll help you with N-400 step-by-step.\n\nFirst, let's gather your documents. Do you have your marriage certificate and tax returns ready?",
      delay: 2500
    },
    { 
      role: 'user', 
      message: "I have the marriage certificate, but need to get tax returns.",
      delay: 1500
    },
    { 
      role: 'ai', 
      message: "No problem! You'll need 3 years of tax returns. I can guide you through getting them from the IRS.\n\nWant me to walk you through the N-400 form sections while you gather documents?",
      delay: 2200
    }
  ]

  // Auto-scroll function
  const scrollToBottom = () => {
    if (chatContainerRef.current) {
      chatContainerRef.current.scrollTop = chatContainerRef.current.scrollHeight
    }
  }

  // Auto-advance chat preview with scroll
  useEffect(() => {
    const timer = setInterval(() => {
      setCurrentMessageIndex((prev) => {
        if (prev < chatConversation.length - 1) {
          setIsTyping(true)
          setTimeout(() => {
            setIsTyping(false)
            scrollToBottom()
          }, 1000)
          return prev + 1
        } else {
          // Reset to beginning after a pause
          setTimeout(() => {
            setCurrentMessageIndex(0)
            setIsTyping(true)
            if (chatContainerRef.current) {
              chatContainerRef.current.scrollTop = 0
            }
          }, 3000)
          return prev
        }
      })
    }, 3500)

    return () => clearInterval(timer)
  }, [chatConversation.length])

  // Scroll when new message appears
  useEffect(() => {
    scrollToBottom()
  }, [currentMessageIndex])

  return (
    <main className="min-h-screen bg-gray-900 text-white overflow-hidden">
      {/* Animated Background */}
      <div className="fixed inset-0 z-0">
        <div className="absolute inset-0 bg-gradient-to-br from-blue-900/20 via-purple-900/20 to-gray-900"></div>
        <div className="absolute top-0 left-1/4 w-72 h-72 bg-blue-500/10 rounded-full blur-3xl animate-pulse"></div>
        <div className="absolute bottom-0 right-1/4 w-96 h-96 bg-purple-500/10 rounded-full blur-3xl animate-pulse delay-1000"></div>
      </div>

      <div className="relative z-10">
        {/* Header */}
        <header className="border-b border-gray-800/50 bg-gray-900/80 backdrop-blur-sm sticky top-0 z-50">
          <div className="container mx-auto px-4 py-4 flex justify-between items-center">
            <div className="flex items-center gap-4">
              <img 
                src="https://rushrcville.com/wp-content/uploads/2025/04/AI-LOGO-TRANSP.png" 
                alt="ImmigrantAI" 
                className="w-16 h-16 md:w-20 md:h-20 object-contain"
              />
              <span className="text-xl md:text-2xl font-bold">ImmigrantAI</span>
            </div>
            <nav className="hidden md:flex items-center gap-6 text-sm">
              <a href="#preview" className="text-gray-300 hover:text-white transition-all duration-300 hover:scale-105">See It Work</a>
              <a href="#features" className="text-gray-300 hover:text-white transition-all duration-300 hover:scale-105">Features</a>
              <a href="#testimonials" className="text-gray-300 hover:text-white transition-all duration-300 hover:scale-105">Success Stories</a>
            </nav>
          </div>
        </header>

        {/* Hero Section */}
        <section className="py-12 md:py-20 lg:py-32">
          <div className="container mx-auto px-4">
            <div className="max-w-7xl mx-auto grid lg:grid-cols-2 gap-8 lg:gap-12 items-center">
              {/* Left: Hero Content - Always first on mobile */}
              <div className="text-center lg:text-left">
                <div className="inline-flex items-center gap-2 bg-blue-600/20 text-blue-300 px-3 md:px-4 py-2 rounded-full text-xs md:text-sm mb-4 md:mb-6 animate-fade-in">
                  <div className="w-2 h-2 bg-green-400 rounded-full animate-pulse"></div>
                  24/7 AI Immigration Assistant
                </div>
                
                <h1 className="text-3xl md:text-5xl lg:text-6xl font-bold mb-4 md:mb-6 leading-tight animate-slide-up">
                  Get Instant Immigration Help.
                  <span className="block text-transparent bg-clip-text bg-gradient-to-r from-blue-400 to-purple-500 animate-gradient">
                    No Appointments, No Hassle.
                  </span>
                </h1>
                
                <p className="text-lg md:text-xl lg:text-2xl text-gray-300 mb-6 md:mb-8 leading-relaxed animate-slide-up delay-200">
                  Chat with your personal AI immigration assistant — fast, private, and always available.
                </p>

                <div className="flex flex-col sm:flex-row gap-3 md:gap-4 mb-6 md:mb-8 animate-slide-up delay-400">
                  <div className="flex-1">
                    <GoogleLogin />
                  </div>
                  <a 
                    href="/chat" 
                    className="flex items-center justify-center gap-2 px-4 md:px-6 py-3 bg-gradient-to-r from-blue-600 to-blue-700 hover:from-blue-700 hover:to-blue-800 rounded-lg text-white transition-all duration-300 hover:scale-105 text-sm md:text-base font-medium shadow-lg"
                  >
                    <MessageCircle className="w-4 h-4" />
                    Chat Now
                  </a>
                </div>
                
                <div className="flex flex-wrap items-center justify-center lg:justify-start gap-4 md:gap-6 text-xs md:text-sm text-gray-400 animate-fade-in delay-600">
                  <div className="flex items-center gap-1">
                    <Shield className="w-3 md:w-4 h-3 md:h-4 text-green-400" />
                    <span>Secure &amp; Private</span>
                  </div>
                  <div className="flex items-center gap-1">
                    <Clock className="w-3 md:w-4 h-3 md:h-4 text-blue-400" />
                    <span>Available 24/7</span>
                  </div>
                  <div className="flex items-center gap-1">
                    <Globe className="w-3 md:w-4 h-3 md:h-4 text-purple-400" />
                    <span>5 Languages</span>
                  </div>
                </div>
              </div>

              {/* Right: Live Chat Preview - Second on mobile */}
              <div className="animate-slide-left">
                <div className="bg-gray-800/50 backdrop-blur-sm rounded-2xl border border-gray-700/50 p-4 md:p-6 shadow-2xl mx-auto max-w-md lg:max-w-none">
                  <div className="flex items-center gap-3 mb-4 md:mb-6 pb-3 md:pb-4 border-b border-gray-700">
                    <img 
                      src="https://rushrcville.com/wp-content/uploads/2025/04/AI-LOGO-TRANSP.png" 
                      alt="ImmigrantAI" 
                      className="w-10 md:w-12 h-10 md:h-12 object-contain bg-gradient-to-r from-blue-500 to-purple-600 rounded-full p-1"
                    />
                    <div>
                      <div className="font-semibold text-sm md:text-base">ImmigrantAI Assistant</div>
                      <div className="text-xs md:text-sm text-green-400 flex items-center gap-1">
                        <div className="w-2 h-2 bg-green-400 rounded-full animate-pulse"></div>
                        Online now
                      </div>
                    </div>
                  </div>

                  <div 
                    ref={chatContainerRef}
                    className="space-y-3 md:space-y-4 h-80 md:h-96 overflow-y-auto scroll-smooth"
                    style={{ scrollBehavior: 'smooth' }}
                  >
                    {chatConversation.slice(0, currentMessageIndex + 1).map((msg, index) => (
                      <div key={index} className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'} animate-message-appear`}>
                        <div className={`max-w-[85%] md:max-w-xs px-3 md:px-4 py-2 md:py-3 rounded-2xl ${
                          msg.role === 'user' 
                            ? 'bg-blue-600 text-white' 
                            : 'bg-gray-700 text-gray-100'
                        }`}>
                          <div className="text-xs md:text-sm whitespace-pre-line leading-relaxed">{msg.message}</div>
                        </div>
                      </div>
                    ))}

                    {isTyping && currentMessageIndex < chatConversation.length - 1 && (
                      <div className="flex justify-start">
                        <div className="bg-gray-700 px-3 md:px-4 py-2 md:py-3 rounded-2xl">
                          <div className="flex space-x-1">
                            <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce"></div>
                            <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce delay-100"></div>
                            <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce delay-200"></div>
                          </div>
                        </div>
                      </div>
                    )}
                  </div>

                  <div className="mt-3 md:mt-4 pt-3 md:pt-4 border-t border-gray-700">
                    <div className="flex gap-2">
                      <div className="flex-1 bg-gray-700 rounded-lg px-3 md:px-4 py-2 text-gray-400 text-xs md:text-sm">
                        Ask your immigration question...
                      </div>
                      <button className="bg-blue-600 hover:bg-blue-700 px-3 md:px-4 py-2 rounded-lg transition-colors text-xs md:text-sm">
                        Send
                      </button>
                    </div>
                  </div>
                </div>

                <div className="text-center mt-3 md:mt-4 text-xs md:text-sm text-gray-400">
                  ↑ Live conversation preview - Real immigration scenarios!
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* Social Proof Banner */}
        <section className="py-6 md:py-8 bg-gradient-to-r from-blue-600/10 to-purple-600/10 border-y border-gray-800/50">
          <div className="container mx-auto px-4">
            <div className="flex flex-wrap items-center justify-center gap-4 md:gap-8 text-center">
              <div className="flex items-center gap-2">
                <div className="text-xl md:text-2xl font-bold text-blue-400">5,000+</div>
                <div className="text-xs md:text-sm text-gray-300">Cases Helped</div>
              </div>
              <div className="flex items-center gap-2">
                <div className="text-xl md:text-2xl font-bold text-green-400">96%</div>
                <div className="text-xs md:text-sm text-gray-300">Success Rate</div>
              </div>
              <div className="flex items-center gap-2">
                <div className="text-xl md:text-2xl font-bold text-purple-400">24/7</div>
                <div className="text-xs md:text-sm text-gray-300">Always Available</div>
              </div>
              <div className="flex items-center gap-1">
                {[1,2,3,4,5].map((star) => (
                  <Star key={star} className="w-3 md:w-4 h-3 md:h-4 text-yellow-400 fill-current" />
                ))}
                <div className="text-xs md:text-sm text-gray-300 ml-2">4.9/5 Rating</div>
              </div>
            </div>
          </div>
        </section>

        {/* How It Helps Section */}
        <section id="features" className="py-12 md:py-20">
          <div className="container mx-auto px-4">
            <div className="text-center mb-12 md:mb-16">
              <h2 className="text-2xl md:text-3xl lg:text-4xl font-bold mb-4">How ImmigrantAI Helps You Win</h2>
              <p className="text-lg md:text-xl text-gray-300 max-w-2xl mx-auto">
                Get expert immigration guidance for every step of your journey to success
              </p>
            </div>

            <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-6 md:gap-8 max-w-6xl mx-auto">
              {[
                {
                  icon: FileText,
                  color: "from-green-500 to-emerald-600",
                  title: "Visa &amp; Green Card Guidance",
                  description: "Get step-by-step help with H-1B, family visas, adjustment of status, and more. Navigate complex processes with confidence.",
                  delay: "delay-0"
                },
                {
                  icon: CheckCircle,
                  color: "from-blue-500 to-cyan-600", 
                  title: "Document Analysis &amp; Review",
                  description: "Upload your forms and get detailed analysis. Avoid costly mistakes with I-485, I-130, N-400 applications.",
                  delay: "delay-100"
                },
                {
                  icon: Shield,
                  color: "from-purple-500 to-pink-600",
                  title: "Asylum &amp; Citizenship Support", 
                  description: "Understand your rights, prepare for interviews, and get guidance on naturalization, asylum, and refugee processes.",
                  delay: "delay-200"
                },
                {
                  icon: Clock,
                  color: "from-orange-500 to-red-600",
                  title: "Always Available",
                  description: "Need help at midnight? Weekend emergency? No problem. Your AI assistant is available 24/7, whenever you need it.",
                  delay: "delay-300"
                }
              ].map((feature, index) => (
                <div key={index} className={`text-center group animate-slide-up ${feature.delay}`}>
                  <div className={`w-12 md:w-16 h-12 md:h-16 bg-gradient-to-r ${feature.color} rounded-full flex items-center justify-center mx-auto mb-4 md:mb-6 group-hover:scale-110 transition-all duration-500 shadow-lg group-hover:shadow-xl`}>
                    <feature.icon className="w-6 md:w-8 h-6 md:h-8 text-white" />
                  </div>
                  <h3 className="text-lg md:text-xl font-semibold mb-3 md:mb-4 group-hover:text-blue-400 transition-colors">{feature.title}</h3>
                  <p className="text-gray-400 mb-4 md:mb-6 leading-relaxed text-sm md:text-base">
                    {feature.description}
                  </p>
                  <button className="text-blue-400 hover:text-blue-300 transition-all duration-300 text-xs md:text-sm font-medium flex items-center mx-auto gap-1 group-hover:gap-2">
                    <MessageCircle className="w-3 md:w-4 h-3 md:h-4" />
                    Try this now →
                  </button>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* Testimonials Section */}
        <section id="testimonials" className="py-12 md:py-20 bg-gray-800/30">
          <div className="container mx-auto px-4">
            <div className="text-center mb-12 md:mb-16">
              <h2 className="text-2xl md:text-3xl lg:text-4xl font-bold mb-4">Success Stories from Real Users</h2>
              <p className="text-lg md:text-xl text-gray-300 max-w-2xl mx-auto">
                See how ImmigrantAI helped thousands navigate their immigration journey successfully
              </p>
            </div>

            <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6 md:gap-8 max-w-6xl mx-auto">
              {[
                {
                  name: "Maria Rodriguez",
                  location: "Mexico → Texas",
                  case: "Marriage-based Green Card",
                  image: "🇲🇽",
                  rating: 5,
                  text: "ImmigrantAI caught 3 critical errors in my I-485 that my previous lawyer missed. The AI explained everything in Spanish and guided me step-by-step. Got approved in 8 months instead of the typical 18!",
                  delay: "delay-0"
                },
                {
                  name: "Ahmed Hassan", 
                  location: "Syria → California",
                  case: "Asylum Application",
                  image: "🇸🇾",
                  rating: 5,
                  text: "As a refugee, I was terrified of making mistakes. The AI helped me prepare for my asylum interview and explained my rights in Arabic. I got approved and now I&apos;m helping my family apply too.",
                  delay: "delay-200"
                },
                {
                  name: "Li Wei Chen",
                  location: "China → New York", 
                  case: "H-1B to Green Card",
                  image: "🇨🇳",
                  rating: 5,
                  text: "The AI helped me understand my priority date and timing for adjustment of status. Saved me $5,000 in lawyer fees and got my green card 6 months faster than expected. Worth every penny!",
                  delay: "delay-400"
                }
              ].map((testimonial, index) => (
                <div key={index} className={`bg-gray-900/50 backdrop-blur-sm rounded-2xl p-6 md:p-8 border border-gray-700/50 hover:border-blue-500/50 transition-all duration-500 hover:scale-105 animate-slide-up ${testimonial.delay}`}>
                  <div className="flex items-center gap-1 mb-4">
                    {[1,2,3,4,5].map((star) => (
                      <Star key={star} className="w-3 md:w-4 h-3 md:h-4 text-yellow-400 fill-current" />
                    ))}
                  </div>
                  
                  <blockquote className="text-gray-300 mb-6 leading-relaxed text-sm md:text-base">
                    &ldquo;{testimonial.text}&rdquo;
                  </blockquote>
                  
                  <div className="flex items-center gap-4">
                    <div className="text-2xl md:text-3xl">{testimonial.image}</div>
                    <div>
                      <div className="font-semibold text-white text-sm md:text-base">{testimonial.name}</div>
                      <div className="text-xs md:text-sm text-gray-400">{testimonial.location}</div>
                      <div className="text-xs text-blue-400 font-medium">{testimonial.case}</div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* Final CTA Section */}
        <section className="py-12 md:py-20 bg-gradient-to-r from-blue-600/20 to-purple-600/20">
          <div className="container mx-auto px-4 text-center">
            <div className="max-w-4xl mx-auto">
              <h2 className="text-2xl md:text-4xl lg:text-5xl font-bold mb-4 md:mb-6 animate-slide-up">
                Your Immigration Success Starts Here
              </h2>
              <p className="text-lg md:text-xl lg:text-2xl text-gray-300 mb-6 md:mb-8 animate-slide-up delay-200">
                Join 5,000+ immigrants who&apos;ve successfully navigated their cases with ImmigrantAI
              </p>
              
              <div className="flex flex-col sm:flex-row gap-3 md:gap-4 max-w-md mx-auto mb-6 md:mb-8 animate-slide-up delay-400">
                <div className="flex-1">
                  <GoogleLogin />
                </div>
              </div>
              
              <div className="flex flex-wrap items-center justify-center gap-4 md:gap-8 text-xs md:text-sm text-gray-400 animate-fade-in delay-600">
                <div className="flex items-center gap-1">
                  <CheckCircle className="w-3 md:w-4 h-3 md:h-4 text-green-400" />
                  <span>Start chatting in 30 seconds</span>
                </div>
                <div className="flex items-center gap-1">
                  <Shield className="w-3 md:w-4 h-3 md:h-4 text-blue-400" />
                  <span>Your data is secure &amp; private</span>
                </div>
                <div className="flex items-center gap-1">
                  <Star className="w-3 md:w-4 h-3 md:h-4 text-yellow-400 fill-current" />
                  <span>4.9/5 user rating</span>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* Footer */}
        <footer className="border-t border-gray-800/50 py-8 md:py-12 bg-gray-900/80">
          <div className="container mx-auto px-4">
            <div className="flex flex-col md:flex-row justify-between items-center gap-4">
              <div className="flex items-center gap-3">
                <img 
                  src="https://rushrcville.com/wp-content/uploads/2025/04/AI-LOGO-TRANSP.png" 
                  alt="ImmigrantAI" 
                  className="w-8 md:w-10 h-8 md:h-10 object-contain"
                />
                <span className="text-lg md:text-xl font-bold">ImmigrantAI</span>
              </div>
              <div className="text-xs md:text-sm text-gray-400 text-center">
                © 2025 ImmigrantAI. Your trusted AI immigration assistant.
              </div>
            </div>
          </div>
        </footer>
      </div>

      <style jsx>{`
        @keyframes gradient {
          0%, 100% { background-position: 0% 50%; }
          50% { background-position: 100% 50%; }
        }
        
        @keyframes message-appear {
          from {
            opacity: 0;
            transform: translateY(20px);
          }
          to {
            opacity: 1;
            transform: translateY(0);
          }
        }
        
        @keyframes slide-up {
          from {
            opacity: 0;
            transform: translateY(30px);
          }
          to {
            opacity: 1;
            transform: translateY(0);
          }
        }
        
        @keyframes slide-left {
          from {
            opacity: 0;
            transform: translateX(30px);
          }
          to {
            opacity: 1;
            transform: translateX(0);
          }
        }
        
        @keyframes fade-in {
          from { opacity: 0; }
          to { opacity: 1; }
        }
        
        .animate-gradient {
          background-size: 200% 200%;
          animation: gradient 3s ease infinite;
        }
        
        .animate-message-appear {
          animation: message-appear 0.5s ease-out;
        }
        
        .animate-slide-up {
          animation: slide-up 0.8s ease-out;
        }
        
        .animate-slide-left {
          animation: slide-left 0.8s ease-out;
        }
        
        .animate-fade-in {
          animation: fade-in 1s ease-out;
        }
        
        .delay-100 { animation-delay: 0.1s; }
        .delay-200 { animation-delay: 0.2s; }
        .delay-300 { animation-delay: 0.3s; }
        .delay-400 { animation-delay: 0.4s; }
        .delay-600 { animation-delay: 0.6s; }
        
        /* Mobile scroll improvements */
        @media (max-width: 768px) {
          .container {
            padding-left: 1rem;
            padding-right: 1rem;
          }
        }
      `}</style>
    </main>
  )
}