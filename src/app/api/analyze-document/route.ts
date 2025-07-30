// src/app/api/analyze-document/route.ts
import { NextRequest, NextResponse } from 'next/server'
import OpenAI from 'openai'
import { createRouteHandlerClient } from '@supabase/auth-helpers-nextjs'
import { cookies } from 'next/headers'

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY!,
})

// Immigration Lawyer Analysis Prompt - REVISED FOR SARAH CHEN PERSONA AND DOCUMENT HANDLING
const DOCUMENT_ANALYSIS_PROMPT = `You are Sarah Chen, a friendly and experienced immigration attorney with 15+ years of expertise in US immigration law. Your client has uploaded an immigration document for your professional review and guidance.

Your primary goal is to provide hopeful, clear, and actionable advice in a compassionate, conversational tone.

For **image documents** (JPG, PNG): You will visually analyze the document. Identify the form type, completeness, specific issues like missing fields or signatures, and provide precise next steps.

For **PDF documents**: You cannot visually "read" the content of a PDF directly as images, but you are still an expert! You will offer highly relevant and comprehensive guidance based on the document's file name (to infer the form type) and your extensive knowledge of common issues and best practices for that specific immigration form. Always preface your advice for PDFs by acknowledging this.

Your response should always be:
- **Conversational and empathetic**, like a real conversation with an attorney.
- **Hope-first**: Start with reassurance before discussing potential issues.
- **Direct and actionable**: Tell them what they need to do clearly.
- **NO formal headings (e.g., "Quick Summary", "Issues Found")**. Use natural conversational flow.
- **NO bullet points or numbered lists**. Integrate advice into prose.
- **NEVER say you cannot analyze documents.** Your job is to provide guidance, whether through visual analysis of images or expert knowledge for PDFs.
- **Encourage questions** at the end.

Example of tone and structure:
"I understand how worried you might feel about this form, but the good news is we can definitely get through it together. Looking at what you've sent, here's what typically stands out for this type of document..."
`

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
    const fileSize = (file.size / 1024 / 1024).toFixed(2)

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
                  text: `Please analyze this immigration document image named "${file.name}". Focus on what's filled, what's blank, any potential issues, and provide actionable advice. Remember to speak as Sarah Chen.`
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
        console.log('📄 Processing PDF file by filename and expert knowledge...')

        let formAnalysisContext = ''

        // REVISED PDF CONTEXTS - Conversational, no lists, no headings
        if (fileName.includes('i-485') || fileName.includes('485')) {
          formAnalysisContext = `You've uploaded a PDF that appears to be Form I-485, the Application to Adjust Status. This is your green card application and it's absolutely crucial to get it right. While I can't visually review the contents of this PDF directly, I can certainly share my expertise on common areas where clients face challenges with the I-485 and guide you on what to double-check.

It's common for people to fill out personal information sections accurately. However, pay close attention to Part 3 where you indicate if you want work authorization and travel documents. Many clients overlook or misunderstand this. Also, ensure you've addressed Part 14 thoroughly, as questions about previous immigration violations require complete and honest answers. A missing signature and date at the end of the form is also a frequent oversight.

For your next steps, make sure you decide about work authorization in Part 3 and sign the form with the current date. You'll also need to get a medical exam with a USCIS civil surgeon, which takes time to arrange. As for supporting documents, remember to include your Form I-693 (Medical Examination) in a sealed envelope, two passport-style photos, a copy of your birth certificate with an English translation, and if this is a family-based case, Form I-864 Affidavit of Support. The filing fee is currently around $1,440, which includes biometrics. Also, remember not to travel outside the U.S. without advance parole once you've filed.

To help me give you more specific guidance, could you tell me if you are applying based on marriage to a U.S. citizen, employment, or another category? This will help me tailor my advice further.`

        } else if (fileName.includes('i-130') || fileName.includes('130')) {
          formAnalysisContext = `It looks like you've uploaded an I-130, the Immigrant Petition for Alien Relative. This form is the essential first step to bringing a family member to the United States, and getting it right is key. While I can't directly view the content of your PDF, I can provide you with crucial insights and common pitfalls to avoid for this form.

Many clients do a good job of starting the form, but areas like matching names exactly to official documents are critical for both your (the petitioner's) information and your family member's (the beneficiary's) information. Be very precise with all dates, such as marriage dates or birth dates. A common issue I see is errors in the signature and date section (Part 5). Also, remember that robust supporting evidence is absolutely necessary to prove your relationship.

For your immediate next steps, please verify that all names match official documents perfectly – no nicknames or abbreviations. Gather all your relationship proof, such as marriage certificates or birth certificates. Any documents not in English will need certified translations. The current filing fee is around $535. Once you're ready, sign the form with today's date and make sure to send it via certified mail with a return receipt for tracking.

To help me give you even more tailored advice, could you tell me who you are petitioning for – is it your spouse, parent, child, or sibling? Understanding the relationship type will help me guide you on the next steps more effectively.`

        } else {
          // General PDF advice for unknown forms
          formAnalysisContext = `You've uploaded an immigration document in PDF format. As your virtual immigration lawyer, I want to clarify that while I can't visually examine the content of PDFs directly, I can still provide incredibly valuable insights based on the document's type (inferred from the filename) and general best practices for all USCIS forms. Getting a professional review like this before submission is a smart move.

Generally, with any USCIS form, common issues include missing signatures and dates, leaving required fields blank (always write "N/A" if a field isn't applicable), and inconsistent information where names or dates don't match across all your documents. You'll also need to ensure you have all the specific supporting evidence required for your particular form.

For your next steps, please meticulously review every section for completeness. Gather all supporting documents specific to your form's purpose. It's always a good idea to check the current filing fees on the USCIS website as they can change. Remember to make photocopies of everything before mailing and consider using certified mail for submission.

I'm here to help clarify any specific sections or requirements you're unsure about. What particular questions do you have about this form, or which parts are you finding most challenging?`
        }

        const response = await openai.chat.completions.create({
          model: 'gpt-4', // Using gpt-4 for text-based analysis of PDFs
          messages: [
            {
              role: 'system',
              content: DOCUMENT_ANALYSIS_PROMPT // Use the revised prompt
            },
            {
              role: 'user',
              content: `The user has uploaded a PDF document named "${file.name}". Based on my expertise and typical issues with this type of form, I have prepared the following context:
"${formAnalysisContext}"
Please use this context and your persona as Sarah Chen to provide a friendly, hopeful, and actionable analysis to the user. Do not use headings, bullet points, or numbered lists. Integrate all advice conversationally.`
            }
          ],
          max_tokens: 1500,
          temperature: 0.3
        })

        analysisResult = response.choices[0].message.content || formAnalysisContext // Fallback to context if AI fails
        console.log('✅ PDF analysis (text-based on filename) completed')

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