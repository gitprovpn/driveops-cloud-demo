const CORS = {
  "access-control-allow-origin": "*",
  "access-control-allow-methods": "GET,POST,PUT,DELETE,OPTIONS",
  "access-control-allow-headers": "content-type,authorization"
};

function json(data, status = 200, extraHeaders = {}) {
  return new Response(JSON.stringify(data, null, 2), {
    status,
    headers: {
      "content-type": "application/json; charset=utf-8",
      "cache-control": "no-store",
      ...CORS,
      ...extraHeaders
    }
  });
}

function bad(message, status = 400) {
  return json({ ok: false, message }, status);
}

function getCookie(req, name) {
  const cookie = req.headers.get("cookie") || "";
  const item = cookie.split(";").map(x => x.trim()).find(x => x.startsWith(name + "="));
  return item ? decodeURIComponent(item.split("=").slice(1).join("=")) : null;
}

async function getSession(req, env) {
  const sid = getCookie(req, "driveops_session");
  if (!sid) return null;
  const raw = await env.KV.get(`session:${sid}`);
  return raw ? JSON.parse(raw) : null;
}

function clientIp(req) {
  return req.headers.get("cf-connecting-ip") || req.headers.get("x-forwarded-for") || "";
}

async function audit(env, req, actor, action, entityType, entityId, detail) {
  await env.DB.prepare(`
    INSERT INTO audit_logs(actor, action, entity_type, entity_id, detail, ip_address)
    VALUES (?, ?, ?, ?, ?, ?)
  `).bind(actor || "System", action, entityType || null, entityId || null, detail || "", clientIp(req)).run();

  const recent = JSON.parse(await env.KV.get("recent_activity") || "[]");
  recent.unshift({
    actor: actor || "System",
    action,
    entityType,
    entityId,
    detail,
    at: new Date().toISOString()
  });
  await env.KV.put("recent_activity", JSON.stringify(recent.slice(0, 30)));
}

async function queryAll(env, sql, binds = []) {
  const stmt = env.DB.prepare(sql);
  const res = await stmt.bind(...binds).all();
  return res.results || [];
}

async function queryFirst(env, sql, binds = []) {
  return await env.DB.prepare(sql).bind(...binds).first();
}

async function bootstrap(env) {
  const students = await queryAll(env, "SELECT * FROM students ORDER BY id");
  const teachers = await queryAll(env, "SELECT * FROM teachers ORDER BY id");
  const vehicles = await queryAll(env, "SELECT * FROM vehicles ORDER BY id");

  const bookings = await queryAll(env, `
    SELECT b.*, s.full_name student_name, t.full_name teacher_name, v.plate_number
    FROM bookings b
    JOIN students s ON s.id = b.student_id
    LEFT JOIN teachers t ON t.id = b.teacher_id
    LEFT JOIN vehicles v ON v.id = b.vehicle_id
    ORDER BY b.id DESC
  `);

  const sessions = await queryAll(env, `
    SELECT ts.*, s.full_name student_name, t.full_name teacher_name, v.plate_number
    FROM training_sessions ts
    JOIN students s ON s.id = ts.student_id
    JOIN teachers t ON t.id = ts.teacher_id
    JOIN vehicles v ON v.id = ts.vehicle_id
    ORDER BY ts.id DESC
  `);

  const payments = await queryAll(env, `
    SELECT p.*, s.full_name student_name
    FROM payments p
    JOIN students s ON s.id = p.student_id
    ORDER BY p.id DESC
  `);

  const maintenance = await queryAll(env, `
    SELECT m.*, v.plate_number, v.model
    FROM maintenance_requests m
    JOIN vehicles v ON v.id = m.vehicle_id
    ORDER BY m.id DESC
  `);

  const auditLogs = await queryAll(env, "SELECT * FROM audit_logs ORDER BY id DESC LIMIT 20");
  const recentActivity = JSON.parse(await env.KV.get("recent_activity") || "[]");

  const totalRevenue = payments.reduce((sum, p) => sum + Number(p.amount || 0), 0);
  const totalTuition = students.reduce((sum, s) => sum + Number(s.tuition_total || 0), 0);
  const totalPaid = students.reduce((sum, s) => sum + Number(s.tuition_paid || 0), 0);
  const totalDebt = Math.max(0, totalTuition - totalPaid);
  const pendingBookings = bookings.filter(b => b.status === "pending").length;
  const completedSessions = sessions.filter(s => s.status === "completed").length;
  const riskyVehicles = vehicles.filter(v => v.document_alert !== "OK" || v.status !== "Đang hoạt động").length;

  return {
    ok: true,
    students,
    teachers,
    vehicles,
    bookings,
    sessions,
    payments,
    maintenance,
    auditLogs,
    recentActivity,
    metrics: {
      totalRevenue,
      totalDebt,
      pendingBookings,
      completedSessions,
      riskyVehicles,
      studentCount: students.length,
      teacherCount: teachers.length,
      vehicleCount: vehicles.length,
      activeVehicles: vehicles.filter(v => v.status === "Đang hoạt động").length,
      passRate: 82.4
    }
  };
}

