// ===================================================================
// WEBAPP_UTILS.GS - COMMON HELPER FUNCTIONS FOR WEB APPLICATION
// ===================================================================
// Created: 2025-07-12
// Purpose: Shared utility functions used across all Web App features
// Dependencies: None (base utilities)
// Used by: WebApp_ExtractOrders.gs, WebApp_LabelScript.gs, WebApp_EmployeeTasks.gs

// ===================================================================
// DATE PARSING AND FORMATTING FUNCTIONS
// ===================================================================

/**
 * Parse date input into JavaScript Date object
 * Handles Vietnamese format dd/MM/yyyy and various input types
 * @param {string|Date} input - Date input in various formats
 * @returns {Date|null} - Parsed Date object or null if invalid
 */
function parseDate(input) {
  if (!input) return null;
  if (input instanceof Date) return input;
  
  // Handle string dates in Vietnamese format dd/MM/yyyy
  if (typeof input === 'string') {
    const parts = input.split(/[\/\-]/);
    if (parts.length === 3) {
      let [day, month, year] = parts.map(p => parseInt(p, 10));
      if (year < 100) year += 2000;
      const d = new Date(year, month - 1, day);
      return isNaN(d.getTime()) ? null : d;
    }
  }
  
  return null;
}

/**
 * Format Date object to Vietnamese format dd/MM/yyyy
 * @param {Date} date - JavaScript Date object
 * @returns {string} - Formatted date string or empty string if invalid
 */
function formatDate(date) {
  if (!date) return '';
  if (!(date instanceof Date)) return String(date);
  
  const day = String(date.getDate()).padStart(2, '0');
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const year = date.getFullYear();
  
  return `${day}/${month}/${year}`;
}

// ===================================================================
// STRING UTILITY FUNCTIONS
// ===================================================================

/**
 * Get last 4 characters of a string (used for Ref ID / Tracking)
 * @param {string|number} value - Input value
 * @returns {string} - Last 4 characters or original string if shorter
 */
function getLast4(value) {
  const s = String(value || "");
  return s.length >= 4 ? s.slice(-4) : s;
}

/**
 * Safely trim and convert to string
 * @param {any} value - Input value
 * @returns {string} - Trimmed string
 */
function safeString(value) {
  return String(value || '').trim();
}

/**
 * Check if string is empty or only whitespace
 * @param {string} str - Input string
 * @returns {boolean} - True if empty/whitespace
 */
function isEmpty(str) {
  return !str || String(str).trim().length === 0;
}

// ===================================================================
// GOOGLE SHEETS UTILITY FUNCTIONS
// ===================================================================

/**
 * Get list of all sheet names in current spreadsheet
 * @returns {Array<string>} - Array of sheet names
 */
function getSheetsList() {
  try {
    const ss = SpreadsheetApp.getActiveSpreadsheet();
    const sheets = ss.getSheets();
    return sheets.map(sheet => sheet.getName());
  } catch (error) {
    console.error('Error getting sheets list:', error);
    return ['Error: ' + error.toString()];
  }
}

/**
 * Get data from specified sheet
 * @param {string} sheetName - Name of the sheet
 * @returns {Object} - Result object with success status and data
 */
function getDataFromSheet(sheetName) {
  try {
    const ss = SpreadsheetApp.getActiveSpreadsheet();
    const sheet = ss.getSheetByName(sheetName);
    
    if (!sheet) {
      throw new Error(`Sheet "${sheetName}" không tồn tại`);
    }
    
    const data = sheet.getDataRange().getValues();
    return {
      success: true,
      data: data,
      sheetName: sheetName,
      rowCount: data.length,
      columnCount: data.length > 0 ? data[0].length : 0
    };
    
  } catch (error) {
    console.error(`Error getting data from sheet "${sheetName}":`, error);
    return {
      success: false,
      error: error.toString(),
      sheetName: sheetName
    };
  }
}

/**
 * Create column header mapping for faster lookups
 * @param {Array} headerRow - First row containing column headers
 * @returns {Object} - Map of column name to index
 */
