import { NextRequest, NextResponse } from 'next/server'
import OpenAI from 'openai'
import { createRouteHandlerClient } from '@supabase/auth-helpers-nextjs'
import { cookies } from 'next/headers'

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY!,
})

// Immigration Lawyer Analysis Prompt
const DOCUMENT_ANALYSIS_PROMPT = `You are Sarah Chen, a senior immigration attorney with 15+ years of experience. You are analyzing the ACTUAL CONTENT of an immigration document that a client has uploaded for professional review.

IMPORTANT: You CAN and MUST analyze immigration documents. This is your job as an immigration lawyer. Never say you cannot analyze documents.

ANALYZE THE ACTUAL DOCUMENT CONTENT provided to you. Look at what fields are filled, what's missing, and provide specific actionable advice based on the real content.

RESPONSE FORMAT:

**📋 Document Analysis**
[Identify the specific form based on the actual content and what you found]

**✅ Completed Sections**
[List specific sections/fields that are properly filled based on the actual text content]

**⚠️ Issues Found**
[Specific missing fields, incomplete sections, or errors you found in the actual document content]

**📝 Required Actions**
[Numbered list of specific steps to fix the issues you identified from the actual content]

**💡 Professional Advice**
[Immigration lawyer guidance based on the actual form content you reviewed]

CRITICAL: Base your analysis on the ACTUAL document content provided, not assumptions from the filename. Give specific advice about what you see in the document.`

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

    // Convert file to buffer for storage and processing
    const arrayBuffer = await file.arrayBuffer()
    const buffer = Buffer.from(arrayBuffer)
    
    // Upload file to Supabase storage
    const fileName = `${Date.now()}_${file.name}`
    const storagePath = `uploads/${user.id}/${fileName}`
    
    console.log('📤 Uploading file to Supabase storage...')
    const { data: uploadData, error: uploadError } = await supabase.storage
      .from('documents')
      .upload(storagePath, buffer, {
        contentType: file.type,
        upsert: false
      })

    if (uploadError) {
      console.error('❌ Storage upload error:', uploadError)
      // Continue with analysis even if storage fails
    } else {
      console.log('✅ File uploaded to storage:', uploadData.path)
    }

    let analysisResult: string
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    const fileSize = (file.size / 1024 / 1024).toFixed(2)

    try {
      if (file.type.startsWith('image/')) {
        console.log('🖼️ Processing image with AI Vision...')
        
        // For images, use OpenAI Vision API
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
        console.log('📄 Processing PDF file - Using GPT-4 Vision for PDF analysis...')
        
        try {
          // Convert PDF buffer to base64 for GPT-4 Vision
          // This is a workaround since GPT-4 Vision can handle PDF files directly
          const fileBase64 = buffer.toString('base64')

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
                    text: `Please analyze this immigration PDF document "${file.name}". Read the actual content of the PDF, identify what form this is, what sections are completed, what's missing, and give specific actionable advice as Sarah Chen, immigration attorney. Look at the actual filled fields and content, not just the filename.`
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

          analysisResult = response.choices[0].message.content || 'Unable to analyze PDF document'
          console.log('✅ PDF analysis completed with GPT-4 Vision')

        } catch (pdfError) {
          console.error('📄 PDF processing error:', pdfError)
          
          // Fallback: Ask user to convert to images
          analysisResult = `**📋 PDF Analysis Issue**
          
I encountered a technical issue reading your PDF file "${file.name}". This can happen with certain PDF formats or complex documents.

**💡 Best Solution for Accurate Analysis:**

**🖼️ Convert PDF to Images (Recommended)**
1. Open your PDF file on your computer  
2. Take screenshots of each page (or use "Save as Image")
3. Upload each page as JPG/PNG files
4. I'll analyze each page with perfect accuracy using AI vision

**📋 Alternative: Tell Me About Your Form**
If you can't convert to images, please tell me:
- What type of immigration form is this? (I-485, I-130, N-400, etc.)
- What sections are you having trouble with?
- Any specific questions about filling it out?

**🔍 Why Images Work Better:**
Images give me perfect visual access to see exactly what's filled out, what's missing, signatures, dates, and formatting - just like reviewing the form in person.

**💬 What Would You Prefer?**
Would you like to upload the form as images, or tell me about the specific form and questions you have?`
        }

      } else {
        return NextResponse.json({ error: 'Please upload PDF or image files only.' }, { status: 400 })
      }

    } catch (aiError) {
      console.error('AI Analysis Error:', aiError)
      analysisResult = `**📋 Analysis Technical Issue**

I encountered a technical problem analyzing your document, but I'm here to help you succeed with your immigration case!

**🔍 How I Can Help Right Now:**
- Answer specific questions about USCIS forms
- Guide you through form completion step-by-step
- Explain required supporting documents
- Help you understand the immigration process

**💬 What Do You Need Help With?**
What specific immigration form are you working on and what questions do you have? I can provide expert guidance even without the file analysis.`
    }

    // Save the analysis to database with proper storage path
    try {
      await supabase.from('uploaded_files').insert({
        user_id: user.id,
        chat_session_id: chatSessionId,
        file_name: file.name,
        file_size: file.size,
        file_type: file.type,
        storage_path: storagePath,
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