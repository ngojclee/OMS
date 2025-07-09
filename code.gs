function doGet(e) {
  const page = e.parameter.page || 'home';
  
  let template;
  switch(page) {
    case 'home':
      template = HtmlService.createTemplateFromFile('home');
      break;
    case 'shipping-labels':
      template = HtmlService.createTemplateFromFile('shipping-labels');
      break;
    case 'extract-orders':
      template = HtmlService.createTemplateFromFile('extract-orders');
      break;
    case 'employee-tasks':
      template = HtmlService.createTemplateFromFile('employee-tasks');
      break;
    case 'inventory':
      template = HtmlService.createTemplateFromFile('inventory');
      break;
    case 'reports':
      template = HtmlService.createTemplateFromFile('reports');
      break;
    case 'settings':
      template = HtmlService.createTemplateFromFile('settings');
      break;
    default:
      template = HtmlService.createTemplateFromFile('home');
  }
  
  return template.evaluate()
    .setXFrameOptionsMode(HtmlService.XFrameOptionsMode.ALLOWALL)
    .setTitle('Hệ thống quản lý phòng ban');
}

function include(filename) {
  return HtmlService.createHtmlOutputFromFile(filename).getContent();
}

// ========== EMPLOYEE TASKS FUNCTIONS ==========
function getEmployeeList() {
  try {
    const ss = SpreadsheetApp.getActiveSpreadsheet();
    const sheet = ss.getSheetByName('Employee Tasks'); // Tên sheet chứa task
    
    if (!sheet) {
      // Fallback: tạo danh sách mẫu nếu chưa có sheet
      return ['Nguyễn Văn A', 'Trần Thị B', 'Lê Văn C', 'Phạm Thị D'];
    }
    
    const data = sheet.getDataRange().getValues();
    const employeeCol = 1; // Cột B chứa tên nhân viên
    
    const employees = new Set();
    for (let i = 1; i < data.length; i++) {
      const employee = data[i][employeeCol];
      if (employee && String(employee).trim()) {
        employees.add(String(employee).trim());
      }
    }
    
    return Array.from(employees).sort();
    
  } catch (error) {
    // Return default list if error
    return ['Nguyễn Văn A', 'Trần Thị B', 'Lê Văn C', 'Phạm Thị D'];
  }
}

function getEmployeeTasks(employeeName) {
  try {
    const ss = SpreadsheetApp.getActiveSpreadsheet();
    const sheet = ss.getSheetByName('Employee Tasks');
    
    if (!sheet) {
      // Return sample data if sheet doesn't exist
      return {
        success: true,
        tasks: getSampleTasks(employeeName)
      };
    }
    
    const data = sheet.getDataRange().getValues();
    const header = data[0];
    
    // Map column headers
    const colMap = {};
    header.forEach((name, idx) => {
      colMap[String(name).trim()] = idx;
    });
    
    const tasks = [];
    
    for (let i = 1; i < data.length; i++) {
      const row = data[i];
      const employee = String(row[colMap['Employee'] || 1] || '').trim();
      
      if (employee === employeeName) {
        const deadline = row[colMap['Deadline'] || 4];
        const today = new Date();
        const deadlineDate = parseDate(deadline) || new Date();
        
        const task = {
          date: formatDate(row[colMap['Date'] || 0] || new Date()),
          shop: String(row[colMap['Shop'] || 2] || ''),
          itemName: String(row[colMap['Item Name'] || 3] || ''),
          description: String(row[colMap['Description'] || 5] || ''),
          deadline: formatDate(deadlineDate),
          workingCode: String(row[colMap['Working Code'] || 6] || ''),
          sku: String(row[colMap['SKU'] || 7] || ''),
          status: String(row[colMap['Status'] || 8] || 'Pending'),
          isCompleted: String(row[colMap['Status'] || 8] || '').toLowerCase() === 'completed',
          isUrgent: deadlineDate < today || String(row[colMap['Priority'] || 9] || '').toLowerCase() === 'urgent'
        };
        
        tasks.push(task);
      }
    }
    
    // Sort by deadline
    tasks.sort((a, b) => {
      const dateA = new Date(a.deadline.split('/').reverse().join('/'));
      const dateB = new Date(b.deadline.split('/').reverse().join('/'));
      return dateA - dateB;
    });
    
    return {
      success: true,
      tasks: tasks
    };
    
  } catch (error) {
    return {
      success: false,
      error: error.toString()
    };
  }
}

