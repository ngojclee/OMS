// ===================================================================
// WEBAPP_MAIN.GS - MAIN WEB APPLICATION ROUTING
// ===================================================================
// Created: 2025-07-12
// Purpose: Main routing and HTML include functions for Web Application
// Dependencies: HTML templates
// Entry Point: doGet() - Called when web app is accessed

// ===================================================================
// MAIN WEB APPLICATION ENTRY POINT
// ===================================================================

/**
 * Main entry point for the web application
 * Handles routing to different pages based on URL parameters
 * @param {Object} e - Event object containing URL parameters
 * @returns {HtmlOutput} - HTML page to display
 */
function doGet(e) {
  try {
    // Log access for debugging
    logWithContext('WebApp_Main', `doGet called with parameters: ${JSON.stringify(e.parameter)}`);
    
    // Get page parameter, default to 'home'
    const page = e.parameter.page || 'home';
    
    // Validate page parameter
    const validPages = [
      'home',
      'extract-orders', 
      'label-script',
      'shipping-labels',
      'employee-tasks',
      'employee-portal',
      'inventory',
      'reports', 
      'settings'
    ];
    
    let templateName = 'home'; // Default fallback
    
    if (validPages.includes(page)) {
      templateName = page;
      logWithContext('WebApp_Main', `Routing to page: ${page}`);
    } else {
      logWithContext('WebApp_Main', `Invalid page requested: ${page}, routing to home`, 'WARN');
    }
    
    // Create template
    let template;
    try {
      template = HtmlService.createTemplateFromFile(templateName);
      
      // Pass URL parameters to template (especially token for employee-portal)
      if (page === 'employee-portal' && e.parameter.token) {
        template.urlToken = e.parameter.token;
        logWithContext('WebApp_Main', `Token parameter found and passed to template: ${e.parameter.token}`);
      }
      
      logWithContext('WebApp_Main', `Template created successfully: ${templateName}`);
    } catch (templateError) {
      logWithContext('WebApp_Main', `Template creation failed for ${templateName}: ${templateError.message}`, 'ERROR');
      
      // Fallback to home template
      template = HtmlService.createTemplateFromFile('home');
      logWithContext('WebApp_Main', 'Fallback to home template');
    }
    
    // Evaluate and configure template
    const htmlOutput = template.evaluate()
      .setXFrameOptionsMode(HtmlService.XFrameOptionsMode.ALLOWALL)
      .setTitle('Hệ thống quản lý phòng ban');
    
    logWithContext('WebApp_Main', `Successfully serving page: ${templateName}`);
    return htmlOutput;
    
  } catch (error) {
    logWithContext('WebApp_Main', `doGet error: ${error.message}`, 'ERROR');
    
    // Emergency fallback - return basic error page
    return HtmlService.createHtmlOutput(`
      <html>
        <body>
          <h2>❌ Lỗi hệ thống</h2>
          <p>Có lỗi xảy ra khi tải trang. Vui lòng thử lại sau.</p>
          <p><strong>Chi tiết:</strong> ${error.message}</p>
          <p><a href="?">← Quay về trang chủ</a></p>
        </body>
      </html>
    `).setTitle('Lỗi hệ thống');
  }
}

// ===================================================================
// HTML TEMPLATE INCLUDE SYSTEM
// ===================================================================

/**
 * Include HTML content from other files
 * Used by HTML templates to include shared components (CSS, JS, etc.)
 * @param {string} filename - Name of the HTML file to include
 * @returns {string} - HTML content of the included file
 */
function include(filename) {
  try {
    logWithContext('WebApp_Main', `Including file: ${filename}`);
    
    // Validate filename
    if (!filename || typeof filename !== 'string') {
      throw new Error('Invalid filename provided to include()');
    }
    
    // Get HTML content
    const htmlOutput = HtmlService.createHtmlOutputFromFile(filename);
    const content = htmlOutput.getContent();
    
    logWithContext('WebApp_Main', `Successfully included file: ${filename} (${content.length} chars)`);
    return content;
    
  } catch (error) {
    logWithContext('WebApp_Main', `Include error for ${filename}: ${error.message}`, 'ERROR');
    
    // Return error comment instead of breaking the page
    return `<!-- ERROR: Could not include ${filename} - ${error.message} -->`;
  }
}

// ===================================================================
// WEB APP CONFIGURATION AND INFO
// ===================================================================

/**
 * Get web application configuration and status
 * @returns {Object} - Web app configuration and runtime info
 */
