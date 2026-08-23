# RSVP 백엔드 셋업 가이드

청첩장 폼 제출을 **구글 시트에 자동 저장**하는 방법.
무료 / 가입 없음 / 5분 소요.

## 작동 구조

```
[하객 폰]  →  [Apps Script Web App]  →  [구글 시트 한 줄 추가]
```

---

## 1단계 — 구글 시트 만들기

1. https://sheets.new 접속 (또는 구글 드라이브에서 새 시트)
2. 이름을 `wedding-rsvp` 등으로 변경
3. 그대로 두기 (헤더는 코드가 자동으로 만들어 줌)

## 2단계 — Apps Script 코드 붙여넣기

1. 시트 상단 메뉴 → **확장 프로그램 (Extensions) → Apps Script**
2. 새 창에 기본 `Code.gs` 가 열림 — 안의 내용 모두 지우기
3. 이 프로젝트의 `scripts/wedding-rsvp.gs` 파일 내용을 **전부 복사 → 붙여넣기**
4. 저장 (Cmd + S 또는 디스크 아이콘)
5. 프로젝트 이름 묻는 창이 뜨면 `Wedding RSVP` 입력

## 3단계 — 웹 앱으로 배포

1. Apps Script 화면 우상단 **배포 (Deploy) → 새 배포 (New deployment)** 클릭
2. 톱니바퀴 아이콘 → **웹 앱 (Web app)** 선택
3. 다음 항목 설정:
   - **설명** (Description): `RSVP v1` (자유)
   - **다음 사용자로 실행** (Execute as): **나** (Me)
   - **액세스 권한** (Who has access): **모든 사용자** (Anyone)
4. **배포** 클릭
5. 권한 검토 창이 뜸:
   - 본인 구글 계정 클릭
   - "Google에서 확인하지 않은 앱" 경고 → **고급 (Advanced)** 클릭
   - **Wedding RSVP(으)로 이동(안전하지 않음)** 클릭
   - 시트 접근 권한 → **허용**
6. 완료 화면에 **Web App URL** 이 뜸:
   ```
   https://script.google.com/macros/s/AKfy....../exec
   ```
   이 URL을 복사 (5단계에서 사용)

## 4단계 — URL 동작 확인

복사한 URL을 브라우저 새 탭에 그대로 붙여넣기 → 화면에 다음이 보이면 정상:

```
OK — Wedding RSVP endpoint is live.
```

## 5단계 — 청첩장에 URL 연결

`src/config/content.js` 파일을 열고 맨 아래의 `RSVP_ENDPOINT` 값에 URL을 붙여넣기:

```js
export const RSVP_ENDPOINT = 'https://script.google.com/macros/s/AKfy....../exec'
```

저장하면 끝. dev 서버는 자동 리로드, 빌드해서 GH Pages 푸시하면 실배포 반영.

## 6단계 — 테스트

1. `npm run dev` 또는 배포된 페이지에서 RSVP 폼 작성 → 제출
2. 구글 시트로 돌아가 보면 **`rsvp` 라는 새 시트 탭이 생기고 한 줄이 추가**돼 있어야 함

| 제출시각 | 이름 | 구분 | 참석여부 | 인원 | 식사 | 메시지 | UA |
|---|---|---|---|---|---|---|---|
| 2026-04-30 14:23:01 | 김철수 | 신랑측 | 참석 | 2 | 함 | 축하해요! | Mozilla/... |

---

## 트러블슈팅

| 증상 | 원인 / 해결 |
|---|---|
| URL 열면 `OK` 대신 권한 오류 페이지 | 3단계의 "액세스 권한"이 **모든 사용자**로 안 돼있음. 배포 다시 하기 |
| 폼 제출했는데 시트에 줄 안 생김 | `RSVP_ENDPOINT` 값이 빈 문자열일 가능성. 5단계 확인. 또는 URL 끝에 `/exec` 누락 |
| 코드 수정 후 반영 안 됨 | Apps Script는 **새 배포** 매번 만들거나 기존 배포 → 편집 → "버전: 새 버전" 으로 갱신해야 반영됨 |
| 사용자 이메일은 못 받음? | 익명 제출이라 받지 않음. 메시지란에 연락처 받는 식이 일반적 |

## 보안 메모

- Apps Script Web App은 누구나 POST 보낼 수 있음. 스팸 우려 시 `doPost` 안에서 honeypot 필드 검사 또는 reCAPTCHA 추가 가능.
- 시트 자체는 본인 구글 계정 소유라 외부에서 읽지 못함. URL을 알면 **쓰기만** 가능.

## 추가 활용

- 시트에 **참석자 수 자동 합계**: 다른 시트에 `=SUMIF(rsvp!D:D, "참석", rsvp!E:E)` 등 수식 추가
- **알림 받기**: Apps Script `doPost` 내부에서 `MailApp.sendEmail(...)` 추가 → 제출 즉시 본인 이메일로 알림
