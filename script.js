/* ===============================================================
   열호 · 은선 청첩장 — 인터랙션 / 모션 / RSVP
=============================================================== */

// ====== 설정 ======
const EVENT_DATE = new Date("2027-02-21T11:30:00+09:00");
const EVENT_TITLE = "열호와 은선이의 결혼식";
const EVENT_ADDRESS = "서울시 용산구 이태원로 29 로얄파크컨벤션";

// 카카오톡 공유 (JavaScript SDK) — JS 키는 웹 공개용이라 노출돼도 안전 (등록 도메인에서만 동작)
const KAKAO_JS_KEY = "de5a77b6b6ea47937cf901c1658a8979";
const SITE_URL = "https://yeolho-eunseon-wedding.github.io";
// 카카오는 이미지를 URL 단위로 캐시한다. 사진을 교체했는데 옛 썸네일이 계속 뜨면
// 아래 IMG_VER 숫자를 올려서 새 URL로 만들면 캐시가 갱신된다. (index.html og:image 도 같이)
const IMG_VER = "2";
const KAKAO_SHARE_IMAGE = `${SITE_URL}/assets/kakao-share.jpg?v=${IMG_VER}`;

// RSVP — Google Apps Script Web App (백그라운드 자동 전송, 시트에 자동 저장)
// const RSVP_ENDPOINT = "https://script.google.com/macros/s/AKfycbyi9MvhOI0PwtURn5ntxeOPvstG6gXSOyT5swR3mAVY_5mvsCdroQIMRcmZaZZSBjsn/exec";

// 폴백 — Apps Script 호출이 실패할 때 메일 앱으로 안내
const RSVP_EMAIL = "dufgh1009@naver.com";

// 캘린더
const CALENDAR_YEAR = 2027;
const CALENDAR_MONTH = 2;
const WEDDING_DAY = 21;
const MONTH_DAYS = 28;
const START_WEEKDAY = 1; // 2/1 = 월요일

// ====== 캘린더 렌더 ======
function renderCalendar() {
  const root = document.getElementById("calendar-days");
  if (!root) return;
  let html = "";
  for (let i = 0; i < START_WEEKDAY; i++) html += "<span></span>";
  for (let d = 1; d <= MONTH_DAYS; d++) {
    const weekday = (START_WEEKDAY + d - 1) % 7;
    const isWeekend = weekday === 0 || weekday === 6;
    if (d === WEDDING_DAY) {
      html += `<span class="wedding-day">${d}</span>`;
    } else if (isWeekend) {
      html += `<span class="weekend-day">${d}</span>`;
    } else {
      html += `<span>${d}</span>`;
    }
  }
  root.innerHTML = html;
}

// ====== 스크롤 진행 바 ======
function initScrollProgress() {
  const bar = document.getElementById("scroll-progress");
  if (!bar) return;
  let raf = 0;
  const update = () => {
    raf = 0;
    const top = window.scrollY;
    const max = document.documentElement.scrollHeight - window.innerHeight;
    const p = max > 0 ? Math.min(1, Math.max(0, top / max)) : 0;
    bar.style.transform = `scaleX(${p})`;
  };
  const onScroll = () => { if (!raf) raf = requestAnimationFrame(update); };
  update();
  window.addEventListener("scroll", onScroll, { passive: true });
  window.addEventListener("resize", onScroll);
}

// ====== Reveal ======
function initReveal() {
  const els = document.querySelectorAll(".reveal");
  if (!els.length) return;
  const obs = new IntersectionObserver(
    (entries) => {
      entries.forEach((e) => {
        if (e.isIntersecting) e.target.classList.add("in-view");
        else e.target.classList.remove("in-view");
      });
    },
    { threshold: 0.15, rootMargin: "0px 0px -8% 0px" }
  );
  els.forEach((el) => obs.observe(el));
}

// ====== HERO 사진 패럴랙스 ======
function initParallax() {
  const el = document.getElementById("hero-parallax");
  if (!el) return;
  const strength = 0.12;
  let raf = 0;
  const update = () => {
    raf = 0;
    const rect = el.getBoundingClientRect();
    const center = rect.top + rect.height / 2;
    const distance = center - window.innerHeight / 2;
    el.style.transform = `translateY(${-distance * strength}px)`;
  };
  const onScroll = () => { if (!raf) raf = requestAnimationFrame(update); };
  update();
  window.addEventListener("scroll", onScroll, { passive: true });
  window.addEventListener("resize", onScroll);
}

