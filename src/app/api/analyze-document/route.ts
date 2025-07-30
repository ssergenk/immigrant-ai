// src/app/api/analyze-document/route.ts
import { NextRequest, NextResponse } from 'next/server'
import OpenAI from 'openai'
import { createRouteHandlerClient } from '@supabase/auth-helpers-nextjs'
import { cookies } from 'next/headers'
import path from 'path' // For path manipulation
import fs from 'fs/promises' // For file system operations
import { Pdf2pic } from 'pdf2pic' // Corrected import: Import Pdf2pic class

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY!,
})

// Immigration Lawyer Analysis Prompt - REFINED FOR MULTI-PAGE DOCUMENT ANALYSIS
const DOCUMENT_ANALYSIS_PROMPT = `You are Sarah Chen, a friendly, optimistic, and highly experienced US immigration attorney with 15+ years of expertise. Your client has uploaded an immigration document for your professional review and guidance.

You have received the entire document, potentially as multiple images representing its pages. Your core mission is to empower and guide the client based on your thorough review.

Your responses must be:
- **Extremely concise and direct**: Get straight to the most important, actionable points.
- **Always hope-first**: Start with reassurance and a positive outlook.
- **Conversational and empathetic**: Speak like a trusted advisor, not a robot or a list-maker.
- **NO formal headings, bullet points, or numbered lists**: Integrate all advice naturally into prose.
- **Focus on common issues, missing information, and critical next steps** for the specific document you have analyzed. Point out specific sections or fields if possible.
- **NEVER say you cannot analyze documents.** You have thoroughly reviewed the provided pages.
- **Encourage specific questions from the user** at the end.

Example of desired tone and directness:
"I've reviewed your I-485 application pages, and the good news is we can navigate this together. I'd strongly recommend double-checking Part 3 regarding work authorization, and it looks like the signature and date are missing on the last page. Remember to also schedule your medical exam soon. What other questions do you have about the I-485?"

This tone and brevity is critical. Provide analysis based on the entire document, not just general advice from the filename.
`

