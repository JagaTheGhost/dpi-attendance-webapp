// Lazy export service for Excel and PDF generation

export const exportAnalyticsToExcel = async ({
  summaryData,
  metricsData,
  logsData,
  filename = 'biometric_analytics.xlsx'
}) => {
  const XLSX = await import('xlsx');

  const wb = XLSX.utils.book_new();
  const wsSummary = XLSX.utils.aoa_to_sheet(summaryData);
  const wsMetrics = XLSX.utils.aoa_to_sheet(metricsData);
  const wsLogs = XLSX.utils.aoa_to_sheet(logsData);

  // Auto-fit column widths
  [wsSummary, wsMetrics, wsLogs].forEach(ws => {
    const range = XLSX.utils.decode_range(ws['!ref'] || 'A1:A1');
    const cols = [];
    for (let C = range.s.c; C <= range.e.c; ++C) {
      let maxLen = 10;
      for (let R = range.s.r; R <= range.e.r; ++R) {
        const cell = ws[XLSX.utils.encode_cell({ r: R, c: C })];
        if (cell && cell.v) {
          const len = cell.v.toString().length;
          if (len > maxLen) maxLen = len;
        }
      }
      cols.push({ wch: maxLen + 2 });
    }
    ws['!cols'] = cols;
  });

  XLSX.utils.book_append_sheet(wb, wsSummary, 'Summary Overview');
  XLSX.utils.book_append_sheet(wb, wsMetrics, 'Employee Metrics');
  XLSX.utils.book_append_sheet(wb, wsLogs, 'Raw Logs');

  XLSX.writeFile(wb, filename);
};

// Enterprise Multi-Sheet Excel Generator for Reports Page
export const exportReportToMultiSheetExcel = async ({
  reportTitle = 'REPORT',
  headers = [],
  rows = [],
  companyName = 'DPI Attendance Systems',
  filename = 'DPI_Report.xlsx',
  metrics = {}
}) => {
  const XLSX = await import('xlsx');

  const wb = XLSX.utils.book_new();

  // Tab 1: Executive Summary Sheet
  const summaryAOA = [
    [companyName.toUpperCase()],
    [reportTitle],
    ['Generated On:', new Date().toLocaleString('en-IN')],
    [''],
    ['KEY PERFORMANCE INDICATORS'],
    ['Metric', 'Value'],
    ['Total Records Processed', metrics.totalRecords || rows.length],
    ['Total Work Hours', `${metrics.totalWorkHours || 0} hrs`],
    ['Total Overtime Hours', `${metrics.totalOvertimeHours || 0} hrs`],
    ['Total Exceptions / Anomalies', metrics.anomalyCount || 0]
  ];
  const wsSummary = XLSX.utils.aoa_to_sheet(summaryAOA);

  // Tab 2: Primary Report Dataset Sheet
  const reportAOA = [headers, ...rows];
  const wsReport = XLSX.utils.aoa_to_sheet(reportAOA);

  // Tab 3: Biometric Exception Audit Sheet
  const exceptions = rows.filter(r => r.some(cell => String(cell).includes('Missing') || String(cell).includes('Late') || String(cell) === 'A' || String(cell) === 'HD'));
  const exceptionAOA = [headers, ...(exceptions.length > 0 ? exceptions : [rows[0] || []])];
  const wsExceptions = XLSX.utils.aoa_to_sheet(exceptionAOA);

  // Auto-fit column widths
  [wsSummary, wsReport, wsExceptions].forEach(ws => {
    const range = XLSX.utils.decode_range(ws['!ref'] || 'A1:A1');
    const cols = [];
    for (let C = range.s.c; C <= range.e.c; ++C) {
      let maxLen = 10;
      for (let R = range.s.r; R <= range.e.r; ++R) {
        const cell = ws[XLSX.utils.encode_cell({ r: R, c: C })];
        if (cell && cell.v) {
          const len = cell.v.toString().length;
          if (len > maxLen) maxLen = len;
        }
      }
      cols.push({ wch: Math.min(maxLen + 3, 40) });
    }
    ws['!cols'] = cols;
  });

  XLSX.utils.book_append_sheet(wb, wsSummary, 'Executive Summary');
  XLSX.utils.book_append_sheet(wb, wsReport, 'Report Dataset');
  XLSX.utils.book_append_sheet(wb, wsExceptions, 'Exception Audit');

  XLSX.writeFile(wb, filename);
};

// Helper: Load public/dpi.png logo as Base64 DataURL for PDF embedding
const getDPILogoBase64 = async () => {
  try {
    const response = await fetch('/dpi.png');
    const blob = await response.blob();
    return new Promise((resolve) => {
      const reader = new FileReader();
      reader.onloadend = () => resolve(reader.result);
      reader.readAsDataURL(blob);
    });
  } catch (err) {
    console.error("Failed to load /dpi.png logo:", err);
    return null;
  }
};

// High-Density Vector PDF Generator - Maximize Printable Space & Proportional Columns
export const generateCustomPDFReport = async ({
  reportTitle = 'DETAILED BIOMETRIC PUNCH LOGS',
  companyName = 'DPI Attendance Systems',
  dateRangeStr = '22 Jul 2026 - 22 Jul 2026',
  generatedOnStr = new Date().toLocaleString('en-IN'),
  footerComments = 'Confidential. Generated from system logs.',
  themeColor = 'blue',
  headers = ['LOG ID', 'EMPLOYEE ID', 'EMPLOYEE NAME', 'DIRECTION', 'DATE', 'TIME'],
  rows = [],
  filename = 'DPI_Attendance_Report.pdf'
}) => {
  const { jsPDF } = await import('jspdf');

  const pdf = new jsPDF('p', 'mm', 'a4');
  const pageWidth = pdf.internal.pageSize.getWidth();  // 210 mm
  const pageHeight = pdf.internal.pageSize.getHeight(); // 297 mm
  const margin = 12; // 12mm page margin
  const tableWidth = pageWidth - margin * 2; // 186mm printable width

  const logoImgData = await getDPILogoBase64();

  // Color Palettes
  const themeColors = {
    blue: { primary: [29, 78, 216], headerBg: [237, 244, 255], text: [30, 64, 175] },
    slate: { primary: [51, 65, 85], headerBg: [241, 245, 249], text: [30, 41, 59] },
    emerald: { primary: [5, 150, 105], headerBg: [236, 253, 245], text: [6, 95, 70] },
    indigo: { primary: [79, 70, 229], headerBg: [238, 242, 255], text: [55, 48, 163] }
  };
  const theme = themeColors[themeColor] || themeColors.blue;

  // Proportional Column Width Calculation per Report Type
  let colPercentages = [];
  if (headers.includes('LOG ID')) {
    colPercentages = [0.14, 0.14, 0.28, 0.12, 0.16, 0.16];
  } else if (headers.includes('PUNCHES')) {
    colPercentages = [0.14, 0.24, 0.14, 0.10, 0.12, 0.12, 0.14];
  } else if (headers.includes('TOTAL WORKERS')) {
    colPercentages = [0.20, 0.16, 0.14, 0.16, 0.16, 0.18];
  } else if (headers.includes('EXCEPTION TYPE')) {
    colPercentages = [0.12, 0.20, 0.12, 0.20, 0.14, 0.22];
  } else if (headers.includes('LATE DELAY')) {
    colPercentages = [0.12, 0.20, 0.12, 0.16, 0.14, 0.14, 0.12];
  } else {
    const p = 1 / headers.length;
    colPercentages = headers.map(() => p);
  }

  const colXPositions = [];
  let curX = margin;
  colPercentages.forEach(pct => {
    colXPositions.push(curX);
    curX += tableWidth * pct;
  });

  // Calculate High-Density Rows Per Page
  const rowsPerPagePage1 = 30; // Page 1 includes Executive KPI Summary Box
  const rowsPerPageOther = 33;

  let page1Rows = rows.slice(0, rowsPerPagePage1);
  let remainingRows = rows.slice(rowsPerPagePage1);
  let otherPages = [];
  while (remainingRows.length > 0) {
    otherPages.push(remainingRows.slice(0, rowsPerPageOther));
    remainingRows = remainingRows.slice(rowsPerPageOther);
  }

  const totalPages = 1 + otherPages.length;

  for (let pageNum = 1; pageNum <= totalPages; pageNum++) {
    if (pageNum > 1) {
      pdf.addPage();
    }

    // 1. DYNAMIC HEADER ON EVERY PAGE
    if (logoImgData) {
      pdf.addImage(logoImgData, 'PNG', margin, 6.5, 12, 12);
    }

    // Company Name (Bold Blue)
    pdf.setFont('helvetica', 'bold');
    pdf.setFontSize(14);
    pdf.setTextColor(theme.primary[0], theme.primary[1], theme.primary[2]);
    pdf.text(companyName, margin + 15, 12.5);

    // Subtitle (Bold Gray uppercase)
    pdf.setFont('helvetica', 'bold');
    pdf.setFontSize(8);
    pdf.setTextColor(100, 116, 139);
    pdf.text(reportTitle.toUpperCase(), margin + 15, 17);

    // Right Header Metadata Block
    pdf.setFont('helvetica', 'bold');
    pdf.setFontSize(7.5);
    pdf.setTextColor(71, 85, 105);
    pdf.text('Report Range: ', pageWidth - margin - 55, 10.5, { align: 'right' });
    pdf.setFont('helvetica', 'normal');
    pdf.text(dateRangeStr, pageWidth - margin, 10.5, { align: 'right' });

    pdf.setFont('helvetica', 'bold');
    pdf.text('Generated On: ', pageWidth - margin - 45, 14.5, { align: 'right' });
    pdf.setFont('helvetica', 'normal');
    pdf.text(generatedOnStr, pageWidth - margin, 14.5, { align: 'right' });

    pdf.setFont('helvetica', 'bold');
    pdf.text('Page: ', pageWidth - margin - 15, 18.5, { align: 'right' });
    pdf.setFont('helvetica', 'normal');
    pdf.text(`${pageNum} of ${totalPages}`, pageWidth - margin, 18.5, { align: 'right' });

    // Header Separator Line
    pdf.setDrawColor(226, 232, 240);
    pdf.setLineWidth(0.3);
    pdf.line(margin, 21, pageWidth - margin, 21);

    let startY = 24;

    // PAGE 1 EXECUTIVE KEY METRICS SUMMARY BOX
    if (pageNum === 1) {
      pdf.setFillColor(248, 250, 252);
      pdf.setDrawColor(226, 232, 240);
      pdf.setLineWidth(0.3);
      pdf.roundedRect(margin, 24, tableWidth, 12, 2, 2, 'FD');

      pdf.setFont('helvetica', 'bold');
      pdf.setFontSize(7.5);
      pdf.setTextColor(100, 116, 139);

      const statW = tableWidth / 4;
      
      pdf.text('TOTAL RECORDS', margin + 4, 28);
      pdf.setFontSize(9);
      pdf.setTextColor(15, 23, 42);
      pdf.text(String(rows.length), margin + 4, 33);

      pdf.setFontSize(7.5);
      pdf.setTextColor(100, 116, 139);
      pdf.text('DATE SCOPE', margin + statW + 4, 28);
      pdf.setFontSize(8.5);
      pdf.setTextColor(29, 78, 216);
      pdf.text(dateRangeStr, margin + statW + 4, 33);

      pdf.setFontSize(7.5);
      pdf.setTextColor(100, 116, 139);
      pdf.text('AUDIT TYPE', margin + statW * 2 + 4, 28);
      pdf.setFontSize(8.5);
      pdf.setTextColor(15, 23, 42);
      pdf.text(reportTitle.split(' ')[0], margin + statW * 2 + 4, 33);

      pdf.setFontSize(7.5);
      pdf.setTextColor(100, 116, 139);
      pdf.text('SYSTEM STATUS', margin + statW * 3 + 4, 28);
      pdf.setFontSize(8.5);
      pdf.setTextColor(5, 150, 105);
      pdf.text('VERIFIED LOGS', margin + statW * 3 + 4, 33);

      startY = 40;
    }

    // 2. HIGH-DENSITY DATA TABLE
    const tableTop = startY;
    const headerHeight = 7;
    const rowHeight = 7.2;

    pdf.setFillColor(theme.headerBg[0], theme.headerBg[1], theme.headerBg[2]);
    pdf.rect(margin, tableTop, tableWidth, headerHeight, 'F');

    pdf.setFont('helvetica', 'bold');
    pdf.setFontSize(7.5);
    pdf.setTextColor(theme.text[0], theme.text[1], theme.text[2]);

    headers.forEach((h, colIdx) => {
      const x = colXPositions[colIdx] + 2;
      pdf.text(h, x, tableTop + 4.8);
    });

    const currentRows = pageNum === 1 ? page1Rows : otherPages[pageNum - 2];
    let currentY = tableTop + headerHeight;

    currentRows.forEach((row, rIdx) => {
      if (rIdx % 2 === 1) {
        pdf.setFillColor(248, 250, 252);
        pdf.rect(margin, currentY, tableWidth, rowHeight, 'F');
      }

      pdf.setDrawColor(241, 245, 249);
      pdf.setLineWidth(0.2);
      pdf.line(margin, currentY + rowHeight, margin + tableWidth, currentY + rowHeight);

      row.forEach((cellVal, colIdx) => {
        const x = colXPositions[colIdx] + 2;
        const cellText = String(cellVal || '');

        if (headers[colIdx] === 'DIRECTION') {
          if (cellText === 'IN') {
            pdf.setFillColor(236, 253, 245);
            pdf.rect(x, currentY + 1.2, 12, 4.5, 'F');
            pdf.setFont('helvetica', 'bold');
            pdf.setFontSize(7);
            pdf.setTextColor(6, 95, 70);
            pdf.text('IN', x + 3.5, currentY + 4.5);
          } else if (cellText === 'OUT') {
            pdf.setFillColor(254, 242, 242);
            pdf.rect(x, currentY + 1.2, 14, 4.5, 'F');
            pdf.setFont('helvetica', 'bold');
            pdf.setFontSize(7);
            pdf.setTextColor(153, 27, 27);
            pdf.text('OUT', x + 3.5, currentY + 4.5);
          } else {
            pdf.setFont('helvetica', 'normal');
            pdf.setFontSize(7.5);
            pdf.setTextColor(51, 65, 85);
            pdf.text(cellText, x, currentY + 4.8);
          }
        } else if (cellText === 'P' || cellText === 'Present') {
          pdf.setFillColor(236, 253, 245);
          pdf.rect(x, currentY + 1.2, 14, 4.5, 'F');
          pdf.setFont('helvetica', 'bold');
          pdf.setFontSize(7);
          pdf.setTextColor(6, 95, 70);
          pdf.text(cellText, x + 2.5, currentY + 4.5);
        } else if (cellText === 'A' || cellText === 'Absent') {
          pdf.setFillColor(254, 242, 242);
          pdf.rect(x, currentY + 1.2, 14, 4.5, 'F');
          pdf.setFont('helvetica', 'bold');
          pdf.setFontSize(7);
          pdf.setTextColor(153, 27, 27);
          pdf.text(cellText, x + 2.5, currentY + 4.5);
        } else if (cellText === 'HD' || cellText.includes('Missing') || cellText.includes('Late')) {
          pdf.setFillColor(254, 243, 199);
          pdf.rect(x, currentY + 1.2, Math.min(35, cellText.length * 2.2 + 4), 4.5, 'F');
          pdf.setFont('helvetica', 'bold');
          pdf.setFontSize(7);
          pdf.setTextColor(146, 64, 14);
          pdf.text(cellText, x + 2, currentY + 4.5);
        } else if (cellText === 'L' || cellText === 'OD') {
          pdf.setFillColor(243, 232, 255);
          pdf.rect(x, currentY + 1.2, 14, 4.5, 'F');
          pdf.setFont('helvetica', 'bold');
          pdf.setFontSize(7);
          pdf.setTextColor(107, 33, 168);
          pdf.text(cellText, x + 3, currentY + 4.5);
        } else if (headers[colIdx] === 'EMPLOYEE NAME' || headers[colIdx] === 'NAME' || headers[colIdx] === 'DEPARTMENT') {
          pdf.setFont('helvetica', 'bold');
          pdf.setFontSize(7.5);
          pdf.setTextColor(15, 23, 42);
          pdf.text(cellText, x, currentY + 4.8);
        } else {
          pdf.setFont('helvetica', 'normal');
          pdf.setFontSize(7.5);
          pdf.setTextColor(51, 65, 85);
          pdf.text(cellText, x, currentY + 4.8);
        }
      });

      currentY += rowHeight;
    });

    // 3. FOOTER ON EVERY PAGE
    const footerTop = pageHeight - 20;

    pdf.setDrawColor(226, 232, 240);
    pdf.setLineWidth(0.3);
    pdf.line(margin, footerTop, pageWidth - margin, footerTop);

    pdf.setFont('helvetica', 'normal');
    pdf.setFontSize(7.5);
    pdf.setTextColor(148, 163, 184);
    pdf.text(footerComments || 'Confidential. Generated from system logs.', margin, footerTop + 9);

    const sigLineWidth = 45;
    const sigLineX = pageWidth - margin - sigLineWidth;
    pdf.setDrawColor(100, 116, 139);
    pdf.setLineWidth(0.4);
    pdf.line(sigLineX, footerTop + 6, pageWidth - margin, footerTop + 6);

    pdf.setFont('helvetica', 'bold');
    pdf.setFontSize(8);
    pdf.setTextColor(51, 65, 85);
    pdf.text('Authorized Signature', sigLineX + sigLineWidth / 2, footerTop + 11, { align: 'center' });
  }

  pdf.save(filename);
};

