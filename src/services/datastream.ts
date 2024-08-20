import { DATASTREAM_API_URL } from 'config';
import { stateTree } from 'models';
import { ActivitySampleCategory, Steps, Workout } from 'models/activity';
import { ServiceStatus } from 'models/service-status';
import { HealthKitEventRegistry, HealthKitQuery, subscribeHealthKitEvents } from 'services/healthkit';
import { postLocalNotification } from 'services/notifications';
import { getUserIdentity, signout } from 'services/auth';
import { uploadActivitySummaryObservation } from 'services/emr';
import { isFailure } from 'fhir-react/src/libs/remoteData';
import { FetchError, service as fetchService } from 'fhir-react/src/services/fetch';

export function attachActivityHistoryDataStream() {
    HealthKitQuery.activitySummary().then(stateTree.activity.updateSummary);

    subscribeHealthKitEvents(HealthKitEventRegistry.SampleCreated, async (samples: (Workout | Steps)[]) => {
        const identity = await getUserIdentity();
        const workouts = samples.filter((s): s is Workout => s.category === ActivitySampleCategory.Workout);
        const steps = samples.filter((s): s is Steps => s.category === ActivitySampleCategory.Steps);

        if (DATASTREAM_API_URL !== undefined) {
            const uploadWorkoutHistoryResponse = await uploadWorkoutHistory(identity?.jwt, workouts);
            if (isFailure(uploadWorkoutHistoryResponse)) {
                checkResponseStatus({
                    from: 'Time Series Data Stream',
                    error: uploadWorkoutHistoryResponse.error,
                });
            }
        }
        stateTree.activity.pushWorkouts(workouts);
        stateTree.activity.pushSteps(steps);

        await HealthKitQuery.activitySummary().then(async (summary) => {
            if (identity && stateTree.user.patient && summary) {
                // EMR requires patient to be authenticated to submit observations
                const uploadObservationsResponse = await uploadActivitySummaryObservation(
                    identity.jwt,
                    stateTree.user.patient,
                    summary,
                );

                if (isFailure(uploadObservationsResponse)) {
                    checkResponseStatus({ from: 'EMR', error: uploadObservationsResponse.error });
                }
            }
            stateTree.activity.updateSummary(summary);
        });

        if (workouts.length) {
            postLocalNotification({
                title: 'New Workout',
                body: `The most recent workouts are: ${workouts.map(({ display }) => display).join(', ')}`,
            });
        }
    });
    subscribeHealthKitEvents(HealthKitEventRegistry.QueryStatusHasChanged, async (status: ServiceStatus) => {
        stateTree.serviceStatus.updateHealthKitServiceStatus(status);
    });
}

export async function uploadWorkoutHistory(token: string | undefined, workouts: Workout[]) {
    return fetchService(`${DATASTREAM_API_URL}/records`, {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
            ...(token ? { Authorization: `Bearer ${token}` } : undefined),
        },
        body: JSON.stringify({
            records: workouts.map((r) => ({
                sid: r.id,
                ts: r.startDate,
                start: r.startDate,
                finish: r.endDate,
                code: r.code,
                duration: r.duration ? Math.round(r.duration) : undefined,
                energy: r.activeEnergyBurned ? Math.round(r.activeEnergyBurned) : undefined,
            })),
        }),
    });
}

interface CheckResponseStatusArgs {
    from: string;
    error: FetchError;
}

function checkResponseStatus(args: CheckResponseStatusArgs) {
    const { from: service, error } = args;
    switch (error.status) {
        case 200:
            break;
        case 401:
            signout();
            break;
        default:
            throw Error(
                `"${service}" service request has failed, operation status: ${error.status}, details: ${error.message}`,
            );
    }
}
