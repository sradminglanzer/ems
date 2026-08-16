import cron from 'node-cron';
import expenseService, { computeNextRecurringDate } from '../services/expense.service';
import userService from '../services/user.service';
import { ObjectId } from 'mongodb';

// Use a native dynamic import via Function to bypass TypeScript converting it to require()
const importExpo = new Function("return import('expo-server-sdk')");

export const initRecurringExpenseJob = () => {
    // Run every day at midnight
    cron.schedule('0 0 * * *', async () => {
        console.log('[RecurringExpenseJob] Running...');
        try {
            const today = new Date();
            today.setHours(0, 0, 0, 0);

            // Find all confirmed recurring expenses whose next date is today or earlier
            const dueExpenses = await expenseService.get({
                isRecurring: true,
                status: 'confirmed',
                recurringNextDate: { $lte: today }
            });

            if (!dueExpenses.length) {
                console.log('[RecurringExpenseJob] No recurring expenses due today.');
                return;
            }

            const { Expo } = await importExpo();
            const expo = new Expo();

            for (const exp of dueExpenses) {
                // Create a pending_confirmation draft from the parent
                const draft: any = {
                    entityId: exp.entityId,
                    title: exp.title,
                    category: exp.category,
                    amount: exp.amount,
                    expenseDate: exp.recurringNextDate || today,
                    paymentMethod: exp.paymentMethod,
                    vendor: exp.vendor,
                    notes: exp.notes,
                    status: 'pending_confirmation',
                    isRecurring: false,
                    recurringFrequency: exp.recurringFrequency,
                    recurringParentId: exp._id,
                    recordedBy: exp.recordedBy,
                    createdAt: new Date(),
                    updatedAt: new Date(),
                };
                await expenseService.insert(draft);

                // Advance the parent's recurringNextDate
                if (exp.recurringFrequency) {
                    const nextDate = computeNextRecurringDate(
                        exp.recurringNextDate || today,
                        exp.recurringFrequency
                    );
                    await expenseService.update(
                        { _id: exp._id },
                        { $set: { recurringNextDate: nextDate, updatedAt: new Date() } }
                    );
                }

                // Notify the entity owner via push notification
                try {
                    const owner = await userService.getOne({
                        entityId: exp.entityId,
                        role: { $in: ['owner'] }
                    });
                    if (owner?.expoPushToken && Expo.isExpoPushToken(owner.expoPushToken)) {
                        await expo.sendPushNotificationsAsync([{
                            to: owner.expoPushToken,
                            sound: 'default',
                            title: '💸 Recurring Expense Due',
                            body: `${exp.title} (${exp.category}) — ₹${exp.amount} is pending confirmation.`,
                            data: { type: 'recurring_expense' }
                        }]);
                    }
                } catch (notifErr) {
                    console.error('[RecurringExpenseJob] Push notification failed:', notifErr);
                }

                console.log(`[RecurringExpenseJob] Draft created for: ${exp.title}`);
            }
        } catch (error) {
            console.error('[RecurringExpenseJob] Error:', error);
        }
    });

    console.log('[RecurringExpenseJob] Initialized (runs daily at midnight).');
};