// Vector Generator for Individual Employee Performance Dossier PDF
export const generateIndividualEmployeePDF = async ({
  employee,
  analytics,
  companyName = 'DPI Attendance Systems',
  generatedOnStr = new Date().toLocaleString('en-IN'),
  filename = 'employee_dossier.pdf'
}) => {
  const { jsPDF } = await import('jspdf');

  const pdf = new jsPDF('p', 'mm', 'a4');
  const pageWidth = pdf.internal.pageSize.getWidth();  // 210 mm
  const pageHeight = pdf.internal.pageSize.getHeight(); // 297 mm
  const margin = 12; // 12mm page margin
  const tableWidth = pageWidth - margin * 2; // 186mm

  const logoImgData = await getDPILogoBase64();

  const daySummaries = analytics?.daySummaries || [];
  const rowsPerPagePage1 = 20;
  const rowsPerPageOther = 32;

  let page1Rows = daySummaries.slice(0, rowsPerPagePage1);
  let remainingRows = daySummaries.slice(rowsPerPagePage1);
  let otherPages = [];
  while (remainingRows.length > 0) {
    otherPages.push(remainingRows.slice(0, rowsPerPageOther));
    remainingRows = remainingRows.slice(rowsPerPageOther);
  }

  const totalPages = 1 + (otherPages.length || 0);

  for (let pageNum = 1; pageNum <= totalPages; pageNum++) {
    if (pageNum > 1) pdf.addPage();

    // 1. HEADER ON EVERY PAGE
    if (logoImgData) {
      pdf.addImage(logoImgData, 'PNG', margin, 6.5, 12, 12);
    }

    pdf.setFont('helvetica', 'bold');
    pdf.setFontSize(14);
    pdf.setTextColor(29, 78, 216);
    pdf.text(companyName, margin + 15, 12.5);

    pdf.setFont('helvetica', 'bold');
    pdf.setFontSize(8);
    pdf.setTextColor(100, 116, 139);
    pdf.text('INDIVIDUAL EMPLOYEE ATTENDANCE & PERFORMANCE DOSSIER', margin + 15, 17);

    // Right Header Metadata
    pdf.setFont('helvetica', 'bold');
    pdf.setFontSize(7.5);
    pdf.setTextColor(71, 85, 105);
    pdf.text('Employee Code: ', pageWidth - margin - 35, 10.5, { align: 'right' });
    pdf.setFont('helvetica', 'normal');
    pdf.text(String(employee.id || employee.empId || '0000'), pageWidth - margin, 10.5, { align: 'right' });

    pdf.setFont('helvetica', 'bold');
    pdf.text('Generated On: ', pageWidth - margin - 45, 14.5, { align: 'right' });
    pdf.setFont('helvetica', 'normal');
    pdf.text(generatedOnStr, pageWidth - margin, 14.5, { align: 'right' });

    pdf.setFont('helvetica', 'bold');
    pdf.text('Page: ', pageWidth - margin - 15, 18.5, { align: 'right' });
    pdf.setFont('helvetica', 'normal');
    pdf.text(`${pageNum} of ${totalPages}`, pageWidth - margin, 18.5, { align: 'right' });

    // Divider Line
    pdf.setDrawColor(226, 232, 240);
    pdf.setLineWidth(0.3);
    pdf.line(margin, 21, pageWidth - margin, 21);

    let startY = 25;

    // PAGE 1 EMPLOYEE MASTER SPECIFICATIONS & PERFORMANCE CARDS
    if (pageNum === 1) {
      // Box 1: Employee Identity Card
      pdf.setFillColor(248, 250, 252);
      pdf.setDrawColor(226, 232, 240);
      pdf.setLineWidth(0.3);
      pdf.roundedRect(margin, 24, tableWidth, 21, 2, 2, 'FD');

      pdf.setFont('helvetica', 'bold');
      pdf.setFontSize(11);
      pdf.setTextColor(15, 23, 42);
      pdf.text(employee.name, margin + 4, 30);

      pdf.setFont('helvetica', 'normal');
      pdf.setFontSize(8);
      pdf.setTextColor(100, 116, 139);
      pdf.text(`ID: ${employee.id || employee.empId || 'N/A'}  |  Dept: ${employee.department}  |  Desig: ${employee.designation || 'Staff'}`, margin + 4, 35);
      pdf.text(`Type: ${employee.employmentType || 'Permanent'}  |  Gender: ${employee.gender || 'N/A'}  |  Status: ${employee.status || 'Active'}`, margin + 4, 40);

      // Box 2: KPI Metrics (4 Stat Pills)
      const kpiY = 47;
      const kpiW = (tableWidth - 9) / 4;

      const stats = [
        { label: 'GOAL COMPLIANCE', val: `${Math.round(analytics.goalComplianceRate || 0)}%`, sub: 'Days met 7h+ goal' },
        { label: 'ON-TIME ARRIVAL', val: `${Math.round(analytics.punctualityRate || 0)}%`, sub: 'In by 9:15 AM' },
        { label: 'AVG DAILY HOURS', val: `${Math.floor(analytics.avgWorkHours || 0)}h ${Math.round(((analytics.avgWorkHours || 0) % 1) * 60)}m`, sub: 'Work time' },
        { label: 'AVG DAILY BREAK', val: `${Math.floor(analytics.avgBreakHours || 0)}h ${Math.round(((analytics.avgBreakHours || 0) % 1) * 60)}m`, sub: 'Break duration' }
      ];

      stats.forEach((st, idx) => {
        const x = margin + idx * (kpiW + 3);
        pdf.setFillColor(237, 244, 255);
        pdf.setDrawColor(191, 219, 254);
        pdf.roundedRect(x, kpiY, kpiW, 16, 2, 2, 'FD');

        pdf.setFont('helvetica', 'bold');
        pdf.setFontSize(6.5);
        pdf.setTextColor(100, 116, 139);
        pdf.text(st.label, x + 3, kpiY + 4.5);

        pdf.setFontSize(10);
        pdf.setTextColor(29, 78, 216);
        pdf.text(st.val, x + 3, kpiY + 10.5);

        pdf.setFontSize(6);
        pdf.setTextColor(148, 163, 184);
        pdf.text(st.sub, x + 3, kpiY + 14);
      });

      startY = 67;
    }

    // 2. DAILY ATTENDANCE BREAKDOWN TABLE
    const tableTop = startY;
    const headerHeight = 7;
    const rowHeight = 7.2;

    const headers = ['DATE', 'FIRST IN', 'LAST OUT', 'WORK HOURS', 'BREAK HOURS', 'PUNCTUALITY', 'GOAL MET'];
    const colPercentages = [0.18, 0.14, 0.14, 0.14, 0.14, 0.14, 0.12];

    const colXPositions = [];
    let curX = margin;
    colPercentages.forEach(pct => {
      colXPositions.push(curX);
      curX += tableWidth * pct;
    });

    // Table Header
    pdf.setFillColor(237, 244, 255);
    pdf.rect(margin, tableTop, tableWidth, headerHeight, 'F');

    pdf.setFont('helvetica', 'bold');
    pdf.setFontSize(7.5);
    pdf.setTextColor(30, 64, 175);

    headers.forEach((h, colIdx) => {
      pdf.text(h, colXPositions[colIdx] + 2, tableTop + 4.8);
    });

    // Table Rows
    const currentRows = pageNum === 1 ? page1Rows : otherPages[pageNum - 2];
    let currentY = tableTop + headerHeight;

    (currentRows || []).forEach((row, rIdx) => {
      if (rIdx % 2 === 1) {
        pdf.setFillColor(248, 250, 252);
        pdf.rect(margin, currentY, tableWidth, rowHeight, 'F');
      }

      pdf.setDrawColor(241, 245, 249);
      pdf.setLineWidth(0.2);
      pdf.line(margin, currentY + rowHeight, margin + tableWidth, currentY + rowHeight);

      // Date
      pdf.setFont('helvetica', 'bold');
      pdf.setFontSize(7.5);
      pdf.setTextColor(15, 23, 42);
      pdf.text(String(row.dateStr || '—'), colXPositions[0] + 2, currentY + 4.8);

      // First IN
      pdf.setFont('helvetica', 'normal');
      pdf.setTextColor(51, 65, 85);
      pdf.text(String(row.firstIn || '—'), colXPositions[1] + 2, currentY + 4.8);

      // Last OUT
      pdf.text(String(row.lastOut || '—'), colXPositions[2] + 2, currentY + 4.8);

      // Work Hours
      const hrsStr = `${Math.floor(row.hoursWorked || 0)}h ${Math.round(((row.hoursWorked || 0) % 1) * 60)}m`;
      pdf.text(hrsStr, colXPositions[3] + 2, currentY + 4.8);

      // Break Hours
      const breakStr = `${Math.floor(row.breakHours || 0)}h ${Math.round(((row.breakHours || 0) % 1) * 60)}m`;
      pdf.text(breakStr, colXPositions[4] + 2, currentY + 4.8);

      // Punctuality Badge
      if (row.isOnTime) {
        pdf.setFillColor(236, 253, 245);
        pdf.rect(colXPositions[5] + 2, currentY + 1.2, 18, 4.5, 'F');
        pdf.setFont('helvetica', 'bold');
        pdf.setFontSize(6.5);
        pdf.setTextColor(6, 95, 70);
        pdf.text('ON-TIME', colXPositions[5] + 3.5, currentY + 4.5);
      } else {
        pdf.setFillColor(254, 242, 242);
        pdf.rect(colXPositions[5] + 2, currentY + 1.2, 14, 4.5, 'F');
        pdf.setFont('helvetica', 'bold');
        pdf.setFontSize(6.5);
        pdf.setTextColor(153, 27, 27);
        pdf.text('LATE', colXPositions[5] + 3.5, currentY + 4.5);
      }

      // Goal Met Badge
      if (row.isGoalMet) {
        pdf.setFont('helvetica', 'bold');
        pdf.setFontSize(7);
        pdf.setTextColor(5, 150, 105);
        pdf.text('YES ✓', colXPositions[6] + 2, currentY + 4.8);
      } else {
        pdf.setFont('helvetica', 'normal');
        pdf.setFontSize(7);
        pdf.setTextColor(148, 163, 184);
        pdf.text('NO', colXPositions[6] + 2, currentY + 4.8);
      }

      currentY += rowHeight;
    });

    // 3. FOOTER ON EVERY PAGE
    const footerTop = pageHeight - 20;

    pdf.setDrawColor(226, 232, 240);
    pdf.setLineWidth(0.3);
    pdf.line(margin, footerTop, pageWidth - margin, footerTop);

    pdf.setFont('helvetica', 'normal');
    pdf.setFontSize(7.5);
    pdf.setTextColor(148, 163, 184);
    pdf.text('Confidential Employee Performance Dossier. DPI Attendance Systems.', margin, footerTop + 9);

    const sigLineWidth = 45;
    const sigLineX = pageWidth - margin - sigLineWidth;
    pdf.setDrawColor(100, 116, 139);
    pdf.setLineWidth(0.4);
    pdf.line(sigLineX, footerTop + 6, pageWidth - margin, footerTop + 6);

    pdf.setFont('helvetica', 'bold');
    pdf.setFontSize(8);
    pdf.setTextColor(51, 65, 85);
    pdf.text('Authorized Supervisor Signature', sigLineX + sigLineWidth / 2, footerTop + 11, { align: 'center' });
  }

  pdf.save(filename);
};

