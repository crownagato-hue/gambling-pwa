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
from urllib.parse import urlencode
from urllib.request import Request, urlopen

BASE = "https://www.p-world.co.jp/_machine/t_machine.cgi"
USER_AGENT = "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 Chrome/153 Safari/537.36"
JST = timezone(timedelta(hours=9))

class RowParser(HTMLParser):
    def __init__(self):
        super().__init__(convert_charrefs=True)
        self.rows = []
        self.row = None
        self.cell = None
        self.anchor = False
        self.anchor_href = ""
        self.anchor_text = []
    def handle_starttag(self, tag, attrs):
        if tag.lower() == "tr":
            self.row = []
        elif self.row is not None and tag.lower() == "td":
            self.cell = []
        elif self.row is not None and tag.lower() == "a":
            self.anchor = True
            self.anchor_href = dict(attrs).get("href", "")
            self.anchor_text = []
    def handle_data(self, data):
        if self.row is not None and self.cell is not None:
            self.cell.append(data)
        if self.anchor:
            self.anchor_text.append(data)
    def handle_endtag(self, tag):
        tag=tag.lower()
        if tag == "a" and self.anchor:
            txt=norm("".join(self.anchor_text))
            self.anchor=False
            self.anchor_href=""
            self.anchor_text=[]
        elif tag == "td" and self.row is not None and self.cell is not None:
            self.row.append(norm(" ".join(self.cell)))
            self.cell=None
        elif tag == "tr" and self.row is not None:
            if self.row:
                self.rows.append(self.row)
            self.row=None

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
    """P-WORLDの一覧行は概ね [番号, 機種名, 件数, 種別, メーカー]。
    種別を基準に分類し、パチスロ以外の遊技機はパチンコ側へ入れる。"""
    cells=[norm(x) for x in row if norm(x)]
    if not cells:
        return None
    if "パチスロ" in cells:
        return "パチスロ"
    pachinko_types={
        "デジパチ","確率変動デジパチ","羽根物","一般電役","権利物",
        "権利物その他","スマパチ","アレンジボール","じゃん球",
        "電役デジパチ","その他"
    }
    if any(x in pachinko_types for x in cells):
        return "パチンコ"
    # 一覧ページの行で、パチスロと明記されていないものは
    # 機種行であることを確認できた場合のみパチンコ扱い。
    if len(cells)>=4 and re.fullmatch(r"\d+",cells[0]) and re.search(r"件$",cells[2]):
        return "パチンコ"
    return None

def clean_machine_name(name: str) -> str:
    """P-WORLDの一覧では機種名の末尾に設置店舗数が連結されることがある。
    例: 「スマスロ タコスロ142件」→「スマスロ タコスロ」
    数字を機種名から無差別に消さず、末尾の「数字+件」だけを除去する。
    """
    name=norm(name)
    name=re.sub(r"(?:[0-9][0-9,]*)件$", "", name).strip()
    name=re.sub(r"\s+(?:[0-9][0-9,]*)件$", "", name).strip()
    return name


def extract_rows(html_text, page_no=1):
    parser=RowParser(); parser.feed(html_text)
    out={"パチスロ":[],"パチンコ":[]}
    for row in parser.rows:
        cells=[norm(x) for x in row if norm(x)]
        if len(cells)<4:
            continue
        kind=classify(cells)
        if not kind:
            continue
        # P-WORLD一覧の標準構造では2番目のセルが機種名。
        raw_name=cells[1] if len(cells)>=2 else ""
        # P-WORLDでは「機種名」と「設置店舗数」が連結されることがある。
        # 末尾の数字+件を店舗数として取り出してから機種名を整える。
        m_count=re.search(r"([0-9][0-9,]*)件$", raw_name)
        if not m_count:
            continue
        store_count=int(m_count.group(1).replace(",", ""))

        # ページ範囲ごとの採用基準
        # 1～20ページ: 100件以上
        # 21～50ページ: 500件以上
        min_count=100 if page_no <= 20 else 500
        if store_count < min_count:
            continue

        name=clean_machine_name(raw_name)
        if not name or re.fullmatch(r"[0-9,]+件",name) or re.fullmatch(r"\d+",name):
            continue
        # 念のためページ番号や種別等を除外
        if name in {"パチスロ","デジパチ","確率変動デジパチ","羽根物","一般電役","権利物","権利物その他","スマパチ"}:
            continue
        if name not in out[kind]:
            out[kind].append(name)
    return out


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


