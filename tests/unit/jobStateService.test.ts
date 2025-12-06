import { describe, it, expect } from 'vitest';

const STATE_TRANSITION_MATRIX: Record<string, string[]> = {
  draft: ['needs_permit', 'waiting_on_client', 'scheduled', 'cancelled'],
  needs_permit: ['waiting_on_client', 'scheduled', 'cancelled'],
  waiting_on_client: ['scheduled', 'cancelled'],
  scheduled: ['en_route', 'in_progress', 'weather_hold', 'cancelled'],
  en_route: ['on_site', 'scheduled', 'weather_hold', 'cancelled'],
  on_site: ['in_progress', 'scheduled', 'weather_hold', 'cancelled'],
  weather_hold: ['scheduled', 'cancelled'],
  in_progress: ['completed', 'weather_hold', 'cancelled'],
  completed: ['invoiced'],
  invoiced: ['paid', 'completed'],
  paid: [],
  cancelled: []
};

const STATE_NAMES: Record<string, string> = {
  draft: 'Draft',
  needs_permit: 'Needs Permit',
  waiting_on_client: 'Waiting on Client',
  scheduled: 'Scheduled',
  en_route: 'En Route',
  on_site: 'On Site',
  weather_hold: 'Weather Hold',
  in_progress: 'In Progress',
  completed: 'Completed',
  invoiced: 'Invoiced',
  paid: 'Paid',
  cancelled: 'Cancelled'
};

const ALL_STATES = Object.keys(STATE_TRANSITION_MATRIX);
const TERMINAL_STATES = ['paid', 'cancelled'];

function isTransitionAllowed(fromState: string, toState: string): boolean {
  const allowedTransitions = STATE_TRANSITION_MATRIX[fromState];
  if (!allowedTransitions) {
    return false;
  }
  return allowedTransitions.includes(toState);
}

function getAllowedTransitions(fromState: string): string[] {
  return STATE_TRANSITION_MATRIX[fromState] || [];
}

