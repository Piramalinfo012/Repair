const SCRIPT_URL = import.meta.env.VITE_APPSCRIPT_URL;
// const SHEET_Id = import.meta.env.VITE_SHEET_ID; // Unused in login action


export const authenticateUser = async (username, password) => {
  try {
    // Use explicit GET and ensure the sheet parameter is encoded
    const checkUrl = `${SCRIPT_URL}?sheet=${encodeURIComponent("Repair Login")}`;

    const response = await fetch(checkUrl, {
      method: "GET",
      redirect: "follow",
      headers: {
        "Content-Type": "text/plain;charset=utf-8",
      },
    });

    if (!response.ok) {
      throw new Error("Network response was not ok");
    }

    const json = await response.json();

    // The GAS doGet returns: { success: true, updated: ..., rows: ..., data: [[...], [...]] }
    const rows = json.data;

    if (!rows || rows.length < 2) {
      throw new Error("No user data found");
    }

    // Skip header row (index 0) and find matching user
    // Column Index Mapping:
    // 0: Username
    // 1: Password
    // 2: Role
    // 3: Page Access

    // We start from index 1 to skip headers
    const userRow = rows.slice(1).find(row =>
      String(row[0]).trim() === username && String(row[1]).trim() === password
    );

    if (userRow) {
      const role = userRow[2];
      const pageAccessRaw = userRow[3];

      let accessList = [];
      if (pageAccessRaw) {
        // Handle comma-separated list
        accessList = String(pageAccessRaw).split(",").map(item => item.trim());
      }

      return {
        id: username,
        name: username,
        role: role,
        access: accessList,
      };
    } else {
      throw new Error("Invalid credentials");
    }
  } catch (error) {
    console.error("Authentication error:", error);
    throw error;
  }
};
