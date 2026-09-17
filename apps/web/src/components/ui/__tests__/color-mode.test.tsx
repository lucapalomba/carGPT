import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { render, screen, fireEvent, waitFor, cleanup } from '@testing-library/react';
import type { ReactNode } from 'react';

import { Provider } from '../provider.js';
import {
  ColorModeProvider,
  ColorModeButton,
  ColorModeIcon,
  LightMode,
  DarkMode,
  useColorMode,
  useColorModeValue,
} from '../color-mode.js';

/** Reads the current mode out of the hook and exposes the three actions. */
const Probe = () => {
  const { colorMode, setColorMode, toggleColorMode } = useColorMode();
  return (
    <div>
      <span data-testid="mode">{colorMode}</span>
      <button onClick={toggleColorMode}>toggle</button>
      <button onClick={() => setColorMode('dark')}>set dark</button>
      <button onClick={() => setColorMode('light')}>set light</button>
    </div>
  );
};

/** Reports which of the two values useColorModeValue picked. */
const ValueProbe = () => (
  <span data-testid="value">{useColorModeValue('light-value', 'dark-value')}</span>
);

const renderInProvider = (ui: ReactNode) =>
  render(<ColorModeProvider>{ui}</ColorModeProvider>);

const currentMode = () => screen.getByTestId('mode').textContent;

describe('color-mode', () => {
  beforeEach(() => {
    // next-themes persists the choice; a leftover key would leak between tests
    window.localStorage.clear();
    document.documentElement.className = '';
  });

  afterEach(() => cleanup());

  describe('ColorModeProvider', () => {
    it('renders its children', () => {
      renderInProvider(<span>themed content</span>);
      expect(screen.getByText('themed content')).toBeInTheDocument();
    });

    it('resolves to light when the system prefers no dark scheme', async () => {
      renderInProvider(<Probe />);
      await waitFor(() => expect(currentMode()).toBe('light'));
    });
  });

  describe('useColorMode', () => {
    it('toggles light -> dark -> light', async () => {
      renderInProvider(<Probe />);
      await waitFor(() => expect(currentMode()).toBe('light'));

      fireEvent.click(screen.getByText('toggle'));
      await waitFor(() => expect(currentMode()).toBe('dark'));

      fireEvent.click(screen.getByText('toggle'));
      await waitFor(() => expect(currentMode()).toBe('light'));
    });

    it('sets an explicit mode', async () => {
      renderInProvider(<Probe />);
      await waitFor(() => expect(currentMode()).toBe('light'));

      fireEvent.click(screen.getByText('set dark'));
      await waitFor(() => expect(currentMode()).toBe('dark'));

      fireEvent.click(screen.getByText('set light'));
      await waitFor(() => expect(currentMode()).toBe('light'));
    });

    it('applies the theme class to the document element', async () => {
      renderInProvider(<Probe />);
      await waitFor(() => expect(currentMode()).toBe('light'));

      fireEvent.click(screen.getByText('set dark'));
      await waitFor(() => expect(document.documentElement.classList.contains('dark')).toBe(true));
    });
  });

  describe('useColorModeValue', () => {
    it('picks the light value in light mode', async () => {
      renderInProvider(
        <>
          <Probe />
          <ValueProbe />
        </>
      );
      await waitFor(() => expect(currentMode()).toBe('light'));
      expect(screen.getByTestId('value')).toHaveTextContent('light-value');
    });

    it('picks the dark value in dark mode', async () => {
      renderInProvider(
        <>
          <Probe />
          <ValueProbe />
        </>
      );
      await waitFor(() => expect(currentMode()).toBe('light'));

      fireEvent.click(screen.getByText('set dark'));
      await waitFor(() => expect(screen.getByTestId('value')).toHaveTextContent('dark-value'));
    });
  });

  describe('ColorModeIcon', () => {
    it('renders a different icon per mode', async () => {
      const { container } = renderInProvider(
        <>
          <Probe />
          <ColorModeIcon />
        </>
      );
      await waitFor(() => expect(currentMode()).toBe('light'));
      const lightIcon = container.querySelector('svg')?.innerHTML;

      fireEvent.click(screen.getByText('set dark'));
      await waitFor(() => expect(currentMode()).toBe('dark'));
      const darkIcon = container.querySelector('svg')?.innerHTML;

      expect(lightIcon).toBeTruthy();
      expect(darkIcon).toBeTruthy();
      expect(darkIcon).not.toBe(lightIcon);
    });
  });

  describe('ColorModeButton', () => {
    it('toggles the mode when clicked', async () => {
      render(<Provider>{<ColorModeProvider><Probe /><ColorModeButton /></ColorModeProvider>}</Provider>);
      await waitFor(() => expect(currentMode()).toBe('light'));

      // ClientOnly swaps the Skeleton fallback for the button after mount
      const button = await screen.findByLabelText('Toggle color mode');
      fireEvent.click(button);

      await waitFor(() => expect(currentMode()).toBe('dark'));
    });
  });

  describe('LightMode / DarkMode', () => {
    it('tags its children with the chakra-theme class it represents', () => {
      render(<Provider><LightMode>light child</LightMode></Provider>);
      const el = screen.getByText('light child');
      expect(el).toHaveClass('chakra-theme', 'light');
    });

    it('tags dark content as dark', () => {
      render(<Provider><DarkMode>dark child</DarkMode></Provider>);
      const el = screen.getByText('dark child');
      expect(el).toHaveClass('chakra-theme', 'dark');
    });
  });
});
