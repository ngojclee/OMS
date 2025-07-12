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

// ===================================================================
// VERSION INFO
// ===================================================================

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
      'logWithContext', 'removeDuplicates', 'groupBy'
    ]
  };
}