function getSampleTasks(employeeName) {
  // Sample data for demo
  const sampleTasks = [
    {
      date: '08/01/2025',
      shop: 'Shopee',
      itemName: 'Áo thun cotton basic',
      description: 'Áo thun cotton 100%, màu trắng, size M. Cần kiểm tra chất lượng vải và đường may.',
      deadline: '10/01/2025',
      workingCode: 'WC001',
      sku: 'AT001',
      status: 'Pending',
      isCompleted: false,
      isUrgent: false
    },
    {
      date: '07/01/2025',
      shop: 'Lazada',
      itemName: 'Quần jeans slim fit',
      description: 'Quần jeans nam, màu xanh đậm, size 32. Kiểm tra độ co giãn và màu sắc.',
      deadline: '09/01/2025',
      workingCode: 'WC002',
      sku: 'QJ002',
      status: 'Urgent',
      isCompleted: false,
      isUrgent: true
    },
    {
      date: '06/01/2025',
      shop: 'Tiki',
      itemName: 'Giày sneaker trắng',
      description: 'Giày thể thao nam, màu trắng, size 42. Kiểm tra chất lượng đế và độ bền.',
      deadline: '12/01/2025',
      workingCode: 'WC003',
      sku: 'GS003',
      status: 'Completed',
      isCompleted: true,
      isUrgent: false
    }
  ];
  
  return sampleTasks;
}

function getProductImages() {
  try {
    const ss = SpreadsheetApp.getActiveSpreadsheet();
    const sheet = ss.getSheetByName('Mr Ngoc - Products');
    
    if (!sheet) {
      return {}; // Return empty if sheet doesn't exist
    }
    
    const data = sheet.getDataRange().getValues();
    const header = data[0];
    
    // Find SKU and Image columns
    let skuCol = -1;
    let imageCol = -1;
    
    header.forEach((name, idx) => {
      const colName = String(name).toLowerCase().trim();
      if (colName.includes('sku') || colName === 'mã sản phẩm') {
        skuCol = idx;
      }
      if (colName.includes('image') || colName.includes('hình') || colName === 'link ảnh') {
        imageCol = idx;
      }
    });
    
    if (skuCol === -1 || imageCol === -1) {
      return {}; // Return empty if columns not found
    }
    
    const images = {};
    
    for (let i = 1; i < data.length; i++) {
      const row = data[i];
      const sku = String(row[skuCol] || '').trim();
      const imageUrl = String(row[imageCol] || '').trim();
      
            if (sku && imageUrl && imageUrl.startsWith('http')) {
        images[sku] = imageUrl;
      }
    }
    
    return images;
    
  } catch (error) {
    console.error('Error loading product images:', error);
    return {};
  }
}

function updateTaskStatus(workingCode, isCompleted) {
  try {
    const ss = SpreadsheetApp.getActiveSpreadsheet();
    const sheet = ss.getSheetByName('Employee Tasks');
    
    if (!sheet) {
      return {
        success: false,
        error: 'Sheet "Employee Tasks" không tồn tại'
      };
    }
    
    const data = sheet.getDataRange().getValues();
    const header = data[0];
    
    // Find Working Code and Status columns
    let workingCodeCol = -1;
    let statusCol = -1;
    
    header.forEach((name, idx) => {
      const colName = String(name).toLowerCase().trim();
      if (colName.includes('working code') || colName === 'mã công việc') {
        workingCodeCol = idx;
      }
      if (colName.includes('status') || colName === 'trạng thái') {
        statusCol = idx;
      }
    });
    
    if (workingCodeCol === -1) {
      return {
        success: false,
        error: 'Không tìm thấy cột Working Code'
      };
    }
    
    // Find and update the task
    for (let i = 1; i < data.length; i++) {
      const row = data[i];
      const code = String(row[workingCodeCol] || '').trim();
      
      if (code === workingCode) {
        if (statusCol !== -1) {
          const newStatus = isCompleted ? 'Completed' : 'Pending';
          sheet.getRange(i + 1, statusCol + 1).setValue(newStatus);
        }
        
        return {
          success: true,
          message: `Đã cập nhật trạng thái task ${workingCode}`
        };
      }
    }
    
    return {
      success: false,
      error: 'Không tìm thấy task với Working Code: ' + workingCode
    };
    
  } catch (error) {
    return {
      success: false,
      error: error.toString()
    };
  }
}

