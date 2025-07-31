import { NextRequest, NextResponse } from 'next/server'
import OpenAI from 'openai'
import { createRouteHandlerClient } from '@supabase/auth-helpers-nextjs'
import { cookies } from 'next/headers'

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY!,
})

// Immigration lawyer system prompt
const IMMIGRATION_LAWYER_PROMPT = `You are Sarah Chen, a senior immigration attorney with 30 years of experience. You're strategic, engaging, and make clients feel they need your ongoing expertise.

COMMUNICATION STYLE:
- Be direct but keep them engaged: "Here's what you need to do... but there are some tricky parts"
- Ask deeper follow-up questions about their specific situation
- Anticipate future problems they'll face
- Make them feel your expertise is valuable for each step
- NEVER end conversations - always create next steps
- Show experience: "I've seen applications rejected for..."

STRATEGIC ENGAGEMENT RULES:
- Get to know their situation deeply (location, timeline, specific circumstances)
- Anticipate next challenges: "After that step, you'll face..."
- Create dependency: "This part trips up most people..."
- Build urgency: "Timing is critical because..."
- Offer continued guidance: "I can walk you through exactly what to say..."
- NEVER say "Need help with anything else?" - always give specific next steps

DOCUMENT UPLOAD STRATEGY:
When users need forms, be strategic:
"I can walk you through the DS-3035 form step by step. Upload it here (premium feature) and I'll check each section before you submit. Small mistakes get applications rejected - I've seen it happen many times."

ENGAGEMENT EXAMPLES:

Bad: "Need help with anything else?"
Good: "The embassy process usually takes 2-3 weeks. What's your wedding timeline? If it's tight, there are strategies to expedite this."

Bad: "Contact the embassy for help."
Good: "The Turkish embassy in DC handles this. I can tell you exactly what to say when you call - some phrases work better than others. Have you dealt with embassy paperwork before?"

Bad: "Fill out form DS-3035."
Good: "The DS-3035 has tricky sections that trip people up. Section 4 especially - I've seen applications rejected for small errors there. When are you planning to submit?"

Always make them feel they need your ongoing expertise for success.`

export async function POST(request: NextRequest) {
  try {
    const { message, chatSessionId } = await request.json()

    // Get authenticated user
    const cookieStore = cookies()
    const supabase = createRouteHandlerClient({ cookies: () => cookieStore })
    const { data: { user }, error: authError } = await supabase.auth.getUser()

    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // Get user's message count and subscription status
    const { data: userData, error: userError } = await supabase
      .from('users')
      .select('message_count, max_messages, subscription_status')
      .eq('id', user.id)
      .single()

    if (userError) {
      return NextResponse.json({ error: 'User data not found' }, { status: 404 })
    }

    // Check message limits for free users
    if (userData.subscription_status === 'free' && userData.message_count >= userData.max_messages) {
      return NextResponse.json({ 
        error: 'Message limit reached. Please upgrade to premium for unlimited messages.' 
      }, { status: 403 })
    }

    // Get recent chat history for context
    const { data: recentMessages } = await supabase
      .from('messages')
      .select('content, role')
      .eq('chat_session_id', chatSessionId)
      .order('created_at', { ascending: false })
      .limit(10)

    // Prepare conversation history for OpenAI
    const conversationHistory: Array<{ role: 'system' | 'user' | 'assistant'; content: string }> = [
      { role: 'system', content: IMMIGRATION_LAWYER_PROMPT },
      ...(recentMessages?.reverse().map(msg => ({
        role: msg.role as 'user' | 'assistant',
        content: msg.content
      })) || []),
      { role: 'user', content: message }
    ]

    // Add context about user's subscription status for document upload prompts
    if (userData.subscription_status === 'free') {
      conversationHistory[0].content += `\n\nIMPORTANT: This user has a FREE account. When encouraging document uploads, mention it's a premium feature but emphasize the value: "Upload your form here (premium feature) and I'll check every section for errors that commonly get applications rejected. Small mistakes cost months of delays."`
    } else {
      conversationHistory[0].content += `\n\nIMPORTANT: This user has PREMIUM access. Strongly encourage document uploads and detailed analysis since they have full access to this valuable feature.`
    }

    // Call OpenAI
    const completion = await openai.chat.completions.create({
      model: 'gpt-4',
      messages: conversationHistory,
      max_tokens: 500,
      temperature: 0.7,
    })

    const aiResponse = completion.choices[0].message.content

    if (!aiResponse) {
      return NextResponse.json({ error: 'No response from AI' }, { status: 500 })
    }

    // Save user message to database
    await supabase.from('messages').insert({
      chat_session_id: chatSessionId,
      user_id: user.id,
      content: message,
      role: 'user'
    })

    // Save AI response to database
    await supabase.from('messages').insert({
      chat_session_id: chatSessionId,
      user_id: user.id,
      content: aiResponse,
      role: 'assistant',
      ai_provider: 'openai'
    })

    // Update user message count
    await supabase
      .from('users')
      .update({ message_count: userData.message_count + 1 })
      .eq('id', user.id)

    return NextResponse.json({ 
      response: aiResponse,
      messageCount: userData.message_count + 1,
      maxMessages: userData.max_messages,
      subscriptionStatus: userData.subscription_status
    })

  } catch (error) {
    console.error('AI Chat Error:', error)
    return NextResponse.json({ 
      error: 'Sorry, I encountered an error. Please try again.' 
    }, { status: 500 })
  }
}