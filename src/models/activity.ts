import { Instance, types } from 'mobx-state-tree';

const WORKOUTS_HISTORY_TO_KEEP = 30;
const STEPS_HISTORY_TO_KEEP = 30;

const ActivitySummaryModel = types.model('ActivitySummaryModel').props({
    activeEnergyBurned: types.maybe(types.number),
    activeEnergyBurnedGoal: types.maybe(types.number),
    moveTime: types.maybe(types.number),
    moveTimeGoal: types.maybe(types.number),
    exerciseTime: types.maybe(types.number),
    standHours: types.maybe(types.number),
    exerciseTimeGoal: types.maybe(types.number),
    standHoursGoal: types.maybe(types.number),
});

export interface ActivitySummary extends Instance<typeof ActivitySummaryModel> {}

export enum ActivitySampleCategory {
    Workout = 'workout',
    Steps = 'steps',
}

const ActivitySampleModel = types.model('ActivitySampleModel').props({
    id: types.string,
    startDate: types.string,
    endDate: types.string,
    category: types.enumeration<ActivitySampleCategory>(
        'ActivitySampleCategory',
        Object.values(ActivitySampleCategory),
    ),
    code: types.maybe(types.string),
    display: types.maybe(types.string),
});

const WorkoutSampleModel = types.model('WorkoutSampleModel').props({
    category: types.literal(ActivitySampleCategory.Workout),
    duration: types.maybe(types.number),
    activeEnergyBurned: types.maybe(types.number),
});

const StepsSampleModel = types.model('StepsSampleModel').props({
    category: types.literal(ActivitySampleCategory.Steps),
    count: types.number,
});

const WorkoutModel = types.compose('WorkoutModel', ActivitySampleModel, WorkoutSampleModel);
const StepsModel = types.compose('StepsModel', ActivitySampleModel, StepsSampleModel);

export interface Workout extends Instance<typeof WorkoutModel> {}
export interface Steps extends Instance<typeof StepsModel> {}

export const ActivityModel = types
    .model('ActivityModel')
    .props({
        workouts: types.array(WorkoutModel),
        steps: types.array(StepsModel),
        summary: types.maybe(ActivitySummaryModel),
    })
    .actions((self) => ({
        pushWorkouts: (workouts: Workout[]) => {
            for (const workout of workouts) {
                const existingWorkout = self.workouts.find((w) => w.id === workout.id);
                if (existingWorkout) {
                    continue;
                }
                self.workouts.push(workout);
                if (self.workouts.length > WORKOUTS_HISTORY_TO_KEEP) {
                    self.workouts.shift();
                }
            }
        },
        pushSteps: (steps: Steps[]) => {
            for (const stepsSample of steps) {
                const existingStepsSample = self.steps.find((w) => w.id === stepsSample.id);
                if (existingStepsSample) {
                    continue;
                }
                self.steps.push(stepsSample);
                if (self.steps.length > STEPS_HISTORY_TO_KEEP) {
                    self.steps.shift();
                }
            }
        },
        updateSummary: (summary: ActivitySummary | undefined) => {
            self.summary = summary;
        },
        clear: () => {
            self.workouts.splice(0, self.workouts.length);
            self.steps.splice(0, self.steps.length);
            self.summary = undefined;
        },
    }));
