// ===================================================================
// WEBAPP_EXTRACTORDERS.GS - EXTRACT ORDERS FEATURE SUPPORT
// ===================================================================
// Created: 2025-07-12
// Purpose: Backend functions for extract-orders.html page
// Dependencies: WebApp_Utils.gs
// Used by: extract-orders.html

// ===================================================================
// MAIN EXTRACT ORDERS FUNCTIONS
// ===================================================================

/**
 * Extract orders by date range - OPTIMIZED VERSION
 * Improved performance, better error handling, and statistics tracking
 * @param {string} startDateStr - Start date in YYYY-MM-DD format
 * @param {string} endDateStr - End date in YYYY-MM-DD format
 * @returns {Object} - Result with orders data and statistics
 */
function extractByDateRange(startDateStr, endDateStr) {
  logWithContext('ExtractOrders', `Starting extraction for date range: ${startDateStr} to ${endDateStr}`);
  
  try {
    const ss = SpreadsheetApp.getActiveSpreadsheet();
    const sourceSheet = ss.getSheetByName("Shipping");
    
    if (!sourceSheet) {
      return createErrorResponse("❌ Không tìm thấy sheet 'Shipping'.");
    }
    
    const data = sourceSheet.getDataRange().getValues();
    if (data.length < 2) {
      return createErrorResponse("❌ Sheet 'Shipping' không có dữ liệu.");
    }
    
    const header = data[0];
    const headerMap = createHeaderMap(header);
    
    // Validate required columns
    const requiredColumns = ["Date", "Ref ID", "Shop", "Tracking", "Carrier", "Receiver name *", "Packed"];
    const validation = validateRequiredColumns(headerMap, requiredColumns);
    
    if (!validation.isValid) {
      return createErrorResponse(validation.message);
    }
    
    // Validate date range
    const dateValidation = validateDateRange(startDateStr, endDateStr);
    if (!dateValidation.isValid) {
      return createErrorResponse(dateValidation.message);
    }
    
    const startDay = new Date(dateValidation.startDate.getFullYear(), dateValidation.startDate.getMonth(), dateValidation.startDate.getDate());
    const endDay = new Date(dateValidation.endDate.getFullYear(), dateValidation.endDate.getMonth(), dateValidation.endDate.getDate());
    
    // Extract orders
    const output = [];
    let processedRows = 0;
    let validRows = 0;
    let packedCount = 0;
    let unpackedCount = 0;
    
    for (let i = 1; i < data.length; i++) {
      const row = data[i];
      processedRows++;
      
      const refID = safeString(row[headerMap["Ref ID"]]);
      if (isEmpty(refID)) continue; // Skip rows without Ref ID
      
      const rawDate = row[headerMap["Date"]];
      const rowDate = parseDate(rawDate);
      if (!rowDate) continue; // Skip rows with invalid dates
      
      const rowDay = new Date(rowDate.getFullYear(), rowDate.getMonth(), rowDate.getDate());
      if (rowDay < startDay || rowDay > endDay) continue; // Skip rows outside date range
      
      validRows++;
      
      // Extract data for display
      const shop = safeString(row[headerMap["Shop"]]);
      const tracking = safeString(row[headerMap["Tracking"]]);
      const carrier = safeString(row[headerMap["Carrier"]]);
      const receiver = safeString(row[headerMap["Receiver name *"]]);
      const shortRef = "H" + getLast4(refID);
      const shortTracking = tracking ? "V" + getLast4(tracking) : "";
      
      // Get packed status for internal logic
      const isPacked = Boolean(row[headerMap["Packed"]]);
      if (isPacked) {
        packedCount++;
      } else {
        unpackedCount++;
      }
      
      // Build output row: [Date, Shop, RefID, ShortRef, ShortTracking, Tracking, Carrier, Receiver, PackedStatus]
      output.push([
        formatDate(rowDate),
        shop,
        refID,
        shortRef,
        shortTracking,
        tracking,
        carrier,
        receiver,
        isPacked // This is used internally for checkbox state, not displayed
      ]);
    }
    
    // Sort by date (newest first)
    output.sort((a, b) => {
      const dateA = new Date(a[0].split('/').reverse().join('/'));
      const dateB = new Date(b[0].split('/').reverse().join('/'));
      return dateB - dateA; // Descending order
    });
    
    // Define header for display
    const outputHeader = [
      "Ngày", "Shop", "Mã đơn", "Short Invoice",
      "Short Tracking", "Tracking", "Carrier", "Người nhận"
    ];
    
    const resultMessage = output.length > 0 
      ? `✅ Đã tìm thấy ${output.length} đơn hàng (đã xử lý ${processedRows} dòng)`
      : "⚠️ Không có dữ liệu phù hợp.";
    
    const result = {
      success: true,
      header: outputHeader,
      rows: output,
      message: resultMessage,
      stats: {
        total: output.length,
        packed: packedCount,
        unpacked: unpackedCount,
        processed: processedRows,
        valid: validRows,
        dateRange: `${startDateStr} đến ${endDateStr}`
      }
    };
    
    logWithContext('ExtractOrders', `Extraction completed: ${output.length} orders found`);
    return result;
    
  } catch (error) {
    logWithContext('ExtractOrders', `Extraction error: ${error.message}`, 'ERROR');
    return createErrorResponse("❌ Lỗi khi trích xuất dữ liệu: " + error.message);
  }
}

