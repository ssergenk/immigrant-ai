import { NextRequest, NextResponse } from 'next/server'
import OpenAI from 'openai'
import { createRouteHandlerClient } from '@supabase/auth-helpers-nextjs'
import { cookies } from 'next/headers'
import * as pdfjsLib from 'pdfjs-dist'

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY!,
})

// Set worker path for PDF.js
pdfjsLib.GlobalWorkerOptions.workerSrc = `//cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/pdf.worker.min.js`

// Immigration Lawyer Analysis Prompt
const DOCUMENT_ANALYSIS_PROMPT = `You are Sarah Chen, a senior immigration attorney with 15+ years of experience. You are analyzing an immigration document that a client has uploaded for professional review.

IMPORTANT: You CAN and MUST analyze immigration documents. This is your job as an immigration lawyer. Never say you cannot analyze documents.

ANALYZE THE ACTUAL DOCUMENT CONTENT - not just the filename. Look at what fields are filled, what's missing, and provide specific actionable advice.

RESPONSE FORMAT:

**📋 Document Analysis**
[Identify the specific form and what you found in the actual content]

**✅ Completed Sections**
[List specific sections/fields that are properly filled based on the actual text]

**⚠️ Issues Found**
[Specific missing fields, incomplete sections, or errors you found in the actual document]

**📝 Required Actions**
[Numbered list of specific steps to fix the issues you identified]

**💡 Professional Advice**
[Immigration lawyer guidance based on the actual form content]

CRITICAL: Base your analysis on the ACTUAL document text content, not assumptions from the filename.`

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
        console.log('📄 Processing PDF file - EXTRACTING REAL CONTENT...')
        
        try {
          // Read PDF with PDF.js
          const arrayBuffer = await file.arrayBuffer()
          const pdfDoc = await pdfjsLib.getDocument({ data: arrayBuffer }).promise
          
          console.log(`📖 PDF loaded - ${pdfDoc.numPages} pages`)
          
          let fullText = ''
          
          // Extract text from all pages
          for (let pageNum = 1; pageNum <= pdfDoc.numPages; pageNum++) {
            const page = await pdfDoc.getPage(pageNum)
            const textContent = await page.getTextContent()
            
            const pageText = textContent.items
              .map((item: { str: string }) => item.str)
              .join(' ')
            
            fullText += `\n--- Page ${pageNum} ---\n${pageText}`
          }
          
          console.log(`📄 Extracted ${fullText.length} characters from PDF`)
          console.log(`📄 First 500 chars: ${fullText.substring(0, 500)}`)

          if (fullText.trim().length < 50) {
            analysisResult = `**📋 PDF Content Issue**
            
I was able to open your PDF "${file.name}" but found very little readable text (${fullText.length} characters). This usually means:

**🔍 Possible Issues:**
- The PDF is mostly images/scanned content
- It's a blank form that hasn't been filled out
- The PDF has technical formatting issues

**💡 Solutions:**
1. **Upload as images** - Take screenshots of each page as JPG/PNG files
2. **Use fillable PDF** - Make sure you're using the official USCIS fillable version
3. **Fill out the form first** - If it's blank, complete it before uploading

**🆘 I Can Still Help!**
Tell me what specific USCIS form you're working with and what questions you have about filling it out. I can provide detailed guidance even without reading the file.

What form are you working on and what specific help do you need?`

          } else {
            // Analyze the extracted text with AI
            const response = await openai.chat.completions.create({
              model: 'gpt-4',
              messages: [
                {
                  role: 'system',
                  content: DOCUMENT_ANALYSIS_PROMPT
                },
                {
                  role: 'user',
                  content: `Please analyze this immigration document "${file.name}". Here is the complete text content extracted from the PDF:

${fullText}

Provide detailed professional analysis as an immigration lawyer. Identify what form this is, what sections are completed, what's missing, and give specific actionable advice based on the actual content.`
                }
              ],
              max_tokens: 1500,
              temperature: 0.3
            })

            analysisResult = response.choices[0].message.content || 'Unable to analyze document content'
            console.log('✅ PDF content analysis completed successfully')
          }

        } catch (pdfError) {
          console.error('📄 PDF processing error:', pdfError)
          analysisResult = `**📋 PDF Reading Error**
          
I encountered an issue reading your PDF file "${file.name}". This can happen with certain PDF formats or corrupted files.

**💡 Solutions:**
1. **Try uploading as images** - Convert each page to JPG/PNG format
2. **Download fresh copy** - Get a new copy from USCIS.gov
3. **Check file integrity** - Make sure the PDF opens correctly on your computer

**🔍 I'm Still Here to Help!**
What specific USCIS form are you working with? I can provide detailed guidance about:
- How to fill out each section
- Required supporting documents
- Common mistakes to avoid
- Step-by-step completion instructions

What form are you working on and what specific questions do you have?`
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