# monad_500.py
import requests, re, os, time
from urllib.parse import urlparse

QUERY = "monad (LFG OR GM OR bullish OR 💜 OR momentum OR cult OR parallel) -FUD -scam filter:images"
FOLDER = "monad_500"
TOTAL = 500
os.makedirs(FOLDER, exist_ok=True)

def download(url, path):
    try:
        r = requests.get(url, timeout=10)
        if r.status_code==200:
            open(path,"wb").write(r.content)
            return True
    except: pass
    return False

downloaded = 0
page = 0

print("Bắt đầu crawl 500 ảnh Monad tích cực...")
while downloaded < TOTAL:
    page += 1
    api = "https://api.allorigins.win/raw?url=" + requests.utils.quote(
        f"https://x.com/search?f=live&q={QUERY.replace(' ', '%20')}&src=typed_query"
    )
    html = requests.get(api, headers={"User-Agent":"Mozilla/5.0"}).text
    links = re.findall(r'https://pbs\.twimg\.com/media/[A-Za-z0-9_\-]+\.(jpg|png)', html)

    for link in links:
        if downloaded >= TOTAL: break
        url = link[0] + ":orig"
        name = os.path.basename(urlparse(url).path)
        path = f"{FOLDER}/{name}"
        if not os.path.exists(path):
            if download(url, path):
                downloaded += 1
                print(f"{downloaded}/{TOTAL} ✅ {name}")
                if downloaded % 50 == 0:
                    print(f"ĐÃ TẢI {downloaded} ảnh, nghỉ 3s...")
                    time.sleep(3)

    print(f"Trang {page} → +{len(links)} ảnh mới. Tổng: {downloaded}")
    time.sleep(4)  # lịch sự với server

print(f"HOÀN TẤT! 500+ ảnh nằm trong thư mục: {FOLDER}")