// ===================================================================
// WEBAPP_EMPLOYEETASKS.GS - EMPLOYEE TASKS FEATURE SUPPORT
// ===================================================================
// Created: 2025-07-12
// Purpose: Employee tasks management for employee-tasks.html page
// Dependencies: WebApp_Utils.gs
// Status: IN DEVELOPMENT - Keep all current functions intact
// Used by: employee-tasks.html

// ===================================================================
// ⚠️ IMPORTANT NOTE:
// This module contains ALL current Employee Tasks functions
// copied from code.gs without modifications.
// Status: IN DEVELOPMENT - DO NOT MODIFY until stable
// ===================================================================

// ===================================================================
// SYSTEM SETTINGS AND CONFIGURATION
// ===================================================================

function getSystemSettings() {
  try {
    const ss = SpreadsheetApp.getActiveSpreadsheet();
    const sheet = ss.getSheetByName('setting');
    
    // Default employees nếu không có sheet setting
    const defaultEmployees = [
      { name: 'My Nguyen', sheetName: 'Task_My Nguyen', status: 'Active', role: 'Artist' },
      { name: 'Tuyen Phan', sheetName: 'Task_Tuyen Phan', status: 'Active', role: 'Artist' },
      { name: 'Tun Nail', sheetName: 'Task_Tun Nail', status: 'Active', role: 'Artist' }
    ];
    
    if (!sheet) {
      return {
        employees: defaultEmployees,
        shops: {}
      };
    }
    
    const data = sheet.getDataRange().getValues();
    const employees = [];
    
    // Parse setting sheet (assuming structure)
    for (let i = 1; i < data.length; i++) {
      const row = data[i];
      const empName = String(row[5] || '').trim();
      const sheetName = String(row[6] || '').trim();
      const status = String(row[7] || 'Active').trim();
      
      if (empName && sheetName && status.toLowerCase() === 'active') {
        employees.push({
          name: empName,
          sheetName: sheetName,
          status: status,
          role: 'Artist'
        });
      }
    }
    
    return {
      employees: employees.length > 0 ? employees : defaultEmployees,
      shops: {}
    };
  } catch (error) {
    console.error('Error getting system settings:', error);
    return {
      employees: defaultEmployees,
      shops: {}
    };
  }
}

function getEmployeeList() {
  try {
    const settings = getSystemSettings();
    return ['All', ...settings.employees.map(emp => emp.name)];
  } catch (error) {
    console.error('Error getting employee list:', error);
    return ['All', 'My Nguyen', 'Tuyen Phan', 'Tun Nail'];
  }
}

function findEmployeeDataSheet(employeeName) {
  try {
    const ss = SpreadsheetApp.getActiveSpreadsheet();
    const settings = getSystemSettings();
    
    // Tìm sheet name từ settings
    const employee = settings.employees.find(emp => emp.name === employeeName);
    if (employee) {
      const sheet = ss.getSheetByName(employee.sheetName);
      if (sheet) return sheet;
    }
    
    // Fallback: tìm sheet với pattern Task_<name>
    const sheetName = `Task_${employeeName}`;
    return ss.getSheetByName(sheetName);
    
  } catch (error) {
    console.error('Error finding employee sheet:', error);
    return null;
  }
}

// ===================================================================
// SKU EXTRACTION AND PRODUCT MATCHING
// ===================================================================

function extractSKUFromItemName(itemName) {
  if (!itemName) return '';
  
  try {
    // Pattern: {Shop Code}{Số} - Tên sản phẩm
    // Ví dụ: "BL73 - Blue Porcelain Flower Press On Nails" → "BL73"
    
    const pattern = /^([A-Z]{1,3}\d+)\s*-\s*.+$/i;
    const match = itemName.match(pattern);
    
    if (match) {
      const extractedSKU = match[1]; // BL73
      
      console.log(`Extracted SKU from "${itemName}": ${extractedSKU}`);
      return extractedSKU;
    }
    
    console.log(`No SKU pattern found in: "${itemName}"`);
    return '';
    
  } catch (error) {
    console.error('Error extracting SKU from item name:', error);
    return '';
  }
}

