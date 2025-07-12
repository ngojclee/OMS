// ===================================================================
// WEBAPP_LABELSCRIPT.GS - LABEL SCRIPT FEATURE SUPPORT
// ===================================================================
// Created: 2025-07-12
// Purpose: Backend functions for label-script.html page
// Dependencies: WebApp_Utils.gs
// Used by: label-script.html

// ===================================================================
// BASIC LABEL FUNCTIONS
// ===================================================================

/**
 * Get shipping labels from Label sheet
 * @returns {Object} - Result with labels data
 */
function getShippingLabels() {
  logWithContext('LabelScript', 'Getting shipping labels from Label sheet');
  
  try {
    const ss = SpreadsheetApp.getActiveSpreadsheet();
    const sheet = ss.getSheetByName('Label');
    
    if (!sheet) {
      return createErrorResponse('Sheet "Label" không tìm thấy');
    }
    
    const data = sheet.getDataRange().getValues();
    if (data.length < 2) {
      return createSuccessResponse([], 'Sheet Label trống');
    }
    
    const labels = [];
    
    // Process label data - 3 labels per row
    for (let i = 1; i < data.length; i++) {
      const row = data[i];
      
      // Process 3 blocks per row (columns A-B, C-D, E-F)
      for (let block = 0; block < 3; block++) {
        const startCol = block * 2;
        const rowNum = row[startCol];
        const customer = row[startCol + 1];
        
        // Validate label data
        if (rowNum && customer && 
            !isEmpty(safeString(rowNum)) && 
            !isEmpty(safeString(customer)) && 
            !safeString(customer).match(/^\d+$/)) {
          
          const label = {
            code: safeString(rowNum),
            customer: safeString(customer),
            address: []
          };
          
          // Get address lines from subsequent rows
          for (let j = i + 1; j < Math.min(i + 8, data.length); j++) {
            const addressLine = data[j][startCol + 1];
            if (addressLine && 
                !isEmpty(safeString(addressLine)) && 
                safeString(addressLine) !== label.customer &&
                !safeString(addressLine).match(/^\d+$/)) {
              label.address.push(safeString(addressLine));
            }
          }
          
          labels.push(label);
        }
      }
    }
    
    const message = labels.length > 0 
      ? `✅ Đã tải ${labels.length} nhãn thành công`
      : '⚠️ Không tìm thấy nhãn nào';
    
    logWithContext('LabelScript', `Labels loaded: ${labels.length} labels found`);
    
    return {
      success: true,
      data: labels,
      count: labels.length,
      message: message
    };
    
  } catch (error) {
    logWithContext('LabelScript', `Error getting shipping labels: ${error.message}`, 'ERROR');
    return createErrorResponse('Lỗi khi tải nhãn: ' + error.message);
  }
}

// ===================================================================
// ENHANCED SHIPPING LABELS FUNCTIONS
// ===================================================================

/**
 * Get shipping orders for creating labels
 * @param {Array<string>} excludeCarriers - Array of carriers to exclude
 * @returns {Object} - Result with orders for labels
 */
