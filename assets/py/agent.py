# TABLO agent v3.4
# Статика + метрики ПК + медиаплеер (SMTC) + громкость +
# музыка с NAS с тегами (OST/жанр/исполнитель) + Enka по UID + датасет персонажей.
import json, os, re, sys, time, threading, asyncio, datetime, urllib.parse, urllib.request, urllib.error, mimetypes, traceback
import psutil
from http.server import ThreadingHTTPServer, SimpleHTTPRequestHandler

PORT = 8787
ROOT = os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
DATA_DIR = os.path.join(ROOT, "assets", "data")
os.makedirs(DATA_DIR, exist_ok=True)

# ---------- конфиг ----------
CONFIG_PATH = os.path.join(os.path.dirname(os.path.abspath(__file__)), "config.json")
CONFIG = {"uid": "737634719", "music_dir": ""}
try:
    with open(CONFIG_PATH, encoding="utf-8") as f:
        CONFIG.update(json.load(f))
except Exception:
    pass
GENSHIN_UID = CONFIG.get("uid") or "737634719"

ENKA_CACHE = os.path.join(DATA_DIR, "enka_cache.json")
CHAR_CACHE = os.path.join(DATA_DIR, "genshin_characters.json")
MUSIC_META_CACHE = os.path.join(DATA_DIR, "music_meta.json")

# >>> ПАПКА С МУЗЫКОЙ: из config.json + типовые кандидаты <<<
_CANDIDATES = []
if CONFIG.get("music_dir"):
    _CANDIDATES.append(CONFIG["music_dir"])
_CANDIDATES += [r"\\Cerberus\music\Ongaku", r"W:\Ongaku", r"W:\music\Ongaku",
                r"Z:\Ongaku", r"Z:\music\Ongaku", r"M:\Ongaku"]

MUSIC_DIR = ""

def detect_music():
    for c in _CANDIDATES:
        try:
            if c and os.path.isdir(c):
                print("[NAS] найден: %s" % c)
                return c
            print("[NAS] нет: %s" % (c or "<пусто>"))
        except OSError as e:
            print("[NAS] недоступен: %s -> %s" % (c, e))
    return ""

MUSIC_DIR = detect_music()
if not MUSIC_DIR:
    guess = os.path.join(os.path.expanduser("~"), "Music")
    if os.path.isdir(guess):
        MUSIC_DIR = guess
        print("[NAS] ни один путь не подошёл — пока использую: %s" % guess)
        print("[NAS] перепроверка шары каждые 60 сек; как только появится — переключусь сам")
        print("[NAS] частые причины: агент запущен от администратора (запусти обычным")
        print("[NAS] способом), либо шара требует входа: net use \\\\Cerberus\\music /persistent:yes")

def music_retry_loop():
    global MUSIC_DIR
    while True:
        time.sleep(60)
        if MUSIC_DIR and not os.path.isdir(MUSIC_DIR):
            print("[NAS] путь потерян (%s), перепроверяю..." % MUSIC_DIR)
            MUSIC_DIR = ""
        if not MUSIC_DIR:
            found = detect_music()
            if found:
                MUSIC_DIR = found
                print("[NAS] переключился на: %s" % found)

if not os.path.isdir(MUSIC_DIR):
    threading.Thread(target=music_retry_loop, daemon=True).start()

AUDIO_EXT = {".mp3", ".flac", ".wav", ".ogg", ".m4a", ".opus", ".aac", ".wma"}
_CT = {".mp3": "audio/mpeg", ".flac": "audio/flac", ".wav": "audio/wav",
       ".ogg": "audio/ogg", ".m4a": "audio/mp4", ".opus": "audio/ogg",
       ".aac": "audio/aac", ".wma": "audio/x-ms-wma"}

# ---------- громкость (pycaw, совместимо со старыми и новыми версиями) ----------
VOL_OK = False
vol_err = ""
try:
    import comtypes
    try:
        from pycaw.pycaw import AudioUtilities, IAudioEndpointVolume
    except ImportError:
        from pycaw.api.endpointvolume import IAudioEndpointVolume  # новые версии pycaw
    from comtypes import CLSCTX_ALL
    VOL_OK = True
except Exception as e:
    vol_err = str(e)

_vol_cache = {}