// ========== SHIPPING LABELS FUNCTIONS ==========
function getShippingLabels() {
  try {
    const ss = SpreadsheetApp.getActiveSpreadsheet();
    const sheet = ss.getSheetByName('Label');
    
    if (!sheet) {
      throw new Error('Sheet "Label" không tìm thấy');
    }
    
    const data = sheet.getDataRange().getValues();
    const labels = [];
    
    for (let i = 1; i < data.length; i++) {
      const row = data[i];
      
      for (let block = 0; block < 3; block++) {
        const startCol = block * 2;
        const rowNum = row[startCol];
        const customer = row[startCol + 1];
        
        if (rowNum && customer && 
            String(rowNum).trim() && 
            String(customer).trim() && 
            !String(customer).match(/^\d+$/)) {
          
          const label = {
            code: String(rowNum).trim(),
            customer: String(customer).trim(),
            address: []
          };
          
          for (let j = i + 1; j < Math.min(i + 8, data.length); j++) {
            const addressLine = data[j][startCol + 1];
            if (addressLine && 
                String(addressLine).trim() && 
                String(addressLine).trim() !== customer &&
                !String(addressLine).match(/^\d+$/)) {
              label.address.push(String(addressLine).trim());
            }
          }
          
          labels.push(label);
        }
      }
    }
    
    return {
      success: true,
      data: labels,
      count: labels.length
    };
    
  } catch (error) {
    return {
      success: false,
      error: error.toString(),
      data: []
    };
  }
}

function getSheetsList() {
  try {
    const ss = SpreadsheetApp.getActiveSpreadsheet();
    const sheets = ss.getSheets();
    return sheets.map(sheet => sheet.getName());
  } catch (error) {
    return ['Error: ' + error.toString()];
  }
}

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
      sheetName: sheetName
    };
    
  } catch (error) {
    return {
      success: false,
      error: error.toString()
    };
  }
}

// ========== EXTRACT ORDERS FUNCTIONS ==========
/**
 * Chuyển "dd/MM/yyyy" hoặc "d/M/yy" thành Date
 */
function parseDate(input) {
  if (input instanceof Date) return input;
  const parts = String(input).split(/[\/\-]/);
  if (parts.length !== 3) return null;
  let [day, month, year] = parts.map(p => parseInt(p, 10));
  if (year < 100) year += 2000;
  const d = new Date(year, month - 1, day);
  return isNaN(d.getTime()) ? null : d;
}

/**
 * Lấy 4 ký tự cuối của chuỗi (dùng cho Ref ID / Tracking)
 */
function getLast4(value) {
  const s = String(value || "");
  return s.length >= 4 ? s.slice(-4) : s;
}

