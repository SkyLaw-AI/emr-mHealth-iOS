import React, { FC } from 'react';
import { observer } from 'mobx-react-lite';
import { SafeAreaView, StatusBar, Text, View, SectionList, SectionListData, Dimensions } from 'react-native';
import { NavigationComponentProps } from 'react-native-navigation';
import { LineChart } from 'react-native-chart-kit';

import { useStateTree } from 'models';
import { signout } from 'services/auth';
import { Button } from 'components/Button';
import { ActivitySampleCategory } from 'models/activity';

import { ActivityFeedItem, ActivityFeedSection, useActivityFeed } from './hooks';
import s from './styles';

export interface ActivityFeedProps {}

export const ActivityFeed: FC<ActivityFeedProps & NavigationComponentProps> = observer(function ActivityFeed() {
    const { user, activity, serviceStatus } = useStateTree();
    const { activities, ...controllers } = useActivityFeed(activity, serviceStatus);

    return (
        <SafeAreaView style={s.safeArea}>
            <View style={s.container}>
                <StatusBar barStyle={'light-content'} />
                <View style={s.header}>
                    <View style={s.headerTitle}>
                        <Text style={s.title}>Activity</Text>
                    </View>
                    <View style={s.headerControls}>
                        {controllers.isRunning ? (
                            <Button icon={'stop'} onPress={controllers.stop} />
                        ) : (
                            <Button icon={'play'} onPress={controllers.start} />
                        )}
                        <Button icon={'rotate-right'} onPress={controllers.reset} />
                    </View>
                </View>
                {activities.length ? (
                    <SectionList
                        sections={activities}
                        keyExtractor={({ sample }) => sample.id}
                        renderSectionHeader={ActivityFeedSectionHeader}
                        renderItem={ActivityFeedSectionItem}
                        renderSectionFooter={ActivityFeedSectionFooter}
                        style={s.sectionList}
                        contentContainerStyle={s.sectionListContent}
                        showsVerticalScrollIndicator={false}
                        stickySectionHeadersEnabled={false}
                    />
                ) : (
                    <View style={s.emptyScreenContainer}>
                        <Text style={s.emptyScreenText}>No Data</Text>
                    </View>
                )}
                <View style={s.signInContainer}>
                    <Button onPress={signout} label="Sign out" />
                    <Text style={s.footnote}>Signed in as: {user.name ?? 'N/A'}</Text>
                </View>
            </View>
        </SafeAreaView>
    );
});

function ActivityFeedSectionHeader(props: { section: SectionListData<ActivityFeedItem, ActivityFeedSection> }) {
    const steps = props.section.data
        .filter((d) => d.sample.category === ActivitySampleCategory.Steps)
        .map((d) => d.count ?? 0)
        .reverse();

    const workouts = props.section.data
        .filter((d) => d.sample.category === ActivitySampleCategory.Workout)
        .map((d) => d.count ?? 0)
        .reverse();

    return (
        <View style={s.sectionHeader}>
            <View style={s.sectionHeaderTitle}>
                <Text style={s.sectionHeaderTitleText}>{props.section.title}</Text>
            </View>
            {steps.length ? <ActivityChart labels={['Steps']} measurements={steps} /> : null}
            {workouts.length ? <ActivityChart labels={['Workouts']} measurements={workouts} /> : null}
        </View>
    );
}

function ActivityFeedSectionFooter(props: { section: SectionListData<ActivityFeedItem, ActivityFeedSection> }) {
    return (
        <View style={s.sectionFooter}>
            <Text style={s.footnote}>{props.section.summary}</Text>
        </View>
    );
}

function ActivityFeedSectionItem({ item: activity }: { item: ActivityFeedItem }) {
    return (
        <View style={s.sectionItem}>
            <View style={s.sectionItemActivity}>
                <ActivityFeedSectionTitle activity={activity} />
            </View>
            <ActivityFeedSectionDetails activity={activity} />
        </View>
    );
}

function ActivityFeedSectionTitle({ activity }: { activity: ActivityFeedItem }) {
    switch (activity.sample.category) {
        case ActivitySampleCategory.Workout:
            return (
                <>
                    <Text style={s.sectionItemActivityLabelText}>{activity.sample.display}</Text>
                    {activity.sample.activeEnergyBurned !== undefined ? (
                        <Text style={s.sectionItemActivityDetailsText}>
                            {Math.round(activity.sample.activeEnergyBurned)} kcal
                        </Text>
                    ) : undefined}
                </>
            );
        case ActivitySampleCategory.Steps:
            return <Text style={s.sectionItemActivityLabelText}>{activity.sample.display}</Text>;
    }
}

function ActivityFeedSectionDetails({ activity }: { activity: ActivityFeedItem }) {
    switch (activity.sample.category) {
        case ActivitySampleCategory.Workout:
            return <Text style={s.sectionItemActivityDetailsText}>{activity.duration}</Text>;
        case ActivitySampleCategory.Steps:
            return <Text style={s.sectionItemActivityDetailsText}>{activity.count}</Text>;
    }
}

function ActivityChart({ labels, measurements }: { labels: string[]; measurements: number[] }) {
    return (
        <LineChart
            fromZero
            data={{
                labels: labels,
                datasets: [
                    {
                        data: measurements,
                    },
                ],
            }}
            width={Dimensions.get('window').width}
            height={200}
            chartConfig={{
                backgroundGradientFromOpacity: 0,
                backgroundGradientToOpacity: 0,
                color: (opacity = 1) => `rgba(255, 255, 255, ${opacity})`,
                style: {
                    backgroundColor: s.safeArea.backgroundColor,
                },
                decimalPlaces: 0,
            }}
        />
    );
}
