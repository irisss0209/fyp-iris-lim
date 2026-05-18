import cv2
import time
import json
import os
import queue
import threading
import requests
import boto3
import torch
from ultralytics import YOLO
from torchvision.models import mobilenet_v3_small
from torchvision import transforms
from awsiot import mqtt_connection_builder
from awscrt import io, mqtt

# ───────────────── CONFIG ─────────────────
IOT_ENDPOINT = "a2m9bqgyzubbyb-ats.iot.ap-southeast-1.amazonaws.com"
CERTS_DIR = os.path.expanduser("~/railly-iot-certs")
DEVICE_ID = "railly-raspberry"
TOPIC = "railly/3044/3/detection"
CREDENTIALS_ENDPOINT = "c2cnymnfyuodws.credentials.iot.ap-southeast-1.amazonaws.com"
ROLE_ALIAS = "railly-pi-role-alias"
S3_BUCKET = "railly"
S3_REGION = "ap-southeast-1"

VIDEO_SOURCE = "/home/iriss-xyii/YTDown_YouTube_Simulated-Metro-CCTV-Footage_Media_tGKov02g0bw_001_720p.mp4"

GENDER_THRESHOLD   = 0.469  # from ROC threshold search (v5, target male_recall=0.90)
CONF_THRESHOLD     = 0.469
INFERENCE_INTERVAL = 2

MALE_COOLDOWN_SECS     = 30
POSITION_COOLDOWN_SECS = 30
POSITION_COOLDOWN_PX   = 150

BYTETRACK_CONFIG = os.path.join(os.path.dirname(os.path.abspath(__file__)), "bytetrack_railly.yaml")

CAMERA_ID  = "CAM-AG01-01-A"
LINE_ID    = "LINE-AG"
STATION_ID = "STN-CEMPAKA"

# ───────────────── MQTT ─────────────────
event_loop_group = io.EventLoopGroup(1)
host_resolver = io.DefaultHostResolver(event_loop_group)
client_bootstrap = io.ClientBootstrap(event_loop_group, host_resolver)

mqtt_connection = mqtt_connection_builder.mtls_from_path(
    endpoint=IOT_ENDPOINT,
    cert_filepath=f"{CERTS_DIR}/railly-raspberry.cert.pem",
    pri_key_filepath=f"{CERTS_DIR}/railly-raspberry.private.key",
    ca_filepath=f"{CERTS_DIR}/AmazonRootCA1.pem",
    client_id=DEVICE_ID,
    clean_session=True,
    keep_alive_secs=30,
    client_bootstrap=client_bootstrap
)

print("Connecting MQTT.")
mqtt_connection.connect().result()
print("MQTT CONNECTED")

# ───────────────── S3 ─────────────────
_s3_client       = None
_s3_creds_expiry = 0
_s3_lock         = threading.Lock()

def get_s3_client():
    global _s3_client, _s3_creds_expiry
    with _s3_lock:
        if _s3_client and time.time() < _s3_creds_expiry - 60:
            return _s3_client
        url = f"https://{CREDENTIALS_ENDPOINT}/role-aliases/{ROLE_ALIAS}/credentials"
        response = requests.get(
            url,
            cert=(
                f"{CERTS_DIR}/railly-raspberry.cert.pem",
                f"{CERTS_DIR}/railly-raspberry.private.key"
            ),
            verify=f"{CERTS_DIR}/AmazonRootCA1.pem"
        )
        if response.status_code != 200:
            print("IoT credentials failed:", response.text)
            return None
        creds = response.json()["credentials"]
        expiry_str = creds.get("expiration", "")
        try:
            from datetime import datetime, timezone
            _s3_creds_expiry = datetime.fromisoformat(
                expiry_str.replace("Z", "+00:00")
            ).timestamp()
        except Exception:
            _s3_creds_expiry = time.time() + 3600
        _s3_client = boto3.client(
            "s3",
            region_name=S3_REGION,
            aws_access_key_id=creds["accessKeyId"],
            aws_secret_access_key=creds["secretAccessKey"],
            aws_session_token=creds["sessionToken"]
        )
        return _s3_client