function extractByDateRange(startDateStr, endDateStr) {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  const sourceSheet = ss.getSheetByName("Shipping");
  if (!sourceSheet) {
    return { success: false, message: "❌ Không tìm thấy sheet 'Shipping'." };
  }

  const data      = sourceSheet.getDataRange().getValues();
  const header    = data[0];
  const headerMap = {};
  header.forEach((name, idx) => headerMap[name.trim()] = idx);
  const packedIdx = headerMap["Packed"];

  const output    = [];
  const startDate = new Date(startDateStr);
  const endDate   = new Date(endDateStr);
  const startDay  = new Date(startDate.getFullYear(), startDate.getMonth(), startDate.getDate());
  const endDay    = new Date(endDate.getFullYear(),   endDate.getMonth(),   endDate.getDate());

  if (startDay > endDay) {
    return { success: false, header: [], rows: [], message: "⚠️ Ngày bắt đầu không được lớn hơn ngày kết thúc." };
  }

  for (let i = 1; i < data.length; i++) {
    const row    = data[i];
    const raw    = row[headerMap["Date"]];
    const refID  = row[headerMap["Ref ID"]];
    if (!refID) continue;

    const rowDate = parseDate(raw);
    if (!rowDate) continue;
    const rowDay  = new Date(rowDate.getFullYear(), rowDate.getMonth(), rowDate.getDate());
    if (rowDay < startDay || rowDay > endDay) continue;

    const shop         = row[headerMap["Shop"]];
    const tracking     = row[headerMap["Tracking"]];
    const carrier      = row[headerMap["Carrier"]];
    const receiver     = row[headerMap["Receiver name *"]];
    const shortRef     = "H" + getLast4(refID);
    const shortTracking= tracking ? "V" + getLast4(tracking) : "";

    const isPacked = Boolean(row[packedIdx]);

    output.push([
      formatDate(rowDate),
      shop,
      refID,
      shortRef,
      shortTracking,
      tracking,
      carrier,
      receiver,
      isPacked
    ]);
  }

  const outputHeader = [
    "Date", "Shop", "Mã đơn", "Short Invoice",
    "Short Tracking", "Tracking", "Carrier",
    "Receiver name *", "Packed"
  ];

  return {
    success: true,
    header: outputHeader,
    rows: output,
    message: output.length
      ? `✅ Đã tìm thấy ${output.length} dòng.`
      : "⚠️ Không có dữ liệu phù hợp."
  };
}

function formatDate(date) {
  return Utilities.formatDate(date, Session.getScriptTimeZone(), "dd/MM/yyyy");
}

function updatePackedStatus(startDateStr, endDateStr, selectedIndexes) {
  const ss    = SpreadsheetApp.getActiveSpreadsheet();
  const sheet = ss.getSheetByName("Shipping");
  if (!sheet) return { success: false, message: "❌ Không tìm thấy sheet 'Shipping'." };

  const data      = sheet.getDataRange().getValues();
  const header    = data[0];
  const headerMap = {};
  header.forEach((name, idx) => headerMap[name.trim()] = idx);

  const dateCol = headerMap["Date"];
  const packedCol = headerMap["Packed"];
  const sendCol = headerMap["Send"];
  const refIdCol = headerMap["Ref ID"];

  if ([dateCol, packedCol, sendCol, refIdCol].some(c => c === undefined)) {
    return { success: false, message: "❌ Không tìm thấy một trong các cột bắt buộc." };
  }

  const startDate = new Date(startDateStr);
  const endDate   = new Date(endDateStr);
  const startDay  = new Date(startDate.getFullYear(), startDate.getMonth(), startDate.getDate());
  const endDay    = new Date(endDate.getFullYear(),   endDate.getMonth(),   endDate.getDate());

  let resultIdx = 0;
  let packedCount = 0;
  let unpackedCount = 0;
  const today = formatDate(new Date());

  for (let i = 1; i < data.length; i++) {
    const row = data[i];
    const refID = row[refIdCol];
    if (!refID) continue;

    const rowRaw  = row[dateCol];
    const rowDate = parseDate(rowRaw);
    if (!rowDate) continue;

    const rowDay = new Date(rowDate.getFullYear(), rowDate.getMonth(), rowDate.getDate());
    if (rowDay < startDay || rowDay > endDay) continue;

    const isSelected = selectedIndexes.includes(resultIdx);
    const isAlreadyPacked = !!row[packedCol];
    const isSendBlank = !row[sendCol];

    if (isSelected && !isAlreadyPacked) {
      sheet.getRange(i + 1, packedCol + 1).setValue(today);
      if (isSendBlank) {
        sheet.getRange(i + 1, sendCol + 1).setValue(today);
      }
      packedCount++;
    } else if (!isSelected && isAlreadyPacked) {
      sheet.getRange(i + 1, packedCol + 1).setValue("");
      sheet.getRange(i + 1, sendCol + 1).setValue("");
      unpackedCount++;
    }

    resultIdx++;
  }

  const messageParts = [];
  if (packedCount > 0) messageParts.push(`${packedCount} đơn được đánh dấu đã gói`);
  if (unpackedCount > 0) messageParts.push(`${unpackedCount} đơn được bỏ đánh dấu`);

  const message = messageParts.length > 0
    ? `✅ Đã cập nhật: ${messageParts.join(' và ')}.`
    : "✅ Không có thay đổi nào được thực hiện.";

  return {
    success: true,
    message: message
  };
}