export const renderElementToPDF = async (element, fileName = 'report.pdf') => {
  const html2canvasModule = await import('html2canvas-pro');
  const html2canvas = html2canvasModule.default || html2canvasModule;
  const { jsPDF } = await import('jspdf');

  const canvas = await html2canvas(element, {
    scale: 2,
    useCORS: true,
    logging: false,
    backgroundColor: '#ffffff'
  });

  const pdf = new jsPDF('p', 'mm', 'a4');
  const pdfWidth = pdf.internal.pageSize.getWidth();
  const pdfHeight = pdf.internal.pageSize.getHeight();

  const pageCanvasHeight = (canvas.width * pdfHeight) / pdfWidth;
  let heightLeft = canvas.height;
  let sY = 0;
  let isFirstPage = true;

  while (heightLeft > 0) {
    if (!isFirstPage) {
      pdf.addPage();
    }
    isFirstPage = false;

    const pageCanvas = document.createElement('canvas');
    pageCanvas.width = canvas.width;
    pageCanvas.height = Math.min(pageCanvasHeight, heightLeft);

    const ctx = pageCanvas.getContext('2d');
    ctx.drawImage(
      canvas,
      0, sY, canvas.width, pageCanvas.height,
      0, 0, pageCanvas.width, pageCanvas.height
    );

    const pageImgData = pageCanvas.toDataURL('image/jpeg', 0.95);
    const currentPdfPageHeight = (pageCanvas.height * pdfWidth) / canvas.width;

    pdf.addImage(pageImgData, 'JPEG', 0, 0, pdfWidth, currentPdfPageHeight);

    sY += pageCanvasHeight;
    heightLeft -= pageCanvasHeight;
  }

  pdf.save(fileName);
};

