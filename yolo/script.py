# from ultralytics import YOLO

# # Load your detection model
# detection_model = YOLO('weights/best.pt')


# # Run inference
# results = detection_model('img3.png')

from fastapi import FastAPI
from pydantic import BaseModel
from ultralytics import YOLO
import requests
import torch

app = FastAPI()

model = YOLO("weights/best.pt")

class ImagePayload(BaseModel):
    image_url: str

@app.post("/predict")
def predict(payload: ImagePayload):
    results = model(payload.image_url)
    detections = results.pandas().xyxy[0]

    prediction = "yes" if len(detections) > 0 else "no"

    return {
        "prediction": prediction,
        "confidence": detections["confidence"].max() if len(detections) > 0 else 0
    }
