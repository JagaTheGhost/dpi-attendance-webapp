import { useState } from 'react';

export function useExportHub() {
  const [exportReportType, setExportReportType] = useState('logs');
  const [exportDateRange, setExportDateRange] = useState('today');
  const [exportStartDate, setExportStartDate] = useState(new Date().toISOString().slice(0, 10));
  const [exportEndDate, setExportEndDate] = useState(new Date().toISOString().slice(0, 10));
  
  const [exportEmployeeFilter, setExportEmployeeFilter] = useState('all');
  const [exportSelectedEmployee, setExportSelectedEmployee] = useState('');
  const [exportSelectedEmployeesGroup, setExportSelectedEmployeesGroup] = useState([]);
  const [exportGroupSearch, setExportGroupSearch] = useState('');
  const [exportSingleSearch, setExportSingleSearch] = useState('');
  const [hasInitializedGroup, setHasInitializedGroup] = useState(false);

  const [pdfThemeColor, setPdfThemeColor] = useState('blue');
  const [pdfCompanyName, setPdfCompanyName] = useState('DPI Attendance Systems');
  const [pdfComments, setPdfComments] = useState('Confidential. Generated from system logs.');
  const [pdfLogColumns, setPdfLogColumns] = useState({
    logId: true,
    empId: true,
    empName: true,
    direction: true,
    date: true,
    time: true
  });
  const [pdfTimesheetColumns, setPdfTimesheetColumns] = useState({
    empId: true,
    empName: true,
    daysPresent: true,
    punchesCount: true,
    totalHours: true,
    totalBreakHours: true,
    avgDailyHours: true,
    goalStatus: true
  });

  const [isSingleDropdownOpen, setIsSingleDropdownOpen] = useState(false);
  const [isGroupDropdownOpen, setIsGroupDropdownOpen] = useState(false);
  const [isExportDateDropdownOpen, setIsExportDateDropdownOpen] = useState(false);

  const [copySuccess, setCopySuccess] = useState(false);
  const [exportSuccess, setExportSuccess] = useState(false);

  return {
    exportReportType, setExportReportType,
    exportDateRange, setExportDateRange,
    exportStartDate, setExportStartDate,
    exportEndDate, setExportEndDate,
    exportEmployeeFilter, setExportEmployeeFilter,
    exportSelectedEmployee, setExportSelectedEmployee,
    exportSelectedEmployeesGroup, setExportSelectedEmployeesGroup,
    exportGroupSearch, setExportGroupSearch,
    exportSingleSearch, setExportSingleSearch,
    hasInitializedGroup, setHasInitializedGroup,
    pdfThemeColor, setPdfThemeColor,
    pdfCompanyName, setPdfCompanyName,
    pdfComments, setPdfComments,
    pdfLogColumns, setPdfLogColumns,
    pdfTimesheetColumns, setPdfTimesheetColumns,
    isSingleDropdownOpen, setIsSingleDropdownOpen,
    isGroupDropdownOpen, setIsGroupDropdownOpen,
    isExportDateDropdownOpen, setIsExportDateDropdownOpen,
    copySuccess, setCopySuccess,
    exportSuccess, setExportSuccess
  };
}
