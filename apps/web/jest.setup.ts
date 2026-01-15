import '@testing-library/jest-dom';

const originalConsoleError = console.error;
console.error = (...args: unknown[]) => {
  const message = args[0];
  if (typeof message === 'string' && message.includes('not wrapped in act')) {
    return;
  }
  originalConsoleError(...args);
};

Object.defineProperty(window, 'matchMedia', {
  writable: true,
  value: (query: string) => ({
    matches: false,
    media: query,
    onchange: null,
    addListener: () => undefined,
    removeListener: () => undefined,
    addEventListener: () => undefined,
    removeEventListener: () => undefined,
    dispatchEvent: () => false,
  }),
});

Object.defineProperty(window, 'scrollTo', {
  writable: true,
  value: () => undefined,
});

Object.defineProperty(HTMLElement.prototype, 'scrollIntoView', {
  writable: true,
  value: () => undefined,
});

if (!HTMLElement.prototype.hasPointerCapture) {
  // eslint-disable-next-line no-extend-native
  HTMLElement.prototype.hasPointerCapture = () => false;
}

if (!HTMLElement.prototype.setPointerCapture) {
  // eslint-disable-next-line no-extend-native
  HTMLElement.prototype.setPointerCapture = () => undefined;
}

if (!HTMLElement.prototype.releasePointerCapture) {
  // eslint-disable-next-line no-extend-native
  HTMLElement.prototype.releasePointerCapture = () => undefined;
}

class ResizeObserver {
  observe() {}
  unobserve() {}
  disconnect() {}
}

Object.defineProperty(window, 'ResizeObserver', {
  writable: true,
  value: ResizeObserver,
});

Object.defineProperty(global, 'ResizeObserver', {
  writable: true,
  value: ResizeObserver,
});
