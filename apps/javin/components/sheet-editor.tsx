"use client";

import React, { useState, useCallback, useMemo } from 'react';
import { DataGrid, type DataGridProps, type Column } from 'react-data-grid';
import 'react-data-grid/lib/styles.css';
import { useTheme } from 'next-themes';
import { cn } from "@javin/shared/lib/utils/utils";

type SheetEditorProps = {
  content: string;
  onSaveContent: (content: string, hasChanges: boolean) => void;
  status: 'idle' | 'streaming' | 'error';
  isCurrentVersion: boolean;
  currentVersionIndex: number;
  suggestions: Array<{
    id: string;
    content: string;
    status: 'pending' | 'accepted' | 'rejected';
  }>;
};

interface Row {
  id: string;
  [key: string]: any;
}

function PureSheetEditor({ 
  content, 
  onSaveContent, 
  status, 
  isCurrentVersion, 
  currentVersionIndex, 
  suggestions 
}: SheetEditorProps) {
  const { theme } = useTheme();
  const [rows, setRows] = useState<Row[]>([]);
  const [columns, setColumns] = useState<Column<Row>[]>([]);
  const [isEditing, setIsEditing] = useState(false);

  // Parse CSV content into rows and columns
  const parseCSV = useCallback((csvContent: string) => {
    if (!csvContent.trim()) {
      setRows([]);
      setColumns([]);
      return;
    }

    const lines = csvContent.trim().split('\n');
    if (lines.length === 0) return;

    // Parse header row
    const headers = lines[0].split(',').map(header => header.trim().replace(/"/g, ''));
    
    // Create columns
    const newColumns: Column<Row>[] = headers.map((header, index) => ({
      key: `col_${index}`,
      name: header || `Column ${index + 1}`,
      resizable: true,
      sortable: true,
      minWidth: 100,
    }));

    // Parse data rows
    const newRows: Row[] = lines.slice(1).map((line, rowIndex) => {
      const values = line.split(',').map(value => value.trim().replace(/"/g, ''));
      const row: Row = { id: `row_${rowIndex}` };
      
      headers.forEach((_, colIndex) => {
        row[`col_${colIndex}`] = values[colIndex] || '';
      });
      
      return row;
    });

    setColumns(newColumns);
    setRows(newRows);
  }, []);

  // Convert rows back to CSV
  const convertToCSV = useCallback((rows: Row[], columns: Column<Row>[]) => {
    if (columns.length === 0) return '';
    
    const headers = columns.map(col => col.name);
    const csvRows = rows.map(row => 
      columns.map(col => `"${row[col.key] || ''}"`).join(',')
    );
    
    return [headers.join(','), ...csvRows].join('\n');
  }, []);

  // Initialize data when content changes
  React.useEffect(() => {
    parseCSV(content);
  }, [content, parseCSV]);

  // Handle row changes
  const handleRowsChange = useCallback((newRows: Row[]) => {
    setRows(newRows);
    setIsEditing(true);
    
    // Convert to CSV and save
    const csvContent = convertToCSV(newRows, columns);
    onSaveContent(csvContent, true);
  }, [columns, convertToCSV, onSaveContent]);

  // Handle column changes
  const handleColumnsChange = useCallback((newColumns: Column<Row>[]) => {
    setColumns(newColumns);
    setIsEditing(true);
    
    // Convert to CSV and save
    const csvContent = convertToCSV(rows, newColumns);
    onSaveContent(csvContent, true);
  }, [rows, convertToCSV, onSaveContent]);

  // Add new row
  const addRow = useCallback(() => {
    const newRow: Row = { id: `row_${Date.now()}` };
    columns.forEach(col => {
      newRow[col.key] = '';
    });
    
    const newRows = [...rows, newRow];
    handleRowsChange(newRows);
  }, [columns, rows, handleRowsChange]);

  // Add new column
  const addColumn = useCallback(() => {
    const newColumnKey = `col_${columns.length}`;
    const newColumn: Column<Row> = {
      key: newColumnKey,
      name: `Column ${columns.length + 1}`,
      resizable: true,
      sortable: true,
      minWidth: 100,
    };
    
    const newColumns = [...columns, newColumn];
    
    // Add empty values for new column to all existing rows
    const newRows = rows.map(row => ({
      ...row,
      [newColumnKey]: ''
    }));
    
    setColumns(newColumns);
    setRows(newRows);
    setIsEditing(true);
    
    const csvContent = convertToCSV(newRows, newColumns);
    onSaveContent(csvContent, true);
  }, [columns, rows, convertToCSV, onSaveContent]);

  // Delete row
  const deleteRow = useCallback((rowId: string) => {
    const newRows = rows.filter(row => row.id !== rowId);
    handleRowsChange(newRows);
  }, [rows, handleRowsChange]);

  // Delete column
  const deleteColumn = useCallback((columnKey: string) => {
    if (columns.length <= 1) return; // Don't delete the last column
    
    const newColumns = columns.filter(col => col.key !== columnKey);
    const newRows = rows.map(row => {
      const newRow = { ...row };
      delete newRow[columnKey];
      return newRow;
    });
    
    setColumns(newColumns);
    setRows(newRows);
    setIsEditing(true);
    
    const csvContent = convertToCSV(newRows, newColumns);
    onSaveContent(csvContent, true);
  }, [columns, rows, convertToCSV, onSaveContent]);

  const gridProps: DataGridProps<Row> = {
    columns,
    rows,
    onRowsChange: handleRowsChange,
    className: cn(
      "rdg-light", // Use light theme by default
      theme === 'dark' && "rdg-dark"
    ),
    style: { height: '100%', minHeight: '400px' },
    defaultColumnOptions: {
      resizable: true,
      sortable: true,
    },
  };

  return (
    <div className="h-full flex flex-col">
      {/* Toolbar */}
      <div className="flex items-center gap-2 p-3 border-b bg-muted/50">
        <button
          onClick={addRow}
          className="px-3 py-1.5 text-sm bg-primary text-primary-foreground rounded-md hover:bg-primary/90 transition-colors"
        >
          Add Row
        </button>
        <button
          onClick={addColumn}
          className="px-3 py-1.5 text-sm bg-primary text-primary-foreground rounded-md hover:bg-primary/90 transition-colors"
        >
          Add Column
        </button>
        <div className="flex-1" />
        <div className="text-sm text-muted-foreground">
          {rows.length} rows × {columns.length} columns
          {isEditing && <span className="ml-2 text-orange-500">• Unsaved changes</span>}
        </div>
      </div>

      {/* Data Grid */}
      <div className="flex-1 overflow-hidden">
        <DataGrid {...gridProps} />
      </div>

      {/* Suggestions */}
      {suggestions.length > 0 && (
        <div className="border-t bg-muted/30 p-3">
          <h4 className="text-sm font-medium mb-2">Suggestions</h4>
          <div className="space-y-2">
            {suggestions.map((suggestion) => (
              <div
                key={suggestion.id}
                className={cn(
                  "p-2 rounded-md text-sm",
                  suggestion.status === 'accepted' && "bg-green-100 text-green-800",
                  suggestion.status === 'rejected' && "bg-red-100 text-red-800",
                  suggestion.status === 'pending' && "bg-yellow-100 text-yellow-800"
                )}
              >
                {suggestion.content}
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

function areEqual(prevProps: SheetEditorProps, nextProps: SheetEditorProps) {
  return (
    prevProps.content === nextProps.content &&
    prevProps.status === nextProps.status &&
    prevProps.isCurrentVersion === nextProps.isCurrentVersion &&
    prevProps.currentVersionIndex === nextProps.currentVersionIndex &&
    JSON.stringify(prevProps.suggestions) === JSON.stringify(nextProps.suggestions)
  );
}

export default React.memo(PureSheetEditor, areEqual);

// Demo component for testing
export function SheetEditorDemo() {
  const [content, setContent] = useState(`Name,Age,City,Occupation
John Doe,30,New York,Developer
Jane Smith,25,San Francisco,Designer
Bob Johnson,35,Chicago,Manager`);

  const [suggestions] = useState([
    {
      id: '1',
      content: 'Consider adding a "Salary" column',
      status: 'pending' as const,
    },
    {
      id: '2',
      content: 'Add more sample data for testing',
      status: 'accepted' as const,
    },
  ]);

  const handleSaveContent = useCallback((newContent: string, hasChanges: boolean) => {
    setContent(newContent);
    console.log('Content saved:', { newContent, hasChanges });
  }, []);

  return (
    <div className="h-[600px] border rounded-lg">
      <SheetEditor
        content={content}
        onSaveContent={handleSaveContent}
        status="idle"
        isCurrentVersion={true}
        currentVersionIndex={0}
        suggestions={suggestions}
      />
    </div>
  );
}
