import { NextRequest, NextResponse } from 'next/server'
import OpenAI from 'openai'
import { createRouteHandlerClient } from '@supabase/auth-helpers-nextjs'
import { cookies } from 'next/headers'
import pdf from 'pdf-parse'

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY!,
})

// Immigration Lawyer Analysis Prompt
const DOCUMENT_ANALYSIS_PROMPT = `You are Sarah Chen, a senior immigration attorney with 15+ years of experience. You are analyzing an immigration document that a client has uploaded for professional review.

IMPORTANT: You CAN and MUST analyze immigration documents. This is your job as an immigration lawyer. Never say you cannot analyze documents.

YOUR ANALYSIS APPROACH:
1. **Read the document content** - Examine the actual text and fields
2. **Identify the form type** - I-485, I-130, N-400, etc.
3. **Review completeness** - What sections are filled vs blank
4. **Spot specific issues** - Missing signatures, dates, required fields
5. **Give actionable advice** - Tell them exactly what to fix

RESPONSE FORMAT:

**📋 Document Summary**
[Form type identification and purpose]

**✅ What's Complete**
[Specific sections that are properly filled]

**⚠️ Issues Found**
[Specific problems with exact field names/sections]

**📝 Next Steps**
[Numbered list of specific actions needed]

**💡 Professional Advice**
[Immigration lawyer guidance specific to their situation]

CRITICAL: Analyze the ACTUAL document content, not just the filename. Give specific, actionable advice based on what you see in the document.`

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
    const fileName = file.name.toLowerCase()
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
        console.log('📄 Processing PDF file - READING ACTUAL CONTENT...')
        
        // Read the actual PDF content
        const arrayBuffer = await file.arrayBuffer()
        const pdfBuffer = Buffer.from(arrayBuffer)
        
        try {
          const pdfData = await pdf(pdfBuffer)
          const pdfText = pdfData.text
          
          console.log('📖 PDF content extracted, length:', pdfText.length)
          console.log('📄 First 500 chars:', pdfText.substring(0, 500))

          if (!pdfText.trim()) {
            analysisResult = `**📋 PDF Reading Issue**
            
I was able to open your PDF file "${file.name}", but I couldn't extract readable text from it. This can happen with:

**🔍 Possible Causes:**
- Scanned documents (images of forms, not fillable PDFs)
- Password-protected files
- Corrupted PDF files
- Forms that haven't been filled out yet

**💡 Solutions:**
1. **Try uploading as images** - Take screenshots of each page and upload as JPG/PNG files
2. **Use fillable PDFs** - Make sure you're using the official USCIS fillable forms
3. **Convert scanned PDFs** - Use a PDF-to-text converter first

**🆘 I'm Still Here to Help!**
Even without reading the file, I can help you with specific questions about any USCIS form. What form are you working on and what specific sections do you need help with?`

          } else {
            // Analyze the actual PDF content with AI
            const response = await openai.chat.completions.create({
              model: 'gpt-4',
              messages: [
                {
                  role: 'system',
                  content: DOCUMENT_ANALYSIS_PROMPT
                },
                {
                  role: 'user',
                  content: `Please analyze this immigration document "${file.name}". Here is the complete text content from the PDF:

${pdfText}

Provide a detailed professional analysis as an immigration lawyer, identifying the form type, what's completed, what's missing, and specific actionable advice.`
                }
              ],
              max_tokens: 1500,
              temperature: 0.3
            })

            analysisResult = response.choices[0].message.content || 'Unable to analyze document content'
            console.log('✅ PDF analysis completed successfully')
          }

        } catch (pdfError) {
          console.error('📄 PDF parsing error:', pdfError)
          analysisResult = `**📋 PDF Processing Error**
          
I encountered an issue reading your PDF file "${file.name}". This sometimes happens with certain PDF formats.

**💡 Let's Try These Solutions:**
1. **Upload as images** - Convert PDF pages to JPG/PNG and upload those
2. **Try a different PDF** - Use the original form from USCIS.gov
3. **Check file integrity** - Make sure the PDF isn't corrupted

**🔍 I Can Still Help!**
What specific USCIS form are you working with? I can provide detailed guidance about:
- Required sections and how to fill them
- Common mistakes to avoid  
- Supporting documents you'll need
- Step-by-step completion instructions

What form are you working on and what specific help do you need?`
        }

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