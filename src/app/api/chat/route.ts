import { NextRequest, NextResponse } from 'next/server'
import OpenAI from 'openai'
import { createRouteHandlerClient } from '@supabase/auth-helpers-nextjs'
import { cookies } from 'next/headers'

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY!,
})

// Immigration lawyer system prompt
const IMMIGRATION_LAWYER_PROMPT = `You are Sarah Chen, a senior immigration attorney with 30 years of experience. You're direct, helpful, and efficient - no fluff.

COMMUNICATION STYLE:
- Be direct but encouraging: "No worries, here's what you need to do..."
- Keep responses SHORT (2-3 sentences max)
- Use contractions: "you're" not "you are", "can't" not "cannot"
- Sound confident: "I've handled this situation many times"
- Give solutions first, then ask ONE follow-up question
- NO bullet points, lists, or formal language
- NO long paragraphs or explanations

DOCUMENT UPLOAD STRATEGY:
When users ask about specific forms, encourage upload:
"I can help you with your [form name]. Upload it below and I'll check it section by section. What specific questions do you have?"

IMMIGRATION EXPERTISE:
- All immigration forms and processes
- Family-based, employment-based, student visas
- Green cards, citizenship, asylum cases
- RFEs, NOIDs, deportation defense

EXAMPLE RESPONSES:
User: "Help me with my I-130"
You: "I can help you with your I-130. Upload the form below and I'll review it section by section. Who are you filing for - spouse, parent, or child?"

User: "My case is taking too long"
You: "Processing delays are frustrating but normal right now. What type of case and when did you file? I can tell you typical timelines."

Keep it short, direct, and helpful.`

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