// ====== 섹션 단위 스와이프 전환 ======
// 지정한 섹션 구간에서는 스크롤/스와이프 한 번에 다음(이전) 섹션 맨 위까지
// 부드럽게 자동으로 완주시킨다. 이 구간을 벗어나면 평소처럼 자연 스크롤.
function initSectionPaging(sectionIds) {
  const sections = sectionIds
    .map((id) => document.getElementById(id))
    .filter(Boolean);
  if (sections.length < 2) return;

  const reduceMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  if (reduceMotion) return;

  const DURATION = 10;
  const LOCK_GAP = 10; // 착지 직후 추가 입력 무시 시간
  const WHEEL_THRESHOLD = 4;
  const TOUCH_THRESHOLD = 28;

  let isAnimating = false;
  let lockedUntil = 0;
  let touchStartY = 0;
  let touchActive = false;

  const easeInOutCubic = (t) => (t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2);

  const zoneTop = () => sections[0].offsetTop;
  const zoneBottom = () => {
    const last = sections[sections.length - 1];
    return last.offsetTop + last.offsetHeight;
  };
  const inZone = () => window.scrollY >= zoneTop() - 1 && window.scrollY < zoneBottom() - 1;

  const currentIndex = () => {
    const y = window.scrollY;
    let idx = 0;
    sections.forEach((el, i) => {
      if (y >= el.offsetTop - Math.min(80, el.offsetHeight * 0.4)) idx = i;
    });
    return idx;
  };

  function animateScrollTo(targetY) {
    isAnimating = true;
    const startY = window.scrollY;
    const distance = targetY - startY;
    const startTime = performance.now();

    function step(now) {
      const elapsed = now - startTime;
      const t = Math.min(1, elapsed / DURATION);
      window.scrollTo(0, startY + distance * easeInOutCubic(t));
      if (t < 1) {
        requestAnimationFrame(step);
      } else {
        isAnimating = false;
        lockedUntil = performance.now() + LOCK_GAP;
      }
    }
    requestAnimationFrame(step);
  }

  function goToStep(direction) {
    if (isAnimating || performance.now() < lockedUntil) return;
    const idx = currentIndex();
    const targetIdx = idx + direction;
    if (targetIdx < 0 || targetIdx >= sections.length) return;
    animateScrollTo(sections[targetIdx].offsetTop);
  }

  window.addEventListener(
    "wheel",
    (e) => {
      if (!inZone() && !isAnimating) return;
      if (Math.abs(e.deltaY) < WHEEL_THRESHOLD) return;
      e.preventDefault();
      goToStep(e.deltaY > 0 ? 1 : -1);
    },
    { passive: false }
  );

  window.addEventListener(
    "touchstart",
    (e) => {
      if (!inZone()) { touchActive = false; return; }
      touchActive = true;
      touchStartY = e.touches[0].clientY;
    },
    { passive: true }
  );

  window.addEventListener(
    "touchmove",
    (e) => {
      if (!touchActive) return;
      e.preventDefault();
    },
    { passive: false }
  );

  window.addEventListener(
    "touchend",
    (e) => {
      if (!touchActive) return;
      touchActive = false;
      const deltaY = touchStartY - e.changedTouches[0].clientY;
      if (Math.abs(deltaY) < TOUCH_THRESHOLD) return;
      goToStep(deltaY > 0 ? 1 : -1);
    },
    { passive: true }
  );
}

// ====== 네이버 핀 클릭 바운스 ======
function initPinBounce() {
  const trigger = document.getElementById("map-pin");
  const pin = document.getElementById("naver-pin");
  if (!trigger || !pin) return;
  trigger.addEventListener("click", () => {
    if (pin.classList.contains("naver-pin-bounce")) return;
    pin.classList.add("naver-pin-bounce");
    setTimeout(() => pin.classList.remove("naver-pin-bounce"), 700);
  });
}

// ====== Toast ======
const toastEl = () => document.getElementById("toast-final") || document.getElementById("toast");
function showToast(message) {
  const el = toastEl();
  if (!el) return;
  el.textContent = message;
  clearTimeout(showToast.timer);
  showToast.timer = setTimeout(() => { el.textContent = ""; }, 2600);
}

// ====== Clipboard ======
async function copyText(text, successMessage) {
  try {
    await navigator.clipboard.writeText(text);
    showToast(successMessage);
  } catch {
    showToast(text);
  }
}

