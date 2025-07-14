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
    
    // Parse setting sheet - Cột F(5) = Employee Name, G(6) = Sheet Name
    for (let i = 1; i < data.length; i++) {
      const row = data[i];
      const empName = String(row[5] || '').trim();   // Cột F (index 5)
      const sheetName = String(row[6] || '').trim(); // Cột G (index 6)
      const status = String(row[7] || 'Active').trim(); // Cột H cho status
      
      if (empName && sheetName) {
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
    const imageUrl = imageMap[sku];
    return convertGoogleDriveImageUrl(imageUrl);
  }
  
  // Tìm partial match
  for (const imageSku in imageMap) {
    if (imageSku.includes(sku) || sku.includes(imageSku)) {
      const imageUrl = imageMap[imageSku];
      return convertGoogleDriveImageUrl(imageUrl);
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
      
      // Parse task assignment status (Task column = 'x' means assigned to employee)
      const isAssigned = String(row[colMap.task] || '').trim() === 'x';
      
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
        isAssigned: isAssigned,
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
          filteredTasks = filteredTasks.filter(task => task.isAssigned);
        } else if (filters.deliveryStatus === 'pending') {
          filteredTasks = filteredTasks.filter(task => !task.isAssigned);
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
// DEBUG FUNCTIONS FOR FRONTEND
// ===================================================================


function testBasicConnectivity() {
  try {
    console.log('=== BASIC CONNECTIVITY TEST ===');
    return {
      success: true,
      data: {
        timestamp: new Date().toISOString(),
        message: 'Backend is responding'
      }
    };
  } catch (error) {
    return {
      success: false,
      error: error.toString()
    };
  }
}




// ===================================================================
// TASK STATUS UPDATES
// ===================================================================

function updateTasksDelivery(tasks, isAssigned) {
  try {
    console.log('=== UPDATE TASKS ASSIGNMENT STARTED ===');
    console.log('updateTasksDelivery called with:', tasks.length, 'tasks, isAssigned:', isAssigned);
    
    const ss = SpreadsheetApp.getActiveSpreadsheet();
    let updateCount = 0;
    const debugInfo = [];
    
    // Group tasks by sheet
    const tasksBySheet = {};
    tasks.forEach(task => {
      if (!tasksBySheet[task.sheetName]) {
        tasksBySheet[task.sheetName] = [];
      }
      tasksBySheet[task.sheetName].push(task);
    });
    
    for (const sheetName in tasksBySheet) {
      console.log(`\n--- Processing sheet: "${sheetName}" ---`);
      const sheet = ss.getSheetByName(sheetName);
      if (!sheet) {
        console.error(`❌ Sheet "${sheetName}" not found!`);
        continue;
      }
      
      const data = sheet.getDataRange().getValues();
      console.log(`Sheet data rows: ${data.length}`);
      
      if (data.length <= 2) {
        console.error(`Sheet "${sheetName}" doesn't have enough rows`);
        continue;
      }
      
      // Header is at row 3 (index 2) - SAME AS TEST FUNCTION
      const header = data[2];
      console.log(`Header row 3:`, header);
      
      // Find Task column using SAME logic as testWriteTaskColumn
      let taskCol = findColumnSafely(header, ['Task', 'task', 'TASK']);
      console.log(`Task column found at: ${taskCol}`);
      
      if (taskCol === -1) {
        // Manual search fallback - SAME AS TEST FUNCTION
        for (let i = 0; i < header.length; i++) {
          const colValue = String(header[i] || '').trim().toLowerCase();
          if (colValue === 'task') {
            taskCol = i + 1;
            console.log(`Found Task column manually at: ${taskCol}`);
            break;
          }
        }
      }
      
      if (taskCol === -1) {
        console.error(`Task column not found in sheet ${sheetName}`);
        console.log('Available headers:', header);
        continue;
      }
      
      // Find Working Code column
      const workingCodeCol = findColumnSafely(header, ['Working Code', 'WorkingCode', 'Working_Code']);
      console.log(`Working Code column found at: ${workingCodeCol}`);
      
      if (workingCodeCol === -1) {
        console.error(`Working Code column not found in sheet ${sheetName}`);
        continue;
      }
      
      // 🔍 DETAILED DEBUG: Show column positions
      console.log(`\n🔍 DETAILED COLUMN DEBUG for sheet "${sheetName}":`);
      console.log(`   Task Column: ${taskCol} (${String.fromCharCode(64 + taskCol)})`);
      console.log(`   Working Code Column: ${workingCodeCol} (${String.fromCharCode(64 + workingCodeCol)})`);
      console.log(`   Header at Task column: "${header[taskCol - 1]}"`);
      console.log(`   Header at Working Code column: "${header[workingCodeCol - 1]}"`);
      
      // Update tasks - SIMPLIFIED APPROACH LIKE TEST FUNCTION
      tasksBySheet[sheetName].forEach((task, taskIndex) => {
        console.log(`\n🎯 Processing task ${taskIndex + 1}/${tasksBySheet[sheetName].length}: ${task.workingCode}`);
        
        let taskFound = false;
        
        // Find row with matching working code (start from row 4, index 3)
        for (let i = 3; i < data.length; i++) {
          const rowWorkingCode = String(data[i][workingCodeCol - 1] || '').trim();
          
          if (rowWorkingCode === task.workingCode) {
            const rowNumber = i + 1;
            taskFound = true;
            
            console.log(`\n🎯 FOUND MATCH for "${task.workingCode}":`);
            console.log(`   📍 Position: Sheet="${sheetName}", Row=${rowNumber}, Task Column=${taskCol}(${String.fromCharCode(64 + taskCol)})`);
            console.log(`   📋 Cell Address: ${String.fromCharCode(64 + taskCol)}${rowNumber}`);
            
            const taskDebug = {
              workingCode: task.workingCode,
              sheetName: sheetName,
              rowNumber: rowNumber,
              taskColumn: taskCol,
              columnLetter: String.fromCharCode(64 + taskCol),
              cellAddress: `${String.fromCharCode(64 + taskCol)}${rowNumber}`,
              action: isAssigned ? 'ASSIGN_TASK' : 'UNASSIGN_TASK'
            };
            
            try {
              // Get current value
              const currentValue = sheet.getRange(rowNumber, taskCol).getValue();
              console.log(`   📊 Current value at ${taskDebug.cellAddress}: "${currentValue}"`);
              taskDebug.currentValue = currentValue;
              
              // SIMPLE UPDATE - SAME AS TEST FUNCTION
              const newValue = isAssigned ? 'x' : '';
              console.log(`   ✏️  Writing "${newValue}" to ${taskDebug.cellAddress}...`);
              taskDebug.newValue = newValue;
              
              sheet.getRange(rowNumber, taskCol).setValue(newValue);
              
              // Verify
              const finalValue = sheet.getRange(rowNumber, taskCol).getValue();
              console.log(`   ✅ After writing, value at ${taskDebug.cellAddress}: "${finalValue}"`);
              taskDebug.finalValue = finalValue;
              
              const writeSuccessful = (isAssigned && String(finalValue).trim() === 'x') || 
                                    (!isAssigned && !finalValue);
              
              taskDebug.success = writeSuccessful;
              
              if (writeSuccessful) {
                console.log(`   🎉 SUCCESS: Updated ${taskDebug.cellAddress} in "${sheetName}"`);
                updateCount++;
              } else {
                console.error(`   ❌ FAILED: Expected ${isAssigned ? "'x'" : "empty"}, got "${finalValue}" at ${taskDebug.cellAddress}`);
              }
              
              debugInfo.push(taskDebug);
              break;
              
            } catch (error) {
              console.error(`   💥 ERROR updating ${taskDebug.cellAddress}:`, error);
              taskDebug.error = error.toString();
              taskDebug.success = false;
              debugInfo.push(taskDebug);
            }
          }
        }
        
        if (!taskFound) {
          console.warn(`   ⚠️  Task "${task.workingCode}" NOT FOUND in sheet "${sheetName}"`);
          debugInfo.push({
            workingCode: task.workingCode,
            sheetName: sheetName,
            success: false,
            error: 'Working Code not found in sheet'
          });
        }
      });
    }
    
    console.log(`\n=== UPDATE TASKS ASSIGNMENT COMPLETED ===`);
    console.log(`Total tasks updated: ${updateCount}`);
    
    // 📊 SUMMARY DEBUG
    console.log(`\n📊 SUMMARY DEBUG INFO:`);
    debugInfo.forEach((info, idx) => {
      if (info.cellAddress) {
        console.log(`${idx + 1}. ${info.workingCode} → ${info.cellAddress} (${info.success ? '✅' : '❌'})`);
      } else {
        console.log(`${idx + 1}. ${info.workingCode} → ${info.error || 'Unknown error'} (❌)`);
      }
    });
    
    return {
      success: true,
      message: `✅ Đã ${isAssigned ? 'giao' : 'hủy giao'} task cho ${updateCount} nhân viên`,
      debugInfo: debugInfo
    };
    
  } catch (error) {
    console.error('=== UPDATE TASKS ASSIGNMENT ERROR ===');
    console.error('Error in updateTasksDelivery:', error);
    return {
      success: false,
      error: error.toString()
    };
  }
}

function updateTasksCompletion(tasks, isCompleted) {
  try {
    console.log('updateTasksCompletion called with:', tasks.length, 'tasks, isCompleted:', isCompleted);
    console.log('First completion task data:', tasks.length > 0 ? tasks[0] : 'No tasks');
    
    const ss = SpreadsheetApp.getActiveSpreadsheet();
    let updateCount = 0;
    const today = formatDate(new Date());
    
    const tasksBySheet = {};
    tasks.forEach(task => {
      console.log('Processing completion task:', task.workingCode, 'rowIndex:', task.rowIndex, 'sheetName:', task.sheetName);
      if (!tasksBySheet[task.sheetName]) {
        tasksBySheet[task.sheetName] = [];
      }
      tasksBySheet[task.sheetName].push(task);
    });
    
    for (const sheetName in tasksBySheet) {
      console.log(`Looking for completion sheet: "${sheetName}"`);
      const sheet = ss.getSheetByName(sheetName);
      if (!sheet) {
        console.error(`❌ Completion sheet "${sheetName}" not found!`);
        console.log('Available sheets:', ss.getSheets().map(s => s.getName()));
        continue;
      }
      console.log(`✅ Found completion sheet: "${sheetName}"`);
      
      // Get header from row 3 (index 2)
      const data = sheet.getDataRange().getValues();
      if (data.length <= 2) continue;
      
      const header = data[2];
      
      // ✅ IMPROVED: Dynamic column detection for Done Date (Column Q)
      const doneDateCol = findColumnSafely(header, ['Done Date']);
      
      // Also find Done column (Column I) for sync
      const doneCol = findColumnSafely(header, [
        'Done',           // Exact match from sheet
        'Completed',
        'Complete'
      ]);
      
      console.log(`Sheet: ${sheetName}, Done Date column found at: ${doneDateCol}, Done column found at: ${doneCol}`);
      console.log(`Completion Header row 3:`, header);
      
      tasksBySheet[sheetName].forEach(task => {
        console.log(`Looking for working code: ${task.workingCode} in sheet ${sheetName} for completion`);
        
        // Find Working Code column to match tasks
        const workingCodeCol = findColumnSafely(header, ['Working Code', 'WorkingCode', 'Working_Code']);
        
        if (workingCodeCol === -1) {
          console.error(`Working Code column not found in sheet ${sheetName}`);
          return;
        }
        
        // Find the row with matching working code (start from row 4, index 3)
        for (let i = 3; i < data.length; i++) {
          const rowWorkingCode = String(data[i][workingCodeCol - 1] || '').trim();
          
          if (rowWorkingCode === task.workingCode) {
            const rowNumber = i + 1; // Convert to 1-based row number
            console.log(`Found match for completion! Processing row ${rowNumber}`);
            
            // CHỈ cập nhật Done Date column (Column Q) - KHÔNG cập nhật Done column
            if (doneDateCol !== -1 && doneDateCol > 0) {
              const newDateValue = isCompleted ? today : '';
              console.log(`About to update Done Date: Sheet=${sheetName}, Row=${rowNumber}, Col=${doneDateCol}, Value="${newDateValue}"`);
              
              try {
                sheet.getRange(rowNumber, doneDateCol).setValue(newDateValue);
                console.log(`✅ Successfully updated ${sheetName} row ${rowNumber} Done Date column ${doneDateCol} with: "${newDateValue}"`);
              } catch (error) {
                console.error(`❌ Error updating Done Date ${sheetName} row ${rowNumber} col ${doneDateCol}:`, error);
              }
            } else {
              console.warn(`Done Date column not found or invalid in sheet ${sheetName}. doneDateCol=${doneDateCol}`);
            }
            
            updateCount++;
            break; // Move to next task after finding match
          }
        }
      });
    }
    
    const action = isCompleted ? 'HOÀN THÀNH' : 'BỎ HOÀN THÀNH';
    
    return {
      success: true,
      message: `✅ Đã ${action} ${updateCount} task`
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

/**
 * Simple test function to write 'x' to Task column for a specific row
 * Test case: Write 'x' to row 412 in Task_My Nguyen sheet
 * @param {number} rowNumber - Row number to update (default: 412)
 * @param {string} sheetName - Sheet name (default: 'Task_My Nguyen')
 * @returns {Object} - Test result
 */
/**
 * Debug function để test updateTasksDelivery với logs chi tiết
 * Simulates calling updateTasksDelivery with sample task data
 * @param {string} employeeName - Employee name (default: 'My Nguyen')
 * @returns {Object} - Debug result with logs
 */
function debugUpdateTasksDelivery(employeeName = 'My Nguyen') {
  try {
    console.log(`=== DEBUG UPDATE TASKS DELIVERY ===`);
    console.log(`Testing for employee: ${employeeName}`);
    
    // Get sample tasks for today
    const today = new Date();
    const todayStr = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, '0')}-${String(today.getDate()).padStart(2, '0')}`;
    
    console.log(`Getting tasks for date: ${todayStr}`);
    
    const tasksResult = getEmployeeTasks(employeeName, todayStr, todayStr, {});
    
    if (!tasksResult.success) {
      return {
        success: false,
        error: 'Failed to get tasks: ' + tasksResult.error
      };
    }
    
    console.log(`Found ${tasksResult.tasks.length} tasks for ${employeeName}`);
    
    if (tasksResult.tasks.length === 0) {
      return {
        success: false,
        error: 'No tasks found for testing'
      };
    }
    
    // Take first task for testing
    const testTask = tasksResult.tasks[0];
    console.log(`Using test task: ${testTask.workingCode} (${testTask.itemName})`);
    
    // Create a single task array for testing
    const testTasks = [testTask];
    
    console.log(`\n🔧 CALLING updateTasksDelivery with isDelivered=true...`);
    
    // Call updateTasksDelivery with detailed logging
    const result = updateTasksDelivery(testTasks, true);
    
    console.log(`\n📋 UPDATE RESULT:`, result);
    
    return {
      success: true,
      data: {
        tasksFound: tasksResult.tasks.length,
        testTask: {
          workingCode: testTask.workingCode,
          itemName: testTask.itemName,
          sheetName: testTask.sheetName,
          rowIndex: testTask.rowIndex
        },
        updateResult: result,
        debugInfo: result.debugInfo || []
      },
      message: `Debug completed for ${employeeName}`
    };
    
  } catch (error) {
    console.error('Debug error:', error);
    return {
      success: false,
      error: error.toString()
    };
  }
}

function testWriteTaskColumn(rowNumber = 412, sheetName = 'Task_My Nguyen') {
  try {
    console.log(`=== TEST WRITE TASK COLUMN ===`);
    console.log(`Target: Row ${rowNumber} in sheet "${sheetName}"`);
    
    const ss = SpreadsheetApp.getActiveSpreadsheet();
    const sheet = ss.getSheetByName(sheetName);
    
    if (!sheet) {
      return {
        success: false,
        error: `Sheet "${sheetName}" không tồn tại`,
        availableSheets: ss.getSheets().map(s => s.getName())
      };
    }
    
    console.log(`✅ Found sheet: "${sheetName}"`);
    
    // Get sheet data to understand structure
    const data = sheet.getDataRange().getValues();
    console.log(`Sheet has ${data.length} rows`);
    
    if (rowNumber > data.length) {
      return {
        success: false,
        error: `Row ${rowNumber} vượt quá số dòng có sẵn (${data.length})`
      };
    }
    
    // Get header from row 3 (index 2)
    if (data.length < 3) {
      return {
        success: false,
        error: 'Sheet không có header row (row 3)'
      };
    }
    
    const header = data[2];
    console.log(`Header row 3:`, header);
    
    // Find Task column using findColumnSafely
    const taskCol = findColumnSafely(header, ['Task', 'task', 'TASK']);
    console.log(`Task column found at: ${taskCol}`);
    
    if (taskCol === -1) {
      // Try manual search as fallback
      let manualTaskCol = -1;
      for (let i = 0; i < header.length; i++) {
        const colValue = String(header[i] || '').trim().toLowerCase();
        if (colValue === 'task') {
          manualTaskCol = i + 1;
          break;
        }
      }
      
      if (manualTaskCol === -1) {
        return {
          success: false,
          error: 'Không tìm thấy cột Task',
          header: header,
          headerLength: header.length
        };
      } else {
        taskCol = manualTaskCol;
        console.log(`Found Task column manually at: ${taskCol}`);
      }
    }
    
    // Get current value in target cell
    const currentValue = sheet.getRange(rowNumber, taskCol).getValue();
    console.log(`Current value at row ${rowNumber}, col ${taskCol}: "${currentValue}"`);
    
    // Write 'x' to the cell
    console.log(`Writing 'x' to row ${rowNumber}, column ${taskCol}...`);
    sheet.getRange(rowNumber, taskCol).setValue('x');
    
    // Verify the write
    const newValue = sheet.getRange(rowNumber, taskCol).getValue();
    console.log(`After writing, value is: "${newValue}"`);
    
    const writeSuccessful = String(newValue).trim() === 'x';
    
    return {
      success: writeSuccessful,
      data: {
        sheetName: sheetName,
        rowNumber: rowNumber,
        taskColumn: taskCol,
        columnLetter: String.fromCharCode(64 + taskCol),
        previousValue: currentValue,
        newValue: newValue,
        writeSuccessful: writeSuccessful
      },
      message: writeSuccessful 
        ? `✅ Đã ghi 'x' vào ${sheetName} row ${rowNumber} column ${String.fromCharCode(64 + taskCol)}` 
        : `❌ Ghi thất bại - giá trị hiện tại: "${newValue}"`
    };
    
  } catch (error) {
    console.error('Test write error:', error);
    return {
      success: false,
      error: error.toString(),
      message: error.message || 'Lỗi không xác định'
    };
  }
}

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

// ===================================================================
// ENHANCED FEATURES - 2025-07-12 UPDATE
// ===================================================================

/**
 * Get employee list from Settings sheet (Column F-M)
 * Enhanced version that reads from correct columns
 * @returns {Object} - Employee list with sheet mapping
 */
function getEmployeeListFromSettings() {
  logWithContext('EmployeeTasks', 'Getting employee list from Settings sheet (F-M columns)');
  
  try {
    const ss = SpreadsheetApp.getActiveSpreadsheet();
    const sheet = ss.getSheetByName('setting') || ss.getSheetByName('Setting') || ss.getSheetByName('Settings');
    
    if (!sheet) {
      logWithContext('EmployeeTasks', 'Settings sheet not found - using default employees', 'WARN');
      return getDefaultEmployeeList();
    }
    
    const data = sheet.getDataRange().getValues();
    logWithContext('EmployeeTasks', `Settings sheet data: ${data.length} rows`);
    
    if (data.length < 2) {
      logWithContext('EmployeeTasks', 'Settings sheet empty - using default employees', 'WARN');
      return getDefaultEmployeeList();
    }
    
    const employees = [];
    
    // Parse từ cột F(5) và G(6) như yêu cầu
    for (let i = 1; i < data.length; i++) {
      const row = data[i];
      const empName = safeString(row[5]);   // Cột F (index 5) = Employee Name
      const sheetName = safeString(row[6]); // Cột G (index 6) = Sheet Name
      const status = safeString(row[7] || 'Active'); // Cột H = Status
      const role = safeString(row[8] || '');         // Cột I = Role
      const email = safeString(row[9] || '');        // Cột J = Email
      const phone = safeString(row[10] || '');       // Cột K = Phone
      const startDate = safeString(row[11] || '');   // Cột L = Start Date
      const notes = safeString(row[12] || '');       // Cột M = Notes
      
      if (!isEmpty(empName) && !isEmpty(sheetName)) {
        employees.push({
          name: empName,
          sheetName: sheetName,
          status: status,
          role: role,
          email: email,
          phone: phone,
          startDate: startDate,
          notes: notes,
          rowIndex: i + 1
        });
      }
    }
    
    if (employees.length === 0) {
      logWithContext('EmployeeTasks', 'No employees found in Settings sheet - using defaults', 'WARN');
      return getDefaultEmployeeList();
    }
    
    const result = {
      success: true,
      data: employees,
      count: employees.length,
      message: `✅ Đã tải ${employees.length} nhân viên từ Settings sheet`
    };
    
    logWithContext('EmployeeTasks', `Employee list loaded: ${employees.length} employees`);
    return result;
    
  } catch (error) {
    logWithContext('EmployeeTasks', `Error getting employee list: ${error.message}`, 'ERROR');
    return getDefaultEmployeeList();
  }
}

/**
 * Get default employee list as fallback
 * @returns {Object} - Default employee list
 */
function getDefaultEmployeeList() {
  const defaultEmployees = [
    { name: 'My Nguyen', sheetName: 'Task_My Nguyen', status: 'Active', role: 'Artist' },
    { name: 'Tuyen Phan', sheetName: 'Task_Tuyen Phan', status: 'Active', role: 'Artist' },
    { name: 'Tun Nail', sheetName: 'Task_Tun Nail', status: 'Active', role: 'Artist' }
  ];
  
  return {
    success: true,
    data: defaultEmployees,
    count: defaultEmployees.length,
    message: `✅ Sử dụng ${defaultEmployees.length} nhân viên mặc định`
  };
}

/**
 * Fetch product SKU and image data from Mr Ngoc Products sheet
 * Integrates with WebApp_Products.gs functions
 * @param {string} sku - SKU to search for
 * @returns {Object} - Product data with SKU and image
 */
function fetchProductDataBySKU(sku) {
  logWithContext('EmployeeTasks', `Fetching product data for SKU: ${sku}`);
  
  try {
    if (isEmpty(sku)) {
      return createErrorResponse('SKU không được để trống');
    }
    
    // Use WebApp_Products.gs functions if available
    if (typeof searchProductsBySKU === 'function') {
      const result = searchProductsBySKU([sku]);
      
      if (result.success && result.data.length > 0) {
        const product = result.data[0];
        return {
          success: true,
          data: {
            sku: product.sku,
            name: product.name,
            imageUrl: product.imageUrl,
            category: product.category,
            price: product.price,
            description: product.description
          },
          message: `✅ Tìm thấy sản phẩm cho SKU: ${sku}`
        };
      } else {
        return createErrorResponse(`Không tìm thấy sản phẩm với SKU: ${sku}`);
      }
    }
    
    // Fallback: Direct connection to Products sheet
    const PRODUCTS_SHEET_ID = '1DDBQbGqradXtZreMgBxzEOhN_eZ1GoeDOoUEQ01oG0w';
    const productsSheet = SpreadsheetApp.openById(PRODUCTS_SHEET_ID).getSheets()[0];
    const data = productsSheet.getDataRange().getValues();
    
    if (data.length < 2) {
      return createErrorResponse('Products sheet không có dữ liệu');
    }
    
    const header = data[0];
    const headerMap = createHeaderMap(header);
    
    // Find product by SKU
    for (let i = 1; i < data.length; i++) {
      const row = data[i];
      const currentSku = safeString(row[0]); // Assume SKU is in first column
      
      if (currentSku.toLowerCase() === sku.toLowerCase()) {
        const product = {
          sku: currentSku,
          name: safeString(row[1] || ''),
          category: safeString(row[2] || ''),
          imageUrl: safeString(row[headerMap['Image'] || headerMap['Image URL'] || 3] || ''),
          description: safeString(row[headerMap['Description'] || 4] || '')
        };
        
        return {
          success: true,
          data: product,
          message: `✅ Tìm thấy sản phẩm cho SKU: ${sku}`
        };
      }
    }
    
    return createErrorResponse(`Không tìm thấy sản phẩm với SKU: ${sku}`);
    
  } catch (error) {
    logWithContext('EmployeeTasks', `Error fetching product data: ${error.message}`, 'ERROR');
    return createErrorResponse('Lỗi khi tải dữ liệu sản phẩm: ' + error.message);
  }
}

/**
 * Enhanced get employee tasks with product data integration
 * @param {string} employeeName - Employee name or 'All'
 * @param {string} startDate - Start date (YYYY-MM-DD)
 * @param {string} endDate - End date (YYYY-MM-DD)
 * @param {Object} options - Additional options
 * @returns {Object} - Tasks with product data
 */
function getEmployeeTasksWithProducts(employeeName, startDate, endDate, options = {}) {
  logWithContext('EmployeeTasks', `Getting tasks with products for: ${employeeName}, ${startDate} to ${endDate}`);
  
  try {
    // Extract filters from options if they exist
    const filters = options.filters || options;
    
    // Get basic tasks using existing function
    const tasksResult = getEmployeeTasks(employeeName, startDate, endDate, filters);
    
    if (!tasksResult.success) {
      return tasksResult;
    }
    
    const tasks = tasksResult.tasks;
    const enhancedTasks = [];
    
    // Enhance each task with product data
    for (const task of tasks) {
      const enhancedTask = { ...task };
      
      // Try to extract SKU from item name
      const extractedSku = extractSKUFromItemName(task.itemName);
      if (extractedSku) {
        const productResult = fetchProductDataBySKU(extractedSku);
        if (productResult.success) {
          enhancedTask.productData = productResult.data;
          enhancedTask.productImageUrl = productResult.data.imageUrl;
          enhancedTask.productSku = productResult.data.sku;
        }
      }
      
      enhancedTasks.push(enhancedTask);
    }
    
    const result = {
      success: true,
      data: enhancedTasks,
      count: enhancedTasks.length,
      withProductData: enhancedTasks.filter(t => t.productData).length,
      message: `✅ Đã tải ${enhancedTasks.length} tasks với product data`
    };
    
    logWithContext('EmployeeTasks', `Enhanced tasks loaded: ${enhancedTasks.length} total, ${result.withProductData} with product data`);
    return result;
    
  } catch (error) {
    logWithContext('EmployeeTasks', `Error getting enhanced tasks: ${error.message}`, 'ERROR');
    return createErrorResponse('Lỗi khi tải tasks với product data: ' + error.message);
  }
}

/**
 * Upload and save task result image
 * Saves with format: {year}.{month}.{day}-{refid}.jpg
 * Updates Result IMG column (Column R) in employee sheet
 * @param {string} employeeName - Employee name
 * @param {string} refId - Reference ID
 * @param {Blob} imageBlob - Image file blob
 * @param {string} workingCode - Working code to match
 * @returns {Object} - Upload result
 */
function uploadTaskResultImage(employeeName, refId, imageBlob, workingCode) {
  logWithContext('EmployeeTasks', `Uploading result image for: ${employeeName}, RefID: ${refId}`);
  
  try {
    if (!imageBlob || !refId || !workingCode) {
      return createErrorResponse('Thiếu thông tin: image, refId hoặc workingCode');
    }
    
    // Create folder structure: EmployeeName/Year/Month
    const today = new Date();
    const year = today.getFullYear();
    const month = String(today.getMonth() + 1).padStart(2, '0');
    const day = String(today.getDate()).padStart(2, '0');
    
    // Get or create employee folder
    const rootFolder = DriveApp.getRootFolder();
    let employeeFolder;
    
    try {
      employeeFolder = rootFolder.getFoldersByName(employeeName).next();
    } catch (e) {
      employeeFolder = rootFolder.createFolder(employeeName);
      logWithContext('EmployeeTasks', `Created employee folder: ${employeeName}`);
    }
    
    // Get or create year folder
    let yearFolder;
    try {
      yearFolder = employeeFolder.getFoldersByName(String(year)).next();
    } catch (e) {
      yearFolder = employeeFolder.createFolder(String(year));
      logWithContext('EmployeeTasks', `Created year folder: ${year}`);
    }
    
    // Get or create month folder
    let monthFolder;
    try {
      monthFolder = yearFolder.getFoldersByName(month).next();
    } catch (e) {
      monthFolder = yearFolder.createFolder(month);
      logWithContext('EmployeeTasks', `Created month folder: ${month}`);
    }
    
    // Create filename: {year}.{month}.{day}-{refid}.{extension}
    const originalName = imageBlob.getName() || 'image.jpg';
    const extension = originalName.split('.').pop() || 'jpg';
    const filename = `${year}.${month}.${day}-${refId}.${extension}`;
    
    // Save file
    const savedFile = monthFolder.createFile(imageBlob.setName(filename));
    
    // Make file publicly viewable
    savedFile.setSharing(DriveApp.Access.ANYONE_WITH_LINK, DriveApp.Permission.VIEW);
    
    // Get public URL
    const fileUrl = `https://drive.google.com/file/d/${savedFile.getId()}/view`;
    
    // Update Result IMG column in employee sheet
    const updateResult = updateTaskResultImage(employeeName, workingCode, fileUrl);
    
    if (!updateResult.success) {
      logWithContext('EmployeeTasks', `Warning: Could not update Result IMG column: ${updateResult.error}`, 'WARN');
    }
    
    const result = {
      success: true,
      data: {
        filename: filename,
        fileId: savedFile.getId(),
        fileUrl: fileUrl,
        filePath: `${employeeName}/${year}/${month}/${filename}`,
        uploadDate: today.toISOString(),
        sheetUpdated: updateResult.success
      },
      message: `✅ Đã upload hình ảnh: ${filename}`
    };
    
    logWithContext('EmployeeTasks', `Image uploaded successfully: ${filename} -> ${fileUrl}`);
    return result;
    
  } catch (error) {
    logWithContext('EmployeeTasks', `Error uploading image: ${error.message}`, 'ERROR');
    return createErrorResponse('Lỗi khi upload hình ảnh: ' + error.message);
  }
}

/**
 * Update Result IMG column (Column R) in employee sheet
 * @param {string} employeeName - Employee name  
 * @param {string} workingCode - Working code to match
 * @param {string} imageUrl - Image URL to save
 * @returns {Object} - Update result
 */
/**
 * Convert Google Drive sharing URLs to direct image URLs
 * @param {string} url - Original URL (Google Drive sharing link or other)
 * @returns {string} - Direct image URL for display
 */
function convertGoogleDriveImageUrl(url) {
  if (!url || typeof url !== 'string') return url;
  
  // Check if it's a Google Drive URL
  if (url.includes('drive.google.com')) {
    // Extract file ID from various Google Drive URL formats:
    // https://drive.google.com/file/d/{fileId}/view
    // https://drive.google.com/open?id={fileId}
    // https://drive.google.com/uc?id={fileId}&export=download
    
    let fileId = null;
    
    // Pattern 1: /file/d/{fileId}/view
    let match = url.match(/\/file\/d\/([a-zA-Z0-9_-]+)/);
    if (match) {
      fileId = match[1];
    }
    
    // Pattern 2: ?id={fileId}
    if (!fileId) {
      match = url.match(/[?&]id=([a-zA-Z0-9_-]+)/);
      if (match) {
        fileId = match[1];
      }
    }
    
    // If we found a file ID, convert to direct image URL
    if (fileId) {
      logWithContext('ImageUtils', `Converting Google Drive URL: ${fileId}`);
      return `https://drive.google.com/uc?export=view&id=${fileId}`;
    }
  }
  
  // Return original URL if not a Google Drive link or can't parse
  return url;
}

function updateTaskResultImage(employeeName, workingCode, imageUrl) {
  logWithContext('EmployeeTasks', `Updating Result IMG for: ${employeeName}, Code: ${workingCode}`);
  
  try {
    const sheetName = findEmployeeDataSheet(employeeName);
    if (!sheetName) {
      return createErrorResponse(`Không tìm thấy sheet cho nhân viên: ${employeeName}`);
    }
    
    const ss = SpreadsheetApp.getActiveSpreadsheet();
    const sheet = ss.getSheetByName(sheetName);
    
    if (!sheet) {
      return createErrorResponse(`Sheet "${sheetName}" không tồn tại`);
    }
    
    const data = sheet.getDataRange().getValues();
    if (data.length < 4) {
      return createErrorResponse(`Sheet "${sheetName}" không có đủ dữ liệu`);
    }
    
    // Header is at row 3 (index 2)
    const header = data[2];
    
    // Find Working Code column
    const workingCodeCol = findColumnSafely(header, [
      'Working Code', 
      'WorkingCode',
      'Working_Code',
      'Code',
      'Mã công việc'
    ]);
    
    // Result IMG column is Column R (index 17, 1-based = 18)
    const resultImgCol = 18; // Column R
    
    if (workingCodeCol === -1) {
      return createErrorResponse('Không tìm thấy cột Working Code trong header');
    }
    
    // Search for matching working code in data rows (starting from row 4, index 3)
    for (let i = 3; i < data.length; i++) {
      const row = data[i];
      const code = safeString(row[workingCodeCol - 1]);
      
      if (code === workingCode) {
        // Update Result IMG column (Column R)
        sheet.getRange(i + 1, resultImgCol).setValue(imageUrl);
        
        logWithContext('EmployeeTasks', `Updated Result IMG: Row ${i + 1}, Column R with URL: ${imageUrl}`);
        
        return {
          success: true,
          data: {
            rowUpdated: i + 1,
            column: 'R',
            workingCode: workingCode,
            imageUrl: imageUrl
          },
          message: `✅ Đã cập nhật Result IMG cho Working Code: ${workingCode}`
        };
      }
    }
    
    return createErrorResponse(`Không tìm thấy Working Code: ${workingCode} trong sheet ${sheetName}`);
    
  } catch (error) {
    logWithContext('EmployeeTasks', `Error updating Result IMG: ${error.message}`, 'ERROR');
    return createErrorResponse('Lỗi khi cập nhật Result IMG: ' + error.message);
  }
}

/**
 * Upload task result image from base64 data
 * HTML-friendly version that accepts base64 data from client
 * @param {string} employeeName - Employee name
 * @param {string} refId - Reference ID
 * @param {string} base64Data - Base64 encoded image data
 * @param {string} mimeType - File MIME type
 * @param {string} originalName - Original filename
 * @param {string} workingCode - Working code to match
 * @returns {Object} - Upload result
 */
function uploadTaskResultImageFromBase64(employeeName, refId, base64Data, mimeType, originalName, workingCode) {
  logWithContext('EmployeeTasks', `Uploading result image from base64 for: ${employeeName}, RefID: ${refId}`);
  
  try {
    if (!base64Data || !refId || !workingCode || !employeeName) {
      return createErrorResponse('Thiếu thông tin: base64Data, refId, workingCode hoặc employeeName');
    }
    
    // Convert base64 to blob
    const imageBlob = Utilities.newBlob(
      Utilities.base64Decode(base64Data), 
      mimeType || 'image/jpeg', 
      originalName || 'image.jpg'
    );
    
    // Use existing upload function
    return uploadTaskResultImage(employeeName, refId, imageBlob, workingCode);
    
  } catch (error) {
    logWithContext('EmployeeTasks', `Error uploading from base64: ${error.message}`, 'ERROR');
    return createErrorResponse('Lỗi khi upload từ base64: ' + error.message);
  }
}