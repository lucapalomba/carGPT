import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { render, screen, fireEvent, waitFor, cleanup } from '@testing-library/react';

vi.mock('react-hot-toast', () => ({ toast: { success: vi.fn(), error: vi.fn() }, Toaster: () => null }));
vi.mock('../../utils/api.js', () => ({ api: { post: vi.fn() } }));

import { api } from '../../utils/api.js';
import { Provider } from '../ui/provider.js';
import Alternatives from '../Alternatives.js';
import type { Car } from '../hooks/useCarSearch.js';

const cars: Car[] = [
  { make: 'Tesla', model: '3', year: 2023 } as Car,
  { make: 'BMW', model: 'i4', year: 2024 } as Car,
];

const renderComp = (onClose = vi.fn()) =>
  render(
    <Provider>
      <Alternatives cars={cars} onClose={onClose} />
    </Provider>
  );

describe('Alternatives', () => {
  beforeEach(() => vi.clearAllMocks());
  afterEach(() => cleanup());

  it('renders the dialog with the car options', () => {
    renderComp();
    expect(screen.getByText(/Similar Alternatives/i)).toBeInTheDocument();
    expect(screen.getByText('Tesla 3')).toBeInTheDocument();
    expect(screen.getByText('BMW i4')).toBeInTheDocument();
  });

  it('alerts when no car is selected and Find Alternatives is clicked', () => {
    const alertSpy = vi.spyOn(window, 'alert').mockImplementation(() => {});
    renderComp();
    fireEvent.click(screen.getByRole('button', { name: /Find Alternatives/i }));
    expect(alertSpy).toHaveBeenCalledWith('Please select a car');
    expect(api.post).not.toHaveBeenCalled();
    alertSpy.mockRestore();
  });

  it('fetches and renders alternatives when a car is selected', async () => {
    (api.post as any).mockResolvedValue({
      alternatives: [
        { make: 'Polestar', model: '2', reason: 'Similar EV', advantages: 'Cheaper' },
      ],
    });
    renderComp();

    const select = document.querySelector('select')!;
    fireEvent.change(select, { target: { value: 'Tesla 3' } });
    fireEvent.click(screen.getByRole('button', { name: /Find Alternatives/i }));

    await waitFor(() => expect(screen.getByText(/Polestar 2/)).toBeInTheDocument());
    expect(api.post).toHaveBeenCalledWith('/api/get-alternatives', { car: 'Tesla 3', reason: '' });
    expect(screen.getByText(/Similar EV/)).toBeInTheDocument();
    expect(screen.getByText(/Cheaper/)).toBeInTheDocument();
  });

  it('does not render alternatives when the api returns null', async () => {
    (api.post as any).mockResolvedValue(null);
    renderComp();

    fireEvent.change(document.querySelector('select')!, { target: { value: 'BMW i4' } });
    fireEvent.click(screen.getByRole('button', { name: /Find Alternatives/i }));

    await waitFor(() => expect(api.post).toHaveBeenCalled());
    expect(screen.queryByText(/Why consider it/i)).not.toBeInTheDocument();
  });
});