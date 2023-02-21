import { Navigation } from 'react-native-navigation';
import { Notifications } from 'react-native-notifications';

import { navigationLayout } from 'screens/ActivityFeed/navigation';
import { launchBackgroundWorkoutRecordsSync } from 'services/datastream';

Navigation.events().registerAppLaunchedListener(() => {
    Notifications.registerRemoteNotifications();
    Navigation.setRoot({
        root: {
            bottomTabs: {
                id: 'FHIRmHealth',
                children: [navigationLayout({})],
                options: {
                    bottomTabs: {
                        visible: false,
                    },
                },
            },
        },
    });
    launchBackgroundWorkoutRecordsSync();
});