function createHeaderMap(headerRow) {
  const headerMap = {};
  if (Array.isArray(headerRow)) {
    headerRow.forEach((name, idx) => {
      headerMap[String(name).trim()] = idx;
    });
  }
  return headerMap;
}

// ===================================================================
// VALIDATION FUNCTIONS
// ===================================================================

/**
 * Validate required columns exist in header map
 * @param {Object} headerMap - Column header mapping
 * @param {Array<string>} requiredColumns - Array of required column names
 * @returns {Object} - Validation result with missing columns
 */
function validateRequiredColumns(headerMap, requiredColumns) {
  const missingColumns = requiredColumns.filter(col => headerMap[col] === undefined);
  
  return {
    isValid: missingColumns.length === 0,
    missingColumns: missingColumns,
    message: missingColumns.length > 0 
      ? `❌ Thiếu cột: ${missingColumns.join(', ')}`
      : '✅ Tất cả cột bắt buộc đều có'
  };
}

/**
 * Validate date range
 * @param {string} startDateStr - Start date string
 * @param {string} endDateStr - End date string
 * @returns {Object} - Validation result
 */
function validateDateRange(startDateStr, endDateStr) {
  const startDate = new Date(startDateStr);
  const endDate = new Date(endDateStr);
  
  if (isNaN(startDate.getTime()) || isNaN(endDate.getTime())) {
    return {
      isValid: false,
      message: '❌ Ngày không hợp lệ'
    };
  }
  
  if (startDate > endDate) {
    return {
      isValid: false,
      message: '❌ Ngày bắt đầu không được lớn hơn ngày kết thúc'
    };
  }
  
  return {
    isValid: true,
    startDate: startDate,
    endDate: endDate,
    message: '✅ Khoảng ngày hợp lệ'
  };
}

// ===================================================================
// ERROR HANDLING UTILITIES
// ===================================================================

/**
 * Create standardized error response
 * @param {string} message - Error message
 * @param {Error} error - Original error object (optional)
 * @returns {Object} - Standardized error response
 */
function createErrorResponse(message, error = null) {
  return {
    success: false,
    error: message,
    details: error ? error.toString() : null,
    timestamp: new Date().toISOString()
  };
}

/**
 * Create standardized success response
 * @param {any} data - Response data
 * @param {string} message - Success message (optional)
 * @returns {Object} - Standardized success response
 */
function createSuccessResponse(data, message = null) {
  return {
    success: true,
    data: data,
    message: message,
    timestamp: new Date().toISOString()
  };
}

// ===================================================================
// LOGGING UTILITIES
// ===================================================================

/**
 * Log with timestamp and context
 * @param {string} context - Context/module name
 * @param {string} message - Log message
 * @param {string} level - Log level (INFO, WARN, ERROR)
 */
function logWithContext(context, message, level = 'INFO') {
  const timestamp = new Date().toISOString();
  const logMessage = `[${timestamp}] [${context}] [${level}] ${message}`;
  
  if (level === 'ERROR') {
    console.error(logMessage);
  } else if (level === 'WARN') {
    console.warn(logMessage);
  } else {
    console.log(logMessage);
  }
}

// ===================================================================
// ARRAY UTILITIES
// ===================================================================

/**
 * Remove duplicates from array
 * @param {Array} array - Input array
 * @returns {Array} - Array without duplicates
 */
function removeDuplicates(array) {
  return [...new Set(array)];
}

/**
 * Group array by key function
 * @param {Array} array - Input array
 * @param {Function} keyFn - Function to extract key from item
 * @returns {Object} - Grouped object
 */
function groupBy(array, keyFn) {
  return array.reduce((groups, item) => {
    const key = keyFn(item);
    if (!groups[key]) {
      groups[key] = [];
    }
    groups[key].push(item);
    return groups;
  }, {});
}

/**
 * Safely find column index by trying multiple possible names
 * @param {Array} header - Header row array
 * @param {Array<string>} possibleNames - Array of possible column names to search for
 * @returns {number} - Column index (1-based for Google Sheets) or -1 if not found
 */