def get_latest_pages(pages:int, delay:float):
    result={"パチスロ":[],"パチンコ":[]}
    total=None
    pages=min(pages,50)
    for i in range(pages):
        page_no=i+1
        start=i*50
        qs=urlencode({"aflag":"","key":"","mode":"4","start":start})
        url=BASE+"?"+qs
        print(f"[P-WORLD] {i+1}/{pages} ページ取得: start={start}")
        try:
            txt=fetch(url)
        except Exception as e:
            print(f"  取得失敗: {e}",file=sys.stderr)
            continue
        m=re.search(r"全([0-9,]+)件",txt)
        if m: total=int(m.group(1).replace(",",""))
        got=extract_rows(txt, page_no)
        if not any(got.values()):
            # HTML構造が変わった場合に最低限のフォールバック
            links=extract_machine_names_from_index(txt)
            print(f"  行解析0件 / リンク候補 {len(links)}件")
        for k in result:
            result[k].extend(got[k])
        print(f"  slot={len(got['パチスロ'])} / pachinko={len(got['パチンコ'])}")
        if delay: time.sleep(delay)
    for k in result:
        result[k]=list(dict.fromkeys(result[k]))
    return result,total


def load_existing(path:Path):
    try:
        d=json.loads(path.read_text(encoding="utf-8"))
        if isinstance(d,dict): return d
    except Exception:
        pass
    return {"パチスロ":[],"パチンコ":[]}


def main():
    ap=argparse.ArgumentParser(description="P-WORLDから機種マスターを更新します")
    ap.add_argument("--pages",type=int,default=50,help="最新順の取得ページ数(1ページ50件、最大50ページ=最大2500件)")
    ap.add_argument("--delay",type=float,default=1.0,help="リクエスト間隔(秒)")
    ap.add_argument("--keep-existing",action="store_true",help="既存machine-data.jsonの機種を削除せずマージ")
    ap.add_argument("--dry-run",action="store_true",help="JSONを書き換えず件数だけ確認")
    args=ap.parse_args()
    if args.pages<1: ap.error("--pages は1以上")
    if args.pages>50:
        print("--pages は最大50ページです。50ページに制限します。")
        args.pages=50
    root=Path(__file__).resolve().parent
    target=root/"machine-data.json"
    existing=load_existing(target)
    latest,total=get_latest_pages(args.pages,max(0,args.delay))
    if not any(latest.values()):
        print("P-WORLDから機種データを取得できませんでした。既存ファイルは変更しません。",file=sys.stderr)
        return 2
    data={"パチスロ":latest["パチスロ"],"パチンコ":latest["パチンコ"]}
    if args.keep_existing:
        for k in data:
            data[k]=list(dict.fromkeys(data[k]+[x for x in existing.get(k,[]) if isinstance(x,str)]))
    now=datetime.now(JST)
    stamp=now.strftime("%Y%m%d-%H%M%S")
    version="8.17-machine-"+stamp
    payload={
        "version":version,
        "updatedAt":now.isoformat(timespec="seconds"),
        "source":"P-WORLD掲載機種情報（最新順インデックス）をPC側Updaterで取得・ページ別設置店舗数フィルター適用",
        "filterRules":[
            {"pages":"1-20","minStoreCount":100},
            {"pages":"21-50","minStoreCount":500}
        ],
        "sourceUrl":BASE,
        "fetchedPages":args.pages,
        "pworldTotalAtFetch":total,
        "パチスロ":data["パチスロ"],
        "パチンコ":data["パチンコ"]
    }
    print(f"取得結果: パチスロ {len(data['パチスロ'])} / パチンコ {len(data['パチンコ'])}")
    if len(data["パチスロ"])+len(data["パチンコ"]) < 20:
        print("取得件数が少なすぎるため、安全のためJSONは更新しません。", file=sys.stderr)
        return 3
    if args.dry_run:
        return 0
    backup=target.with_name(f"machine-data.backup-{stamp}.json")
    if target.exists(): shutil.copy2(target,backup)
    tmp=target.with_suffix(".tmp")
    tmp.write_text(json.dumps(payload,ensure_ascii=False,indent=2)+"\n",encoding="utf-8")
    tmp.replace(target)
    print(f"更新完了: {target}")
    if backup.exists(): print(f"バックアップ: {backup.name}")
    return 0

if __name__=="__main__":
    raise SystemExit(main())
