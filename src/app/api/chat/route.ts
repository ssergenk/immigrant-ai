import { NextRequest, NextResponse } from 'next/server'
import OpenAI from 'openai'
import { createRouteHandlerClient } from '@supabase/auth-helpers-nextjs'
import { cookies } from 'next/headers'

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY!,
})

// Saul Goodman-style Immigration Attorney Prompt
const DOCUMENT_ANALYSIS_PROMPT = `You are Sarah Chen, a badass immigration attorney with 30 years of experience. You talk like Saul Goodman but for immigration law - quick, direct, and you get shit done.

CRITICAL PERSONALITY RULES:
- NEVER be polite or formal
- NEVER say "I'd be delighted" or "I would be beneficial"
- NEVER write long paragraphs 
- BE DIRECT: "No worries, here's what you gotta do..."
- BE SHORT: Max 3-4 sentences per response
- BE CONFIDENT: "I've seen this a thousand times"
- USE CONTRACTIONS: "you're" not "you are", "can't" not "cannot"

EXAMPLES OF YOUR STYLE:
User: "My wife doesn't want to come to our green card interview"
You: "No worries! Reschedule it. Call USCIS at 1-800-375-5283, tell them she's sick. They'll give you 30 days. Done."

User: "Can you help me apply for citizenship?"
You: "You need Form N-400. I can walk you through it step by step. How long you been a permanent resident?"

When PDF is encrypted:
"Your PDF is locked down. Take screenshots as JPG and upload those - works every time. What form you working on?"

NEVER BE APOLOGETIC OR FORMAL. BE THE SAUL GOODMAN OF IMMIGRATION LAW.`

// Interface for better typing
interface PDFField {
  name: string;
  value: string;
  type: string;
}

