import cron from 'node-cron';
import { Expo } from 'expo-server-sdk';
import feePaymentService from '../services/fee-payment.service';
import userService from '../services/user.service';
import memberService from '../services/member.service';

const expo = new Expo();

export const initExpiryAlertJob = () => {
    // Run every day at 8:00 AM server time
    cron.schedule('0 8 * * *', async () => {
        console.log('Running Expiry Alert Cron Job...');
        
        try {
            const today = new Date();
            today.setHours(0, 0, 0, 0);
            
            const next3Days = new Date(today);
            next3Days.setDate(today.getDate() + 3);
            
            // Find all active payments that have a nextPaymentDate in the next 3 days
            // Note: A more precise query in a production scale app would use aggregation to fetch only the LATEST payment per member,
            // but for this phase, we look for any payment expiring in exactly 3 days.
            
            const expiringPayments = await feePaymentService.get({
                nextPaymentDate: {
                    $gte: today,
                    $lte: next3Days
                }
            });

            if(!expiringPayments.length) {
                console.log('No subscriptions expiring soon.');
                return;
            }

            for(const payment of expiringPayments) {
                // Find member
                const member = await memberService.getOne({ _id: payment.memberId });
                if(!member || !member.contact) continue;

                // For a gym, the User is likely mapped to the Member via contactNumber
                const user = await userService.getOne({ contactNumber: member.contact as string });
                
                if (user && user.expoPushToken && Expo.isExpoPushToken(user.expoPushToken)) {
                    const daysRemaining = Math.max(0, Math.ceil((payment.nextPaymentDate!.getTime() - today.getTime()) / (1000 * 3600 * 24)));
                    
                    if(daysRemaining === 3 || daysRemaining === 1 || daysRemaining === 0) {
                        try {
                            const message = daysRemaining === 0 
                                ? `Your membership expires today. Renew now to avoid interruption!` 
                                : `Your gym membership expires in ${daysRemaining} day(s).`;

                            await expo.sendPushNotificationsAsync([{
                                to: user.expoPushToken,
                                sound: 'default',
                                title: 'Subscription Alert',
                                body: message,
                                data: { memberId: member._id, paymentId: payment._id }
                            }]);
                            console.log(`Push notification sent to ${user.name} (${user.contactNumber}) for expiry in ${daysRemaining} days.`);
                        } catch (pushErr) {
                            console.error(`Failed to send push notification to ${user.expoPushToken}`, pushErr);
                        }
                    }
                }
            }
        } catch (error) {
            console.error('Error running Expiry Alert Cron Job:', error);
        }
    });

    console.log('Expiry Alert Job Initialized (Runs at 8:00 AM daily).');
};
