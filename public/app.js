const state = { logged:false, page:"overview", user:null, data:null, aiOpen:false, aiMessages:[
  { role:"bot", text:"Xin chào, tôi là AI Assistant. Tôi hỗ trợ tra cứu hồ sơ tồn, công nợ, xe rủi ro và gợi ý hướng xử lý cho Giám đốc / Quản lý." }
]};

const portalMap = {
  overview:"Tổng quan", student:"Học viên", teacher:"Giáo viên", academic:"Giáo vụ",
  accounting:"Kế toán", vehicle:"Quản lý xe", director:"Giám đốc", architecture:"Kiến trúc"
};

const api = async (path, options={}) => {
  const res = await fetch(path, { ...options, headers:{ "content-type":"application/json", ...(options.headers||{}) } });
  const data = await res.json().catch(()=>({}));
  if(!res.ok) throw new Error(data.message || "API error");
  return data;
};

const money = n => new Intl.NumberFormat("vi-VN").format(Number(n||0)) + "đ";
const toast = msg => {
  const t = document.createElement("div"); t.className="toast"; t.textContent=msg;
  document.getElementById("toast").appendChild(t); setTimeout(()=>t.remove(),3500);
};

async function loadData(){
  state.data = await api("/api/bootstrap");
}

function app(){
  document.getElementById("app").innerHTML = state.logged ? layout() : login();
  bind();
  if(state.logged) renderAI();
}

function login(){
  return `<div class="login-shell">
    <section class="brand-panel">
      <div class="logo"><div class="logo-mark"></div><span>DriveOps <span style="color:var(--blue)">Cloud</span></span></div>
      <div class="kit-badge">▣ Cloudflare Worker Gateway + D1 + KV Demo</div>
      <h1>Nền tảng số hoá trung tâm đào tạo & sát hạch lái xe</h1>
      <p>Demo bán hàng có dữ liệu giả lập: học viên, lịch học, giáo viên, xe, học phí, bảo dưỡng, audit log và AI Assistant.</p>
      <div class="cloud-art"></div>
    </section>
    <section class="login-card-wrap">
      <div class="login-card">
        <div class="logo"><div class="logo-mark"></div><span>DriveOps <span style="color:var(--blue)">Cloud</span></span></div>
        <h2>Đăng nhập demo</h2>
        <p>Dùng <b>test/test</b>. Có thể dùng thêm: student/test, teacher/test, academic/test, accounting/test, vehicle/test.</p>
        <form id="loginForm">
          <div class="field"><label>Tài khoản</label><input id="u" value="test" autocomplete="username"></div>
          <div class="field"><label>Mật khẩu</label><input id="p" value="test" type="password" autocomplete="current-password"></div>
          <button class="btn primary full">Đăng nhập</button>
          <div id="err" class="error-msg hidden"></div>
        </form>
        <div class="login-help">Backend chạy bằng Cloudflare Worker. D1 lưu dữ liệu nghiệp vụ, KV lưu session và recent activity.</div>
      </div>
    </section>
  </div>`;
}

