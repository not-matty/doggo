import { serve } from 'https://deno.land/std@0.177.0/http/server.ts';
import { Twilio } from 'https://esm.sh/twilio@4.7.1';

const corsHeaders = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
    // Handle CORS preflight requests
    if (req.method === 'OPTIONS') {
        return new Response('ok', { headers: corsHeaders });
    }

    try {
        const { phone, fromUserName } = await req.json();

        // Initialize Twilio client
        const twilioClient = new Twilio(
            Deno.env.get('TWILIO_ACCOUNT_SID') || '',
            Deno.env.get('TWILIO_AUTH_TOKEN') || ''
        );

        const message = await twilioClient.messages.create({
            body: `${fromUserName} liked your profile on doggo! Download the app to connect: https://doggo.app/download`,
            from: Deno.env.get('TWILIO_PHONE_NUMBER') || '',
            to: phone,
        });

        return new Response(
            JSON.stringify({ success: true, messageId: message.sid }),
            {
                headers: { ...corsHeaders, 'Content-Type': 'application/json' },
                status: 200,
            }
        );
    } catch (error) {
        console.error('Error sending SMS:', error);
        return new Response(
            JSON.stringify({ error: error.message }),
            {
                headers: { ...corsHeaders, 'Content-Type': 'application/json' },
                status: 400,
            }
        );
    }
}); 