/**
 * Wedding RSVP — Google Apps Script Web App
 *
 * 이 코드를 구글 시트의 Apps Script 에디터에 그대로 붙여넣고
 * "배포 → 새 배포 → 웹 앱" 으로 게시하면 됩니다.
 * 셋업 절차는 RSVP_SETUP.md 참고.
 *
 * 동작:
 *   - POST { name, phone, side, attend, count, meal, shuttle, note, submittedAt, ua }
 *   - 시트(rsvp)에 자동으로 한 행 추가
 *   - 시트가 없으면 자동 생성, 헤더가 없으면 자동 입력
 *   - 응답: { ok: true } 또는 { ok: false, error }
 */

const SHEET_NAME = 'rsvp'

function doPost(e) {
  try {
    const raw = (e && e.postData && e.postData.contents) || '{}'
    const data = JSON.parse(raw)

    const ss = SpreadsheetApp.getActiveSpreadsheet()
    let sheet = ss.getSheetByName(SHEET_NAME)
    if (!sheet) sheet = ss.insertSheet(SHEET_NAME)

    // 셔틀 코드 → 한글 매핑
    const SHUTTLE_LABEL = {
      none: '이용 안 함',
      gangnam: '강남역',
      dongtan: '동탄역',
      dongdaegu: '동대구역',
      seodaegu: '서대구버스터미널',
    }

    // 제출시각 — ISO 형식 받아 Date로 변환, 실패 시 서버 시각 폴백
    let submittedAt = new Date()
    if (data.submittedAt) {
      const parsed = new Date(data.submittedAt)
      if (!isNaN(parsed.getTime())) submittedAt = parsed
    }

    // 첫 행이 비어있으면 헤더 자동 생성
    if (sheet.getLastRow() === 0) {
      sheet.appendRow([
        '제출시각',
        '이름',
        '전화번호',
        '구분',
        '참석여부',
        '인원',
        '식사',
        '셔틀',
        '메시지',
        'User-Agent',
      ])
      sheet.getRange(1, 1, 1, 10).setFontWeight('bold')
      sheet.setFrozenRows(1)
    }

    sheet.appendRow([
      submittedAt,
      data.name || '',
      data.phone || '',
      data.side === 'groom' ? '신랑측' : data.side === 'bride' ? '신부측' : (data.side || ''),
      data.attend === 'yes' ? '참석' : data.attend === 'no' ? '불참' : (data.attend || ''),
      Number(data.count) || 0,
      data.meal === 'yes' ? '함' : data.meal === 'no' ? '안 함' : (data.meal || ''),
      SHUTTLE_LABEL[data.shuttle] || (data.shuttle || ''),
      data.note || '',
      data.ua || '',
    ])

    return ContentService
      .createTextOutput(JSON.stringify({ ok: true }))
      .setMimeType(ContentService.MimeType.JSON)
  } catch (err) {
    return ContentService
      .createTextOutput(JSON.stringify({ ok: false, error: String(err) }))
      .setMimeType(ContentService.MimeType.JSON)
  }
}

// 헬스체크 — 브라우저로 URL 열면 OK 라는 글자가 보입니다.
function doGet() {
  return ContentService
    .createTextOutput('OK — Wedding RSVP endpoint is live.')
    .setMimeType(ContentService.MimeType.TEXT)
}