function getWebAppInfo() {
  try {
    const info = {
      name: 'Hệ thống quản lý phòng ban',
      version: '2.0.0',
      created: '2025-07-12',
      architecture: 'Modular Web Application',
      
      // Available pages
      pages: [
        { id: 'home', name: 'Trang chủ', status: 'active', icon: '🏠' },
        { id: 'extract-orders', name: 'Trích xuất đơn hàng', status: 'stable', icon: '📦' },
        { id: 'label-script', name: 'In tem vận chuyển', status: 'stable', icon: '🏷️' },
        { id: 'employee-tasks', name: 'Giao việc nhân viên', status: 'stable', icon: '👥' },
        { id: 'employee-portal', name: 'Portal nhân viên', status: 'stable', icon: '👤' },
        { id: 'products-integration', name: 'Sản phẩm Mr Ngoc', status: 'stable', icon: '🛍️' },
        { id: 'shipping-labels', name: 'Tem vận chuyển (Legacy)', status: 'deprecated', icon: '🗑️' },
        { id: 'inventory', name: 'Quản lý kho', status: 'planned', icon: '📊' },
        { id: 'reports', name: 'Báo cáo', status: 'planned', icon: '📈' },
        { id: 'settings', name: 'Cài đặt', status: 'planned', icon: '⚙️' }
      ],
      
      // Module structure
      modules: [
        'WebApp_Main.gs - Main routing and includes',
        'WebApp_Utils.gs - Common utility functions', 
        'WebApp_ExtractOrders.gs - Extract orders feature',
        'WebApp_LabelScript.gs - Label script feature',
        'WebApp_EmployeeTasks.gs - Employee tasks feature'
      ],
      
      // Runtime info
      runtime: {
        timestamp: new Date().toISOString(),
        timezone: Session.getScriptTimeZone(),
        user: Session.getActiveUser().getEmail()
      }
    };
    
    logWithContext('WebApp_Main', 'Web app info generated successfully');
    return createSuccessResponse(info, 'Web app information retrieved');
    
  } catch (error) {
    logWithContext('WebApp_Main', `Error getting web app info: ${error.message}`, 'ERROR');
    return createErrorResponse('Could not retrieve web app information', error);
  }
}

/**
 * Get available pages with their status
 * Used by navigation components
 * @returns {Array} - Array of page objects
 */
function getAvailablePages() {
  try {
    const info = getWebAppInfo();
    
    if (info.success) {
      const activePages = info.data.pages.filter(page => 
        page.status === 'active' || page.status === 'stable' || page.status === 'development'
      );
      
      logWithContext('WebApp_Main', `Found ${activePages.length} available pages`);
      return activePages;
    } else {
      throw new Error('Could not get web app info');
    }
    
  } catch (error) {
    logWithContext('WebApp_Main', `Error getting available pages: ${error.message}`, 'ERROR');
    
    // Return minimal fallback
    return [
      { id: 'home', name: 'Trang chủ', status: 'active', icon: '🏠' },
      { id: 'extract-orders', name: 'Trích xuất đơn hàng', status: 'stable', icon: '📦' },
      { id: 'label-script', name: 'In tem vận chuyển', status: 'stable', icon: '🏷️' }
    ];
  }
}

// ===================================================================
// HEALTH CHECK AND DIAGNOSTICS
// ===================================================================

/**
 * Health check function to verify web app is working
 * @returns {Object} - Health status
 */
function healthCheck() {
  try {
    const startTime = new Date().getTime();
    
    // Test basic functionality
    const tests = {
      routing: false,
      templates: false,
      utilities: false,
      sheets: false
    };
    
    // Test routing
    try {
      const testPage = 'home';
      const template = HtmlService.createTemplateFromFile(testPage);
      tests.routing = true;
      logWithContext('WebApp_Main', 'Health check: Routing OK');
    } catch (error) {
      logWithContext('WebApp_Main', `Health check: Routing FAILED - ${error.message}`, 'ERROR');
    }
    
    // Test template system
    try {
      const content = include('shared-styles');
      tests.templates = content.length > 0;
      logWithContext('WebApp_Main', 'Health check: Templates OK');
    } catch (error) {
      logWithContext('WebApp_Main', `Health check: Templates FAILED - ${error.message}`, 'ERROR');
    }
    
    // Test utilities
    try {
      const version = getUtilsVersion();
      tests.utilities = version && version.module === 'WebApp_Utils';
      logWithContext('WebApp_Main', 'Health check: Utilities OK');
    } catch (error) {
      logWithContext('WebApp_Main', `Health check: Utilities FAILED - ${error.message}`, 'ERROR');
    }
    
    // Test sheets access
    try {
      const sheets = getSheetsList();
      tests.sheets = Array.isArray(sheets) && sheets.length > 0;
      logWithContext('WebApp_Main', 'Health check: Sheets access OK');
    } catch (error) {
      logWithContext('WebApp_Main', `Health check: Sheets access FAILED - ${error.message}`, 'ERROR');
    }
    
    const endTime = new Date().getTime();
    const duration = endTime - startTime;
    
    const allTestsPassed = Object.values(tests).every(test => test === true);
    
    const healthStatus = {
      status: allTestsPassed ? 'healthy' : 'degraded',
      timestamp: new Date().toISOString(),
      duration: `${duration}ms`,
      tests: tests,
      message: allTestsPassed ? 
        '✅ All systems operational' : 
        '⚠️ Some systems have issues'
    };
    
    logWithContext('WebApp_Main', `Health check completed: ${healthStatus.status} (${duration}ms)`);
    return healthStatus;
    
  } catch (error) {
    logWithContext('WebApp_Main', `Health check error: ${error.message}`, 'ERROR');
    return {
      status: 'unhealthy',
      timestamp: new Date().toISOString(),
      error: error.message,
      message: '❌ Health check failed'
    };
  }
}

// ===================================================================
// VERSION AND MODULE INFO
// ===================================================================

/**
 * Get version information for this main module
 * @returns {Object} - Version information
 */
function getMainVersion() {
  return {
    module: 'WebApp_Main',
    version: '1.0.0',
    created: '2025-07-12',
    description: 'Main routing and template system for Web Application',
    functions: [
      'doGet', 'include', 'getWebAppInfo', 'getAvailablePages', 'healthCheck'
    ],
    dependencies: [
      'WebApp_Utils.gs',
      'HTML templates (home.html, shared-styles.html, etc.)'
    ]
  };
}