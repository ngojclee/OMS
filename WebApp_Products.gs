// ===================================================================
// WEBAPP_PRODUCTS.GS - PRODUCTS INTEGRATION MODULE
// ===================================================================
// Created: 2025-07-12
// Purpose: Integration with Mr Ngoc - Products Google Sheet
// Dependencies: WebApp_Utils.gs
// Sheet URL: https://docs.google.com/spreadsheets/d/1DDBQbGqradXtZreMgBxzEOhN_eZ1GoeDOoUEQ01oG0w/edit?gid=0#gid=0

// ===================================================================
// SHEET CONNECTION AND BASIC FUNCTIONS
// ===================================================================

/**
 * Get connection to Mr Ngoc - Products sheet
 * @returns {Object} - Sheet connection result
 */
function connectToProductsSheet() {
  logWithContext('Products', 'Connecting to Mr Ngoc - Products sheet');
  
  try {
    const SHEET_ID = '1DDBQbGqradXtZreMgBxzEOhN_eZ1GoeDOoUEQ01oG0w';
    const SHEET_NAME = 'Sheet1'; // Default sheet name, can be adjusted
    
    // Open the external sheet
    const ss = SpreadsheetApp.openById(SHEET_ID);
    const sheet = ss.getSheetByName(SHEET_NAME) || ss.getSheets()[0]; // Fallback to first sheet
    
    if (!sheet) {
      return createErrorResponse('Không thể kết nối đến sheet Products');
    }
    
    const sheetInfo = {
      id: SHEET_ID,
      name: sheet.getName(),
      url: ss.getUrl(),
      lastUpdated: sheet.getLastUpdated(),
      rowCount: sheet.getLastRow(),
      columnCount: sheet.getLastColumn()
    };
    
    logWithContext('Products', `Connected to sheet: ${sheetInfo.name} (${sheetInfo.rowCount} rows)`);
    
    return {
      success: true,
      sheet: sheet,
      info: sheetInfo,
      message: `✅ Đã kết nối đến sheet Products: ${sheetInfo.rowCount} dòng dữ liệu`
    };
    
  } catch (error) {
    logWithContext('Products', `Error connecting to Products sheet: ${error.message}`, 'ERROR');
    return createErrorResponse('Lỗi kết nối sheet Products: ' + error.message);
  }
}

/**
 * Get all products data from the sheet
 * @returns {Object} - Products data result
 */
function getAllProductsData() {
  logWithContext('Products', 'Getting all products data');
  
  try {
    const connection = connectToProductsSheet();
    if (!connection.success) {
      return connection;
    }
    
    const sheet = connection.sheet;
    const data = sheet.getDataRange().getValues();
    
    if (data.length < 2) {
      return createErrorResponse('Sheet Products không có dữ liệu');
    }
    
    const header = data[0];
    const headerMap = createHeaderMap(header);
    
    // Log detected columns for debugging
    logWithContext('Products', `Detected columns: ${header.join(', ')}`);
    
    const products = [];
    
    // Process each data row
    for (let i = 1; i < data.length; i++) {
      const row = data[i];
      
      // Extract basic product info
      const product = {
        rowIndex: i + 1,
        sku: safeString(row[0]), // Assume SKU is in first column
        name: safeString(row[1]), // Assume product name is in second column
        category: safeString(row[2] || ''),
        price: safeString(row[3] || ''),
        quantity: safeString(row[4] || ''),
        imageUrl: '',
        description: '',
        status: 'active'
      };
      
      // Try to find image URL column
      const possibleImageCols = ['Image', 'Image URL', 'Photo', 'Picture', 'Link Image', 'Hình ảnh'];
      for (const colName of possibleImageCols) {
        const colIndex = headerMap[colName];
        if (colIndex !== undefined && row[colIndex]) {
          product.imageUrl = safeString(row[colIndex]);
          break;
        }
      }
      
      // Try to find description column
      const possibleDescCols = ['Description', 'Mô tả', 'Details', 'Chi tiết'];
      for (const colName of possibleDescCols) {
        const colIndex = headerMap[colName];
        if (colIndex !== undefined && row[colIndex]) {
          product.description = safeString(row[colIndex]);
          break;
        }
      }
      
      // Only add products with valid SKU
      if (!isEmpty(product.sku)) {
        products.push(product);
      }
    }
    
    const result = {
      success: true,
      data: products,
      count: products.length,
      sheetInfo: connection.info,
      header: header,
      message: `✅ Đã tải ${products.length} sản phẩm từ sheet Products`
    };
    
    logWithContext('Products', `Products loaded: ${products.length} products found`);
    return result;
    
  } catch (error) {
    logWithContext('Products', `Error getting products data: ${error.message}`, 'ERROR');
    return createErrorResponse('Lỗi khi tải dữ liệu sản phẩm: ' + error.message);
  }
}