def _make_volume_interface():
    """Старые pycaw: у объекта есть Activate. Новые: AudioDevice с _get_volume_interface()."""
    dev = AudioUtilities.GetSpeakers()
    if hasattr(dev, "_get_volume_interface"):
        return dev._get_volume_interface()
    ifc = dev.Activate(IAudioEndpointVolume._iid_, CLSCTX_ALL, None)
    return ifc.QueryInterface(IAudioEndpointVolume)

def get_vol():
    tid = threading.get_ident()
    if tid not in _vol_cache:
        comtypes.CoInitialize()
        _vol_cache[tid] = _make_volume_interface()
    return _vol_cache[tid]

def vol_get():
    try:
        return round(get_vol().GetMasterVolumeLevelScalar() * 100)
    except Exception as e:
        raise RuntimeError(str(e))

def vol_set(v):
    get_vol().SetMasterVolumeLevelScalar(min(max(int(v), 0), 100) / 100.0, None)

def vol_mute():
    get_vol().SetMute(not get_vol().GetMute(), None)

def volume_safe():
    if not VOL_OK:
        return None
    try:
        return vol_get()
    except Exception as e:
        return {"err": str(e)}

# ---------- медиаплеер (SMTC) ----------
wmc = None
BACKEND = None
try:
    import winsdk.windows.media.control as wmc  # noqa
    BACKEND = "winsdk"
except ImportError:
    try:
        import winrt.windows.media.control as wmc  # noqa
        BACKEND = "winrt"
    except ImportError:
        pass
MEDIA_OK = wmc is not None

media = {"available": MEDIA_OK, "session": False, "title": "", "artist": "",
         "pos": 0.0, "dur": 0.0, "playing": False, "volume": None, "why": ""}
_media_lock = threading.Lock()

def _sec(x):
    try:
        return x.total_seconds()
    except Exception:
        return 0.0

async def _smtc_manager():
    return await wmc.GlobalSystemMediaTransportControlsSessionManager.request_async()

def _pick_best(sessions):
    playing = [s for s in sessions if s.get_playback_info().playback_status == 4]
    return (playing or sessions)[0] if sessions else None

async def media_poll_loop():
    try:
        mgr = await _smtc_manager()
    except Exception as e:
        media["why"] = str(e)
        return
    while True:
        try:
            sessions = list(mgr.get_sessions())
            s = _pick_best(sessions)
            if s:
                props = await s.try_get_media_properties_async()
                tp = s.get_timeline_properties()
                with _media_lock:
                    media["session"] = True
                    media["title"] = props.title or ""
                    media["artist"] = props.artist or ""
                    media["playing"] = s.get_playback_info().playback_status == 4
                    media["pos"] = _sec(tp.position)
                    media["dur"] = _sec(tp.end_time)
            else:
                with _media_lock:
                    media["session"] = False
                    media["title"] = ""; media["artist"] = ""
        except Exception as e:
            media["why"] = str(e)
        await asyncio.sleep(1)

def media_thread():
    if not MEDIA_OK: return
    loop = asyncio.new_event_loop()
    asyncio.set_event_loop(loop)
    try:
        loop.run_until_complete(media_poll_loop())
    except Exception as e:
        media["why"] = str(e)

threading.Thread(target=media_thread, daemon=True).start()

async def _media_cmd(action):
    mgr = await _smtc_manager()
    s = _pick_best(list(mgr.get_sessions()))
    if not s: return False
    if action == "play_pause": await s.try_toggle_playback_pause_async()
    elif action == "next": await s.try_skip_next_async()
    elif action == "prev": await s.try_skip_previous_async()
    return True

# ---------- музыка: скан + теги (порциями, чтобы не душить SMB) ----------
def _read_tags(path):
    try:
        from mutagen import File as MFile
        f = MFile(path, easy=True)
        if f is None: return {}
        m = f.tags or {}
        def g(*keys):
            for k in keys:
                v = m.get(k)
                if v:
                    if isinstance(v, (list, tuple)): return str(v[0]).strip()
                    return str(v).strip()
            return ""
        return {"title": g("title"), "artist": g("artist", "albumartist"),
                "album": g("album"), "genre": g("genre"),
                "date": g("date", "year"), "dur": round(getattr(f.info, "length", 0) or 0)}
    except Exception:
        return {}

def _clean_name(n):
    s = re.sub(r"\.(mp3|flac|wav|ogg|m4a|opus|aac|wma)$", "", n, flags=re.I)
    s = re.sub(r"\s*[([]\s*www\.[^)\]]*[)\]]\s*", " ", s, flags=re.I)
    s = s.replace("_", " ")
    return re.sub(r"\s{2,}", " ", s).strip() or n