def upload_to_s3(person_crop, gender_conf):
    s3 = get_s3_client()
    if not s3:
        print("No S3 client")
        return None

    timestamp    = int(time.time())
    conf_percent = int(gender_conf * 100)
    key          = f"snapshots/ai-detection/{timestamp}_conf{conf_percent}.jpg"

    success, buf = cv2.imencode(".jpg", person_crop)
    if not success:
        print("Failed to encode image")
        return None

    try:
        s3.put_object(
            Bucket=S3_BUCKET,
            Key=key,
            Body=buf.tobytes(),
            ContentType="image/jpeg"
        )
        url = f"https://{S3_BUCKET}.s3.{S3_REGION}.amazonaws.com/{key}"
        print(f"Male crop uploaded: {url}")
        return url
    except Exception as e:
        print("S3 upload error:", e)
        return None

# ───────────────── MQTT PUBLISH ─────────────────
def publish_mqtt(conf, url):
    payload = {
        "camera_id":        CAMERA_ID,
        "confidence_score": round(conf, 4),
        "image_url":        url,
        "line_id":          LINE_ID,
        "station_id":       STATION_ID,
        "detected_at":      time.strftime("%Y-%m-%dT%H:%M:%SZ", time.gmtime())
    }
    mqtt_connection.publish(
        topic=TOPIC,
        payload=json.dumps(payload),
        qos=mqtt.QoS.AT_LEAST_ONCE
    )
    print(f"MQTT SENT: {payload}")

# ───────────────── BACKGROUND UPLOAD WORKER ─────────────────
upload_queue = queue.Queue()

def upload_worker():
    while True:
        item = upload_queue.get()
        if item is None:
            break
        crop, male_prob = item
        try:
            url = upload_to_s3(crop, male_prob)
            if url:
                publish_mqtt(male_prob, url)
        except Exception as e:
            print("Upload worker error:", e)
        finally:
            upload_queue.task_done()

upload_thread = threading.Thread(target=upload_worker, daemon=True)
upload_thread.start()

# ───────────────── MODELS ─────────────────
print("Loading YOLO11s...")
yolo = YOLO("yolo11s.pt")

print("Loading MobileNetV3...")
mobilenet = torch.jit.load("/home/iriss-xyii/mobilenetv3_ver5.pt", map_location="cpu")
mobilenet.eval()

class_names = ["female", "male"]

MEAN = [0.485, 0.456, 0.406]
STD  = [0.229, 0.224, 0.225]

transform = transforms.Compose([
    transforms.ToPILImage(),
    transforms.Resize(256),
    transforms.CenterCrop(224),
    transforms.ToTensor(),
    transforms.Normalize(mean=MEAN, std=STD),
])

MALE_IDX = class_names.index("male")

def predict_gender(bgr_crop):
    rgb_crop = cv2.cvtColor(bgr_crop, cv2.COLOR_BGR2RGB)
    tensor   = transform(rgb_crop).unsqueeze(0)
    with torch.no_grad():
        probs = torch.softmax(mobilenet(tensor), dim=1)[0]
    male_prob = probs[MALE_IDX].item()
    label     = "male" if male_prob > GENDER_THRESHOLD else "female"
    conf      = male_prob if label == "male" else 1.0 - male_prob
    return label, conf, male_prob

# ───────────────── BOX DRAWING ─────────────────
BOX_COLOR = {
    "male":   (0, 100, 255),
    "female": (255, 180, 0),
}
DEFAULT_COLOR = (180, 180, 180)

def draw_box(frame, x1, y1, x2, y2, yolo_conf, gender_label, gender_conf):
    color = BOX_COLOR.get(gender_label, DEFAULT_COLOR)
    cv2.rectangle(frame, (x1, y1), (x2, y2), color, 2)
    label_text = f"{gender_label} {gender_conf:.0%}"
    font       = cv2.FONT_HERSHEY_SIMPLEX
    font_scale = 0.55
    thickness  = 1
    (tw, th), baseline = cv2.getTextSize(label_text, font, font_scale, thickness)
    pad = 4
    lx1, ly1 = x1, y1 - th - pad * 2
    lx2, ly2 = x1 + tw + pad * 2, y1
    if ly1 < 0:
        ly1, ly2 = y2, y2 + th + pad * 2
    cv2.rectangle(frame, (lx1, ly1), (lx2, ly2), color, -1)
    cv2.putText(
        frame, label_text,
        (lx1 + pad, ly2 - pad),
        font, font_scale, (255, 255, 255), thickness, cv2.LINE_AA
    )