// ===================================================================
// SKU EXTRACTION FUNCTIONS
// ===================================================================

/**
 * Get SKU list from Products sheet
 * @param {Object} options - Filter options
 * @returns {Object} - SKU list result
 */
function getProductsSKUList(options = {}) {
  logWithContext('Products', 'Getting SKU list from Products sheet');
  
  try {
    const productsData = getAllProductsData();
    if (!productsData.success) {
      return productsData;
    }
    
    const products = productsData.data;
    const defaultOptions = {
      includeInactive: false,
      sortBy: 'sku',
      format: 'array' // 'array' or 'object'
    };
    
    const config = { ...defaultOptions, ...options };
    
    // Filter and process SKUs
    let skuList = products
      .filter(product => {
        if (!config.includeInactive && product.status !== 'active') {
          return false;
        }
        return !isEmpty(product.sku);
      })
      .map(product => ({
        sku: product.sku,
        name: product.name,
        category: product.category,
        imageUrl: product.imageUrl,
        rowIndex: product.rowIndex
      }));
    
    // Sort SKUs
    switch (config.sortBy) {
      case 'name':
        skuList.sort((a, b) => a.name.localeCompare(b.name));
        break;
      case 'category':
        skuList.sort((a, b) => a.category.localeCompare(b.category));
        break;
      case 'sku':
      default:
        skuList.sort((a, b) => a.sku.localeCompare(b.sku));
        break;
    }
    
    // Format result
    const result = {
      success: true,
      data: config.format === 'array' ? skuList.map(item => item.sku) : skuList,
      count: skuList.length,
      config: config,
      message: `✅ Đã trích xuất ${skuList.length} SKU từ sheet Products`
    };
    
    logWithContext('Products', `SKU list extracted: ${skuList.length} SKUs`);
    return result;
    
  } catch (error) {
    logWithContext('Products', `Error getting SKU list: ${error.message}`, 'ERROR');
    return createErrorResponse('Lỗi khi trích xuất SKU: ' + error.message);
  }
}

/**
 * Search products by SKU
 * @param {string|Array<string>} skus - SKU(s) to search for
 * @returns {Object} - Search result
 */
function searchProductsBySKU(skus) {
  logWithContext('Products', `Searching products by SKU: ${Array.isArray(skus) ? skus.join(', ') : skus}`);
  
  try {
    const searchSkus = Array.isArray(skus) ? skus : [skus];
    
    if (searchSkus.length === 0) {
      return createErrorResponse('Danh sách SKU tìm kiếm trống');
    }
    
    const productsData = getAllProductsData();
    if (!productsData.success) {
      return productsData;
    }
    
    const products = productsData.data;
    const foundProducts = [];
    const notFoundSkus = [];
    
    // Search for each SKU
    searchSkus.forEach(sku => {
      const product = products.find(p => 
        p.sku.toLowerCase() === sku.toLowerCase()
      );
      
      if (product) {
        foundProducts.push(product);
      } else {
        notFoundSkus.push(sku);
      }
    });
    
    const result = {
      success: true,
      data: foundProducts,
      foundCount: foundProducts.length,
      notFoundSkus: notFoundSkus,
      searchCount: searchSkus.length,
      message: `✅ Tìm thấy ${foundProducts.length}/${searchSkus.length} sản phẩm`
    };
    
    if (notFoundSkus.length > 0) {
      result.warning = `Không tìm thấy SKU: ${notFoundSkus.join(', ')}`;
    }
    
    logWithContext('Products', `SKU search completed: ${foundProducts.length} found, ${notFoundSkus.length} not found`);
    return result;
    
  } catch (error) {
    logWithContext('Products', `Error searching products by SKU: ${error.message}`, 'ERROR');
    return createErrorResponse('Lỗi khi tìm kiếm sản phẩm theo SKU: ' + error.message);
  }
}

