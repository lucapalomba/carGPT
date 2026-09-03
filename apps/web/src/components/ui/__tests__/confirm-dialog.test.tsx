import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { render, screen, fireEvent, cleanup } from '@testing-library/react';
import type { ReactNode } from 'react';

vi.mock('react-hot-toast', () => {
  const dismiss = vi.fn();
  const toast = vi.fn();
  toast.dismiss = dismiss;
  return { toast };
});

import { toast } from 'react-hot-toast';
import { confirm } from '../confirm-dialog';

describe('confirm-dialog', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  afterEach(() => {
    cleanup();
  });

  // confirm() calls toast(renderFn, options) and returns a promise that the
  // renderFn's buttons resolve. Render the captured JSX directly so the test
  // is deterministic and independent of react-hot-toast's global store.
  const renderConfirmToast = (callIndex = 0) => {
    expect(toast).toHaveBeenCalledTimes(callIndex + 1);
    const renderFn = (toast as unknown as { mock: { calls: unknown[][] } }).mock.calls[
      callIndex
    ][0] as (t: { id: string }) => ReactNode;
    return render(renderFn({ id: 't1' }) as React.ReactElement);
  };

  it('renders with default title and button labels', async () => {
    const p = confirm('Are you sure?');
    renderConfirmToast();
    expect(screen.getByText('Confirm Action')).toBeInTheDocument();
    expect(screen.getByText('Are you sure?')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Yes' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'No' })).toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: 'No' }));
    await expect(p).resolves.toBe(false);
  });

  it('uses custom title, confirmText and cancelText', async () => {
    const p = confirm('Delete this car?', {
      title: 'Delete',
      confirmText: 'Yes, delete',
      cancelText: 'Keep it',
    });
    renderConfirmToast();
    expect(screen.getByText('Delete')).toBeInTheDocument();
    expect(screen.getByText('Delete this car?')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Yes, delete' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Keep it' })).toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: 'Keep it' }));
    await expect(p).resolves.toBe(false);
  });

  it('resolves true and dismisses when the confirm button is clicked', async () => {
    const p = confirm('Start over?');
    renderConfirmToast();
    fireEvent.click(screen.getByRole('button', { name: 'Yes' }));
    expect(toast.dismiss).toHaveBeenCalledWith('t1');
    await expect(p).resolves.toBe(true);
  });

  it('resolves false and dismisses when the cancel button is clicked', async () => {
    const p = confirm('Start over?');
    renderConfirmToast();
    fireEvent.click(screen.getByRole('button', { name: 'No' }));
    expect(toast.dismiss).toHaveBeenCalledWith('t1');
    await expect(p).resolves.toBe(false);
  });

  it('passes duration 0 and top-center position to the toast', async () => {
    confirm('sure?');
    const opts = (toast as unknown as { mock: { calls: unknown[][] } }).mock.calls[0][1] as {
      duration: number;
      position: string;
    };
    expect(opts.duration).toBe(0);
    expect(opts.position).toBe('top-center');
  });
});