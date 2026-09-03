import '@testing-library/jest-dom/vitest';

// next-themes (used by the Chakra color-mode provider) calls matchMedia on
// mount; jsdom does not implement it, so provide a minimal stub.
if (typeof window !== 'undefined' && !window.matchMedia) {
  window.matchMedia = (query: string): MediaQueryList => ({
    matches: false,
    media: query,
    onchange: null,
    addListener: () => {},
    removeListener: () => {},
    addEventListener: () => {},
    removeEventListener: () => {},
    dispatchEvent: () => false,
  }) as MediaQueryList;
}

// jsdom does not implement scrollIntoView; ResultsContainer calls it on mount.
if (typeof Element !== 'undefined' && !Element.prototype.scrollIntoView) {
  Element.prototype.scrollIntoView = () => {};
}

// jsdom does not implement scrollTo either (some Chakra transitions use it).
if (typeof window !== 'undefined' && !window.scrollTo) {
  window.scrollTo = () => {};
}