def scan_music():
    out = []
    if not MUSIC_DIR or not os.path.isdir(MUSIC_DIR):
        return out
    for dirpath, dirnames, filenames in os.walk(MUSIC_DIR):
        for fn in filenames:
            ext = os.path.splitext(fn)[1].lower()
            if ext not in AUDIO_EXT: continue
            full = os.path.join(dirpath, fn)
            try:
                rel = os.path.relpath(full, MUSIC_DIR).replace("\\", "/")
                st = os.stat(full)
            except OSError:
                continue
            rel_parts = rel.split("/")
            ost = rel_parts[0] if len(rel_parts) > 1 else ""
            out.append({"file": rel, "mtime": st.st_mtime, "size": st.st_size,
                        "ost": ost, "folder": "/".join(rel_parts[:-1])})
    return out

def load_meta_cache():
    try:
        with open(MUSIC_META_CACHE, encoding="utf-8") as f:
            return json.load(f)
    except Exception:
        return {"tracks": {}}

def save_meta_cache(c):
    try:
        with open(MUSIC_META_CACHE, "w", encoding="utf-8") as f:
            json.dump(c, f, ensure_ascii=False)
    except Exception:
        pass

_meta_cache = load_meta_cache()
_meta_lock = threading.Lock()
SCAN = {"pending": 0, "total": 0}

def bg_tagger():
    """Фоновое сканирование: по 400 файлов за проход, чтобы не занимать канал целиком."""
    time.sleep(1)
    while True:
        try:
            if MUSIC_DIR and os.path.isdir(MUSIC_DIR):
                files = scan_music()
                SCAN["total"] = len(files)
                with _meta_lock:
                    known = _meta_cache["tracks"]
                    todo = [f for f in files
                            if f["file"] not in known or known[f["file"]].get("mtime") != f["mtime"]]
                    SCAN["pending"] = len(todo)
                    if todo:
                        batch = todo[:400]
                        for f in batch:
                            tags = _read_tags(os.path.join(MUSIC_DIR, f["file"].replace("/", os.sep)))
                            name = _clean_name(f["file"].split("/")[-1])
                            known[f["file"]] = {
                                "file": f["file"], "mtime": f["mtime"], "ost": f["ost"],
                                "folder": f["folder"],
                                "title": tags.get("title") or name,
                                "artist": tags.get("artist") or "",
                                "album": tags.get("album") or f["ost"],
                                "genre": tags.get("genre") or "",
                                "date": tags.get("date") or "",
                                "dur": tags.get("dur") or 0}
                        SCAN["pending"] = len(todo) - len(batch)
                        save_meta_cache(_meta_cache)
                        time.sleep(0.05)  # передышка для SMB
                        continue
            time.sleep(30)
        except Exception as e:
            print("[SCAN] ошибка: %s" % e)
            time.sleep(10)

def music_meta():
    with _meta_lock:
        tracks = list(_meta_cache["tracks"].values())
        tracks.sort(key=lambda t: (t["ost"], t["album"], t["title"]))
        return {"ok": bool(MUSIC_DIR and os.path.isdir(MUSIC_DIR)),
                "dir": MUSIC_DIR, "count": len(tracks),
                "scanning": SCAN.copy(), "tracks": tracks}

# ---------- Enka.Network ----------
def enka_refresh():
    url = "https://enka.network/api/uid/%s/" % GENSHIN_UID
    req = urllib.request.Request(url, headers={"User-Agent": "TABLO-agent/3.4"})
    try:
        with urllib.request.urlopen(req, timeout=30) as r:
            body = json.loads(r.read().decode("utf-8"))
    except urllib.error.HTTPError as e:
        if e.code == 424:
            return {"ok": False, "err": "Витрина закрыта: включи в игре «Показывать детали персонажей»"}
        if e.code == 404:
            return {"ok": False, "err": "UID не найден"}
        return {"ok": False, "err": "Enka: HTTP %s" % e.code}
    except Exception as e:
        return {"ok": False, "err": "Enka: %s" % e}
    player = body.get("playerInfo", {})
    out = {"ok": True, "uid": GENSHIN_UID,
           "nickname": player.get("nickname", ""),
           "level": player.get("level", 0),
           "worldLevel": player.get("worldLevel", 0),
           "characters": []}
    for c in (body.get("avatarInfoList") or []):
        cid = c.get("avatarId")
        info = c.get("propMap", {})
        lvl = (info.get("4001") or {}).get("val")
        char = {"id": cid, "level": int(float(lvl or 0))}
        if "talentIdList" in c: char["talents"] = len(c["talentIdList"])
        equip = c.get("equipList") or []
        arts, wep = [], None
        for e in equip:
            if "flat" in e and "reliquary" in e:
                arts.append({"id": (e["flat"].get("equipType") or ""),
                             "rarity": (e["flat"].get("rankLevel") or 0)})
            elif "weapon" in e:
                wep = {"id": (e.get("itemId") or ""),
                       "level": int(float(((e.get("weapon") or {}).get("level") or 0)))}
        char["artifacts"] = arts
        if wep: char["weapon"] = wep
        out["characters"].append(char)
    with open(ENKA_CACHE, "w", encoding="utf-8") as f:
        f.write(json.dumps(out, ensure_ascii=False))
    return out