/**
 * Update packed status - OPTIMIZED VERSION
 * Better error handling and performance improvements
 * @param {string} startDateStr - Start date in YYYY-MM-DD format
 * @param {string} endDateStr - End date in YYYY-MM-DD format
 * @param {Array<number>} selectedIndexes - Array of selected row indexes
 * @returns {Object} - Update result with statistics
 */
function updatePackedStatus(startDateStr, endDateStr, selectedIndexes) {
  logWithContext('ExtractOrders', `Starting packed status update for ${selectedIndexes.length} selected items`);
  
  try {
    const ss = SpreadsheetApp.getActiveSpreadsheet();
    const sheet = ss.getSheetByName("Shipping");
    
    if (!sheet) {
      return createErrorResponse("❌ Không tìm thấy sheet 'Shipping'.");
    }
    
    const data = sheet.getDataRange().getValues();
    if (data.length < 2) {
      return createErrorResponse("❌ Sheet 'Shipping' không có dữ liệu.");
    }
    
    const header = data[0];
    const headerMap = createHeaderMap(header);
    
    // Validate required columns
    const requiredColumns = ["Date", "Packed", "Send", "Ref ID"];
    const validation = validateRequiredColumns(headerMap, requiredColumns);
    
    if (!validation.isValid) {
      return createErrorResponse(validation.message);
    }
    
    // Validate date range
    const dateValidation = validateDateRange(startDateStr, endDateStr);
    if (!dateValidation.isValid) {
      return createErrorResponse(dateValidation.message);
    }
    
    const startDay = new Date(dateValidation.startDate.getFullYear(), dateValidation.startDate.getMonth(), dateValidation.startDate.getDate());
    const endDay = new Date(dateValidation.endDate.getFullYear(), dateValidation.endDate.getMonth(), dateValidation.endDate.getDate());
    
    let resultIdx = 0;
    let packedCount = 0;
    let unpackedCount = 0;
    const today = formatDate(new Date());
    
    // Convert selectedIndexes to Set for faster lookup
    const selectedSet = new Set(selectedIndexes);
    
    // Process rows in batch for better performance
    const updates = [];
    
    for (let i = 1; i < data.length; i++) {
      const row = data[i];
      const refID = safeString(row[headerMap["Ref ID"]]);
      if (isEmpty(refID)) continue;
      
      const rowRaw = row[headerMap["Date"]];
      const rowDate = parseDate(rowRaw);
      if (!rowDate) continue;
      
      const rowDay = new Date(rowDate.getFullYear(), rowDate.getMonth(), rowDate.getDate());
      if (rowDay < startDay || rowDay > endDay) continue;
      
      const isSelected = selectedSet.has(resultIdx);
      const isAlreadyPacked = Boolean(row[headerMap["Packed"]]);
      const isSendBlank = isEmpty(row[headerMap["Send"]]);
      
      // Determine action needed
      if (isSelected && !isAlreadyPacked) {
        // Pack the item
        updates.push({
          row: i + 1,
          packedCol: headerMap["Packed"] + 1,
          sendCol: headerMap["Send"] + 1,
          packedValue: today,
          sendValue: isSendBlank ? today : row[headerMap["Send"]]
        });
        packedCount++;
        
      } else if (!isSelected && isAlreadyPacked) {
        // Unpack the item
        updates.push({
          row: i + 1,
          packedCol: headerMap["Packed"] + 1,
          sendCol: headerMap["Send"] + 1,
          packedValue: "",
          sendValue: ""
        });
        unpackedCount++;
      }
      
      resultIdx++;
    }
    
    // Apply updates in batch
    if (updates.length > 0) {
      try {
        updates.forEach(update => {
          sheet.getRange(update.row, update.packedCol).setValue(update.packedValue);
          if (update.sendValue !== undefined) {
            sheet.getRange(update.row, update.sendCol).setValue(update.sendValue);
          }
        });
        
        logWithContext('ExtractOrders', `Applied ${updates.length} updates successfully`);
      } catch (updateError) {
        logWithContext('ExtractOrders', `Error applying updates: ${updateError.message}`, 'ERROR');
        return createErrorResponse(`❌ Lỗi khi cập nhật: ${updateError.message}`);
      }
    }
    
    // Generate result message
    const messageParts = [];
    if (packedCount > 0) messageParts.push(`${packedCount} đơn được đánh dấu đã gói`);
    if (unpackedCount > 0) messageParts.push(`${unpackedCount} đơn được bỏ đánh dấu`);
    
    const message = messageParts.length > 0
      ? `✅ Đã cập nhật: ${messageParts.join(' và ')}.`
      : "✅ Không có thay đổi nào được thực hiện.";
    
    const result = {
      success: true,
      message: message,
      stats: {
        packed: packedCount,
        unpacked: unpackedCount,
        total: packedCount + unpackedCount,
        updatesApplied: updates.length,
        selectedCount: selectedIndexes.length
      }
    };
    
    logWithContext('ExtractOrders', `Update completed: ${packedCount} packed, ${unpackedCount} unpacked`);
    return result;
    
  } catch (error) {
    logWithContext('ExtractOrders', `Update error: ${error.message}`, 'ERROR');
    return createErrorResponse("❌ Lỗi khi cập nhật trạng thái: " + error.message);
  }
}