function getShippingOrdersForLabels(excludeCarriers = []) {
  logWithContext('LabelScript', `Getting orders for labels, excluding carriers: ${excludeCarriers.join(', ')}`);
  
  try {
    const ss = SpreadsheetApp.getActiveSpreadsheet();
    const sheet = ss.getSheetByName('Shipping');
    
    if (!sheet) {
      return createErrorResponse('Sheet "Shipping" không tồn tại');
    }
    
    const data = sheet.getDataRange().getValues();
    if (data.length < 2) {
      return createErrorResponse('Sheet "Shipping" không có dữ liệu');
    }
    
    const header = data[0];
    const headerMap = createHeaderMap(header);
    
    // Required columns mapping
    const requiredCols = {
      refId: headerMap['Ref ID'] || 1,           // Cột B
      send: headerMap['Send'] || 14,             // Cột O
      localCarrier: headerMap['Local Carrier'] || 15, // Cột P
      receiverName: headerMap['Receiver name *'] || 19,     // Cột T
      addressLine1: headerMap['Receiver address line 1 *'] || 20, // Cột U
      addressLine2: headerMap['Receiver address line 2'] || 21,   // Cột V
      city: headerMap['Receiver city *'] || 22,             // Cột W
      state: headerMap['Receiver state'] || 23,             // Cột X
      postcode: headerMap['Receiver postcode'] || 24,       // Cột Y
      country: headerMap['Receiver country *'] || 25        // Cột Z
    };
    
    const orders = [];
    const allCarriers = new Set(); // Collect all carriers for filter UI
    
    // Process each row (skip header)
    for (let i = 1; i < data.length; i++) {
      const row = data[i];
      
      const sendValue = row[requiredCols.send];
      const refId = safeString(row[requiredCols.refId]);
      const localCarrier = safeString(row[requiredCols.localCarrier]);
      
      // Collect ALL carriers for filter UI
      if (!isEmpty(localCarrier)) {
        allCarriers.add(localCarrier);
      }
      
      // Skip if already sent, no refId
      if (sendValue || isEmpty(refId)) continue;
      
      // Skip if carrier is in exclude list 
      if (excludeCarriers.includes(localCarrier)) continue;
      
      const order = {
        rowIndex: i,
        refId: refId,
        localCarrier: localCarrier,
        receiverName: safeString(row[requiredCols.receiverName]),
        addressLine1: safeString(row[requiredCols.addressLine1]),
        addressLine2: safeString(row[requiredCols.addressLine2]),
        city: safeString(row[requiredCols.city]),
        state: safeString(row[requiredCols.state]),
        postcode: safeString(row[requiredCols.postcode]),
        country: safeString(row[requiredCols.country]),
        selected: false // Default not selected
      };
      
      // Only add if has minimum required info
      if (!isEmpty(order.refId) && !isEmpty(order.receiverName)) {
        orders.push(order);
      }
    }
    
    const result = {
      success: true,
      data: orders,
      count: orders.length,
      allCarriers: Array.from(allCarriers).sort(),
      excludedCarriers: excludeCarriers,
      message: `Tìm thấy ${orders.length} đơn hàng chưa gửi`,
      debug: {
        totalRows: data.length - 1,
        totalCarriers: allCarriers.size,
        carriersList: Array.from(allCarriers).sort()
      }
    };
    
    logWithContext('LabelScript', `Orders for labels: ${orders.length} found, ${allCarriers.size} carriers`);
    return result;
    
  } catch (error) {
    logWithContext('LabelScript', `Error getting orders for labels: ${error.message}`, 'ERROR');
    return createErrorResponse('Lỗi khi lấy đơn hàng cho nhãn: ' + error.message);
  }
}

/**
 * Get detailed information for a specific order
 * @param {string} refId - Reference ID of the order
 * @returns {Object} - Order details
 */
function getOrderDetails(refId) {
  logWithContext('LabelScript', `Getting order details for Ref ID: ${refId}`);
  
  try {
    if (isEmpty(refId)) {
      return createErrorResponse('Ref ID không được để trống');
    }
    
    const ss = SpreadsheetApp.getActiveSpreadsheet();
    const sheet = ss.getSheetByName('Shipping');
    
    if (!sheet) {
      return createErrorResponse('Sheet "Shipping" không tồn tại');
    }
    
    const data = sheet.getDataRange().getValues();
    if (data.length < 2) {
      return createErrorResponse('Sheet "Shipping" không có dữ liệu');
    }
    
    const header = data[0];
    const headerMap = createHeaderMap(header);
    
    // Find the row with matching Ref ID
    for (let i = 1; i < data.length; i++) {
      const row = data[i];
      const currentRefId = safeString(row[headerMap['Ref ID'] || 1]);
      
      if (currentRefId === refId) {
        const orderDetails = {
          refId: currentRefId,
          shop: safeString(row[headerMap['Shop'] || 2]),
          tracking: safeString(row[headerMap['Tracking'] || 3]),
          carrier: safeString(row[headerMap['Carrier'] || 4]),
          localCarrier: safeString(row[headerMap['Local Carrier'] || 15]),
          receiverName: safeString(row[headerMap['Receiver name *'] || 19]),
          addressLine1: safeString(row[headerMap['Receiver address line 1 *'] || 20]),
          addressLine2: safeString(row[headerMap['Receiver address line 2'] || 21]),
          city: safeString(row[headerMap['Receiver city *'] || 22]),
          state: safeString(row[headerMap['Receiver state'] || 23]),
          postcode: safeString(row[headerMap['Receiver postcode'] || 24]),
          country: safeString(row[headerMap['Receiver country *'] || 25]),
          date: formatDate(parseDate(row[headerMap['Date'] || 0])),
          isPacked: Boolean(row[headerMap['Packed'] || 13]),
          isSent: !isEmpty(row[headerMap['Send'] || 14])
        };
        
        logWithContext('LabelScript', `Order details found for: ${refId}`);
        return createSuccessResponse(orderDetails, 'Chi tiết đơn hàng được tải thành công');
      }
    }
    
    logWithContext('LabelScript', `Order not found: ${refId}`, 'WARN');
    return createErrorResponse('Không tìm thấy đơn hàng với Ref ID: ' + refId);
    
  } catch (error) {
    logWithContext('LabelScript', `Error getting order details: ${error.message}`, 'ERROR');
    return createErrorResponse('Lỗi khi lấy chi tiết đơn hàng: ' + error.message);
  }
}