export async function POST(request: NextRequest) {
  console.log('🔍 Document analysis API called')

  // Define a temporary directory for storing PDF pages as images
  const tempDir = path.join('/tmp', `pdf-temp-${Date.now()}`)

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
    const fileName = file.name.toLowerCase() // Keep these for potential future use or debugging
    const fileSize = (file.size / 1024 / 1024).toFixed(2) // Keep these for potential future use or debugging

    // Array to hold message content for Vision API (text + image_urls)
    const visionMessagesContent: OpenAI.Chat.Completions.ChatCompletionContentPart[] = [
      {
        type: 'text',
        text: `The user has uploaded an immigration document named "${file.name}". Please act as Sarah Chen, analyze the document carefully, and provide concise, hopeful, and actionable expert guidance on common issues, missing information, and critical next steps. If this is a PDF, you are seeing all its pages. Do not use any lists or headings.`
      }
    ];

    try {
      if (file.type.startsWith('image/')) {
        console.log('🖼️ Processing single image with AI Vision...')

        const arrayBuffer = await file.arrayBuffer()
        const fileBase64 = Buffer.from(arrayBuffer).toString('base64')

        visionMessagesContent.push({
          type: 'image_url',
          image_url: {
            url: `data:${file.type};base64,${fileBase64}`,
            detail: 'high'
          }
        });

      } else if (file.type === 'application/pdf') {
        console.log('📄 Processing PDF file by converting to images for AI Vision using pdf2pic...')

        // Ensure temporary directory exists
        await fs.mkdir(tempDir, { recursive: true })
        console.log(`Created temporary directory: ${tempDir}`)

        const pdfBuffer = Buffer.from(await file.arrayBuffer())
        const pdfPath = path.join(tempDir, file.name)
        await fs.writeFile(pdfPath, pdfBuffer)
        console.log(`Saved PDF to temporary path: ${pdfPath}`)

        const options = {
          density: 150,           // Image quality
          saveFilename: path.basename(file.name, path.extname(file.name)),
          savePath: tempDir,
          format: "jpeg",         // Output format
          width: 1200,            // Output width
          height: 1600            // Output height (adjust as needed, keeping aspect ratio for best results)
        };

        const converter = new Pdf2pic(options); // Instantiate the Pdf2pic class

        // Convert PDF to base64 images
        const convertedImages = [];
        const numberOfPages = await converter.get<ctrl62>
        for (let i = 1; i <= numberOfPages; i++) {
            const base64 = await converter.convertPage(i, { base64: true }); // Get base64 for each page
            convertedImages.push(base64);
        }
        
        console.log(`PDF converted to images. Number of pages converted: ${convertedImages.length}`);

        // Add each generated image to visionMessagesContent
        for (const pageData of convertedImages) {
            if (pageData.base64) {
                visionMessagesContent.push({
                    type: 'image_url',
                    image_url: {
                        url: `data:image/jpeg;base64,${pageData.base64}`,
                        detail: 'high'
                    }
                });
                console.log(`Added image for page to Vision API content.`)
            }
        }

        if (visionMessagesContent.length === 1) { // Only the initial text message, no images added
             throw new Error("No images were generated from the PDF. Ensure PDF is valid and GraphicsMagick/ImageMagick are configured if needed.");
        }

      } else {
        return NextResponse.json({ error: 'Please upload PDF or image files only.' }, { status: 400 })
      }

      // Send the content (text + image_urls) to OpenAI Vision API
      const response = await openai.chat.completions.create({
        model: 'gpt-4-vision-preview', // This model handles both text and images
        messages: [
          {
            role: 'system',
            content: DOCUMENT_ANALYSIS_PROMPT // Use the detailed system prompt
          },
          {
            role: 'user',
            content: visionMessagesContent // This now contains text and all image URLs (pages)
          }
        ],
        max_tokens: 1500, // Increased max tokens as analysis will be more detailed
        temperature: 0.3
      })

      analysisResult = response.choices[0].message.content || 'Unable to analyze document.'
      console.log('✅ Document analysis completed (Vision API used for all pages/images)')

    } catch (aiError) {
      console.error('AI Analysis Error:', aiError)
      analysisResult = `I encountered a small technical hiccup while analyzing your document, but please don't worry, I'm still here to help you! It seems there was an issue processing the file, but sometimes, trying again or uploading the pages as separate JPG or PNG images can work.

In the meantime, I can still provide valuable guidance. For instance, I can help you understand specific sections of your form, explain what supporting documents you need, or answer any questions about filling out particular fields or the overall immigration process.

What specific parts of your immigration form are you struggling with, or what questions do you have right now? I'm ready to assist you.`
    } finally {
      // Clean up temporary directory and files
      try {
        if (await fs.stat(tempDir).then(stats => stats.isDirectory()).catch(() => false)) {
          await fs.rm(tempDir, { recursive: true, force: true })
          console.log(`Cleaned up temporary directory: ${tempDir}`)
        }
      } catch (cleanupError) {
        console.error('Error cleaning up temporary directory:', cleanupError)
      }
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

      // Insert AI message into chat
      await supabase.from('messages').insert({
        chat_session_id: chatSessionId,
        user_id: user.id,
        content: analysisResult,
        role: 'assistant',
        ai_provider: 'openai_vision_pdf_image' // Indicates Vision was used for PDF/Image
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
    // Ensure cleanup even if initial try block fails
    try {
        if (await fs.stat(tempDir).then(stats => stats.isDirectory()).catch(() => false)) {
          await fs.rm(tempDir, { recursive: true, force: true })
          console.log(`Cleaned up temporary directory due to initial error: ${tempDir}`)
        }
      } catch (cleanupError) {
        console.error('Error cleaning up temporary directory after initial error:', cleanupError)
      }
    return NextResponse.json({
      error: 'Sorry, I encountered an unexpected error analyzing your document. Please try again.',
      details: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 })
  }
}