function initAccountCopy() {
  document.querySelectorAll("[data-copy]").forEach((btn) => {
    btn.addEventListener("click", (e) => {
      e.preventDefault();
      const v = btn.dataset.copy;
      if (!v) {
        showToast("계좌 추후 안내드립니다.");
        return;
      }
      copyText(v, "계좌번호를 복사했어요.");
    });
  });
}

// ====== ICS 캘린더 다운로드 ======
function calendarDate(d) {
  return d.toISOString().replace(/[-:]/g, "").replace(/\.\d{3}Z$/, "Z");
}
function initCalendarDownload() {
  const btn = document.getElementById("calendar-button");
  if (!btn) return;
  btn.addEventListener("click", () => {
    const endDate = new Date(EVENT_DATE.getTime() + 90 * 60000);
    const ics = [
      "BEGIN:VCALENDAR", "VERSION:2.0",
      "PRODID:-//Yeolho Eunsun Wedding//Invitation//KO",
      "BEGIN:VEVENT",
      `UID:${Date.now()}@yeoro.github.io`,
      `DTSTAMP:${calendarDate(new Date())}`,
      `DTSTART:${calendarDate(EVENT_DATE)}`,
      `DTEND:${calendarDate(endDate)}`,
      `SUMMARY:${EVENT_TITLE}`,
      `LOCATION:${EVENT_ADDRESS}`,
      "END:VEVENT", "END:VCALENDAR",
    ].join("\r\n");
    const blob = new Blob([ics], { type: "text/calendar;charset=utf-8" });
    const link = document.createElement("a");
    link.href = URL.createObjectURL(blob);
    link.download = "yeolho-eunsun-wedding.ics";
    link.click();
    URL.revokeObjectURL(link.href);
    showToast("캘린더 파일을 만들었어요.");
  });
}

// ====== 공유 ======
function initShare() {
  // 맨 아래 '청첩장 공유하기' + 우측 하단 플로팅 버튼 — 동일 동작
  const btns = [
    document.getElementById("share-button"),
    document.getElementById("share-fab"),
  ].filter(Boolean);
  if (!btns.length) return;

  // 카카오 SDK 초기화 (최초 1회) — SDK 로드 실패해도 아래 폴백이 동작
  if (window.Kakao && !window.Kakao.isInitialized()) {
    try { window.Kakao.init(KAKAO_JS_KEY); } catch (_) {}
  }

  const onShare = async () => {
    // ① 카카오톡 공유 — 피드 템플릿 (사진 + 제목 + 날짜/장소 + 버튼)
    if (window.Kakao && window.Kakao.isInitialized() && window.Kakao.Share) {
      const title = "열호 ♥ 은선의 결혼식에 초대합니다.";
      const description = "2027.02.21 (일) 11:30\n로얄파크컨벤션";
      const btnLabel = "모바일 청첩장 보기";
      const link = { mobileWebUrl: SITE_URL, webUrl: SITE_URL };
      try {
        window.Kakao.Share.sendDefault({
          objectType: "feed",
          content: { title, description, imageUrl: KAKAO_SHARE_IMAGE, link },
          buttons: [{ title: btnLabel, link }],
        });
        return;
      } catch (err) {
        console.error("[Kakao share error]", err);   // 실패 시 아래 폴백으로
      }
    }

    // ② 폴백 — 브라우저 기본 공유 / 링크 복사 (카카오 미로드·PC 환경 등)
    const data = {
      title: EVENT_TITLE,
      text: "2027년 2월 21일 일요일 오전 11시 30분",
      url: window.location.href,
    };
    if (navigator.share) {
      try { await navigator.share(data); return; } catch {}
    }
    copyText(window.location.href, "초대장 링크를 복사했어요.");
  };

  btns.forEach((btn) => btn.addEventListener("click", onShare));
}

// ====== RSVP 폼 ======
const _SIDE_LABEL = { groom: "신랑측", bride: "신부측" };
const _ATTEND_LABEL = { yes: "참석", no: "불참" };
const _MEAL_LABEL = { yes: "식사 함", no: "식사 안 함" };
const _SHUTTLE_LABEL = {
  none: "이용 안 함",
  gangnam: "강남역",
  dongtan: "동탄역",
  dongdaegu: "동대구역",
  seodaegu: "서대구버스터미널",
};