// ===================================================================
// SUPPORTING FUNCTIONS FOR EXTRACT ORDERS
// ===================================================================

/**
 * Get summary statistics for the Shipping sheet
 * @returns {Object} - Summary statistics
 */
function getShippingStats() {
  logWithContext('ExtractOrders', 'Getting shipping statistics');
  
  try {
    const ss = SpreadsheetApp.getActiveSpreadsheet();
    const sheet = ss.getSheetByName("Shipping");
    
    if (!sheet) {
      return createErrorResponse("❌ Không tìm thấy sheet 'Shipping'.");
    }
    
    const data = sheet.getDataRange().getValues();
    if (data.length < 2) {
      return createSuccessResponse({
        totalOrders: 0,
        packedOrders: 0,
        unpackedOrders: 0,
        sentOrders: 0,
        message: "Sheet trống"
      });
    }
    
    const header = data[0];
    const headerMap = createHeaderMap(header);
    
    let totalOrders = 0;
    let packedOrders = 0;
    let sentOrders = 0;
    let ordersToday = 0;
    
    const today = new Date();
    const todayStr = formatDate(today);
    
    for (let i = 1; i < data.length; i++) {
      const row = data[i];
      const refID = safeString(row[headerMap["Ref ID"]]);
      
      if (!isEmpty(refID)) {
        totalOrders++;
        
        // Check packed status
        if (Boolean(row[headerMap["Packed"]])) {
          packedOrders++;
        }
        
        // Check sent status
        if (!isEmpty(row[headerMap["Send"]])) {
          sentOrders++;
        }
        
        // Check if order is from today
        const orderDate = parseDate(row[headerMap["Date"]]);
        if (orderDate && formatDate(orderDate) === todayStr) {
          ordersToday++;
        }
      }
    }
    
    const stats = {
      totalOrders: totalOrders,
      packedOrders: packedOrders,
      unpackedOrders: totalOrders - packedOrders,
      sentOrders: sentOrders,
      ordersToday: ordersToday,
      packingRate: totalOrders > 0 ? Math.round((packedOrders / totalOrders) * 100) : 0,
      lastUpdated: new Date().toISOString()
    };
    
    logWithContext('ExtractOrders', `Statistics generated: ${totalOrders} total orders`);
    return createSuccessResponse(stats, "✅ Thống kê được tạo thành công");
    
  } catch (error) {
    logWithContext('ExtractOrders', `Statistics error: ${error.message}`, 'ERROR');
    return createErrorResponse("❌ Lỗi khi tạo thống kê: " + error.message);
  }
}