# ───────────────── COOLDOWN HELPERS ─────────────────
male_cooldowns           = {}  # {track_id: last_upload_time}
recent_upload_positions  = []  # [(cx, cy, time)]

def is_in_id_cooldown(track_id, now):
    if track_id is None:
        return False
    last = male_cooldowns.get(track_id)
    return last is not None and (now - last) < MALE_COOLDOWN_SECS

def is_in_position_cooldown(cx, cy, now):
    for (rx, ry, rt) in recent_upload_positions:
        if (now - rt) < POSITION_COOLDOWN_SECS:
            if ((cx - rx) ** 2 + (cy - ry) ** 2) ** 0.5 < POSITION_COOLDOWN_PX:
                return True
    return False

def record_upload(track_id, cx, cy, now):
    if track_id is not None:
        male_cooldowns[track_id] = now
    recent_upload_positions.append((cx, cy, now))

def prune_position_cooldowns(now):
    recent_upload_positions[:] = [
        (x, y, t) for (x, y, t) in recent_upload_positions
        if (now - t) < POSITION_COOLDOWN_SECS
    ]

# ───────────────── VIDEO ─────────────────
cap = cv2.VideoCapture(VIDEO_SOURCE)

if not cap.isOpened():
    print("Cannot open video")
    exit()

print("STARTED")

last_time       = 0
last_detections = []

# ───────────────── LOOP ─────────────────
while True:
    ret, frame = cap.read()
    if not ret:
        cap.set(cv2.CAP_PROP_POS_FRAMES, 0)
        continue

    now = time.time()

    if now - last_time > INFERENCE_INTERVAL:
        last_time = now
        last_detections = []

        prune_position_cooldowns(now)

        results = yolo.track(
            frame,
            conf=0.3,
            iou=0.5,
            persist=True,
            verbose=False,
            tracker=BYTETRACK_CONFIG
        )

        for r in results:
            for box in r.boxes:
                if int(box.cls[0]) != 0:
                    continue

                x1, y1, x2, y2 = map(int, box.xyxy[0])
                yolo_conf = float(box.conf[0])
                track_id  = int(box.id[0]) if box.id is not None else None

                person = frame[y1:y2, x1:x2]
                if person.size == 0:
                    continue

                gender_label, gender_conf, male_prob = predict_gender(person)
                print(f"[ID {track_id}] Detected: {gender_label} ({gender_conf:.2f})")

                last_detections.append((x1, y1, x2, y2, yolo_conf, gender_label, gender_conf))

                if gender_label == "male" and male_prob > CONF_THRESHOLD:
                    cx = (x1 + x2) // 2
                    cy = (y1 + y2) // 2
                    if is_in_id_cooldown(track_id, now):
                        print(f"[ID {track_id}] Skipping — ID cooldown")
                        continue
                    if is_in_position_cooldown(cx, cy, now):
                        print(f"[ID {track_id}] Skipping — position cooldown")
                        continue
                    record_upload(track_id, cx, cy, now)
                    print(f"[ID {track_id}] High-confidence male — queuing upload")
                    upload_queue.put((person.copy(), male_prob))

    for (x1, y1, x2, y2, yc, gl, gc) in last_detections:
        draw_box(frame, x1, y1, x2, y2, yc, gl, gc)

    cv2.imshow("Railly", frame)

    if cv2.waitKey(1) & 0xFF == ord('q'):
        break

# ───────────────── CLEANUP ─────────────────
cap.release()
cv2.destroyAllWindows()

upload_queue.join()
upload_queue.put(None)
upload_thread.join()

mqtt_connection.disconnect().result()
print("Done.")
