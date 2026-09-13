import React, { createContext, useContext, useState, useEffect } from 'react';

interface PrinterDevice {
  name: string;
  isDefault: boolean;
  displayName?: string;
}

interface PrinterContextType {
  printers: PrinterDevice[];
  selectedPrinter: string;
  setSelectedPrinter: (name: string) => void;
  paperSize: '80mm' | '58mm' | 'A4' | 'A5';
  setPaperSize: (size: '80mm' | '58mm' | 'A4' | 'A5') => void;
  silentPrint: boolean;
  setSilentPrint: (silent: boolean) => void;
  printReceiptHtml: (html: string) => Promise<boolean>;
  refreshPrinters: () => Promise<void>;
}

const PrinterContext = createContext<PrinterContextType | undefined>(undefined);

export const PrinterProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [printers, setPrinters] = useState<PrinterDevice[]>([]);
  const [selectedPrinter, setSelectedPrinterState] = useState<string>(
    localStorage.getItem('ems_printer_name') || ''
  );
  const [paperSize, setPaperSizeState] = useState<'80mm' | '58mm' | 'A4' | 'A5'>(
    (localStorage.getItem('ems_paper_size') as any) || '80mm'
  );
  const [silentPrint, setSilentPrintState] = useState<boolean>(
    localStorage.getItem('ems_silent_print') !== 'false'
  );

  const refreshPrinters = async () => {
    if (window.electronAPI) {
      try {
        const list = await window.electronAPI.getPrinters();
        setPrinters(list);
        if (!selectedPrinter) {
          const defaultP = list.find((p) => p.isDefault) || list[0];
          if (defaultP) {
            setSelectedPrinterState(defaultP.name);
            localStorage.setItem('ems_printer_name', defaultP.name);
          }
        }
      } catch (e) {
        console.error('Failed to query printers', e);
      }
    }
  };

  useEffect(() => {
    refreshPrinters();
  }, []);

  const setSelectedPrinter = (name: string) => {
    setSelectedPrinterState(name);
    localStorage.setItem('ems_printer_name', name);
  };

  const setPaperSize = (size: '80mm' | '58mm' | 'A4' | 'A5') => {
    setPaperSizeState(size);
    localStorage.setItem('ems_paper_size', size);
  };

  const setSilentPrint = (silent: boolean) => {
    setSilentPrintState(silent);
    localStorage.setItem('ems_silent_print', String(silent));
  };

  const printReceiptHtml = async (html: string): Promise<boolean> => {
    if (window.electronAPI) {
      try {
        const result = await window.electronAPI.printReceipt({
          html,
          silent: silentPrint,
          printerName: selectedPrinter,
          pageSize: paperSize,
        });
        return result.success;
      } catch (e) {
        console.error('Direct print failed', e);
        // Fallback to standard window.print() if IPC failed
        const printWindow = window.open('', '_blank');
        if (printWindow) {
          printWindow.document.write(html);
          printWindow.document.close();
          printWindow.print();
          return true;
        }
        return false;
      }
    } else {
      // Browser preview fallback
      const printWindow = window.open('', '_blank');
      if (printWindow) {
        printWindow.document.write(html);
        printWindow.document.close();
        printWindow.print();
        return true;
      }
      return false;
    }
  };

  return (
    <PrinterContext.Provider
      value={{
        printers,
        selectedPrinter,
        setSelectedPrinter,
        paperSize,
        setPaperSize,
        silentPrint,
        setSilentPrint,
        printReceiptHtml,
        refreshPrinters,
      }}
    >
      {children}
    </PrinterContext.Provider>
  );
};

export const usePrinter = () => {
  const context = useContext(PrinterContext);
  if (!context) throw new Error('usePrinter must be used within a PrinterProvider');
  return context;
};
