export type RegisteredStateMachineId = 'family_plan_lifecycle';

export type FamilyPlanState = 'draft' | 'planned' | 'shared' | 'completed' | 'archived';

export interface StateMachineDefinition<TState extends string> {
  id: RegisteredStateMachineId;
  initial: TState;
  states: TState[];
  transitions: Array<{ from: TState; to: TState; capability: string }>;
}

export const familyPlanStateMachine: StateMachineDefinition<FamilyPlanState> = {
  id: 'family_plan_lifecycle',
  initial: 'draft',
  states: ['draft', 'planned', 'shared', 'completed', 'archived'],
  transitions: [
    { from: 'draft', to: 'planned', capability: 'save_trip' },
    { from: 'planned', to: 'shared', capability: 'save_trip' },
    { from: 'planned', to: 'completed', capability: 'save_trip' },
    { from: 'shared', to: 'completed', capability: 'save_trip' },
    { from: 'planned', to: 'archived', capability: 'save_trip' },
    { from: 'completed', to: 'archived', capability: 'save_trip' },
  ],
};
