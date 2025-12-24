import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import { DemoMetadataEditor } from '../../../src/components/DemoMetadata';
import { demoMetadataService } from '../../../src/services/demoMetadataService';

// Mock the service
vi.mock('../../../src/services/demoMetadataService');

describe('DemoMetadataEditor', () => {
  const mockProps = {
    demoId: 'demo1.dm2',
    filename: 'demo1.dm2',
    duration: 123.45,
    mapName: 'q2dm1',
    onSave: vi.fn(),
    onClose: vi.fn()
  };

  beforeEach(() => {
    vi.clearAllMocks();
    (demoMetadataService.getMetadata as vi.Mock).mockReturnValue({
      id: 'demo1.dm2',
      tags: []
    });
  });

  test('renders with initial props', () => {
    render(<DemoMetadataEditor {...mockProps} />);
    expect(screen.getByText('demo1.dm2')).toBeInTheDocument();
    expect(screen.getByText('q2dm1')).toBeInTheDocument();
    expect(screen.getByText('123.45s')).toBeInTheDocument();
  });

  test('loads existing metadata', () => {
    (demoMetadataService.getMetadata as vi.Mock).mockReturnValue({
      id: 'demo1.dm2',
      customName: 'Existing Name',
      description: 'Existing Desc',
      tags: ['tag1']
    });

    render(<DemoMetadataEditor {...mockProps} />);

    expect(screen.getByDisplayValue('Existing Name')).toBeInTheDocument();
    expect(screen.getByDisplayValue('Existing Desc')).toBeInTheDocument();
    expect(screen.getByText('tag1')).toBeInTheDocument();
  });

  test('updates fields and saves', () => {
    render(<DemoMetadataEditor {...mockProps} />);

    const nameInput = screen.getByLabelText('Custom Name:');
    fireEvent.change(nameInput, { target: { value: 'New Name' } });

    const descInput = screen.getByLabelText('Description:');
    fireEvent.change(descInput, { target: { value: 'New Desc' } });

    const saveBtn = screen.getByText('Save');
    fireEvent.click(saveBtn);

    expect(demoMetadataService.saveMetadata).toHaveBeenCalledWith(expect.objectContaining({
      id: 'demo1.dm2',
      customName: 'New Name',
      description: 'New Desc'
    }));
    expect(mockProps.onSave).toHaveBeenCalled();
  });

  test('adds and removes tags', () => {
    render(<DemoMetadataEditor {...mockProps} />);

    const tagInput = screen.getByPlaceholderText('Add tag (Enter)');
    const addBtn = screen.getByText('+');

    // Add tag via button
    fireEvent.change(tagInput, { target: { value: 'tag1' } });
    fireEvent.click(addBtn);
    expect(screen.getByText('tag1')).toBeInTheDocument();

    // Add tag via Enter
    fireEvent.change(tagInput, { target: { value: 'tag2' } });
    fireEvent.keyDown(tagInput, { key: 'Enter' });
    expect(screen.getByText('tag2')).toBeInTheDocument();

    // Remove tag
    const removeBtn = screen.getByLabelText('Remove tag tag1');
    fireEvent.click(removeBtn);
    expect(screen.queryByText('tag1')).not.toBeInTheDocument();
  });

  test('closes on cancel', () => {
    render(<DemoMetadataEditor {...mockProps} />);
    fireEvent.click(screen.getByText('Cancel'));
    expect(mockProps.onClose).toHaveBeenCalled();
  });
});
