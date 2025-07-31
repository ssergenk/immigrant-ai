import { NextRequest, NextResponse } from 'next/server'
import OpenAI from 'openai'
import { createRouteHandlerClient } from '@supabase/auth-helpers-nextjs'
import { cookies } from 'next/headers'

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY!,
})

// Saul Goodman-style Immigration Attorney Prompt
const DOCUMENT_ANALYSIS_PROMPT = `You are Sarah Chen, a badass immigration attorney with 30 years of experience. You're like Saul Goodman but for immigration law - quick, direct, and you get shit done.

Your style:
- NO long paragraphs or articles
- Straight to the point
- "No worries, here's what you gotta do..."
- Give specific form names and links when needed
- Act like you've seen everything in 30 years

When analyzing forms:
- Point out EXACTLY what's missing (dates, signatures, checkboxes)
- Tell them if something looks wrong
- Give step-by-step fixes
- Be encouraging but realistic

Example responses:
User: "My wife doesn't want to come to our green card interview"
You: "No worries! You can request to reschedule or ask for a waiver if she's sick. I'll walk you through it - first, call USCIS at..."

User: "Can you help me apply for citizenship?"
You: "You need Form N-400. Here's the link: uscis.gov/n-400. I can help you step by step. First question - how long have you been a permanent resident?"

CRITICAL: Base everything on the ACTUAL form content I give you. Be specific about what fields are filled vs empty.`