function buildRsvpMailto(p) {
  const subject = `[청첩장 RSVP] ${p.name || "익명"}`;
  const lines = [
    "열호 · 은선 결혼식 — 참석 의사 전달드립니다.",
    "",
    `이름: ${p.name}`,
    `전화번호: ${p.phone}`,
    `구분: ${_SIDE_LABEL[p.side] || p.side}`,
    `참석 여부: ${_ATTEND_LABEL[p.attend] || p.attend}`,
    `인원 (본인 포함): ${p.count}`,
    `식사: ${_MEAL_LABEL[p.meal] || p.meal}`,
    `셔틀: ${_SHUTTLE_LABEL[p.shuttle] || p.shuttle}`,
    `메시지: ${p.note || "(없음)"}`,
    "",
    `제출시각: ${p.submittedAt}`,
  ];
  const body = lines.join("\n");
  return `mailto:${RSVP_EMAIL}?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(body)}`;
}

// 전화번호 정규화 — 자유 입력(010-0000-0000 또는 01000000000) → "010-XXXX-XXXX" 형식 통일
// 매치 실패 시 null 반환 (호출 측에서 사용자에게 안내).
function normalizePhone(raw) {
  const digits = (raw || "").replace(/\D/g, "");
  // 11자리 휴대폰 (010/011/016/017/018/019)
  if (/^01[016789]\d{8}$/.test(digits)) {
    return `${digits.slice(0, 3)}-${digits.slice(3, 7)}-${digits.slice(7)}`;
  }
  // 10자리 휴대폰 (예전 011-XXX-XXXX 등)
  if (/^01[16789]\d{7}$/.test(digits)) {
    return `${digits.slice(0, 3)}-${digits.slice(3, 6)}-${digits.slice(6)}`;
  }
  return null;
}

// localStorage 키 — 입력 중 자동 저장 (단일 디바이스만 유효, 제출 시 자동 클리어)
const RSVP_DRAFT_KEY = "rsvp-draft-v1";

function loadRsvpDraft(form) {
  try {
    const saved = JSON.parse(localStorage.getItem(RSVP_DRAFT_KEY) || "{}");
    Object.entries(saved).forEach(([name, value]) => {
      const el = form.elements[name];
      if (el && typeof value !== "undefined") el.value = value;
    });
  } catch (_) {}
}
function saveRsvpDraft(form) {
  const fd = new FormData(form);
  const obj = {};
  fd.forEach((v, k) => { obj[k] = v; });
  try { localStorage.setItem(RSVP_DRAFT_KEY, JSON.stringify(obj)); } catch (_) {}
}
function clearRsvpDraft() {
  try { localStorage.removeItem(RSVP_DRAFT_KEY); } catch (_) {}
}

function initRsvp() {
  const form = document.getElementById("rsvp-form");
  const status = document.getElementById("rsvp-status");
  const submit = document.getElementById("rsvp-submit");
  if (!form) return;

  // 페이지 진입 시 — 이전 입력 복원
  loadRsvpDraft(form);

  // 입력 변경마다 — 자동 저장 (디바운스 200ms)
  let saveTimer = 0;
  form.addEventListener("input", () => {
    clearTimeout(saveTimer);
    saveTimer = setTimeout(() => saveRsvpDraft(form), 200);
  });
  form.addEventListener("change", () => saveRsvpDraft(form));

  form.addEventListener("submit", async (e) => {
    e.preventDefault();
    if (submit.disabled) return;

    const phoneErrText = "전화번호 형식을 확인해주세요. 예) 010-1234-5678";

    // ▶ 전화번호 정규화 + 검증
    const phoneInput = form.elements["phone"];
    const phoneNormalized = normalizePhone(phoneInput.value);
    if (!phoneNormalized) {
      status.textContent = phoneErrText;
      status.style.color = "#ffd6d6";
      phoneInput.focus();
      phoneInput.setAttribute("aria-invalid", "true");
      return;
    }
    // 사용자 입력 칸에도 정규화된 값 반영 (저장과 일치)
    phoneInput.value = phoneNormalized;
    phoneInput.removeAttribute("aria-invalid");
    status.style.color = "";

    const fd = new FormData(form);
    const payload = {
      name: fd.get("name") || "",
      phone: phoneNormalized,                  // 항상 "010-XXXX-XXXX" 형식
      side: fd.get("side") || "",
      attend: fd.get("attend") || "",
      count: Number(fd.get("count")) || 1,
      meal: fd.get("meal") || "",
      shuttle: fd.get("shuttle") || "none",
      note: fd.get("note") || "",
      submittedAt: new Date().toISOString(),  // ISO 8601 — Apps Script가 정확히 파싱
      ua: navigator.userAgent,
    };

    const sendingText = "전송 중…";
    const successText = "✓ 전달되었습니다";
    const thanksText = "소중한 마음 감사합니다.";
    const errorText = "전송 오류 — 메일 앱으로 전환합니다";

    submit.disabled = true;
    submit.textContent = sendingText;
    status.textContent = "";

    try {
      // Apps Script 로 백그라운드 자동 전송 (no-cors 모드는 응답 못 읽지만 전송은 됨)
      await fetch(RSVP_ENDPOINT, {
        method: "POST",
        mode: "no-cors",
        headers: { "Content-Type": "text/plain;charset=utf-8" },
        body: JSON.stringify(payload),
      });
      clearRsvpDraft();   // 제출 성공 → 다음 사람한테 이전 데이터 안 보이게
      submit.textContent = successText;
      status.textContent = thanksText;
    } catch (err) {
      // 네트워크 실패 시 mailto: 폴백
      console.error("[RSVP error]", err);
      status.textContent = errorText;
      setTimeout(() => {
        window.location.href = buildRsvpMailto(payload);
      }, 600);
    }
  });
}