// ===================================================================
// IMAGE LINKS EXTRACTION FUNCTIONS
// ===================================================================

/**
 * Get image links for products
 * @param {Array<string>} skus - Optional SKU filter
 * @returns {Object} - Image links result
 */
function getProductsImageLinks(skus = []) {
  logWithContext('Products', 'Getting image links from Products sheet');
  
  try {
    const productsData = getAllProductsData();
    if (!productsData.success) {
      return productsData;
    }
    
    let products = productsData.data;
    
    // Filter by SKUs if provided
    if (skus.length > 0) {
      products = products.filter(product => 
        skus.some(sku => sku.toLowerCase() === product.sku.toLowerCase())
      );
    }
    
    // Extract image links
    const imageLinks = [];
    const noImageProducts = [];
    
    products.forEach(product => {
      if (!isEmpty(product.imageUrl)) {
        imageLinks.push({
          sku: product.sku,
          name: product.name,
          imageUrl: product.imageUrl,
          rowIndex: product.rowIndex
        });
      } else {
        noImageProducts.push({
          sku: product.sku,
          name: product.name
        });
      }
    });
    
    const result = {
      success: true,
      data: imageLinks,
      withImageCount: imageLinks.length,
      noImageCount: noImageProducts.length,
      noImageProducts: noImageProducts,
      totalProducts: products.length,
      message: `✅ Đã trích xuất ${imageLinks.length} link hình ảnh từ ${products.length} sản phẩm`
    };
    
    if (noImageProducts.length > 0) {
      result.warning = `${noImageProducts.length} sản phẩm không có hình ảnh`;
    }
    
    logWithContext('Products', `Image links extracted: ${imageLinks.length} links, ${noImageProducts.length} without images`);
    return result;
    
  } catch (error) {
    logWithContext('Products', `Error getting image links: ${error.message}`, 'ERROR');
    return createErrorResponse('Lỗi khi trích xuất link hình ảnh: ' + error.message);
  }
}

/**
 * Validate and test image links
 * @param {Array<string>} imageUrls - Image URLs to test
 * @returns {Object} - Validation result
 */
function validateImageLinks(imageUrls) {
  logWithContext('Products', `Validating ${imageUrls.length} image links`);
  
  try {
    const validLinks = [];
    const invalidLinks = [];
    
    imageUrls.forEach(url => {
      if (isEmpty(url)) {
        invalidLinks.push({ url: url, reason: 'URL trống' });
        return;
      }
      
      // Basic URL validation
      const urlPattern = /^https?:\/\/.+\.(jpg|jpeg|png|gif|webp)(\?.*)?$/i;
      if (urlPattern.test(url)) {
        validLinks.push(url);
      } else {
        invalidLinks.push({ url: url, reason: 'Format URL không hợp lệ' });
      }
    });
    
    const result = {
      success: true,
      validLinks: validLinks,
      invalidLinks: invalidLinks,
      validCount: validLinks.length,
      invalidCount: invalidLinks.length,
      totalCount: imageUrls.length,
      message: `✅ Kiểm tra hoàn tất: ${validLinks.length} hợp lệ, ${invalidLinks.length} không hợp lệ`
    };
    
    logWithContext('Products', `Image validation completed: ${validLinks.length} valid, ${invalidLinks.length} invalid`);
    return result;
    
  } catch (error) {
    logWithContext('Products', `Error validating image links: ${error.message}`, 'ERROR');
    return createErrorResponse('Lỗi khi kiểm tra link hình ảnh: ' + error.message);
  }
}

