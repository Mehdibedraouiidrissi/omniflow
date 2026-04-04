// =============================================================================
// Button Component Tests
// =============================================================================

import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import { Button, buttonVariants } from '@/components/ui/button';

// Mock cn utility
jest.mock('@/lib/utils', () => ({
  cn: (...inputs: unknown[]) => inputs.filter(Boolean).join(' '),
}));

describe('Button', () => {
  // =========================================================================
  // Rendering
  // =========================================================================

  it('renders with default variant and size', () => {
    render(<Button>Click me</Button>);

    const button = screen.getByRole('button', { name: /click me/i });
    expect(button).toBeInTheDocument();
    expect(button.tagName).toBe('BUTTON');
  });

  it('renders children correctly', () => {
    render(<Button>Submit Form</Button>);

    expect(screen.getByText('Submit Form')).toBeInTheDocument();
  });

  it('renders with custom className', () => {
    render(<Button className="custom-class">Styled</Button>);

    const button = screen.getByRole('button');
    expect(button.className).toContain('custom-class');
  });

  // =========================================================================
  // Variants
  // =========================================================================

  it('applies default variant classes', () => {
    render(<Button variant="default">Default</Button>);

    const button = screen.getByRole('button');
    expect(button.className).toContain('bg-primary');
  });

  it('applies destructive variant classes', () => {
    render(<Button variant="destructive">Delete</Button>);

    const button = screen.getByRole('button');
    expect(button.className).toContain('bg-destructive');
  });

  it('applies outline variant classes', () => {
    render(<Button variant="outline">Outline</Button>);

    const button = screen.getByRole('button');
    expect(button.className).toContain('border');
  });

  it('applies secondary variant classes', () => {
    render(<Button variant="secondary">Secondary</Button>);

    const button = screen.getByRole('button');
    expect(button.className).toContain('bg-secondary');
  });

  it('applies ghost variant classes', () => {
    render(<Button variant="ghost">Ghost</Button>);

    const button = screen.getByRole('button');
    expect(button.className).toContain('hover:bg-accent');
  });

  it('applies link variant classes', () => {
    render(<Button variant="link">Link</Button>);

    const button = screen.getByRole('button');
    expect(button.className).toContain('underline-offset-4');
  });

  // =========================================================================
  // Sizes
  // =========================================================================

  it('applies default size classes', () => {
    render(<Button size="default">Default Size</Button>);

    const button = screen.getByRole('button');
    expect(button.className).toContain('h-10');
    expect(button.className).toContain('px-4');
  });

  it('applies sm size classes', () => {
    render(<Button size="sm">Small</Button>);

    const button = screen.getByRole('button');
    expect(button.className).toContain('h-9');
    expect(button.className).toContain('px-3');
  });

  it('applies lg size classes', () => {
    render(<Button size="lg">Large</Button>);

    const button = screen.getByRole('button');
    expect(button.className).toContain('h-11');
    expect(button.className).toContain('px-8');
  });

  it('applies icon size classes', () => {
    render(<Button size="icon">X</Button>);

    const button = screen.getByRole('button');
    expect(button.className).toContain('h-10');
    expect(button.className).toContain('w-10');
  });

  // =========================================================================
  // Behavior
  // =========================================================================

  it('handles click events', () => {
    const handleClick = jest.fn();
    render(<Button onClick={handleClick}>Clickable</Button>);

    fireEvent.click(screen.getByRole('button'));

    expect(handleClick).toHaveBeenCalledTimes(1);
  });

  it('is disabled when disabled prop is set', () => {
    const handleClick = jest.fn();
    render(
      <Button disabled onClick={handleClick}>
        Disabled
      </Button>,
    );

    const button = screen.getByRole('button');
    expect(button).toBeDisabled();

    fireEvent.click(button);
    expect(handleClick).not.toHaveBeenCalled();
  });

  it('supports type attribute', () => {
    render(<Button type="submit">Submit</Button>);

    expect(screen.getByRole('button')).toHaveAttribute('type', 'submit');
  });

  // =========================================================================
  // asChild
  // =========================================================================

  it('renders as Slot when asChild is true', () => {
    render(
      <Button asChild>
        <a href="/test">Link Button</a>
      </Button>,
    );

    const link = screen.getByRole('link', { name: /link button/i });
    expect(link).toBeInTheDocument();
    expect(link.tagName).toBe('A');
    expect(link).toHaveAttribute('href', '/test');
  });

  // =========================================================================
  // Ref forwarding
  // =========================================================================

  it('forwards ref to the button element', () => {
    const ref = React.createRef<HTMLButtonElement>();
    render(<Button ref={ref}>Ref Button</Button>);

    expect(ref.current).toBeInstanceOf(HTMLButtonElement);
    expect(ref.current?.textContent).toBe('Ref Button');
  });

  // =========================================================================
  // buttonVariants utility
  // =========================================================================

  it('exports buttonVariants function', () => {
    expect(typeof buttonVariants).toBe('function');

    const classes = buttonVariants({ variant: 'default', size: 'default' });
    expect(typeof classes).toBe('string');
    expect(classes.length).toBeGreaterThan(0);
  });

  it('generates different classes for different variants', () => {
    const defaultClasses = buttonVariants({ variant: 'default' });
    const destructiveClasses = buttonVariants({ variant: 'destructive' });

    expect(defaultClasses).not.toBe(destructiveClasses);
  });

  // =========================================================================
  // Accessibility
  // =========================================================================

  it('supports aria-label', () => {
    render(<Button aria-label="Close dialog">X</Button>);

    expect(screen.getByLabelText('Close dialog')).toBeInTheDocument();
  });

  it('supports aria-disabled', () => {
    render(<Button aria-disabled="true">Aria Disabled</Button>);

    expect(screen.getByRole('button')).toHaveAttribute('aria-disabled', 'true');
  });

  // =========================================================================
  // Display name
  // =========================================================================

  it('has correct displayName', () => {
    expect(Button.displayName).toBe('Button');
  });
});