// Official Multi-Language Holiday Circular PDF Generator with Seal & Signature Authorization Box
export const generateHolidayNoticePDF = async ({
  companyName = 'DPI Attendance Systems',
  holidays = [],
  language = 'en', // 'en' | 'ta' | 'hi'
  filename = 'DPI_Official_Holiday_Notice_2026.pdf'
}) => {
  const html2canvasModule = await import('html2canvas-pro');
  const html2canvas = html2canvasModule.default || html2canvasModule;
  const { jsPDF } = await import('jspdf');

  const translations = {
    en: {
      subTitle: 'INDUSTRIAL BIOMETRIC RADAR & HUMAN RESOURCES MANAGEMENT DIVISION',
      circRef: 'CIRCULAR REF',
      issueDate: 'Date of Issue',
      title: 'OFFICIAL ANNOUNCEMENT: COMPANY HOLIDAY CALENDAR - 2026',
      subject: 'SUBJECT: Declaration of Official Company Holidays, Department Scopes & Operating Schedule',
      notice: 'This circular officially notifies all department heads, plant managers, office staff, and workforce personnel that the days listed below have been declared as official company non-working holidays. Standard biometric punch requirements and late/absence penalties shall be exempted for all authorized personnel during these dates.',
      headers: { sno: 'S.NO', date: 'DATE', day: 'DAY', title: 'HOLIDAY OCCASION', classification: 'CLASSIFICATION', scope: 'DEPARTMENT SCOPE' },
      seal1: 'OFFICIAL COMPANY',
      seal2: 'SEAL & STAMP AREA',
      forCompany: 'FOR DPI ATTENDANCE SYSTEMS',
      sigTitle: 'AUTHORIZING OFFICIAL SIGNATURE',
      designation: 'Head of Human Resources & Administrative Operations',
      footer: 'DPI Attendance Radar System • Official Administrative Record • Confidential'
    },
    ta: {
      subTitle: 'தொழில்துறை பயோமெட்ரிக் வருகைப் பதிவு மற்றும் மனித வள நிர்வாகத் துறை',
      circRef: 'சுற்றறிக்கை எண்',
      issueDate: 'வெளியிடப்பட்ட தேதி',
      title: 'அதிகாரப்பூர்வ அறிவிப்பு: நிறுவனத்தின் ஆண்டு விடுமுறை பட்டியல் - 2026',
      subject: 'பொருள்: அதிகாரப்பூர்வ நிறுவன விடுமுறைகள் மற்றும் பணி அட்டவணை அறிவிப்பு',
      notice: 'அனைத்து துறை தலைவர்கள், ஆலை மேலாளர்கள், அலுவலக ஊழியர்கள் மற்றும் பணியாளர்களுக்கு தெரிவிப்பது யாதெனில், கீழே குறிப்பிடப்பட்டுள்ள நாட்கள் அதிகாரப்பூர்வ நிறுவன விடுமுறை நாட்களாக அறிவிக்கப்பட்டுள்ளன. இந்த நாட்களில் பயோமெட்ரிக் வருகை தேவைகள் மற்றும் தாமதக் கட்டணங்கள் விலக்களிக்கப்படுகின்றன.',
      headers: { sno: 'வ.எண்', date: 'தேதி', day: 'கிழமை', title: 'விடுமுறை காரணி', classification: 'வகைப்பாடு', scope: 'பொருந்தும் துறை' },
      seal1: 'நிறுவனத்தின்',
      seal2: 'அதிகாரப்பூர்வ முத்திரை',
      forCompany: 'டிபிஐ அட்டென்டன்ஸ் சிஸ்டம்ஸ் சார்பாக',
      sigTitle: 'அதிகாரப்பூர்வ அதிகாரியின் கையொப்பம்',
      designation: 'மனிதவள மற்றும் நிர்வாக செயல்பாடுகளின் தலைவர்',
      footer: 'டிபிஐ வருகைப் பதிவு ரேடார் சிஸ்டம் • அதிகாரப்பூர்வ சுற்றறிக்கை'
    },
    hi: {
      subTitle: 'औद्योगिक बायोमेट्रिक उपस्थिति एवं मानव संसाधन प्रबंधन विभाग',
      circRef: 'परिपत्र संख्या',
      issueDate: 'जारी करने की तिथि',
      title: 'आधिकारिक घोषणा: कंपनी अवकाश कैलेंडर - 2026',
      subject: 'विषय: आधिकारिक कंपनी छुट्टियों और कार्य अनुसूची की घोषणा',
      notice: 'सभी विभागाध्यक्षों, संयंत्र प्रबंधकों और कर्मचारियों को सूचित किया जाता है कि नीचे सूचीबद्ध दिनों को आधिकारिक कंपनी अवकाश घोषित किया गया है। इन तिथियों के दौरान बायोमेट्रिक उपस्थिति आवश्यकताओं और अनुपस्थिति दंड से छूट दी जाएगी।',
      headers: { sno: 'क्र.सं.', date: 'तिथि', day: 'दिन', title: 'अवकाश का अवसर', classification: 'वर्गीकरण', scope: 'विभाग क्षेत्र' },
      seal1: 'कंपनी की',
      seal2: 'आधिकारिक सील एवं मोहर',
      forCompany: 'डीपीआई अटेंडेंस सिस्टम्स की ओर से',
      sigTitle: 'प्राधिकृत अधिकारी के हस्ताक्षर',
      designation: 'मानव संसाधन एवं प्रशासनिक परिचालन प्रमुख',
      footer: 'डीपीआई अटेंडेंस रडार सिस्टम • आधिकारिक प्रशासनिक रिकॉर्ड'
    }
  };

  const t = translations[language] || translations.en;

  // Create clean offscreen DOM element
  const container = document.createElement('div');
  container.style.position = 'absolute';
  container.style.left = '-9999px';
  container.style.top = '-9999px';
  container.style.width = '794px'; // Standard A4 width at 96 DPI
  container.style.minHeight = '1122px';
  container.style.backgroundColor = '#ffffff';
  container.style.padding = '40px';
  container.style.fontFamily = "'Inter', system-ui, -apple-system, BlinkMacSystemFont, sans-serif";
  container.style.color = '#0f172a';
  container.style.boxSizing = 'border-box';

  const logoBase64 = await getDPILogoBase64();

  const formattedDate = new Date().toLocaleDateString(language === 'ta' ? 'ta-IN' : language === 'hi' ? 'hi-IN' : 'en-IN', {
    day: '2-digit',
    month: 'long',
    year: 'numeric'
  });

  const tableRowsHtml = holidays.map((h, idx) => {
    const d = new Date(h.date);
    const dayName = isNaN(d.getTime()) ? '-' : d.toLocaleDateString(language === 'ta' ? 'ta-IN' : language === 'hi' ? 'hi-IN' : 'en-US', { weekday: 'short' });
    const isEven = idx % 2 === 1;

    return `
      <tr style="background-color: ${isEven ? '#f8fafc' : '#ffffff'}; border-bottom: 1px solid #f1f5f9;">
        <td style="padding: 10px 8px; text-align: center; font-weight: 700; font-size: 11px; color: #475569;">${idx + 1}</td>
        <td style="padding: 10px 10px; font-weight: 700; font-size: 11px; font-family: monospace; color: #0f172a;">${h.date}</td>
        <td style="padding: 10px 10px; font-weight: 600; font-size: 11px; color: #334155;">${dayName}</td>
        <td style="padding: 10px 10px; font-weight: 800; font-size: 11px; color: #1e293b;">${h.title}</td>
        <td style="padding: 10px 10px; font-size: 10px; font-weight: 600; color: #475569;">
          <span style="background-color: #eff6ff; color: #1d4ed8; padding: 2px 8px; border-radius: 6px; border: 1px solid #bfdbfe; display: inline-block;">${h.type || 'Company Holiday'}</span>
        </td>
        <td style="padding: 10px 10px; font-size: 10px; font-weight: 600; color: #475569;">${h.scope || 'All Departments'}</td>
      </tr>
    `;
  }).join('');

  container.innerHTML = `
    <div style="display: flex; flex-direction: column; justify-content: space-between; min-height: 1042px;">
      <div>
        <!-- 1. Corporate Header -->
        <div style="display: flex; align-items: center; justify-content: space-between; border-bottom: 2px solid #e2e8f0; padding-bottom: 16px; margin-bottom: 20px;">
          <div style="display: flex; align-items: center; gap: 14px;">
            ${logoBase64 ? `<img src="${logoBase64}" style="width: 44px; height: 44px; object-fit: contain;" />` : ''}
            <div>
              <h1 style="margin: 0; font-size: 20px; font-weight: 900; color: #1d4ed8; letter-spacing: -0.5px;">${companyName.toUpperCase()}</h1>
              <p style="margin: 3px 0 0 0; font-size: 10px; font-weight: 700; color: #64748b; text-transform: uppercase; letter-spacing: 0.5px;">${t.subTitle}</p>
            </div>
          </div>

          <div style="text-align: right;">
            <p style="margin: 0; font-size: 11px; font-weight: 800; color: #0f172a;">${t.circRef}: DPI/HR/2026/HOL-01</p>
            <p style="margin: 3px 0 0 0; font-size: 10px; font-weight: 600; color: #64748b;">${t.issueDate}: ${formattedDate}</p>
          </div>
        </div>

        <!-- 2. Circular Title Box -->
        <div style="background-color: #f8fafc; border: 1px solid #e2e8f0; border-radius: 14px; padding: 14px; text-align: center; margin-bottom: 20px;">
          <h2 style="margin: 0; font-size: 14px; font-weight: 900; color: #0f172a; text-transform: uppercase;">${t.title}</h2>
          <p style="margin: 4px 0 0 0; font-size: 11px; font-weight: 600; color: #475569;">${t.subject}</p>
        </div>

        <!-- 3. Notice Statement -->
        <p style="font-size: 11px; font-weight: 500; color: #334155; line-height: 1.6; text-align: justify; margin: 0 0 20px 0;">
          ${t.notice}
        </p>

        <!-- 4. Schedule Table -->
        <table style="width: 100%; border-collapse: collapse; border-radius: 12px; overflow: hidden; border: 1px solid #e2e8f0; margin-bottom: 24px;">
          <thead>
            <tr style="background-color: #1d4ed8; color: #ffffff; text-align: left; font-size: 10px; font-weight: 800; text-transform: uppercase; letter-spacing: 0.5px;">
              <th style="padding: 10px 8px; text-align: center; width: 45px;">${t.headers.sno}</th>
              <th style="padding: 10px 10px; width: 95px;">${t.headers.date}</th>
              <th style="padding: 10px 10px; width: 65px;">${t.headers.day}</th>
              <th style="padding: 10px 10px;">${t.headers.title}</th>
              <th style="padding: 10px 10px; width: 140px;">${t.headers.classification}</th>
              <th style="padding: 10px 10px; width: 130px;">${t.headers.scope}</th>
            </tr>
          </thead>
          <tbody>
            ${tableRowsHtml}
          </tbody>
        </table>
      </div>

      <!-- 5. Executive Authorization Footer Box (No Overlap) -->
      <div style="border: 1px solid #cbd5e1; border-radius: 16px; padding: 20px; background-color: #ffffff; margin-top: auto; margin-bottom: 10px;">
        <div style="display: flex; align-items: center; justify-content: space-between; gap: 20px;">
          
          <!-- Left: Official Stamp Box -->
          <div style="border: 2px dashed #94a3b8; border-radius: 12px; width: 220px; height: 90px; display: flex; flex-direction: column; align-items: center; justify-content: center; text-align: center; padding: 8px; box-sizing: border-box; background-color: #f8fafc;">
            <span style="font-size: 10px; font-weight: 900; color: #94a3b8; letter-spacing: 0.5px;">${t.seal1}</span>
            <span style="font-size: 10px; font-weight: 900; color: #94a3b8; letter-spacing: 0.5px; margin-top: 2px;">${t.seal2}</span>
          </div>

          <!-- Right: Signature Line -->
          <div style="flex: 1; display: flex; flex-direction: column; align-items: flex-end; justify-content: space-between; text-align: right; padding-top: 4px;">
            <p style="margin: 0 0 35px 0; font-size: 11px; font-weight: 900; color: #0f172a; letter-spacing: 0.5px;">${t.forCompany}</p>
            <div style="width: 250px; border-top: 1.5px solid #475569; padding-top: 6px; text-align: center;">
              <p style="margin: 0; font-size: 11px; font-weight: 900; color: #0f172a;">${t.sigTitle}</p>
              <p style="margin: 3px 0 0 0; font-size: 10px; font-weight: 600; color: #64748b;">${t.designation}</p>
            </div>
          </div>
        </div>
      </div>

      <!-- 6. Footer bar -->
      <div style="display: flex; align-items: center; justify-content: space-between; border-top: 1px solid #e2e8f0; padding-top: 10px; font-size: 9px; font-weight: 600; color: #94a3b8;">
        <span>${t.footer}</span>
        <span>Page 1 of 1</span>
      </div>
    </div>
  `;

  document.body.appendChild(container);

  try {
    const canvas = await html2canvas(container, {
      scale: 2,
      useCORS: true,
      logging: false,
      backgroundColor: '#ffffff'
    });

    document.body.removeChild(container);

    const pdf = new jsPDF('p', 'mm', 'a4');
    const pdfWidth = pdf.internal.pageSize.getWidth();
    const pdfHeight = pdf.internal.pageSize.getHeight();

    const imgData = canvas.toDataURL('image/jpeg', 0.95);
    pdf.addImage(imgData, 'JPEG', 0, 0, pdfWidth, pdfHeight);

    pdf.save(filename);
  } catch (err) {
    if (document.body.contains(container)) {
      document.body.removeChild(container);
    }
    throw err;
  }
};