function navBtn(p,t,i){return `<button class="navbtn ${state.page===p?'active':''}" data-page="${p}"><span>${i}</span>${t}</button>`}
function layout(){
  return `<div class="shell">
    <aside class="sidebar">
      <div class="logo"><div class="logo-mark"></div><span>DriveOps Cloud</span></div>
      <nav class="nav">
        ${navBtn("overview","Tổng quan","⌂")}
        ${navBtn("student","Học viên","🎓")}
        ${navBtn("teacher","Giáo viên","🚘")}
        ${navBtn("academic","Giáo vụ","📅")}
        ${navBtn("accounting","Kế toán","💳")}
        ${navBtn("vehicle","Quản lý xe","🚗")}
        ${navBtn("director","Giám đốc","📊")}
        ${navBtn("architecture","Kiến trúc","☁️")}
      </nav>
      <div class="sidebar-foot">DriveOps Cloud<br>Cloudflare Sales Demo<br><br><button class="btn ghost" id="resetDemo">Reset demo</button><br><br><button class="btn ghost" id="logout">Đăng xuất</button></div>
    </aside>
    <div>
      <header class="topbar">
        <button class="btn ghost mobile-menu">☰</button>
        <div class="search"><input placeholder="Tìm kiếm học viên, lịch học, giáo viên, xe..."></div>
        <select id="quickRole" class="btn ghost">
          ${Object.entries(portalMap).map(([k,v])=>`<option value="${k}" ${state.page===k?'selected':''}>${v}</option>`).join("")}
        </select>
        <div class="user-chip"><div class="avatar">${(state.user?.full_name||"A")[0]}</div><div><b>${state.user?.full_name || "Demo User"}</b><br><span style="color:var(--muted);font-size:12px">${state.user?.role || "demo"}</span></div></div>
      </header>
      <main class="main">${page()}</main>
    </div>
  </div>`;
}

function page(){
  return ({overview,student,teacher,academic,accounting,vehicle,director,architecture}[state.page]||overview)();
}

function kpiGrid(items){
  return `<div class="kpi-grid">${items.map(x=>`<div class="kpi"><div class="label">${x[0]}</div><div class="value">${x[1]}</div><div class="trend ${x[3]||''}">${x[2]||""}</div></div>`).join("")}</div>`;
}

function badge(s){
  const x = String(s||"");
  let cls = "";
  if(["paid","assigned","completed","approved","Đang hoạt động","OK","Đã đủ phí"].some(v=>x.includes(v))) cls="green";
  if(["pending","Sắp","Đăng kiểm","Chờ","Thi lại"].some(v=>x.includes(v))) cls="orange";
  if(["Quá hạn","Bảo dưỡng","Tiêu hao cao","Còn"].some(v=>x.includes(v))) cls="red";
  return `<span class="badge ${cls}">${x}</span>`;
}

function table(headers, rows){
  return `<table class="table"><thead><tr>${headers.map(h=>`<th>${h}</th>`).join("")}</tr></thead><tbody>${rows.map(r=>`<tr>${r.map(c=>`<td>${badge(c)}</td>`).join("")}</tr>`).join("")}</tbody></table>`;
}

function auditPanel(){
  const logs = state.data.auditLogs || [];
  return `<div class="card"><h3>Audit log realtime</h3><div class="audit">${logs.map(a=>`<div class="audit-item"><b>${a.action}</b><small>${a.actor} · ${a.entity_type||""} #${a.entity_id||""}<br>${a.detail||""}<br>${a.created_at}</small></div>`).join("")}</div></div>`;
}

function overview(){
  const m = state.data.metrics;
  return `<div class="page-head"><div><h1>DriveOps Cloud – Demo bán hàng</h1><p>Cloudflare Worker Gateway + D1 + KV, dữ liệu giả lập sẵn, có flow click thay đổi dữ liệu thật.</p></div><button class="btn primary" onclick="state.page='architecture';app()">Xem kiến trúc</button></div>
  ${kpiGrid([
    ["Học viên", m.studentCount, "đang có trong D1"],
    ["Doanh thu demo", money(m.totalRevenue), "từ bảng payments"],
    ["Công nợ", money(m.totalDebt), "tính từ học phí"],
    ["Xe rủi ro", m.riskyVehicles, "cần quản lý xe xử lý", "down"]
  ])}
  <div class="grid two">
    <div class="card"><h3>Luồng demo nhanh</h3><div class="flow"><span class="node">Học viên đặt lịch</span><span class="arrow">→</span><span class="node">Giáo vụ phân GV/Xe</span><span class="arrow">→</span><span class="node">GV báo cáo DAT</span><span class="arrow">→</span><span class="node">Kế toán thu phí</span><span class="arrow">→</span><span class="node">GĐ xem KPI</span></div><br><div class="chart linechart">${lineSvg()}</div></div>
    ${auditPanel()}
  </div>`;
}