/**
 * Search orders by Ref ID or Tracking number
 * @param {string} searchTerm - Search term (Ref ID or Tracking)
 * @returns {Object} - Search results
 */
function searchOrders(searchTerm) {
  logWithContext('ExtractOrders', `Searching orders for term: ${searchTerm}`);
  
  try {
    if (isEmpty(searchTerm)) {
      return createErrorResponse("❌ Vui lòng nhập từ khóa tìm kiếm.");
    }
    
    const ss = SpreadsheetApp.getActiveSpreadsheet();
    const sheet = ss.getSheetByName("Shipping");
    
    if (!sheet) {
      return createErrorResponse("❌ Không tìm thấy sheet 'Shipping'.");
    }
    
    const data = sheet.getDataRange().getValues();
    if (data.length < 2) {
      return createErrorResponse("❌ Sheet 'Shipping' không có dữ liệu.");
    }
    
    const header = data[0];
    const headerMap = createHeaderMap(header);
    
    const results = [];
    const searchTermLower = searchTerm.toLowerCase();
    
    for (let i = 1; i < data.length; i++) {
      const row = data[i];
      const refID = safeString(row[headerMap["Ref ID"]]);
      const tracking = safeString(row[headerMap["Tracking"]]);
      
      // Check if search term matches Ref ID or Tracking
      if (refID.toLowerCase().includes(searchTermLower) || 
          tracking.toLowerCase().includes(searchTermLower)) {
        
        results.push({
          rowIndex: i + 1,
          date: formatDate(parseDate(row[headerMap["Date"]])),
          refId: refID,
          tracking: tracking,
          shop: safeString(row[headerMap["Shop"]]),
          carrier: safeString(row[headerMap["Carrier"]]),
          receiver: safeString(row[headerMap["Receiver name *"]]),
          isPacked: Boolean(row[headerMap["Packed"]]),
          isSent: !isEmpty(row[headerMap["Send"]])
        });
      }
    }
    
    const message = results.length > 0 
      ? `✅ Tìm thấy ${results.length} đơn hàng phù hợp`
      : "⚠️ Không tìm thấy đơn hàng nào phù hợp";
    
    logWithContext('ExtractOrders', `Search completed: ${results.length} results found`);
    return createSuccessResponse(results, message);
    
  } catch (error) {
    logWithContext('ExtractOrders', `Search error: ${error.message}`, 'ERROR');
    return createErrorResponse("❌ Lỗi khi tìm kiếm: " + error.message);
  }
}

// ===================================================================
// VERSION AND MODULE INFO
// ===================================================================

/**
 * Get version information for this extract orders module
 * @returns {Object} - Version information
 */
function getExtractOrdersVersion() {
  return {
    module: 'WebApp_ExtractOrders',
    version: '1.0.0',
    created: '2025-07-12',
    description: 'Extract orders feature support for extract-orders.html',
    functions: [
      'extractByDateRange', 'updatePackedStatus', 'getShippingStats', 'searchOrders'
    ],
    dependencies: [
      'WebApp_Utils.gs',
      'extract-orders.html',
      'Shipping sheet'
    ],
    features: [
      'Optimized performance with batch processing',
      'Comprehensive error handling',
      'Statistics tracking',
      'Date range validation',
      'Search functionality'
    ]
  };
}