function getProductSKUs() {
  try {
    const ss = SpreadsheetApp.getActiveSpreadsheet();
    
    // Tìm file Mr Ngoc - Products (có thể là file khác)
    let sheet = ss.getSheetByName('Mr Ngoc - Products');
    
    if (!sheet) {
      // Thử tìm sheet Products trong file hiện tại
      sheet = ss.getSheetByName('Products');
    }
    
    if (!sheet) {
      console.log('Sheet "Mr Ngoc - Products" or "Products" not found in current file');
      
      // TODO: Nếu cần access file khác, cần file ID
      // const externalFile = DriveApp.getFileById('YOUR_FILE_ID');
      // const externalSs = SpreadsheetApp.open(externalFile);
      // sheet = externalSs.getSheetByName('Products');
      
      return { skuMap: {}, imageMap: {} };
    }
    
    const data = sheet.getDataRange().getValues();
    if (data.length < 2) return { skuMap: {}, imageMap: {} };
    
    const skuMap = {};
    const imageMap = {};
    
    // Dựa vào hình: Cột B chứa SKU (VL1, VL2, ..., QB1, QB2, ..., BL1, BL2, ...)
    for (let i = 1; i < data.length; i++) {
      const row = data[i];
      const originalSKU = String(row[1] || '').trim(); // Cột B (index 1)
      
      if (originalSKU) {
        // Map extracted SKU -> original SKU
        skuMap[originalSKU] = originalSKU;
        
        // Tìm cột hình ảnh (thường ở cuối hoặc theo pattern)
        // Giả sử hình ảnh ở cột nào đó trong row
        for (let j = 2; j < row.length; j++) {
          const cellValue = String(row[j] || '').trim();
          if (cellValue && cellValue.startsWith('http')) {
            imageMap[originalSKU] = cellValue;
            break; // Lấy hình đầu tiên tìm thấy
          }
        }
      }
    }
    
    console.log(`Loaded ${Object.keys(skuMap).length} SKUs from Products sheet`);
    console.log(`Loaded ${Object.keys(imageMap).length} images from Products sheet`);
    
    return { skuMap, imageMap };
    
  } catch (error) {
    console.error('Error loading product data:', error);
    return { skuMap: {}, imageMap: {} };
  }
}

function getOriginalSKUFromProducts(extractedSKU, productData) {
  if (!extractedSKU || !productData || !productData.skuMap) return '';
  
  const { skuMap } = productData;
  
  // Tìm exact match trước (BL73 → BL73)
  if (skuMap[extractedSKU]) {
    return extractedSKU;
  }
  
  // Tìm partial match
  for (const sku in skuMap) {
    if (sku.includes(extractedSKU) || extractedSKU.includes(sku)) {
      return sku;
    }
  }
  
  return '';
}

function getProductImageFromData(sku, productData) {
  if (!sku || !productData || !productData.imageMap) return null;
  
  const { imageMap } = productData;
  
  // Tìm exact match
  if (imageMap[sku]) {
    return imageMap[sku];
  }
  
  // Tìm partial match
  for (const imageSku in imageMap) {
    if (imageSku.includes(sku) || sku.includes(imageSku)) {
      return imageMap[imageSku];
    }
  }
  
  return null;
}

