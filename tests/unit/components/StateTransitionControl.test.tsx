import { render, screen, fireEvent, waitFor } from '../../setup/testUtils';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import StateTransitionControl from '../../../components/StateTransitionControl';
import { jobStateService } from '../../../services/apiService';

vi.mock('../../../services/apiService', () => ({
  jobStateService: {
    getAllowedTransitions: vi.fn(),
    transitionState: vi.fn(),
  },
}));

describe('StateTransitionControl', () => {
  const mockOnStateChanged = vi.fn();
  const mockJobId = 'job-123';
  const mockCurrentState = 'draft';

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('should load and display allowed transitions', async () => {
    vi.mocked(jobStateService.getAllowedTransitions).mockResolvedValue({
      currentState: 'draft',
      transitions: [
        { state: 'scheduled', allowed: true, blockedReasons: [] },
        { state: 'in_progress', allowed: true, blockedReasons: [] },
      ],
    });

    render(
      <StateTransitionControl
        jobId={mockJobId}
        currentState={mockCurrentState}
        onStateChanged={mockOnStateChanged}
      />
    );

    await waitFor(() => {
      expect(screen.getByText('Scheduled')).toBeInTheDocument();
      expect(screen.getByText('In Progress')).toBeInTheDocument();
    });

    expect(jobStateService.getAllowedTransitions).toHaveBeenCalledWith(mockJobId);
  });

  it('should show loading state while fetching transitions', () => {
    vi.mocked(jobStateService.getAllowedTransitions).mockImplementation(
      () => new Promise(() => {})
    );

    render(
      <StateTransitionControl
        jobId={mockJobId}
        currentState={mockCurrentState}
        onStateChanged={mockOnStateChanged}
      />
    );

    expect(screen.getByText(/Loading transitions.../i)).toBeInTheDocument();
  });

  it('should show transition modal when button clicked', async () => {
    vi.mocked(jobStateService.getAllowedTransitions).mockResolvedValue({
      currentState: 'draft',
      transitions: [
        { state: 'scheduled', allowed: true, blockedReasons: [] },
      ],
    });

    render(
      <StateTransitionControl
        jobId={mockJobId}
        currentState={mockCurrentState}
        onStateChanged={mockOnStateChanged}
      />
    );

    await waitFor(() => {
      expect(screen.getByText('Scheduled')).toBeInTheDocument();
    });

    const scheduledButton = screen.getByText('Scheduled');
    fireEvent.click(scheduledButton);

    await waitFor(() => {
      expect(screen.getByText('Confirm State Transition')).toBeInTheDocument();
      expect(screen.getByLabelText('Reason')).toBeInTheDocument();
      expect(screen.getByLabelText('Notes (optional)')).toBeInTheDocument();
    });
  });

  it('should submit state transition with reason and notes', async () => {
    vi.mocked(jobStateService.getAllowedTransitions).mockResolvedValue({
      currentState: 'draft',
      transitions: [
        { state: 'scheduled', allowed: true, blockedReasons: [] },
      ],
    });

    vi.mocked(jobStateService.transitionState).mockResolvedValue({
      id: mockJobId,
      state: 'scheduled',
    } as any);

    render(
      <StateTransitionControl
        jobId={mockJobId}
        currentState={mockCurrentState}
        onStateChanged={mockOnStateChanged}
      />
    );

    await waitFor(() => {
      expect(screen.getByText('Scheduled')).toBeInTheDocument();
    });

    fireEvent.click(screen.getByText('Scheduled'));

    await waitFor(() => {
      expect(screen.getByText('Confirm State Transition')).toBeInTheDocument();
    });

    const reasonInput = screen.getByLabelText('Reason');
    const notesInput = screen.getByLabelText('Notes (optional)');

    fireEvent.change(reasonInput, { target: { value: 'Customer confirmed' } });
    fireEvent.change(notesInput, { target: { value: 'Additional details here' } });

    const confirmButton = screen.getByText('Confirm Transition');
    fireEvent.click(confirmButton);

    await waitFor(() => {
      expect(jobStateService.transitionState).toHaveBeenCalledWith(mockJobId, {
        toState: 'scheduled',
        reason: 'Customer confirmed',
        notes: 'Additional details here',
      });
      expect(mockOnStateChanged).toHaveBeenCalledWith('scheduled');
    });
  });

  it('should handle errors gracefully', async () => {
    const consoleErrorSpy = vi.spyOn(console, 'error').mockImplementation(() => {});
    
    vi.mocked(jobStateService.getAllowedTransitions).mockRejectedValue(
      new Error('Failed to load transitions')
    );

    render(
      <StateTransitionControl
        jobId={mockJobId}
        currentState={mockCurrentState}
        onStateChanged={mockOnStateChanged}
      />
    );

    await waitFor(() => {
      expect(screen.getByText('Failed to load transitions')).toBeInTheDocument();
    });

    consoleErrorSpy.mockRestore();
  });

  it('should display message when no transitions are available', async () => {
    vi.mocked(jobStateService.getAllowedTransitions).mockResolvedValue({
      currentState: 'completed',
      transitions: [],
    });

    render(
      <StateTransitionControl
        jobId={mockJobId}
        currentState="completed"
        onStateChanged={mockOnStateChanged}
      />
    );

    await waitFor(() => {
      expect(screen.getByText(/No transitions available for current state/i)).toBeInTheDocument();
    });
  });

  it('should close modal when cancel button is clicked', async () => {
    vi.mocked(jobStateService.getAllowedTransitions).mockResolvedValue({
      currentState: 'draft',
      transitions: [
        { state: 'scheduled', allowed: true, blockedReasons: [] },
      ],
    });

    render(
      <StateTransitionControl
        jobId={mockJobId}
        currentState={mockCurrentState}
        onStateChanged={mockOnStateChanged}
      />
    );

    await waitFor(() => {
      expect(screen.getByText('Scheduled')).toBeInTheDocument();
    });

    fireEvent.click(screen.getByText('Scheduled'));

    await waitFor(() => {
      expect(screen.getByText('Confirm State Transition')).toBeInTheDocument();
    });

    const cancelButton = screen.getByText('Cancel');
    fireEvent.click(cancelButton);

    await waitFor(() => {
      expect(screen.queryByText('Confirm State Transition')).not.toBeInTheDocument();
    });
  });
});
