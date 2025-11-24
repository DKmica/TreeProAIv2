import { render, screen } from '../../setup/testUtils';
import { describe, it, expect } from 'vitest';
import JobStatusBadge from '../../../components/JobStatusBadge';

describe('JobStatusBadge', () => {
  it('should render with correct status text', () => {
    render(<JobStatusBadge status="scheduled" />);
    expect(screen.getByText('Scheduled')).toBeInTheDocument();
  });

  it('should apply correct color classes for draft status', () => {
    render(<JobStatusBadge status="draft" />);
    const badge = screen.getByRole('status');
    expect(badge).toHaveClass('bg-gray-600', 'text-gray-100');
  });

  it('should apply correct color classes for scheduled status', () => {
    render(<JobStatusBadge status="scheduled" />);
    const badge = screen.getByRole('status');
    expect(badge).toHaveClass('bg-blue-600', 'text-blue-100');
  });

  it('should apply correct color classes for in_progress status', () => {
    render(<JobStatusBadge status="in_progress" />);
    const badge = screen.getByRole('status');
    expect(badge).toHaveClass('bg-cyan-600', 'text-cyan-100');
  });

  it('should apply correct color classes for completed status', () => {
    render(<JobStatusBadge status="completed" />);
    const badge = screen.getByRole('status');
    expect(badge).toHaveClass('bg-green-700', 'text-green-100');
  });

  it('should apply correct color classes for cancelled status', () => {
    render(<JobStatusBadge status="cancelled" />);
    const badge = screen.getByRole('status');
    expect(badge).toHaveClass('bg-red-700', 'text-red-100');
  });

  it('should handle small size', () => {
    render(<JobStatusBadge status="draft" size="sm" />);
    const badge = screen.getByRole('status');
    expect(badge).toHaveClass('px-2.5', 'py-0.5', 'text-xs');
  });

  it('should handle medium size by default', () => {
    render(<JobStatusBadge status="draft" />);
    const badge = screen.getByRole('status');
    expect(badge).toHaveClass('px-3', 'py-1', 'text-sm');
  });

  it('should handle large size', () => {
    render(<JobStatusBadge status="draft" size="lg" />);
    const badge = screen.getByRole('status');
    expect(badge).toHaveClass('px-4', 'py-2', 'text-base');
  });

  it('should format status text from snake_case to Title Case', () => {
    render(<JobStatusBadge status="in_progress" />);
    expect(screen.getByText('In Progress')).toBeInTheDocument();
  });

  it('should format status text with multiple underscores', () => {
    render(<JobStatusBadge status="waiting_on_client" />);
    expect(screen.getByText('Waiting On Client')).toBeInTheDocument();
  });

  it('should have proper ARIA attributes', () => {
    render(<JobStatusBadge status="scheduled" />);
    const badge = screen.getByRole('status');
    expect(badge).toHaveAttribute('aria-label', 'Scheduled status');
  });
});