function getProductImages() {
  try {
    const ss = SpreadsheetApp.getActiveSpreadsheet();
    
    // Tìm sheet chứa thông tin sản phẩm (Legacy system)
    const possibleSheets = ['Mr Ngoc - Products', 'Products', 'Product Images', 'Images'];
    let sheet = null;
    
    for (const sheetName of possibleSheets) {
      sheet = ss.getSheetByName(sheetName);
      if (sheet) break;
    }
    
    if (!sheet) {
      console.log('No product images sheet found');
      return {};
    }
    
    const data = sheet.getDataRange().getValues();
    if (data.length < 2) return {};
    
    const header = data[0];
    
    // Find SKU and Image columns
    let skuCol = -1;
    let imageCol = -1;
    
    header.forEach((name, idx) => {
      const colName = String(name).toLowerCase().trim();
      if (colName.includes('sku') || colName === 'mã sản phẩm' || colName.includes('working code')) {
        skuCol = idx;
      }
      if (colName.includes('image') || colName.includes('hình') || colName === 'link ảnh') {
        imageCol = idx;
      }
    });
    
    if (skuCol === -1 || imageCol === -1) {
      console.log('SKU or Image column not found');
      return {};
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
    
    console.log(`Loaded ${Object.keys(images).length} product images (legacy)`);
    return images;
    
  } catch (error) {
    console.error('Error loading product images:', error);
    return {};
  }
}

function getImageForTaskSKU(sku, productImages) {
  if (!sku || !productImages) return null;
  
  // Tìm exact match trước
  if (productImages[sku]) {
    return productImages[sku];
  }
  
  // Tìm partial match
  for (const imageSku in productImages) {
    if (imageSku.includes(sku) || sku.includes(imageSku)) {
      return productImages[imageSku];
    }
  }
  
  return null;
}

// ===================================================================
// TASK LOADING AND PROCESSING
// ===================================================================

function getTasksFromEmployeeSheet(employee, startDate, endDate, productImages, productData) {
  try {
    console.log(`Getting tasks for employee: ${employee.name}`);
    
    const sheet = findEmployeeDataSheet(employee.name);
    
    if (!sheet) {
      console.log(`No sheet found for employee: ${employee.name}`);
      return [];
    }
    
    console.log(`Using sheet: "${sheet.getName()}" for employee: ${employee.name}`);
    
    const data = sheet.getDataRange().getValues();
    if (data.length <= 3) {
      console.log(`Sheet "${sheet.getName()}" doesn't have enough data (need at least 4 rows)`);
      return [];
    }
    
    // HEADER IS AT ROW 3 (index 2)
    const header = data[2];
    console.log(`Sheet "${sheet.getName()}" header (row 3):`, header);
    
    // Column mapping
    const colMap = {};
    header.forEach((name, idx) => {
      const colName = String(name).toLowerCase().trim();
      
      if (colName === 'date' || (colName.includes('date') && !colName.includes('done'))) {
        colMap.date = idx;
      }
      if (colName === 'deadline') {
        colMap.deadline = idx;
      }
      if (colName === 'working code' || (colName.includes('working') && colName.includes('code'))) {
        colMap.workingCode = idx;
      }
      if (colName === 'item name' || colName.includes('item')) {
        colMap.itemName = idx;
      }
      if (colName === 'mô tả chi tiết' || colName.includes('mô tả')) {
        colMap.description = idx;
      }
      if (colName === 'sku') {
        colMap.sku = idx;
      }
      if (colName === 'task' && !colName.includes('code')) {
        colMap.task = idx;
      }
      if (colName === 'done' && !colName.includes('date')) {
        colMap.done = idx;
      }
      if (colName === 'done date' || (colName.includes('done') && colName.includes('date')) || colName === 'dơne date') {
        colMap.doneDate = idx;
      }
      if (colName === 'shop') {
        colMap.shop = idx;
      }
      if (colName === 'ref id') {
        colMap.refId = idx;
      }
      if (colMap.resultImage === undefined && colName.includes('result') && colName.includes('image')) {
        colMap.resultImage = idx;
      }
    });
    
    console.log(`Column mapping for ${sheet.getName()}:`, colMap);
    
    // Validate required columns
    if (colMap.workingCode === undefined) {
      console.error(`Working Code column not found in sheet ${sheet.getName()}`);
      console.log('Available columns in header (row 3):', header);
      return [];
    }
    
    const tasks = [];
    const today = new Date();
    
    // Process data rows starting from row 4 (index 3)
    for (let i = 3; i < data.length; i++) {
      const row = data[i];
      
      const workingCode = String(row[colMap.workingCode] || '').trim();
      if (!workingCode) continue;
      
      const taskDate = parseDate(row[colMap.date]) || new Date();
      const deadlineDate = parseDate(row[colMap.deadline]) || new Date();
      
      // Filter by date range
      const taskDay = new Date(taskDate.getFullYear(), taskDate.getMonth(), taskDate.getDate());
      const startDay = new Date(startDate.getFullYear(), startDate.getMonth(), startDate.getDate());
      const endDay = new Date(endDate.getFullYear(), endDate.getMonth(), endDate.getDate());
      
      if (taskDay < startDay || taskDay > endDay) continue;
      
      // Parse delivery status
      const isDelivered = String(row[colMap.task] || '').trim() === 'x';
      
      // Parse completion status
      let doneDateStr = '';
      let isCompleted = false;
      
      if (colMap.doneDate !== undefined) {
        doneDateStr = String(row[colMap.doneDate] || '').trim();
        isCompleted = Boolean(doneDateStr);
      } else if (colMap.done !== undefined) {
        const doneValue = String(row[colMap.done] || '').trim();
        isCompleted = doneValue === 'x' || doneValue.toLowerCase() === 'yes';
        if (isCompleted && !doneDateStr) {
          doneDateStr = formatDate(new Date());
        }
      }
      
      const isOverdue = deadlineDate < today && !isCompleted;
      
      const currentSKU = String(row[colMap.sku] || '').trim();
      
      // Extract SKU từ Item Name theo pattern mới: BL73 - Blue Porcelain...
      const itemName = String(row[colMap.itemName] || '');
      const extractedSKU = extractSKUFromItemName(itemName);
      const originalSKU = getOriginalSKUFromProducts(extractedSKU, productData);
      
      // Get product image từ Products data hoặc legacy system
      let productImage = null;
      if (originalSKU && productData) {
        productImage = getProductImageFromData(originalSKU, productData);
      }
      if (!productImage && extractedSKU) {
        productImage = getImageForTaskSKU(extractedSKU, productImages);
      }
      
      const task = {
        rowIndex: i + 1, // +1 because sheet rows are 1-indexed
        date: formatDate(taskDate),
        deadline: formatDate(deadlineDate),
        workingCode: workingCode,
        itemName: itemName,
        description: String(row[colMap.description] || ''),
        shop: String(row[colMap.shop] || ''),
        refId: String(row[colMap.refId] || ''),
        sku: currentSKU,
        extractedSKU: extractedSKU, // SKU từ item name (BL73)
        originalSKU: originalSKU, // SKU gốc từ Products sheet (BL73 nếu tồn tại)
        isDelivered: isDelivered,
        isCompleted: isCompleted,
        completedDate: doneDateStr,
        isOverdue: isOverdue,
        productImage: productImage,
        resultImageUrl: String(row[colMap.resultImage] || '').trim(),
        sheetName: sheet.getName(),
        employeeName: employee.name
      };
      
      tasks.push(task);
    }
    
    console.log(`Found ${tasks.length} tasks in sheet ${sheet.getName()}`);
    return tasks;
    
  } catch (error) {
    console.error(`Error getting tasks from employee sheet:`, error);
    return [];
  }
}

function getEmployeeTasks(employeeName, startDateStr, endDateStr, filters) {
  try {
    console.log(`=== getEmployeeTasks called ===`);
    console.log(`Employee: ${employeeName}`);
    console.log(`Date range: ${startDateStr} to ${endDateStr}`);
    console.log(`Filters:`, filters);
    
    const startDate = new Date(startDateStr);
    const endDate = new Date(endDateStr);
    const productImages = getProductImages(); // Legacy image system
    const productData = getProductSKUs(); // New: SKU + Image data
    const settings = getSystemSettings();
    
    let allTasks = [];
    
    if (employeeName === 'All') {
      // Get tasks from all employees
      for (const employee of settings.employees) {
        const tasks = getTasksFromEmployeeSheet(employee, startDate, endDate, productImages, productData);
        allTasks = allTasks.concat(tasks);
      }
    } else {
      // Get tasks from specific employee
      const employee = settings.employees.find(emp => emp.name === employeeName);
      if (!employee) {
        return {
          success: false,
          error: `Employee "${employeeName}" not found in settings`
        };
      }
      
      allTasks = getTasksFromEmployeeSheet(employee, startDate, endDate, productImages, productData);
    }
    
    // Apply filters
    let filteredTasks = allTasks;
    
    if (filters) {
      if (filters.deliveryStatus && filters.deliveryStatus !== 'all') {
        if (filters.deliveryStatus === 'delivered') {
          filteredTasks = filteredTasks.filter(task => task.isDelivered);
        } else if (filters.deliveryStatus === 'pending') {
          filteredTasks = filteredTasks.filter(task => !task.isDelivered);
        }
      }
      
      if (filters.completionStatus && filters.completionStatus !== 'all') {
        if (filters.completionStatus === 'completed') {
          filteredTasks = filteredTasks.filter(task => task.isCompleted);
        } else if (filters.completionStatus === 'pending') {
          filteredTasks = filteredTasks.filter(task => !task.isCompleted);
        }
      }
    }
    
    // Sort tasks: urgent first, then by deadline
    filteredTasks.sort((a, b) => {
      if (a.isOverdue && !b.isOverdue) return -1;
      if (!a.isOverdue && b.isOverdue) return 1;
      
      const dateA = new Date(a.deadline.split('/').reverse().join('/'));
      const dateB = new Date(b.deadline.split('/').reverse().join('/'));
      return dateA - dateB;
    });
    
    console.log(`Returning ${filteredTasks.length} filtered tasks`);
    
    return {
      success: true,
      tasks: filteredTasks
    };
    
  } catch (error) {
    console.error('Error in getEmployeeTasks:', error);
    return {
      success: false,
      error: error.toString()
    };
  }
}

// ===================================================================
// TASK STATUS UPDATES
// ===================================================================

function updateTasksDelivery(tasks, isDelivered) {
  try {
    const ss = SpreadsheetApp.getActiveSpreadsheet();
    let updateCount = 0;
    
    const tasksBySheet = {};
    tasks.forEach(task => {
      if (!tasksBySheet[task.sheetName]) {
        tasksBySheet[task.sheetName] = [];
      }
      tasksBySheet[task.sheetName].push(task);
    });
    
    for (const sheetName in tasksBySheet) {
      const sheet = ss.getSheetByName(sheetName);
      if (!sheet) continue;
      
      // Get header from row 3 (index 2)
      const data = sheet.getDataRange().getValues();
      if (data.length <= 2) continue;
      
      const header = data[2];
      const taskCol = header.findIndex(h => String(h).trim() === 'Task') + 1;
      
      if (taskCol === 0) {
        console.error(`Column "Task" not found in sheet ${sheetName} header (row 3)`);
        console.log('Available columns:', header);
        continue;
      }
      
      tasksBySheet[sheetName].forEach(task => {
        const newValue = isDelivered ? 'x' : '';
        sheet.getRange(task.rowIndex, taskCol).setValue(newValue);
        updateCount++;
      });
    }
    
    return {
      success: true,
      message: `✅ Đã cập nhật trạng thái GIAO ĐỀN cho ${updateCount} task`
    };
    
  } catch (error) {
    return {
      success: false,
      error: error.toString()
    };
  }
}

function updateTasksCompletion(tasks, isCompleted) {
  try {
    const ss = SpreadsheetApp.getActiveSpreadsheet();
    let updateCount = 0;
    const today = formatDate(new Date());
    
    const tasksBySheet = {};
    tasks.forEach(task => {
      if (!tasksBySheet[task.sheetName]) {
        tasksBySheet[task.sheetName] = [];
      }
      tasksBySheet[task.sheetName].push(task);
    });
    
    for (const sheetName in tasksBySheet) {
      const sheet = ss.getSheetByName(sheetName);
      if (!sheet) continue;
      
      // Get header from row 3 (index 2)
      const data = sheet.getDataRange().getValues();
      if (data.length <= 2) continue;
      
      const header = data[2];
      
      // Tìm cột Done Date (cột Q = column 17)
      let doneDateCol = 17; // Cột Q
      
      // Verify cột Q có phải là Done Date không
      if (header[16] && String(header[16]).toLowerCase().includes('done')) {
        doneDateCol = 17; // Cột Q (1-indexed)
      } else {
        // Fallback: tìm cột Done Date trong header
        const doneDateIndex = header.findIndex(h => {
          const col = String(h).trim().toLowerCase();
          return col === 'done date' || col === 'dơne date';
        });
        
        if (doneDateIndex !== -1) {
          doneDateCol = doneDateIndex + 1;
        } else {
          console.error(`Column "Done Date" not found in sheet ${sheetName}. Using default column Q (17)`);
        }
      }
      
      tasksBySheet[sheetName].forEach(task => {
        const newValue = isCompleted ? today : '';
        sheet.getRange(task.rowIndex, doneDateCol).setValue(newValue);
        updateCount++;
        
        console.log(`Updated ${sheetName} row ${task.rowIndex} column ${doneDateCol} (Q) with: ${newValue}`);
      });
    }
    
    const action = isCompleted ? 'HOÀN THÀNH' : 'BỎ HOÀN THÀNH';
    
    return {
      success: true,
      message: `✅ Đã ${action} ${updateCount} task - ghi ngày vào cột Q (Done Date)`
    };
    
  } catch (error) {
    console.error('Error in updateTasksCompletion:', error);
    return {
      success: false,
      error: error.toString()
    };
  }
}

function updateTaskResultImage(workingCode, sheetName, imageUrl) {
  try {
    const ss = SpreadsheetApp.getActiveSpreadsheet();
    const sheet = ss.getSheetByName(sheetName);
    
    if (!sheet) {
      return {
        success: false,
        error: `Sheet "${sheetName}" không tồn tại`
      };
    }
    
    const data = sheet.getDataRange().getValues();
    if (data.length <= 2) {
      return {
        success: false,
        error: `Sheet "${sheetName}" không có header (row 3)`
      };
    }
    
    // Get header from row 3 (index 2)
    const header = data[2];
    
    const workingCodeCol = header.findIndex(h => String(h).trim() === 'Working Code') + 1;
    const resultImageCol = header.findIndex(h => {
      const col = String(h).trim().toLowerCase();
      return col.includes('result') && col.includes('image');
    }) + 1;
    
    if (workingCodeCol === 0 || resultImageCol === 0) {
      return {
        success: false,
        error: 'Không tìm thấy cột Working Code hoặc Result Image trong header (row 3)'
      };
    }
    
    // Search in data rows (starting from row 4, index 3)
    for (let i = 3; i < data.length; i++) {
      const row = data[i];
      const code = String(row[workingCodeCol - 1] || '').trim();
      
      if (code === workingCode) {
        sheet.getRange(i + 1, resultImageCol).setValue(imageUrl);
        
        return {
          success: true,
          message: `✅ Đã cập nhật hình ảnh cho task ${workingCode}`
        };
      }
    }
    
    return {
      success: false,
      error: `Không tìm thấy task với Working Code: ${workingCode}`
    };
    
  } catch (error) {
    return {
      success: false,
      error: error.toString()
    };
  }
}

// ===================================================================
// DEBUG AND TESTING FUNCTIONS
// ===================================================================

function debugEmployeeSystemComplete() {
  try {
    console.log('=== COMPLETE DEBUG - Employee Tasks System ===');
    
    const settings = getSystemSettings();
    const employees = getEmployeeList();
    const images = getProductImages();
    const productData = getProductSKUs(); // Returns { skuMap, imageMap }
    
    console.log('1. Settings employees:', settings.employees.map(e => e.name));
    console.log('2. Employee list:', employees);
    console.log('3. Legacy images count:', Object.keys(images).length);
    console.log('4. Product SKUs count:', Object.keys(productData.skuMap || {}).length);
    console.log('5. Product images count:', Object.keys(productData.imageMap || {}).length);
    
    // Test SKU extraction với pattern mới
    console.log('\n--- Testing NEW SKU Extraction Pattern ---');
    const testItems = [
      'BL73 - Blue Porcelain Flower Press On Nails',
      'VL5 - Some Product Name',
      'QB12 - Another Product',
      'Invalid Item Name',
      'TK999 - Test Product'
    ];
    
    testItems.forEach(item => {
      const extracted = extractSKUFromItemName(item);
      const original = getOriginalSKUFromProducts(extracted, productData);
      const image = getProductImageFromData(original || extracted, productData);
      console.log(`"${item}" → Extracted: "${extracted}" → Original: "${original}" → Has Image: ${!!image}`);
    });
    
    // Test với first employee
    if (settings.employees.length > 0) {
      const firstEmp = settings.employees[0];
      console.log(`\n--- Testing Tasks for ${firstEmp.name} ---`);
      
      const today = new Date();
      const tasks = getTasksFromEmployeeSheet(firstEmp, today, today, images, productData);
      console.log(`Tasks found: ${tasks.length}`);
      
      if (tasks.length > 0) {
        console.log('Sample task:', {
          workingCode: tasks[0].workingCode,
          itemName: tasks[0].itemName,
          extractedSKU: tasks[0].extractedSKU,
          originalSKU: tasks[0].originalSKU,
          hasProductImage: !!tasks[0].productImage
        });
      }
    }
    
    return {
      success: true,
      employees: employees,
      settings: settings,
      legacyImageCount: Object.keys(images).length,
      productSKUCount: Object.keys(productData.skuMap || {}).length,
      productImageCount: Object.keys(productData.imageMap || {}).length,
      message: 'Complete debug finished - check console for details'
    };
    
  } catch (error) {
    console.error('Complete debug error:', error);
    return {
      success: false,
      error: error.toString()
    };
  }
}

// ===================================================================
// VERSION AND MODULE INFO
// ===================================================================

/**
 * Get version information for this employee tasks module
 * @returns {Object} - Version information
 */
function getEmployeeTasksVersion() {
  return {
    module: 'WebApp_EmployeeTasks',
    version: '1.0.0',
    created: '2025-07-12',
    description: 'Employee tasks feature support for employee-tasks.html (IN DEVELOPMENT)',
    status: 'IN DEVELOPMENT - All current functions preserved',
    functions: [
      'getSystemSettings', 'getEmployeeList', 'findEmployeeDataSheet',
      'extractSKUFromItemName', 'getProductSKUs', 'getProductImages',
      'getTasksFromEmployeeSheet', 'getEmployeeTasks', 
      'updateTasksDelivery', 'updateTasksCompletion', 'updateTaskResultImage',
      'debugEmployeeSystemComplete'
    ],
    dependencies: [
      'WebApp_Utils.gs',
      'employee-tasks.html',
      'setting sheet',
      'Task_* sheets',
      'Mr Ngoc - Products sheet (external)'
    ],
    notes: [
      'All current Employee Tasks functions copied without modification',
      'Status: IN DEVELOPMENT - do not modify until stable',
      'Uses external Products file for SKU/image data',
      'Header row is at row 3 (index 2) in task sheets'
    ]
  };
}