function student(){
  const s = state.data.students[0];
  const myBookings = state.data.bookings.filter(b=>b.student_id===s.id);
  return `<div class="page-head"><div><h1>Portal Học viên</h1><p>Theo dõi tiến độ, học phí và tạo yêu cầu đặt lịch DAT.</p></div></div>
  ${kpiGrid([["Tiến độ",s.progress_percent+"%","Đang học DAT"],["DAT",`${s.dat_completed_km}/${s.dat_required_km} KM`,`${s.dat_completed_hours}/${s.dat_required_hours} giờ`],["Công nợ",money(s.tuition_total-s.tuition_paid),"còn phải thu","down"],["Lịch của tôi",myBookings.length,"booking"]])}
  <div class="grid two">
    <div class="card"><h3>Đặt lịch DAT</h3>
      <div class="field"><label>Ngày học</label><input id="bookDate" type="date" value="2026-05-25"></div>
      <div class="field"><label>Khung giờ</label><select id="bookSlot"><option value="09:00-11:00">09:00–11:00</option><option value="14:00-16:00">14:00–16:00</option></select></div>
      <div class="field"><label>Khu vực</label><select id="bookArea"><option>Quận 12</option><option>Bình Tân</option></select></div>
      <button class="btn primary" id="createBooking">Gửi yêu cầu đặt lịch</button>
    </div>
    <div class="card"><h3>Lịch học</h3>${table(["ID","Loại","Ngày","Giờ","Trạng thái"], myBookings.map(b=>["#"+b.id,b.booking_type,b.booking_date,`${b.start_time}-${b.end_time}`,b.status]))}</div>
  </div>`;
}

function teacher(){
  const sessions = state.data.sessions || [];
  return `<div class="page-head"><div><h1>Portal Giáo viên</h1><p>Xem lịch được phân công và hoàn thành báo cáo DAT.</p></div></div>
  ${kpiGrid([["Buổi học",sessions.length,"scheduled"],["Giờ tháng","142h","demo"],["Rating","4.8/5","demo"],["Xe phụ trách","51A-123.45","Quận 12"]])}
  <div class="grid two">
    <div class="card"><h3>Lịch / Buổi học</h3>${table(["ID","Học viên","Loại","Xe","Trạng thái",""], sessions.map(s=>["#"+s.id,s.student_name,s.session_type,s.plate_number,s.status,s.status==="completed"?"✓":`<button class='btn primary completeSession' data-id='${s.id}'>Hoàn thành</button>`]))}</div>
    <div class="card"><h3>Form báo cáo nhanh</h3><div class="field"><label>ODO đầu</label><input id="odoStart" type="number" value="45320"></div><div class="field"><label>ODO cuối</label><input id="odoEnd" type="number" value="45362"></div><div class="field"><label>KM</label><input id="km" type="number" value="42"></div><div class="field"><label>Giờ</label><input id="hours" type="number" value="2"></div></div>
  </div>`;
}

function academic(){
  const bks = state.data.bookings || [];
  return `<div class="page-head"><div><h1>Portal Giáo vụ</h1><p>Điều phối booking, giáo viên và xe.</p></div></div>
  ${kpiGrid([["Booking",bks.length,"tổng"],["Chờ xử lý",state.data.metrics.pendingBookings,"pending","down"],["Giáo viên",state.data.metrics.teacherCount,"available"],["Xe hoạt động",state.data.metrics.activeVehicles,"active"]])}
  <div class="card"><h3>Booking Queue</h3>${table(["ID","Học viên","Loại","Ngày","Trạng thái","Hành động"], bks.map(b=>["#"+b.id,b.student_name,b.booking_type,b.booking_date,b.status,b.status==="pending"?`<button class='btn primary assignBooking' data-id='${b.id}'>Phân GV/Xe</button>`:"Đã phân"]))}</div>`;
}