// ========== SHIPPING LABELS FUNCTIONS ==========
function getShippingLabels() {
  try {
    const ss = SpreadsheetApp.getActiveSpreadsheet();
    const sheet = ss.getSheetByName('Label');
    
    if (!sheet) {
      throw new Error('Sheet "Label" không tìm thấy');
    }
    
    const data = sheet.getDataRange().getValues();
    const labels = [];
    
    for (let i = 1; i < data.length; i++) {
      const row = data[i];
      
      for (let block = 0; block < 3; block++) {
        const startCol = block * 2;
        const rowNum = row[startCol];
        const customer = row[startCol + 1];
        
        if (rowNum && customer && 
            String(rowNum).trim() && 
            String(customer).trim() && 
            !String(customer).match(/^\d+$/)) {
          
          const label = {
            code: String(rowNum).trim(),
            customer: String(customer).trim(),
            address: []
          };
          
          for (let j = i + 1; j < Math.min(i + 8, data.length); j++) {
            const addressLine = data[j][startCol + 1];
            if (addressLine && 
                String(addressLine).trim() && 
                String(addressLine).trim() !== customer &&
                !String(addressLine).match(/^\d+$/)) {
              label.address.push(String(addressLine).trim());
            }
          }
          
          labels.push(label);
        }
      }
    }
    
    return {
      success: true,
      data: labels,
      count: labels.length
    };
    
  } catch (error) {
    return {
      success: false,
      error: error.toString(),
      data: []
    };
  }
}

function getSheetsList() {
  try {
    const ss = SpreadsheetApp.getActiveSpreadsheet();
    const sheets = ss.getSheets();
    return sheets.map(sheet => sheet.getName());
  } catch (error) {
    return ['Error: ' + error.toString()];
  }
}

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
      sheetName: sheetName
    };
    
  } catch (error) {
    return {
      success: false,
      error: error.toString()
    };
  }
}

// ========== EXTRACT ORDERS FUNCTIONS ==========
/**
 * Chuyển "dd/MM/yyyy" hoặc "d/M/yy" thành Date
 */
function parseDate(input) {
  if (input instanceof Date) return input;
  const parts = String(input).split(/[\/\-]/);
  if (parts.length !== 3) return null;
  let [day, month, year] = parts.map(p => parseInt(p, 10));
  if (year < 100) year += 2000;
  const d = new Date(year, month - 1, day);
  return isNaN(d.getTime()) ? null : d;
}

/**
 * Lấy 4 ký tự cuối của chuỗi (dùng cho Ref ID / Tracking)
 */
function getLast4(value) {
  const s = String(value || "");
  return s.length >= 4 ? s.slice(-4) : s;
}

function extractByDateRange(startDateStr, endDateStr) {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  const sourceSheet = ss.getSheetByName("Shipping");
  if (!sourceSheet) {
    return { success: false, message: "❌ Không tìm thấy sheet 'Shipping'." };
  }

  const data      = sourceSheet.getDataRange().getValues();
  const header    = data[0];
  const headerMap = {};
  header.forEach((name, idx) => headerMap[name.trim()] = idx);
  const packedIdx = headerMap["Packed"];

  const output    = [];
  const startDate = new Date(startDateStr);
  const endDate   = new Date(endDateStr);
  const startDay  = new Date(startDate.getFullYear(), startDate.getMonth(), startDate.getDate());
  const endDay    = new Date(endDate.getFullYear(),   endDate.getMonth(),   endDate.getDate());

  if (startDay > endDay) {
    return { success: false, header: [], rows: [], message: "⚠️ Ngày bắt đầu không được lớn hơn ngày kết thúc." };
  }

  for (let i = 1; i < data.length; i++) {
    const row    = data[i];
    const raw    = row[headerMap["Date"]];
    const refID  = row[headerMap["Ref ID"]];
    if (!refID) continue;

    const rowDate = parseDate(raw);
    if (!rowDate) continue;
    const rowDay  = new Date(rowDate.getFullYear(), rowDate.getMonth(), rowDate.getDate());
    if (rowDay < startDay || rowDay > endDay) continue;

    const shop         = row[headerMap["Shop"]];
    const tracking     = row[headerMap["Tracking"]];
    const carrier      = row[headerMap["Carrier"]];
    const receiver     = row[headerMap["Receiver name *"]];
    const shortRef     = "H" + getLast4(refID);
    const shortTracking= tracking ? "V" + getLast4(tracking) : "";

    const isPacked = Boolean(row[packedIdx]);

    output.push([
      formatDate(rowDate),
      shop,
      refID,
      shortRef,
      shortTracking,
      tracking,
      carrier,
      receiver,
      isPacked
    ]);
  }

  const outputHeader = [
    "Date", "Shop", "Mã đơn", "Short Invoice",
    "Short Tracking", "Tracking", "Carrier",
    "Receiver name *", "Packed"
  ];

  return {
    success: true,
    header: outputHeader,
    rows: output,
    message: output.length
      ? `✅ Đã tìm thấy ${output.length} dòng.`
      : "⚠️ Không có dữ liệu phù hợp."
  };
}