def enka_cached():
    try:
        with open(ENKA_CACHE, encoding="utf-8") as f:
            return json.load(f)
    except Exception:
        return {"ok": False, "err": "нет кэша — нажми «Обновить»"}

# ---------- датасет персонажей ----------
def chars_sync():
    try:
        req = urllib.request.Request("https://genshin.dev/api/characters",
                                     headers={"User-Agent": "TABLO-agent/3.4"})
        with urllib.request.urlopen(req, timeout=20) as r:
            slugs = json.loads(r.read().decode("utf-8"))
        out = []
        for s in slugs:
            time.sleep(0.25)
            try:
                req2 = urllib.request.Request("https://genshin.dev/api/characters/%s" % s,
                                              headers={"User-Agent": "TABLO-agent/3.4"})
                with urllib.request.urlopen(req2, timeout=15) as r2:
                    d = json.loads(r2.read().decode("utf-8"))
                out.append({"id": s, "name": d.get("name", s), "element": d.get("element", ""),
                            "rarity": d.get("rarity", 0), "description": d.get("description", ""),
                            "ascension": d.get("ascension_materials") or d.get("ascensions") or []})
            except Exception:
                out.append({"id": s, "name": s, "element": "", "rarity": 0})
        with open(CHAR_CACHE, "w", encoding="utf-8") as f:
            f.write(json.dumps(out, ensure_ascii=False))
        return {"ok": True, "count": len(out)}
    except Exception as e:
        return {"ok": False, "err": "Скачивание не удалось: %s" % e}

def chars_cached():
    try:
        with open(CHAR_CACHE, encoding="utf-8") as f:
            return json.load(f)
    except Exception:
        return []

# ---------- HTTP ----------
_last_net = [time.time(), None]

