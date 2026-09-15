#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""P-WORLDから機種情報を取得して machine-data.json を更新するPC用ツール。

Ver8.16では、ブラウザ(PWA)自身がP-WORLDを直接スクレイピングするのではなく、
Windows PC側でこのスクリプトを実行してローカルのmachine-data.jsonを生成します。
そのため、PWA側のCORS制約を回避できます。

※P-WORLDの掲載ページの構造変更やアクセス制限等により取得できない場合があります。
"""
from __future__ import annotations

import argparse
import html
import json
import re
import shutil
import sys
import time
import unicodedata
from datetime import datetime, timezone, timedelta
from html.parser import HTMLParser
from pathlib import Path
from urllib.parse import urlencode, urljoin
from urllib.request import Request, urlopen

BASE = "https://www.p-world.co.jp/_machine/t_machine.cgi"
MACHINE_BASE = "https://www.p-world.co.jp"
USER_AGENT = "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 Chrome/153 Safari/537.36"
JST = timezone(timedelta(hours=9))

class RowParser(HTMLParser):
    """P-WORLD一覧の行からセル文字列とリンクURLを取得する。"""
    def __init__(self):
        super().__init__(convert_charrefs=True)
        self.rows = []
        self.row = None
        self.row_links = None
        self.cell = None
        self.cell_href = ""
        self.anchor = False
        self.anchor_href = ""
        self.anchor_text = []

    def handle_starttag(self, tag, attrs):
        tag = tag.lower()
        attrs = dict(attrs)
        if tag == "tr":
            self.row = []
            self.row_links = []
        elif self.row is not None and tag == "td":
            self.cell = []
            self.cell_href = ""
        elif self.row is not None and tag == "a":
            self.anchor = True
            self.anchor_href = attrs.get("href", "")
            if not self.cell_href:
                self.cell_href = self.anchor_href
            self.anchor_text = []

    def handle_data(self, data):
        if self.row is not None and self.cell is not None:
            self.cell.append(data)
        if self.anchor:
            self.anchor_text.append(data)

    def handle_endtag(self, tag):
        tag = tag.lower()
        if tag == "a" and self.anchor:
            self.anchor = False
            self.anchor_href = ""
            self.anchor_text = []
        elif tag == "td" and self.row is not None and self.cell is not None:
            self.row.append(norm(" ".join(self.cell)))
            self.row_links.append(self.cell_href)
            self.cell = None
            self.cell_href = ""
        elif tag == "tr" and self.row is not None:
            if self.row:
                self.rows.append((self.row, self.row_links or [""] * len(self.row)))
            self.row = None
            self.row_links = None

class LinkParser(HTMLParser):
    def __init__(self):
        super().__init__(convert_charrefs=True)
        self.links=[]
        self.in_a=False
        self.href=""
        self.buf=[]
    def handle_starttag(self, tag, attrs):
        if tag.lower()=="a":
            self.in_a=True
            self.href=dict(attrs).get("href","")
            self.buf=[]
    def handle_data(self,data):
        if self.in_a:self.buf.append(data)
    def handle_endtag(self,tag):
        if tag.lower()=="a" and self.in_a:
            self.links.append((self.href,norm("".join(self.buf))))
            self.in_a=False


def norm(s:str)->str:
    s=html.unescape(s)
    s=unicodedata.normalize("NFKC",s)
    s=s.replace("\u3000"," ")
    s=re.sub(r"\s+"," ",s).strip()
    return s


def fetch(url:str, timeout=25)->str:
    """P-WORLDは環境によってShift_JIS/CP932系で返ることがあるため、
    Content-Type/meta charsetを見てから日本語をデコードする。"""
    req=Request(url,headers={
        "User-Agent":USER_AGENT,
        "Accept":"text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8",
        "Accept-Language":"ja-JP,ja;q=0.9,en-US;q=0.8,en;q=0.7",
        "Referer":"https://www.p-world.co.jp/",
        "Cache-Control":"no-cache",
    })
    with urlopen(req,timeout=timeout) as r:
        raw=r.read()
        header_charset=r.headers.get_content_charset()
        content_type=r.headers.get("Content-Type","")
    charset=header_charset
    if not charset:
        m=re.search(rb"charset\s*=\s*[\"']?([A-Za-z0-9._-]+)",raw[:10000],re.I)
        if m:
            charset=m.group(1).decode("ascii","ignore")
    candidates=[]
    if charset: candidates.append(charset)
    candidates += ["utf-8","cp932","shift_jis"]
    for enc in dict.fromkeys(candidates):
        try:
            text=raw.decode(enc)
            # 日本語ページなら機種/機種名などが含まれる。誤デコードを弾く。
            if "P-WORLD" in text or "機種を探す" in text or "パチスロ" in text:
                return text
        except (LookupError,UnicodeDecodeError):
            pass
    return raw.decode(candidates[0] if candidates else "utf-8","replace")


def classify(row):
    """P-WORLD一覧の固定列から遊技種別を判定する。

    現在の一覧は概ね [番号, 機種名, 店舗数(○件), 種別, メーカー]。
    「パチスロ」という文字が行内のどこかにあるかではなく、
    種別列そのものを基準にする。
    """
    cells = [norm(x) for x in row]
    if len(cells) < 4:
        return None

    # 通常の一覧では4列目が種別。多少列が増減した場合のみ全体検索へ。
    type_cell = cells[3] if len(cells) > 3 else ""
    if type_cell == "パチスロ":
        return "パチスロ"

    pachinko_types = {
        "デジパチ", "確率変動デジパチ", "羽根物", "一般電役", "権利物",
        "権利物その他", "スマパチ", "アレンジボール", "じゃん球",
        "電役デジパチ", "その他"
    }
    if type_cell in pachinko_types:
        return "パチンコ"

    # 列位置が変わった場合の限定的フォールバック。
    if "パチスロ" in cells:
        return "パチスロ"
    if any(x in pachinko_types for x in cells):
        return "パチンコ"
    return None

def clean_machine_name(name: str) -> str:
    """P-WORLD一覧由来の機種名を正規化する。

    Ver8.18では一覧の「○件」は取得・判定に使用しないため、
    末尾の件数文字列が混入していても機種名だけを残す。
    """
    name = norm(name)
    name = re.sub(r"(?:[0-9][0-9,]*)件$", "", name).strip()
    name = re.sub(r"\s+(?:[0-9][0-9,]*)件$", "", name).strip()
    return name


def extract_rows(html_text, page_no=1):
    parser = RowParser()
    parser.feed(html_text)
    out = {"パチスロ": [], "パチンコ": []}

    for row, links in parser.rows:
        pairs = [(norm(row[i]), links[i] if i < len(links) else "") for i in range(len(row))]
        pairs = [(text, href) for text, href in pairs if text]
        cells = [text for text, _ in pairs]
        if len(cells) < 4:
            continue

        # 一覧の先頭列が順位番号である行だけを機種行として扱う。
        # これでヘッダー・ナビゲーション等のtrを誤採用しない。
        if not re.fullmatch(r"\d+", cells[0]):
            continue

        kind = classify(cells)
        if not kind:
            continue

        # 機種名セルは2列目。リンクも同じセルから取得する。
        raw_name = cells[1]
        name = clean_machine_name(raw_name)
        if not name or re.fullmatch(r"[0-9,]+件", name) or re.fullmatch(r"\d+", name):
            continue

        # 機種名セルのhrefを優先して取得。
        href = pairs[1][1] if len(pairs) > 1 else ""
        if href:
            href = urljoin(MACHINE_BASE, href)
        if not href or "/machine/database/" not in href:
            continue

        item = {"name": name, "url": href, "page": page_no}
        if not any(x["name"] == name for x in out[kind]):
            out[kind].append(item)
    return out

def extract_store_count(machine_html: str):
    """機種詳細ページの「設置店 ○○店舗」から設置店数を取得する。"""
    text = norm(re.sub(r"<script[\s\S]*?</script>|<style[\s\S]*?</style>", " ", machine_html, flags=re.I))
    patterns = [
        r"設置店\s*([0-9][0-9,]*)\s*店舗",
        r"設置店[^0-9]{0,30}([0-9][0-9,]*)\s*店舗",
    ]
    for pattern in patterns:
        m = re.search(pattern, text, re.I)
        if m:
            return int(m.group(1).replace(",", ""))

    # HTMLタグを除去した本文で拾えない場合の軽いフォールバック。
    plain = re.sub(r"<[^>]+>", " ", machine_html)
    plain = norm(plain)
    for pattern in patterns:
        m = re.search(pattern, plain, re.I)
        if m:
            return int(m.group(1).replace(",", ""))
    return None


def is_pre_release(machine_html: str, store_count):
    """導入前機種を除外する。設置店0店舗を基本的な導入前判定とする。"""
    if store_count == 0:
        return True
    text = norm(re.sub(r"<script[\s\S]*?</script>|<style[\s\S]*?</style>", " ", machine_html, flags=re.I))
    # 「導入予定店舗」だけが表示されているケースを除外する。
    if store_count is None and re.search(r"導入予定", text):
        return True
    return False


def filter_machine_details(candidates, delay: float):
    """候補機種の詳細ページを取得し、ページ範囲ごとの設置店数条件で絞る。"""
    result = {"パチスロ": [], "パチンコ": []}
    total_candidates = sum(len(v) for v in candidates.values())
    checked = 0
    for kind in ("パチスロ", "パチンコ"):
        for item in candidates[kind]:
            checked += 1
            page_no = item["page"]
            name = item["name"]
            url = item["url"]
            print(f"  [詳細] {checked}/{total_candidates} {name}")
            try:
                txt = fetch(url)
                store_count = extract_store_count(txt)
                # 1～10ページは導入前機種だけ除外し、それ以外はすべて採用。
                # 11～20ページは設置店300店舗以上、21～30ページは500店舗以上。
                # 31ページ以降は取得対象外（標準は30ページ）。
                if is_pre_release(txt, store_count):
                    print("    -> 除外: 導入前/設置店0店舗")
                    continue

                if page_no <= 10:
                    result[kind].append(name)
                    if store_count is None:
                        print("    -> 採用: 1～10ページ（導入前ではないため取得）")
                    else:
                        print(f"    -> 採用: 1～10ページ / 設置店 {store_count}店舗")
                    continue

                min_count = 300 if page_no <= 20 else 500
                if store_count is None:
                    print("    -> 除外: 設置店数を取得できませんでした")
                    continue
                if store_count < min_count:
                    print(f"    -> 除外: 設置店 {store_count}店舗 < {min_count}店舗")
                    continue
                result[kind].append(name)
                print(f"    -> 採用: 設置店 {store_count}店舗")
            except Exception as e:
                print(f"    -> 詳細取得失敗: {e}", file=sys.stderr)
            if delay:
                time.sleep(delay)
    return result

def extract_machine_names_from_index(page_html):
    # フォールバック: ページ内のリンク文字列から機種らしいものを拾う。
    lp=LinkParser(); lp.feed(page_html)
    names=[]
    for href,text in lp.links:
        if not text or len(text)<2: continue
        if "_machine" not in href and "machine" not in href: continue
        if any(x in text for x in ("前へ","次へ","すべて見る")): continue
        names.append(norm(text))
    return list(dict.fromkeys(names))


def get_latest_pages(pages: int, delay: float):
    candidates = {"パチスロ": [], "パチンコ": []}
    total = None
    pages = min(pages, 30)
    for i in range(pages):
        page_no = i + 1
        start = i * 50
        qs = urlencode({"aflag": "", "key": "", "mode": "4", "start": start})
        url = BASE + "?" + qs
        print(f"[P-WORLD] {i+1}/{pages} ページ取得: start={start}")
        try:
            txt = fetch(url)
        except Exception as e:
            print(f"  取得失敗: {e}", file=sys.stderr)
            continue
        m = re.search(r"全([0-9,]+)件", txt)
        if m:
            total = int(m.group(1).replace(",", ""))
        got = extract_rows(txt, page_no)
        if not any(got.values()):
            links = extract_machine_names_from_index(txt)
            print(f"  行解析0件 / リンク候補 {len(links)}件")
        for k in candidates:
            candidates[k].extend(got[k])
        print(f"  slot候補={len(got['パチスロ'])} / pachinko候補={len(got['パチンコ'])}")
        if delay:
            time.sleep(delay)

    for k in candidates:
        seen = set()
        unique = []
        for item in candidates[k]:
            if item["name"] in seen:
                continue
            seen.add(item["name"])
            unique.append(item)
        candidates[k] = unique
    return candidates, total

def load_existing(path:Path):
    try:
        d=json.loads(path.read_text(encoding="utf-8"))
        if isinstance(d,dict): return d
    except Exception:
        pass
    return {"パチスロ":[],"パチンコ":[]}


def main():
    ap = argparse.ArgumentParser(description="P-WORLDから機種マスターを更新します")
    ap.add_argument("--pages", type=int, default=30, help="最新順の取得ページ数(1ページ50機種、最大30ページ)")
    ap.add_argument("--delay", type=float, default=1.0, help="機種インデックス取得のリクエスト間隔(秒)")
    ap.add_argument("--detail-delay", type=float, default=0.5, help="機種詳細ページ取得のリクエスト間隔(秒)")
    ap.add_argument("--keep-existing", action="store_true", help="既存machine-data.jsonの機種を削除せずマージ")
    ap.add_argument("--dry-run", action="store_true", help="JSONを書き換えず件数だけ確認")
    args = ap.parse_args()
    if args.pages < 1:
        ap.error("--pages は1以上")
    if args.pages > 30:
        print("--pages は最大30ページです。30ページに制限します。")
        args.pages = 30
    if args.delay < 0 or args.detail_delay < 0:
        ap.error("--delay / --detail-delay は0以上")

    root = Path(__file__).resolve().parent
    target = root / "machine-data.json"
    existing = load_existing(target)

    candidates, total = get_latest_pages(args.pages, max(0, args.delay))
    candidate_count = sum(len(v) for v in candidates.values())
    print(f"機種詳細ページを確認します: 候補 {candidate_count}機種")
    latest = filter_machine_details(candidates, max(0, args.detail_delay))

    if not any(latest.values()):
        print("P-WORLDから採用対象の機種データを取得できませんでした。既存ファイルは変更しません。", file=sys.stderr)
        return 2

    data = {"パチスロ": latest["パチスロ"], "パチンコ": latest["パチンコ"]}
    if args.keep_existing:
        for k in data:
            data[k] = list(dict.fromkeys(data[k] + [x for x in existing.get(k, []) if isinstance(x, str)]))

    now = datetime.now(JST)
    stamp = now.strftime("%Y%m%d-%H%M%S")
    version = "8.19-machine-" + stamp
    payload = {
        "version": version,
        "updatedAt": now.isoformat(timespec="seconds"),
        "source": "P-WORLD最新順機種インデックス→各機種詳細ページの「設置店○店舗」を取得してページ別フィルター適用",
        "filterRules": [
            {"pages": "1-10", "condition": "導入前機種を除外し、その他はすべて取得"},
            {"pages": "11-20", "minDetailStoreCount": 300},
            {"pages": "21-30", "minDetailStoreCount": 500}
        ],
        "sourceUrl": BASE,
        "fetchedPages": args.pages,
        "pworldTotalAtFetch": total,
        "note": "機種インデックス横の「○件」は取得・判定に使用しない",
        "パチスロ": data["パチスロ"],
        "パチンコ": data["パチンコ"]
    }
    print(f"取得結果: パチスロ {len(data['パチスロ'])} / パチンコ {len(data['パチンコ'])}")
    if len(data["パチスロ"]) + len(data["パチンコ"]) < 20:
        print("取得件数が少なすぎるため、安全のためJSONは更新しません。", file=sys.stderr)
        return 3
    if args.dry_run:
        return 0

    backup = target.with_name(f"machine-data.backup-{stamp}.json")
    if target.exists():
        shutil.copy2(target, backup)
    tmp = target.with_suffix(".tmp")
    tmp.write_text(json.dumps(payload, ensure_ascii=False, indent=2) + "\n", encoding="utf-8")
    tmp.replace(target)
    print(f"更新完了: {target}")
    if backup.exists():
        print(f"バックアップ: {backup.name}")
    return 0

if __name__=="__main__":
    raise SystemExit(main())
