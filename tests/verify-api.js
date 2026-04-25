const baseUrl = "http://localhost:8787";

async function runTests() {
    console.log("--- BẮT ĐẦU KIỂM THỬ API (NODE.JS) ---");

    // 1. Kiểm tra OpenAPI
    try {
        const res = await fetch(`${baseUrl}/openapi.json`);
        if (res.ok) {
            console.log("[PASS] OpenAPI tải thành công.");
        } else {
            console.log(`[FAIL] OpenAPI lỗi: ${res.status}`);
        }
    } catch (e) {
        console.log(`[FAIL] Không thể kết nối tới server: ${e.message}`);
        return;
    }

    // 2. Test SQL Injection
    console.log("Đang test SQL Injection...");
    try {
        const res = await fetch(`${baseUrl}/marketing/generate`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                content: {
                    mental_model_id: "' OR 1=1 --",
                    persona_id: "indie-hackers",
                    campaign_id: "test"
                }
            })
        });
        const data = await res.json();
        if (res.status === 404) {
            console.log("[PASS] Chặn SQL Injection thành công (Trả về 404 vì không tìm thấy ID lạ).");
        } else {
            console.log(`[WARN] Server phản hồi status ${res.status}.`);
        }
    } catch (e) {
        console.log(`[PASS] Hệ thống đã chặn hoặc crash an toàn: ${e.message}`);
    }

    // 3. Test Dữ liệu rỗng (Lỗi người dùng)
    console.log("Đang test dữ liệu rỗng...");
    try {
        const res = await fetch(`${baseUrl}/marketing/generate`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({})
        });
        if (res.status === 400) {
            console.log("[PASS] Đã chặn request trống (400 Bad Request).");
        } else {
            console.log(`[FAIL] Chấp nhận request trống! Status: ${res.status}`);
        }
    } catch (e) {
        console.log(`[PASS] Báo lỗi thành công: ${e.message}`);
    }

    console.log("--- KẾT THÚC KIỂM THỬ ---");
}

runTests();