function accounting(){
  const s = state.data.students[0];
  return `<div class="page-head"><div><h1>Portal Kế toán</h1><p>Ghi nhận phiếu thu, cập nhật công nợ.</p></div></div>
  ${kpiGrid([["Doanh thu",money(state.data.metrics.totalRevenue),"D1 payments"],["Công nợ",money(state.data.metrics.totalDebt),"tổng còn phải thu","down"],["Phiếu thu",state.data.payments.length,"records"],["HV An còn nợ",money(s.tuition_total-s.tuition_paid),"demo"]])}
  <div class="grid two">
    <div class="card"><h3>Tạo phiếu thu</h3><div class="field"><label>Học viên</label><input value="${s.full_name}" disabled></div><div class="field"><label>Số tiền</label><input id="payAmount" type="number" value="${Math.max(0,s.tuition_total-s.tuition_paid)}"></div><button class="btn primary" id="createPayment">Lưu phiếu thu</button></div>
    <div class="card"><h3>Lịch sử thu</h3>${table(["Phiếu","Học viên","Loại","Số tiền","Trạng thái"], state.data.payments.map(p=>[p.receipt_no,p.student_name,p.payment_type,money(p.amount),p.status]))}</div>
  </div>`;
}

function vehicle(){
  return `<div class="page-head"><div><h1>Portal Quản lý xe</h1><p>Xe, ODO, giấy tờ, xăng và bảo dưỡng.</p></div><button class="btn primary" id="createMaint">Tạo đề xuất demo</button></div>
  ${kpiGrid([["Tổng xe",state.data.metrics.vehicleCount,"fleet"],["Xe hoạt động",state.data.metrics.activeVehicles,"active"],["Xe rủi ro",state.data.metrics.riskyVehicles,"alert","down"],["Chi phí xăng",money(state.data.vehicles.reduce((a,v)=>a+v.fuel_cost_month,0)),"tháng"]])}
  <div class="grid two">
    <div class="card"><h3>Danh sách xe</h3>${table(["Biển số","Model","ODO","Trạng thái","Cảnh báo"], state.data.vehicles.map(v=>[v.plate_number,v.model,v.odo+" km",v.status,v.document_alert]))}</div>
    <div class="card"><h3>Đề xuất bảo dưỡng</h3>${table(["ID","Xe","Hạng mục","Ưu tiên","Trạng thái",""], state.data.maintenance.map(m=>["#"+m.id,m.plate_number,m.item,m.priority,m.status,m.status==="pending"?`<button class='btn primary approveMaint' data-id='${m.id}'>Duyệt</button>`:"✓"]))}</div>
  </div>`;
}

function director(){
  return `<div class="page-head"><div><h1>Dashboard Giám đốc</h1><p>KPI realtime tổng hợp từ dữ liệu D1 và recent activity trên KV.</p></div><button class="btn primary" onclick="DriveOpsAI.open()">Hỏi AI</button></div>
  ${kpiGrid([["Học viên",state.data.metrics.studentCount,"D1"],["Công nợ",money(state.data.metrics.totalDebt),"cần xử lý","down"],["Tỷ lệ đậu",state.data.metrics.passRate+"%","demo"],["Xe rủi ro",state.data.metrics.riskyVehicles,"alert","down"]])}
  <div class="grid two"><div class="card"><h3>Cảnh báo điều hành</h3><ul><li>${state.data.metrics.pendingBookings} lịch đang chờ giáo vụ phân công.</li><li>${state.data.metrics.riskyVehicles} xe có cảnh báo vận hành.</li><li>Công nợ tổng: ${money(state.data.metrics.totalDebt)}.</li><li>AI Assistant có thể gợi ý hướng xử lý hồ sơ tồn.</li></ul></div>${auditPanel()}</div>`;
}

