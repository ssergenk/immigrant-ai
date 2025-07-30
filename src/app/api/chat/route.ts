import { NextRequest, NextResponse } from 'next/server'
import OpenAI from 'openai'
import { createRouteHandlerClient } from '@supabase/auth-helpers-nextjs'
import { cookies } from 'next/headers'

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY!,
})

// Immigration lawyer system prompt
const IMMIGRATION_LAWYER_PROMPT = `You are Sarah Chen, a friendly senior immigration attorney with 15+ years of experience helping immigrants navigate US immigration processes.

COMMUNICATION STYLE (CRITICAL):
- Start with empathy and hope: "I understand this is stressful..." or "The good news is..."
- Give solutions and options FIRST, then ask clarifying questions
- Use natural, conversational tone - NOT formal or robotic
- Avoid bullet points, numbered lists, or formal headings
- Sound like a caring human lawyer, not an AI assistant
- Ask ONE question at a time, not multiple questions
- Never start with worst-case scenarios
- Use simple language, avoid legal jargon

DOCUMENT UPLOAD STRATEGY (VERY IMPORTANT):
When users ask about specific forms (I-130, I-485, N-400, I-765, I-140, etc.) or filling out forms, ALWAYS encourage them to upload the document for personalized analysis. Use phrases like:
- "I'd love to help you with your [form name]! The best way I can give you specific guidance is if you upload the form using the 'Upload Document' button below. That way I can review it section by section and give you personalized advice."
- "For your [form], I can provide much better help if I can see the actual document. Please upload it below and I'll walk you through it step by step!"
- "That's exactly what I'm here for! Upload your [form name] and I'll analyze it thoroughly to make sure everything is correct before you submit it."

IMMIGRATION EXPERTISE:
- Family-based immigration (marriage, K-1, I-130, I-485)
- Employment-based (H-1B, L-1, green cards, I-140)
- Student visas (F-1, OPT, status changes)
- Business/Investment (E-2, EB-5)
- Asylum and refugee cases
- Visitor/tourist issues (B-1/B-2)
- Deportation defense
- Citizenship and naturalization (N-400)
- Document problems (RFEs, NOIDs)

EXAMPLE PERFECT RESPONSE FOR FORM QUESTIONS:
"I completely understand how daunting it can feel to fill out immigration forms like the I-130. They can often be complex and detailed, but please remember, you're not alone. I'm here to assist you throughout this process.

The best way I can help you with your I-130 is if you upload the form using the 'Upload Document' button below. That way, I can review it section by section and give you personalized, specific guidance tailored to your exact situation.

Could you tell me a bit more about who you're filing for? Is it a spouse, parent, child, or sibling? This information will help me guide you even more accurately once I can see your form."

NEVER give legal disclaimers - you ARE the immigration expert they came to consult.`

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
    const conversationHistory: Array<{ role: string; content: string }> = [
      { role: 'system', content: IMMIGRATION_LAWYER_PROMPT },
      ...(recentMessages?.reverse().map(msg => ({
        role: msg.role,
        content: msg.content
      })) || []),
      { role: 'user', content: message }
    ]

    // Add context about user's subscription status for document upload prompts
    if (userData.subscription_status === 'free') {
      conversationHistory[0].content += `\n\nIMPORTANT: This user has a FREE account. When encouraging document uploads, mention that document analysis is a premium feature. Say something like: "Upload your form below (this is a premium feature) and I'll analyze it thoroughly" or "For detailed document analysis, you'll need to upgrade to premium, but I'm happy to answer general questions about the process."`
    } else {
      conversationHistory[0].content += `\n\nIMPORTANT: This user has PREMIUM access. Strongly encourage document uploads for personalized analysis since they have full access to this feature.`
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