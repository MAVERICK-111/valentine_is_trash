from fastapi import FastAPI
from pydantic import BaseModel
from ultralytics import YOLO
from fastapi.middleware.cors import CORSMiddleware
import os
import requests

app = FastAPI()

model = YOLO("weights/best.pt")
class ImagePayload(BaseModel):
    image_url: str

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

@app.post("/predict")
def predict(payload: ImagePayload):
    # Download image from URL
    response = requests.get(payload.image_url)
    image_path = "temp.jpg"

    with open(image_path, "wb") as f:
        f.write(response.content)

    results = model(image_path)

    result = results[0]
    boxes = result.boxes

    if boxes is not None and len(boxes) > 0:
        confidences = boxes.conf.cpu().numpy()
        max_conf = float(confidences.max())
        prediction = "yes"
    else:
        prediction = "no"
        max_conf = 0.0

    return {
        "prediction": prediction,
        "confidence": max_conf
    }