// Official Single Holiday / Special Event Announcement PDF Circular Generator
export const generateSingleHolidayNoticePDF = async ({
  companyName = 'DPI Attendance Systems',
  holiday = {},
  language = 'en', // 'en' | 'ta' | 'hi'
  filename = 'DPI_Official_Holiday_Notice_Single.pdf'
}) => {
  const html2canvasModule = await import('html2canvas-pro');
  const html2canvas = html2canvasModule.default || html2canvasModule;
  const { jsPDF } = await import('jspdf');

  const translations = {
    en: {
      subTitle: 'INDUSTRIAL BIOMETRIC RADAR & HUMAN RESOURCES MANAGEMENT DIVISION',
      circRef: 'OFFICIAL CIRCULAR REF',
      issueDate: 'Date of Issue',
      title: 'SPECIAL ANNOUNCEMENT: OFFICIAL COMPANY HOLIDAY NOTICE',
      subject: 'SUBJECT: Declaration of Special Non-Working Holiday & Operating Guidelines',
      notice: 'This is to officially inform all department heads, plant managers, office staff, and workforce personnel that the company has officially declared a non-working holiday on the date specified below. Standard biometric attendance punch requirements and late/absence penalties are hereby suspended for all eligible personnel.',
      labels: {
        eventTitle: 'EVENT / HOLIDAY OCCASION',
        date: 'DECLARED DATE(S)',
        day: 'DAY OF WEEK',
        type: 'CLASSIFICATION',
        scope: 'APPLICABLE DEPARTMENTS',
        status: 'BIOMETRIC ATTENDANCE STATUS',
        instructions: 'ADMINISTRATIVE INSTRUCTIONS & NOTES'
      },
      biometricExempt: 'EXEMPTED (Biometric Punch Not Required)',
      seal1: 'OFFICIAL COMPANY',
      seal2: 'SEAL & STAMP AREA',
      forCompany: 'FOR DPI ATTENDANCE SYSTEMS',
      sigTitle: 'AUTHORIZING OFFICIAL SIGNATURE',
      designation: 'Head of Human Resources & Administrative Operations',
      footer: 'DPI Attendance Radar System • Official Event Circular • Confidential'
    },
    ta: {
      subTitle: 'தொழில்துறை பயோமெட்ரிக் வருகைப் பதிவு மற்றும் மனித வள நிர்வாகத் துறை',
      circRef: 'அதிகாரப்பூர்வ சுற்றறிக்கை எண்',
      issueDate: 'வெளியிடப்பட்ட தேதி',
      title: 'சிறப்பு அறிவிப்பு: அதிகாரப்பூர்வ நிறுவன விடுமுறை சுற்றறிக்கை',
      subject: 'பொருள்: சிறப்பு நிறுவன விடுமுறை மற்றும் பணி வழிகாட்டுதல்கள் அறிவிப்பு',
      notice: 'அனைத்து துறை தலைவர்கள், ஆலை மேலாளர்கள், அலுவலக ஊழியர்கள் மற்றும் பணியாளர்களுக்கு தெரிவிப்பது யாதெனில், கீழே குறிப்பிடப்பட்டுள்ள நாளில் நிறுவனத்திற்கு சிறப்பு விடுமுறையாக அறிவிக்கப்பட்டுள்ளது. இந்த நாளில் பயோமெட்ரிக் வருகை தேவைகள் மற்றும் தாமதக் கட்டணங்கள் விலக்களிக்கப்படுகின்றன.',
      labels: {
        eventTitle: 'விடுமுறை / நிகழ்வின் பெயர்',
        date: 'அறிவிக்கப்பட்ட தேதி',
        day: 'கிழமை',
        type: 'வகைப்பாடு',
        scope: 'பொருந்தும் துறைகள்',
        status: 'பயோமெட்ரிக் வருகை நிலை',
        instructions: 'நிர்வாக வழிகாட்டுதல்கள் & குறிப்புகள்'
      },
      biometricExempt: 'விலக்களிக்கப்பட்டுள்ளது (பயோமெட்ரிக் பதிவு தேவையில்லை)',
      seal1: 'நிறுவனத்தின்',
      seal2: 'அதிகாரப்பூர்வ முத்திரை',
      forCompany: 'டிபிஐ அட்டென்டன்ஸ் சிஸ்டம்ஸ் சார்பாக',
      sigTitle: 'அதிகாரப்பூர்வ அதிகாரியின் கையொப்பம்',
      designation: 'மனிதவள மற்றும் நிர்வாக செயல்பாடுகளின் தலைவர்',
      footer: 'டிபிஐ வருகைப் பதிவு ரேடார் சிஸ்டம் • சிறப்பு விடுமுறை சுற்றறிக்கை'
    },
    hi: {
      subTitle: 'औद्योगिक बायोमेट्रिक उपस्थिति एवं मानव संसाधन प्रबंधन विभाग',
      circRef: 'आधिकारिक परिपत्र संख्या',
      issueDate: 'जारी करने की तिथि',
      title: 'विशेष घोषणा: आधिकारिक कंपनी अवकाश परिपत्र',
      subject: 'विषय: विशेष कंपनी अवकाश और परिचालन दिशा-निर्देशों की घोषणा',
      notice: 'सभी विभागाध्यक्षों, संयंत्र प्रबंधकों, कार्यालय कर्मचारियों और कार्यबल को सूचित किया जाता है कि नीचे निर्दिष्ट तिथि पर कंपनी अवकाश घोषित किया गया है। इस दौरान बायोमेट्रिक उपस्थिति आवश्यकताओं और अनुपस्थिति दंड से छूट दी गई है।',
      labels: {
        eventTitle: 'अवकाश का अवसर',
        date: 'घोषित तिथि',
        day: 'दिन',
        type: 'वर्गीकरण',
        scope: 'लागू विभाग',
        status: 'बायोमेट्रिक उपस्थिति स्थिति',
        instructions: 'प्रशासनिक निर्देश एवं नोट्स'
      },
      biometricExempt: 'छूट प्राप्त (बायोमेट्रिक पंच आवश्यक नहीं)',
      seal1: 'कंपनी की',
      seal2: 'आधिकारिक सील एवं मोहर',
      forCompany: 'डीपीआई अटेंडेंस सिस्टम्स की ओर से',
      sigTitle: 'प्राधिकृत अधिकारी के हस्ताक्षर',
      designation: 'मानव संसाधन एवं प्रशासनिक परिचालन प्रमुख',
      footer: 'डीपीआई अटेंडेंस रडार सिस्टम • विशेष परिपत्र'
    }
  };

  const t = translations[language] || translations.en;

  const container = document.createElement('div');
  container.style.position = 'absolute';
  container.style.left = '-9999px';
  container.style.top = '-9999px';
  container.style.width = '794px';
  container.style.minHeight = '1122px';
  container.style.backgroundColor = '#ffffff';
  container.style.padding = '40px';
  container.style.fontFamily = "'Inter', system-ui, -apple-system, BlinkMacSystemFont, sans-serif";
  container.style.color = '#0f172a';
  container.style.boxSizing = 'border-box';

  const logoBase64 = await getDPILogoBase64();

  const formattedDate = new Date().toLocaleDateString(language === 'ta' ? 'ta-IN' : language === 'hi' ? 'hi-IN' : 'en-IN', {
    day: '2-digit',
    month: 'long',
    year: 'numeric'
  });

  const d = new Date(holiday.date);
  const dayName = isNaN(d.getTime()) ? '-' : d.toLocaleDateString(language === 'ta' ? 'ta-IN' : language === 'hi' ? 'hi-IN' : 'en-US', { weekday: 'long' });

  container.innerHTML = `
    <div style="display: flex; flex-direction: column; justify-content: space-between; min-height: 1042px;">
      <div>
        <!-- 1. Corporate Header -->
        <div style="display: flex; align-items: center; justify-content: space-between; border-bottom: 2px solid #e2e8f0; padding-bottom: 16px; margin-bottom: 24px;">
          <div style="display: flex; align-items: center; gap: 14px;">
            ${logoBase64 ? `<img src="${logoBase64}" style="width: 46px; height: 46px; object-fit: contain;" />` : ''}
            <div>
              <h1 style="margin: 0; font-size: 20px; font-weight: 900; color: #1d4ed8; letter-spacing: -0.5px;">${companyName.toUpperCase()}</h1>
              <p style="margin: 3px 0 0 0; font-size: 10px; font-weight: 700; color: #64748b; text-transform: uppercase; letter-spacing: 0.5px;">${t.subTitle}</p>
            </div>
          </div>

          <div style="text-align: right;">
            <p style="margin: 0; font-size: 11px; font-weight: 800; color: #0f172a;">${t.circRef}: DPI/HR/2026/EVENT-${holiday.id ? holiday.id.slice(-4) : '01'}</p>
            <p style="margin: 3px 0 0 0; font-size: 10px; font-weight: 600; color: #64748b;">${t.issueDate}: ${formattedDate}</p>
          </div>
        </div>

        <!-- 2. Circular Announcement Header Banner -->
        <div style="background: linear-gradient(135deg, #1e293b 0%, #0f172a 100%); color: #ffffff; border-radius: 16px; padding: 20px; text-align: center; margin-bottom: 24px; box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.1);">
          <span style="background-color: #3b82f6; color: #ffffff; font-size: 9px; font-weight: 800; text-transform: uppercase; padding: 3px 10px; border-radius: 20px; letter-spacing: 1px; display: inline-block; margin-bottom: 8px;">OFFICIAL ADMINISTRATIVE NOTICE</span>
          <h2 style="margin: 0; font-size: 18px; font-weight: 900; letter-spacing: -0.3px;">${holiday.title ? holiday.title.toUpperCase() : 'SPECIAL HOLIDAY ANNOUNCEMENT'}</h2>
          <p style="margin: 6px 0 0 0; font-size: 11px; font-weight: 500; color: #94a3b8;">${t.subject}</p>
        </div>

        <!-- 3. Notice Statement -->
        <p style="font-size: 12px; font-weight: 500; color: #334155; line-height: 1.7; text-align: justify; margin: 0 0 24px 0;">
          ${t.notice}
        </p>

        <!-- 4. Highlighted Event Metadata Grid -->
        <div style="background-color: #f8fafc; border: 1.5px solid #e2e8f0; border-radius: 16px; padding: 20px; margin-bottom: 24px;">
          <h3 style="margin: 0 0 16px 0; font-size: 12px; font-weight: 900; color: #1d4ed8; text-transform: uppercase; letter-spacing: 0.5px; border-bottom: 1px solid #e2e8f0; padding-bottom: 8px;">
            📌 EVENT DETAILS & OPERATING SCOPE
          </h3>

          <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 16px;">
            <div>
              <span style="font-size: 10px; font-weight: 800; color: #64748b; text-transform: uppercase; display: block;">${t.labels.eventTitle}</span>
              <span style="font-size: 14px; font-weight: 900; color: #0f172a; margin-top: 2px; display: block;">${holiday.title}</span>
            </div>

            <div>
              <span style="font-size: 10px; font-weight: 800; color: #64748b; text-transform: uppercase; display: block;">${t.labels.date}</span>
              <span style="font-size: 14px; font-weight: 900; color: #1d4ed8; font-family: monospace; margin-top: 2px; display: block;">${holiday.date} (${dayName})</span>
            </div>

            <div>
              <span style="font-size: 10px; font-weight: 800; color: #64748b; text-transform: uppercase; display: block;">${t.labels.type}</span>
              <span style="font-size: 12px; font-weight: 700; color: #334155; margin-top: 2px; display: block;">${holiday.type || 'Special Non-Working Holiday'}</span>
            </div>

            <div>
              <span style="font-size: 10px; font-weight: 800; color: #64748b; text-transform: uppercase; display: block;">${t.labels.scope}</span>
              <span style="font-size: 12px; font-weight: 700; color: #334155; margin-top: 2px; display: block;">${holiday.scope || 'All Departments & Plant Operations'}</span>
            </div>
          </div>

          <div style="margin-top: 16px; padding-top: 14px; border-top: 1px dashed #cbd5e1;">
            <span style="font-size: 10px; font-weight: 800; color: #64748b; text-transform: uppercase; display: block;">${t.labels.status}</span>
            <span style="font-size: 11px; font-weight: 800; color: #15803d; background-color: #f0fdf4; border: 1px solid #bbf7d0; padding: 4px 10px; border-radius: 8px; display: inline-block; margin-top: 4px;">
              ✓ ${t.biometricExempt}
            </span>
          </div>
        </div>

        <!-- 5. Admin Notes / Special Instructions -->
        ${holiday.notes ? `
          <div style="background-color: #eff6ff; border: 1px solid #bfdbfe; border-radius: 14px; padding: 16px; margin-bottom: 24px;">
            <span style="font-size: 10px; font-weight: 900; color: #1d4ed8; text-transform: uppercase; display: block; margin-bottom: 4px;">
              ℹ️ ${t.labels.instructions}
            </span>
            <p style="margin: 0; font-size: 11px; font-weight: 600; color: #1e3a8a; line-height: 1.5;">${holiday.notes}</p>
          </div>
        ` : ''}
      </div>

      <!-- 6. Executive Authorization Footer Box -->
      <div style="border: 1px solid #cbd5e1; border-radius: 16px; padding: 20px; background-color: #ffffff; margin-top: auto; margin-bottom: 10px;">
        <div style="display: flex; align-items: center; justify-content: space-between; gap: 20px;">
          
          <!-- Left: Official Stamp Box -->
          <div style="border: 2px dashed #94a3b8; border-radius: 12px; width: 220px; height: 90px; display: flex; flex-direction: column; align-items: center; justify-content: center; text-align: center; padding: 8px; box-sizing: border-box; background-color: #f8fafc;">
            <span style="font-size: 10px; font-weight: 900; color: #94a3b8; letter-spacing: 0.5px;">${t.seal1}</span>
            <span style="font-size: 10px; font-weight: 900; color: #94a3b8; letter-spacing: 0.5px; margin-top: 2px;">${t.seal2}</span>
          </div>

          <!-- Right: Signature Line -->
          <div style="flex: 1; display: flex; flex-direction: column; align-items: flex-end; justify-content: space-between; text-align: right; padding-top: 4px;">
            <p style="margin: 0 0 35px 0; font-size: 11px; font-weight: 900; color: #0f172a; letter-spacing: 0.5px;">${t.forCompany}</p>
            <div style="width: 250px; border-top: 1.5px solid #475569; padding-top: 6px; text-align: center;">
              <p style="margin: 0; font-size: 11px; font-weight: 900; color: #0f172a;">${t.sigTitle}</p>
              <p style="margin: 3px 0 0 0; font-size: 10px; font-weight: 600; color: #64748b;">${t.designation}</p>
            </div>
          </div>
        </div>
      </div>

      <!-- 7. Footer Bar -->
      <div style="display: flex; align-items: center; justify-content: space-between; border-top: 1px solid #e2e8f0; padding-top: 10px; font-size: 9px; font-weight: 600; color: #94a3b8;">
        <span>${t.footer}</span>
        <span>Page 1 of 1</span>
      </div>
    </div>
  `;

  document.body.appendChild(container);

  try {
    const canvas = await html2canvas(container, {
      scale: 2,
      useCORS: true,
      logging: false,
      backgroundColor: '#ffffff'
    });

    document.body.removeChild(container);

    const pdf = new jsPDF('p', 'mm', 'a4');
    const pdfWidth = pdf.internal.pageSize.getWidth();
    const pdfHeight = pdf.internal.pageSize.getHeight();

    const imgData = canvas.toDataURL('image/jpeg', 0.95);
    pdf.addImage(imgData, 'JPEG', 0, 0, pdfWidth, pdfHeight);

    pdf.save(filename);
  } catch (err) {
    if (document.body.contains(container)) {
      document.body.removeChild(container);
    }
    throw err;
  }
};