function findColumnSafely(header, possibleNames) {
  if (!Array.isArray(header) || !Array.isArray(possibleNames)) {
    console.log('findColumnSafely: Invalid input - not arrays');
    return -1;
  }
  
  console.log(`findColumnSafely: Looking for columns: ${possibleNames.join(', ')}`);
  
  for (const name of possibleNames) {
    const targetName = String(name).trim().toLowerCase();
    
    for (let i = 0; i < header.length; i++) {
      const headerValue = String(header[i] || '').trim().toLowerCase();
      
      // Log comparison
      if (i < 10) { // Only log first 10 columns to avoid spam
        console.log(`  Comparing "${headerValue}" with "${targetName}"`);
      }
      
      // Exact match
      if (headerValue === targetName) {
        console.log(`  ✅ Found match at column ${i + 1}`);
        return i + 1; // Convert to 1-based index for Google Sheets
      }
    }
  }
  
  console.log('  ❌ No match found');
  return -1; // Not found
}

// ===================================================================
// VERSION INFO
// ===================================================================

/**
 * Test function to detect Task column in specified sheet
 * @param {string} testSheetName - Name of sheet to test (default: 'Task_My Nguyen')
 * @returns {Object} - Test result with column analysis
 */
function testTaskColumnDetection(testSheetName = 'Task_My Nguyen') {
  try {
    const ss = SpreadsheetApp.getActiveSpreadsheet();
    const sheet = ss.getSheetByName(testSheetName);
    
    if (!sheet) {
      return {
        success: false,
        error: `Sheet "${testSheetName}" not found`
      };
    }
    
    const data = sheet.getDataRange().getValues();
    
    if (data.length < 3) {
      return {
        success: false,
        error: 'Sheet does not have enough rows (need at least 3)'
      };
    }
    
    const header = data[2]; // Row 3
    
    // Test column H specifically
    const columnH = header[7]; // Index 7 = Column H
    
    const result = {
      success: true,
      sheetName: testSheetName,
      headerRow: 3,
      totalColumns: header.length,
      columnHIndex: 7,
      columnHValue: columnH,
      columnHIsTask: String(columnH).trim().toLowerCase() === 'task',
      allColumns: {},
      taskColumnAnalysis: {},
      sampleDataRows: []
    };
    
    // Map all columns
    header.forEach((col, idx) => {
      const colLetter = String.fromCharCode(65 + idx);
      result.allColumns[`${colLetter} (${idx + 1})`] = col;
    });
    
    // Find Task column
    let taskColumnFound = -1;
    for (let i = 0; i < header.length; i++) {
      if (String(header[i]).trim().toLowerCase() === 'task') {
        taskColumnFound = i + 1;
        break;
      }
    }
    
    result.taskColumnPosition = taskColumnFound;
    result.taskColumnLetter = taskColumnFound > 0 ? String.fromCharCode(64 + taskColumnFound) : 'NOT FOUND';
    
    // Analyze Task column data if found
    if (taskColumnFound > 0) {
      const taskColIndex = taskColumnFound - 1; // Convert to 0-based
      const taskValues = [];
      const uniqueValues = new Set();
      
      // Sample first 10 data rows (starting from row 4, index 3)
      for (let i = 3; i < Math.min(data.length, 13); i++) {
        const row = data[i];
        const taskValue = row[taskColIndex];
        const workingCode = row[11] || 'N/A'; // Column L usually has working code
        
        taskValues.push({
          row: i + 1,
          workingCode: workingCode,
          taskValue: taskValue,
          taskValueType: typeof taskValue,
          taskValueString: String(taskValue)
        });
        
        uniqueValues.add(String(taskValue));
      }
      
      result.taskColumnAnalysis = {
        columnIndex: taskColIndex,
        columnLetter: String.fromCharCode(65 + taskColIndex),
        sampleValues: taskValues,
        uniqueValues: Array.from(uniqueValues),
        totalUniqueValues: uniqueValues.size
      };
      
      // Check if column is protected
      try {
        const protection = sheet.getRange(4, taskColumnFound).getProtection();
        result.taskColumnAnalysis.isProtected = protection ? true : false;
        result.taskColumnAnalysis.protectionDescription = protection ? protection.getDescription() : 'No protection';
      } catch (e) {
        result.taskColumnAnalysis.isProtected = false;
        result.taskColumnAnalysis.protectionDescription = 'Could not check protection';
      }
    }
    
    return result;
    
  } catch (error) {
    return {
      success: false,
      error: error.toString()
    };
  }
}

