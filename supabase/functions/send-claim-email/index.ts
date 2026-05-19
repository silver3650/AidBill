import { serve } from "https://deno.land/std@0.168.0/http/server.ts"

const RESEND_API_KEY = Deno.env.get("RESEND_API_KEY")

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    const { to, subject, text, attachments, companyName, from } = await req.json()

    if (!to) {
      throw new Error("수신자(to) 이메일 주소가 누락되었습니다.")
    }

    console.log(`[Email Request Received] To: ${to} | Attachments Count: ${attachments?.length || 0}`);

    const validAttachments = (attachments || []).map((file: any) => {
      let pureBase64 = file.content;
      if (pureBase64 && pureBase64.includes(',')) {
        pureBase64 = pureBase64.split(',')[1];
      }
      return {
        filename: file.filename || `청구첨부서류_${new Date().toISOString().split('T')[0]}.pdf`,
        content: pureBase64
      };
    });

    const senderEmail = from && from.endsWith('@aidbill.kr') ? from : 'no-reply@aidbill.kr';

    // 💡 1. 기본값을 '운영팀'에서 회사명으로 변경
    const senderTitle = companyName || '교부업체';

    const res = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${RESEND_API_KEY}`,
      },
      body: JSON.stringify({
        // 💡 2. 상호명 양 옆에 쌍따옴표(\") 추가 (특수문자/괄호 누락 방지용)
        from: `"${senderTitle}" <${senderEmail}>`, 
        to: [to],
        subject: subject,
        html: text.replace(/\n/g, '<br>'), 
        attachments: validAttachments     
      }),
    })

    const responseData = await res.json()

    if (!res.ok) {
      console.error("[Resend API Transaction Rejected Error]:", responseData);
      throw new Error(responseData.message || `Resend 이메일 첨부 엔진 전송 오류 (응답 코드: ${res.status})`);
    }

    return new Response(JSON.stringify(responseData), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: 200,
    })
  } catch (error) {
    console.error("[Edge Function Execution Exception Block]:", error.message);
    return new Response(JSON.stringify({ error: error.message }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: 400,
    })
  }
})