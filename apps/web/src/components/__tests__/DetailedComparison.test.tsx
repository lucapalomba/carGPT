import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { render, screen, fireEvent, waitFor, cleanup } from '@testing-library/react';

vi.mock('react-hot-toast', () => ({ toast: { success: vi.fn(), error: vi.fn() }, Toaster: () => null }));
vi.mock('../../utils/api.js', () => ({ api: { post: vi.fn() } }));

import { api } from '../../utils/api.js';
import { Provider } from '../ui/provider.js';
import DetailedComparison from '../DetailedComparison.js';
import type { Car } from '../../hooks/useCarSearch';

const cars: Car[] = [
  { make: 'Tesla', model: '3', year: 2023 } as Car,
  { make: 'BMW', model: 'i4', year: 2024 } as Car,
];

const renderComp = (onClose = vi.fn()) =>
  render(
    <Provider>
      <DetailedComparison cars={cars} onClose={onClose} />
    </Provider>
  );

describe('DetailedComparison', () => {
  beforeEach(() => vi.clearAllMocks());
  afterEach(() => cleanup());

  it('renders the dialog with two car selectors', () => {
    renderComp();
    expect(screen.getByText(/Detailed Comparison/i)).toBeInTheDocument();
    expect(screen.getByTestId('compare-select-1')).toBeInTheDocument();
    expect(screen.getByTestId('compare-select-2')).toBeInTheDocument();
  });

  it('alerts when compare is clicked without two cars selected', () => {
    const alertSpy = vi.spyOn(window, 'alert').mockImplementation(() => {});
    renderComp();
    fireEvent.click(screen.getByTestId('compare-button'));
    expect(alertSpy).toHaveBeenCalledWith('Please select two cars to compare');
    expect(api.post).not.toHaveBeenCalled();
    alertSpy.mockRestore();
  });

  it('alerts when the same car is selected for both', () => {
    const alertSpy = vi.spyOn(window, 'alert').mockImplementation(() => {});
    renderComp();
    fireEvent.change(screen.getByTestId('compare-select-1'), { target: { value: 'Tesla 3' } });
    fireEvent.change(screen.getByTestId('compare-select-2'), { target: { value: 'Tesla 3' } });
    fireEvent.click(screen.getByTestId('compare-button'));
    expect(alertSpy).toHaveBeenCalledWith('Please select two different cars');
    expect(api.post).not.toHaveBeenCalled();
    alertSpy.mockRestore();
  });

  it('fetches and renders the comparison result with winners', async () => {
    (api.post as any).mockResolvedValue({
      comparison: {
        comparison: 'These two EVs target different buyers.',
        categories: [
          { name: 'Range', car1: '358 mi', car2: '300 mi', winner: 'car1' as const },
          { name: 'Price', car1: '$42k', car2: '$55k', winner: 'none' as const },
        ],
        conclusion: 'Pick the Tesla for range, the BMW for luxury.',
      },
    });
    renderComp();

    fireEvent.change(screen.getByTestId('compare-select-1'), { target: { value: 'Tesla 3' } });
    fireEvent.change(screen.getByTestId('compare-select-2'), { target: { value: 'BMW i4' } });
    fireEvent.click(screen.getByTestId('compare-button'));

    await waitFor(() => expect(screen.getByText('These two EVs target different buyers.')).toBeInTheDocument());
    expect(api.post).toHaveBeenCalledWith('/api/compare-cars', { car1: 'Tesla 3', car2: 'BMW i4' });
    expect(screen.getByText('Range')).toBeInTheDocument();
    expect(screen.getAllByText('🏆 Winner')).toHaveLength(1);
    expect(screen.getByText(/Pick the Tesla for range/)).toBeInTheDocument();
  });

  it('does not render a result when the api returns null', async () => {
    (api.post as any).mockResolvedValue(null);
    renderComp();

    fireEvent.change(screen.getByTestId('compare-select-1'), { target: { value: 'Tesla 3' } });
    fireEvent.change(screen.getByTestId('compare-select-2'), { target: { value: 'BMW i4' } });
    fireEvent.click(screen.getByTestId('compare-button'));

    await waitFor(() => expect(api.post).toHaveBeenCalled());
    expect(screen.queryByText(/Conclusion/i)).not.toBeInTheDocument();
  });
});