async function requireAuth(req, env) {
  const session = await getSession(req, env);
  if (!session) throw new Error("UNAUTHORIZED");
  return session;
}

async function api(req, env, ctx) {
  const url = new URL(req.url);
  const path = url.pathname;

  if (req.method === "OPTIONS") return new Response(null, { headers: CORS });

  if (path === "/api/health") {
    return json({ ok: true, name: env.APP_NAME || "DriveOps Cloud", at: new Date().toISOString() });
  }

  if (path === "/api/login" && req.method === "POST") {
    const body = await req.json().catch(() => ({}));
    const user = await queryFirst(env, "SELECT * FROM users WHERE username=? AND password=? AND status='active'", [
      body.username || "",
      body.password || ""
    ]);

    if (!user) return bad("Sai tài khoản hoặc mật khẩu", 401);

    const sid = crypto.randomUUID();
    const session = {
      id: user.id,
      username: user.username,
      full_name: user.full_name,
      role: user.role,
      portal: user.portal
    };

    await env.KV.put(`session:${sid}`, JSON.stringify(session), { expirationTtl: 60 * 60 * 8 });
    await audit(env, req, user.full_name, "LOGIN", "user", user.id, "Đăng nhập demo");

    return json({ ok: true, user: session }, 200, {
      "set-cookie": `driveops_session=${encodeURIComponent(sid)}; Path=/; HttpOnly; SameSite=Lax; Max-Age=28800`
    });
  }

  if (path === "/api/logout" && req.method === "POST") {
    const sid = getCookie(req, "driveops_session");
    if (sid) await env.KV.delete(`session:${sid}`);
    return json({ ok: true }, 200, {
      "set-cookie": "driveops_session=; Path=/; Max-Age=0; SameSite=Lax"
    });
  }

  let session;
  try {
    session = await requireAuth(req, env);
  } catch {
    return bad("Chưa đăng nhập hoặc phiên đã hết hạn", 401);
  }

  if (path === "/api/me") return json({ ok: true, user: session });
  if (path === "/api/bootstrap") return json(await bootstrap(env));

  if (path === "/api/ai/insights" && req.method === "POST") {
    const body = await req.json().catch(() => ({}));
    const data = await bootstrap(env);
    const q = String(body.question || "").toLowerCase();

    let answer = "";
    if (q.includes("công nợ") || q.includes("học phí") || q.includes("nợ")) {
      answer = `Tổng công nợ demo hiện tại là ${data.metrics.totalDebt.toLocaleString("vi-VN")}đ. Ưu tiên nhắc Nguyễn Văn An và nhóm thi lại còn phí trước khi mở lịch tiếp theo.`;
    } else if (q.includes("xe") || q.includes("bảo dưỡng") || q.includes("đăng kiểm")) {
      answer = `Có ${data.metrics.riskyVehicles} xe có cảnh báo. Ưu tiên 51F-678.90 do đăng kiểm còn 7 ngày và 51A-123.45 do sắp bảo dưỡng.`;
    } else if (q.includes("lịch") || q.includes("tồn") || q.includes("hồ sơ")) {
      answer = `Có ${data.metrics.pendingBookings} lịch chờ phân công. Nên xử lý booking Sa hình thô của Lê Quốc Bình và kiểm tra điều kiện phí thi lại.`;
    } else {
      answer = `AI demo ghi nhận ${data.metrics.studentCount} học viên, ${data.metrics.vehicleCount} xe, doanh thu ${data.metrics.totalRevenue.toLocaleString("vi-VN")}đ và tỷ lệ đậu sát hạch ${data.metrics.passRate}%.`;
    }

    await audit(env, req, session.full_name, "AI_INSIGHT_QUERY", "ai", null, body.question || "");
    return json({ ok: true, answer, data: data.metrics });
  }

  if (path === "/api/bookings" && req.method === "POST") {
    const body = await req.json().catch(() => ({}));
    const result = await env.DB.prepare(`
      INSERT INTO bookings(student_id, booking_type, booking_date, start_time, end_time, area, status, note)
      VALUES (?, ?, ?, ?, ?, ?, 'pending', ?)
    `).bind(
      Number(body.student_id || 1),
      body.booking_type || "DAT đường trường",
      body.booking_date || "2026-05-25",
      body.start_time || "09:00",
      body.end_time || "11:00",
      body.area || "Quận 12",
      body.note || "Tạo từ demo web"
    ).run();

    await audit(env, req, session.full_name, "CREATE_BOOKING", "booking", result.meta.last_row_id, "Học viên gửi yêu cầu đặt lịch");
    return json({ ok: true, id: result.meta.last_row_id, data: await bootstrap(env) });
  }

  const assignMatch = path.match(/^\/api\/bookings\/(\d+)\/assign$/);
  if (assignMatch && req.method === "POST") {
    const bookingId = Number(assignMatch[1]);
    const body = await req.json().catch(() => ({}));
    const teacherId = Number(body.teacher_id || 1);
    const vehicleId = Number(body.vehicle_id || 1);

    const booking = await queryFirst(env, "SELECT * FROM bookings WHERE id=?", [bookingId]);
    if (!booking) return bad("Không tìm thấy booking", 404);

    await env.DB.prepare(`
      UPDATE bookings SET teacher_id=?, vehicle_id=?, status='assigned', updated_at=CURRENT_TIMESTAMP WHERE id=?
    `).bind(teacherId, vehicleId, bookingId).run();

    const existingSession = await queryFirst(env, "SELECT id FROM training_sessions WHERE booking_id=?", [bookingId]);
    if (!existingSession) {
      await env.DB.prepare(`
        INSERT INTO training_sessions(booking_id, student_id, teacher_id, vehicle_id, session_type, session_date, start_time, end_time, status)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, 'scheduled')
      `).bind(
        bookingId,
        booking.student_id,
        teacherId,
        vehicleId,
        booking.booking_type,
        booking.booking_date,
        booking.start_time,
        booking.end_time
      ).run();
    }

    await audit(env, req, session.full_name, "ASSIGN_BOOKING", "booking", bookingId, "Giáo vụ phân giáo viên và xe");
    return json({ ok: true, data: await bootstrap(env) });
  }

  const completeMatch = path.match(/^\/api\/sessions\/(\d+)\/complete$/);
  if (completeMatch && req.method === "POST") {
    const sessionId = Number(completeMatch[1]);
    const body = await req.json().catch(() => ({}));

    const training = await queryFirst(env, "SELECT * FROM training_sessions WHERE id=?", [sessionId]);
    if (!training) return bad("Không tìm thấy buổi học", 404);

    const odoStart = Number(body.odo_start || training.odo_start || 45320);
    const odoEnd = Number(body.odo_end || training.odo_end || 45362);
    const km = Number(body.km || Math.max(0, odoEnd - odoStart));
    const hours = Number(body.hours || 2);

    await env.DB.prepare(`
      UPDATE training_sessions
      SET status='completed', odo_start=?, odo_end=?, km=?, hours=?, dat_start_image='demo-start.jpg', dat_end_image='demo-end.jpg', completed_at=CURRENT_TIMESTAMP
      WHERE id=?
    `).bind(odoStart, odoEnd, km, hours, sessionId).run();

    await env.DB.prepare(`
      UPDATE students
      SET dat_completed_km=MIN(dat_required_km, dat_completed_km + ?),
          dat_completed_hours=MIN(dat_required_hours, dat_completed_hours + ?),
          progress_percent=MIN(100, progress_percent + 6),
          updated_at=CURRENT_TIMESTAMP
      WHERE id=?
    `).bind(km, hours, training.student_id).run();

    await env.DB.prepare(`
      UPDATE vehicles SET odo=?, updated_at=CURRENT_TIMESTAMP WHERE id=?
    `).bind(odoEnd, training.vehicle_id).run();

    await audit(env, req, session.full_name, "COMPLETE_TRAINING_SESSION", "training_session", sessionId, `Hoàn thành DAT ${km} KM / ${hours} giờ`);
    return json({ ok: true, data: await bootstrap(env) });
  }

  if (path === "/api/payments" && req.method === "POST") {
    const body = await req.json().catch(() => ({}));
    const amount = Number(body.amount || 3500000);
    const studentId = Number(body.student_id || 1);
    const receipt = `PT-${new Date().getFullYear()}-${Math.floor(Math.random() * 9000 + 1000)}`;

    const result = await env.DB.prepare(`
      INSERT INTO payments(student_id, payment_type, amount, method, receipt_no, status, created_by)
      VALUES (?, ?, ?, ?, ?, 'paid', ?)
    `).bind(
      studentId,
      body.payment_type || "Học phí lần cuối",
      amount,
      body.method || "Chuyển khoản",
      receipt,
      session.full_name
    ).run();

    await env.DB.prepare(`
      UPDATE students SET tuition_paid=MIN(tuition_total, tuition_paid + ?), updated_at=CURRENT_TIMESTAMP WHERE id=?
    `).bind(amount, studentId).run();

    await audit(env, req, session.full_name, "CREATE_PAYMENT", "payment", result.meta.last_row_id, `Tạo phiếu thu ${receipt}`);
    return json({ ok: true, receipt, data: await bootstrap(env) });
  }

  if (path === "/api/maintenance" && req.method === "POST") {
    const body = await req.json().catch(() => ({}));
    const result = await env.DB.prepare(`
      INSERT INTO maintenance_requests(vehicle_id, requested_by, item, priority, description, status)
      VALUES (?, ?, ?, ?, ?, 'pending')
    `).bind(
      Number(body.vehicle_id || 1),
      session.full_name,
      body.item || "Kiểm tra phanh",
      body.priority || "high",
      body.description || "Tạo từ demo web"
    ).run();

    await audit(env, req, session.full_name, "CREATE_MAINTENANCE", "maintenance", result.meta.last_row_id, "Tạo đề xuất bảo dưỡng");
    return json({ ok: true, id: result.meta.last_row_id, data: await bootstrap(env) });
  }

  const approveMaint = path.match(/^\/api\/maintenance\/(\d+)\/approve$/);
  if (approveMaint && req.method === "POST") {
    const id = Number(approveMaint[1]);
    const item = await queryFirst(env, "SELECT * FROM maintenance_requests WHERE id=?", [id]);
    if (!item) return bad("Không tìm thấy đề xuất bảo dưỡng", 404);

    await env.DB.prepare("UPDATE maintenance_requests SET status='approved', approved_at=CURRENT_TIMESTAMP WHERE id=?").bind(id).run();
    await env.DB.prepare("UPDATE vehicles SET status='Bảo dưỡng', updated_at=CURRENT_TIMESTAMP WHERE id=?").bind(item.vehicle_id).run();

    await audit(env, req, session.full_name, "APPROVE_MAINTENANCE", "maintenance", id, "Duyệt bảo dưỡng xe");
    return json({ ok: true, data: await bootstrap(env) });
  }

  if (path === "/api/reset-demo" && req.method === "POST") {
    await env.DB.prepare("DELETE FROM audit_logs WHERE id > 1").run();
    await env.DB.prepare("DELETE FROM bookings WHERE id > 3").run();
    await env.DB.prepare("DELETE FROM training_sessions WHERE id > 1").run();
    await env.DB.prepare("DELETE FROM payments WHERE id > 3").run();
    await env.DB.prepare("UPDATE students SET progress_percent=62, dat_completed_km=320, dat_completed_hours=14, tuition_paid=14500000 WHERE id=1").run();
    await env.DB.prepare("UPDATE vehicles SET odo=45320, status='Đang hoạt động' WHERE id=1").run();
    await env.DB.prepare("UPDATE maintenance_requests SET status='pending', approved_at=NULL WHERE id IN (1,2)").run();
    await env.KV.put("recent_activity", "[]");
    await audit(env, req, session.full_name, "RESET_DEMO", "system", 1, "Reset dữ liệu demo");
    return json({ ok: true, data: await bootstrap(env) });
  }

  return bad("API không tồn tại", 404);
}

export default {
  async fetch(req, env, ctx) {
    const url = new URL(req.url);
    if (url.pathname.startsWith("/api/")) {
      return api(req, env, ctx);
    }
    return env.ASSETS.fetch(req);
  }
};