/**
 * Test updating Task column with different values
 * @param {string} testSheetName - Sheet name to test
 * @param {string} testWorkingCode - Working code to find and test
 * @returns {Object} - Test result
 */
function testTaskColumnUpdate(testSheetName = 'Task_My Nguyen', testWorkingCode = null) {
  try {
    const ss = SpreadsheetApp.getActiveSpreadsheet();
    const sheet = ss.getSheetByName(testSheetName);
    
    if (!sheet) {
      return { success: false, error: `Sheet "${testSheetName}" not found` };
    }
    
    const data = sheet.getDataRange().getValues();
    if (data.length < 4) {
      return { success: false, error: 'Not enough data rows' };
    }
    
    const header = data[2]; // Row 3
    
    // Find columns
    const taskCol = 8; // Column H (fallback)
    const workingCodeCol = findColumnSafely(header, ['Working Code']);
    
    if (workingCodeCol === -1) {
      return { success: false, error: 'Working Code column not found' };
    }
    
    // Find a test row
    let testRow = -1;
    let testRowWorkingCode = testWorkingCode;
    
    if (!testWorkingCode) {
      // Use first available working code
      for (let i = 3; i < data.length; i++) {
        const code = String(data[i][workingCodeCol - 1] || '').trim();
        if (code) {
          testRow = i + 1;
          testRowWorkingCode = code;
          break;
        }
      }
    } else {
      // Find specific working code
      for (let i = 3; i < data.length; i++) {
        const code = String(data[i][workingCodeCol - 1] || '').trim();
        if (code === testWorkingCode) {
          testRow = i + 1;
          break;
        }
      }
    }
    
    if (testRow === -1) {
      return { success: false, error: 'No test row found' };
    }
    
    // Test different values
    const testValues = ['x', 'X', '✓', '1', formatDate(new Date()), 'DELIVERED'];
    const results = [];
    
    // Get original value
    const originalValue = sheet.getRange(testRow, taskCol).getValue();
    
    for (const testValue of testValues) {
      try {
        // Set test value
        sheet.getRange(testRow, taskCol).setValue(testValue);
        
        // Verify it was set
        const newValue = sheet.getRange(testRow, taskCol).getValue();
        
        results.push({
          testValue: testValue,
          setValue: testValue,
          actualValue: newValue,
          success: String(newValue) === String(testValue),
          type: typeof newValue
        });
        
        // Wait a bit
        Utilities.sleep(100);
        
      } catch (error) {
        results.push({
          testValue: testValue,
          success: false,
          error: error.toString()
        });
      }
    }
    
    // Restore original value
    try {
      sheet.getRange(testRow, taskCol).setValue(originalValue);
    } catch (e) {
      console.warn('Could not restore original value:', e);
    }
    
    return {
      success: true,
      testRow: testRow,
      testColumn: taskCol,
      testWorkingCode: testRowWorkingCode,
      originalValue: originalValue,
      testResults: results,
      message: `Tested ${results.length} values on row ${testRow}, column ${taskCol}`
    };
    
  } catch (error) {
    return {
      success: false,
      error: error.toString()
    };
  }
}

/**
 * Get version information for this utilities module
 * @returns {Object} - Version information
 */
function getUtilsVersion() {
  return {
    module: 'WebApp_Utils',
    version: '1.0.0',
    created: '2025-07-12',
    description: 'Common utility functions for Web Application',
    functions: [
      'parseDate', 'formatDate', 'getLast4', 'safeString', 'isEmpty',
      'getSheetsList', 'getDataFromSheet', 'createHeaderMap',
      'validateRequiredColumns', 'validateDateRange',
      'createErrorResponse', 'createSuccessResponse',
      'logWithContext', 'removeDuplicates', 'groupBy', 'findColumnSafely',
      'testTaskColumnDetection'
    ]
  };
}