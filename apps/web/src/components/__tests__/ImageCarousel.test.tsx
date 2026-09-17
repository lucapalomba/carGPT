import { describe, it, expect, afterEach, vi } from 'vitest';
import { render, screen, fireEvent, cleanup } from '@testing-library/react';

import { Provider } from '../ui/provider.js';
import ImageCarousel from '../ImageCarousel.js';

const images = [
  { url: 'https://example.com/1.jpg', thumbnailUrl: 'https://example.com/1t.jpg', source: 'a' },
  { url: 'https://example.com/2.jpg' },
  { url: 'https://example.com/3.jpg' },
];

const renderImages = (imgs: unknown) =>
  render(
    <Provider>
      <ImageCarousel images={imgs as typeof images} />
    </Provider>
  );

const renderCarousel = () => renderImages(images);

/** The visible slide is the only <img> with a "Car image N of M" alt. */
const currentSlide = (index: number, total = images.length) =>
  screen.getByAltText(`Car image ${index} of ${total}`);

describe('ImageCarousel', () => {
  afterEach(() => cleanup());

  describe('empty state', () => {
    it('shows the placeholder when there are no images', () => {
      renderImages([]);
      expect(screen.getByText('No images available')).toBeInTheDocument();
      expect(screen.queryByRole('group')).toBeNull();
    });

    it('shows the placeholder when images is undefined', () => {
      renderImages(undefined);
      expect(screen.getByText('No images available')).toBeInTheDocument();
    });

    // The keydown effect is registered before the empty-state early return,
    // so the handlers must stay inert when there is nothing to navigate.
    it('ignores arrow keys on an empty carousel', () => {
      renderImages([]);
      expect(() => fireEvent.keyDown(document, { key: 'ArrowRight' })).not.toThrow();
      expect(screen.getByText('No images available')).toBeInTheDocument();
    });

    it('ignores arrow keys when images is undefined', () => {
      renderImages(undefined);
      expect(() => fireEvent.keyDown(document, { key: 'ArrowLeft' })).not.toThrow();
      expect(screen.getByText('No images available')).toBeInTheDocument();
    });
  });

  describe('single image', () => {
    it('renders the slide without navigation controls', () => {
      renderImages([images[0]]);
      expect(currentSlide(1, 1)).toHaveAttribute('src', images[0].url);
      expect(screen.queryByLabelText('Next image')).toBeNull();
      expect(screen.queryByLabelText('Previous image')).toBeNull();
      expect(screen.queryByRole('tablist')).toBeNull();
    });
  });

  describe('navigation buttons', () => {
    it('starts on the first image', () => {
      renderCarousel();
      expect(currentSlide(1)).toHaveAttribute('src', images[0].url);
      expect(screen.getByRole('group')).toHaveAttribute('aria-label', 'Image carousel 1 of 3');
    });

    it('advances to the next image', () => {
      renderCarousel();
      fireEvent.click(screen.getByLabelText('Next image'));
      expect(currentSlide(2)).toHaveAttribute('src', images[1].url);
      expect(screen.getByRole('group')).toHaveAttribute('aria-label', 'Image carousel 2 of 3');
    });

    it('wraps around when advancing past the last image', () => {
      renderCarousel();
      const next = screen.getByLabelText('Next image');
      fireEvent.click(next);
      fireEvent.click(next);
      fireEvent.click(next);
      expect(currentSlide(1)).toHaveAttribute('src', images[0].url);
    });

    it('wraps backwards when going before the first image', () => {
      renderCarousel();
      fireEvent.click(screen.getByLabelText('Previous image'));
      expect(currentSlide(3)).toHaveAttribute('src', images[2].url);
    });

    it('navigates with Enter and Space on the buttons', () => {
      renderCarousel();
      fireEvent.keyDown(screen.getByLabelText('Next image'), { key: 'Enter' });
      expect(currentSlide(2)).toBeInTheDocument();

      fireEvent.keyDown(screen.getByLabelText('Next image'), { key: ' ' });
      expect(currentSlide(3)).toBeInTheDocument();

      fireEvent.keyDown(screen.getByLabelText('Previous image'), { key: 'Enter' });
      expect(currentSlide(2)).toBeInTheDocument();
    });

    it('ignores unrelated keys on the buttons', () => {
      renderCarousel();
      fireEvent.keyDown(screen.getByLabelText('Next image'), { key: 'Tab' });
      expect(currentSlide(1)).toBeInTheDocument();
    });
  });

  describe('keyboard navigation on the document', () => {
    it('moves forward and backward with the arrow keys', () => {
      renderCarousel();
      fireEvent.keyDown(document, { key: 'ArrowRight' });
      expect(currentSlide(2)).toBeInTheDocument();

      fireEvent.keyDown(document, { key: 'ArrowLeft' });
      expect(currentSlide(1)).toBeInTheDocument();

      // ArrowLeft from the first slide wraps to the last
      fireEvent.keyDown(document, { key: 'ArrowLeft' });
      expect(currentSlide(3)).toBeInTheDocument();
    });

    it('ignores other keys', () => {
      renderCarousel();
      fireEvent.keyDown(document, { key: 'Escape' });
      expect(currentSlide(1)).toBeInTheDocument();
    });

    it('removes the document listener on unmount', () => {
      const removeSpy = vi.spyOn(document, 'removeEventListener');
      const { unmount } = renderCarousel();

      unmount();

      expect(removeSpy).toHaveBeenCalledWith('keydown', expect.any(Function));
      removeSpy.mockRestore();

      // After unmount the handler must be inert: this would throw if it still ran
      fireEvent.keyDown(document, { key: 'ArrowRight' });
      expect(screen.queryByAltText('Car image 2 of 3')).toBeNull();
    });
  });

  describe('navigation dots', () => {
    it('renders one dot per image and marks the active one', () => {
      renderCarousel();
      const dots = screen.getAllByRole('tab');
      expect(dots).toHaveLength(3);
      expect(dots[0]).toHaveAttribute('aria-selected', 'true');
      expect(dots[1]).toHaveAttribute('aria-selected', 'false');
    });

    it('jumps to the clicked dot', () => {
      renderCarousel();
      fireEvent.click(screen.getByLabelText('Go to image 3'));
      expect(currentSlide(3)).toHaveAttribute('src', images[2].url);
      expect(screen.getByLabelText('Go to image 3')).toHaveAttribute('aria-selected', 'true');
    });

    it('keeps the active dot out of the tab order', () => {
      renderCarousel();
      expect(screen.getByLabelText('Go to image 1')).toHaveAttribute('tabindex', '-1');
      expect(screen.getByLabelText('Go to image 2')).toHaveAttribute('tabindex', '0');
    });
  });
});
