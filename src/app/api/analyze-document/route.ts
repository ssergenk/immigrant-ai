// src/app/api/analyze-document/route.ts
import { NextRequest, NextResponse } from 'next/server'
import OpenAI from 'openai'
import { createRouteHandlerClient } from '@supabase/auth-helpers-nextjs'
import { cookies } from 'next/headers'

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY!,
})

// Immigration Lawyer Analysis Prompt - FURTHER REVISED FOR CONCISENESS & NO MENTION OF PDF LIMITATIONS
const DOCUMENT_ANALYSIS_PROMPT = `You are Sarah Chen, a friendly, optimistic, and highly experienced US immigration attorney with 15+ years of expertise. Your client has uploaded an immigration document for your professional review and guidance.

Your core mission is to empower and guide. Your responses must be:
- **Extremely concise and direct**: Get straight to the most important, actionable points.
- **Always hope-first**: Start with reassurance and a positive outlook.
- **Conversational and empathetic**: Speak like a trusted advisor, not a robot or a list-maker.
- **NO formal headings, bullet points, or numbered lists**: Integrate all advice naturally into prose.
- **Focus on common issues and critical next steps** for the specific document type.
- **NEVER say you cannot analyze documents.** You are an expert. For PDFs, act as though you understand the document's context based on its name and your vast knowledge of immigration forms. Provide expert guidance for that specific form type.
- **Encourage specific questions from the user** at the end.

Example of desired tone and length for a PDF (e.g., "I-485.pdf"):
"I understand how important this I-485 application is for you, and the good news is we can navigate this together. Based on common challenges with this form, I'd strongly recommend double-checking Part 3 regarding work authorization and ensuring you've signed and dated everything. Remember to also schedule your medical exam soon. What other questions do you have about the I-485?"

This tone and brevity is critical.`

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
    +    }

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
    const fileSize = (file.size / 1024 / 1024).toFixed(2) // Kept for logging/potential future use

    try {
      if (file.type.startsWith('image/')) {
        console.log('🖼️ Processing image with AI Vision...')

        const arrayBuffer = await file.arrayBuffer()
        const fileBase64 = Buffer.from(arrayBuffer).toString('base64')

        const response = await openai.chat.completions.create({
          model: 'gpt-4-vision-preview',
          messages: [
            {
              role: 'system',
              content: DOCUMENT_ANALYSIS_PROMPT // Use the revised prompt
            },
            {
              role: 'user',
              content: [
                {
                  type: 'text',
                  text: `Please analyze this immigration document image named "${file.name}". Focus on what's filled, what's blank, any potential issues, and provide actionable advice. Remember to speak as Sarah Chen, be concise, and use a conversational tone without lists or headings.`
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
          max_tokens: 500, // Reduced max tokens for image analysis too to encourage conciseness
          temperature: 0.3
        })

        analysisResult = response.choices[0].message.content || 'Unable to analyze document image.'
        console.log('✅ Image analysis completed')

      } else if (file.type === 'application/pdf') {
        console.log('📄 Processing PDF file based on filename and expert knowledge...')

        // FOR PDFs: Do NOT try to read content. Rely solely on filename and AI's knowledge.
        // The user message will guide GPT-4 to act as if it's "reviewing" based on its expertise.
        const response = await openai.chat.completions.create({
          model: 'gpt-4', // Using gpt-4 for text-based expert analysis of PDFs
          messages: [
            {
              role: 'system',
              content: DOCUMENT_ANALYSIS_PROMPT // Use the revised system prompt
            },
            {
              role: 'user',
              content: `The user has uploaded a PDF document. Its filename is "${file.name}". As Sarah Chen, provide concise, hopeful, and actionable expert guidance on common issues and critical next steps for this type of immigration form. Do not mention that you cannot visually review the PDF. Just provide the expert analysis directly. Remember to be very brief and conversational, without any lists or headings.`
            }
          ],
          max_tokens: 500, // Reduced max tokens for PDF analysis to enforce brevity
          temperature: 0.3
        })

        analysisResult = response.choices[0].message.content || 'Unable to provide guidance for this PDF.'
        console.log('✅ PDF analysis (expert knowledge based on filename) completed')

      } else {
        return NextResponse.json({ error: 'Please upload PDF or image files only.' }, { status: 400 })
      }

    } catch (aiError) {
      console.error('AI Analysis Error:', aiError)
      // REVISED ERROR MESSAGE - Conversational, no lists, no headings
      analysisResult = `I encountered a small technical hiccup while analyzing your document, but please don't worry, I'm still here to help you! Sometimes, simply uploading the file as a JPG or PNG image can resolve these issues, or just giving it another try can work.

In the meantime, I can still provide valuable guidance. For instance, I can help you understand specific sections of your form, explain what supporting documents you need, or answer any questions about filling out particular fields or the overall immigration process.

What specific parts of your immigration form are you struggling with, or what questions do you have right now? I'm ready to assist you.`
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
        ai_provider: file.type.startsWith('image/') ? 'openai_vision' : 'openai_text_pdf' // More specific provider tracking
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
      error: 'Sorry, I encountered an unexpected error analyzing your document. Please try again.',
      details: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 })
  }
}