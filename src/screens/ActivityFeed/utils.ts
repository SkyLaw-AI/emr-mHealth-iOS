import { DateTime } from 'luxon';

import { ActivitySampleCategory, ActivitySummary, Steps, Workout } from 'models/activity';
import { formatDuration } from 'utils/datetime/duration';

export interface Activity {
    date: DateTime;
    sample: Workout | Steps;
    duration: string;
    count?: number;
}

export function makeActivitiesCalendar(samples: readonly Activity['sample'][]): Map<string, Activity[]> {
    return samples.reduce<Map<string, Activity[]>>((activitiesCalendar, sample) => {
        const startDate = DateTime.fromISO(sample.startDate);
        const endDate = DateTime.fromISO(sample.endDate);
        const duration = endDate.diff(startDate, ['hours', 'minutes']);
        const effectiveDateTime = startDate.toFormat('ccc d LLL');

        let sameDateActivities = activitiesCalendar.get(effectiveDateTime) ?? [];
        sameDateActivities.push({
            date: startDate,
            sample: sample,
            duration: formatDuration(duration),
            count:
                sample.category === ActivitySampleCategory.Steps
                    ? sample.count
                    : endDate.diff(startDate, ['minutes']).minutes,
        });
        activitiesCalendar.set(effectiveDateTime, sameDateActivities);
        return activitiesCalendar;
    }, new Map());
}

export function describeAcitivitySummary(summary?: ActivitySummary) {
    const { activeEnergyBurnedGoal, exerciseTimeGoal } = summary ?? {};

    const energyBurnedGoal = activeEnergyBurnedGoal !== undefined ? Math.round(activeEnergyBurnedGoal) : 'N/A';
    const exerciseGoal = exerciseTimeGoal !== undefined ? Math.round(exerciseTimeGoal / 60) : 'N/A';

    return `Daily Goals: Energy - ${energyBurnedGoal}, Exercise - ${exerciseGoal}`;
}
