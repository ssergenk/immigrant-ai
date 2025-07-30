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

*⚠️ Issues Found**
[Specific missing fields, incomplete sections, or errors you found in the actual document content]

**📝 Required Actions**
[Numbered list of specific steps to fix the issues you identified from the actual content]

**💡 Professional Advice**
[Immigration lawyer guidance based on the actual form content you reviewed]

CRITICAL: Base your analysis on the ACTUAL document content provided, not assumptions from the filename. Give specific advice about what you see in the document.`

// Better PDF parsing function
async function parsePDF(buffer: Buffer): Promise<string> {
  try {
    // Try multiple PDF parsing approaches
    const pdfParse = (await import('pdf-parse')).default

    // Parse with options for better text extraction
    const pdfData = await pdfParse(buffer, {
      // Normalize whitespace
      normalizeWhitespace: false,
      // Don't discard duplicates
      disableCombineTextItems: false
    })

    console.log(`PDF parsed: ${pdfData.numpages} pages, ${pdfData.text.length} chars`)

    return pdfData.text
  } catch (error) {
    console.error('PDF parsing failed:', error)

    // Fallback: Try to extract text as UTF-8 string
    try {
      const textContent = buffer.toString('utf8')
      // Extract readable text patterns
      const matches = textContent.match(/[a-zA-Z0-9\s\.\,\!\?\;\:\'\"\-\(\)]{20,}/g)
      if (matches) {
        return matches.join(' ').slice(0, 10000)
      }
    } catch (fallbackError) {
      console.error('Fallback extraction failed:', fallbackError)
    }

    return ''
  }
}

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
        console.log('📄 Processing PDF file - USING CONDITIONAL PDF PARSER...')

        try {
          // Use conditional PDF parser that avoids build issues
          console.log('🔍 Parsing PDF with dynamic import...')
          const rawPdfText = await parsePDF(buffer)

          console.log(`📄 Raw extracted: ${rawPdfText.length} characters`)

          // Clean and limit text for token management
          const cleanText = rawPdfText.trim().replace(/\s+/g, ' ')
          const limitedText = cleanText.slice(0, 7000) // ~90% of 8K tokens for GPT-4

          console.log(`📄 Final text: ${limitedText.length} characters (limited for tokens)`)
          console.log(`📄 First 300 chars: ${limitedText.substring(0, 300)}`)

          if (limitedText.trim().length < 100) {
            analysisResult = `**📋 PDF Content Issue**

I was able to open your PDF "${file.name}" but found very little readable text (${limitedText.length} characters). This usually means:

**🔍 Possible Issues:**
- The PDF is mostly images/scanned content without OCR text
- It's a blank form that hasn't been filled out
- The PDF is password-protected or corrupted
- It's a purely visual form without embedded text

**💡 Solutions:**
1. **Upload as images** - Take screenshots of each page as JPG/PNG files (best option)
2. **Use OCR first** - Run the PDF through an OCR tool to make text searchable
3. **Use fillable PDF** - Download the official USCIS fillable version
4. **Fill out the form first** - If it's blank, complete it before uploading

**🖼️ Why Images Work Better:**
For scanned documents or image-based PDFs, uploading as images gives me perfect visual access to see exactly what's filled out, signatures, dates, and formatting.

**💬 What Would You Like to Do?**
Would you prefer to upload the form as images, or tell me what specific form you're working with and what questions you have?`

          } else {
            // Analyze the properly extracted PDF content with AI
            const response = await openai.chat.completions.create({
              model: 'gpt-4',
              messages: [
                {
                  role: 'system',
                  content: DOCUMENT_ANALYSIS_PROMPT
                },
                {
                  role: 'user',
                  content: `Here's the extracted content of the uploaded PDF "${file.name}":

${limitedText}

Please analyze it as Sarah Chen, immigration attorney. Based on the ACTUAL content above, identify what form this is, what sections are completed, what's missing, and give specific actionable advice based on what you can see in the document content.`
                }
              ],
              max_tokens: 1500,
              temperature: 0.3
            })

            analysisResult = response.choices[0].message.content || 'Unable to analyze extracted content'
            console.log('✅ PDF content analysis completed successfully')
          }

        } catch (pdfError) {
          console.error('📄 PDF parsing error:', pdfError)

          // Fallback: Recommend image upload
          analysisResult = `**📋 PDF Parsing Error**

I encountered an issue parsing your PDF file "${file.name}". This can happen with complex PDF formats, scanned documents, or encrypted files.

**💡 Best Solution - Upload as Images:**

**🖼️ Convert to Images (Most Reliable)**
1. Open your PDF file on your computer
2. Take screenshots of each page (or use "Save as Image")
3. Upload each page as JPG/PNG files
4. I'll analyze each page with perfect accuracy

**📋 Why This Works Better:**
- Images bypass all PDF parsing issues
- I can see filled fields, handwriting, signatures, dates
- Works with scanned forms, filled forms, any format
- Gives me the same view you see on screen

**🔍 Alternative Help:**
If you can't convert to images right now, tell me:
- What type of immigration form is this?
- What sections are you struggling with?
- Any specific questions about completion?

**💬 What Would You Prefer?**
Upload as images for detailed analysis, or tell me about your specific form questions?`
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