function architecture(){
  return `<div class="page-head"><div><h1>Kiến trúc Cloudflare cơ bản</h1><p>GitHub → Cloudflare Worker Gateway → D1/KV → Web UI demo.</p></div></div>
  <div class="arch">
    <div class="col"><h4>1. GitHub</h4><div class="box">Source code</div><div class="box">wrangler.toml</div><div class="box">CI/CD optional</div></div>
    <div class="col"><h4>2. Worker Gateway</h4><div class="box">/api/login</div><div class="box">/api/bootstrap</div><div class="box">/api/business-flow</div></div>
    <div class="col"><h4>3. D1 Database</h4><div class="box">students</div><div class="box">bookings</div><div class="box">payments</div><div class="box">audit_logs</div></div>
    <div class="col"><h4>4. KV</h4><div class="box">session</div><div class="box">recent_activity</div><div class="box">demo config</div></div>
    <div class="col"><h4>5. Web UI</h4><div class="box">Dashboard</div><div class="box">Forms</div><div class="box">AI Assistant</div></div>
  </div>`;
}

function lineSvg(){return `<svg viewBox="0 0 600 240" preserveAspectRatio="none"><defs><linearGradient id="g" x1="0" x2="0" y1="0" y2="1"><stop stop-color="#1263f1" stop-opacity=".25"/><stop offset="1" stop-color="#1263f1" stop-opacity="0"/></linearGradient></defs><path d="M30 190 L100 150 L170 160 L240 120 L310 135 L380 92 L450 110 L520 70 L570 88" fill="none" stroke="#1263f1" stroke-width="5"/><path d="M30 190 L100 150 L170 160 L240 120 L310 135 L380 92 L450 110 L520 70 L570 88 L570 240 L30 240Z" fill="url(#g)"/></svg>`}

function renderAI(){
  let root = document.getElementById("ai-root");
  if(!root){ root = document.createElement("div"); root.id = "ai-root"; document.body.appendChild(root); }
  const msgs = state.aiMessages.map(m=>`<div class="ai-msg ${m.role}">${m.text}</div>`).join("");
  root.innerHTML = `
    <button class="ai-fab ${state.aiOpen?'hidden':''}" onclick="state.aiOpen=true;renderAI()">🤖 AI Assistant</button>
    <section class="ai-box ${state.aiOpen?'open':''}">
      <div class="ai-head"><div><b>AI Assistant & Insights</b><small>Hỗ trợ Giám đốc / Quản lý / Admin</small></div><button class="ai-close" onclick="state.aiOpen=false;renderAI()">×</button></div>
      <div class="ai-quick">
        ${["Hồ sơ tồn đọng","Công nợ học phí","Xe rủi ro","Lịch chờ xử lý","KPI giám đốc"].map(q=>`<button onclick="askAI('${q}')">${q}</button>`).join("")}
      </div>
      <div class="ai-messages" id="aiMessages">${msgs}</div>
      <form class="ai-input" id="aiForm"><input id="aiText" placeholder="Hỏi AI về hồ sơ, công nợ, xe..."><button>Gửi</button></form>
    </section>`;
  const form = document.getElementById("aiForm");
  if(form) form.onsubmit = e => { e.preventDefault(); const q=document.getElementById("aiText").value.trim(); if(q) askAI(q); };
  const box = document.getElementById("aiMessages"); if(box) box.scrollTop = box.scrollHeight;
}

async function askAI(question){
  state.aiMessages.push({role:"user", text:question});
  state.aiOpen = true;
  renderAI();
  try{
    const res = await api("/api/ai/insights",{method:"POST", body:JSON.stringify({question})});
    state.aiMessages.push({role:"bot", text:res.answer});
    await loadData();
  }catch(e){
    state.aiMessages.push({role:"bot", text:"AI demo chưa kết nối được API. Vui lòng kiểm tra Worker/D1/KV."});
  }
  renderAI();
}