describe('JobStateService', () => {
  describe('STATE_TRANSITION_MATRIX', () => {
    it('should have all expected states defined', () => {
      const expectedStates = [
        'draft', 'needs_permit', 'waiting_on_client', 'scheduled',
        'en_route', 'on_site', 'weather_hold', 'in_progress',
        'completed', 'invoiced', 'paid', 'cancelled'
      ];
      
      expectedStates.forEach(state => {
        expect(STATE_TRANSITION_MATRIX).toHaveProperty(state);
      });
    });

    it('should have 12 total states', () => {
      expect(Object.keys(STATE_TRANSITION_MATRIX).length).toBe(12);
    });

    it('should match state names for all states', () => {
      Object.keys(STATE_TRANSITION_MATRIX).forEach(state => {
        expect(STATE_NAMES).toHaveProperty(state);
        expect(STATE_NAMES[state]).toBeDefined();
      });
    });
  });

  describe('isTransitionAllowed', () => {
    describe('Valid transitions from draft', () => {
      it('should allow draft → needs_permit', () => {
        expect(isTransitionAllowed('draft', 'needs_permit')).toBe(true);
      });

      it('should allow draft → waiting_on_client', () => {
        expect(isTransitionAllowed('draft', 'waiting_on_client')).toBe(true);
      });

      it('should allow draft → scheduled', () => {
        expect(isTransitionAllowed('draft', 'scheduled')).toBe(true);
      });

      it('should allow draft → cancelled', () => {
        expect(isTransitionAllowed('draft', 'cancelled')).toBe(true);
      });
    });

    describe('Valid transitions from needs_permit', () => {
      it('should allow needs_permit → waiting_on_client', () => {
        expect(isTransitionAllowed('needs_permit', 'waiting_on_client')).toBe(true);
      });

      it('should allow needs_permit → scheduled', () => {
        expect(isTransitionAllowed('needs_permit', 'scheduled')).toBe(true);
      });

      it('should allow needs_permit → cancelled', () => {
        expect(isTransitionAllowed('needs_permit', 'cancelled')).toBe(true);
      });
    });

    describe('Valid transitions from waiting_on_client', () => {
      it('should allow waiting_on_client → scheduled', () => {
        expect(isTransitionAllowed('waiting_on_client', 'scheduled')).toBe(true);
      });

      it('should allow waiting_on_client → cancelled', () => {
        expect(isTransitionAllowed('waiting_on_client', 'cancelled')).toBe(true);
      });
    });

    describe('Valid transitions from scheduled', () => {
      it('should allow scheduled → en_route', () => {
        expect(isTransitionAllowed('scheduled', 'en_route')).toBe(true);
      });

      it('should allow scheduled → in_progress', () => {
        expect(isTransitionAllowed('scheduled', 'in_progress')).toBe(true);
      });

      it('should allow scheduled → weather_hold', () => {
        expect(isTransitionAllowed('scheduled', 'weather_hold')).toBe(true);
      });

      it('should allow scheduled → cancelled', () => {
        expect(isTransitionAllowed('scheduled', 'cancelled')).toBe(true);
      });
    });

    describe('Valid transitions from en_route', () => {
      it('should allow en_route → on_site', () => {
        expect(isTransitionAllowed('en_route', 'on_site')).toBe(true);
      });

      it('should allow en_route → scheduled (reschedule)', () => {
        expect(isTransitionAllowed('en_route', 'scheduled')).toBe(true);
      });

      it('should allow en_route → weather_hold', () => {
        expect(isTransitionAllowed('en_route', 'weather_hold')).toBe(true);
      });

      it('should allow en_route → cancelled', () => {
        expect(isTransitionAllowed('en_route', 'cancelled')).toBe(true);
      });
    });

    describe('Valid transitions from on_site', () => {
      it('should allow on_site → in_progress', () => {
        expect(isTransitionAllowed('on_site', 'in_progress')).toBe(true);
      });

      it('should allow on_site → scheduled (reschedule)', () => {
        expect(isTransitionAllowed('on_site', 'scheduled')).toBe(true);
      });

      it('should allow on_site → weather_hold', () => {
        expect(isTransitionAllowed('on_site', 'weather_hold')).toBe(true);
      });

      it('should allow on_site → cancelled', () => {
        expect(isTransitionAllowed('on_site', 'cancelled')).toBe(true);
      });
    });

    describe('Valid transitions from weather_hold', () => {
      it('should allow weather_hold → scheduled', () => {
        expect(isTransitionAllowed('weather_hold', 'scheduled')).toBe(true);
      });

      it('should allow weather_hold → cancelled', () => {
        expect(isTransitionAllowed('weather_hold', 'cancelled')).toBe(true);
      });
    });

    describe('Valid transitions from in_progress', () => {
      it('should allow in_progress → completed', () => {
        expect(isTransitionAllowed('in_progress', 'completed')).toBe(true);
      });

      it('should allow in_progress → weather_hold', () => {
        expect(isTransitionAllowed('in_progress', 'weather_hold')).toBe(true);
      });

      it('should allow in_progress → cancelled', () => {
        expect(isTransitionAllowed('in_progress', 'cancelled')).toBe(true);
      });
    });

    describe('Valid transitions from completed', () => {
      it('should allow completed → invoiced', () => {
        expect(isTransitionAllowed('completed', 'invoiced')).toBe(true);
      });
    });

    describe('Valid transitions from invoiced', () => {
      it('should allow invoiced → paid', () => {
        expect(isTransitionAllowed('invoiced', 'paid')).toBe(true);
      });

      it('should allow invoiced → completed (void/correction)', () => {
        expect(isTransitionAllowed('invoiced', 'completed')).toBe(true);
      });
    });

    describe('Terminal state: paid', () => {
      it('should not allow any transitions from paid', () => {
        expect(getAllowedTransitions('paid')).toEqual([]);
      });

      it('should reject paid → draft', () => {
        expect(isTransitionAllowed('paid', 'draft')).toBe(false);
      });

      it('should reject paid → cancelled', () => {
        expect(isTransitionAllowed('paid', 'cancelled')).toBe(false);
      });

      it('should reject paid → invoiced', () => {
        expect(isTransitionAllowed('paid', 'invoiced')).toBe(false);
      });

      it('should reject paid → completed', () => {
        expect(isTransitionAllowed('paid', 'completed')).toBe(false);
      });

      it('should reject paid → any state', () => {
        ALL_STATES.forEach(state => {
          expect(isTransitionAllowed('paid', state)).toBe(false);
        });
      });
    });

    describe('Terminal state: cancelled', () => {
      it('should not allow any transitions from cancelled', () => {
        expect(getAllowedTransitions('cancelled')).toEqual([]);
      });

      it('should reject cancelled → draft', () => {
        expect(isTransitionAllowed('cancelled', 'draft')).toBe(false);
      });

      it('should reject cancelled → scheduled', () => {
        expect(isTransitionAllowed('cancelled', 'scheduled')).toBe(false);
      });

      it('should reject cancelled → any state', () => {
        ALL_STATES.forEach(state => {
          expect(isTransitionAllowed('cancelled', state)).toBe(false);
        });
      });
    });

    describe('Invalid transitions', () => {
      it('should reject draft → completed (skips workflow)', () => {
        expect(isTransitionAllowed('draft', 'completed')).toBe(false);
      });

      it('should reject draft → in_progress (skips scheduling)', () => {
        expect(isTransitionAllowed('draft', 'in_progress')).toBe(false);
      });

      it('should reject draft → paid (skips entire workflow)', () => {
        expect(isTransitionAllowed('draft', 'paid')).toBe(false);
      });

      it('should reject draft → invoiced', () => {
        expect(isTransitionAllowed('draft', 'invoiced')).toBe(false);
      });

      it('should reject scheduled → completed (skips in_progress)', () => {
        expect(isTransitionAllowed('scheduled', 'completed')).toBe(false);
      });

      it('should reject scheduled → paid', () => {
        expect(isTransitionAllowed('scheduled', 'paid')).toBe(false);
      });

      it('should reject scheduled → invoiced', () => {
        expect(isTransitionAllowed('scheduled', 'invoiced')).toBe(false);
      });

      it('should reject in_progress → invoiced (skips completed)', () => {
        expect(isTransitionAllowed('in_progress', 'invoiced')).toBe(false);
      });

      it('should reject in_progress → paid', () => {
        expect(isTransitionAllowed('in_progress', 'paid')).toBe(false);
      });

      it('should reject completed → paid (skips invoiced)', () => {
        expect(isTransitionAllowed('completed', 'paid')).toBe(false);
      });

      it('should reject completed → cancelled', () => {
        expect(isTransitionAllowed('completed', 'cancelled')).toBe(false);
      });

      it('should reject invoiced → cancelled', () => {
        expect(isTransitionAllowed('invoiced', 'cancelled')).toBe(false);
      });

      it('should reject en_route → completed', () => {
        expect(isTransitionAllowed('en_route', 'completed')).toBe(false);
      });

      it('should reject on_site → completed', () => {
        expect(isTransitionAllowed('on_site', 'completed')).toBe(false);
      });

      it('should reject weather_hold → in_progress', () => {
        expect(isTransitionAllowed('weather_hold', 'in_progress')).toBe(false);
      });

      it('should reject weather_hold → completed', () => {
        expect(isTransitionAllowed('weather_hold', 'completed')).toBe(false);
      });
    });

    describe('Unknown states', () => {
      it('should return false for unknown fromState', () => {
        expect(isTransitionAllowed('unknown_state', 'draft')).toBe(false);
      });

      it('should return false for transition to unknown toState', () => {
        expect(isTransitionAllowed('draft', 'unknown_state')).toBe(false);
      });

      it('should return empty array for unknown state transitions', () => {
        expect(getAllowedTransitions('unknown_state')).toEqual([]);
      });
    });
  });

  describe('getAllowedTransitions', () => {
    it('should return correct transitions for draft', () => {
      const transitions = getAllowedTransitions('draft');
      expect(transitions).toContain('needs_permit');
      expect(transitions).toContain('waiting_on_client');
      expect(transitions).toContain('scheduled');
      expect(transitions).toContain('cancelled');
      expect(transitions.length).toBe(4);
    });

    it('should return correct transitions for scheduled', () => {
      const transitions = getAllowedTransitions('scheduled');
      expect(transitions).toContain('en_route');
      expect(transitions).toContain('in_progress');
      expect(transitions).toContain('weather_hold');
      expect(transitions).toContain('cancelled');
      expect(transitions.length).toBe(4);
    });

    it('should return correct transitions for in_progress', () => {
      const transitions = getAllowedTransitions('in_progress');
      expect(transitions).toContain('completed');
      expect(transitions).toContain('weather_hold');
      expect(transitions).toContain('cancelled');
      expect(transitions.length).toBe(3);
    });

    it('should return correct transitions for completed', () => {
      const transitions = getAllowedTransitions('completed');
      expect(transitions).toContain('invoiced');
      expect(transitions.length).toBe(1);
    });

    it('should return correct transitions for invoiced', () => {
      const transitions = getAllowedTransitions('invoiced');
      expect(transitions).toContain('paid');
      expect(transitions).toContain('completed');
      expect(transitions.length).toBe(2);
    });

    it('should return empty array for terminal state paid', () => {
      expect(getAllowedTransitions('paid')).toEqual([]);
    });

    it('should return empty array for terminal state cancelled', () => {
      expect(getAllowedTransitions('cancelled')).toEqual([]);
    });
  });

  describe('State flow paths', () => {
    describe('Happy path: draft → paid', () => {
      it('should allow the complete workflow: draft → scheduled → en_route → on_site → in_progress → completed → invoiced → paid', () => {
        expect(isTransitionAllowed('draft', 'scheduled')).toBe(true);
        expect(isTransitionAllowed('scheduled', 'en_route')).toBe(true);
        expect(isTransitionAllowed('en_route', 'on_site')).toBe(true);
        expect(isTransitionAllowed('on_site', 'in_progress')).toBe(true);
        expect(isTransitionAllowed('in_progress', 'completed')).toBe(true);
        expect(isTransitionAllowed('completed', 'invoiced')).toBe(true);
        expect(isTransitionAllowed('invoiced', 'paid')).toBe(true);
      });

      it('should allow shorter path: draft → scheduled → in_progress → completed → invoiced → paid', () => {
        expect(isTransitionAllowed('draft', 'scheduled')).toBe(true);
        expect(isTransitionAllowed('scheduled', 'in_progress')).toBe(true);
        expect(isTransitionAllowed('in_progress', 'completed')).toBe(true);
        expect(isTransitionAllowed('completed', 'invoiced')).toBe(true);
        expect(isTransitionAllowed('invoiced', 'paid')).toBe(true);
      });
    });

    describe('Permit path', () => {
      it('should allow draft → needs_permit → scheduled', () => {
        expect(isTransitionAllowed('draft', 'needs_permit')).toBe(true);
        expect(isTransitionAllowed('needs_permit', 'scheduled')).toBe(true);
      });

      it('should allow draft → needs_permit → waiting_on_client → scheduled', () => {
        expect(isTransitionAllowed('draft', 'needs_permit')).toBe(true);
        expect(isTransitionAllowed('needs_permit', 'waiting_on_client')).toBe(true);
        expect(isTransitionAllowed('waiting_on_client', 'scheduled')).toBe(true);
      });
    });

    describe('Weather hold path', () => {
      it('should allow scheduled → weather_hold → scheduled (weather delay)', () => {
        expect(isTransitionAllowed('scheduled', 'weather_hold')).toBe(true);
        expect(isTransitionAllowed('weather_hold', 'scheduled')).toBe(true);
      });

      it('should allow in_progress → weather_hold → scheduled → in_progress', () => {
        expect(isTransitionAllowed('in_progress', 'weather_hold')).toBe(true);
        expect(isTransitionAllowed('weather_hold', 'scheduled')).toBe(true);
        expect(isTransitionAllowed('scheduled', 'in_progress')).toBe(true);
      });
    });

    describe('Cancellation paths', () => {
      it('should allow cancellation from draft', () => {
        expect(isTransitionAllowed('draft', 'cancelled')).toBe(true);
      });

      it('should allow cancellation from scheduled', () => {
        expect(isTransitionAllowed('scheduled', 'cancelled')).toBe(true);
      });

      it('should allow cancellation from en_route', () => {
        expect(isTransitionAllowed('en_route', 'cancelled')).toBe(true);
      });

      it('should allow cancellation from in_progress', () => {
        expect(isTransitionAllowed('in_progress', 'cancelled')).toBe(true);
      });

      it('should NOT allow cancellation from completed', () => {
        expect(isTransitionAllowed('completed', 'cancelled')).toBe(false);
      });

      it('should NOT allow cancellation from invoiced', () => {
        expect(isTransitionAllowed('invoiced', 'cancelled')).toBe(false);
      });

      it('should NOT allow cancellation from paid', () => {
        expect(isTransitionAllowed('paid', 'cancelled')).toBe(false);
      });
    });

    describe('Invoice correction path', () => {
      it('should allow invoiced → completed for invoice void/correction', () => {
        expect(isTransitionAllowed('invoiced', 'completed')).toBe(true);
      });
    });
  });
});

describe('STATE_NAMES', () => {
  it('should have human-readable names for all states', () => {
    expect(STATE_NAMES.draft).toBe('Draft');
    expect(STATE_NAMES.needs_permit).toBe('Needs Permit');
    expect(STATE_NAMES.waiting_on_client).toBe('Waiting on Client');
    expect(STATE_NAMES.scheduled).toBe('Scheduled');
    expect(STATE_NAMES.en_route).toBe('En Route');
    expect(STATE_NAMES.on_site).toBe('On Site');
    expect(STATE_NAMES.weather_hold).toBe('Weather Hold');
    expect(STATE_NAMES.in_progress).toBe('In Progress');
    expect(STATE_NAMES.completed).toBe('Completed');
    expect(STATE_NAMES.invoiced).toBe('Invoiced');
    expect(STATE_NAMES.paid).toBe('Paid');
    expect(STATE_NAMES.cancelled).toBe('Cancelled');
  });

  it('should have 12 state names', () => {
    expect(Object.keys(STATE_NAMES).length).toBe(12);
  });
});
