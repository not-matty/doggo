import { Twilio } from 'twilio';

// Initialize Twilio client
const twilioClient = new Twilio(
    process.env.TWILIO_ACCOUNT_SID as string,
    process.env.TWILIO_AUTH_TOKEN as string
);

const TWILIO_PHONE_NUMBER = process.env.TWILIO_PHONE_NUMBER as string;

export const sendInviteSMS = async (
    toPhoneNumber: string,
    fromUserName: string
): Promise<boolean> => {
    try {
        const message = await twilioClient.messages.create({
            body: `${fromUserName} liked your profile on doggo! Download the app to connect: https://doggo.app/download`,
            from: TWILIO_PHONE_NUMBER,
            to: toPhoneNumber,
        });

        return !!message.sid;
    } catch (error) {
        console.error('Error sending SMS:', error);
        return false;
    }
}; 