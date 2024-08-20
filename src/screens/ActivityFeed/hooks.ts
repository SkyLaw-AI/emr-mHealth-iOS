import { useCallback } from 'react';
import { Alert } from 'react-native';

import { HealthKitQueryController } from 'services/healthkit';

import { Activity, describeAcitivitySummary, makeActivitiesCalendar } from './utils';
import { StateTree } from 'models';
import { ActivitySummary, Steps, Workout } from 'models/activity';
import { ServiceStatus } from 'models/service-status';

export type ActivityFeedItem = Activity;

export interface ActivityFeedSection {
    title: string;
    data: ActivityFeedItem[];
    summary: string;
}

export function useActivityFeed(activity: StateTree['activity'], serviceStatus: StateTree['serviceStatus']) {
    return {
        activities: convertToActivitySections([...activity.workouts, ...activity.steps], activity.summary),
        isRunning: serviceStatus.healthkit === ServiceStatus.Running ? true : false,
        start: HealthKitQueryController.start,
        stop: HealthKitQueryController.stop,
        reset: useCallback(() => {
            Alert.alert('Reset history?', 'History reset will result in data duplicates', [
                {
                    text: 'Reset',
                    style: 'destructive',
                    onPress: async () => {
                        activity.clear();
                        await HealthKitQueryController.reset();
                        await HealthKitQueryController.start();
                    },
                },
                { text: 'Cancel', style: 'cancel' },
            ]);
        }, [activity]),
    };
}

function convertToActivitySections(samples: readonly (Workout | Steps)[], summary?: ActivitySummary) {
    return Array.from(makeActivitiesCalendar(samples.slice().reverse()))
        .reduce<ActivityFeedSection[]>((sections, [date, oneDayActivities]) => {
            sections.push({
                title: date,
                data: oneDayActivities.sort((a, b) => (a.date < b.date ? 1 : -1)),
                summary: describeAcitivitySummary(summary),
            });
            return sections;
        }, [])
        .sort((a, b) => (a.data[0]?.date < b.data[0]?.date ? 1 : -1));
}
