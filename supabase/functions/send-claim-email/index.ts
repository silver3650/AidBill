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

    // 서버로 유입된 이메일 페이로드 메타 정보 로깅 (모니터링 용도)
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

    // 💡 도메인 검증 연동: aidbill.kr 등 소유 도메인을 Resend에 최종 인증 완료 시 
    // 프론트엔드에서 연동된 발송 주소(from)가 완전 매핑됩니다. 인증이 미완료된 테스트 상황인 경우 
    // 안정적으로 샌드박스 메일링이 갈 수 있도록 'onboarding@resend.dev' 계층 처리합니다.
    const senderEmail = from && from.endsWith('@aidbill.kr') ? from : 'no-reply@aidbill.kr';

    const res = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${RESEND_API_KEY}`,
      },
      body: JSON.stringify({
        from: `${companyName || '보조기기 청구'} <${senderEmail}>`, 
        to: [to],
        subject: subject,
        html: text.replace(/\n/g, '<br>'), 
        attachments: validAttachments     
      }),
    })

    const responseData = await res.json()

    if (!res.ok) {
      // 💡 핵심 교정 포인트: 외부 관공서 수신 거부 및 도메인 소유권 예외 시 
      // Resend 엔진이 응답한 세부 오류 정보 배열을 펑션 콘솔로그에 명시적으로 출력해 냅니다.
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