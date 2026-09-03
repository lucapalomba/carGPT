import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { render, screen, fireEvent, waitFor, cleanup } from '@testing-library/react';

vi.mock('react-hot-toast', () => ({ toast: { success: vi.fn(), error: vi.fn() }, Toaster: () => null }));
vi.mock('../../utils/api.js', () => ({ api: { post: vi.fn() } }));

import { api } from '../../utils/api.js';
import { Provider } from '../ui/provider.js';
import QASection from '../QASection.js';
import type { Car } from '../hooks/useCarSearch.js';

const cars: Car[] = [
  { make: 'Tesla', model: '3', year: 2023 } as Car,
  { make: 'BMW', model: 'i4', year: 2024 } as Car,
];

const renderComp = () =>
  render(
    <Provider>
      <QASection cars={cars} />
    </Provider>
  );

describe('QASection', () => {
  beforeEach(() => vi.clearAllMocks());
  afterEach(() => cleanup());

  it('renders the empty state prompt', () => {
    renderComp();
    expect(screen.getByText(/Have questions about these cars/i)).toBeInTheDocument();
    expect(screen.getByText(/Questions and answers will appear here/i)).toBeInTheDocument();
  });

  it('alerts when Ask is clicked without a car and question', () => {
    const alertSpy = vi.spyOn(window, 'alert').mockImplementation(() => {});
    renderComp();
    fireEvent.click(screen.getByRole('button', { name: 'Ask' }));
    expect(alertSpy).toHaveBeenCalledWith('Please select a car and write a question');
    expect(api.post).not.toHaveBeenCalled();
    alertSpy.mockRestore();
  });

  it('posts the question and renders the answer in history', async () => {
    (api.post as any).mockResolvedValue({ answer: 'About €1,200/year.' });
    renderComp();

    fireEvent.change(screen.getByTestId('qa-car-select'), { target: { value: '0' } });
    const input = screen.getByPlaceholderText(/annual maintenance cost/i);
    fireEvent.change(input, { target: { value: 'What is the maintenance cost?' } });
    fireEvent.click(screen.getByRole('button', { name: 'Ask' }));

    await waitFor(() => expect(screen.getByText('About €1,200/year.')).toBeInTheDocument());
    expect(api.post).toHaveBeenCalledWith('/api/ask-about-car', {
      car: 'Tesla 3',
      question: 'What is the maintenance cost?',
    });
    // The question bubble is right-aligned (carName label + question text)
    expect(screen.getByText('What is the maintenance cost?')).toBeInTheDocument();
    // input was cleared after submit
    expect(screen.getByPlaceholderText(/annual maintenance cost/i)).toHaveValue('');
  });

  it('shows an error answer when the api returns null', async () => {
    (api.post as any).mockResolvedValue(null);
    renderComp();

    fireEvent.change(screen.getByTestId('qa-car-select'), { target: { value: '1' } });
    fireEvent.change(screen.getByPlaceholderText(/annual maintenance cost/i), {
      target: { value: 'Anything?' },
    });
    fireEvent.click(screen.getByRole('button', { name: 'Ask' }));

    await waitFor(() => expect(screen.getByText('Operation failed')).toBeInTheDocument());
  });

  it('submits on Enter key press', async () => {
    (api.post as any).mockResolvedValue({ answer: 'Yes.' });
    renderComp();

    fireEvent.change(screen.getByTestId('qa-car-select'), { target: { value: '0' } });
    const input = screen.getByPlaceholderText(/annual maintenance cost/i);
    fireEvent.change(input, { target: { value: 'Good in snow?' } });
    fireEvent.keyPress(input, { key: 'Enter', charCode: 13, keyCode: 13 });

    await waitFor(() => expect(api.post).toHaveBeenCalledWith('/api/ask-about-car', {
      car: 'Tesla 3',
      question: 'Good in snow?',
    }));
  });
});