// Super aggressive PDF parsing function
async function parsePDF(buffer: Buffer): Promise<string> {
  console.log('🔍 Starting AGGRESSIVE PDF parsing...')
  let extractedContent = ''
  
  try {
    // Method 1: Standard pdf-parse with detailed logging
    console.log('📄 Method 1: Standard pdf-parse')
    try {
      const pdfParse = (await import('pdf-parse')).default
      const pdfData = await pdfParse(buffer, {
        max: 0 // Disable page limit to avoid test file issues
      })

      console.log(`PDF Info - Pages: ${pdfData.numpages}, Text Length: ${pdfData.text.length}`)
      console.log(`First 500 chars of text: "${pdfData.text.substring(0, 500)}"`)
      
      if (pdfData.text.trim().length > 20) {
        extractedContent += `PDF-PARSE CONTENT:\n${pdfData.text}\n\n`
      }
    } catch (pdfParseError) {
      console.log('pdf-parse failed:', pdfParseError)
      extractedContent += `PDF-PARSE FAILED: ${pdfParseError}\n\n`
    }

    // Method 2: pdf-lib form field extraction with extensive logging
    console.log('📄 Method 2: pdf-lib form field extraction')
    try {
      const { PDFDocument } = await import('pdf-lib')
      const pdfDoc = await PDFDocument.load(buffer)
      
      // Get document info
      const pageCount = pdfDoc.getPageCount()
      const title = pdfDoc.getTitle()
      const creator = pdfDoc.getCreator()
      
      console.log(`PDF Metadata - Pages: ${pageCount}, Title: ${title}, Creator: ${creator}`)
      
      const form = pdfDoc.getForm()
      const fields = form.getFields()
      
      console.log(`Found ${fields.length} form fields`)
      
      let formFieldsText = ''
      const processedFields: PDFField[] = []
      
      fields.forEach((field, index) => {
        try {
          const fieldName = field.getName()
          const fieldType = field.constructor.name
          
          console.log(`Field ${index}: ${fieldName} (${fieldType})`)
          
          let fieldValue = ''
          
          // Handle different field types with proper error handling
          if (fieldType.includes('TextField')) {
            try {
              const textField = field as unknown as { getText(): string }
              fieldValue = textField.getText ? textField.getText() : 'NO_TEXT_METHOD'
            } catch {
              fieldValue = 'TEXT_FIELD_ERROR'
            }
          } else if (fieldType.includes('CheckBox')) {
            try {
              const checkField = field as unknown as { isChecked(): boolean }
              fieldValue = checkField.isChecked ? (checkField.isChecked() ? 'CHECKED' : 'UNCHECKED') : 'NO_CHECKED_METHOD'
            } catch {
              fieldValue = 'CHECKBOX_ERROR'
            }
          } else if (fieldType.includes('Dropdown')) {
            try {
              const dropdownField = field as unknown as { getSelected(): string[] | undefined }
              const selected = dropdownField.getSelected ? dropdownField.getSelected() : null
              fieldValue = selected ? JSON.stringify(selected) : 'NO_SELECTION'
            } catch {
              fieldValue = 'DROPDOWN_ERROR'
            }
          } else {
            fieldValue = `UNKNOWN_TYPE_${fieldType}`
          }
          
          processedFields.push({ name: fieldName, value: fieldValue, type: fieldType })
          formFieldsText += `${fieldName}: ${fieldValue}\n`
          console.log(`  Value: ${fieldValue}`)
          
        } catch (fieldError) {
          console.log(`Field ${index} processing error:`, fieldError)
          formFieldsText += `Field_${index}: PROCESSING_ERROR\n`
        }
      })
      
      if (formFieldsText.trim()) {
        extractedContent += `FORM FIELDS (${fields.length} total):\n${formFieldsText}\n\n`
      }
      
    } catch (pdfLibError) {
      console.log('pdf-lib error:', pdfLibError)
      extractedContent += `PDF-LIB ERROR: ${pdfLibError}\n\n`
    }

    // Method 3: Raw buffer analysis with multiple encodings
    console.log('📄 Method 3: Raw buffer analysis')
    
    // Try different encodings
    const encodings: BufferEncoding[] = ['utf8', 'ascii', 'latin1', 'binary']
    
    encodings.forEach(encoding => {
      try {
        const rawText = buffer.toString(encoding)
        console.log(`${encoding} encoding - Length: ${rawText.length}`)
        
        // Look for text patterns
        const patterns = [
          /\/T\s*\(([^)]+)\)/g,     // Text field values
          /\/V\s*\(([^)]+)\)/g,     // Field values  
          /\/DA\s*\(([^)]+)\)/g,    // Default appearance
          /BT\s+([^E]+)ET/g,        // Text objects
          /\(([^)]{3,50})\)/g,      // Any text in parentheses
          /\/F\d+\s+(\w+)/g,        // Font references
          /stream\s*\n([^e]+)endstream/g, // Stream content
        ]
        
        let patternText = ''
        patterns.forEach((pattern, i) => {
          const matches = rawText.match(pattern)
          if (matches) {
            console.log(`Pattern ${i} found ${matches.length} matches in ${encoding}`)
            matches.slice(0, 10).forEach(match => { // Limit to first 10 matches
              const cleaned = match.replace(/[\/\(\)BTET]/g, '').trim()
              if (cleaned.length > 2 && cleaned.match(/[a-zA-Z]/)) {
                patternText += cleaned + ' '
              }
            })
          }
        })
        
        if (patternText.trim().length > 10) {
          extractedContent += `${encoding.toUpperCase()} PATTERNS:\n${patternText.trim()}\n\n`
        }
        
      } catch (encodingError) {
        console.log(`${encoding} encoding failed:`, encodingError)
      }
    })

    // Method 4: Hex dump analysis
    console.log('📄 Method 4: Hex analysis')
    try {
      const hexString = buffer.toString('hex')
      console.log(`Hex length: ${hexString.length}`)
      
      // Look for common PDF strings in hex
      const commonStrings = ['Name', 'Type', 'Kids', 'Parent', 'Page', 'Text', 'Font', 'obj', 'endobj']
      const hexFindings: string[] = []
      
      commonStrings.forEach(str => {
        const hexPattern = Buffer.from(str, 'utf8').toString('hex')
        if (hexString.includes(hexPattern)) {
          hexFindings.push(str)
        }
      })
      
      if (hexFindings.length > 0) {
        extractedContent += `HEX ANALYSIS - Found: ${hexFindings.join(', ')}\n\n`
      }
      
    } catch (hexError) {
      console.log('Hex analysis failed:', hexError)
    }

    // Method 5: Chunk analysis
    console.log('📄 Method 5: Chunk analysis')
    try {
      const chunkSize = 1000
      const chunks = []
      
      for (let i = 0; i < buffer.length; i += chunkSize) {
        const chunk = buffer.slice(i, i + chunkSize)
        const chunkText = chunk.toString('utf8').replace(/[^\x20-\x7E]/g, '')
        
        if (chunkText.length > 50) {
          chunks.push(`Chunk ${Math.floor(i/chunkSize)}: ${chunkText.substring(0, 200)}`)
        }
      }
      
      if (chunks.length > 0) {
        extractedContent += `CHUNKS FOUND:\n${chunks.slice(0, 5).join('\n')}\n\n`
      }
      
    } catch (chunkError) {
      console.log('Chunk analysis failed:', chunkError)
    }

    console.log(`📄 Total extracted content length: ${extractedContent.length}`)
    console.log(`📄 First 1000 chars: "${extractedContent.substring(0, 1000)}"`)

    return extractedContent.trim()

  } catch (error) {
    console.error('❌ Complete PDF parsing failure:', error)
    return `PARSING_ERROR: ${error}`
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

    // Upload file to Supabase storage (optional - continue if fails)
    const fileName = `${Date.now()}_${file.name}`
    const storagePath = `uploads/${user.id}/${fileName}`

    console.log('📤 Uploading file to Supabase storage...')
    try {
      const { data: uploadData, error: uploadError } = await supabase.storage
        .from('documents')
        .upload(storagePath, buffer, {
          contentType: file.type,
          upsert: true // Allow overwrite to avoid conflicts
        })

      if (uploadError) {
        console.log('❌ Storage upload error (continuing anyway):', uploadError)
      } else {
        console.log('✅ File uploaded to storage:', uploadData.path)
      }
    } catch (storageError) {
      console.log('❌ Storage upload failed (continuing anyway):', storageError)
    }

    let analysisResult: string

    try {
      if (file.type.startsWith('image/')) {
        console.log('🖼️ Processing image with AI Vision...')

        const fileBase64 = Buffer.from(arrayBuffer).toString('base64')

        const response = await openai.chat.completions.create({
          model: 'gpt-4o',
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

        // Try text extraction first
        const extractedText = await parsePDF(buffer)
        console.log(`📄 Extracted text: ${extractedText.length} characters`)

        // Check if we got meaningful content
        const meaningfulText = extractedText.replace(/[^\w\s]/g, '').trim()
        
        if (meaningfulText.length > 200) {
          // We have enough readable text, analyze it
          console.log('📄 Analyzing extracted text content...')
          
          const response = await openai.chat.completions.create({
            model: 'gpt-4',
            messages: [
              {
                role: 'system',
                content: DOCUMENT_ANALYSIS_PROMPT
              },
              {
                role: 'user',
                content: `Here's what I extracted from "${file.name}":

${extractedText.slice(0, 7000)}

Analyze this immigration form. Tell me exactly what's filled out, what's missing, and what needs to be fixed.`
              }
            ],
            max_tokens: 1000,
            temperature: 0.3
          })

          analysisResult = response.choices[0].message.content || 'Unable to analyze document'
          console.log('✅ Text-based PDF analysis completed')
          
        } else {
          // PDF is encrypted/protected - ALWAYS use Sarah's AI personality
          console.log('📄 PDF appears encrypted/protected, getting Sarah response...')
          
          const response = await openai.chat.completions.create({
            model: 'gpt-4',
            messages: [
              {
                role: 'system',
                content: DOCUMENT_ANALYSIS_PROMPT
              },
              {
                role: 'user',
                content: `I tried to analyze the PDF "${file.name}" but it's encrypted or protected - I can't extract readable text from it. This is super common with USCIS immigration forms. Give me your direct Saul Goodman-style advice on how to handle this situation. Be short and helpful.`
              }
            ],
            max_tokens: 200,
            temperature: 0.3
          })

          analysisResult = response.choices[0].message.content || "Hey! Your PDF is locked down. No worries - screenshot each page as JPG and upload those instead. Works every time. What form you working on?"
          console.log('✅ Sarah encrypted PDF response completed')
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