import cron from 'node-cron';
import feeGroupService from '../services/fee-group.service';
import diaryService from '../services/diary.service';
import entityService from '../services/entity.service';

export const initDiaryReminderJob = () => {
    // Run at 5:30 PM (17:30) Monday through Saturday
    cron.schedule('30 17 * * 1-6', async () => {
        console.log('[DiaryReminderJob] Running 5:30 PM Class Diary check...');

        try {
            const today = new Date();
            const startOfDay = new Date(today);
            startOfDay.setHours(0, 0, 0, 0);
            const endOfDay = new Date(today);
            endOfDay.setHours(23, 59, 59, 999);

            const entities = await entityService.get({});

            for (const entity of entities) {
                const entityId = entity._id;
                if (!entityId) continue;

                // Get all classes in entity
                const classes = await feeGroupService.get({ entityId });
                const unpublishedClasses: string[] = [];

                for (const cls of classes) {
                    const classId = cls._id;
                    if (!classId) continue;

                    // Check if there are diary entries for today
                    const todayEntries = await diaryService.get({
                        entityId,
                        classId,
                        createdAt: { $gte: startOfDay, $lte: endOfDay }
                    });

                    // Check if published
                    const hasPublished = todayEntries.some((e: any) => e.isPublished === true);
                    if (todayEntries.length > 0 && !hasPublished) {
                        unpublishedClasses.push(cls.name);
                    }
                }

                if (unpublishedClasses.length > 0) {
                    console.warn(`[DiaryReminderJob] ⚠️ Entity "${entity.name || entityId}": Diary entries created but not sent for: ${unpublishedClasses.join(', ')}`);
                }
            }
        } catch (error) {
            console.error('[DiaryReminderJob] Error checking daily diary status:', error);
        }
    });

    console.log('Diary Reminder Job Initialized (Runs at 5:30 PM Mon-Sat).');
};
