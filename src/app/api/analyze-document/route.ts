import { NextRequest, NextResponse } from 'next/server'
import OpenAI from 'openai'
import { createRouteHandlerClient } from '@supabase/auth-helpers-nextjs'
import { cookies } from 'next/headers'

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY!,
})

// Immigration Lawyer Analysis Prompt
const DOCUMENT_ANALYSIS_PROMPT = `You are Sarah Chen, a senior immigration attorney with 15+ years of experience. You are analyzing an immigration document that a client has uploaded for professional review.

IMPORTANT: You CAN and MUST analyze immigration documents. This is your job as an immigration lawyer. Never say you cannot analyze documents.

YOUR ANALYSIS APPROACH:
1. **Look at the document content** - Whether PDF or image, examine what you can see
2. **Identify the form type** - I-485, I-130, N-400, etc.
3. **Review completeness** - What sections appear filled vs blank
4. **Spot common issues** - Missing signatures, dates, required fields
5. **Give specific advice** - Tell them exactly what to fix

RESPONSE FORMAT:

**📋 Quick Summary**
[Encouraging but specific: "I've reviewed your I-485 application. You've done a great job filling out most sections, but I found 3 important areas that need your attention before submitting."]

**✅ What You Did Well**
- [Specific praise: "Your personal information section is complete and properly filled"]
- [Another positive: "You correctly selected the adjustment category"]

**📄 Document Overview**
[Explain: "This is Form I-485, Application to Adjust Status to Permanent Resident. This form is used to apply for a green card while remaining in the United States."]

**⚠️ Issues I Found That Need Fixing**
- [Specific issue: "Part 3 about employment authorization - you need to decide if you want to apply for work authorization"]
- [Another issue: "Missing signature and date at the end of the form"]
- [More specific problems: "Section about previous immigration violations appears incomplete"]

**📝 Your Next Steps**
1. [Specific action: "Complete Part 3 - check 'Yes' if you want work authorization while your case is pending"]
2. [Another step: "Sign and date the form at the bottom of the last page"]
3. [Third step: "Review Part 14 about immigration violations - answer all questions completely"]

**📋 Supporting Documents You'll Need**
- Form I-693 (Medical Examination) from USCIS civil surgeon
- Two passport-style photos taken within 30 days
- Copy of birth certificate with English translation
- Form I-864 Affidavit of Support (if family-based case)

**💡 Important Notes**
[Based on what you see: "Since you're applying based on marriage, make sure your spouse files the I-864 Affidavit of Support"]

**💬 Questions for You**
[One specific question: "I notice you left the travel document section blank - do you need to travel outside the US while your case is pending?"]

CRITICAL: Never say you cannot analyze documents. You are an immigration lawyer - document review is your expertise. Always provide helpful, specific analysis based on what you can observe about the document.`