function bind(){
  document.querySelectorAll(".navbtn,[data-page]").forEach(b=>b.onclick=()=>{state.page=b.dataset.page;app();});
  const loginForm = document.getElementById("loginForm");
  if(loginForm) loginForm.onsubmit = async e => {
    e.preventDefault();
    try{
      const res = await api("/api/login",{method:"POST", body:JSON.stringify({username:document.getElementById("u").value, password:document.getElementById("p").value})});
      state.user = res.user; state.logged = true; await loadData(); app(); toast("Đăng nhập thành công");
    }catch(err){ document.getElementById("err").textContent = err.message; document.getElementById("err").classList.remove("hidden"); }
  };
  const logout = document.getElementById("logout");
  if(logout) logout.onclick = async()=>{ await api("/api/logout",{method:"POST"}); state.logged=false; state.user=null; app(); };
  const reset = document.getElementById("resetDemo");
  if(reset) reset.onclick = async()=>{ await api("/api/reset-demo",{method:"POST"}); await loadData(); app(); toast("Đã reset demo"); };
  const qr = document.getElementById("quickRole");
  if(qr) qr.onchange = e => { state.page=e.target.value; app(); };

  const createBooking = document.getElementById("createBooking");
  if(createBooking) createBooking.onclick = async()=> {
    const [start,end] = document.getElementById("bookSlot").value.split("-");
    await api("/api/bookings",{method:"POST", body:JSON.stringify({student_id:1, booking_type:"DAT đường trường", booking_date:document.getElementById("bookDate").value, start_time:start, end_time:end, area:document.getElementById("bookArea").value})});
    await loadData(); app(); toast("Đã tạo booking. Giáo vụ sẽ thấy lịch chờ xử lý.");
  };

  document.querySelectorAll(".assignBooking").forEach(btn=>btn.onclick=async()=> {
    await api(`/api/bookings/${btn.dataset.id}/assign`,{method:"POST", body:JSON.stringify({teacher_id:1, vehicle_id:1})});
    await loadData(); app(); toast("Đã phân giáo viên và xe.");
  });

  document.querySelectorAll(".completeSession").forEach(btn=>btn.onclick=async()=> {
    await api(`/api/sessions/${btn.dataset.id}/complete`,{method:"POST", body:JSON.stringify({odo_start:document.getElementById("odoStart").value, odo_end:document.getElementById("odoEnd").value, km:document.getElementById("km").value, hours:document.getElementById("hours").value})});
    await loadData(); app(); toast("Đã hoàn thành buổi DAT. Tiến độ và ODO đã cập nhật.");
  });

  const createPayment = document.getElementById("createPayment");
  if(createPayment) createPayment.onclick = async()=> {
    await api("/api/payments",{method:"POST", body:JSON.stringify({student_id:1, amount:document.getElementById("payAmount").value, payment_type:"Học phí lần cuối"})});
    await loadData(); app(); toast("Đã lưu phiếu thu. Công nợ đã cập nhật.");
  };

  const createMaint = document.getElementById("createMaint");
  if(createMaint) createMaint.onclick = async()=> {
    await api("/api/maintenance",{method:"POST", body:JSON.stringify({vehicle_id:1, item:"Kiểm tra phanh", priority:"high", description:"Tạo từ demo"})});
    await loadData(); app(); toast("Đã tạo đề xuất bảo dưỡng.");
  };

  document.querySelectorAll(".approveMaint").forEach(btn=>btn.onclick=async()=> {
    await api(`/api/maintenance/${btn.dataset.id}/approve`,{method:"POST"});
    await loadData(); app(); toast("Đã duyệt bảo dưỡng.");
  });
}

(async function init(){
  try{
    const me = await api("/api/me");
    state.user = me.user;
    state.logged = true;
    await loadData();
  }catch(e){}
  app();
})();
