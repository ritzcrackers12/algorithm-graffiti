Drop your artwork in this folder, using these exact file names.
Missing files fall back to built-in placeholders.

You can AirDrop / email / chat the files to Ritvik and I will drop them in,
or put them in these folders yourself and tell me to push.

======== GitHub (small images, this folder and content/) ========

iPad desktop — public/assets/
  wallpaper.jpg          2732 x 2048     desktop background (do not use Microsoft Bliss)
  start-button.png       ~220 x 64       taskbar start (no Windows logo)

Desktop icons — public/assets/  (512 x 512, transparent PNG)
  icon-article.png
  icon-reel.png
  icon-song.png
  icon-game.png
Optional after-altered versions: icon-<name>-altered.png

Phone controller backgrounds — public/assets/  (1170 x 2532)
  bg-article.jpg
  bg-reel.jpg
  bg-song.jpg
  bg-game.jpg

Ad images — public/assets/ads/
  Placeholder SVGs (ph-1.svg … ph-6.svg) are already here.
  Later real ads: put the file named in content/ads.csv `image` column.

Ball Street Journal article photos — public/content/articles/photos/
  maga-coalition.jpg     election-night huddle / MAGA hat
  ai-data-centers.jpg    data-center construction site
  military-ai.jpg        explosion still from a military demo
  See photos/README.txt. Name must match the article id in index.json.

======== Supabase Storage (large media — do NOT put in GitHub) ========

  reels/     vertical MP4s   (Phase B)
  songs/     vocals + instrumentals  (Phase C)
  ads/       generated ad images if a CSV row has no file (Phase A caches here later)
