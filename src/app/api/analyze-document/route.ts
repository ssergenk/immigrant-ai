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

// Enhanced PDF parsing function with multiple extraction methods
async function parsePDF(buffer: Buffer): Promise<string> {
  console.log('🔍 Starting enhanced PDF parsing...')
  
  try {
    // Method 1: Try pdf-parse with enhanced options
    console.log('📄 Method 1: pdf-parse with enhanced options')
    const pdfParse = (await import('pdf-parse')).default

    const pdfData = await pdfParse(buffer, {
      normalizeWhitespace: true,
      disableCombineTextItems: false,
      useWorker: false,
      verbosityLevel: 0
    })

    console.log(`Method 1 result: ${pdfData.numpages} pages, ${pdfData.text.length} chars`)
    
    if (pdfData.text.trim().length > 50) {
      return pdfData.text
    }

    // Method 2: Try pdf2pic + tesseract for form field extraction
    console.log('📄 Method 2: Direct buffer analysis')
    
    // Try to extract form field data using pdf-lib
    try {
      const { PDFDocument } = await import('pdf-lib')
      const pdfDoc = await PDFDocument.load(buffer)
      const form = pdfDoc.getForm()
      
      let formData = ''
      
      try {
        const fields = form.getFields()
        console.log(`Found ${fields.length} form fields`)
        
        fields.forEach((field, index) => {
          const fieldName = field.getName()
          let fieldValue = ''
          
          try {
            // Try different field types
            if ('getText' in field) {
              fieldValue = (field as any).getText() || ''
            } else if ('isChecked' in field) {
              fieldValue = (field as any).isChecked() ? 'Yes' : 'No'
            } else if ('getSelected' in field) {
              const selected = (field as any).getSelected()
              fieldValue = Array.isArray(selected) ? selected.join(', ') : selected || ''
            }
            
            if (fieldName && (fieldValue || fieldValue === 'No')) {
              formData += `${fieldName}: ${fieldValue}\n`
            }
          } catch (fieldError) {
            console.log(`Field ${index} (${fieldName}) extraction error:`, fieldError)
          }
        })
        
        if (formData.trim()) {
          console.log(`✅ Extracted form data: ${formData.length} characters`)
          return `FORM FIELDS EXTRACTED:\n\n${formData}\n\nRAW TEXT:\n${pdfData.text}`
        }
      } catch (formError) {
        console.log('Form field extraction failed:', formError)
      }
    } catch (pdfLibError) {
      console.log('pdf-lib loading failed:', pdfLibError)
    }

    // Method 3: Try pdfjs-dist for better text extraction
    console.log('📄 Method 3: pdfjs-dist extraction')
    try {
      const pdfjsLib = await import('pdfjs-dist')
      
      // Set worker path
      pdfjsLib.GlobalWorkerOptions.workerSrc = `//cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/pdf.worker.min.js`
      
      const pdfDoc = await pdfjsLib.getDocument({ data: buffer }).promise
      let fullText = ''
      
      for (let pageNum = 1; pageNum <= pdfDoc.numPages; pageNum++) {
        const page = await pdfDoc.getPage(pageNum)
        const textContent = await page.getTextContent()
        
        const pageText = textContent.items
          .filter((item: any) => item.str && item.str.trim())
          .map((item: any) => item.str)
          .join(' ')
        
        if (pageText.trim()) {
          fullText += `\n--- Page ${pageNum} ---\n${pageText}`
        }
      }
      
      console.log(`Method 3 result: ${fullText.length} characters`)
      
      if (fullText.trim().length > 50) {
        return fullText
      }
    } catch (pdfjsError) {
      console.log('pdfjs-dist extraction failed:', pdfjsError)
    }

    // Method 4: Raw buffer analysis for embedded text
    console.log('📄 Method 4: Raw buffer text extraction')
    try {
      const bufferText = buffer.toString('utf8')
      
      // Look for common PDF text patterns
      const textPatterns = [
        /\/T\s*\((.*?)\)/g,  // Text field values
        /\/V\s*\((.*?)\)/g,  // Field values
        /\/DA\s*\((.*?)\)/g, // Default appearance
        /BT\s+(.*?)\s+ET/g,  // Text objects
        /Tj\s*\[(.*?)\]/g,   // Text showing
        /\((.*?)\)\s*Tj/g    // Simple text showing
      ]
      
      let extractedText = ''
      
      textPatterns.forEach(pattern => {
        let match
        while ((match = pattern.exec(bufferText)) !== null) {
          const text = match[1]?.trim()
          if (text && text.length > 2 && !text.includes('\x00')) {
            extractedText += text + ' '
          }
        }
      })
      
      // Also try to find readable ASCII text chunks
      const asciiMatches = bufferText.match(/[\x20-\x7E]{10,}/g)
      if (asciiMatches) {
        asciiMatches.forEach(match => {
          const cleanMatch = match.trim()
          if (cleanMatch.length > 5 && !cleanMatch.includes('obj') && !cleanMatch.includes('stream')) {
            extractedText += cleanMatch + ' '
          }
        })
      }
      
      console.log(`Method 4 result: ${extractedText.length} characters`)
      
      if (extractedText.trim().length > 50) {
        return extractedText.trim()
      }
    } catch (rawError) {
      console.log('Raw buffer extraction failed:', rawError)
    }

    // Method 5: Last resort - try to extract any readable content
    console.log('📄 Method 5: Last resort extraction')
    try {
      const textContent = buffer.toString('binary')
      const matches = textContent.match(/[a-zA-Z0-9\s\.\,\!\?\;\:\'\"\-\(\)]{15,}/g)
      if (matches && matches.length > 0) {
        const combinedText = matches.join(' ').slice(0, 10000)
        console.log(`Method 5 result: ${combinedText.length} characters`)
        
        if (combinedText.trim().length > 30) {
          return combinedText
        }
      }
    } catch (lastResortError) {
      console.log('Last resort extraction failed:', lastResortError)
    }

    console.log('❌ All extraction methods failed')
    return ''

  } catch (error) {
    console.error('❌ Complete PDF parsing failure:', error)
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
        console.log('📄 Processing PDF file with enhanced parser...')

        try {
          console.log('🔍 Starting enhanced PDF parsing...')
          const rawPdfText = await parsePDF(buffer)

          console.log(`📄 Enhanced parser result: ${rawPdfText.length} characters`)

          // Clean and limit text for token management
          const cleanText = rawPdfText.trim().replace(/\s+/g, ' ')
          const limitedText = cleanText.slice(0, 7000) // ~90% of 8K tokens for GPT-4

          console.log(`📄 Final text for AI: ${limitedText.length} characters`)
          console.log(`📄 Preview: ${limitedText.substring(0, 200)}...`)

          if (limitedText.trim().length < 30) {
            analysisResult = `**📋 PDF Analysis Challenge**

I processed your PDF "${file.name}" using multiple extraction methods, but I'm getting very limited readable content (${limitedText.length} characters extracted).

**🔍 What I Tried:**
- Standard PDF text extraction
- Form field value reading
- Advanced PDF.js parsing
- Raw content analysis
- Pattern-based text extraction

**💡 Let's Troubleshoot:**

**Option 1: Tell Me About Your Form**
- What type of immigration form is this? (I-130, I-485, etc.)
- What sections are you having trouble with?
- Any specific questions about completion?

**Option 2: Try Image Upload**
- Convert PDF pages to JPG/PNG images
- Upload each page as an image
- I can analyze images with 100% accuracy

**Option 3: Form Details**
- Is this a USCIS fillable PDF from their website?
- Did you fill it out using Adobe Reader or another PDF editor?
- Are there any password protections on the file?

**💬 What Would Work Best?**
I'm here to help you succeed with your immigration case - let's find the best way to analyze your document!`

          } else {
            // Analyze the extracted PDF content with AI
            const response = await openai.chat.completions.create({
              model: 'gpt-4',
              messages: [
                {
                  role: 'system',
                  content: DOCUMENT_ANALYSIS_PROMPT
                },
                {
                  role: 'user',
                  content: `Here's the extracted content from the uploaded PDF "${file.name}" using enhanced parsing methods:

${limitedText}

Please analyze this as Sarah Chen, immigration attorney. Based on the ACTUAL content above, identify what form this is, what sections are completed, what's missing, and give specific actionable advice based on what you can see in the document content.`
                }
              ],
              max_tokens: 1500,
              temperature: 0.3
            })

            analysisResult = response.choices[0].message.content || 'Unable to analyze extracted content'
            console.log('✅ Enhanced PDF analysis completed successfully')
          }

        } catch (pdfError) {
          console.error('📄 Enhanced PDF parsing error:', pdfError)

          analysisResult = `**📋 PDF Processing Error**

I encountered a technical issue parsing your PDF file "${file.name}" even with my enhanced extraction methods.

**💡 Best Solutions:**

**🖼️ Upload as Images (Most Reliable)**
1. Open your PDF file
2. Take screenshots of each page or "Save as Image"
3. Upload each page as JPG/PNG files
4. I'll analyze with perfect visual accuracy

**💬 Quick Help Right Now**
Tell me:
- What immigration form are you working with?
- Which sections are giving you trouble?
- What specific questions do you have?

I can provide expert immigration guidance even without the file analysis!

**🔍 Technical Note**
This can happen with certain PDF formats, security settings, or complex form structures. Images bypass all these issues completely.`
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