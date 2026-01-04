import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import LoadingSpinner from '../../components/common/LoadingSpinner';

describe('LoadingSpinner Component', () => {
  describe('Rendering', () => {
    it('should render without crashing', () => {
      render(<LoadingSpinner />);
      const spinner = document.querySelector('.spinner');
      expect(spinner).toBeInTheDocument();
    });

    it('should render with default size (md)', () => {
      render(<LoadingSpinner />);
      const spinner = document.querySelector('.spinner');
      expect(spinner.style.width).toBe('1.5rem');
      expect(spinner.style.height).toBe('1.5rem');
    });
  });

  describe('Sizes', () => {
    it('should render small spinner', () => {
      render(<LoadingSpinner size="sm" />);
      const spinner = document.querySelector('.spinner');
      expect(spinner.style.width).toBe('1rem');
      expect(spinner.style.height).toBe('1rem');
    });

    it('should render medium spinner', () => {
      render(<LoadingSpinner size="md" />);
      const spinner = document.querySelector('.spinner');
      expect(spinner.style.width).toBe('1.5rem');
      expect(spinner.style.height).toBe('1.5rem');
    });

    it('should render large spinner', () => {
      render(<LoadingSpinner size="lg" />);
      const spinner = document.querySelector('.spinner');
      expect(spinner.style.width).toBe('2rem');
      expect(spinner.style.height).toBe('2rem');
    });

    it('should render extra large spinner', () => {
      render(<LoadingSpinner size="xl" />);
      const spinner = document.querySelector('.spinner');
      expect(spinner.style.width).toBe('3rem');
      expect(spinner.style.height).toBe('3rem');
    });
  });

  describe('Full Screen Mode', () => {
    it('should render in full screen mode', () => {
      const { container } = render(<LoadingSpinner fullScreen={true} />);
      const wrapper = container.firstChild;

      expect(wrapper.style.height).toBe('100vh');
      expect(wrapper.style.width).toBe('100%');
      expect(wrapper.style.display).toBe('flex');
      expect(wrapper.style.alignItems).toBe('center');
      expect(wrapper.style.justifyContent).toBe('center');
    });

    it('should not render full screen wrapper when fullScreen is false', () => {
      const { container } = render(<LoadingSpinner fullScreen={false} />);
      const wrapper = container.firstChild;

      expect(wrapper.className).toBe('spinner');
      expect(wrapper.style.height).not.toBe('100vh');
    });

    it('should apply correct size in full screen mode', () => {
      const { container } = render(<LoadingSpinner fullScreen={true} size="xl" />);
      const spinner = container.querySelector('.spinner');

      expect(spinner.style.width).toBe('3rem');
      expect(spinner.style.height).toBe('3rem');
    });
  });
});
