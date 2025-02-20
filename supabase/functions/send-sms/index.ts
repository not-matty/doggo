/// <reference types="https://deno.land/x/types/index.d.ts" />

import { serve } from "https://deno.land/std@0.177.0/http/server.ts";
import { Twilio } from "https://esm.sh/twilio@4.7.1";

const corsHeaders = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface RequestBody {
    phone: string;
    message: string;
}

serve(async (req: Request) => {
    // Handle CORS preflight requests
    if (req.method === 'OPTIONS') {
        return new Response('ok', { headers: corsHeaders });
    }

    try {
        // Validate request body
        const body = await req.json();
        console.log('Received request body:', { ...body, message: body.message?.length + ' chars' });

        const { phone, message } = body as RequestBody;

        if (!phone || !message) {
            console.error('Missing required fields:', { phone: !!phone, message: !!message });
            throw new Error('Phone number and message are required');
        }

        // Validate environment variables
        const accountSid = Deno.env.get('TWILIO_ACCOUNT_SID');
        const authToken = Deno.env.get('TWILIO_AUTH_TOKEN');
        const twilioPhone = Deno.env.get('TWILIO_PHONE_NUMBER');

        // Log configuration (be careful not to log auth token)
        console.log('Twilio Configuration:', {
            accountSid: accountSid ? 'present' : 'missing',
            authToken: authToken ? 'present' : 'missing',
            twilioPhone,
            toPhone: phone,
            messageLength: message.length
        });

        if (!accountSid || !authToken || !twilioPhone) {
            const missing = [];
            if (!accountSid) missing.push('TWILIO_ACCOUNT_SID');
            if (!authToken) missing.push('TWILIO_AUTH_TOKEN');
            if (!twilioPhone) missing.push('TWILIO_PHONE_NUMBER');
            console.error('Missing Twilio credentials:', missing.join(', '));
            throw new Error(`Server configuration error: Missing ${missing.join(', ')}`);
        }

        // Ensure phone numbers are in E.164 format
        const formattedFromPhone = twilioPhone.startsWith('+') ? twilioPhone : `+${twilioPhone}`;
        const formattedToPhone = phone.startsWith('+') ? phone : `+${phone}`;

        console.log('Formatted phone numbers:', {
            from: formattedFromPhone,
            to: formattedToPhone
        });

        // Initialize Twilio client
        const twilioClient = new Twilio(accountSid, authToken);

        try {
            console.log('Attempting to send SMS...');

            const twilioMessage = await twilioClient.messages.create({
                body: message,
                from: formattedFromPhone,
                to: formattedToPhone,
            });

            console.log('SMS sent successfully:', {
                sid: twilioMessage.sid,
                status: twilioMessage.status,
                direction: twilioMessage.direction
            });

            return new Response(
                JSON.stringify({ success: true, messageId: twilioMessage.sid }),
                {
                    headers: { ...corsHeaders, 'Content-Type': 'application/json' },
                    status: 200,
                }
            );
        } catch (twilioError: any) {
            console.error('Twilio API error:', {
                code: twilioError.code,
                status: twilioError.status,
                moreInfo: twilioError.moreInfo,
                details: twilioError.message
            });

            return new Response(
                JSON.stringify({
                    error: 'Failed to send SMS',
                    details: twilioError.message || 'Unknown error',
                    code: twilioError.code,
                    status: twilioError.status,
                    moreInfo: twilioError.moreInfo
                }),
                {
                    headers: { ...corsHeaders, 'Content-Type': 'application/json' },
                    status: 500,
                }
            );
        }
    } catch (error: any) {
        console.error('Error in send-sms function:', {
            message: error.message,
            stack: error.stack
        });

        return new Response(
            JSON.stringify({
                error: 'Invalid request',
                details: error.message || 'Unknown error'
            }),
            {
                headers: { ...corsHeaders, 'Content-Type': 'application/json' },
                status: 400,
            }
        );
    }
}); 