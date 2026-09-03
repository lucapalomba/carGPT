import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { render, screen, fireEvent, waitFor, cleanup } from '@testing-library/react';
import userEvent from '@testing-library/user-event';

vi.mock('react-hot-toast', () => ({
  toast: { success: vi.fn(), error: vi.fn() },
  Toaster: () => null,
}));

vi.mock('../services/CarSearchService.js', () => ({
  carSearchService: {
    findCars: vi.fn(),
    refineSearch: vi.fn(),
    resetConversation: vi.fn().mockResolvedValue(undefined),
    validateSearchRequirements: vi.fn().mockReturnValue(true),
    validateFeedback: vi.fn().mockReturnValue(true),
    updateConversationData: vi.fn().mockResolvedValue(undefined),
  },
}));

vi.mock('../components/ui/confirm-dialog.js', () => ({
  confirm: vi.fn(),
}));

import { carSearchService } from '../services/CarSearchService.js';
import { confirm } from '../components/ui/confirm-dialog.js';
import { Provider } from '../components/ui/provider.js';
import App from '../App.js';
import type { Car } from '../hooks/useCarSearch.js';

const sampleCars: Car[] = [
  {
    make: 'Tesla',
    model: 'Model 3',
    precise_model: 'Long Range',
    year: 2023,
    type: 'Sedan',
    price: '$42,000',
    strengths: ['Fast', 'Efficient'],
    weaknesses: ['Pricey'],
    reason: 'Great EV for the money',
    pinned: false,
    percentage: 85,
    vehicle_properties: {
      range: { value: '358 mi', translatedLabel: 'Range' },
    },
    images: [{ url: 'https://example.com/tesla.jpg' }],
  } as unknown as Car,
  {
    make: 'BMW',
    model: 'i4',
    precise_model: 'eDrive40',
    year: 2024,
    type: 'Sedan',
    price: '$55,000',
    strengths: ['Refined'],
    weaknesses: ['Heavy'],
    reason: 'Premium EV sport sedan',
    pinned: false,
    percentage: 60,
    vehicle_properties: {},
    images: [],
  } as unknown as Car,
];

const renderApp = () =>
  render(
    <Provider>
      <App />
    </Provider>
  );

describe('App', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    (carSearchService.resetConversation as any).mockResolvedValue(undefined);
    (carSearchService.updateConversationData as any).mockResolvedValue(undefined);
  });

  afterEach(() => {
    cleanup();
  });

  it('renders the search form on first load', () => {
    renderApp();
    expect(screen.getByRole('heading', { name: /CarGPT/i })).toBeInTheDocument();
    expect(screen.getByText(/Find my perfect cars/i)).toBeInTheDocument();
  });

  it('submits the form, calls findCars and shows the results view', async () => {
    const user = userEvent.setup();
    (carSearchService.findCars as any).mockResolvedValue({
      cars: sampleCars,
      analysis: 'Initial analysis of your needs',
    });

    renderApp();

    const textarea = screen.getByRole('textbox', { name: /requirements/i });
    await user.type(textarea, 'I need a family electric car with good range');
    await user.click(screen.getAllByRole('button', { name: /Find my perfect cars/i })[0]);

    await waitFor(() =>
      expect(screen.getByRole('heading', { name: /Your ideal cars/i })).toBeInTheDocument()
    );

    expect(carSearchService.findCars).toHaveBeenCalledTimes(1);
    expect(screen.getByRole('heading', { name: /Initial Analysis/i })).toBeInTheDocument();
    expect(screen.getByText('Tesla Model 3')).toBeInTheDocument();
    expect(screen.getByText('BMW i4')).toBeInTheDocument();
  });

  it('pins a car and refines the results keeping the pinned car', async () => {
    const user = userEvent.setup();
    (carSearchService.findCars as any).mockResolvedValue({
      cars: sampleCars,
      analysis: 'Initial analysis',
    });
    const refinedCars: Car[] = [
      { ...sampleCars[0], pinned: true } as unknown as Car,
      { make: 'Audi', model: 'e-tron', precise_model: 'GT', year: 2024, type: 'SUV', price: '$70,000', strengths: ['Luxurious'], weaknesses: ['Cost'], reason: 'Luxury EV', pinned: false, percentage: 55, vehicle_properties: {}, images: [] } as unknown as Car,
    ];
    (carSearchService.refineSearch as any).mockResolvedValue({
      cars: refinedCars,
      analysis: 'Refined analysis',
    });

    renderApp();

    await user.type(screen.getByRole('textbox', { name: /requirements/i }), 'I need a family electric car with good range');
    await user.click(screen.getAllByRole('button', { name: /Find my perfect cars/i })[0]);
    await waitFor(() => expect(screen.getByText('Tesla Model 3')).toBeInTheDocument());

    const pinButtons = screen.getAllByRole('button', { name: /Pin car/i });
    await user.click(pinButtons[0]);

    await user.type(screen.getByRole('textbox', { name: /Enter feedback to refine search results/i }), 'something cheaper');
    await user.click(screen.getByRole('button', { name: /Submit feedback to refine search results/i }));

    await waitFor(() => expect(screen.getByRole('heading', { name: /Refinement #1/i })).toBeInTheDocument());
    expect(carSearchService.refineSearch).toHaveBeenCalledWith(
      'something cheaper',
      expect.arrayContaining([expect.objectContaining({ make: 'Tesla' })]),
      expect.any(String)
    );
  });

  it('starts a new search after confirming', async () => {
    const user = userEvent.setup();
    (confirm as any).mockResolvedValue(true);
    (carSearchService.findCars as any).mockResolvedValue({
      cars: sampleCars,
      analysis: 'Initial analysis',
    });

    renderApp();

    await user.type(screen.getByRole('textbox', { name: /requirements/i }), 'I need a family electric car with good range');
    await user.click(screen.getAllByRole('button', { name: /Find my perfect cars/i })[0]);
    await waitFor(() => expect(screen.getByRole('heading', { name: /Your ideal cars/i })).toBeInTheDocument());

    await user.click(screen.getByRole('button', { name: /New Search/i }));

    await waitFor(() =>
      expect(screen.getByRole('heading', { name: /CarGPT/i })).toBeInTheDocument()
    );
    expect(carSearchService.resetConversation).toHaveBeenCalled();
  });

  it('shows a toast when refining with empty feedback', async () => {
    const { toast } = await import('react-hot-toast');
    const user = userEvent.setup();
    (carSearchService.findCars as any).mockResolvedValue({
      cars: sampleCars,
      analysis: 'Initial analysis',
    });

    renderApp();

    await user.type(screen.getByRole('textbox', { name: /requirements/i }), 'I need a family electric car with good range');
    await user.click(screen.getAllByRole('button', { name: /Find my perfect cars/i })[0]);
    await waitFor(() => expect(screen.getByRole('heading', { name: /Your ideal cars/i })).toBeInTheDocument());

    await user.click(screen.getByRole('button', { name: /Submit feedback to refine search results/i }));

    expect(toast.error).toHaveBeenCalledWith('Please enter some feedback to refine the search.');
  });

  it('blocks submission of a too-short requirements string', async () => {
    const { toast } = await import('react-hot-toast');
    const user = userEvent.setup();
    renderApp();

    await user.type(screen.getByRole('textbox', { name: /requirements/i }), 'short');
    fireEvent.submit(screen.getByRole('textbox', { name: /requirements/i }).closest('form')!);

    expect(toast.error).toHaveBeenCalledWith(
      'Please describe your requirements in more detail (at least 10 characters)'
    );
    expect(carSearchService.findCars).not.toHaveBeenCalled();
  });
});