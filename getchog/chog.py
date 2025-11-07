import snscrape.modules.twitter as sntwitter
import requests
import json
import os
import time
from urllib.parse import urlparse

def fetch_chog_images(query, limit=300):
    """
    Fetch dynamic posts với filter #chog nft monad (OR #chog), lấy media URLs.
    """
    images = []
    query = f"{query} filter:images min_faves:1"  # Filter images + min likes
    for i, tweet in enumerate(sntwitter.TwitterSearchScraper(query).get_items()):
        if i >= limit:
            break
        # Extract media
        media = []
        if tweet.media:
            for m in tweet.media:
                if m['type'] == 'photo':
                    media.append(m['url'])
        if not media:
            continue
        
        # Add to list
        for url in media:
            images.append({
                "id": f"post-dynamic-{i}-{urlparse(url).path.split('/')[-1]}",
                "url": url,
                "artist": tweet.user.username,
                "style": "chog-nft-art",  # Default, refine if needed
                "hashtag_chog": "#chog" in tweet.rawContent.lower(),
                "hashtag_monad": "#monad" in tweet.rawContent.lower(),
                "source_post_id": tweet.id,
                "content": tweet.rawContent[:100] + "..."  # Snippet for context
            })
        time.sleep(0.5)  # Rate limit

    print(f"✅ Fetched {len(images)} images dynamically from {limit} posts.")
    return images

def download_image(url, filepath):
    if os.path.exists(filepath):
        print(f"⏭️ Skip: {filepath}")
        return True
    try:
        headers = {'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36'}
        response = requests.get(url, headers=headers, stream=True)
        response.raise_for_status()
        with open(filepath, 'wb') as f:
            for chunk in response.iter_content(chunk_size=8192):
                f.write(chunk)
        print(f"✅ Downloaded: {filepath}")
        return True
    except Exception as e:
        print(f"❌ Error {url}: {e}")
        return False

# Main
query = "(#monad #chog nft) OR #chog"  # Filter theo yêu cầu: #monad AND #chog OR #chog, + nft
limit = 300  # Lấy 300 posts, expect ~300+ images (multiple/post)
images = fetch_chog_images(query, limit)

os.makedirs("assets", exist_ok=True)
successful_downloads = []
for img in images:
    filename = f"{img['id'].split('/')[-1]}.jpg"  # Extract filename from URL
    filepath = os.path.join("assets", filename)
    if download_image(img['url'], filepath):
        img['local_path'] = filepath
        successful_downloads.append(img)
    time.sleep(0.5)

# Save
with open('chog_dynamic.json', 'w', encoding='utf-8') as f:
    json.dump(successful_downloads, f, indent=2, ensure_ascii=False)

print(f"\n🎉 Done! Downloaded {len(successful_downloads)} / {len(images)} images dynamically.")
print("Data saved in chog_dynamic.json – ready for p5.js/Three.js!")
print("To run again: Update query/limit for fresh data. No hardcode needed!")