// ===================================================================
// INTEGRATION HELPER FUNCTIONS
// ===================================================================

/**
 * Sync product data with OMS system
 * @param {Array<Object>} products - Products to sync
 * @returns {Object} - Sync result
 */
function syncProductsWithOMS(products) {
  logWithContext('Products', `Syncing ${products.length} products with OMS`);
  
  try {
    // This function would integrate with existing OMS sheets
    // For now, we'll prepare the data structure
    
    const syncData = products.map(product => ({
      sku: product.sku,
      name: product.name,
      category: product.category,
      imageUrl: product.imageUrl,
      lastUpdated: new Date().toISOString(),
      syncStatus: 'pending'
    }));
    
    // Here you would implement the actual sync logic
    // Example: Update inventory sheet, orders sheet, etc.
    
    const result = {
      success: true,
      data: syncData,
      syncCount: syncData.length,
      message: `✅ Đã chuẩn bị sync ${syncData.length} sản phẩm với OMS`
    };
    
    logWithContext('Products', `Products sync prepared: ${syncData.length} products`);
    return result;
    
  } catch (error) {
    logWithContext('Products', `Error syncing products with OMS: ${error.message}`, 'ERROR');
    return createErrorResponse('Lỗi khi đồng bộ sản phẩm với OMS: ' + error.message);
  }
}

/**
 * Get products summary statistics
 * @returns {Object} - Summary statistics
 */
function getProductsSummary() {
  logWithContext('Products', 'Getting products summary statistics');
  
  try {
    const productsData = getAllProductsData();
    if (!productsData.success) {
      return productsData;
    }
    
    const products = productsData.data;
    
    // Calculate statistics
    const stats = {
      totalProducts: products.length,
      withImages: products.filter(p => !isEmpty(p.imageUrl)).length,
      withoutImages: products.filter(p => isEmpty(p.imageUrl)).length,
      categories: [...new Set(products.map(p => p.category).filter(c => !isEmpty(c)))],
      skuFormats: {
        numeric: products.filter(p => /^\d+$/.test(p.sku)).length,
        alphanumeric: products.filter(p => /^[a-zA-Z0-9]+$/.test(p.sku)).length,
        withSpecialChars: products.filter(p => /[^a-zA-Z0-9]/.test(p.sku)).length
      }
    };
    
    stats.imagePercentage = stats.totalProducts > 0 
      ? Math.round((stats.withImages / stats.totalProducts) * 100) 
      : 0;
    
    const result = {
      success: true,
      data: stats,
      message: `✅ Thống kê sản phẩm: ${stats.totalProducts} sản phẩm, ${stats.withImages} có hình ảnh (${stats.imagePercentage}%)`
    };
    
    logWithContext('Products', `Products summary: ${stats.totalProducts} products, ${stats.withImages} with images`);
    return result;
    
  } catch (error) {
    logWithContext('Products', `Error getting products summary: ${error.message}`, 'ERROR');
    return createErrorResponse('Lỗi khi tạo thống kê sản phẩm: ' + error.message);
  }
}

// ===================================================================
// VERSION AND MODULE INFO
// ===================================================================

/**
 * Get version information for this products module
 * @returns {Object} - Version information
 */
function getProductsVersion() {
  return {
    module: 'WebApp_Products',
    version: '1.0.0',
    created: '2025-07-12',
    description: 'Products integration with Mr Ngoc - Products Google Sheet',
    sheetId: '1DDBQbGqradXtZreMgBxzEOhN_eZ1GoeDOoUEQ01oG0w',
    functions: [
      'connectToProductsSheet', 'getAllProductsData', 'getProductsSKUList',
      'searchProductsBySKU', 'getProductsImageLinks', 'validateImageLinks',
      'syncProductsWithOMS', 'getProductsSummary'
    ],
    dependencies: [
      'WebApp_Utils.gs',
      'Mr Ngoc - Products Google Sheet'
    ],
    features: [
      'External sheet connection',
      'SKU extraction and search',
      'Image links extraction',
      'Data validation',
      'OMS integration ready',
      'Summary statistics'
    ]
  };
}