/**
 * Mark orders as sent (update Send column)
 * @param {Array<string>} refIds - Array of Ref IDs to mark as sent
 * @returns {Object} - Update result
 */
function markOrdersAsSent(refIds) {
  logWithContext('LabelScript', `Marking ${refIds.length} orders as sent`);
  
  try {
    if (!Array.isArray(refIds) || refIds.length === 0) {
      return createErrorResponse('Danh sách Ref ID không hợp lệ');
    }
    
    const ss = SpreadsheetApp.getActiveSpreadsheet();
    const sheet = ss.getSheetByName('Shipping');
    
    if (!sheet) {
      return createErrorResponse('Sheet "Shipping" không tồn tại');
    }
    
    const data = sheet.getDataRange().getValues();
    if (data.length < 2) {
      return createErrorResponse('Sheet "Shipping" không có dữ liệu');
    }
    
    const header = data[0];
    const headerMap = createHeaderMap(header);
    const today = formatDate(new Date());
    let updatedCount = 0;
    
    // Find and update rows
    for (let i = 1; i < data.length; i++) {
      const row = data[i];
      const refId = safeString(row[headerMap['Ref ID'] || 1]);
      
      if (refIds.includes(refId)) {
        // Update Send column (Cột O = index 14)
        const sendCol = headerMap['Send'] || 14;
        sheet.getRange(i + 1, sendCol + 1).setValue(today);
        updatedCount++;
        
        logWithContext('LabelScript', `Marked as sent: ${refId}`);
      }
    }
    
    const message = `✅ Đã cập nhật ${updatedCount} đơn hàng thành trạng thái đã gửi`;
    
    logWithContext('LabelScript', `Mark as sent completed: ${updatedCount} orders updated`);
    
    return {
      success: true,
      message: message,
      updatedCount: updatedCount,
      totalRequested: refIds.length
    };
    
  } catch (error) {
    logWithContext('LabelScript', `Error marking orders as sent: ${error.message}`, 'ERROR');
    return createErrorResponse('Lỗi khi cập nhật trạng thái gửi: ' + error.message);
  }
}

// ===================================================================
// LABEL GENERATION AND FORMATTING
// ===================================================================

/**
 * Generate printable labels from orders
 * @param {Array<Object>} orders - Array of order objects
 * @param {Object} options - Formatting options
 * @returns {Object} - Generated labels data
 */
function generatePrintableLabels(orders, options = {}) {
  logWithContext('LabelScript', `Generating printable labels for ${orders.length} orders`);
  
  try {
    if (!Array.isArray(orders) || orders.length === 0) {
      return createErrorResponse('Danh sách đơn hàng trống');
    }
    
    const defaultOptions = {
      includeRefId: true,
      includeCarrier: true,
      addressFormat: 'multiline',
      sortBy: 'refId' // 'refId', 'carrier', 'country'
    };
    
    const config = { ...defaultOptions, ...options };
    
    // Sort orders based on config
    const sortedOrders = [...orders];
    
    switch (config.sortBy) {
      case 'carrier':
        sortedOrders.sort((a, b) => (a.localCarrier || '').localeCompare(b.localCarrier || ''));
        break;
      case 'country':
        sortedOrders.sort((a, b) => (a.country || '').localeCompare(b.country || ''));
        break;
      case 'refId':
      default:
        sortedOrders.sort((a, b) => (a.refId || '').localeCompare(b.refId || ''));
        break;
    }
    
    // Generate printable labels
    const printableLabels = sortedOrders.map((order, index) => {
      const addressLines = [
        order.receiverName,
        order.addressLine1,
        order.addressLine2,
        order.city,
        order.state,
        order.postcode,
        order.country
      ].filter(line => !isEmpty(line));
      
      return {
        id: `label_${index + 1}`,
        refId: order.refId,
        carrier: order.localCarrier,
        receiverName: order.receiverName,
        fullAddress: addressLines.join(', '),
        addressLines: addressLines,
        shortRefId: 'H' + getLast4(order.refId),
        printOrder: index + 1
      };
    });
    
    // Calculate print layout
    const labelsPerPage = options.labelsPerPage || 18;
    const totalPages = Math.ceil(printableLabels.length / labelsPerPage);
    
    const result = {
      labels: printableLabels,
      totalLabels: printableLabels.length,
      totalPages: totalPages,
      labelsPerPage: labelsPerPage,
      config: config,
      generatedAt: new Date().toISOString()
    };
    
    logWithContext('LabelScript', `Generated ${printableLabels.length} printable labels, ${totalPages} pages`);
    return createSuccessResponse(result, `✅ Đã tạo ${printableLabels.length} nhãn in`);
    
  } catch (error) {
    logWithContext('LabelScript', `Error generating printable labels: ${error.message}`, 'ERROR');
    return createErrorResponse('Lỗi khi tạo nhãn in: ' + error.message);
  }
}