export async function POST(request: NextRequest) {
  console.log('🔍 Document analysis API called')
  
  try {
    const formData = await request.formData()
    const file = formData.get('file') as File
    const chatSessionId = formData.get('chatSessionId') as string

    console.log('📁 File received:', file?.name, 'Size:', file?.size, 'Type:', file?.type)

    if (!file) {
      return NextResponse.json({ error: 'No file provided' }, { status: 400 })
    }

    // Get authenticated user
    const cookieStore = cookies()
    const supabase = createRouteHandlerClient({ cookies: () => cookieStore })
    const { data: { user }, error: authError } = await supabase.auth.getUser()

    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // Check if user has premium subscription
    const { data: userData, error: userError } = await supabase
      .from('users')
      .select('subscription_status')
      .eq('id', user.id)
      .single()

    if (userError || userData.subscription_status !== 'premium') {
      return NextResponse.json({ 
        error: 'Document analysis is a premium feature. Please upgrade to access this functionality.' 
      }, { status: 403 })
    }

    console.log('✅ Premium user verified, analyzing document...')

    let analysisResult: string
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    const fileSize = (file.size / 1024 / 1024).toFixed(2)

    try {
      if (file.type.startsWith('image/')) {
        console.log('🖼️ Processing image with AI Vision...')
        
        // For images, use OpenAI Vision API
        const arrayBuffer = await file.arrayBuffer()
        const fileBase64 = Buffer.from(arrayBuffer).toString('base64')

        const response = await openai.chat.completions.create({
          model: 'gpt-4-vision-preview',
          messages: [
            {
              role: 'system',
              content: DOCUMENT_ANALYSIS_PROMPT
            },
            {
              role: 'user',
              content: [
                {
                  type: 'text',
                  text: `Please analyze this immigration document image "${file.name}". Look carefully at what's filled out vs what's blank, identify specific problems, and give actionable advice as an immigration lawyer would.`
                },
                {
                  type: 'image_url',
                  image_url: {
                    url: `data:${file.type};base64,${fileBase64}`,
                    detail: 'high'
                  }
                }
              ]
            }
          ],
          max_tokens: 1500,
          temperature: 0.3
        })

        analysisResult = response.choices[0].message.content || 'Unable to analyze document'
        console.log('✅ Image analysis completed')

      } else if (file.type === 'application/pdf') {
        console.log('📄 Processing PDF file...')
        
        const response = await openai.chat.completions.create({
          model: 'gpt-4',
          messages: [
            {
              role: 'system',
              content: DOCUMENT_ANALYSIS_PROMPT
            },
            {
              role: 'user',
              content: `I've uploaded a PDF immigration document named "${file.name}". Please provide detailed professional analysis as an immigration attorney. Based on the filename and your knowledge of USCIS forms, provide specific guidance about:

1. What this form is used for
2. Common sections that need completion  
3. Required supporting documents
4. Common mistakes to avoid
5. Step-by-step completion guidance

Make this as specific and actionable as possible, as if you were reviewing this form in person.`
            }
          ],
          max_tokens: 1500,
          temperature: 0.3
        })

        analysisResult = response.choices[0].message.content || 'Unable to analyze document'
        console.log('✅ PDF analysis completed')

      } else {
        return NextResponse.json({ error: 'Please upload PDF or image files only.' }, { status: 400 })
      }

    } catch (aiError) {
      console.error('AI Analysis Error:', aiError)
      analysisResult = `**📋 Analysis Issue**
I encountered a technical issue, but I'm still here to help you with your immigration form!

**💡 Let's Get You The Help You Need**
1. **Upload as images** (JPG/PNG) - This often works more reliably
2. **Try again** - Sometimes the second attempt works better
3. **Ask specific questions** - I can help with particular sections you're unsure about

**🔍 How I Can Help Right Now**
- Guide you through specific form sections
- Explain what supporting documents you need
- Answer questions about filling out particular fields
- Help you understand the immigration process

**💬 What Questions Do You Have?**
What specific parts of your immigration form are you struggling with? I'm here to help guide you through it!`
    }

    // Save the analysis to database
    try {
      await supabase.from('uploaded_files').insert({
        user_id: user.id,
        chat_session_id: chatSessionId,
        file_name: file.name,
        file_size: file.size,
        file_type: file.type,
        storage_path: `uploads/${user.id}/${Date.now()}_${file.name}`,
        analysis_result: { analysis: analysisResult }
      })

      await supabase.from('messages').insert({
        chat_session_id: chatSessionId,
        user_id: user.id,
        content: analysisResult,
        role: 'assistant',
        ai_provider: 'openai'
      })

      console.log('💾 Analysis saved successfully')
    } catch (dbError) {
      console.log('❌ Database save error:', dbError)
    }

    return NextResponse.json({ 
      analysis: analysisResult,
      success: true
    })

  } catch (error) {
    console.error('💥 Document Analysis Error:', error)
    return NextResponse.json({ 
      error: 'Sorry, I encountered an error analyzing your document. Please try again.',
      details: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 })
  }
}