/**
 * Generate Executive System User Manual PDF
 * 4-Page Executive Standard Operating Procedures (SOP) & System Manual formatted specifically for C-suite Executives & Department Heads.
 */
export const generateUserManualPDF = async ({
  companyName = 'DPI Attendance Systems',
  filename = 'DPI_System_User_Manual.pdf'
}) => {
  const html2canvas = (await import('html2canvas-pro')).default;
  const { jsPDF } = await import('jspdf');

  const logoBase64 = await getDPILogoBase64();

  // Temporary container for 4-Page Executive Manual
  const wrapper = document.createElement('div');
  wrapper.style.position = 'absolute';
  wrapper.style.left = '-9999px';
  wrapper.style.top = '-9999px';
  wrapper.style.width = '794px'; // Standard A4 width at 96 DPI
  wrapper.style.backgroundColor = '#ffffff';

  wrapper.innerHTML = `
    <!-- PAGE 1: EXECUTIVE COVER, ARCHITECTURE & LIVE PUNCH RADAR -->
    <div id="manual-page-1" style="width: 794px; min-height: 1123px; padding: 40px; box-sizing: border-box; background-color: #ffffff; font-family: 'Inter', system-ui, -apple-system, sans-serif; display: flex; flex-direction: column; justify-content: space-between; page-break-after: always;">
      <div>
        <!-- Executive Header -->
        <div style="display: flex; align-items: center; justify-content: space-between; border-bottom: 2.5px solid #2563eb; padding-bottom: 14px; margin-bottom: 20px;">
          <div style="display: flex; align-items: center; gap: 14px;">
            ${logoBase64 ? `<img src="${logoBase64}" style="width: 48px; height: 48px; object-fit: contain;" />` : ''}
            <div>
              <h1 style="margin: 0; font-size: 22px; font-weight: 900; color: #1d4ed8; letter-spacing: -0.5px;">${companyName.toUpperCase()}</h1>
              <p style="margin: 2px 0 0 0; font-size: 10px; font-weight: 800; color: #64748b; text-transform: uppercase; letter-spacing: 1px;">Enterprise Biometric Operations &amp; User Handbook</p>
            </div>
          </div>
          <div style="text-align: right;">
            <span style="background-color: #eff6ff; color: #1d4ed8; border: 1px solid #bfdbfe; font-size: 9px; font-weight: 900; padding: 4px 10px; border-radius: 8px; text-transform: uppercase;">EXECUTIVE SOP MANUAL</span>
            <p style="margin: 4px 0 0 0; font-size: 9px; font-weight: 600; color: #64748b;">Ref: SOP-DPI-2026-EXEC • July 2026</p>
          </div>
        </div>

        <!-- Cover Banner -->
        <div style="background: linear-gradient(135deg, #0f172a 0%, #1e293b 100%); color: #ffffff; border-radius: 18px; padding: 22px 26px; margin-bottom: 20px; box-shadow: 0 10px 15px -3px rgba(0,0,0,0.1);">
          <span style="background-color: #2563eb; color: #ffffff; font-size: 9px; font-weight: 900; text-transform: uppercase; padding: 3px 10px; border-radius: 14px; letter-spacing: 1px; display: inline-block; margin-bottom: 8px;">STANDARD OPERATING PROCEDURES (SOP)</span>
          <h2 style="margin: 0; font-size: 20px; font-weight: 900; letter-spacing: -0.3px;">Executive System Manual &amp; Feature Specifications</h2>
          <p style="margin: 6px 0 0 0; font-size: 11px; font-weight: 500; color: #94a3b8; line-height: 1.5;">
            Official administrative directives, biometric attendance radar protocols, workforce directory controls, leave allocations, punch regularizations, and multi-language notice board circulars.
          </p>
        </div>

        <!-- Section Index -->
        <div style="background-color: #f1f5f9; border: 1.5px solid #cbd5e1; border-radius: 14px; padding: 12px 16px; margin-bottom: 20px; font-size: 9.5px; color: #334155;">
          <strong style="color: #0f172a; font-weight: 900; text-transform: uppercase; letter-spacing: 0.5px;">📋 ADMINISTRATIVE SECTIONS INDEX:</strong>
          <div style="display: grid; grid-template-columns: repeat(4, 1fr); gap: 8px; margin-top: 8px; font-weight: 700; color: #1e293b;">
            <span>1.0 System Security &amp; Access</span>
            <span>2.0 Biometric Radar Logs</span>
            <span>3.0 Directory Governance</span>
            <span>4.0 Executive Analytics</span>
            <span>5.0 Leave Allocation (SOP)</span>
            <span>6.0 On Duty (OD) Travel</span>
            <span>7.0 Punch Regularization</span>
            <span>8.0 Corporate Calendar</span>
            <span>9.0 Multi-Lang Circulars</span>
            <span>10.0 Comprehensive Reports</span>
            <span>11.0 Compliance Audit FAQ</span>
            <span>12.0 Technical Governance</span>
          </div>
        </div>

        <!-- Section 1.0: System Security Architecture -->
        <div style="background-color: #f8fafc; border: 1.5px solid #e2e8f0; border-radius: 16px; padding: 18px; margin-bottom: 20px;">
          <h3 style="margin: 0 0 10px 0; font-size: 12px; font-weight: 900; color: #1d4ed8; text-transform: uppercase; letter-spacing: 0.5px;">
            🛡️ 1.0 SYSTEM OVERVIEW &amp; SECURITY GOVERNANCE
          </h3>
          <p style="margin: 0 0 10px 0; font-size: 11px; font-weight: 500; color: #334155; line-height: 1.6;">
            <strong>DPI Attendance Portal</strong> operates under a strict <strong>Administrator-Only Access Control Model</strong>. Factory workers and general personnel do not access the web software. All biometric monitoring, punch corrections, leave assignments, and official notice exports are performed exclusively by authorized HR Officers and Executives.
          </p>

          <div style="background-color: #ffffff; border: 1px solid #cbd5e1; border-radius: 12px; padding: 12px; text-align: center; margin-bottom: 10px;">
            <span style="font-size: 9px; font-weight: 900; color: #475569; text-transform: uppercase; letter-spacing: 0.5px; display: block; margin-bottom: 6px;">Enterprise Biometric Data Pipeline</span>
            <div style="display: flex; align-items: center; justify-content: space-around;">
              <div style="background-color: #eff6ff; border: 1px solid #93c5fd; padding: 6px 12px; border-radius: 8px; font-size: 9px; font-weight: 800; color: #1e40af;">
                📷 Biometric Devices<br/><span style="font-size: 8px; font-weight: 500; color: #3b82f6;">Face &amp; Finger Terminal</span>
              </div>
              <span style="font-size: 12px; color: #94a3b8; font-weight: 900;">➔</span>
              <div style="background-color: #f0fdf4; border: 1px solid #86efac; padding: 6px 12px; border-radius: 8px; font-size: 9px; font-weight: 800; color: #166534;">
                ⚡ Encrypted Sync<br/><span style="font-size: 8px; font-weight: 500; color: #22c55e;">Local DB &amp; Cloud Gateway</span>
              </div>
              <span style="font-size: 12px; color: #94a3b8; font-weight: 900;">➔</span>
              <div style="background-color: #faf5ff; border: 1px solid #d8b4fe; padding: 6px 12px; border-radius: 8px; font-size: 9px; font-weight: 800; color: #6b21a8;">
                📊 DPI Admin Radar<br/><span style="font-size: 8px; font-weight: 500; color: #a855f7;">Real-Time Operations</span>
              </div>
            </div>
          </div>

          <div style="background-color: #f0fdf4; border: 1px solid #bbf7d0; border-radius: 8px; padding: 8px; font-size: 9px; color: #166534; font-weight: 600;">
            🔒 <strong>SECURITY COMPLIANCE DIRECTIVE:</strong> Administrator accounts must maintain secure authentication. All manual overrides are stamped with administrator credentials for corporate audit trails.
          </div>
        </div>

        <!-- Section 2.0: Live Biometric Radar -->
        <div style="background-color: #ffffff; border: 1.5px solid #e2e8f0; border-radius: 16px; padding: 18px;">
          <h3 style="margin: 0 0 10px 0; font-size: 12px; font-weight: 900; color: #1d4ed8; text-transform: uppercase; letter-spacing: 0.5px;">
            ⏱️ 2.0 LIVE BIOMETRIC PUNCH LOGS &amp; ATTENDANCE VELOCITY
          </h3>
          <p style="margin: 0 0 10px 0; font-size: 11px; font-weight: 500; color: #334155; line-height: 1.5;">
            The <strong>Punch Logs</strong> module provides continuous visibility into every biometric clock-in and clock-out event across all facility divisions.
          </p>

          <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 10px; font-size: 9.5px; color: #334155; margin-bottom: 10px;">
            <div style="background-color: #f8fafc; border: 1px solid #e2e8f0; border-radius: 8px; padding: 8px;">
              <strong style="color: #16a34a;">🟢 ON FLOOR NOW:</strong> Real-time headcount calculation of personnel currently checked IN.
            </div>
            <div style="background-color: #f8fafc; border: 1px solid #e2e8f0; border-radius: 8px; padding: 8px;">
              <strong style="color: #2563eb;">🔵 FILTERED LOGS:</strong> Total log count matching active search or department criteria.
            </div>
            <div style="background-color: #f8fafc; border: 1px solid #e2e8f0; border-radius: 8px; padding: 8px;">
              <strong style="color: #9333ea;">⚡ RECENT VELOCITY:</strong> Biometric swipe rate captured over the trailing 60 minutes.
            </div>
            <div style="background-color: #f8fafc; border: 1px solid #e2e8f0; border-radius: 10px; padding: 8px;">
              <strong style="color: #dc2626;">🚨 AUTO-OUT ALERTS:</strong> Automated system flags for shifts exceeding maximum duration limits.
            </div>
          </div>

          <div style="background-color: #eff6ff; border: 1px solid #bfdbfe; border-radius: 8px; padding: 8px; font-size: 9px; color: #1e40af; font-weight: 600;">
            💡 <strong>OPERATIONAL AUDIT TIP:</strong> Click on any employee row to open the interactive <em>Employee Timeline Drawer</em>, detailing exact punch sequences, daily shift duration, and break times.
          </div>
        </div>
      </div>

      <!-- Page 1 Footer -->
      <div style="display: flex; align-items: center; justify-content: space-between; border-top: 1px solid #e2e8f0; padding-top: 10px; font-size: 9px; font-weight: 600; color: #94a3b8;">
        <span>${companyName} — Executive Operating Manual</span>
        <span>Page 1 of 4</span>
      </div>
    </div>

    <!-- PAGE 2: WORKFORCE DIRECTORY GOVERNANCE & EXECUTIVE ANALYTICS -->
    <div id="manual-page-2" style="width: 794px; min-height: 1123px; padding: 40px; box-sizing: border-box; background-color: #ffffff; font-family: 'Inter', system-ui, -apple-system, sans-serif; display: flex; flex-direction: column; justify-content: space-between; page-break-after: always;">
      <div>
        <!-- Executive Header -->
        <div style="display: flex; align-items: center; justify-content: space-between; border-bottom: 2px solid #e2e8f0; padding-bottom: 12px; margin-bottom: 20px;">
          <div style="display: flex; align-items: center; gap: 10px;">
            ${logoBase64 ? `<img src="${logoBase64}" style="width: 32px; height: 32px; object-fit: contain;" />` : ''}
            <span style="font-size: 14px; font-weight: 900; color: #0f172a;">SYSTEM MANUAL — DIRECTORY GOVERNANCE &amp; ANALYTICS</span>
          </div>
          <span style="font-size: 10px; font-weight: 800; color: #2563eb; font-family: monospace;">SECTIONS 3.0 &amp; 4.0</span>
        </div>

        <!-- Section 3.0: Workforce Directory Governance -->
        <div style="background-color: #f8fafc; border: 1.5px solid #e2e8f0; border-radius: 16px; padding: 18px; margin-bottom: 20px;">
          <h3 style="margin: 0 0 10px 0; font-size: 12px; font-weight: 900; color: #1d4ed8; text-transform: uppercase; letter-spacing: 0.5px;">
            👥 3.0 WORKFORCE DIRECTORY &amp; MASTER REGISTRY GOVERNANCE
          </h3>
          <p style="margin: 0 0 10px 0; font-size: 11px; font-weight: 500; color: #334155; line-height: 1.6;">
            The <strong>Directory</strong> tab serves as the central employee master registry, detailing live presence status, department assignments, designations, worked hours, and overtime tallies.
          </p>

          <div style="background-color: #ffffff; border: 1px solid #cbd5e1; border-radius: 12px; padding: 14px; margin-bottom: 10px;">
            <h4 style="margin: 0 0 6px 0; font-size: 11px; font-weight: 900; color: #0f172a;">Display Mode Switcher &amp; Control Bar Guide:</h4>
            <ul style="margin: 0; padding-left: 18px; font-size: 10px; font-weight: 500; color: #475569; line-height: 1.6;">
              <li><strong>Grid View Cards <code>[ ▦ ]</code>:</strong> Displays 3D profile cards with avatar, presence badge, total shift hours, and quick drawer launcher.</li>
              <li><strong>Table List View <code>[ ≡ ]</code>:</strong> Displays a high-density tabular list optimized for fast scanning across hundreds of employees.</li>
              <li><strong>Switcher Location:</strong> Positioned at the bottom-right of the directory bar right next to <code>PAGE SIZE: 8 16 24 All</code>.</li>
              <li><strong>Page Size Dropdown:</strong> Select display pagination (<code>8</code>, <code>16</code>, <code>24</code>, or <code>All</code>).</li>
              <li><strong>Sorting Engine:</strong> Sort by Employee Name (A-Z), Worked Hours (High to Low), or Presence Status.</li>
            </ul>
          </div>

          <div style="background-color: #eff6ff; border: 1px solid #bfdbfe; border-radius: 8px; padding: 8px; font-size: 9px; color: #1e40af; font-weight: 600;">
            💡 <strong>SEARCH SHORTCUT:</strong> Enter employee ID numbers (e.g. <code>104</code>) directly into the search bar to instantly isolate individual worker cards without typing full names.
          </div>
        </div>

        <!-- Section 4.0: Executive Analytics & Overtime -->
        <div style="background-color: #ffffff; border: 1.5px solid #e2e8f0; border-radius: 16px; padding: 18px;">
          <h3 style="margin: 0 0 10px 0; font-size: 12px; font-weight: 900; color: #1d4ed8; text-transform: uppercase; letter-spacing: 0.5px;">
            📊 4.0 EXECUTIVE WORKFORCE ANALYTICS &amp; COMPLIANCE METRICS
          </h3>
          <p style="margin: 0 0 10px 0; font-size: 11px; font-weight: 500; color: #334155; line-height: 1.6;">
            The <strong>Analytics</strong> tab provides high-level executive charts, punctuality index rankings, and compliance metrics for HR planning.
          </p>

          <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 10px; font-size: 9.5px; color: #334155; margin-bottom: 10px;">
            <div style="background-color: #f8fafc; border: 1px solid #e2e8f0; border-radius: 10px; padding: 10px;">
              <strong style="color: #b45309; font-size: 10.5px;">🏆 Punctuality Index &amp; Rank Badges:</strong> Identifies morning check-in compliance (>9:15 AM). Displays numeric rank badges (<code>#1</code>, <code>#2</code>) for top late arrivals.
            </div>
            <div style="background-color: #f8fafc; border: 1px solid #e2e8f0; border-radius: 10px; padding: 10px;">
              <strong style="color: #1d4ed8; font-size: 10.5px;">⏰ Overtime Velocity (>9h):</strong> Accumulates extra hours accrued beyond regular 9-hour daily shifts for payroll calculation.
            </div>
            <div style="background-color: #f8fafc; border: 1px solid #e2e8f0; border-radius: 10px; padding: 10px;">
              <strong style="color: #166534; font-size: 10.5px;">🏭 Departmental Distribution:</strong> Active attendance rates across PF Staff, NON PF Labor, and NI Groups.
            </div>
            <div style="background-color: #f8fafc; border: 1px solid #e2e8f0; border-radius: 10px; padding: 10px;">
              <strong style="color: #6b21a8; font-size: 10.5px;">📈 Peak Swipe Density:</strong> Identifies bottleneck arrival and departure hours to optimize plant turnstile queues.
            </div>
          </div>

          <div style="background-color: #f0fdf4; border: 1px solid #bbf7d0; border-radius: 8px; padding: 8px; font-size: 9px; color: #166534; font-weight: 600;">
            ⚠️ <strong>MANAGEMENT DIRECTIVE:</strong> Punctuality rankings refresh daily at midnight. Use the Export Hub to generate monthly punctuality summary PDFs for executive review.
          </div>
        </div>
      </div>

      <!-- Page 2 Footer -->
      <div style="display: flex; align-items: center; justify-content: space-between; border-top: 1px solid #e2e8f0; padding-top: 10px; font-size: 9px; font-weight: 600; color: #94a3b8;">
        <span>${companyName} — Executive Operating Manual</span>
        <span>Page 2 of 4</span>
      </div>
    </div>

    <!-- PAGE 3: STANDARD OPERATING PROCEDURES — ADMIN OPERATIONS -->
    <div id="manual-page-3" style="width: 794px; min-height: 1123px; padding: 40px; box-sizing: border-box; background-color: #ffffff; font-family: 'Inter', system-ui, -apple-system, sans-serif; display: flex; flex-direction: column; justify-content: space-between; page-break-after: always;">
      <div>
        <!-- Executive Header -->
        <div style="display: flex; align-items: center; justify-content: space-between; border-bottom: 2px solid #e2e8f0; padding-bottom: 12px; margin-bottom: 20px;">
          <div style="display: flex; align-items: center; gap: 10px;">
            ${logoBase64 ? `<img src="${logoBase64}" style="width: 32px; height: 32px; object-fit: contain;" />` : ''}
            <span style="font-size: 14px; font-weight: 900; color: #0f172a;">SYSTEM MANUAL — ADMIN OPERATIONS PROCEDURES (SOP)</span>
          </div>
          <span style="font-size: 10px; font-weight: 800; color: #2563eb; font-family: monospace;">SECTION 5.0</span>
        </div>

        <!-- Section 5.0 Overview -->
        <div style="background-color: #f8fafc; border: 1.5px solid #e2e8f0; border-radius: 14px; padding: 14px; margin-bottom: 16px;">
          <h3 style="margin: 0 0 6px 0; font-size: 12px; font-weight: 900; color: #1d4ed8; text-transform: uppercase; letter-spacing: 0.5px;">
            ⚙️ 5.0 ADMIN &amp; BUSINESS OPERATIONS DASHBOARD OVERVIEW
          </h3>
          <p style="margin: 0; font-size: 10px; font-weight: 500; color: #334155; line-height: 1.5;">
            The <strong>Admin Ops</strong> portal allows Administrators to execute direct business adjustments without modifying raw hardware biometric databases.
          </p>
        </div>

        <!-- 5.1 Leave Manager SOP -->
        <div style="background-color: #ffffff; border: 1.5px solid #e2e8f0; border-radius: 14px; padding: 14px; margin-bottom: 14px;">
          <h4 style="margin: 0 0 6px 0; font-size: 11px; font-weight: 900; color: #b45309;">🌴 5.1 LEAVE MANAGER — ALLOCATION &amp; REVOCATION PROTOCOL</h4>
          <p style="margin: 0 0 8px 0; font-size: 10px; font-weight: 500; color: #475569; line-height: 1.5;">
            <strong>Objective:</strong> Assign official leaves to employees. Supported classifications include <em>Casual Leave (CL)</em>, <em>Sick Leave (SL)</em>, <em>Earned/Paid Leave (EL)</em>, <em>Unpaid Leave (LWP)</em>, and <em>Half-Day Leave</em>.
          </p>

          <div style="background-color: #fffbebfb; border: 1px solid #fde68a; border-radius: 8px; padding: 10px; font-size: 9.5px; color: #92400e; font-weight: 600; margin-bottom: 6px;">
            <strong>Step-by-Step Execution Protocol:</strong><br/>
            1. Open Admin Ops ➔ Click <code>Leave Manager</code> sub-tab.<br/>
            2. Select Employee from dropdown ➔ Pick Leave Classification (CL/SL/EL/LWP/Half-Day).<br/>
            3. Select Start &amp; End Dates (supports single or multi-day leaves).<br/>
            4. Enter Remarks/Reason ➔ Click <code>Assign Leave Entry</code> button.
          </div>

          <div style="background-color: #eff6ff; border: 1px solid #bfdbfe; border-radius: 6px; padding: 6px; font-size: 8.5px; color: #1e40af; font-weight: 600;">
            💡 <strong>REVOCATION PROCEDURE:</strong> To revoke an accidental leave entry, click the trash icon on the right side of the active leave record card in the registry table.
          </div>
        </div>

        <!-- 5.2 On Duty Register SOP -->
        <div style="background-color: #ffffff; border: 1.5px solid #e2e8f0; border-radius: 14px; padding: 14px; margin-bottom: 14px;">
          <h4 style="margin: 0 0 6px 0; font-size: 11px; font-weight: 900; color: #1d4ed8;">💼 5.2 ON DUTY (OD) REGISTER — FIELD WORK &amp; TRAVEL PROTOCOL</h4>
          <p style="margin: 0 0 8px 0; font-size: 10px; font-weight: 500; color: #475569; line-height: 1.5;">
            <strong>Objective:</strong> Authorize off-site business travel, client visits, or factory audits. Keeps employees marked active without physical biometric punches.
          </p>

          <div style="background-color: #eff6ff; border: 1px solid #bfdbfe; border-radius: 8px; padding: 10px; font-size: 9.5px; color: #1e40af; font-weight: 600; margin-bottom: 6px;">
            <strong>Step-by-Step Execution Protocol:</strong><br/>
            1. Open Admin Ops ➔ Click <code>On Duty (OD)</code> sub-tab.<br/>
            2. Select Employee ➔ Enter Client / Duty Site Location.<br/>
            3. Select Start &amp; End Date Range ➔ Enter Work Justification.<br/>
            4. Click <code>Register On Duty</code> button.
          </div>

          <div style="background-color: #f0fdf4; border: 1px solid #bbf7d0; border-radius: 6px; padding: 6px; font-size: 8.5px; color: #166534; font-weight: 600;">
            ⚠️ <strong>ATTENDANCE COMPUTATION RULE:</strong> Active OD entries automatically override "Absent" status without requiring physical biometric scanner swipes.
          </div>
        </div>

        <!-- 5.3 Punch Regularization SOP -->
        <div style="background-color: #ffffff; border: 1.5px solid #e2e8f0; border-radius: 14px; padding: 14px;">
          <h4 style="margin: 0 0 6px 0; font-size: 11px; font-weight: 900; color: #7e22ce;">🛠️ 5.3 MANUAL PUNCH REGULARIZATION — CORRECTIONS PROTOCOL</h4>
          <p style="margin: 0 0 8px 0; font-size: 10px; font-weight: 500; color: #475569; line-height: 1.5;">
            <strong>Objective:</strong> Correct missing IN or OUT punches caused by scanner hardware glitches, unreadable fingerprints, or forgotten swipes.
          </p>

          <div style="background-color: #faf5ff; border: 1px solid #e9d5ff; border-radius: 8px; padding: 10px; font-size: 9.5px; color: #6b21a8; font-weight: 600; margin-bottom: 6px;">
            <strong>Step-by-Step Execution Protocol:</strong><br/>
            1. Open Admin Ops ➔ Click <code>Punch Corrections</code> sub-tab.<br/>
            2. Select Employee ➔ Specify Punch Date and Time (HH:MM).<br/>
            3. Choose Direction (<code>IN Check-In</code> or <code>OUT Check-Out</code>).<br/>
            4. Select Correction Reason ➔ Click <code>Insert Regularized Punch</code>.
          </div>

          <div style="background-color: #eff6ff; border: 1px solid #bfdbfe; border-radius: 6px; padding: 6px; font-size: 8.5px; color: #1e40af; font-weight: 600;">
            💡 <strong>AUDIT TRAIL COMPLIANCE:</strong> All manual entries carry a <code>[REGULARIZED]</code> system badge to distinguish them from raw biometric scanner logs.
          </div>
        </div>
      </div>

      <!-- Page 3 Footer -->
      <div style="display: flex; align-items: center; justify-content: space-between; border-top: 1px solid #e2e8f0; padding-top: 10px; font-size: 9px; font-weight: 600; color: #94a3b8;">
        <span>${companyName} — Executive Operating Manual</span>
        <span>Page 3 of 4</span>
      </div>
    </div>

    <!-- PAGE 4: CALENDAR GOVERNANCE, CIRCULAR NOTICES, REPORTS & FAQ -->
    <div id="manual-page-4" style="width: 794px; min-height: 1123px; padding: 40px; box-sizing: border-box; background-color: #ffffff; font-family: 'Inter', system-ui, -apple-system, sans-serif; display: flex; flex-direction: column; justify-content: space-between;">
      <div>
        <!-- Executive Header -->
        <div style="display: flex; align-items: center; justify-content: space-between; border-bottom: 2px solid #e2e8f0; padding-bottom: 12px; margin-bottom: 20px;">
          <div style="display: flex; align-items: center; gap: 10px;">
            ${logoBase64 ? `<img src="${logoBase64}" style="width: 32px; height: 32px; object-fit: contain;" />` : ''}
            <span style="font-size: 14px; font-weight: 900; color: #0f172a;">SYSTEM MANUAL — NOTICES, EXPORTS &amp; COMPLIANCE AUDIT</span>
          </div>
          <span style="font-size: 10px; font-weight: 800; color: #2563eb; font-family: monospace;">SECTIONS 6.0 - 9.0</span>
        </div>

        <!-- 6.0 Holiday Calendar -->
        <div style="background-color: #f8fafc; border: 1.5px solid #e2e8f0; border-radius: 14px; padding: 14px; margin-bottom: 14px;">
          <h4 style="margin: 0 0 6px 0; font-size: 11px; font-weight: 900; color: #047857;">📅 6.0 CORPORATE HOLIDAY CALENDAR &amp; MULTI-DAY SCHEDULING</h4>
          <p style="margin: 0 0 8px 0; font-size: 10px; font-weight: 500; color: #475569; line-height: 1.5;">
            Declare single or multi-day holidays (e.g. Pongal 3-day vacation), filter by category (National, Festival, Maintenance), and manage calendar schedules.
          </p>

          <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 10px; font-size: 9.5px; color: #334155; margin-bottom: 6px;">
            <div style="background-color: #ffffff; border: 1px solid #cbd5e1; border-radius: 8px; padding: 8px;">
              <strong>⚡ 1-Click 2026 Import:</strong> Single click populates all 13 official national &amp; festival holidays for 2026 instantly.
            </div>
            <div style="background-color: #ffffff; border: 1px solid #cbd5e1; border-radius: 8px; padding: 8px;">
              <strong>📅 Inline Month Grid Editor:</strong> Switch to Month View <code>[ 📅 Month ]</code> and click any date cell to declare/edit inline.
            </div>
          </div>
        </div>

        <!-- 7.0 Multi-Language PDF Circular Notices -->
        <div style="background-color: #eff6ff; border: 1.5px solid #bfdbfe; border-radius: 14px; padding: 14px; margin-bottom: 14px;">
          <h4 style="margin: 0 0 6px 0; font-size: 11px; font-weight: 900; color: #1e40af;">📄 7.0 MULTI-LANGUAGE OFFICIAL PDF CIRCULAR NOTICES</h4>
          <p style="margin: 0 0 8px 0; font-size: 10px; font-weight: 500; color: #1e3a8a; line-height: 1.5;">
            Export official 1-page Notice Board circular PDFs ready for printing and posting on factory or office notice boards.
          </p>
          <div style="display: flex; gap: 8px; font-size: 9px; font-weight: 800; margin-bottom: 6px;">
            <span style="background-color: #ffffff; border: 1px solid #93c5fd; padding: 4px 8px; border-radius: 6px; color: #1d4ed8;">🇬🇧 English Notice</span>
            <span style="background-color: #ffffff; border: 1px solid #93c5fd; padding: 4px 8px; border-radius: 6px; color: #1d4ed8;">🇮🇳 தமிழ் (Tamil Notice)</span>
            <span style="background-color: #ffffff; border: 1px solid #93c5fd; padding: 4px 8px; border-radius: 6px; color: #1d4ed8;">🇮🇳 हिन्दी (Hindi Notice)</span>
          </div>
          <p style="margin: 0; font-size: 9px; font-weight: 600; color: #1e40af;">
            <strong>Single Event Circulars:</strong> Click <code>📄 Notice</code> on any holiday card item to generate an instant notice PDF containing official letterhead, company seal box, and signature line.
          </p>
        </div>

        <!-- 8.0 Comprehensive Reports Engine -->
        <div style="background-color: #ffffff; border: 1.5px solid #e2e8f0; border-radius: 14px; padding: 14px; margin-bottom: 14px;">
          <h3 style="margin: 0 0 8px 0; font-size: 11px; font-weight: 900; color: #1d4ed8; text-transform: uppercase; letter-spacing: 0.5px;">
            📥 8.0 COMPREHENSIVE REPORTS ENGINE &amp; EXPORT HUB
          </h3>
          <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 8px; font-size: 9.5px; color: #334155;">
            <div style="background-color: #f8fafc; padding: 8px; border-radius: 8px; border: 1px solid #cbd5e1;">
              <strong>📊 Multi-Sheet Excel (.XLSX):</strong> Summary, Metrics, and Raw Logs sheets.
            </div>
            <div style="background-color: #f8fafc; padding: 8px; border-radius: 8px; border: 1px solid #cbd5e1;">
              <strong>📄 Custom Vector PDF:</strong> Printable PDF reports with Blue, Slate, Emerald, or Indigo themes.
            </div>
            <div style="background-color: #f8fafc; padding: 8px; border-radius: 8px; border: 1px solid #cbd5e1;">
              <strong>📋 CSV Clipboard Copy:</strong> Copies formatted log table directly to system clipboard.
            </div>
            <div style="background-color: #f8fafc; padding: 8px; border-radius: 8px; border: 1px solid #cbd5e1;">
              <strong>📖 System User Manual PDF:</strong> Downloads this comprehensive operating handbook.
            </div>
          </div>
        </div>

        <!-- 9.0 Compliance Audit FAQ -->
        <div style="background-color: #f8fafc; border: 1.5px solid #e2e8f0; border-radius: 14px; padding: 14px;">
          <h3 style="margin: 0 0 8px 0; font-size: 11px; font-weight: 900; color: #0f172a; text-transform: uppercase; letter-spacing: 0.5px;">
            ❓ 9.0 EXECUTIVE COMPLIANCE AUDIT &amp; TROUBLESHOOTING FAQ
          </h3>
          <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 8px; font-size: 8.5px; color: #334155;">
            <div style="background-color: #ffffff; padding: 6px 8px; border-radius: 6px; border: 1px solid #cbd5e1;">
              <strong style="color: #1d4ed8; font-size: 9px;">Q: What if an employee forgets to clock out?</strong><br/>
              <em>A:</em> Use <em>Punch Regularization</em> to insert an OUT punch, or let the system auto-clock-out after shift limits.
            </div>
            <div style="background-color: #ffffff; padding: 6px 8px; border-radius: 6px; border: 1px solid #cbd5e1;">
              <strong style="color: #1d4ed8; font-size: 9px;">Q: Do non-Latin fonts export cleanly?</strong><br/>
              <em>A:</em> Yes! Offscreen vector canvas rendering guarantees 100% font fidelity for Tamil (தமிழ்) and Hindi (हिन्दी).
            </div>
            <div style="background-color: #ffffff; padding: 6px 8px; border-radius: 6px; border: 1px solid #cbd5e1;">
              <strong style="color: #1d4ed8; font-size: 9px;">Q: How do I export data by department?</strong><br/>
              <em>A:</em> Select the desired department in Section 2 dropdown of the Export Hub before clicking Download.
            </div>
            <div style="background-color: #ffffff; padding: 6px 8px; border-radius: 6px; border: 1px solid #cbd5e1;">
              <strong style="color: #1d4ed8; font-size: 9px;">Q: Can I edit an existing holiday?</strong><br/>
              <em>A:</em> Yes! Switch to Month View <code>[ 📅 Month ]</code> in Holiday Calendar and click any date cell to edit inline.
            </div>
          </div>
        </div>
      </div>

      <!-- Page 4 Footer -->
      <div style="display: flex; align-items: center; justify-content: space-between; border-top: 1px solid #e2e8f0; padding-top: 10px; font-size: 9px; font-weight: 600; color: #94a3b8;">
        <span>${companyName} — Executive Operating Manual</span>
        <span>Page 4 of 4</span>
      </div>
    </div>
  `;

  document.body.appendChild(wrapper);

  try {
    const pdf = new jsPDF('p', 'mm', 'a4');
    const pdfWidth = pdf.internal.pageSize.getWidth();
    const pdfHeight = pdf.internal.pageSize.getHeight();

    const pages = ['manual-page-1', 'manual-page-2', 'manual-page-3', 'manual-page-4'];

    for (let i = 0; i < pages.length; i++) {
      const pageElement = wrapper.querySelector(`#${pages[i]}`);
      const canvas = await html2canvas(pageElement, {
        scale: 2,
        useCORS: true,
        logging: false,
        backgroundColor: '#ffffff'
      });

      const imgData = canvas.toDataURL('image/jpeg', 0.95);
      if (i > 0) pdf.addPage();
      pdf.addImage(imgData, 'JPEG', 0, 0, pdfWidth, pdfHeight);
    }

    document.body.removeChild(wrapper);
    pdf.save(filename);
  } catch (err) {
    if (document.body.contains(wrapper)) {
      document.body.removeChild(wrapper);
    }
    throw err;
  }
};

