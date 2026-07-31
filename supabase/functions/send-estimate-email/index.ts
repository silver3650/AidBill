import { serve } from "https://deno.land/std@0.168.0/http/server.ts"

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

serve(async (req: Request) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    const { to, subject, textBody, companyName, targetName, attachmentBase64 } = await req.json()

    const res = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${Deno.env.get('RESEND_API_KEY')}`
      },
      body: JSON.stringify({
        from: `"${companyName}" <no-reply@aidbill.kr>`,
        to: [to],
        subject: subject,
        // 사용자가 작성한 줄바꿈을 유지하도록 pre-wrap 적용
        html: `<div style="font-family: sans-serif; white-space: pre-wrap; line-height: 1.6; color: #333;">${textBody}</div>`,
        attachments: [
          {
            filename: `${targetName}_견적서.pdf`,
            content: attachmentBase64 // 프론트엔드에서 만든 PDF 파일 데이터
          }
        ]
      })
    })

    const responseData = await res.json()

    if (!res.ok) {
      throw new Error(responseData.message || `Resend 오류 (코드: ${res.status})`)
    }

    return new Response(JSON.stringify(responseData), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: 200,
    })
  } catch (error: any) {
    return new Response(JSON.stringify({ error: error.message }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: 400,
    })
  }
})