'use client'

import { useState } from 'react'
import { X, Check, Star, MessageCircle, Clock, Shield, CreditCard } from 'lucide-react'

interface UpgradeModalProps {
  isOpen: boolean
  onClose: () => void
  messagesUsed: number
  maxMessages: number
}

export default function UpgradeModal({ isOpen, onClose, messagesUsed, maxMessages }: UpgradeModalProps) {
  const [isLoading, setIsLoading] = useState(false)

  if (!isOpen) return null

  const handleUpgrade = async () => {
    setIsLoading(true)
    
    try {
      console.log('🚀 Starting upgrade process...')
      
      // Call our API to create Stripe checkout session
      const response = await fetch('/api/create-checkout', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
      })

      const data = await response.json()

      if (!response.ok) {
        throw new Error(data.error || 'Failed to create checkout session')
      }

      console.log('✅ Checkout session created, redirecting to Stripe...')
      
      // Redirect to Stripe checkout
      if (data.url) {
        window.location.href = data.url
      } else {
        throw new Error('No checkout URL received')
      }

    } catch (error) {
      console.error('💥 Upgrade error:', error)
      alert(`Upgrade failed: ${error instanceof Error ? error.message : 'Please try again'}`)
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-gray-800 rounded-lg max-w-md w-full max-h-[90vh] overflow-y-auto">
        {/* Header */}
        <div className="flex justify-between items-center p-6 border-b border-gray-700">
          <div className="flex items-center gap-2">
            <Star className="w-6 h-6 text-yellow-400" />
            <h2 className="text-xl font-bold text-white">Upgrade to Premium</h2>
          </div>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-white transition-colors"
            disabled={isLoading}
          >
            <X className="w-6 h-6" />
          </button>
        </div>

        {/* Content */}
        <div className="p-6">
          {/* Usage Status */}
          <div className="bg-gray-700 rounded-lg p-4 mb-6">
            <div className="flex items-center gap-2 mb-2">
              <MessageCircle className="w-5 h-5 text-blue-400" />
              <span className="text-white font-semibold">Message Usage</span>
            </div>
            <div className="flex items-center justify-between text-sm">
              <span className="text-gray-300">Used: {messagesUsed} / {maxMessages}</span>
              <span className="text-yellow-400 font-semibold">
                {maxMessages - messagesUsed} remaining
              </span>
            </div>
            <div className="w-full bg-gray-600 rounded-full h-2 mt-2">
              <div
                className="bg-gradient-to-r from-blue-500 to-yellow-400 h-2 rounded-full transition-all duration-300"
                style={{ width: `${(messagesUsed / maxMessages) * 100}%` }}
              ></div>
            </div>
          </div>

          {/* Premium Benefits */}
          <div className="mb-6">
            <h3 className="text-lg font-semibold text-white mb-4">Premium Benefits</h3>
            <div className="space-y-3">
              <div className="flex items-start gap-3">
                <Check className="w-5 h-5 text-green-400 mt-0.5 flex-shrink-0" />
                <div>
                  <div className="text-white font-medium">Unlimited AI Messages</div>
                  <div className="text-gray-400 text-sm">Chat with your virtual immigration lawyer as much as you need</div>
                </div>
              </div>
              
              <div className="flex items-start gap-3">
                <Check className="w-5 h-5 text-green-400 mt-0.5 flex-shrink-0" />
                <div>
                  <div className="text-white font-medium">Document Analysis</div>
                  <div className="text-gray-400 text-sm">Upload and analyze immigration forms like I-485, N-400, I-130</div>
                </div>
              </div>
              
              <div className="flex items-start gap-3">
                <Check className="w-5 h-5 text-green-400 mt-0.5 flex-shrink-0" />
                <div>
                  <div className="text-white font-medium">Priority Support</div>
                  <div className="text-gray-400 text-sm">Faster response times and priority assistance</div>
                </div>
              </div>
              
              <div className="flex items-start gap-3">
                <Check className="w-5 h-5 text-green-400 mt-0.5 flex-shrink-0" />
                <div>
                  <div className="text-white font-medium">Multi-Language Support</div>
                  <div className="text-gray-400 text-sm">Get help in Spanish, Mandarin, Arabic, and Turkish</div>
                </div>
              </div>
              
              <div className="flex items-start gap-3">
                <Check className="w-5 h-5 text-green-400 mt-0.5 flex-shrink-0" />
                <div>
                  <div className="text-white font-medium">Chat History</div>
                  <div className="text-gray-400 text-sm">Access all your previous conversations and advice</div>
                </div>
              </div>
            </div>
          </div>

          {/* Pricing */}
          <div className="bg-gradient-to-r from-blue-600 to-purple-600 rounded-lg p-6 mb-6">
            <div className="text-center">
              <div className="text-3xl font-bold text-white mb-1">$14</div>
              <div className="text-blue-100 text-sm mb-4">per month</div>
              <div className="text-blue-100 text-sm">
                <Clock className="w-4 h-4 inline mr-1" />
                Cancel anytime
              </div>
            </div>
          </div>

          {/* Testimonial */}
          <div className="bg-gray-700 rounded-lg p-4 mb-6">
            <div className="flex items-start gap-3">
              <Shield className="w-5 h-5 text-green-400 mt-1 flex-shrink-0" />
              <div>
                <div className="text-white text-sm mb-1">
                  &ldquo;ImmigrantAI helped me understand my green card process better than any website. 
                  Worth every penny!&rdquo;
                </div>
                <div className="text-gray-400 text-xs">- Maria S., Premium User</div>
              </div>
            </div>
          </div>

          {/* Action Buttons */}
          <div className="space-y-3">
            <button
              onClick={handleUpgrade}
              disabled={isLoading}
              className="w-full bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700 text-white font-semibold py-3 px-6 rounded-lg transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
            >
              {isLoading ? (
                <>
                  <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                  Redirecting to Stripe...
                </>
              ) : (
                <>
                  <CreditCard className="w-4 h-4" />
                  Upgrade to Premium - $14/month
                </>
              )}
            </button>
            
            <button
              onClick={onClose}
              disabled={isLoading}
              className="w-full text-gray-400 hover:text-white transition-colors text-sm disabled:opacity-50"
            >
              Maybe later
            </button>
          </div>

          <div className="text-center text-xs text-gray-500 mt-4">
            Secure payment processing by Stripe • Cancel anytime • 30-day money back guarantee
          </div>
        </div>
      </div>
    </div>
  )
}