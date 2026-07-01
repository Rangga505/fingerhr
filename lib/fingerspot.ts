/**
 * Fingerspot API Client
 * Dokumentasi: https://developer.fingerspot.io
 */

const FINGERSPOT_API_URL = process.env.FINGERSPOT_API_URL || "https://developer.fingerspot.io/api";
const FINGERSPOT_API_KEY = process.env.FINGERSPOT_API_KEY || "";
const FINGERSPOT_CLOUD_ID = process.env.FINGERSPOT_CLOUD_ID || "";

interface FingerspotResponse<T = any> {
  success: boolean;
  message?: string;
  data?: T;
  error?: string;
}

/**
 * Base API call function
 */
async function callFingerspotAPI(
  endpoint: string,
  body: Record<string, any>
): Promise<FingerspotResponse> {
  try {
    const response = await fetch(`${FINGERSPOT_API_URL}/${endpoint}`, {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${FINGERSPOT_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        cloud_id: FINGERSPOT_CLOUD_ID,
        ...body,
      }),
    });

    const contentType = response.headers.get("content-type") || "";
    const text = await response.text();

    let data: any;
    try {
      data = JSON.parse(text);
    } catch {
      return {
        success: false,
        error: `API returned non-JSON (${response.status}): ${text.substring(0, 200)}`,
      };
    }
    
    if (!response.ok) {
      return {
        success: false,
        error: data.message || `API error ${response.status}`,
      };
    }

    return {
      success: true,
      data,
    };
  } catch (error) {
    console.error(`Fingerspot API Error (${endpoint}):`, error);
    return {
      success: false,
      error: error instanceof Error ? error.message : "Unknown error",
    };
  }
}

/**
 * Get Attendance Log (Max 2 days, last 60 days)
 */
export async function getAttendanceLog(
  startDate: string, // Format: YYYY-MM-DD
  endDate: string     // Format: YYYY-MM-DD
) {
  return callFingerspotAPI("get_attlog", {
    start_date: startDate,
    end_date: endDate,
  });
}

/**
 * Get User Info (Response via webhook)
 */
export async function getUserInfo(pin: string, transId: string = "1") {
  return callFingerspotAPI("get_userinfo", {
    pin,
    trans_id: transId,
  });
}

/**
 * Set User Info (Send user to device, response via webhook)
 */
export async function setUserInfo(userData: {
  pin: string;
  name: string;
  password?: string;
  card?: string;
  privilege?: string; // "0" = user, "14" = admin
  face?: string; // Base64 face photo for VIVO/VIDA/DS/DT series
}) {
  const body: Record<string, any> = {
    pin: userData.pin,
    name: userData.name,
    password: userData.password || "",
    card: userData.card || "",
    privilege: userData.privilege || "0",
  };

  // For VIVO/VIDA/DS/DT series, include face photo in template
  if (userData.face) {
    // Format: {"face":"<base64>"} then encode again to base64
    const faceJson = JSON.stringify({ face: userData.face });
    const templateBase64 = Buffer.from(faceJson).toString("base64");
    body.template = templateBase64;
  }

  return callFingerspotAPI("set_userinfo", body);
}

/**
 * Delete User Info (Response via webhook)
 */
export async function deleteUserInfo(pin: string) {
  return callFingerspotAPI("delete_userinfo", {
    pin,
  });
}

/**
 * Get All PIN from device (Response via webhook)
 */
export async function getAllPin(transId: string = "1") {
  return callFingerspotAPI("get_all_pin", {
    trans_id: transId,
  });
}

/**
 * Set Time on device (Response via webhook)
 */
export async function setDeviceTime(timezone: string = "Asia/Jakarta") {
  return callFingerspotAPI("set_time", {
    timezone,
  });
}

/**
 * Register Online (Response via webhook)
 */
export async function registerOnline(pin: string) {
  return callFingerspotAPI("reg_online", {
    pin,
  });
}

/**
 * Restart Device
 */
export async function restartDevice(transId: string = "1") {
  return callFingerspotAPI("restart_device", {
    trans_id: transId,
  });
}

/**
 * Get Device Info
 */
export async function getDevice(transId: string = "1") {
  return callFingerspotAPI("get_device", {
    trans_id: transId,
  });
}

/**
 * Helper: Format date untuk API
 */
export function formatDateForAPI(date: Date): string {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

/**
 * Helper: Get date range untuk download attlog
 */
export function getAttlogDateRange(daysAgo: number = 1) {
  const endDate = new Date();
  const startDate = new Date();
  startDate.setDate(startDate.getDate() - daysAgo);
  
  return {
    start: formatDateForAPI(startDate),
    end: formatDateForAPI(endDate),
  };
}