// ===================================================================
// SAMPLE DATA AND TESTING
// ===================================================================

/**
 * Create sample shipping data for testing
 * @returns {Object} - Result of sample data creation
 */
function createSampleShippingData() {
  logWithContext('LabelScript', 'Creating sample shipping data');
  
  try {
    const ss = SpreadsheetApp.getActiveSpreadsheet();
    let sheet = ss.getSheetByName('Shipping');
    
    if (!sheet) {
      sheet = ss.insertSheet('Shipping');
      logWithContext('LabelScript', 'Created new Shipping sheet');
    }
    
    // Clear existing data
    sheet.clear();
    
    // Create header row
    const headers = [
      'Date', 'Ref ID', 'Shop', 'Tracking', 'Carrier', '', '', '', '', '', 
      '', '', '', 'Packed', 'Send', 'Local Carrier', '', '', '', 'Receiver name *',
      'Receiver address line 1 *', 'Receiver address line 2', 'Receiver city *',
      'Receiver state', 'Receiver postcode', 'Receiver country *'
    ];
    
    sheet.getRange(1, 1, 1, headers.length).setValues([headers]);
    
    // Create sample data
    const today = formatDate(new Date());
    const sampleData = [
      [today, 'ORD001', 'Shopee', 'SP123456', 'SPX', '', '', '', '', '', '', '', '', '', '', 'Australia Post', '', '', '', 'Nguyễn Văn A', '123 Đường ABC', 'Phường XYZ', 'Sydney', 'NSW', '2000', 'Australia'],
      [today, 'ORD002', 'Lazada', 'LZ789012', 'GHN', '', '', '', '', '', '', '', '', '', '', 'Canada Post', '', '', '', 'Trần Thị B', '456 Đường DEF', 'Quận 1', 'Toronto', 'ON', 'M5H 2N2', 'Canada'],
      [today, 'ORD003', 'Tiki', 'TK345678', 'VTP', '', '', '', '', '', '', '', '', 'Packed', 'Sent', 'Fedex', '', '', '', 'Lê Văn C', '789 Đường GHI', 'Quận 2', 'New York', 'NY', '10001', 'USA']
    ];
    
    sheet.getRange(2, 1, sampleData.length, headers.length).setValues(sampleData);
    
    logWithContext('LabelScript', `Sample data created: ${sampleData.length} orders`);
    
    return createSuccessResponse({
      ordersCreated: sampleData.length,
      sheetName: 'Shipping'
    }, '✅ Đã tạo dữ liệu mẫu thành công');
    
  } catch (error) {
    logWithContext('LabelScript', `Error creating sample data: ${error.message}`, 'ERROR');
    return createErrorResponse('Lỗi khi tạo dữ liệu mẫu: ' + error.message);
  }
}

// ===================================================================
// VERSION AND MODULE INFO
// ===================================================================

/**
 * Get version information for this label script module
 * @returns {Object} - Version information
 */
function getLabelScriptVersion() {
  return {
    module: 'WebApp_LabelScript',
    version: '1.0.0',
    created: '2025-07-12',
    description: 'Label script feature support for label-script.html',
    functions: [
      'getShippingLabels', 'getShippingOrdersForLabels', 'getOrderDetails', 
      'markOrdersAsSent', 'generatePrintableLabels', 'createSampleShippingData'
    ],
    dependencies: [
      'WebApp_Utils.gs',
      'label-script.html',
      'Label sheet',
      'Shipping sheet'
    ],
    features: [
      'Label sheet processing',
      'Enhanced shipping orders filtering',
      'Carrier-based exclusion',
      'Printable label generation',
      'Order status updates'
    ]
  };
}