// ====== 갤러리 (gallery-data.js 의 window.GALLERY 기준) ======
// 폴더 순서대로 평탄화된 이미지 경로 목록 — 라이트박스 좌우 넘김에 사용
let _galleryImages = [];

// 경로의 각 구간을 URL 인코딩 (한글/공백 파일명 안전 처리)
function encodePath(path) {
  return path.split("/").map((seg) => encodeURIComponent(seg)).join("/");
}

const GALLERY_PER_PAGE = 4;   // 한 화면에 보일 사진 수
let _galPage = 0;             // 현재 페이지
let _galPageCount = 0;        // 전체 페이지 수

function renderGallery() {
  const carousel = document.getElementById("gallery-carousel");
  const track = document.getElementById("gallery-track");
  const dotsWrap = document.getElementById("gallery-dots");
  const note = document.getElementById("gallery-note");
  if (!carousel || !track) return;

  const data = window.GALLERY;
  const groups = (data && Array.isArray(data.groups)) ? data.groups : [];

  // 폴더 순서대로 모든 이미지를 하나의 배열로 평탄화
  _galleryImages = [];
  groups.forEach((g) => {
    (g.images || []).forEach((src) => {
      _galleryImages.push({ src, label: g.label || "" });
    });
  });

  if (_galleryImages.length === 0) {
    // 사진이 아직 없으면 안내 문구 유지, 캐러셀 숨김
    return;
  }

  // 4장씩 페이지로 분할
  _galPageCount = Math.ceil(_galleryImages.length / GALLERY_PER_PAGE);
  let pagesHtml = "";
  for (let p = 0; p < _galPageCount; p++) {
    const start = p * GALLERY_PER_PAGE;
    const slice = _galleryImages.slice(start, start + GALLERY_PER_PAGE);
    const cells = slice
      .map((item, j) => {
        const idx = start + j;
        const url = encodePath(item.src);
        const alt = item.label ? `${item.label} 사진 ${idx + 1}` : `사진 ${idx + 1}`;
        return (
          `<button type="button" class="gallery-cell gallery-cell--photo" data-index="${idx}" aria-label="${alt} 크게 보기">` +
          `<img src="${url}" alt="${alt}" loading="lazy" decoding="async" />` +
          `</button>`
        );
      })
      .join("");
    pagesHtml += `<div class="gallery-page">${cells}</div>`;
  }
  track.innerHTML = pagesHtml;

  // 점 인디케이터
  if (dotsWrap) {
    dotsWrap.innerHTML = Array.from({ length: _galPageCount })
      .map((_, p) => `<button type="button" class="gallery-dot" data-page="${p}" aria-label="${p + 1}페이지"></button>`)
      .join("");
  }

  carousel.hidden = false;
  if (note) note.hidden = true;

  // 사진 클릭 → 라이트박스 (전체 목록 기준)
  track.addEventListener("click", (e) => {
    const cell = e.target.closest(".gallery-cell--photo");
    if (!cell) return;
    openLightbox(Number(cell.dataset.index) || 0);
  });

  // 좌우 버튼
  document.getElementById("gallery-prev")?.addEventListener("click", () => moveGallery(-1));
  document.getElementById("gallery-next")?.addEventListener("click", () => moveGallery(1));

  // 점 클릭 → 해당 페이지로
  dotsWrap?.addEventListener("click", (e) => {
    const dot = e.target.closest(".gallery-dot");
    if (!dot) return;
    goGallery(Number(dot.dataset.page) || 0);
  });

  // 모바일 스와이프
  const viewport = document.getElementById("gallery-viewport");
  if (viewport) {
    let startX = 0, startY = 0, swiping = false;
    viewport.addEventListener("touchstart", (e) => {
      startX = e.touches[0].clientX; startY = e.touches[0].clientY; swiping = true;
    }, { passive: true });
    viewport.addEventListener("touchend", (e) => {
      if (!swiping) return;
      swiping = false;
      const dx = e.changedTouches[0].clientX - startX;
      const dy = e.changedTouches[0].clientY - startY;
      // 가로 스와이프가 세로보다 클 때만 페이지 이동
      if (Math.abs(dx) > 45 && Math.abs(dx) > Math.abs(dy)) moveGallery(dx < 0 ? 1 : -1);
    }, { passive: true });
  }

  goGallery(0);
}

