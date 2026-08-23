#!/usr/bin/env node
/* ===============================================================
   갤러리 매니페스트 생성기
   ---------------------------------------------------------------
   gallery/ 안의 폴더(1.xxx, 2.xxx, 3.spain …)를 스캔해서
   "폴더 번호 순서"대로 사진 목록을 만들어 ../gallery-data.js 에 씁니다.

   사용법:
     node scripts/build-gallery-manifest.mjs

   새 폴더(예: gallery/1.한강, gallery/2.제주)를 추가한 뒤
   위 명령을 한 번만 실행하면 사이트에 자동 반영됩니다.
=============================================================== */

import { readdirSync, statSync, writeFileSync } from "node:fs";
import { join, dirname, relative } from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT = join(__dirname, "..");
const GALLERY_DIR = join(ROOT, "gallery");
const OUTPUT = join(ROOT, "gallery-data.js");

const IMAGE_RE = /\.(jpe?g|png|webp|gif|avif)$/i;

// 숨김/시스템 파일 제외
const isHidden = (name) => name.startsWith(".");

// 폴더 앞의 숫자 추출 ("3.spain" → 3, "10.busan" → 10). 없으면 Infinity.
function leadingNumber(name) {
  const m = name.match(/^(\d+)/);
  return m ? parseInt(m[1], 10) : Number.POSITIVE_INFINITY;
}

// 파일명 자연 정렬 (고딕_1 < 고딕_2 < … < 고딕_10)
function naturalCompare(a, b) {
  return a.localeCompare(b, "ko", { numeric: true, sensitivity: "base" });
}

function listDirs(dir) {
  return readdirSync(dir)
    .filter((name) => !isHidden(name) && statSync(join(dir, name)).isDirectory())
    .sort((a, b) => {
      const na = leadingNumber(a);
      const nb = leadingNumber(b);
      if (na !== nb) return na - nb;        // 1) 폴더 번호 우선
      return naturalCompare(a, b);          // 2) 같으면 이름순
    });
}

function listImages(dir) {
  return readdirSync(dir)
    .filter((name) => !isHidden(name) && IMAGE_RE.test(name))
    .filter((name) => statSync(join(dir, name)).isFile())
    .sort(naturalCompare);
}

function build() {
  let folders;
  try {
    folders = listDirs(GALLERY_DIR);
  } catch (err) {
    console.error(`[gallery] gallery/ 폴더를 찾을 수 없습니다: ${GALLERY_DIR}`);
    process.exit(1);
  }

  const groups = [];
  let total = 0;

  for (const folder of folders) {
    const abs = join(GALLERY_DIR, folder);
    const images = listImages(abs).map((file) =>
      // 항상 슬래시(/) 경로로 + NFC 정규화
      // (macOS는 파일명을 NFD로 저장하지만 git/GitHub는 NFC로 올리므로,
      //  NFC로 맞춰야 GitHub Pages에서 404 안 남)
      relative(ROOT, join(abs, file)).split("\\").join("/").normalize("NFC")
    );
    if (images.length === 0) continue;
    // 폴더명에서 번호/구분점 떼어낸 라벨 ("3.spain" → "spain")
    const label = (folder.replace(/^\d+[.\-_\s]*/, "") || folder).normalize("NFC");
    groups.push({ folder, label, images });
    total += images.length;
    console.log(`  • ${folder} — ${images.length}장`);
  }

  const payload = { generatedAt: new Date().toISOString(), total, groups };

  const banner =
    "/* 자동 생성 파일 — 직접 수정하지 마세요.\n" +
    "   갱신: node scripts/build-gallery-manifest.mjs */\n";
  const body = `window.GALLERY = ${JSON.stringify(payload, null, 2)};\n`;

  writeFileSync(OUTPUT, banner + body, "utf8");
  console.log(`\n[gallery] 폴더 ${groups.length}개 · 사진 ${total}장 → ${relative(ROOT, OUTPUT)}`);
}

build();