// Reliable PDF parsing function
async function parsePDF(buffer: Buffer): Promise<string> {
  console.log('🔍 Starting reliable PDF parsing...')
  
  try {
    // Method 1: Standard pdf-parse (most reliable)
    console.log('📄 Method 1: Standard pdf-parse')
    const pdfParse = (await import('pdf-parse')).default
    const pdfData = await pdfParse(buffer)

    console.log(`PDF parsed: ${pdfData.numpages} pages, ${pdfData.text.length} characters`)
    
    if (pdfData.text.trim().length > 100) {
      return pdfData.text
    }

    // Method 2: Try pdf-lib for form field extraction
    console.log('📄 Method 2: Form field extraction with pdf-lib')
    try {
      const { PDFDocument } = await import('pdf-lib')
      const pdfDoc = await PDFDocument.load(buffer)
      const form = pdfDoc.getForm()
      const fields = form.getFields()
      
      let formData = ''
      console.log(`Found ${fields.length} form fields`)
      
      fields.forEach((field) => {
        try {
          const fieldName = field.getName()
          let fieldValue = ''
          
          // Try to get field value based on type
          if ('getText' in field && typeof (field as unknown as { getText: () => string }).getText === 'function') {
            fieldValue = (field as unknown as { getText: () => string }).getText() || ''
          } else if ('isChecked' in field && typeof (field as unknown as { isChecked: () => boolean }).isChecked === 'function') {
            fieldValue = (field as unknown as { isChecked: () => boolean }).isChecked() ? 'Checked' : 'Unchecked'
          }
          
          if (fieldName && fieldValue) {
            formData += `${fieldName}: ${fieldValue}\n`
          }
        } catch (fieldError) {
          console.log('Field extraction error:', fieldError)
        }
      })
      
      if (formData.trim()) {
        console.log(`✅ Extracted ${formData.length} characters of form data`)
        return `FORM FIELDS:\n\n${formData}\n\nRAW TEXT:\n${pdfData.text}`
      }
    } catch (pdfLibError) {
      console.log('pdf-lib extraction failed:', pdfLibError)
    }

    // Method 3: Raw text extraction patterns
    console.log('📄 Method 3: Raw text pattern extraction')
    try {
      const rawText = buffer.toString('utf8')
      let extractedText = ''
      
      // Common PDF text patterns
      const patterns = [
        /\((.*?)\)/g,        // Text in parentheses
        /\/T\s*\((.*?)\)/g,  // Text field values
        /\/V\s*\((.*?)\)/g,  // Field values
        /BT\s+(.*?)\s+ET/g   // Text objects
      ]
      
      patterns.forEach(pattern => {
        const matches = rawText.match(pattern)
        if (matches) {
          matches.forEach(match => {
            const cleaned = match.replace(/[()\/TVB ET]/g, '').trim()
            if (cleaned.length > 3 && cleaned.match(/[a-zA-Z]/)) {
              extractedText += cleaned + ' '
            }
          })
        }
      })
      
      if (extractedText.trim().length > 50) {
        console.log(`✅ Pattern extraction: ${extractedText.length} characters`)
        return extractedText.trim()
      }
    } catch (patternError) {
      console.log('Pattern extraction failed:', patternError)
    }

    // Method 4: Binary text extraction
    console.log('📄 Method 4: Binary text extraction')
    try {
      const binaryText = buffer.toString('binary')
      const textMatches = binaryText.match(/[a-zA-Z0-9\s\.\,\!\?\;\:\'\"\-\(\)]{20,}/g)
      
      if (textMatches && textMatches.length > 0) {
        const combinedText = textMatches.join(' ').slice(0, 8000)
        if (combinedText.trim().length > 100) {
          console.log(`✅ Binary extraction: ${combinedText.length} characters`)
          return combinedText
        }
      }
    } catch (binaryError) {
      console.log('Binary extraction failed:', binaryError)
    }

    // If we still have some text from pdf-parse, use it
    if (pdfData.text.trim().length > 0) {
      console.log(`Using pdf-parse fallback: ${pdfData.text.length} characters`)
      return pdfData.text
    }

    console.log('❌ All extraction methods failed')
    return ''

  } catch (error) {
    console.error('❌ PDF parsing completely failed:', error)
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
    } else {
      console.log('✅ File uploaded to storage:', uploadData.path)
    }

    let analysisResult: string

    try {
      if (file.type.startsWith('image/')) {
        console.log('🖼️ Processing image with AI Vision...')

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
                  text: `Analyze this immigration form image "${file.name}". Tell me exactly what's filled out, what's missing, and what needs to be fixed. Be direct and specific like you've been doing this for 30 years.`
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
          max_tokens: 1000,
          temperature: 0.3
        })

        analysisResult = response.choices[0].message.content || 'Unable to analyze document'
        console.log('✅ Image analysis completed')

      } else if (file.type === 'application/pdf') {
        console.log('📄 Processing PDF file...')

        const extractedText = await parsePDF(buffer)
        console.log(`📄 Final extracted text: ${extractedText.length} characters`)

        if (extractedText.trim().length < 50) {
          analysisResult = `Hey, I'm having trouble reading your PDF "${file.name}". 

Here's what works better:
1. **Upload as images** - Take screenshots of each page and upload as JPG/PNG
2. **Tell me what form** - What immigration form are you working on? I can guide you step by step

What form are you trying to fill out? I-130? I-485? I-131? Let me know and I'll help you get it right.`

        } else {
          // Analyze with GPT-4
          const response = await openai.chat.completions.create({
            model: 'gpt-4',
            messages: [
              {
                role: 'system',
                content: DOCUMENT_ANALYSIS_PROMPT
              },
              {
                role: 'user',
                content: `Here's the content from "${file.name}":

${extractedText.slice(0, 6000)}

Analyze this immigration form. Tell me exactly what's filled out, what's missing, and what needs to be fixed. Be direct and specific.`
              }
            ],
            max_tokens: 1000,
            temperature: 0.3
          })

          analysisResult = response.choices[0].message.content || 'Unable to analyze document'
          console.log('✅ PDF analysis completed')
        }

      } else {
        return NextResponse.json({ error: 'Upload PDF or image files only.' }, { status: 400 })
      }

    } catch (aiError) {
      console.error('AI Analysis Error:', aiError)
      analysisResult = `Technical hiccup analyzing your document, but no worries!

Tell me:
- What immigration form are you working on?
- What specific questions do you have?
- What sections are giving you trouble?

I can help you step by step even without the file analysis.`
    }

    // Save to database
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
      error: 'Something went wrong analyzing your document. Try again.',
      details: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 })
  }
}