function goGallery(page) {
  const track = document.getElementById("gallery-track");
  if (!track || _galPageCount === 0) return;
  _galPage = Math.max(0, Math.min(page, _galPageCount - 1));
  track.style.transform = `translateX(-${_galPage * 100}%)`;

  // 화살표 활성/비활성
  const prev = document.getElementById("gallery-prev");
  const next = document.getElementById("gallery-next");
  if (prev) prev.disabled = _galPage === 0;
  if (next) next.disabled = _galPage === _galPageCount - 1;

  // 점 표시 갱신
  document.querySelectorAll(".gallery-dot").forEach((d, i) => {
    d.classList.toggle("is-active", i === _galPage);
  });
}

function moveGallery(delta) {
  goGallery(_galPage + delta);
}

// ====== 라이트박스 ======
let _lbIndex = 0;
function openLightbox(index) {
  const box = document.getElementById("lightbox");
  if (!box || !_galleryImages.length) return;
  _lbIndex = (index + _galleryImages.length) % _galleryImages.length;
  updateLightbox();
  box.classList.add("is-open");
  box.setAttribute("aria-hidden", "false");
  document.body.classList.add("no-scroll");
}
function closeLightbox() {
  const box = document.getElementById("lightbox");
  if (!box) return;
  box.classList.remove("is-open");
  box.setAttribute("aria-hidden", "true");
  document.body.classList.remove("no-scroll");
}
function moveLightbox(delta) {
  if (!_galleryImages.length) return;
  _lbIndex = (_lbIndex + delta + _galleryImages.length) % _galleryImages.length;
  updateLightbox();
}
function updateLightbox() {
  const img = document.getElementById("lightbox-img");
  const count = document.getElementById("lightbox-count");
  const item = _galleryImages[_lbIndex];
  if (!img || !item) return;
  img.src = encodePath(item.src);
  img.alt = item.label ? `${item.label} 사진 ${_lbIndex + 1}` : `사진 ${_lbIndex + 1}`;
  if (count) count.textContent = `${_lbIndex + 1} / ${_galleryImages.length}`;
}
function initLightbox() {
  const box = document.getElementById("lightbox");
  if (!box) return;
  document.getElementById("lightbox-close")?.addEventListener("click", closeLightbox);
  document.getElementById("lightbox-prev")?.addEventListener("click", () => moveLightbox(-1));
  document.getElementById("lightbox-next")?.addEventListener("click", () => moveLightbox(1));

  // 배경(이미지 바깥) 클릭 시 닫기
  box.addEventListener("click", (e) => {
    if (e.target === box) closeLightbox();
  });

  // 키보드 — Esc 닫기, ← → 이동
  document.addEventListener("keydown", (e) => {
    if (!box.classList.contains("is-open")) return;
    if (e.key === "Escape") closeLightbox();
    else if (e.key === "ArrowLeft") moveLightbox(-1);
    else if (e.key === "ArrowRight") moveLightbox(1);
  });

  // 모바일 스와이프
  let startX = 0;
  box.addEventListener("touchstart", (e) => { startX = e.touches[0].clientX; }, { passive: true });
  box.addEventListener("touchend", (e) => {
    const dx = e.changedTouches[0].clientX - startX;
    if (Math.abs(dx) > 50) moveLightbox(dx < 0 ? 1 : -1);
  }, { passive: true });
}

// ====== 초기화 ======
document.addEventListener("DOMContentLoaded", () => {
  renderCalendar();

  initScrollProgress();
  initReveal();
  initParallax();
  initSectionPaging(["hero", "greeting", "when"]);
  initPinBounce();

  renderGallery();
  initLightbox();

  initAccountCopy();
  initShare();
  initRsvp();
});
