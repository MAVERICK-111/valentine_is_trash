from ultralytics import YOLO

# Load your detection model
detection_model = YOLO('weights/best.pt')


# Run inference
results = detection_model('img3.png')