class Handler(SimpleHTTPRequestHandler):
    def __init__(self, *a, **kw):
        super().__init__(*a, directory=ROOT, **kw)

    def log_message(self, fmt, *args):
        sys.stdout.write("[%s] %s\n" % (datetime.datetime.now().strftime("%H:%M:%S"),
                                        fmt % args))

    def _json(self, obj, code=200):
        body = json.dumps(obj, ensure_ascii=False).encode("utf-8")
        self.send_response(code)
        self.send_header("Content-Type", "application/json; charset=utf-8")
        self.send_header("Cache-Control", "no-store")
        self.send_header("Content-Length", str(len(body)))
        self.end_headers()
        self.wfile.write(body)

    def do_GET(self):
        try:
            path = urllib.parse.urlparse(self.path).path
            if path == "/api/system":
                cpu = psutil.cpu_percent(interval=None)
                mem = psutil.virtual_memory().percent
                net_c = psutil.net_io_counters()
                now = time.time()
                if _last_net[1] is None:
                    net = 0.0
                else:
                    dt = now - _last_net[0]
                    net = 0.0 if dt <= 0 else \
                        ((net_c.bytes_sent + net_c.bytes_recv) - _last_net[1]) / dt / 1024
                _last_net[0], _last_net[1] = now, net_c.bytes_sent + net_c.bytes_recv
                return self._json({"agent": True, "cpu": cpu, "mem": mem,
                                   "net": round(max(0.0, net), 1),
                                   "vol_ok": VOL_OK, "vol_err": vol_err,
                                   "media_ok": MEDIA_OK, "backend": BACKEND,
                                   "music_dir": MUSIC_DIR,
                                   "music_ok": bool(MUSIC_DIR and os.path.isdir(MUSIC_DIR)),
                                   "time": datetime.datetime.now().isoformat()})
            if path == "/api/media":
                with _media_lock:
                    snap = dict(media)
                snap["volume"] = volume_safe()
                return self._json(snap)
            if path == "/api/music":
                # быстрый ответ из кэша тегов, без повторного обхода SMB
                with _meta_lock:
                    files = [t["file"] for t in _meta_cache["tracks"].values()]
                return self._json({"ok": bool(MUSIC_DIR and os.path.isdir(MUSIC_DIR)),
                                   "count": len(files), "tracks": files,
                                   "scanning": dict(SCAN)})
            if path == "/api/music/meta":
                return self._json(music_meta())
            if path == "/api/enka":
                return self._json(enka_cached())
            if path == "/api/enka/refresh":
                return self._json(enka_refresh())
            if path == "/api/characters":
                return self._json({"ok": True, "count": len(chars_cached()),
                                   "characters": chars_cached()})
            if path == "/api/characters/sync":
                return self._json(chars_sync())
            if path.startswith("/music/"):
                return self._serve_audio(path[len("/music/"):])
            return super().do_GET()
        except Exception:
            traceback.print_exc()
            return self._json({"ok": False, "err": "internal"}, code=500)

    def do_POST(self):
        try:
            path = urllib.parse.urlparse(self.path).path
            if path == "/api/media/cmd":
                ln = int(self.headers.get("Content-Length") or 0)
                req = json.loads(self.rfile.read(ln).decode("utf-8") or "{}")
                action = req.get("action")
                try:
                    loop = asyncio.new_event_loop()
                    ok = loop.run_until_complete(_media_cmd(action))
                    loop.close()
                except Exception as e:
                    return self._json({"ok": False, "err": str(e)})
                return self._json({"ok": bool(ok), "action": action})
            if path == "/api/volume":
                ln = int(self.headers.get("Content-Length") or 0)
                req = json.loads(self.rfile.read(ln).decode("utf-8") or "{}")
                if not VOL_OK:
                    return self._json({"ok": False, "err": vol_err})
                if "set" in req: vol_set(req["set"])
                if req.get("mute") is True: vol_mute()
                return self._json({"ok": True, "volume": vol_get()})
            return self._json({"ok": False, "err": "unknown"}, code=404)
        except Exception:
            traceback.print_exc()
            return self._json({"ok": False, "err": "internal"}, code=500)

    def _serve_audio(self, rel):
        rel = urllib.parse.unquote(rel)
        if not MUSIC_DIR:
            return self._json({"ok": False, "err": "not found"}, code=404)
        full = os.path.normpath(os.path.join(MUSIC_DIR, rel))
        if not full.startswith(os.path.abspath(MUSIC_DIR)) or not os.path.isfile(full):
            return self._json({"ok": False, "err": "not found"}, code=404)
        ext = os.path.splitext(full)[1].lower()
        ctype = _CT.get(ext, "application/octet-stream")
        size = os.path.getsize(full)
        rng = self.headers.get("Range")
        start, end = 0, size - 1
        code = 200
        if rng:
            m = re.match(r"bytes=(\d*)-(\d*)", rng)
            if m:
                if m.group(1): start = int(m.group(1))
                if m.group(2): end = int(m.group(2))
                code = 206
        length = end - start + 1
        self.send_response(code)
        self.send_header("Content-Type", ctype)
        self.send_header("Content-Length", str(length))
        self.send_header("Accept-Ranges", "bytes")
        if code == 206:
            self.send_header("Content-Range", "bytes %d-%d/%d" % (start, end, size))
        self.end_headers()
        with open(full, "rb") as f:
            f.seek(start)
            left = length
            while left > 0:
                chunk = f.read(min(65536, left))
                if not chunk: break
                try:
                    self.wfile.write(chunk)
                except Exception:
                    return
                left -= len(chunk)

def main():
    threading.Thread(target=bg_tagger, daemon=True).start()
    srv = ThreadingHTTPServer(("0.0.0.0", PORT), Handler)
    print("TABLO agent v3.4 · порт %s" % PORT)
    print("музыка: %s" % (MUSIC_DIR or "(не найдена — перепроверяю каждые 60 сек)"))
    print("UID Genshin: %s" % GENSHIN_UID)
    if not VOL_OK: print("pycaw недоступен: %s" % vol_err)
    if not MEDIA_OK: print("SMTC недоступен: pip install winsdk")
    try:
        srv.serve_forever()
    except KeyboardInterrupt:
        pass

if __name__ == "__main__":
    main()