function formatDate(date) {
  return Utilities.formatDate(date, Session.getScriptTimeZone(), "dd/MM/yyyy");
}

function updatePackedStatus(startDateStr, endDateStr, selectedIndexes) {
  const ss    = SpreadsheetApp.getActiveSpreadsheet();
  const sheet = ss.getSheetByName("Shipping");
  if (!sheet) return { success: false, message: "❌ Không tìm thấy sheet 'Shipping'." };

  const data      = sheet.getDataRange().getValues();
  const header    = data[0];
  const headerMap = {};
  header.forEach((name, idx) => headerMap[name.trim()] = idx);

  const dateCol = headerMap["Date"];
  const packedCol = headerMap["Packed"];
  const sendCol = headerMap["Send"];
  const refIdCol = headerMap["Ref ID"];

  if ([dateCol, packedCol, sendCol, refIdCol].some(c => c === undefined)) {
    return { success: false, message: "❌ Không tìm thấy một trong các cột bắt buộc." };
  }

  const startDate = new Date(startDateStr);
  const endDate   = new Date(endDateStr);
  const startDay  = new Date(startDate.getFullYear(), startDate.getMonth(), startDate.getDate());
  const endDay    = new Date(endDate.getFullYear(),   endDate.getMonth(),   endDate.getDate());

  let resultIdx = 0;
  let packedCount = 0;
  let unpackedCount = 0;
  const today = formatDate(new Date());

  for (let i = 1; i < data.length; i++) {
    const row = data[i];
    const refID = row[refIdCol];
    if (!refID) continue;

    const rowRaw  = row[dateCol];
    const rowDate = parseDate(rowRaw);
    if (!rowDate) continue;

    const rowDay = new Date(rowDate.getFullYear(), rowDate.getMonth(), rowDate.getDate());
    if (rowDay < startDay || rowDay > endDay) continue;

    const isSelected = selectedIndexes.includes(resultIdx);
    const isAlreadyPacked = !!row[packedCol];
    const isSendBlank = !row[sendCol];

    if (isSelected && !isAlreadyPacked) {
      sheet.getRange(i + 1, packedCol + 1).setValue(today);
      if (isSendBlank) {
        sheet.getRange(i + 1, sendCol + 1).setValue(today);
      }
      packedCount++;
    } else if (!isSelected && isAlreadyPacked) {
      sheet.getRange(i + 1, packedCol + 1).setValue("");
      sheet.getRange(i + 1, sendCol + 1).setValue("");
      unpackedCount++;
    }

    resultIdx++;
  }

  const messageParts = [];
  if (packedCount > 0) messageParts.push(`${packedCount} đơn được đánh dấu đã gói`);
  if (unpackedCount > 0) messageParts.push(`${unpackedCount} đơn được bỏ đánh dấu`);

  const message = messageParts.length > 0
    ? `✅ Đã cập nhật: ${messageParts.join(' và ')}.`
    : "✅ Không có thay đổi nào được thực hiện.";

  return {
    success: true,
    message: message
  };
}