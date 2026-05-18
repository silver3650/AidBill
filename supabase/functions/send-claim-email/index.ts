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
    const { to, subject, text, attachments, companyName } = await req.json()

    if (!to) {
      throw new Error("수신자(to) 이메일 주소가 누락되었습니다.")
    }

    // 💡 [핵심 교정 및 방어 코드] 
    // 프론트엔드에서 넘어온 attachments 배열 내의 Base64 데이터 형식을 
    // Resend 정식 파일 첨부 프로토콜(filename + content) 구조로 정밀 가공합니다.
    const validAttachments = (attachments || []).map((file: any) => {
      let pureBase64 = file.content;
      
      // 만약 데이터에 "data:application/pdf;base64," 접두사가 붙어 넘어온 경우 순수 바이너리만 절삭
      if (pureBase64 && pureBase64.includes(',')) {
        pureBase64 = pureBase64.split(',')[1];
      }

      return {
        filename: file.filename || `청구첨부서류_${new Date().toISOString().split('T')[0]}.pdf`,
        content: pureBase64
      };
    });

    // Resend 정식 파일 첨부 스펙 전송
    const res = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${RESEND_API_KEY}`,
      },
      body: JSON.stringify({
        from: `${companyName || '보조기기 청구'} <onboarding@resend.dev>`, 
        to: [to],
        subject: subject,
        html: text.replace(/\n/g, '<br>'), // 가독성 높은 메일 본문 처리
        attachments: validAttachments     // 📎 파일명과 순수 Base64가 결속된 배열 주입
      }),
    })

    const responseData = await res.json()

    if (!res.ok) {
      throw new Error(responseData.message || "Resend 이메일 첨부 엔진 전송 오류");
    }

    return new Response(JSON.stringify(responseData), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: 200,
    })
  } catch (error) {
    return new Response(JSON.stringify({ error: error.message }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: 400,
    })
  }
})